import { describe, expect, it } from "vitest";
import {
	cleanupLineSpaces,
	getWordEndTime,
	getWordStartTime,
	isWordSynced,
	normalizeLineTime,
	removeWordsFromLine,
} from "./normalize-line-time";
import type { LyricLine } from "$/types/ttml";

describe("normalizeLineTime utility", () => {
	const createMockLine = (
		words: Array<{
			word: string;
			startTime: number;
			endTime: number;
			ruby?: Array<{ word: string; startTime: number; endTime: number }>;
		}>,
		initialLineTimes = { startTime: 0, endTime: 0 },
	): LyricLine =>
		({
			id: "line-test",
			startTime: initialLineTimes.startTime,
			endTime: initialLineTimes.endTime,
			ignoreSync: false,
			words: words.map((w, index) => ({
				id: `word-${index}`,
				word: w.word,
				startTime: w.startTime,
				endTime: w.endTime,
				obscene: false,
				romanWord: "",
				ruby: w.ruby,
			})),
		}) as LyricLine;

	it("always sets line.endTime to the last synced word for partially synced lines", () => {
		const line = createMockLine([
			{ word: "Never", startTime: 1000, endTime: 1500 },
			{ word: "gonna", startTime: 1500, endTime: 2200 },
			{ word: "give", startTime: 0, endTime: 0 },
			{ word: "you", startTime: 0, endTime: 0 },
			{ word: "up", startTime: 0, endTime: 0 },
		]);

		normalizeLineTime(line);

		expect(line.startTime).toBe(1000);
		expect(line.endTime).toBe(2200); // Word "gonna", not the unsynced "up"
	});

	it("sets line.endTime to the final word when all words are synced", () => {
		const line = createMockLine([
			{ word: "Hello", startTime: 500, endTime: 1000 },
			{ word: "world", startTime: 1000, endTime: 1800 },
		]);

		normalizeLineTime(line);

		expect(line.startTime).toBe(500);
		expect(line.endTime).toBe(1800);
	});

	it("sets line.startTime to the first word that has a positive start time", () => {
		const line = createMockLine([
			{ word: " ", startTime: 0, endTime: 0 },
			{ word: "Start", startTime: 1200, endTime: 1800 },
			{ word: "End", startTime: 1800, endTime: 2500 },
		]);

		normalizeLineTime(line);

		expect(line.startTime).toBe(1200);
		expect(line.endTime).toBe(2500);
	});

	it("takes ruby end times into account for the last synced word", () => {
		const line = createMockLine([
			{ word: "私", startTime: 1000, endTime: 1500 },
			{
				word: "漢字",
				startTime: 1500,
				endTime: 1800,
				ruby: [
					{ word: "かん", startTime: 1500, endTime: 1800 },
					{ word: "じ", startTime: 1800, endTime: 2400 },
				],
			},
			{ word: "は", startTime: 0, endTime: 0 },
		]);

		normalizeLineTime(line);

		expect(line.startTime).toBe(1000);
		expect(line.endTime).toBe(2400); // from the ruby extension
	});

	it("preserves line-level timestamps when all words have no timings", () => {
		const line = createMockLine(
			[
				{ word: "Line", startTime: 0, endTime: 0 },
				{ word: "timed", startTime: 0, endTime: 0 },
			],
			{ startTime: 3000, endTime: 6000 },
		);

		normalizeLineTime(line);

		expect(line.startTime).toBe(3000);
		expect(line.endTime).toBe(6000);
	});

	it("correctly identifies synced and unsynced words", () => {
		const wordTimed = {
			id: "1",
			word: "a",
			startTime: 100,
			endTime: 200,
			obscene: false,
			romanWord: "",
		};
		const wordUnsynced = {
			id: "2",
			word: "b",
			startTime: 0,
			endTime: 0,
			obscene: false,
			romanWord: "",
		};
		const wordNegative = {
			id: "3",
			word: "c",
			startTime: 300,
			endTime: 200,
			obscene: false,
			romanWord: "",
		};

		expect(isWordSynced(wordTimed)).toBe(true);
		expect(isWordSynced(wordUnsynced)).toBe(false);
		expect(isWordSynced(wordNegative)).toBe(false);

		expect(getWordStartTime(wordTimed)).toBe(100);
		expect(getWordEndTime(wordTimed)).toBe(200);
	});

	it("handles empty words array safely", () => {
		const line = createMockLine([], { startTime: 100, endTime: 200 });
		normalizeLineTime(line);
		expect(line.startTime).toBe(100);
		expect(line.endTime).toBe(200);
	});
});

describe("cleanupLineSpaces and removeWordsFromLine", () => {
	const createWords = (items: Array<{ id: string; word: string; start?: number; end?: number }>) =>
		items.map((it) => ({
			id: it.id,
			word: it.word,
			startTime: it.start ?? 0,
			endTime: it.end ?? 0,
			obscene: false,
			romanWord: "",
		}));

	it("collapses consecutive space words in the middle after deleting a word", () => {
		const words = createWords([
			{ id: "w1", word: "Hello" },
			{ id: "s1", word: " " },
			{ id: "s2", word: " " },
			{ id: "w2", word: "world" },
		]);
		const cleaned = cleanupLineSpaces(words);
		expect(cleaned.map((w) => w.word)).toEqual(["Hello", " ", "world"]);
		expect(cleaned.map((w) => w.id)).toEqual(["w1", "s1", "w2"]);
	});

	it("removes leading space words when the first word is deleted", () => {
		const words = createWords([
			{ id: "s1", word: " " },
			{ id: "s2", word: " " },
			{ id: "w1", word: "world" },
		]);
		const cleaned = cleanupLineSpaces(words);
		expect(cleaned.map((w) => w.word)).toEqual(["world"]);
		expect(cleaned[0].id).toBe("w1");
	});

	it("removes trailing space words when the last word is deleted", () => {
		const words = createWords([
			{ id: "w1", word: "Hello" },
			{ id: "s1", word: " " },
			{ id: "s2", word: " " },
		]);
		const cleaned = cleanupLineSpaces(words);
		expect(cleaned.map((w) => w.word)).toEqual(["Hello"]);
		expect(cleaned[0].id).toBe("w1");
	});

	it("returns empty array if all words are space words", () => {
		const words = createWords([
			{ id: "s1", word: " " },
			{ id: "s2", word: "   " },
		]);
		expect(cleanupLineSpaces(words)).toEqual([]);
	});

	it("drops redundant space word adjacent to a word with trailing whitespace", () => {
		const words = createWords([
			{ id: "w1", word: "Hello " },
			{ id: "s1", word: " " },
			{ id: "w2", word: "world" },
		]);
		const cleaned = cleanupLineSpaces(words);
		expect(cleaned.map((w) => w.word)).toEqual(["Hello ", "world"]);
	});

	it("drops redundant space word preceding a word with leading whitespace", () => {
		const words = createWords([
			{ id: "w1", word: "Hello" },
			{ id: "s1", word: " " },
			{ id: "w2", word: " world" },
		]);
		const cleaned = cleanupLineSpaces(words);
		expect(cleaned.map((w) => w.word)).toEqual(["Hello", " world"]);
	});

	it("removeWordsFromLine correctly removes word, cleans spaces, and normalizes line times", () => {
		const line: LyricLine = {
			id: "line-1",
			startTime: 0,
			endTime: 0,
			ignoreSync: false,
			words: createWords([
				{ id: "w1", word: "First", start: 1000, end: 1500 },
				{ id: "s1", word: " " },
				{ id: "w2", word: "DeleteMe", start: 1500, end: 2000 },
				{ id: "s2", word: " " },
				{ id: "w3", word: "Third", start: 2000, end: 3000 },
			]),
		} as LyricLine;

		const removed = removeWordsFromLine(line, new Set(["w2"]));
		expect(removed).toBe(true);
		expect(line.words.map((w) => w.word)).toEqual(["First", " ", "Third"]);
		expect(line.words.map((w) => w.id)).toEqual(["w1", "s1", "w3"]);
		expect(line.startTime).toBe(1000);
		expect(line.endTime).toBe(3000);
	});

	it("removeWordsFromLine leaves line empty when all non-space words are removed", () => {
		const line: LyricLine = {
			id: "line-2",
			startTime: 1000,
			endTime: 2000,
			ignoreSync: false,
			words: createWords([
				{ id: "w1", word: "OnlyWord", start: 1000, end: 2000 },
				{ id: "s1", word: " " },
			]),
		} as LyricLine;

		const removed = removeWordsFromLine(line, new Set(["w1"]));
		expect(removed).toBe(true);
		expect(line.words).toEqual([]);
	});
});
