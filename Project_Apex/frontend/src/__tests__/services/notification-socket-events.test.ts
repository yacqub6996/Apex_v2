import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    buildWebSocketUrl,
    handleNotificationSocketMessage,
    isNotificationPublic,
    isNotificationsInfiniteData,
    isNotificationsPublic,
    markAllNotificationCachesRead,
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

const makeList = (items: NotificationPublic[], count = items.length): NotificationsPublic => ({
    data: items,
    count,
});

const makeInfinite = (
    pages: NotificationsPublic[],
    pageParams: number[] = pages.map((_, index) => index),
): InfiniteData<NotificationsPublic> => ({ pages, pageParams });

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

describe("notification socket event cache handling (infinite query shape)", () => {
    let client: QueryClient;

    beforeEach(() => {
        clearShownNotificationIds();
        client = new QueryClient();
    });

    const seedList = (key: readonly unknown[], items: NotificationPublic[], count = items.length) => {
        client.setQueryData<InfiniteData<NotificationsPublic>>(
            key,
            makeInfinite([makeList(items, count)]),
        );
    };

    const seedPages = (key: readonly unknown[], pages: NotificationsPublic[]) => {
        client.setQueryData<InfiniteData<NotificationsPublic>>(key, makeInfinite(pages));
    };

    const listData = (key: readonly unknown[]) => {
        const infinite = client.getQueryData<InfiniteData<NotificationsPublic>>(key);
        return infinite?.pages ?? [];
    };

    it("upserts notification.new into page one and unread-count caches", () => {
        seedList(["notifications", false, 20], [makeNotification({ id: "old-1" })]);
        seedList(["notifications", true, 20], []);
        client.setQueryData(UNREAD_COUNT_QUERY_KEY, { count: 0 });

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

        const [allPage] = listData(["notifications", false, 20]);
        expect(allPage.data[0].id).toBe("new-1");
        expect(allPage.count).toBe(2);
        const [unreadPage] = listData(["notifications", true, 20]);
        expect(unreadPage.data[0].id).toBe("new-1");
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

        const [allPage] = listData(["notifications", false, 20]);
        expect(allPage.data).toHaveLength(1);
        expect(allPage.count).toBe(1);
    });

    it("prepends only to page one and never grows a page beyond its limit", () => {
        const pageOne = makeList(
            Array.from({ length: 20 }, (_, index) => makeNotification({ id: `p1-${index}` })),
            25,
        );
        const pageTwo = makeList([makeNotification({ id: "p2-0" })], 25);
        seedPages(["notifications", false, 20], [pageOne, pageTwo]);

        handleNotificationSocketMessage(
            {
                type: "notification.new",
                payload: {
                    notification: makeNotification({ id: "brand-new" }),
                    unread_count: 2,
                },
            },
            client,
            { isAllowed: () => false, show: vi.fn() },
        );

        const pages = listData(["notifications", false, 20]);
        expect(pages[0].data).toHaveLength(20);
        expect(pages[0].data[0].id).toBe("brand-new");
        expect(pages[0].count).toBe(26);
        // Page two is untouched by a new realtime row.
        expect(pages[1].data.map((item) => item.id)).toEqual(["p2-0"]);
        expect(pages[1].count).toBe(25);
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

        const [unreadPage] = listData(["notifications", true, 20]);
        expect(unreadPage.data).toHaveLength(0);
    });

    it("applies notification.read across cached pages without redundant invalidation", () => {
        seedPages(["notifications", false, 20], [
            makeList(
                [makeNotification({ id: "n-1" }), makeNotification({ id: "n-2", is_read: true })],
                3,
            ),
            makeList([makeNotification({ id: "n-1-dup" })], 3),
        ]);
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

        const pages = listData(["notifications", false, 20]);
        expect(pages[0].data[0].is_read).toBe(true);
        const [unreadPage] = listData(["notifications", true, 20]);
        expect(unreadPage.data).toHaveLength(0);
        expect(client.getQueryData(UNREAD_COUNT_QUERY_KEY)).toEqual({ count: 0 });
        expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("applies notifications.read_all across cached pages", () => {
        seedPages(["notifications", false, 20], [
            makeList([makeNotification({ id: "n-1" }), makeNotification({ id: "n-2" })]),
            makeList([makeNotification({ id: "n-3" })]),
        ]);
        seedList(["notifications", true, 20], [makeNotification({ id: "n-1" })]);
        client.setQueryData(UNREAD_COUNT_QUERY_KEY, { count: 3 });

        handleNotificationSocketMessage(
            {
                type: "notifications.read_all",
                payload: { marked_read: 3, unread_count: 0 },
            },
            client,
            { isAllowed: () => false, show: vi.fn() },
        );

        const pages = listData(["notifications", false, 20]);
        expect(pages.every((page) => page.data.every((item) => item.is_read))).toBe(true);
        const [unreadPage] = listData(["notifications", true, 20]);
        expect(unreadPage.data).toHaveLength(0);
        expect(unreadPage.count).toBe(0);
        expect(client.getQueryData(UNREAD_COUNT_QUERY_KEY)).toEqual({ count: 0 });
    });

    it("applies notification.deleted across cached pages and decrements counts", () => {
        seedPages(["notifications", false, 20], [
            makeList(
                [makeNotification({ id: "n-1" }), makeNotification({ id: "n-2", is_read: true })],
                3,
            ),
            makeList([makeNotification({ id: "n-1-copy" })], 3),
        ]);
        client.setQueryData(UNREAD_COUNT_QUERY_KEY, { count: 1 });

        handleNotificationSocketMessage(
            {
                type: "notification.deleted",
                payload: { notification_id: "n-1", unread_count: 0 },
            },
            client,
            { isAllowed: () => false, show: vi.fn() },
        );

        const pages = listData(["notifications", false, 20]);
        expect(pages[0].data.map((item) => item.id)).toEqual(["n-2"]);
        expect(pages[0].count).toBe(2);
        expect(client.getQueryData(UNREAD_COUNT_QUERY_KEY)).toEqual({ count: 0 });
    });

    it("supports the legacy single-page cache shape", () => {
        client.setQueryData<NotificationsPublic>(
            ["notifications", false, 20],
            makeList([makeNotification({ id: "legacy-1" })]),
        );
        handleNotificationSocketMessage(
            {
                type: "notification.new",
                payload: {
                    notification: makeNotification({ id: "legacy-new" }),
                    unread_count: 1,
                },
            },
            client,
            { isAllowed: () => false, show: vi.fn() },
        );
        const legacy = client.getQueryData<NotificationsPublic>(["notifications", false, 20]);
        expect(legacy?.data[0].id).toBe("legacy-new");
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

    it("marks every cached page read and zeroes unread count optimistically", () => {
        seedPages(["notifications", false, 20], [
            makeList([makeNotification({ id: "n-1" }), makeNotification({ id: "n-2" })]),
            makeList([makeNotification({ id: "n-3" })]),
        ]);
        seedList(["notifications", true, 20], [makeNotification({ id: "n-1" })]);
        client.setQueryData(UNREAD_COUNT_QUERY_KEY, { count: 3 });

        markAllNotificationCachesRead(client);

        const pages = listData(["notifications", false, 20]);
        expect(pages.every((page) => page.data.every((item) => item.is_read))).toBe(true);
        const [unreadPage] = listData(["notifications", true, 20]);
        expect(unreadPage.data).toHaveLength(0);
        expect(client.getQueryData(UNREAD_COUNT_QUERY_KEY)).toEqual({ count: 0 });
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

    it("validates infinite cache shapes", () => {
        expect(isNotificationsInfiniteData(makeInfinite([makeList([makeNotification()])]))).toBe(true);
        expect(isNotificationsInfiniteData(makeList([makeNotification()]))).toBe(false);
        expect(isNotificationsInfiniteData({ pages: [], pageParams: [] })).toBe(true);
    });
});
