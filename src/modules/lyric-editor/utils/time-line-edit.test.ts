import { describe, expect, it } from "vitest";
import { newLyricWord } from "$/types/ttml";
import {
	applyTimeLineDraft,
	hasOutOfOrderWordTimings,
} from "./time-line-edit";

const word = (
	id: string,
	text: string,
	startTime: number,
	endTime: number,
) => ({
	...newLyricWord(),
	id,
	word: text,
	startTime,
	endTime,
});

describe("applyTimeLineDraft", () => {
	it("preserves existing word timing when text or order changes", () => {
		const first = word("a", "First", 1_000, 1_500);
		const second = word("b", "Second", 1_500, 2_000);

		const result = applyTimeLineDraft(
			[first, second],
			[
				{ ...second, word: "Edited", startTime: 0, endTime: 0 },
				{ ...first, word: "First", startTime: 0, endTime: 0 },
			],
		);

		expect(result.map((item) => item.word)).toEqual(["Edited", "First"]);
		expect(result.map((item) => [item.startTime, item.endTime])).toEqual([
			[1_500, 2_000],
			[1_000, 1_500],
		]);
	});

	it("leaves a newly added word unsynced", () => {
		const existing = word("a", "First", 1_000, 1_500);
		const added = { ...newLyricWord(), id: "new", word: "Added" };

		const result = applyTimeLineDraft([existing], [existing, added]);

		expect(result[1]).toMatchObject({
			id: "new",
			word: "Added",
			startTime: 0,
			endTime: 0,
		});
	});

	it("keeps the remaining timings when a word is deleted", () => {
		const first = word("a", "First", 1_000, 1_500);
		const second = word("b", "Second", 1_500, 2_000);
		const third = word("c", "Third", 2_000, 2_500);

		const result = applyTimeLineDraft([first, second, third], [first, third]);

		expect(result.map((item) => item.id)).toEqual(["a", "c"]);
		expect(result.map((item) => [item.startTime, item.endTime])).toEqual([
			[1_000, 1_500],
			[2_000, 2_500],
		]);
	});
});

describe("hasOutOfOrderWordTimings", () => {
	it("accepts words in timing order", () => {
		expect(
			hasOutOfOrderWordTimings([
				word("a", "One", 1_000, 1_500),
				word("b", "Two", 1_500, 2_000),
			]),
		).toBe(false);
	});

	it("detects reordered words and overlapping timings", () => {
		expect(
			hasOutOfOrderWordTimings([
				word("b", "Two", 1_500, 2_000),
				word("a", "One", 1_000, 1_500),
			]),
		).toBe(true);

		expect(
			hasOutOfOrderWordTimings([
				word("a", "One", 1_000, 2_000),
				word("b", "Two", 1_500, 2_500),
			]),
		).toBe(true);
	});

	it("ignores unsynced words and spaces", () => {
		expect(
			hasOutOfOrderWordTimings([
				word("a", "One", 1_000, 1_500),
				{ ...newLyricWord(), id: "new", word: "New" },
				word("space", " ", 0, 0),
				word("b", "Two", 1_500, 2_000),
			]),
		).toBe(false);
	});
});

