import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { OpenAPI } from "@/api/core/OpenAPI";
import { getAccessToken } from "@/api/client-config";
import { useAuth } from "@/providers/auth-provider";
import type { NotificationPublic, UserNotificationPreferencesPublic } from "@/api";
import { browserNotificationService } from "@/services/browser-notification-service";
import {
    buildWebSocketUrl,
    handleNotificationSocketMessage,
} from "@/services/notification-socket-events";

/**
 * Connects to the notification WebSocket for the authenticated user and
 * applies pushed events directly to the notification query caches.
 *
 * - `notification.new` events are upserted immediately and may surface a
 *   browser notification exactly once per notification id.
 * - The user's own read/read-all/delete events are applied as targeted cache
 *   updates instead of being redundantly invalidated by this provider (the
 *   matching mutations already reconcile their own queries).
 * - Any malformed or unknown frame falls back to REST reconciliation via
 *   invalidation, and the 30-second polling in `useNotifications` remains the
 *   authoritative fallback when realtime is unavailable.
 */
export const NotificationSocketProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isAuthenticated) return;

        const token = getAccessToken();
        if (!token) return;

        let socket: WebSocket | null = null;
        let closedByCleanup = false;
        let retryTimer: number | undefined;
        let retryAttempt = 0;

        const browserHandlers = {
            isAllowed: (): boolean => {
                // Browser notifications are only surfaced while the tab is in
                // the background; the in-app badge/list update covers the
                // foreground case.
                if (typeof document === "undefined" || document.visibilityState !== "hidden") {
                    return false;
                }
                const preferences = queryClient.getQueryData<UserNotificationPreferencesPublic>([
                    "notification-preferences",
                ]);
                if (!preferences || preferences.browser_notifications !== true) return false;
                return browserNotificationService.getPermissionStatus() === "granted";
            },
            show: (notification: NotificationPublic): void => {
                void browserNotificationService.showNotification(notification.title, {
                    body: notification.message,
                    data: {
                        notificationId: notification.id,
                        actionUrl: notification.action_url ?? undefined,
                    },
                });
            },
        };

        const scheduleReconnect = (): void => {
            if (closedByCleanup) return;
            const delay = Math.min(30_000, 1_000 * 2 ** retryAttempt);
            retryAttempt += 1;
            retryTimer = window.setTimeout(() => {
                retryTimer = undefined;
                connect();
            }, delay);
        };

        const connect = (): void => {
            if (closedByCleanup) return;

            let nextSocket: WebSocket;
            try {
                // Build the URL with an explicit origin fallback for same-origin
                // deployments; a WebSocket failure must never crash the app.
                nextSocket = new WebSocket(buildWebSocketUrl(token, OpenAPI.BASE));
            } catch {
                // Polling remains the fallback transport.
                scheduleReconnect();
                return;
            }

            socket = nextSocket;

            socket.onopen = () => {
                retryAttempt = 0;
            };

            socket.onmessage = (event: MessageEvent<string>) => {
                let message: unknown;
                try {
                    message = JSON.parse(event.data);
                } catch {
                    // Ignore malformed frames; polling remains the fallback.
                    return;
                }
                handleNotificationSocketMessage(
                    message as Parameters<typeof handleNotificationSocketMessage>[0],
                    queryClient,
                    browserHandlers,
                );
            };

            socket.onclose = () => {
                if (closedByCleanup) return;
                scheduleReconnect();
            };

            socket.onerror = () => {
                socket?.close();
            };
        };

        connect();

        return () => {
            closedByCleanup = true;
            if (retryTimer !== undefined) {
                window.clearTimeout(retryTimer);
            }
            socket?.close();
        };
    }, [isAuthenticated, queryClient]);

    return <>{children}</>;
};
