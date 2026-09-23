/**
 * useNotifications Hook
 *
 * Manages user notifications including fetching, pagination, marking as read,
 * deletion, and browser notifications. Phase 8B switches the list query to
 * `useInfiniteQuery` (backend `limit`/`offset`) while keeping the flattened
 * `notifications: NotificationPublic[]` consumer shape.
 */
import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import {
    NotificationsService,
    type NotificationsPublic,
    type UserNotificationPreferencesPublic,
} from '@/api';
import {
    browserNotificationService,
    isNotificationIdShown,
    markNotificationIdShown,
} from '@/services/browser-notification-service';
import { markAllNotificationCachesRead } from '@/services/notification-socket-events';
import { useToast } from '@/providers/enhanced-toast-provider';
import { extractApiErrorMessage } from '@/utils/errors';

export interface NotificationOptions {
    unreadOnly?: boolean;
    limit?: number;
    enablePolling?: boolean;
    pollingInterval?: number;
}

export function useNotifications(options: NotificationOptions = {}) {
    const {
        unreadOnly = false,
        limit = 20,
        enablePolling = true,
        pollingInterval = 30000, // 30 seconds
    } = options;

    const queryClient = useQueryClient();
    const { addToast } = useToast();

    // Fetch notifications with backend offset pagination. All and Unread are
    // distinct query keys so switching filters reconciles through the normal
    // query cache lifecycle.
    const {
        data: notificationsData,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        error,
        refetch,
    } = useInfiniteQuery<NotificationsPublic>({
        queryKey: ['notifications', unreadOnly, limit],
        queryFn: async ({ pageParam }) => {
            const offset = typeof pageParam === 'number' ? pageParam : 0;
            return NotificationsService.notificationsGetNotifications(unreadOnly, limit, offset);
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
            return loaded < lastPage.count ? loaded : undefined;
        },
        refetchInterval: enablePolling ? pollingInterval : false,
    });

    // Flatten pages so existing consumers keep receiving a plain array.
    const notifications = notificationsData?.pages.flatMap((page) => page.data) ?? [];
    const notificationCount = notificationsData?.pages[0]?.count ?? 0;

    // Fetch unread count
    const {
        data: unreadCountData,
        error: unreadCountError,
        refetch: unreadCountRefetch,
    } = useQuery<{ count: number }>({
        queryKey: ['notifications', 'unread-count'],
        queryFn: async () => {
            const response = await NotificationsService.notificationsGetUnreadCount();
            return response as { count: number };
        },
        refetchInterval: enablePolling ? pollingInterval : false,
    });

    // Fetch persisted notification preferences (browser notifications gate)
    const { data: preferencesData } = useQuery<UserNotificationPreferencesPublic>({
        queryKey: ['notification-preferences'],
        queryFn: () => NotificationsService.notificationsGetPreferences(),
        refetchInterval: enablePolling ? pollingInterval : false,
    });

    const browserNotificationsEnabled =
        preferencesData !== undefined && preferencesData.browser_notifications === true;

    // Mark notification as read
    const markAsReadMutation = useMutation({
        mutationFn: async (notificationId: string) => {
            await NotificationsService.notificationsUpdateNotification(notificationId, {
                is_read: true,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Mark all as read (optimistic UI; success toast only after the server
    // confirms; restore + invalidate + error toast on failure).
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            await NotificationsService.notificationsMarkAllRead();
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });
            const previous = queryClient.getQueriesData({ queryKey: ['notifications'] });
            markAllNotificationCachesRead(queryClient);
            return { previous };
        },
        onError: (_error, _variables, context) => {
            if (context?.previous) {
                for (const [queryKey, data] of context.previous) {
                    queryClient.setQueryData(queryKey, data);
                }
            }
            void queryClient.invalidateQueries({ queryKey: ['notifications'] });
            addToast({
                message: 'Failed to mark all notifications as read. Please try again.',
                type: 'error',
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['notifications'] });
            addToast({
                message: 'All notifications marked as read',
                type: 'success',
            });
        },
    });

    // Delete notification (error toast; reconciliation via WS/polling as before)
    const deleteNotificationMutation = useMutation({
        mutationFn: async (notificationId: string) => {
            await NotificationsService.notificationsDeleteNotification(notificationId);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
        onError: (mutationError: unknown) => {
            addToast({
                message: extractApiErrorMessage(mutationError, 'Failed to delete notification'),
                type: 'error',
            });
        },
    });

    // Request browser notification permission
    const requestPermission = useCallback(async () => {
        const permission = await browserNotificationService.requestPermission();

        if (permission === 'granted') {
            addToast({
                message: 'Browser notifications enabled',
                type: 'success',
            });
        } else if (permission === 'denied') {
            addToast({
                message:
                    'Browser notifications were denied. You can enable them in your browser settings.',
                type: 'warning',
            });
        }

        return permission;
    }, [addToast]);

    // Show browser notification for new notifications.
    // The notification WebSocket provider is the primary driver for genuine
    // `notification.new` realtime events. This polling-based path is only a
    // fallback for when realtime is unavailable, and is deduplicated by
    // notification id so the same notification can never notify twice.
    useEffect(() => {
        if (!notifications.length) return;

        if (!browserNotificationsEnabled) return;

        if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') return;

        const permission = browserNotificationService.getPermissionStatus();
        if (permission !== 'granted') return;

        const now = Date.now();
        for (const notification of notifications) {
            if (notification.is_read) continue;

            const createdAt = new Date(notification.created_at).getTime();
            if (Number.isNaN(createdAt)) continue;

            // Only surface notifications that are recent (within the polling window).
            if ((now - createdAt) / 1000 >= pollingInterval / 1000) continue;

            if (isNotificationIdShown(notification.id)) continue;

            markNotificationIdShown(notification.id);
            browserNotificationService.showNotification(notification.title, {
                body: notification.message,
                data: {
                    notificationId: notification.id,
                    actionUrl: notification.action_url,
                },
            });
            break;
        }
    }, [notifications, pollingInterval, browserNotificationsEnabled]);

    return {
        notifications,
        notificationCount,
        unreadCount: unreadCountData?.count || 0,
        unreadCountError,
        unreadCountRefetch,
        isLoading,
        error,
        refetch,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        markAsRead: markAsReadMutation.mutate,
        markAsReadAsync: markAsReadMutation.mutateAsync,
        markAllAsRead: markAllAsReadMutation.mutate,
        deleteNotification: deleteNotificationMutation.mutate,
        deleteNotificationAsync: deleteNotificationMutation.mutateAsync,
        requestPermission,
        browserNotificationSupported: browserNotificationService.isSupported(),
        browserNotificationPermission: browserNotificationService.getPermissionStatus(),
    };
}

export type UseNotificationsReturn = ReturnType<typeof useNotifications>;
