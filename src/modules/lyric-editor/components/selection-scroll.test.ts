import { describe, expect, it } from "vitest";
import { ToolMode } from "$/states/main.ts";
import type { LyricLine } from "$/types/ttml.ts";
import {
	findCurrentLineIndex,
	getActiveLineIndex,
	isLineVisibleInViewport,
	shouldAutoCenterSelection,
} from "./selection-scroll";

describe("shouldAutoCenterSelection", () => {
	it("keeps direct Edit-mode selections stationary", () => {
		expect(shouldAutoCenterSelection(ToolMode.Edit)).toBe(false);
	});

	it("preserves automatic centering in Sync mode", () => {
		expect(shouldAutoCenterSelection(ToolMode.Sync)).toBe(true);
	});

	it("does not auto-center selections in Preview mode", () => {
		expect(shouldAutoCenterSelection(ToolMode.Preview)).toBe(false);
	});
});

describe("findCurrentLineIndex", () => {
	const sampleLines: LyricLine[] = [
		{
			id: "line-1",
			words: [{ id: "w-1", word: "Hello", startTime: 1000, endTime: 2000 }],
			startTime: 1000,
			endTime: 2000,
		},
		{
			id: "line-2",
			words: [{ id: "w-2", word: "World", startTime: 3000, endTime: 4000 }],
			startTime: 3000,
			endTime: 4000,
		},
	];

	it("returns -1 for empty lines", () => {
		expect(findCurrentLineIndex([], 1000)).toBe(-1);
	});

	it("finds exact line within time range", () => {
		expect(findCurrentLineIndex(sampleLines, 1500)).toBe(0);
		expect(findCurrentLineIndex(sampleLines, 3500)).toBe(1);
	});

	it("returns previous line when current time is between lines", () => {
		expect(findCurrentLineIndex(sampleLines, 2500)).toBe(0);
	});
});

describe("getActiveLineIndex", () => {
	const sampleLines: LyricLine[] = [
		{
			id: "line-1",
			words: [{ id: "w-1", word: "Hello", startTime: 1000, endTime: 2000 }],
			startTime: 1000,
			endTime: 2000,
		},
		{
			id: "line-2",
			words: [
				{ id: "w-2", word: "Beautiful", startTime: 3000, endTime: 3500 },
				{ id: "w-3", word: "World", startTime: 3500, endTime: 4000 },
			],
			startTime: 3000,
			endTime: 4000,
		},
		{
			id: "line-3",
			words: [{ id: "w-4", word: "!", startTime: 5000, endTime: 6000 }],
			startTime: 5000,
			endTime: 6000,
		},
	];

	it("returns selected line index when selectedLines is set", () => {
		expect(
			getActiveLineIndex({
				lyricLines: sampleLines,
				selectedLines: new Set(["line-2"]),
			}),
		).toBe(1);
	});

	it("returns line containing selected word when only selectedWords is set", () => {
		expect(
			getActiveLineIndex({
				lyricLines: sampleLines,
				selectedLines: new Set(),
				selectedWords: new Set(["w-3"]),
			}),
		).toBe(1);
	});

	it("returns current audio line when no selection exists", () => {
		expect(
			getActiveLineIndex({
				lyricLines: sampleLines,
				currentTime: 3200,
			}),
		).toBe(1);
	});

	it("returns fallbackIndex when no selection and currentTime is 0", () => {
		expect(
			getActiveLineIndex({
				lyricLines: sampleLines,
				currentTime: 0,
				fallbackIndex: 2,
			}),
		).toBe(2);
	});

	it("returns -1 when lines are empty", () => {
		expect(
			getActiveLineIndex({
				lyricLines: [],
				selectedLines: new Set(["line-1"]),
			}),
		).toBe(-1);
	});
});

describe("isLineVisibleInViewport", () => {
	it("returns true when line is within viewport range", () => {
		expect(isLineVisibleInViewport(5, [3, 8])).toBe(true);
		expect(isLineVisibleInViewport(3, [3, 8])).toBe(true);
		expect(isLineVisibleInViewport(8, [3, 8])).toBe(true);
	});

	it("returns false when line is outside viewport range", () => {
		expect(isLineVisibleInViewport(2, [3, 8])).toBe(false);
		expect(isLineVisibleInViewport(9, [3, 8])).toBe(false);
	});

	it("returns false when viewport range is uninitialized", () => {
		expect(isLineVisibleInViewport(5, [-1, -1])).toBe(false);
	});
});
