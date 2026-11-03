import { describe, expect, it } from "vitest";
import { newLyricLine, newLyricWord, type TTMLLyric } from "$/types/ttml";
import {
	applyReviewedSections,
	assignHighConfidenceRepeatGroups,
	copyAndReplaceSection,
	createSectionsFromSelectedLines,
	duplicateLinesWithSections,
	getOrderedSections,
	mergeSectionWithAdjacent,
	mergeUnassignedBlock,
	migrateLegacySections,
	moveSection,
	normalizeSectionHeader,
	removeSectionMetadata,
	repairSectionIntegrity,
	splitSection,
	validateSections,
} from "./section-system";

const line = (text: string, header?: string) => ({
	...newLyricLine(),
	geniusHeader: header,
	words: [{ ...newLyricWord(), word: text }],
});

describe("section header normalization", () => {
	it("preserves labels while extracting aliases, ordinals, and vocalists", () => {
		expect(normalizeSectionHeader("[VERSE II: Guest Artist]")).toMatchObject({
			label: "[VERSE II: Guest Artist]",
			category: "verse",
			ordinal: 2,
			vocalist: "Guest Artist",
			confidence: 1,
		});
		expect(normalizeSectionHeader("[Strofa 3]")).toMatchObject({
			category: "verse",
			ordinal: 3,
		});
	});

	it("preserves unknown labels as other", () => {
		expect(normalizeSectionHeader("[Massive Drop]")).toMatchObject({
			category: "other",
			confidence: 0.35,
		});
	});
});

describe("first-class sections", () => {
	it("migrates contiguous legacy headers and applies reviewed metadata", () => {
		const lyrics = {
			metadata: [],
			lyricLines: [
				line("a", "[Verse 1]"),
				line("b", "[Verse 1]"),
				line("c", "[Chorus]"),
			],
		} as TTMLLyric;

		applyReviewedSections(lyrics, [
			{ occurrence: 0, notes: "quiet", vocalist: "Lead" },
		]);

		expect(lyrics.sections).toHaveLength(2);
		expect(lyrics.lyricLines[0].sectionId).toBe(lyrics.lyricLines[1].sectionId);
		expect(lyrics.lyricLines[2].sectionId).not.toBe(
			lyrics.lyricLines[0].sectionId,
		);
		expect(lyrics.sections?.[0]).toMatchObject({
			category: "verse",
			notes: "quiet",
			vocalist: "Lead",
		});
	});

	it("automatically links only high-confidence repeats", () => {
		const lyrics = {
			metadata: [],
			lyricLines: [
				line("same chorus", "[Chorus]"),
				line("verse", "[Verse]"),
				line("same chorus", "[Chorus]"),
			],
		} as TTMLLyric;
		migrateLegacySections(lyrics);
		assignHighConfidenceRepeatGroups(lyrics);
		expect(lyrics.sections?.[0].repeatGroupId).toBeTruthy();
		expect(lyrics.sections?.[2].repeatGroupId).toBe(
			lyrics.sections?.[0].repeatGroupId,
		);
		expect(lyrics.sections?.[1].repeatGroupId).toBeUndefined();
	});

	it("supports split, merge, move, and metadata removal", () => {
		const lyrics = {
			metadata: [],
			lyricLines: [
				line("a", "[Verse]"),
				line("b", "[Verse]"),
				line("c", "[Chorus]"),
			],
		} as TTMLLyric;
		migrateLegacySections(lyrics);
		const verseId = lyrics.sections?.[0].id ?? "";
		const chorusId = lyrics.sections?.[1].id ?? "";

		const split = splitSection(lyrics, verseId, 1);
		expect(split).toBeTruthy();
		expect(moveSection(lyrics, chorusId, "up")).toBe(true);
		expect(mergeSectionWithAdjacent(lyrics, chorusId, "next")).toBe(true);
		removeSectionMetadata(lyrics, chorusId);
		expect(lyrics.lyricLines.some((item) => item.sectionId === chorusId)).toBe(
			false,
		);
	});

	it("uses lyric order for navigation and safely rejects missing neighbors", () => {
		const lyrics = {
			metadata: [],
			lyricLines: [line("verse", "[Verse]"), line("chorus", "[Chorus]")],
		} as TTMLLyric;
		migrateLegacySections(lyrics);
		const verseId = lyrics.lyricLines[0].sectionId ?? "";
		const chorusId = lyrics.lyricLines[1].sectionId ?? "";

		expect(moveSection(lyrics, verseId, "up")).toBe(false);
		expect(moveSection(lyrics, chorusId, "down")).toBe(false);
		expect(mergeSectionWithAdjacent(lyrics, verseId, "previous")).toBe(false);
		expect(mergeSectionWithAdjacent(lyrics, chorusId, "next")).toBe(false);

		expect(moveSection(lyrics, chorusId, "up")).toBe(true);
		expect(getOrderedSections(lyrics).map((section) => section.id)).toEqual([
			chorusId,
			verseId,
		]);
	});

	it("reports broken references and low-confidence categories without throwing", () => {
		const lyrics = {
			metadata: [],
			sections: [
				{
					id: "unknown",
					label: "[Drop]",
					category: "other",
					confidence: 0.35,
				},
			],
			lyricLines: [
				{ ...line("a"), sectionId: "missing" },
				{ ...line("b"), sectionId: "unknown" },
			],
		} as TTMLLyric;

		expect(validateSections(lyrics).map((issue) => issue.code)).toEqual(
			expect.arrayContaining(["broken-reference", "low-confidence-category"]),
		);
	});

	it("creates separately numbered sections for non-contiguous selected lines", () => {
		const lyrics = {
			metadata: [],
			lyricLines: [line("a"), line("b"), line("c"), line("d")],
		} as TTMLLyric;
		const selected = new Set([
			lyrics.lyricLines[0].id,
			lyrics.lyricLines[2].id,
			lyrics.lyricLines[3].id,
		]);

		const sections = createSectionsFromSelectedLines(lyrics, selected, "verse");

		expect(sections.map((section) => section.label)).toEqual([
			"Verse 1",
			"Verse 2",
		]);
		expect(lyrics.lyricLines.map((item) => item.sectionId)).toEqual([
			sections[0].id,
			undefined,
			sections[1].id,
			sections[1].id,
		]);
	});

	it("does not overwrite selected lines that already belong to a section", () => {
		const lyrics = {
			metadata: [],
			lyricLines: [line("a", "[Verse 1]"), line("b")],
		} as TTMLLyric;
		migrateLegacySections(lyrics);

		expect(
			createSectionsFromSelectedLines(
				lyrics,
				new Set(lyrics.lyricLines.map((item) => item.id)),
				"chorus",
			),
		).toEqual([]);
		expect(lyrics.sections).toHaveLength(1);
	});

	it("duplicates categorized lines into a new repeat-linked section", () => {
		const lyrics = {
			metadata: [],
			lyricLines: [line("a", "[Verse]"), line("b", "[Verse]")],
		} as TTMLLyric;
		migrateLegacySections(lyrics);
		const sourceId = lyrics.lyricLines[0].sectionId ?? "";
		const copies = duplicateLinesWithSections(
			lyrics,
			new Set(lyrics.lyricLines.map((item) => item.id)),
		);
		lyrics.lyricLines.push(...copies);
		repairSectionIntegrity(lyrics);
		expect(lyrics.sections).toHaveLength(2);
		expect(copies[0].sectionId).not.toBe(sourceId);
		expect(lyrics.sections?.[0].repeatGroupId).toBeTruthy();
		expect(lyrics.sections?.[1].repeatGroupId).toBe(
			lyrics.sections?.[0].repeatGroupId,
		);
		expect(validateSections(lyrics).map((issue) => issue.code)).not.toContain(
			"noncontiguous-section",
		);
	});

	it("applies the section before the insertion point when duplicating to a location", () => {
		const lyrics = {
			metadata: [],
			sections: [
				{ id: "verse", label: "[Verse]", category: "verse" },
				{ id: "chorus", label: "[Chorus]", category: "chorus" },
			],
			lyricLines: [
				{ ...line("v1"), sectionId: "verse", geniusHeader: "[Verse]" },
				{ ...line("v2"), sectionId: "verse", geniusHeader: "[Verse]" },
				{ ...line("c1"), sectionId: "chorus", geniusHeader: "[Chorus]" },
			],
		} as TTMLLyric;

		// Duplicating chorus line c1 into verse (targetIndex = 1, before v2, after v1)
		const copiesIntoVerse = duplicateLinesWithSections(
			lyrics,
			new Set([lyrics.lyricLines[2].id]),
			1,
		);
		expect(copiesIntoVerse[0].sectionId).toBe("verse");
		expect(copiesIntoVerse[0].geniusHeader).toBe("[Verse]");

		// Duplicating verse line v1 to top of lyrics (targetIndex = 0)
		const copiesAtStart = duplicateLinesWithSections(
			lyrics,
			new Set([lyrics.lyricLines[0].id]),
			0,
		);
		expect(copiesAtStart[0].sectionId).toBeUndefined();
		expect(copiesAtStart[0].geniusHeader).toBeUndefined();

		// Duplicating verse line v1 to end of lyrics (targetIndex = 3, after c1)
		const copiesAtEnd = duplicateLinesWithSections(
			lyrics,
			new Set([lyrics.lyricLines[0].id]),
			3,
		);
		expect(copiesAtEnd[0].sectionId).toBe("chorus");
		expect(copiesAtEnd[0].geniusHeader).toBe("[Chorus]");
	});

	it("repairs non-contiguous section ids and merges unassigned blocks", () => {
		const lyrics = {
			metadata: [],
			sections: [{ id: "verse", label: "[Verse]", category: "verse" }],
			lyricLines: [
				{ ...line("a"), sectionId: "verse" },
				line("gap"),
				{ ...line("b"), sectionId: "verse" },
			],
		} as TTMLLyric;
		repairSectionIntegrity(lyrics);
		expect(lyrics.lyricLines[2].sectionId).not.toBe("verse");
		expect(mergeUnassignedBlock(lyrics, 1, "previous")).toBe(true);
		expect(lyrics.lyricLines[1].sectionId).toBe("verse");
	});

	it("preserves category sectionId and geniusHeader when a line is split into two", () => {
		const lyrics = {
			metadata: [],
			sections: [{ id: "sec-chorus", label: "[Chorus 1]", category: "chorus" }],
			lyricLines: [
				{
					...line("First part"),
					sectionId: "sec-chorus",
					geniusHeader: "[Chorus 1]",
				},
			],
		} as TTMLLyric;

		const original = lyrics.lyricLines[0];
		const splitNewLine = {
			...newLyricLine(),
			sectionId: original.sectionId,
			geniusHeader: original.geniusHeader,
			words: [{ ...newLyricWord(), word: "Second part" }],
		};
		lyrics.lyricLines.splice(1, 0, splitNewLine);
		repairSectionIntegrity(lyrics);

		expect(lyrics.lyricLines).toHaveLength(2);
		expect(lyrics.lyricLines[0].sectionId).toBe("sec-chorus");
		expect(lyrics.lyricLines[1].sectionId).toBe("sec-chorus");
		expect(lyrics.lyricLines[1].geniusHeader).toBe("[Chorus 1]");
	});

	it("copies and replaces section lines with fresh IDs, target labels, and repeat group link", () => {
		const lyrics = {
			metadata: [],
			sections: [
				{ id: "chorus-1", label: "[Chorus 1]", category: "chorus" },
				{ id: "verse-1", label: "[Verse 1]", category: "verse" },
				{ id: "chorus-2", label: "[Chorus 2]", category: "chorus" },
			],
			lyricLines: [
				{
					...line("c1 line 1"),
					sectionId: "chorus-1",
					geniusHeader: "[Chorus 1]",
					startTime: 10000,
					endTime: 14000,
					words: [
						{ ...newLyricWord(), word: "c1", startTime: 10000, endTime: 12000 },
						{
							...newLyricWord(),
							word: "line 1",
							startTime: 12000,
							endTime: 14000,
						},
					],
				},
				{
					...line("c1 line 2"),
					sectionId: "chorus-1",
					geniusHeader: "[Chorus 1]",
					startTime: 14000,
					endTime: 18000,
					words: [
						{ ...newLyricWord(), word: "c1", startTime: 14000, endTime: 16000 },
						{
							...newLyricWord(),
							word: "line 2",
							startTime: 16000,
							endTime: 18000,
						},
					],
				},
				{
					...line("verse line"),
					sectionId: "verse-1",
					geniusHeader: "[Verse 1]",
					startTime: 20000,
					endTime: 30000,
					words: [
						{
							...newLyricWord(),
							word: "verse line",
							startTime: 20000,
							endTime: 30000,
						},
					],
				},
				{
					...line("old c2 line to be replaced"),
					sectionId: "chorus-2",
					geniusHeader: "[Chorus 2]",
					startTime: 40000,
					endTime: 45000,
					words: [
						{
							...newLyricWord(),
							word: "old",
							startTime: 40000,
							endTime: 45000,
						},
					],
				},
			],
		} as TTMLLyric;

		const originalC1Line1Id = lyrics.lyricLines[0].id;
		const originalC1Word1Id = lyrics.lyricLines[0].words[0].id;

		const result = copyAndReplaceSection(lyrics, "chorus-2", "chorus-1");
		expect(result).toEqual({ copiedLineCount: 2 });

		// Total lines should now be: 2 (chorus 1) + 1 (verse) + 2 (new chorus 2) = 5
		expect(lyrics.lyricLines).toHaveLength(5);

		// Chorus 2 lines
		const c2Lines = lyrics.lyricLines.filter((l) => l.sectionId === "chorus-2");
		expect(c2Lines).toHaveLength(2);

		// Verified labels and section IDs
		expect(c2Lines[0].geniusHeader).toBe("[Chorus 2]");
		expect(c2Lines[1].geniusHeader).toBe("[Chorus 2]");
		expect(c2Lines[0].words[0].word).toBe("c1");
		expect(c2Lines[1].words[1].word).toBe("line 2");

		// Fresh unique IDs generated
		expect(c2Lines[0].id).not.toBe(originalC1Line1Id);
		expect(c2Lines[0].words[0].id).not.toBe(originalC1Word1Id);

		// Timestamp offset: target first line was at 40000, source first line was at 10000 -> offset = +30000
		expect(c2Lines[0].startTime).toBe(40000);
		expect(c2Lines[0].endTime).toBe(44000);
		expect(c2Lines[0].words[0].startTime).toBe(40000);
		expect(c2Lines[0].words[0].endTime).toBe(42000);
		expect(c2Lines[1].startTime).toBe(44000);
		expect(c2Lines[1].endTime).toBe(48000);

		// Repeat groups linked
		const sChorus1 = lyrics.sections?.find((s) => s.id === "chorus-1");
		const sChorus2 = lyrics.sections?.find((s) => s.id === "chorus-2");
		expect(sChorus1?.repeatGroupId).toBeTruthy();
		expect(sChorus2?.repeatGroupId).toBe(sChorus1?.repeatGroupId);

		// Self-replace should return undefined
		expect(
			copyAndReplaceSection(lyrics, "chorus-1", "chorus-1"),
		).toBeUndefined();
	});
});
