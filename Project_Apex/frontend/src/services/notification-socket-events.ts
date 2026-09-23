/**
 * WebSocket notification event handling (F-04, F-05, F-16, F-10/F-22 support).
 *
 * Pure, framework-free helpers for translating the Phase 7 notification
 * WebSocket frames into TanStack Query cache updates. The WebSocket provider
 * owns the socket lifecycle and calls `handleNotificationSocketMessage` for
 * every parsed frame. REST reconciliation (invalidation) remains the fallback
 * whenever a payload is malformed or its cache correctness cannot be
 * guaranteed.
 *
 * Phase 8B supports two notification-list cache shapes:
 * - Legacy single-page `NotificationsPublic` (kept for compatibility).
 * - Infinite `InfiniteData<NotificationsPublic>` produced by `useInfiniteQuery`.
 */

import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { NotificationPublic, NotificationsPublic } from "@/api";
import {
    isNotificationIdShown,
    markNotificationIdShown,
} from "@/services/browser-notification-service";

export const NOTIFICATIONS_QUERY_PREFIX = ["notifications"] as const;
export const UNREAD_COUNT_QUERY_KEY = ["notifications", "unread-count"] as const;

export type NotificationSocketMessage = {
    type?: unknown;
    payload?: unknown;
};

export interface NotificationBrowserHandlers {
    /** Whether a browser notification is allowed (preferences + permission + visibility). */
    isAllowed: () => boolean;
    /** Display a browser notification (caller owns the service invocation). */
    show: (notification: NotificationPublic) => void;
}

/**
 * Build the WebSocket URL for the notification channel.
 *
 * When `apiBase` is empty (same-origin deployments where `OpenAPI.BASE` is
 * unset) this falls back to `window.location.origin`. The scheme swap maps
 * `http` → `ws` and `https` → `wss`.
 */
export function buildWebSocketUrl(token: string, apiBase: string | null | undefined): string {
    const base =
        apiBase && apiBase.trim() !== ""
            ? apiBase.trim()
            : typeof window !== "undefined"
              ? window.location.origin
              : "";
    const wsBase = base.replace(/^http/i, "ws").replace(/\/+$/, "");
    return `${wsBase}/api/v1/notifications/ws?token=${encodeURIComponent(token)}`;
}

export function isNotificationPublic(value: unknown): value is NotificationPublic {
    if (!value || typeof value !== "object") return false;
    const notification = value as Record<string, unknown>;
    return (
        typeof notification.id === "string" &&
        typeof notification.user_id === "string" &&
        typeof notification.title === "string" &&
        typeof notification.message === "string" &&
        typeof notification.notification_type === "string" &&
        typeof notification.created_at === "string" &&
        typeof notification.is_read === "boolean"
    );
}

export function isNotificationsPublic(value: unknown): value is NotificationsPublic {
    if (!value || typeof value !== "object") return false;
    const list = value as Record<string, unknown>;
    return Array.isArray(list.data) && typeof list.count === "number";
}

/** Guard for the useInfiniteQuery cache shape used by the 8B notification hook. */
export function isNotificationsInfiniteData(
    value: unknown,
): value is InfiniteData<NotificationsPublic> {
    if (!value || typeof value !== "object") return false;
    const infinite = value as Record<string, unknown>;
    return (
        Array.isArray(infinite.pages) &&
        Array.isArray(infinite.pageParams) &&
        infinite.pages.every((page) => isNotificationsPublic(page))
    );
}

const toFiniteNumber = (value: unknown): number | undefined =>
    typeof value === "number" && Number.isFinite(value) ? value : undefined;

const isUnreadOnlyKey = (queryKey: readonly unknown[]): boolean =>
    queryKey.length === 3 && queryKey[1] === true;

const listLimitFromKey = (queryKey: readonly unknown[]): number | undefined =>
    queryKey.length === 3 && typeof queryKey[2] === "number" && Number.isFinite(queryKey[2])
        ? queryKey[2]
        : undefined;

type NotificationListCacheData = NotificationsPublic | InfiniteData<NotificationsPublic>;

/**
 * Visit every cached notification-list cache entry (legacy single-page or
 * infinite) once per query key.
 */
const forEachNotificationListCache = (
    queryClient: QueryClient,
    callback: (queryKey: readonly unknown[], data: NotificationListCacheData) => void,
): void => {
    const entries = queryClient.getQueriesData<unknown>({
        queryKey: NOTIFICATIONS_QUERY_PREFIX,
    });
    for (const [queryKey, data] of entries) {
        if (isNotificationsPublic(data) || isNotificationsInfiniteData(data)) {
            callback(queryKey, data);
        }
    }
};

/**
 * Apply `update` to selected pages of a cache entry. `update` returns the next
 * page or null when nothing changed. `pageIndex: "all"` visits every page of
 * an infinite cache; a numeric index visits only that page (single-page caches
 * are page 0). Returns the next cache entry or null when nothing changed.
 */
const updateCachePages = (
    data: NotificationListCacheData,
    pageIndex: number | "all",
    update: (page: NotificationsPublic) => NotificationsPublic | null,
): NotificationListCacheData | null => {
    if (isNotificationsPublic(data)) {
        if (pageIndex !== 0 && pageIndex !== "all") return null;
        return update(data);
    }

    let changed = false;
    const pages = data.pages.map((page, index) => {
        if (pageIndex !== "all" && index !== pageIndex) return page;
        const next = update(page);
        if (next === null) return page;
        changed = true;
        return next;
    });
    return changed ? { ...data, pages } : null;
};

const setQueryData = <TData>(queryClient: QueryClient, queryKey: readonly unknown[], data: TData): void => {
    queryClient.setQueryData<TData>(queryKey, data);
};

const updateUnreadCountCache = (queryClient: QueryClient, count: number): void => {
    setQueryData(queryClient, UNREAD_COUNT_QUERY_KEY, { count });
};

const upsertNotification = (
    queryClient: QueryClient,
    notification: NotificationPublic,
    unreadCount: number | undefined,
): void => {
    forEachNotificationListCache(queryClient, (queryKey, data) => {
        const next = updateCachePages(data, 0, (page) => {
            // Idempotency guard: the REST refetch after invalidation may already
            // contain this row. Never insert duplicates.
            if (page.data.some((item) => item.id === notification.id)) return null;

            // Unread-only list caches must not receive read notifications.
            if (isUnreadOnlyKey(queryKey) && notification.is_read) return null;

            const nextData = [notification, ...page.data];
            const limit = listLimitFromKey(queryKey);
            // Never grow a cached page beyond its configured limit.
            if (limit !== undefined && nextData.length > limit) {
                nextData.length = limit;
            }
            return { data: nextData, count: page.count + 1 };
        });
        if (next) setQueryData(queryClient, queryKey, next);
    });

    if (unreadCount !== undefined) {
        updateUnreadCountCache(queryClient, unreadCount);
    }
};

const applyReadState = (
    queryClient: QueryClient,
    notificationId: string,
    isRead: boolean,
    unreadCount: number | undefined,
): void => {
    forEachNotificationListCache(queryClient, (queryKey, data) => {
        const next = updateCachePages(data, "all", (page) => {
            if (isUnreadOnlyKey(queryKey)) {
                // Marking read removes the row from unread-only caches.
                if (!isRead) return null;
                const nextData = page.data.filter((item) => item.id !== notificationId);
                if (nextData.length === page.data.length) return null;
                return {
                    data: nextData,
                    count: Math.max(0, page.count - (page.data.length - nextData.length)),
                };
            }

            let changed = false;
            const nextData = page.data.map((item) => {
                if (item.id !== notificationId) return item;
                changed = true;
                return {
                    ...item,
                    is_read: isRead,
                    read_at: isRead ? new Date().toISOString() : null,
                };
            });
            return changed ? { ...page, data: nextData } : null;
        });
        if (next) setQueryData(queryClient, queryKey, next);
    });

    if (unreadCount !== undefined) {
        updateUnreadCountCache(queryClient, unreadCount);
    }
};

const applyReadAll = (queryClient: QueryClient, unreadCount: number | undefined): void => {
    forEachNotificationListCache(queryClient, (queryKey, data) => {
        const next = updateCachePages(data, "all", (page) => {
            if (isUnreadOnlyKey(queryKey)) {
                return { data: [], count: 0 };
            }
            const nextData = page.data.map((item) =>
                item.is_read
                    ? item
                    : { ...item, is_read: true, read_at: new Date().toISOString() },
            );
            return { ...page, data: nextData };
        });
        if (next) setQueryData(queryClient, queryKey, next);
    });

    if (unreadCount !== undefined) {
        updateUnreadCountCache(queryClient, unreadCount);
    }
};

const applyDelete = (
    queryClient: QueryClient,
    notificationId: string,
    unreadCount: number | undefined,
): void => {
    forEachNotificationListCache(queryClient, (queryKey, data) => {
        const next = updateCachePages(data, "all", (page) => {
            const nextData = page.data.filter((item) => item.id !== notificationId);
            if (nextData.length === page.data.length) return null;
            return {
                data: nextData,
                count: Math.max(0, page.count - (page.data.length - nextData.length)),
            };
        });
        if (next) setQueryData(queryClient, queryKey, next);
    });

    if (unreadCount !== undefined) {
        updateUnreadCountCache(queryClient, unreadCount);
    }
};

/**
 * Optimistic cache transform used by `markAllAsRead`: flips every cached
 * notification row to read, empties unread-only caches, and zeroes the
 * unread-count cache. The caller snapshots the previous cache state and
 * restores it on mutation failure.
 */
export function markAllNotificationCachesRead(queryClient: QueryClient): void {
    forEachNotificationListCache(queryClient, (queryKey, data) => {
        const next = updateCachePages(data, "all", (page) => {
            if (isUnreadOnlyKey(queryKey)) {
                return { data: [], count: 0 };
            }
            const nextData = page.data.map((item) =>
                item.is_read
                    ? item
                    : { ...item, is_read: true, read_at: new Date().toISOString() },
            );
            return { ...page, data: nextData };
        });
        if (next) setQueryData(queryClient, queryKey, next);
    });
    updateUnreadCountCache(queryClient, 0);
}

const maybeShowBrowserNotification = (
    notification: NotificationPublic,
    browserHandlers: NotificationBrowserHandlers,
): void => {
    if (!browserHandlers.isAllowed()) return;
    if (isNotificationIdShown(notification.id)) return;
    markNotificationIdShown(notification.id);
    browserHandlers.show(notification);
};

/**
 * Apply a parsed notification WebSocket message to the query cache.
 *
 * - `notification.new` is upserted directly into page one of every matching
 *   list cache and may surface a browser notification exactly once per id.
 * - `notification.read`, `notifications.read_all`, and `notification.deleted`
 *   are applied across cached pages so the provider does not redundantly
 *   invalidate queries that the local mutations already reconcile.
 * - Any malformed payload or unknown event type falls back to REST
 *   reconciliation via invalidation.
 */
export function handleNotificationSocketMessage(
    message: NotificationSocketMessage,
    queryClient: QueryClient,
    browserHandlers: NotificationBrowserHandlers,
): void {
    if (!message || typeof message.type !== "string" || message.type === "ping") return;

    const payload = (message.payload ?? {}) as Record<string, unknown>;

    switch (message.type) {
        case "notification.new": {
            const notification = payload.notification;
            const unreadCount = toFiniteNumber(payload.unread_count);
            if (isNotificationPublic(notification)) {
                upsertNotification(queryClient, notification, unreadCount);
                maybeShowBrowserNotification(notification, browserHandlers);
            } else {
                void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_PREFIX });
            }
            return;
        }
        case "notification.read": {
            const notificationId =
                typeof payload.notification_id === "string" ? payload.notification_id : undefined;
            const unreadCount = toFiniteNumber(payload.unread_count);
            if (notificationId !== undefined && unreadCount !== undefined) {
                applyReadState(queryClient, notificationId, payload.is_read !== false, unreadCount);
            } else {
                void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_PREFIX });
            }
            return;
        }
        case "notifications.read_all": {
            const unreadCount = toFiniteNumber(payload.unread_count);
            if (unreadCount !== undefined) {
                applyReadAll(queryClient, unreadCount);
            } else {
                void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_PREFIX });
            }
            return;
        }
        case "notification.deleted": {
            const notificationId =
                typeof payload.notification_id === "string" ? payload.notification_id : undefined;
            const unreadCount = toFiniteNumber(payload.unread_count);
            if (notificationId !== undefined && unreadCount !== undefined) {
                applyDelete(queryClient, notificationId, unreadCount);
            } else {
                void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_PREFIX });
            }
            return;
        }
        default:
            void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_PREFIX });
    }
}
