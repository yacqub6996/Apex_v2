import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationCenter } from "@/components/notifications/notification-center";
import type { NotificationPublic } from "@/api";

const { navigateMock, markAsReadAsyncMock, notificationsHolder } = vi.hoisted(() => ({
    navigateMock: vi.fn().mockResolvedValue(undefined),
    markAsReadAsyncMock: vi.fn().mockResolvedValue(undefined),
    notificationsHolder: { current: [] as NotificationPublic[] },
}));

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => navigateMock,
}));

vi.mock("@/hooks/use-notifications", () => ({
    useNotifications: () => ({
        notifications: notificationsHolder.current,
        unreadCount: notificationsHolder.current.filter((item) => !item.is_read).length,
        isLoading: false,
        markAsRead: vi.fn(),
        markAsReadAsync: markAsReadAsyncMock,
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
    }),
}));

const makeNotification = (overrides: Partial<NotificationPublic>): NotificationPublic => ({
    id: "n-1",
    user_id: "u-1",
    title: "Deposit Confirmed",
    message: "Your deposit of $100.00 has been confirmed.",
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
        notificationsHolder.current = [];
    });

    it("marks an unread notification read before navigating to the resolved route", async () => {
        notificationsHolder.current = [makeNotification({ id: "n-1", action_url: "/transactions" })];
        const user = userEvent.setup();

        render(<NotificationCenter />);

        await user.click(screen.getByRole("button", { name: /1 unread notifications/i }));
        await user.click(await screen.findByText("Deposit Confirmed"));

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
            makeNotification({ id: "n-2", is_read: true, action_url: "/dashboard", title: "KYC Approved" }),
        ];
        const user = userEvent.setup();

        render(<NotificationCenter />);

        await user.click(screen.getByRole("button", { name: /0 unread notifications/i }));
        await user.click(await screen.findByText("KYC Approved"));

        await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/dashboard" }));
        expect(markAsReadAsyncMock).not.toHaveBeenCalled();
    });

    it("resolves legacy /copy-trading action URLs to the registered route", async () => {
        notificationsHolder.current = [
            makeNotification({
                id: "n-3",
                title: "Copy trade executed",
                action_url: "/copy-trading",
            }),
        ];
        const user = userEvent.setup();

        render(<NotificationCenter />);

        await user.click(screen.getByRole("button", { name: /1 unread notifications/i }));
        await user.click(await screen.findByText("Copy trade executed"));

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
        await user.click(await screen.findByText("Unknown target"));

        await waitFor(() => expect(markAsReadAsyncMock).toHaveBeenCalledWith("n-4"));
        expect(navigateMock).not.toHaveBeenCalled();
    });
});
