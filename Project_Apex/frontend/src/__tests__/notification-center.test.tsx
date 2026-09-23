import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationCenter } from "@/components/notifications/notification-center";
import type { NotificationPublic } from "@/api";

const {
    navigateMock,
    markAsReadAsyncMock,
    deleteNotificationAsyncMock,
    fetchNextPageMock,
    notificationsHolder,
} = vi.hoisted(() => ({
    navigateMock: vi.fn().mockResolvedValue(undefined),
    markAsReadAsyncMock: vi.fn().mockResolvedValue(undefined),
    deleteNotificationAsyncMock: vi.fn().mockResolvedValue(undefined),
    fetchNextPageMock: vi.fn().mockResolvedValue(undefined),
    notificationsHolder: { current: [] as NotificationPublic[] },
}));

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => navigateMock,
}));

vi.mock("@/hooks/use-notifications", () => ({
    useNotifications: () => ({
        notifications: notificationsHolder.current,
        notificationCount: notificationsHolder.current.length,
        unreadCount: notificationsHolder.current.filter((item) => !item.is_read).length,
        unreadCountError: null,
        unreadCountRefetch: vi.fn(),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage: fetchNextPageMock,
        markAsRead: vi.fn(),
        markAsReadAsync: markAsReadAsyncMock,
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
        deleteNotificationAsync: deleteNotificationAsyncMock,
        requestPermission: vi.fn(),
        browserNotificationSupported: true,
        browserNotificationPermission: "default",
    }),
}));

const makeNotification = (overrides: Partial<NotificationPublic>): NotificationPublic => ({
    id: "n-1",
    user_id: "u-1",
    title: "Deposit Confirmed",
    message: "Your deposit of $100.00 has been confirmed and added to your wallet.",
    notification_type: "DEPOSIT_CONFIRMED" as never,
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
    action_url: "/transactions",
    ...overrides,
});

describe("NotificationCenter read/navigation behavior", () => {
    beforeEach(() => {
        navigateMock.mockClear();
        markAsReadAsyncMock.mockClear();
        deleteNotificationAsyncMock.mockClear();
        fetchNextPageMock.mockClear();
        notificationsHolder.current = [];
    });

    it("marks an unread notification read before navigating to the resolved route", async () => {
        notificationsHolder.current = [makeNotification({ id: "n-1", action_url: "/transactions" })];
        const user = userEvent.setup();

        render(<NotificationCenter />);

        await user.click(screen.getByRole("button", { name: /1 unread notifications/i }));
        await user.click(
            await screen.findByRole("button", { name: /Open notification: Deposit Confirmed/i }),
        );

        await waitFor(() => expect(markAsReadAsyncMock).toHaveBeenCalledWith("n-1"));
        await waitFor(() =>
            expect(navigateMock).toHaveBeenCalledWith({ to: "/dashboard/account" }),
        );

        // The read request must be dispatched before navigation occurs.
        expect(markAsReadAsyncMock.mock.invocationCallOrder[0]).toBeLessThan(
            navigateMock.mock.invocationCallOrder[0],
        );
    });

    it("navigates without a read request for already-read notifications", async () => {
        notificationsHolder.current = [
            makeNotification({
                id: "n-2",
                is_read: true,
                action_url: "/dashboard",
                title: "KYC Approved",
            }),
        ];
        const user = userEvent.setup();

        render(<NotificationCenter />);

        await user.click(screen.getByRole("button", { name: /0 unread notifications/i }));
        await user.click(
            await screen.findByRole("button", { name: /Open notification: KYC Approved/i }),
        );

        await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/dashboard" }));
        expect(markAsReadAsyncMock).not.toHaveBeenCalled();
    });

    it("resolves legacy /copy-trading action URLs to the registered route", async () => {
        notificationsHolder.current = [
            makeNotification({ id: "n-3", title: "Copy trade executed", action_url: "/copy-trading" }),
        ];
        const user = userEvent.setup();

        render(<NotificationCenter />);

        await user.click(screen.getByRole("button", { name: /1 unread notifications/i }));
        await user.click(
            await screen.findByRole("button", { name: /Open notification: Copy trade executed/i }),
        );

        await waitFor(() =>
            expect(navigateMock).toHaveBeenCalledWith({ to: "/dashboard/copy-trading" }),
        );
    });

    it("does not navigate when the action URL is unmapped", async () => {
        notificationsHolder.current = [
            makeNotification({ id: "n-4", action_url: "/unmapped-url", title: "Unknown target" }),
        ];
        const user = userEvent.setup();

        render(<NotificationCenter />);

        await user.click(screen.getByRole("button", { name: /1 unread notifications/i }));
        await user.click(
            await screen.findByRole("button", { name: /Open notification: Unknown target/i }),
        );

        await waitFor(() => expect(markAsReadAsyncMock).toHaveBeenCalledWith("n-4"));
        expect(navigateMock).not.toHaveBeenCalled();
    });

    it("shows an unread indicator and hides it for read rows", async () => {
        notificationsHolder.current = [
            makeNotification({ id: "n-5", is_read: false, title: "Unread row" }),
            makeNotification({ id: "n-6", is_read: true, title: "Read row" }),
        ];
        const user = userEvent.setup();

        render(<NotificationCenter />);
        await user.click(screen.getByRole("button", { name: /1 unread notifications/i }));

        const rows = await screen.findAllByTestId("notification-row");
        expect(rows).toHaveLength(2);
        expect(rows[0].querySelector('[data-testid="notification-unread-dot"]')).toHaveStyle({
            visibility: "visible",
        });
        expect(rows[1].querySelector('[data-testid="notification-unread-dot"]')).toHaveStyle({
            visibility: "hidden",
        });
    });

    it("loads more via the pagination control", async () => {
        notificationsHolder.current = [makeNotification({ id: "n-7", title: "First page row" })];
        const user = userEvent.setup();

        render(<NotificationCenter />);
        await user.click(screen.getByRole("button", { name: /1 unread notifications/i }));
        await user.click(await screen.findByRole("button", { name: /Load more/i }));

        expect(fetchNextPageMock).toHaveBeenCalledOnce();
    });

    it("requests deletion through the overflow action and confirmation dialog", async () => {
        notificationsHolder.current = [makeNotification({ id: "n-8", title: "Deletable row" })];
        const user = userEvent.setup();

        render(<NotificationCenter />);
        await user.click(screen.getByRole("button", { name: /1 unread notifications/i }));
        await user.click(await screen.findByRole("button", { name: /Actions for Deletable row/i }));
        await user.click(await screen.findByRole("button", { name: /^Delete$/i }));

        await waitFor(() => expect(deleteNotificationAsyncMock).toHaveBeenCalledWith("n-8"));
    });
});
