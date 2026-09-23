/**
 * Settings tab identifiers shared by the settings page and the notification
 * action_url resolver so deep links such as `/dashboard/settings?tab=security`
 * resolve to the correct tab (F-02).
 */

export const SETTINGS_TAB_IDS = ["profile", "security", "notifications", "privacy"] as const;

export type SettingsTabId = (typeof SETTINGS_TAB_IDS)[number];

/**
 * Map a `?tab=` value to a settings tab index. Invalid or missing values fall
 * back to the first tab (Profile) instead of leaving the page in an
 * inconsistent state.
 */
export function settingsTabIndexFromTab(tab: string | null | undefined): number {
    if (!tab) return 0;
    const index = SETTINGS_TAB_IDS.indexOf(tab as SettingsTabId);
    return index >= 0 ? index : 0;
}
