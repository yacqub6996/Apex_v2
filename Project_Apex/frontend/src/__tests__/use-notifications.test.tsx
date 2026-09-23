import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationsService, NotificationType, type NotificationPublic } from "@/api";

const { addToastMock } = vi.hoisted(() => ({
    addToastMock: vi.fn(),
}));

vi.mock("@/providers/enhanced-toast-provider", () => ({
    useToast: () => ({ addToast: addToastMock }),
}));

const makeNotification = (id: string): NotificationPublic => ({
    id,
    user_id: "u-1",
    title: `Notification ${id}`,
    message: `Message for ${id}`,
    notification_type: NotificationType.DEPOSIT_CONFIRMED,
    is_read: false,
    read_at: null,
    created_at: "2026-09-23T10:00:00.000Z",
    action_url: "/transactions",
});

describe("useNotifications pagination, mark-all, and deletion", () => {
    let client: QueryClient;

    beforeEach(() => {
        addToastMock.mockClear();
        client = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });

        vi.spyOn(NotificationsService, "notificationsGetUnreadCount").mockResolvedValue({
            count: 1,
        } as never);
        vi.spyOn(NotificationsService, "notificationsGetPreferences").mockResolvedValue({
            browser_notifications: false,
            email_notifications: true,
            copy_trading_alerts: true,
            withdrawal_alerts: true,
            market_updates: false,
            security_alerts: true,
            user_id: "u-1",
            updated_at: "2026-09-23T10:00:00.000Z",
        } as never);
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    it("flattens the first page and continues via fetchNextPage using offset", async () => {
        vi.spyOn(NotificationsService, "notificationsGetNotifications").mockImplementation(
            ((_unreadOnly: boolean, _limit: number, offset: number = 0) => {
                if (offset === 0) {
                    return Promise.resolve({
                        data: [makeNotification("n-1"), makeNotification("n-2")],
                        count: 3,
                    });
                }
                return Promise.resolve({ data: [makeNotification("n-3")], count: 3 });
            }) as never,
        );

        const { result } = renderHook(
            () => useNotifications({ unreadOnly: false, limit: 2, enablePolling: false }),
            { wrapper },
        );

        await waitFor(() => expect(result.current.notifications).toHaveLength(2));
        expect(result.current.notifications.map((item) => item.id)).toEqual(["n-1", "n-2"]);
        expect(result.current.hasNextPage).toBe(true);

        await act(async () => {
            await result.current.fetchNextPage();
        });

        await waitFor(() =>
            expect(result.current.notifications.map((item) => item.id)).toEqual([
                "n-1",
                "n-2",
                "n-3",
            ]),
        );
        expect(result.current.hasNextPage).toBe(false);
    });

    it("applies mark-all-read optimistically and only toasts success after the server confirms", async () => {
        vi.spyOn(NotificationsService, "notificationsGetNotifications").mockResolvedValue({
            data: [makeNotification("n-1")],
            count: 1,
        } as never);

        let resolveMarkAll: (value: unknown) => void = () => undefined;
        vi.spyOn(NotificationsService, "notificationsMarkAllRead").mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveMarkAll = resolve;
                }) as never,
        );

        const { result } = renderHook(
            () => useNotifications({ unreadOnly: false, limit: 20, enablePolling: false }),
            { wrapper },
        );

        await waitFor(() => expect(result.current.notifications).toHaveLength(1));

        act(() => {
            result.current.markAllAsRead();
        });

        // Optimistic: unread count drops immediately, before the server responds.
        await waitFor(() => expect(result.current.unreadCount).toBe(0));
        expect(addToastMock).not.toHaveBeenCalled();

        await act(async () => {
            resolveMarkAll({ marked_read: 1 });
        });

        await waitFor(() =>
            expect(addToastMock).toHaveBeenCalledWith(
                expect.objectContaining({ type: "success", message: "All notifications marked as read" }),
            ),
        );
    });

    it("shows an error toast when deletion fails", async () => {
        vi.spyOn(NotificationsService, "notificationsGetNotifications").mockResolvedValue({
            data: [makeNotification("n-1")],
            count: 1,
        } as never);
        vi.spyOn(NotificationsService, "notificationsDeleteNotification").mockRejectedValue(
            new Error("boom"),
        );

        const { result } = renderHook(
            () => useNotifications({ unreadOnly: false, limit: 20, enablePolling: false }),
            { wrapper },
        );

        await waitFor(() => expect(result.current.notifications).toHaveLength(1));

        await act(async () => {
            await result.current.deleteNotificationAsync("n-1").catch(() => undefined);
        });

        await waitFor(() =>
            expect(addToastMock).toHaveBeenCalledWith(
                expect.objectContaining({ type: "error" }),
            ),
        );
    });
});
