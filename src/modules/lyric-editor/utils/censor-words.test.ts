import { describe, expect, it } from "vitest";
import type { LyricLine, TTMLLyric } from "$/types/ttml";
import {
	censorText,
	censorTTMLLyric,
	cleanWordToken,
	findBadWordOccurrences,
	isBadWord,
	maskWordKeepPunctuation,
} from "./censor-words";

describe("censor-words utility", () => {
	describe("cleanWordToken", () => {
		it("normalizes words by trimming punctuation and lowercasing", () => {
			expect(cleanWordToken("  fuck!  ")).toBe("fuck");
			expect(cleanWordToken("(bitch,)")).toBe("bitch");
			expect(cleanWordToken('"SHIT"')).toBe("shit");
			expect(cleanWordToken("fuckin'")).toBe("fuckin'");
		});
	});

	describe("maskWordKeepPunctuation", () => {
		it("replaces core word with **** while preserving surrounding punctuation", () => {
			expect(maskWordKeepPunctuation("fuck")).toBe("****");
			expect(maskWordKeepPunctuation("fuck,")).toBe("****,");
			expect(maskWordKeepPunctuation("(bitch)")).toBe("(****)");
			expect(maskWordKeepPunctuation('"shit!"')).toBe('"****!"');
			expect(maskWordKeepPunctuation("...asshole?")).toBe("...****?");
		});
	});

	describe("censorText & isBadWord", () => {
		it("detects and replaces common bad words with ****", () => {
			expect(isBadWord("fuck")).toBe(true);
			expect(isBadWord("fucking")).toBe(true);
			expect(isBadWord("bitch")).toBe(true);
			expect(isBadWord("shit")).toBe(true);
			expect(isBadWord("asshole")).toBe(true);
			expect(isBadWord("ass")).toBe(true);
			expect(isBadWord("motherfucker")).toBe(true);

			expect(censorText("What the fuck")).toBe("What the ****");
			expect(censorText("She is a bitch, yeah")).toBe("She is a ****, yeah");
			expect(censorText("Holy shit!")).toBe("Holy ****!");
			expect(censorText("Kick some ass!")).toBe("Kick some ****!");
		});

		it("does NOT match innocent words containing bad word substrings", () => {
			expect(isBadWord("pass")).toBe(false);
			expect(isBadWord("grass")).toBe(false);
			expect(isBadWord("class")).toBe(false);
			expect(isBadWord("classic")).toBe(false);
			expect(isBadWord("asset")).toBe(false);
			expect(isBadWord("assist")).toBe(false);
			expect(isBadWord("cocktail")).toBe(false);
			expect(isBadWord("shirt")).toBe(false);
			expect(isBadWord("title")).toBe(false);

			expect(censorText("I pass the grass in class playing bass")).toBe(
				"I pass the grass in class playing bass",
			);
			expect(censorText("She drank a cocktail")).toBe("She drank a cocktail");
		});

		it("supports custom bad words", () => {
			expect(isBadWord("crap")).toBe(false);
			expect(isBadWord("crap", ["crap"])).toBe(true);
			expect(censorText("Holy crap!", ["crap"])).toBe("Holy ****!");
		});

		it("supports ignored words to prevent false positives", () => {
			expect(isBadWord("hoe")).toBe(true);
			expect(isBadWord("hoe", [], ["hoe"])).toBe(false);
			expect(censorText("Gardening hoe", [], ["hoe"])).toBe("Gardening hoe");
		});
	});

	describe("findBadWordOccurrences", () => {
		it("detects occurrences across lyric lines and preserves timing info", () => {
			const lines: LyricLine[] = [
				{
					id: "line-1",
					startTime: 1000,
					endTime: 3000,
					isBG: false,
					isDuet: false,
					ignoreSync: false,
					translatedLyric: "",
					romanLyric: "",
					words: [
						{
							id: "w-1",
							startTime: 1000,
							endTime: 1500,
							word: "What",
							obscene: false,
							romanWord: "",
						},
						{
							id: "w-2",
							startTime: 1500,
							endTime: 2000,
							word: "the",
							obscene: false,
							romanWord: "",
						},
						{
							id: "w-3",
							startTime: 2000,
							endTime: 2500,
							word: "fuck,",
							obscene: false,
							romanWord: "",
						},
					],
				},
				{
					id: "line-2",
					startTime: 4000,
					endTime: 6000,
					isBG: false,
					isDuet: false,
					ignoreSync: false,
					translatedLyric: "",
					romanLyric: "",
					words: [
						{
							id: "w-4",
							startTime: 4000,
							endTime: 5000,
							word: "Holy",
							obscene: false,
							romanWord: "",
						},
						{
							id: "w-5",
							startTime: 5000,
							endTime: 6000,
							word: "customWord",
							obscene: true, // Marked obscene!
							romanWord: "",
						},
					],
				},
			];

			const occurrences = findBadWordOccurrences(lines);
			expect(occurrences).toHaveLength(2);
			expect(occurrences[0].wordId).toBe("w-3");
			expect(occurrences[0].startTime).toBe(2000);
			expect(occurrences[0].matchedWord).toBe("fuck");

			// w-5 is caught because obscene is true
			expect(occurrences[1].wordId).toBe("w-5");
			expect(occurrences[1].isObsceneMarked).toBe(true);
		});
	});

	describe("censorTTMLLyric", () => {
		it("censors bad words while preserving word timing and structure", () => {
			const ttml: TTMLLyric = {
				metadata: [{ key: "title", value: ["Explicit Track"] }],
				lyricLines: [
					{
						id: "line-1",
						startTime: 1000,
						endTime: 3000,
						isBG: false,
						isDuet: false,
						ignoreSync: false,
						translatedLyric: "Translation with fuck",
						romanLyric: "",
						words: [
							{
								id: "w-1",
								startTime: 1000,
								endTime: 1500,
								word: "You",
								obscene: false,
								romanWord: "",
							},
							{
								id: "w-2",
								startTime: 1500,
								endTime: 2000,
								word: "bitch,",
								obscene: false,
								romanWord: "",
							},
						],
					},
				],
			};

			const clean = censorTTMLLyric(ttml);
			expect(clean.lyricLines[0].words[0].word).toBe("You");
			expect(clean.lyricLines[0].words[1].word).toBe("****,");
			expect(clean.lyricLines[0].words[1].startTime).toBe(1500);
			expect(clean.lyricLines[0].words[1].endTime).toBe(2000);
			expect(clean.lyricLines[0].translatedLyric).toBe("Translation with ****");
		});

		it("allows excluding specific word IDs from being censored", () => {
			const ttml: TTMLLyric = {
				metadata: [],
				lyricLines: [
					{
						id: "line-1",
						startTime: 1000,
						endTime: 3000,
						isBG: false,
						isDuet: false,
						ignoreSync: false,
						translatedLyric: "",
						romanLyric: "",
						words: [
							{
								id: "w-1",
								startTime: 1000,
								endTime: 1500,
								word: "fuck",
								obscene: false,
								romanWord: "",
							},
						],
					},
				],
			};

			const clean = censorTTMLLyric(ttml, [], [], "****", new Set(["w-1"]));
			expect(clean.lyricLines[0].words[0].word).toBe("fuck");
		});
	});
});
