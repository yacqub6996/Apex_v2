/**
 * useNotifications Hook
 * 
 * Manages user notifications including fetching, marking as read, and browser notifications
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { NotificationsService, type NotificationsPublic } from '@/api';
import { browserNotificationService } from '@/services/browser-notification-service';
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

  // Show browser notification for new notifications
  useEffect(() => {
    if (!notificationsData?.data) return;
    
    const permission = browserNotificationService.getPermissionStatus();
    if (permission !== 'granted') return;

    // Check for new notifications (this is a simple implementation)
    // In production, you might want to track which notifications have been shown
    const latestNotification = notificationsData.data[0];
    
    if (latestNotification && !latestNotification.is_read) {
      const now = new Date();
      const createdAt = new Date(latestNotification.created_at);
      const secondsSinceCreation = (now.getTime() - createdAt.getTime()) / 1000;
      
      // Only show notification if it's very recent (within polling interval)
      if (secondsSinceCreation < pollingInterval / 1000) {
        browserNotificationService.showNotification(
          latestNotification.title,
          {
            body: latestNotification.message,
            data: {
              notificationId: latestNotification.id,
              actionUrl: latestNotification.action_url,
            },
          }
        );
      }
    }
  }, [notificationsData, pollingInterval]);

  return {
    notifications: notificationsData?.data || [],
    notificationCount: notificationsData?.count || 0,
    unreadCount: unreadCountData?.count || 0,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    requestPermission,
    browserNotificationSupported: browserNotificationService.isSupported(),
    browserNotificationPermission: browserNotificationService.getPermissionStatus(),
  };
}

export type UseNotificationsReturn = ReturnType<typeof useNotifications>;
