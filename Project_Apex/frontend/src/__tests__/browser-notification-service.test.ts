import { beforeEach, describe, expect, it } from "vitest";
import {
    clearShownNotificationIds,
    isNotificationIdShown,
    markNotificationIdShown,
} from "@/services/browser-notification-service";

describe("browser notification id deduplication", () => {
    beforeEach(() => {
        clearShownNotificationIds();
    });

    it("tracks notification ids across calls", () => {
        expect(isNotificationIdShown("n-1")).toBe(false);
        markNotificationIdShown("n-1");
        expect(isNotificationIdShown("n-1")).toBe(true);
    });

    it("is idempotent for repeated marks", () => {
        markNotificationIdShown("n-1");
        markNotificationIdShown("n-1");
        expect(isNotificationIdShown("n-1")).toBe(true);
    });

    it("ignores empty ids", () => {
        markNotificationIdShown("");
        expect(isNotificationIdShown("")).toBe(false);
    });

    it("persists the registry to sessionStorage", () => {
        markNotificationIdShown("persisted-1");
        const stored = window.sessionStorage.getItem("apex:shown-browser-notification-ids");
        expect(stored).toContain("persisted-1");
    });

    it("clearShownNotificationIds resets the in-memory and stored state", () => {
        markNotificationIdShown("n-1");
        clearShownNotificationIds();
        expect(isNotificationIdShown("n-1")).toBe(false);
        expect(window.sessionStorage.getItem("apex:shown-browser-notification-ids")).toBeNull();
    });
});
