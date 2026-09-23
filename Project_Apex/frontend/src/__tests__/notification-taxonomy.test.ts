import { describe, expect, it } from "vitest";
import { NotificationType } from "@/api";
import {
    getNotificationTypeVisual,
    NOTIFICATION_TYPE_VISUALS,
} from "@/components/notifications/notification-taxonomy";

describe("notification taxonomy", () => {
    it("maps every value in the canonical NotificationType enum", () => {
        const enumValues = Object.values(NotificationType);
        expect(enumValues.length).toBeGreaterThan(0);

        for (const value of enumValues) {
            const visual = getNotificationTypeVisual(value);
            expect(visual.Icon, `missing icon for ${value}`).toBeTruthy();
            expect(["success", "error", "warning", "info"]).toContain(visual.tone);
            expect(visual.label.length).toBeGreaterThan(0);
        }
        expect(Object.keys(NOTIFICATION_TYPE_VISUALS)).toHaveLength(enumValues.length);
    });

    it("uses meaningful treatments for key financial events", () => {
        expect(getNotificationTypeVisual(NotificationType.WITHDRAWAL_REJECTED).tone).toBe("error");
        expect(getNotificationTypeVisual(NotificationType.ROI_RECEIVED).tone).toBe("success");
        expect(getNotificationTypeVisual(NotificationType.COMMISSION_CONFIRMED).tone).toBe(
            "success",
        );
        expect(getNotificationTypeVisual(NotificationType.SECURITY_ALERT).tone).toBe("warning");
        expect(getNotificationTypeVisual(NotificationType.COPY_DRAWDOWN_ALERT).tone).toBe("error");
    });

    it("falls back to the generic Info treatment for unknown or missing types", () => {
        const fallback = getNotificationTypeVisual(undefined);
        expect(fallback.tone).toBe("info");
        expect(getNotificationTypeVisual("NOT_A_REAL_TYPE")).toEqual(fallback);
        expect(getNotificationTypeVisual(null)).toEqual(fallback);
    });
});
