import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { OpenAPI } from "@/api/core/OpenAPI";
import { getAccessToken } from "@/api/client-config";
import { useAuth } from "@/providers/auth-provider";

const NOTIFICATION_QUERY_KEYS = [
    ["notifications"],
    ["notifications", "unread-count"],
] as const;

const buildWebSocketUrl = (token: string): string => {
    const base = OpenAPI.BASE || "";
    const wsBase = base
        .replace(/^http/i, "ws")
        .replace(/\/+$/, "");
    return `${wsBase}/api/v1/notifications/ws?token=${encodeURIComponent(token)}`;
};

/**
 * Connects to the notification WebSocket for the authenticated user and
 * invalidates the existing notification queries when realtime events arrive.
 * No UI redesign: the notification center and nav badge keep their current
 * polling-based fallback and simply refresh faster on pushed events.
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

        const invalidateNotificationQueries = () => {
            for (const key of NOTIFICATION_QUERY_KEYS) {
                queryClient.invalidateQueries({ queryKey: key });
            }
        };

        const connect = () => {
            socket = new WebSocket(buildWebSocketUrl(token));

            socket.onopen = () => {
                retryAttempt = 0;
            };

            socket.onmessage = (event: MessageEvent<string>) => {
                try {
                    const message = JSON.parse(event.data) as {
                        type?: string;
                    };
                    if (message?.type && message.type !== "ping") {
                        invalidateNotificationQueries();
                    }
                } catch {
                    // Ignore malformed frames; polling remains the fallback.
                }
            };

            socket.onclose = () => {
                if (closedByCleanup) return;
                const delay = Math.min(30_000, 1_000 * 2 ** retryAttempt);
                retryAttempt += 1;
                retryTimer = window.setTimeout(connect, delay);
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
