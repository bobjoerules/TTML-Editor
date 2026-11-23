import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import { spectrogramVisibleAtom } from "$/modules/audio/states";
import { ToolMode, toolModeAtom } from "$/states/main";
import {
	reviewSpectrogramVisibleAtom,
	showReviewInEmptyStateAtom,
	ttmlReviewDialogAtom,
} from "./states";

describe("TTML Review states", () => {
	it("defaults showReviewInEmptyStateAtom to false", () => {
		const store = createStore();
		expect(store.get(showReviewInEmptyStateAtom)).toBe(false);
	});

	it("allows toggling showReviewInEmptyStateAtom", () => {
		const store = createStore();
		store.set(showReviewInEmptyStateAtom, true);
		expect(store.get(showReviewInEmptyStateAtom)).toBe(true);
	});

	it("syncs ttmlReviewDialogAtom with toolModeAtom", () => {
		const store = createStore();
		expect(store.get(toolModeAtom)).toBe(ToolMode.Edit);
		expect(store.get(ttmlReviewDialogAtom)).toBe(false);

		// Setting ttmlReviewDialogAtom to true switches toolMode to Review
		store.set(ttmlReviewDialogAtom, true);
		expect(store.get(toolModeAtom)).toBe(ToolMode.Review);
		expect(store.get(ttmlReviewDialogAtom)).toBe(true);

		// Setting ttmlReviewDialogAtom to false returns toolMode to Edit
		store.set(ttmlReviewDialogAtom, false);
		expect(store.get(toolModeAtom)).toBe(ToolMode.Edit);
		expect(store.get(ttmlReviewDialogAtom)).toBe(false);
	});

	it("isolates reviewSpectrogramVisibleAtom from global spectrogramVisibleAtom", () => {
		const store = createStore();
		expect(store.get(reviewSpectrogramVisibleAtom)).toBe(false);
		expect(store.get(spectrogramVisibleAtom)).toBe(false);

		// Expanding in review dialog does not expand main app
		store.set(reviewSpectrogramVisibleAtom, true);
		expect(store.get(reviewSpectrogramVisibleAtom)).toBe(true);
		expect(store.get(spectrogramVisibleAtom)).toBe(false);

		// Expanding in main app does not affect review dialog
		store.set(spectrogramVisibleAtom, true);
		store.set(reviewSpectrogramVisibleAtom, false);
		expect(store.get(reviewSpectrogramVisibleAtom)).toBe(false);
		expect(store.get(spectrogramVisibleAtom)).toBe(true);
	});
});
