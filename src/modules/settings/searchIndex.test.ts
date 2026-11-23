import { describe, expect, it } from "vitest";
import { filterSettings, SETTINGS_SEARCH_ITEMS } from "./searchIndex";

describe("Settings searchIndex", () => {
	it("returns empty array for empty or whitespace query", () => {
		expect(filterSettings("")).toEqual([]);
		expect(filterSettings("   ")).toEqual([]);
	});

	it("finds theme and appearance settings", () => {
		const results = filterSettings("theme");
		expect(results.length).toBeGreaterThan(0);
		const hasBuiltin = results.some((r) => r.id === "appearance-themes");
		const hasThemeMode = results.some((r) => r.id === "appearance-theme-mode");
		expect(hasBuiltin).toBe(true);
		expect(hasThemeMode).toBe(true);
	});

	it("finds audio and equalizer settings", () => {
		const results = filterSettings("equalizer");
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].tab).toBe("audio");
	});

	it("finds sync and offset settings", () => {
		const results = filterSettings("offset");
		expect(results.length).toBeGreaterThan(0);
		const ids = results.map((r) => r.id);
		expect(ids).toContain("editor-sync-offset");
	});

	it("handles multi-term queries", () => {
		const results = filterSettings("smart word");
		expect(results.length).toBeGreaterThan(0);
		expect(results.every((r) => r.tab === "editor")).toBe(true);
	});

	it("finds review empty state setting", () => {
		const results = filterSettings("review");
		expect(results.length).toBeGreaterThan(0);
		expect(results.some((r) => r.id === "editor-show-review-empty")).toBe(true);
	});

	it("has valid tab definitions for all indexed items", () => {
		const validTabs = [
			"common",
			"account",
			"editor",
			"files",
			"audio",
			"keybinding",
			"appearance",
			"discord",
			"about",
			"dev",
		];
		for (const item of SETTINGS_SEARCH_ITEMS) {
			expect(validTabs).toContain(item.tab);
			expect(item.title.length).toBeGreaterThan(0);
		}
	});
});
