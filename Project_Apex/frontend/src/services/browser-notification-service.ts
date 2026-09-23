/**
 * Browser Notification Service
 * 
 * Handles browser notification permissions and sending notifications
 */

import {
  notificationTargetToPath,
  resolveNotificationActionUrl,
} from '@/utils/notification-routes';

const SHOWN_NOTIFICATION_IDS_KEY = "apex:shown-browser-notification-ids";
const MAX_TRACKED_SHOWN_IDS = 200;

const readShownNotificationIds = (): Set<string> => {
    if (typeof window === "undefined") return new Set<string>();
    try {
        const raw = window.sessionStorage.getItem(SHOWN_NOTIFICATION_IDS_KEY);
        if (!raw) return new Set<string>();
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set<string>();
        return new Set(parsed.filter((value): value is string => typeof value === "string"));
    } catch {
        return new Set<string>();
    }
};

const shownNotificationIds: Set<string> = readShownNotificationIds();

/**
 * Stable per-notification-id deduplication for browser notifications (F-05).
 * The set is persisted to sessionStorage so a page reload inside the same tab
 * session cannot re-notify the user about a notification that was already
 * surfaced.
 */
export const isNotificationIdShown = (notificationId: string): boolean =>
    shownNotificationIds.has(notificationId);

export const markNotificationIdShown = (notificationId: string): void => {
    if (!notificationId || isNotificationIdShown(notificationId)) return;
    shownNotificationIds.add(notificationId);
    while (shownNotificationIds.size > MAX_TRACKED_SHOWN_IDS) {
        const oldest = shownNotificationIds.values().next().value;
        if (oldest === undefined) break;
        shownNotificationIds.delete(oldest);
    }
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(
            SHOWN_NOTIFICATION_IDS_KEY,
            JSON.stringify([...shownNotificationIds]),
        );
    } catch {
        // Session storage can be unavailable (private mode); in-memory dedupe still applies.
    }
};

/** Reset the dedupe registry (tests and future logout cleanup). */
export const clearShownNotificationIds = (): void => {
    shownNotificationIds.clear();
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.removeItem(SHOWN_NOTIFICATION_IDS_KEY);
    } catch {
        // Ignore storage unavailability.
    }
};

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

        // Resolve legacy backend action URLs (e.g. /copy-trading,
        // /transactions, /settings/security) to registered routes so the
        // user never lands on the 404 splat route.
        const target = resolveNotificationActionUrl(options?.data?.actionUrl);
        if (target) {
          window.location.href = notificationTargetToPath(target);
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
