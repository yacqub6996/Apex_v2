/**
 * Browser Notification Service
 * 
 * Handles browser notification permissions and sending notifications
 */

export class BrowserNotificationService {
  private static instance: BrowserNotificationService;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): BrowserNotificationService {
    if (!BrowserNotificationService.instance) {
      BrowserNotificationService.instance = new BrowserNotificationService();
    }
    return BrowserNotificationService.instance;
  }

  /**
   * Check if browser notifications are supported
   */
  public isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Get current permission status
   */
  public getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Request notification permission
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.warn('Browser notifications are not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Show a browser notification
   */
  public async showNotification(
    title: string,
    options?: NotificationOptions
  ): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Browser notifications are not supported');
      return;
    }

    const permission = this.getPermissionStatus();
    
    if (permission === 'denied') {
      console.warn('Notification permission denied');
      return;
    }

    if (permission === 'default') {
      const newPermission = await this.requestPermission();
      if (newPermission !== 'granted') {
        return;
      }
    }

    try {
      const notification = new Notification(title, {
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'apex-notification',
        requireInteraction: false,
        ...options,
      });

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);

      // Handle click event
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        // Navigate to action URL if provided
        if (options?.data?.actionUrl) {
          window.location.href = options.data.actionUrl;
        }
        
        notification.close();
      };
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Show notification with predefined style based on type
   */
  public async showTypedNotification(
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    actionUrl?: string
  ): Promise<void> {
    await this.showNotification(title, {
      body: message,
      icon: `/notification-${type}.png`,
      badge: '/logo.png',
      tag: `apex-${type}`,
      data: { actionUrl, type },
    });
  }
}

export const browserNotificationService = BrowserNotificationService.getInstance();
