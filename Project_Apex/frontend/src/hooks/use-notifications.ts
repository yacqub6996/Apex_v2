/**
 * useNotifications Hook
 * 
 * Manages user notifications including fetching, marking as read, and browser notifications
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import {
  NotificationsService,
  type NotificationsPublic,
  type UserNotificationPreferencesPublic,
} from '@/api';
import { browserNotificationService, isNotificationIdShown, markNotificationIdShown } from '@/services/browser-notification-service';
import { useToast } from '@/providers/enhanced-toast-provider';

export interface NotificationOptions {
  unreadOnly?: boolean;
  limit?: number;
  enablePolling?: boolean;
  pollingInterval?: number;
}

export function useNotifications(options: NotificationOptions = {}) {
  const {
    unreadOnly = false,
    limit = 50,
    enablePolling = true,
    pollingInterval = 30000, // 30 seconds
  } = options;

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Fetch notifications
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useQuery<NotificationsPublic>({
    queryKey: ['notifications', unreadOnly, limit],
    queryFn: async () => {
      const response = await NotificationsService.notificationsGetNotifications(
        unreadOnly,
        limit,
      );
      return response;
    },
    refetchInterval: enablePolling ? pollingInterval : false,
  });

  // Fetch unread count
  const { data: unreadCountData } = useQuery<{ count: number }>({
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
      await NotificationsService.notificationsUpdateNotification(
        notificationId,
        { is_read: true },
      );
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await NotificationsService.notificationsMarkAllRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      addToast({
        message: 'All notifications marked as read',
        type: 'success',
      });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await NotificationsService.notificationsDeleteNotification(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
        message: 'Browser notifications were denied. You can enable them in your browser settings.',
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
    if (!notificationsData?.data?.length) return;

    if (!browserNotificationsEnabled) return;

    if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') return;

    const permission = browserNotificationService.getPermissionStatus();
    if (permission !== 'granted') return;

    const now = Date.now();
    for (const notification of notificationsData.data) {
      if (notification.is_read) continue;

      const createdAt = new Date(notification.created_at).getTime();
      if (Number.isNaN(createdAt)) continue;

      // Only surface notifications that are recent (within the polling window).
      if ((now - createdAt) / 1000 >= pollingInterval / 1000) continue;

      if (isNotificationIdShown(notification.id)) continue;

      markNotificationIdShown(notification.id);
      browserNotificationService.showNotification(
        notification.title,
        {
          body: notification.message,
          data: {
            notificationId: notification.id,
            actionUrl: notification.action_url,
          },
        }
      );
      break;
    }
  }, [notificationsData, pollingInterval, browserNotificationsEnabled]);

  return {
    notifications: notificationsData?.data || [],
    notificationCount: notificationsData?.count || 0,
    unreadCount: unreadCountData?.count || 0,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAsReadAsync: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    requestPermission,
    browserNotificationSupported: browserNotificationService.isSupported(),
    browserNotificationPermission: browserNotificationService.getPermissionStatus(),
  };
}

export type UseNotificationsReturn = ReturnType<typeof useNotifications>;
