import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    buildWebSocketUrl,
    handleNotificationSocketMessage,
    isNotificationPublic,
    isNotificationsPublic,
    UNREAD_COUNT_QUERY_KEY,
} from "@/services/notification-socket-events";
import { clearShownNotificationIds } from "@/services/browser-notification-service";
import { NotificationType, type NotificationPublic, type NotificationsPublic } from "@/api";

const makeNotification = (overrides: Partial<NotificationPublic> = {}): NotificationPublic => ({
    id: "notification-1",
    user_id: "user-1",
    title: "Deposit Confirmed",
    message: "Your deposit of $100.00 has been confirmed.",
    notification_type: NotificationType.DEPOSIT_CONFIRMED,
    is_read: false,
    read_at: null,
    created_at: "2026-09-23T10:00:00.000Z",
    action_url: "/transactions",
    ...overrides,
});

const makeList = (items: NotificationPublic[]): NotificationsPublic => ({
    data: items,
    count: items.length,
});

describe("buildWebSocketUrl", () => {
    it("maps https bases to wss and strips trailing slashes", () => {
        expect(buildWebSocketUrl("tok", "https://api.example.com/")).toBe(
            "wss://api.example.com/api/v1/notifications/ws?token=tok",
        );
    });

    it("maps http bases to ws", () => {
        expect(buildWebSocketUrl("tok", "http://localhost:8000")).toBe(
            "ws://localhost:8000/api/v1/notifications/ws?token=tok",
        );
    });

    it("falls back to window.location.origin when the API base is empty", () => {
        const url = buildWebSocketUrl("tok", "");
        expect(url.startsWith("ws")).toBe(true);
        expect(url).toContain("/api/v1/notifications/ws?token=tok");
    });
});

describe("notification socket event cache handling", () => {
    let client: QueryClient;

    beforeEach(() => {
        clearShownNotificationIds();
        client = new QueryClient();
    });

    const seedList = (key: readonly unknown[], items: NotificationPublic[]) => {
        client.setQueryData<NotificationsPublic>(key, makeList(items));
    };

    const listData = (key: readonly unknown[]) =>
        client.getQueryData<NotificationsPublic>(key) as NotificationsPublic;

    it("upserts notification.new into list and unread-count caches", () => {
        seedList(["notifications", false, 20], [makeNotification({ id: "old-1" })]);
        seedList(["notifications", true, 20], []);
        client.setQueryData(UNREAD_COUNT_QUERY_KEY, { count: 0 });

        const handlers = { isAllowed: () => false, show: vi.fn() };
        handleNotificationSocketMessage(
            {
                type: "notification.new",
                payload: {
                    notification: makeNotification({ id: "new-1" }),
                    unread_count: 1,
                },
            },
            client,
            handlers,
        );

        const allList = listData(["notifications", false, 20]);
        expect(allList.data[0].id).toBe("new-1");
        expect(allList.count).toBe(2);
        expect(listData(["notifications", true, 20]).data[0].id).toBe("new-1");
        expect(client.getQueryData(UNREAD_COUNT_QUERY_KEY)).toEqual({ count: 1 });
    });

    it("never inserts duplicate notification.new rows", () => {
        seedList(["notifications", false, 20], [makeNotification({ id: "new-1" })]);

        handleNotificationSocketMessage(
            {
                type: "notification.new",
                payload: {
                    notification: makeNotification({ id: "new-1" }),
                    unread_count: 1,
                },
            },
            client,
            { isAllowed: () => false, show: vi.fn() },
        );

        const allList = listData(["notifications", false, 20]);
        expect(allList.data).toHaveLength(1);
        expect(allList.count).toBe(1);
    });

    it("does not insert read notifications into unread-only caches", () => {
        seedList(["notifications", true, 20], []);
        handleNotificationSocketMessage(
            {
                type: "notification.new",
                payload: {
                    notification: makeNotification({ id: "read-1", is_read: true }),
                    unread_count: 0,
                },
            },
            client,
            { isAllowed: () => false, show: vi.fn() },
        );

        expect(listData(["notifications", true, 20]).data).toHaveLength(0);
    });

    it("applies notification.read without redundant invalidation", () => {
        seedList(
            ["notifications", false, 20],
            [makeNotification({ id: "n-1" }), makeNotification({ id: "n-2", is_read: true })],
        );
        seedList(["notifications", true, 20], [makeNotification({ id: "n-1" })]);
        client.setQueryData(UNREAD_COUNT_QUERY_KEY, { count: 1 });

        const invalidateSpy = vi
            .spyOn(client, "invalidateQueries")
            .mockResolvedValue(undefined as never);

        handleNotificationSocketMessage(
            {
                type: "notification.read",
                payload: { notification_id: "n-1", is_read: true, unread_count: 0 },
            },
            client,
            { isAllowed: () => false, show: vi.fn() },
        );

        expect(listData(["notifications", false, 20]).data[0].is_read).toBe(true);
        expect(listData(["notifications", true, 20]).data).toHaveLength(0);
        expect(client.getQueryData(UNREAD_COUNT_QUERY_KEY)).toEqual({ count: 0 });
        expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("applies notifications.read_all to visible rows and unread-count", () => {
        seedList(
            ["notifications", false, 20],
            [makeNotification({ id: "n-1" }), makeNotification({ id: "n-2" })],
        );
        seedList(["notifications", true, 20], [
            makeNotification({ id: "n-1" }),
            makeNotification({ id: "n-2" }),
        ]);
        client.setQueryData(UNREAD_COUNT_QUERY_KEY, { count: 2 });

        handleNotificationSocketMessage(
            {
                type: "notifications.read_all",
                payload: { marked_read: 2, unread_count: 0 },
            },
            client,
            { isAllowed: () => false, show: vi.fn() },
        );

        expect(listData(["notifications", false, 20]).data.every((item) => item.is_read)).toBe(
            true,
        );
        expect(listData(["notifications", true, 20]).data).toHaveLength(0);
        expect(listData(["notifications", true, 20]).count).toBe(0);
        expect(client.getQueryData(UNREAD_COUNT_QUERY_KEY)).toEqual({ count: 0 });
    });

    it("applies notification.deleted and decrements counts", () => {
        seedList(
            ["notifications", false, 20],
            [makeNotification({ id: "n-1" }), makeNotification({ id: "n-2", is_read: true })],
        );
        client.setQueryData(UNREAD_COUNT_QUERY_KEY, { count: 1 });

        handleNotificationSocketMessage(
            {
                type: "notification.deleted",
                payload: { notification_id: "n-1", unread_count: 0 },
            },
            client,
            { isAllowed: () => false, show: vi.fn() },
        );

        const allList = listData(["notifications", false, 20]);
        expect(allList.data.map((item) => item.id)).toEqual(["n-2"]);
        expect(allList.count).toBe(1);
        expect(client.getQueryData(UNREAD_COUNT_QUERY_KEY)).toEqual({ count: 0 });
    });

    it("falls back to REST invalidation for malformed payloads", () => {
        const invalidateSpy = vi
            .spyOn(client, "invalidateQueries")
            .mockResolvedValue(undefined as never);

        handleNotificationSocketMessage(
            { type: "notification.new", payload: { unread_count: 1 } },
            client,
            { isAllowed: () => false, show: vi.fn() },
        );
        handleNotificationSocketMessage(
            { type: "notification.read", payload: { notification_id: "n-1" } },
            client,
            { isAllowed: () => false, show: vi.fn() },
        );
        handleNotificationSocketMessage(
            { type: "notifications.read_all", payload: {} },
            client,
            { isAllowed: () => false, show: vi.fn() },
        );
        handleNotificationSocketMessage(
            { type: "notification.deleted", payload: { unread_count: 0 } },
            client,
            { isAllowed: () => false, show: vi.fn() },
        );
        handleNotificationSocketMessage({ type: "unknown.event" }, client, {
            isAllowed: () => false,
            show: vi.fn(),
        });

        expect(invalidateSpy).toHaveBeenCalledTimes(5);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notifications"] });
    });

    it("surfaces a browser notification at most once per notification id", () => {
        const show = vi.fn();
        const handlers = { isAllowed: () => true, show };

        const event = {
            type: "notification.new",
            payload: {
                notification: makeNotification({ id: "browser-1" }),
                unread_count: 1,
            },
        } as const;

        handleNotificationSocketMessage(event, client, handlers);
        handleNotificationSocketMessage(event, client, handlers);

        expect(show).toHaveBeenCalledTimes(1);
        expect(show).toHaveBeenCalledWith(expect.objectContaining({ id: "browser-1" }));

        handleNotificationSocketMessage(
            {
                type: "notification.new",
                payload: {
                    notification: makeNotification({ id: "browser-2" }),
                    unread_count: 2,
                },
            },
            client,
            handlers,
        );
        expect(show).toHaveBeenCalledTimes(2);
    });

    it("respects the browser-notification gate", () => {
        const show = vi.fn();
        handleNotificationSocketMessage(
            {
                type: "notification.new",
                payload: {
                    notification: makeNotification({ id: "gated-1" }),
                    unread_count: 1,
                },
            },
            client,
            { isAllowed: () => false, show },
        );
        expect(show).not.toHaveBeenCalled();
    });
});

describe("notification socket payload guards", () => {
    it("validates NotificationPublic shapes", () => {
        expect(isNotificationPublic(makeNotification())).toBe(true);
        expect(isNotificationPublic({ ...makeNotification(), id: undefined })).toBe(false);
        expect(isNotificationPublic({ id: "x" })).toBe(false);
    });

    it("validates NotificationsPublic shapes", () => {
        expect(isNotificationsPublic(makeList([makeNotification()]))).toBe(true);
        expect(isNotificationsPublic({ data: [], count: 0 })).toBe(true);
        expect(isNotificationsPublic({ data: [] })).toBe(false);
    });
});
