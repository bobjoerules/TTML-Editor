import { describe, expect, it } from "vitest";
import {
	formatVoiceLabel,
	type LyricLine,
	newLyricLine,
	newLyricWord,
	type TTMLLyric,
} from "$/types/ttml";
import { splitTrailingSpace } from "../components/lyric-word-view";
import {
	applyAutoDuetBySinger,
	extractFirstSinger,
	getLineSinger,
} from "./auto-duet";
import { applyReviewedSections } from "./section-system";

describe("splitTrailingSpace", () => {
	it("splits trailing single space into baseWord and spaceWord", () => {
		const result = splitTrailingSpace("hello ");
		expect(result).toEqual({
			baseWord: "hello",
			spaceWord: " ",
		});
	});

	it("splits trailing multiple spaces into baseWord and spaceWord", () => {
		const result = splitTrailingSpace("world   ");
		expect(result).toEqual({
			baseWord: "world",
			spaceWord: "   ",
		});
	});

	it("returns unchanged for word without trailing space", () => {
		const result = splitTrailingSpace("hello");
		expect(result).toEqual({
			baseWord: "hello",
			spaceWord: undefined,
		});
	});

	it("does not split if word is only spaces", () => {
		const result = splitTrailingSpace("   ");
		expect(result).toEqual({
			baseWord: "   ",
			spaceWord: undefined,
		});
	});

	it("conditionally splits space based on autoSplitTrailingSpace toggle", () => {
		const input = "test ";
		const splitWhenOn = true ? splitTrailingSpace(input) : { baseWord: input, spaceWord: undefined };
		expect(splitWhenOn).toEqual({ baseWord: "test", spaceWord: " " });

		const splitWhenOff = false ? splitTrailingSpace(input) : { baseWord: input, spaceWord: undefined };
		expect(splitWhenOff).toEqual({ baseWord: "test ", spaceWord: undefined });
	});
});

describe("Auto duet vocalist assignment logic", () => {
	it("extracts the first singer when multiple people are listed in vocalist", () => {
		expect(extractFirstSinger("Raveena & JPEGMAFIA")).toBe("Raveena");
		expect(extractFirstSinger("Raveena and JPEGMAFIA")).toBe("Raveena");
		expect(extractFirstSinger("Raveena, JPEGMAFIA")).toBe("Raveena");
		expect(extractFirstSinger("Raveena / JPEGMAFIA")).toBe("Raveena");
		expect(extractFirstSinger("Raveena + JPEGMAFIA")).toBe("Raveena");
		expect(extractFirstSinger("Raveena with JPEGMAFIA")).toBe("Raveena");
		expect(extractFirstSinger("Raveena feat. JPEGMAFIA")).toBe("Raveena");
		expect(extractFirstSinger("Raveena (feat. JPEGMAFIA)")).toBe("Raveena");
		expect(extractFirstSinger("Alice")).toBe("Alice");
		expect(extractFirstSinger("   JPEGMAFIA   ")).toBe("JPEGMAFIA");
		expect(extractFirstSinger(undefined)).toBeUndefined();
	});

	it("identifies primary singer and secondary duet singers correctly", () => {
		const lyrics: TTMLLyric = {
			metadata: [],
			sections: [
				{
					id: "sec-1",
					label: "[Verse 1: Alice]",
					category: "verse",
					vocalist: "Alice",
				},
				{
					id: "sec-2",
					label: "[Chorus: Bob]",
					category: "chorus",
					vocalist: "Bob",
				},
			],
			lyricLines: [
				{
					...newLyricLine(),
					id: "line-1",
					sectionId: "sec-1",
					words: [{ ...newLyricWord(), word: "Hi" }],
				},
				{
					...newLyricLine(),
					id: "line-2",
					sectionId: "sec-2",
					words: [{ ...newLyricWord(), word: "Hello" }],
				},
			],
		};

		const result = applyAutoDuetBySinger(lyrics);
		expect(result).toMatchObject({
			singersCount: 2,
			singerMap: { Alice: "v1", Bob: "v2" },
		});
		expect(lyrics.lyricLines[0].agent).toBe("v1");
		expect(lyrics.lyricLines[0].isDuet).toBe(false); // Alice (primary)
		expect(lyrics.lyricLines[1].agent).toBe("v2");
		expect(lyrics.lyricLines[1].isDuet).toBe(true); // Bob (duet)
	});

	it("uses first person for auto duet when section lists two people (e.g. Raveena & JPEGMAFIA)", () => {
		const lyrics: TTMLLyric = {
			metadata: [],
			sections: [
				{
					id: "sec-1",
					label: "[Verse 1: Raveena]",
					category: "verse",
					vocalist: "Raveena",
				},
				{
					id: "sec-2",
					label: "[Chorus: Raveena & JPEGMAFIA]",
					category: "chorus",
					vocalist: "Raveena & JPEGMAFIA",
				},
				{
					id: "sec-3",
					label: "[Verse 2: JPEGMAFIA]",
					category: "verse",
					vocalist: "JPEGMAFIA",
				},
			],
			lyricLines: [
				{
					...newLyricLine(),
					id: "line-1",
					sectionId: "sec-1",
					words: [{ ...newLyricWord(), word: "Solo Raveena" }],
				},
				{
					...newLyricLine(),
					id: "line-2",
					sectionId: "sec-2",
					words: [{ ...newLyricWord(), word: "Duet Chorus" }],
				},
				{
					...newLyricLine(),
					id: "line-3",
					sectionId: "sec-3",
					words: [{ ...newLyricWord(), word: "Solo JPEGMAFIA" }],
				},
			],
		};

		const result = applyAutoDuetBySinger(lyrics);
		expect(result).toMatchObject({
			singersCount: 2,
			singerMap: { Raveena: "v1", JPEGMAFIA: "v2" },
		});
		// Raveena is primary (first person in Verse 1 & Chorus)
		expect(lyrics.lyricLines[0].agent).toBe("v1");
		expect(lyrics.lyricLines[0].isDuet).toBe(false); // Raveena solo
		expect(lyrics.lyricLines[1].agent).toBe("v1");
		expect(lyrics.lyricLines[1].isDuet).toBe(false); // Raveena & JPEGMAFIA resolves to first person Raveena (primary)
		expect(lyrics.lyricLines[2].agent).toBe("v2");
		expect(lyrics.lyricLines[2].isDuet).toBe(true); // JPEGMAFIA solo is secondary (duet)
	});

	it("uses first person as primary even if multi-person section comes first", () => {
		const lyrics: TTMLLyric = {
			metadata: [],
			sections: [
				{
					id: "sec-1",
					label: "[Chorus: Raveena & JPEGMAFIA]",
					category: "chorus",
					vocalist: "Raveena & JPEGMAFIA",
				},
				{
					id: "sec-2",
					label: "[Verse 1: JPEGMAFIA]",
					category: "verse",
					vocalist: "JPEGMAFIA",
				},
			],
			lyricLines: [
				{
					...newLyricLine(),
					id: "line-1",
					sectionId: "sec-1",
					words: [{ ...newLyricWord(), word: "Chorus" }],
				},
				{
					...newLyricLine(),
					id: "line-2",
					sectionId: "sec-2",
					words: [{ ...newLyricWord(), word: "Verse" }],
				},
			],
		};

		const result = applyAutoDuetBySinger(lyrics);
		expect(result).toMatchObject({
			singersCount: 2,
			singerMap: { Raveena: "v1", JPEGMAFIA: "v2" },
		});
		expect(lyrics.lyricLines[0].agent).toBe("v1");
		expect(lyrics.lyricLines[0].isDuet).toBe(false); // Raveena (first person in Raveena & JPEGMAFIA)
		expect(lyrics.lyricLines[1].agent).toBe("v2");
		expect(lyrics.lyricLines[1].isDuet).toBe(true); // JPEGMAFIA (guest/secondary)
	});

	it("supports 3 or more singers mapping to v1, v2, v3... up to v1000", () => {
		const lyrics: TTMLLyric = {
			metadata: [],
			sections: [
				{
					id: "sec-1",
					label: "[Verse 1: Singer One]",
					category: "verse",
					vocalist: "Singer One",
				},
				{
					id: "sec-2",
					label: "[Verse 2: Singer Two]",
					category: "verse",
					vocalist: "Singer Two",
				},
				{
					id: "sec-3",
					label: "[Verse 3: Singer Three]",
					category: "verse",
					vocalist: "Singer Three",
				},
				{
					id: "sec-4",
					label: "[Outro: Singer Four]",
					category: "outro",
					vocalist: "Singer Four",
				},
			],
			lyricLines: [
				{
					...newLyricLine(),
					id: "line-1",
					sectionId: "sec-1",
					words: [{ ...newLyricWord(), word: "One" }],
				},
				{
					...newLyricLine(),
					id: "line-2",
					sectionId: "sec-2",
					words: [{ ...newLyricWord(), word: "Two" }],
				},
				{
					...newLyricLine(),
					id: "line-3",
					sectionId: "sec-3",
					words: [{ ...newLyricWord(), word: "Three" }],
				},
				{
					...newLyricLine(),
					id: "line-4",
					sectionId: "sec-4",
					words: [{ ...newLyricWord(), word: "Four" }],
				},
			],
		};

		const result = applyAutoDuetBySinger(lyrics);
		expect(result).toMatchObject({
			singersCount: 4,
			singerMap: {
				"Singer One": "v1",
				"Singer Two": "v2",
				"Singer Three": "v3",
				"Singer Four": "v4",
			},
		});

		expect(lyrics.lyricLines[0].agent).toBe("v1");
		expect(lyrics.lyricLines[0].isDuet).toBe(false);

		expect(lyrics.lyricLines[1].agent).toBe("v2");
		expect(lyrics.lyricLines[1].isDuet).toBe(true);

		expect(lyrics.lyricLines[2].agent).toBe("v3");
		expect(lyrics.lyricLines[2].isDuet).toBe(true);

		expect(lyrics.lyricLines[3].agent).toBe("v4");
		expect(lyrics.lyricLines[3].isDuet).toBe(true);
	});
});

describe("Section boundaries and line insertion continuity", () => {
	function computeBounds(lines: LyricLine[], lineIndex: number) {
		const cur = lines[lineIndex];
		if (!cur || !cur.sectionId) return { isStart: false, isEnd: false };
		const prev = lineIndex > 0 ? lines[lineIndex - 1] : undefined;
		const next =
			lineIndex < lines.length - 1 ? lines[lineIndex + 1] : undefined;
		const isStart = lineIndex === 0 || prev?.sectionId !== cur.sectionId;
		const isEnd =
			lineIndex === lines.length - 1 || next?.sectionId !== cur.sectionId;
		return { isStart, isEnd };
	}

	it("dynamically updates section start and end when a line is inserted into a section", () => {
		const line1 = { ...newLyricLine(), id: "l1", sectionId: "sec-verse" };
		const line2 = { ...newLyricLine(), id: "l2", sectionId: "sec-verse" };
		const lines = [line1, line2];

		// Before insertion: line 0 is start, line 1 is end
		expect(computeBounds(lines, 0)).toEqual({ isStart: true, isEnd: false });
		expect(computeBounds(lines, 1)).toEqual({ isStart: false, isEnd: true });

		// Insert a line between line 0 and line 1 inheriting sectionId
		const newLine = {
			...newLyricLine(),
			id: "l-new",
			sectionId: line1.sectionId,
			geniusHeader: line1.geniusHeader,
		};
		lines.splice(1, 0, newLine);

		// Now: 3 lines in section
		// Line 0: start, not end
		expect(computeBounds(lines, 0)).toEqual({ isStart: true, isEnd: false });
		// Line 1 (new line): not start, not end (connected seamlessly in middle)
		expect(computeBounds(lines, 1)).toEqual({ isStart: false, isEnd: false });
		// Line 2 (was line 1): not start, is end
		expect(computeBounds(lines, 2)).toEqual({ isStart: false, isEnd: true });
	});

	it("dynamically connects when appending a new line to the end of a section", () => {
		const line1 = { ...newLyricLine(), id: "l1", sectionId: "sec-verse" };
		const line2 = { ...newLyricLine(), id: "l2", sectionId: "sec-verse" };
		const nextSectionLine = {
			...newLyricLine(),
			id: "l3",
			sectionId: "sec-chorus",
		};
		const lines = [line1, line2, nextSectionLine];

		// Line 1 was the end of sec-verse
		expect(computeBounds(lines, 1)).toEqual({ isStart: false, isEnd: true });

		// Insert a new line after line 1 inheriting sec-verse
		const newLine = {
			...newLyricLine(),
			id: "l-new",
			sectionId: line2.sectionId,
			geniusHeader: line2.geniusHeader,
		};
		lines.splice(2, 0, newLine);

		// Line 1 is NO LONGER the end of sec-verse
		expect(computeBounds(lines, 1)).toEqual({ isStart: false, isEnd: false });
		// The new line is now the end of sec-verse
		expect(computeBounds(lines, 2)).toEqual({ isStart: false, isEnd: true });
		// Next section is unaffected
		expect(computeBounds(lines, 3)).toEqual({ isStart: true, isEnd: true });
	});
});

describe("formatVoiceLabel and singer name formatting", () => {
	it("formats voice channels without redundantly repeating voice IDs", () => {
		expect(formatVoiceLabel("v1")).toBe("v1 (Primary)");
		expect(formatVoiceLabel("v1", "v1")).toBe("v1 (Primary)");
		expect(formatVoiceLabel("v2")).toBe("v2 (Duet)");
		expect(formatVoiceLabel("v2", "v2")).toBe("v2 (Duet)");
		expect(formatVoiceLabel("v3")).toBe("v3");
		expect(formatVoiceLabel("v3", "v3")).toBe("v3");
		expect(formatVoiceLabel("v4", "v4")).toBe("v4");
	});

	it("appends human singer names cleanly", () => {
		expect(formatVoiceLabel("v1", "Alice")).toBe("v1 (Primary) - Alice");
		expect(formatVoiceLabel("v2", "Bob")).toBe("v2 (Duet) - Bob");
		expect(formatVoiceLabel("v3", "Charlie")).toBe("v3 - Charlie");
	});

	it("does not treat agent voice channel ID as a singer name in getLineSinger", () => {
		const lineWithVoiceAgent = { ...newLyricLine(), agent: "v3" };
		expect(getLineSinger(lineWithVoiceAgent, new Map())).toBeUndefined();

		const lineWithHumanAgent = { ...newLyricLine(), agent: "Alice" };
		expect(getLineSinger(lineWithHumanAgent, new Map())).toBe("Alice");
	});
});

describe("Genius lyrics import auto-duet workflow", () => {
	it("correctly assigns auto-duet singers when lyrics have Genius headers", () => {
		const draft: TTMLLyric = {
			metadata: [],
			sections: [],
			lyricLines: [
				{
					...newLyricLine(),
					id: "line-1",
					geniusHeader: "[Verse 1: Drake]",
					words: [{ ...newLyricWord(), word: "Starting off" }],
				},
				{
					...newLyricLine(),
					id: "line-2",
					geniusHeader: "[Verse 1: Drake]",
					words: [{ ...newLyricWord(), word: "still Drake" }],
				},
				{
					...newLyricLine(),
					id: "line-3",
					geniusHeader: "[Chorus: Rihanna]",
					words: [{ ...newLyricWord(), word: "Shining bright" }],
				},
				{
					...newLyricLine(),
					id: "line-4",
					geniusHeader: "[Outro: Drake & Rihanna]",
					words: [{ ...newLyricWord(), word: "Ending" }],
				},
			],
		};

		// 1. Process sections as done during import
		applyReviewedSections(draft, []);

		// Verify sections were created with vocalists
		expect(draft.sections?.length).toBeGreaterThanOrEqual(2);

		// 2. Apply auto-duet by singer
		const result = applyAutoDuetBySinger(draft);

		expect(result).toMatchObject({
			singersCount: 2,
			singerMap: { Drake: "v1", Rihanna: "v2" },
		});

		// Drake is primary (v1, isDuet = false)
		expect(draft.lyricLines[0].agent).toBe("v1");
		expect(draft.lyricLines[0].isDuet).toBe(false);
		expect(draft.lyricLines[1].agent).toBe("v1");
		expect(draft.lyricLines[1].isDuet).toBe(false);

		// Rihanna is duet (v2, isDuet = true)
		expect(draft.lyricLines[2].agent).toBe("v2");
		expect(draft.lyricLines[2].isDuet).toBe(true);

		// "Drake & Rihanna" resolves first singer Drake -> v1
		expect(draft.lyricLines[3].agent).toBe("v1");
		expect(draft.lyricLines[3].isDuet).toBe(false);
	});

	it("gracefully reports not_enough_singers when Genius headers have single singer", () => {
		const draft: TTMLLyric = {
			metadata: [],
			sections: [],
			lyricLines: [
				{
					...newLyricLine(),
					id: "line-1",
					geniusHeader: "[Verse 1: Drake]",
					words: [{ ...newLyricWord(), word: "Solo song" }],
				},
				{
					...newLyricLine(),
					id: "line-2",
					geniusHeader: "[Chorus: Drake]",
					words: [{ ...newLyricWord(), word: "Just Drake" }],
				},
			],
		};

		applyReviewedSections(draft, []);
		const result = applyAutoDuetBySinger(draft);

		expect(result).toEqual({ error: "not_enough_singers" });
		expect(draft.lyricLines[0].agent).toBeUndefined();
		expect(draft.lyricLines[0].isDuet).toBe(false);
	});
});
