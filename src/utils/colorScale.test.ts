import { describe, expect, it } from "vitest";
import {
	getThemeTintedBackgrounds,
	hslToHex,
	parseColorToHsl,
	RADIX_ACCENT_HEX,
} from "./colorScale";

describe("colorScale theme background tinting", () => {
	it("should parse hex colors to HSL accurately", () => {
		const hsl = parseColorToHsl("#8e4ec6"); // purple
		expect(hsl).not.toBeNull();
		expect(Math.round(hsl!.h)).toBe(272);
		expect(hsl!.s).toBeGreaterThan(50);
	});

	it("should parse rgba colors to HSL accurately", () => {
		const hsl = parseColorToHsl("rgba(245, 240, 255, 0.85)");
		expect(hsl).not.toBeNull();
		expect(Math.round(hsl!.h)).toBeGreaterThan(250);
		expect(Math.round(hsl!.h)).toBeLessThan(280);
	});

	it("should convert HSL to hex correctly", () => {
		expect(hslToHex(0, 100, 50)).toBe("#ff0000");
		expect(hslToHex(120, 100, 50)).toBe("#00ff00");
		expect(hslToHex(240, 100, 50)).toBe("#0000ff");
	});

	it("should generate a theme-tinted dark background for purple", () => {
		const result = getThemeTintedBackgrounds({
			accentColor: "purple",
			isDark: true,
		});
		expect(result.rootBg).toMatch(/^#[0-9a-f]{6}$/i);
		expect(result.rootBg).not.toBe("#0b0b0d"); // Not hardcoded pitch black
		expect(result.editorBg).toBe(result.rootBg);
		expect(result.dialogBg).toMatch(/^#[0-9a-f]{6}$/i);
	});

	it("should generate a theme-tinted light background for purple", () => {
		const result = getThemeTintedBackgrounds({
			accentColor: "purple",
			isDark: false,
		});
		expect(result.rootBg).toMatch(/^#[0-9a-f]{6}$/i);
		expect(result.rootBg).not.toBe("#fafafa"); // Not sterile gray
		expect(result.editorBg).toBe(result.rootBg);
		expect(result.dialogBg).toBe("#ffffff");
	});

	it("should derive tint from vTitlebarBg when set", () => {
		const darkResult = getThemeTintedBackgrounds({
			vTitlebarBg: "#160d24",
			isDark: true,
		});
		expect(darkResult.rootBg).toMatch(/^#[0-9a-f]{6}$/i);
		expect(darkResult.rootBg).not.toBe("#0b0b0d");

		const lightResult = getThemeTintedBackgrounds({
			vTitlebarBg: "rgba(245, 240, 255, 0.85)",
			isDark: false,
		});
		expect(lightResult.rootBg).toMatch(/^#[0-9a-f]{6}$/i);
		expect(lightResult.rootBg).not.toBe("#fafafa");
	});

	it("should ignore default neutral #1f1f1f for vTitlebarBg and use accentColor instead", () => {
		const result = getThemeTintedBackgrounds({
			vTitlebarBg: "#1f1f1f",
			accentColor: "blue",
			isDark: true,
		});
		expect(result.rootBg).not.toBe("#111113");
		expect(result.rootBg).toMatch(/^#[0-9a-f]{6}$/i);
	});

	it("should support custom hex accent colors", () => {
		const result = getThemeTintedBackgrounds({
			useCustomAccent: true,
			customAccentColor: "#00ffcc",
			isDark: true,
		});
		expect(result.rootBg).toMatch(/^#[0-9a-f]{6}$/i);
	});

	it("should fallback to neutral dark and light backgrounds when accent is gray", () => {
		const darkResult = getThemeTintedBackgrounds({
			accentColor: "gray",
			isDark: true,
		});
		expect(darkResult.rootBg).toBe("#111113");
		expect(darkResult.dialogBg).toBe("#18181b");

		const lightResult = getThemeTintedBackgrounds({
			accentColor: "gray",
			isDark: false,
		});
		expect(lightResult.rootBg).toBe("#fafafa");
		expect(lightResult.dialogBg).toBe("#ffffff");
	});

	it("should have all 26 Radix accent colors defined in RADIX_ACCENT_HEX", () => {
		expect(Object.keys(RADIX_ACCENT_HEX)).toHaveLength(26);
		for (const hex of Object.values(RADIX_ACCENT_HEX)) {
			expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});
});
