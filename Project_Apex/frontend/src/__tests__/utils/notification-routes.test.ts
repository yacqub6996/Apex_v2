import { describe, expect, it } from "vitest";
import {
    KNOWN_BACKEND_ACTION_URLS,
    notificationTargetToPath,
    resolveNotificationActionUrl,
} from "@/utils/notification-routes";

/**
 * Distinct `action_url` values currently emitted by the backend
 * (backend/app/services/notification_service.py). This list is independent of
 * the resolver map so the test verifies the resolver stays complete.
 */
const DISTINCT_BACKEND_ACTION_URLS = [
    "/transactions",
    "/copy-trading",
    "/settings/security",
    "/dashboard",
    "/kyc",
    "/support",
    "/plans",
] as const;

/** Routes registered in src/routes + src/routes/dashboard (routeTree.gen.ts). */
const REGISTERED_FRONTEND_ROUTES = new Set([
    "/",
    "/home",
    "/login",
    "/signup",
    "/plans",
    "/kyc",
    "/support",
    "/privacy-policy",
    "/onboarding",
    "/verify-email",
    "/dashboard",
    "/dashboard/settings",
    "/dashboard/executions",
    "/dashboard/copy-trading",
    "/dashboard/account",
    "/reset-password",
    "/auth/reset",
    "/component-showcase",
    "/admin/dashboard",
    "/admin/users",
    "/admin/trader-manager",
    "/admin/plan-manager",
    "/admin/long-term",
    "/admin/ledger-history",
    "/admin/kyc-review",
    "/admin/balance-adjustment",
]);

describe("resolveNotificationActionUrl", () => {
    it("maps every backend-emitted action_url to a registered route", () => {
        for (const url of DISTINCT_BACKEND_ACTION_URLS) {
            const target = resolveNotificationActionUrl(url);
            expect(target, `unresolved: ${url}`).not.toBeNull();
            expect(
                REGISTERED_FRONTEND_ROUTES.has(target!.to),
                `${url} resolves to unregistered route: ${target!.to}`,
            ).toBe(true);
        }
    });

    it("keeps the known-backend-URL registry in sync with the resolver map", () => {
        for (const url of DISTINCT_BACKEND_ACTION_URLS) {
            expect(KNOWN_BACKEND_ACTION_URLS).toContain(url);
        }
        expect(KNOWN_BACKEND_ACTION_URLS).toHaveLength(DISTINCT_BACKEND_ACTION_URLS.length);
    });

    it("corrects the legacy /copy-trading URL to the registered route", () => {
        expect(resolveNotificationActionUrl("/copy-trading")).toEqual({
            to: "/dashboard/copy-trading",
        });
    });

    it("maps /settings/security to the settings security tab", () => {
        expect(resolveNotificationActionUrl("/settings/security")).toEqual({
            to: "/dashboard/settings",
            search: { tab: "security" },
        });
    });

    it("routes /transactions to the existing account ledger page", () => {
        expect(resolveNotificationActionUrl("/transactions")).toEqual({
            to: "/dashboard/account",
        });
    });

    it("passes through already-valid backend URLs", () => {
        expect(resolveNotificationActionUrl("/dashboard")).toEqual({ to: "/dashboard" });
        expect(resolveNotificationActionUrl("/plans")).toEqual({ to: "/plans" });
        expect(resolveNotificationActionUrl("/kyc")).toEqual({ to: "/kyc" });
        expect(resolveNotificationActionUrl("/support")).toEqual({ to: "/support" });
    });

    it("normalizes trailing slashes, query strings, and absolute URLs", () => {
        expect(resolveNotificationActionUrl("/dashboard/")).toEqual({ to: "/dashboard" });
        expect(resolveNotificationActionUrl("/kyc?ref=email")?.to).toBe("/kyc");
        expect(resolveNotificationActionUrl("https://apex-portfolios.org/plans")?.to).toBe(
            "/plans",
        );
    });

    it("returns null for absent, empty, or unmapped URLs", () => {
        expect(resolveNotificationActionUrl(null)).toBeNull();
        expect(resolveNotificationActionUrl(undefined)).toBeNull();
        expect(resolveNotificationActionUrl("")).toBeNull();
        expect(resolveNotificationActionUrl("/does-not-exist")).toBeNull();
    });

    it("serializes resolved targets back into navigable paths", () => {
        expect(
            notificationTargetToPath({
                to: "/dashboard/settings",
                search: { tab: "security" },
            }),
        ).toBe("/dashboard/settings?tab=security");
        expect(notificationTargetToPath({ to: "/dashboard/account" })).toBe(
            "/dashboard/account",
        );
    });
});
