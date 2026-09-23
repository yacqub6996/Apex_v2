import { describe, expect, it } from "vitest";
import { settingsTabIndexFromTab } from "@/utils/settings-tabs";

describe("settingsTabIndexFromTab", () => {
    it("maps valid tab ids to their index", () => {
        expect(settingsTabIndexFromTab("profile")).toBe(0);
        expect(settingsTabIndexFromTab("security")).toBe(1);
        expect(settingsTabIndexFromTab("notifications")).toBe(2);
        expect(settingsTabIndexFromTab("privacy")).toBe(3);
    });

    it("falls back to the profile tab for missing or invalid values", () => {
        expect(settingsTabIndexFromTab(undefined)).toBe(0);
        expect(settingsTabIndexFromTab(null)).toBe(0);
        expect(settingsTabIndexFromTab("")).toBe(0);
        expect(settingsTabIndexFromTab("bogus")).toBe(0);
    });
});
