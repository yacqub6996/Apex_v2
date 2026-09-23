/**
 * Centralized resolver for backend notification `action_url` values (F-01).
 *
 * The backend emits relative action URLs that predate the current TanStack
 * Router route table (for example `/copy-trading`, `/transactions`, and
 * `/settings/security`). This module is the single source of truth that maps
 * those legacy URLs to actually registered application routes so notification
 * clicks never land on the 404 splat route.
 *
 * Keep this map in sync with the `action_url=` values emitted by
 * `backend/app/services/notification_service.py`. Unknown URLs resolve to
 * `null` and are surfaced with a `console.warn` so drift is visible.
 */

export interface NotificationRouteTarget {
    to: string;
    search?: Record<string, string>;
}

const ACTION_URL_ROUTE_MAP: Record<string, NotificationRouteTarget> = {
    "/dashboard": { to: "/dashboard" },
    "/plans": { to: "/plans" },
    "/kyc": { to: "/kyc" },
    "/support": { to: "/support" },
    // Legacy backend URL → current registered route.
    "/copy-trading": { to: "/dashboard/copy-trading" },
    // The account page hosts the transaction ledger (list + full modal).
    "/transactions": { to: "/dashboard/account" },
    // Settings tabs are identified by the `tab` search param.
    "/settings/security": { to: "/dashboard/settings", search: { tab: "security" } },
};

/**
 * Every distinct `action_url` value currently emitted by the backend, used by
 * tests to guarantee that the resolver stays complete.
 */
export const KNOWN_BACKEND_ACTION_URLS: readonly string[] = Object.freeze(
    Object.keys(ACTION_URL_ROUTE_MAP),
);

const stripTrailingSlash = (value: string): string =>
    value.length > 1 ? value.replace(/\/+$/, "") : value;

/**
 * Resolve a backend notification `action_url` to a registered frontend route.
 *
 * Returns `null` when the URL is absent, unparseable, or has no mapping so the
 * caller can safely ignore navigation instead of sending the user to a 404.
 */
export function resolveNotificationActionUrl(
    actionUrl: string | null | undefined,
): NotificationRouteTarget | null {
    if (!actionUrl) return null;

    const trimmed = actionUrl.trim();
    if (!trimmed) return null;

    let pathname: string;
    if (/^https?:\/\//i.test(trimmed)) {
        try {
            pathname = new URL(trimmed).pathname;
        } catch {
            return null;
        }
    } else {
        pathname = trimmed.split(/[?#]/, 1)[0];
    }

    const normalized = stripTrailingSlash(pathname) || "/";
    const target = ACTION_URL_ROUTE_MAP[normalized];
    if (!target) {
        console.warn(`[notifications] Unmapped notification action_url: ${actionUrl}`);
        return null;
    }
    return target;
}

/**
 * Serialize a resolved target back into a navigable path string. Used by
 * non-React consumers (for example the browser-notification click handler)
 * that cannot call the TanStack Router navigate function directly.
 */
export function notificationTargetToPath(target: NotificationRouteTarget): string {
    const search = target.search
        ? `?${new URLSearchParams(target.search).toString()}`
        : "";
    return `${target.to}${search}`;
}
