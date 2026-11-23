import { describe, expect, it } from "vitest";
import {
	buildDiscordReviewMarkdown,
	formatTimestampClock,
	getWordsText,
} from "./exportMarkdown";
import type { ReviewFlag, ReviewLine } from "../types";

describe("exportMarkdown", () => {
	it("formats milliseconds into MM:SS correctly", () => {
		expect(formatTimestampClock(0)).toBe("00:00");
		expect(formatTimestampClock(5000)).toBe("00:05");
		expect(formatTimestampClock(65000)).toBe("01:05");
		expect(formatTimestampClock(125430)).toBe("02:05");
	});

	it("generates Discord markdown with underlines and line numbers", () => {
		const lines: ReviewLine[] = [
			{
				id: "line-1",
				lineNumber: 1,
				startTime: 15200,
				endTime: 18000,
				isBg: false,
				text: "I can feel it in the air",
				words: [
					{ id: "w-0", word: "I", startTime: 15200, endTime: 15400 },
					{ id: "w-1", word: "can", startTime: 15400, endTime: 15600 },
					{ id: "w-2", word: "feel", startTime: 15600, endTime: 16000 },
					{ id: "w-3", word: "it", startTime: 16000, endTime: 16200 },
					{ id: "w-4", word: "in", startTime: 16200, endTime: 16400 },
					{ id: "w-5", word: "the", startTime: 16400, endTime: 16600 },
					{ id: "w-6", word: "air", startTime: 16600, endTime: 17500 },
				],
			},
			{
				id: "line-2",
				lineNumber: 2,
				startTime: 28450,
				endTime: 32000,
				isBg: false,
				text: "Forever and always",
				words: [
					{ id: "w-7", word: "Forever", startTime: 28450, endTime: 29500 },
					{ id: "w-8", word: "and", startTime: 29500, endTime: 29800 },
					{ id: "w-9", word: "always", startTime: 29800, endTime: 31000 },
				],
			},
		];

		const flags: ReviewFlag[] = [
			{
				id: 1,
				lineIndex: 0,
				startWordIndex: 6,
				endWordIndex: 6,
				tpl: "Timing",
				where: "end",
				when: "late",
				notes: "This section ends too late for the audio provided, please adjust its end time.",
				quotedText: "air",
			},
			{
				id: 2,
				lineIndex: 1,
				startWordIndex: 0,
				endWordIndex: 0,
				tpl: "Suggest syllable split",
				notes: 'The word "Forever" should be split into "For-ev-er".',
				quotedText: "Forever",
			},
		];

		const md = buildDiscordReviewMarkdown({
			flags,
			lines,
			includeLineNumbers: true,
		});

		expect(md).toContain("> -# [00:15] · Line 1");
		expect(md).toContain("> I can feel it in the __air__");
		expect(md).toContain(
			"**Ends too late**: This section ends too late for the audio provided, please adjust its end time.",
		);

		expect(md).toContain("> -# [00:28] · Line 2");
		expect(md).toContain("> __Forever__ and always");
		expect(md).toContain(
			'**Suggest syllable split**: The word "Forever" should be split into "For-ev-er".',
		);
	});

	it("omits line numbers when includeLineNumbers is false", () => {
		const lines: ReviewLine[] = [
			{
				id: "l1",
				lineNumber: 4,
				startTime: 60000,
				endTime: 63000,
				isBg: false,
				text: "Hello world",
				words: [
					{ id: "w1", word: "Hello", startTime: 60000, endTime: 61000 },
					{ id: "w2", word: "world", startTime: 61000, endTime: 62000 },
				],
			},
		];

		const flags: ReviewFlag[] = [
			{
				id: 1,
				lineIndex: 0,
				startWordIndex: 0,
				endWordIndex: 1,
				tpl: "Spelling",
				notes: "Fix spelling",
				quotedText: "Hello world",
			},
		];

		const md = buildDiscordReviewMarkdown({
			flags,
			lines,
			includeLineNumbers: false,
		});

		expect(md).toContain("> -# [01:00]\n");
		expect(md).not.toContain("Line 4");
		expect(md).toContain("> __Hello world__");
	});

	it("formats writer flags at the top of the Discord review report", () => {
		const lines: ReviewLine[] = [
			{
				id: "line-1",
				lineNumber: 1,
				startTime: 10000,
				endTime: 12000,
				isBg: false,
				text: "Hello world",
				words: [
					{ id: "w-0", word: "Hello", startTime: 10000, endTime: 11000 },
					{ id: "w-1", word: "world", startTime: 11000, endTime: 12000 },
				],
			},
		];

		const flags: ReviewFlag[] = [
			{
				id: 1,
				lineIndex: 0,
				startWordIndex: 0,
				endWordIndex: 0,
				tpl: "Timing",
				where: "sync",
				when: "early",
				notes: "Too early",
				quotedText: "Hello",
			},
			{
				id: 2,
				targetType: "writer",
				lineIndex: -1,
				startWordIndex: -1,
				endWordIndex: -1,
				writerName: "John Doe",
				tpl: "Incorrect writer",
				notes: "Not a writer on this track",
				quotedText: "John Doe",
			},
		];

		const md = buildDiscordReviewMarkdown({
			flags,
			lines,
		});

		expect(md).toContain("> -# Songwriter Credit");
		expect(md).toContain("> Written by __John Doe__");
		expect(md).toContain("**Incorrect writer**: Not a writer on this track");

		const writerIdx = md.indexOf("Songwriter Credit");
		const lineIdx = md.indexOf("Line 1");
		expect(writerIdx).toBeLessThan(lineIdx);
	});

	it("correctly handles words with space tokens without generating extra spaces", () => {
		const wordsWithSpaces = [
			{ word: "Never" },
			{ word: " " },
			{ word: "gonna" },
			{ word: " " },
			{ word: "give" },
		];
		expect(getWordsText(wordsWithSpaces)).toBe("Never gonna give");

		const wordsWithoutSpaces = [
			{ word: "Never" },
			{ word: "gonna" },
			{ word: "give" },
		];
		expect(getWordsText(wordsWithoutSpaces)).toBe("Never gonna give");

		const line: ReviewLine = {
			id: "l-space",
			lineNumber: 1,
			startTime: 5000,
			endTime: 8000,
			isBg: false,
			text: "Never gonna give",
			words: [
				{ id: "w-0", word: "Never", startTime: 5000, endTime: 5500 },
				{ id: "w-1", word: " ", startTime: 0, endTime: 0 },
				{ id: "w-2", word: "gonna", startTime: 5500, endTime: 6000 },
				{ id: "w-3", word: " ", startTime: 0, endTime: 0 },
				{ id: "w-4", word: "give", startTime: 6000, endTime: 6500 },
			],
		};

		const flag: ReviewFlag = {
			id: 1,
			lineIndex: 0,
			startWordIndex: 0,
			endWordIndex: 2,
			tpl: "Timing",
			where: "sync",
			when: "late",
			notes: "Check timing",
			quotedText: "Never gonna",
		};

		const md = buildDiscordReviewMarkdown({
			flags: [flag],
			lines: [line],
			includeLineNumbers: false,
		});

		expect(md).toContain("> __Never gonna__ give");
	});
});
