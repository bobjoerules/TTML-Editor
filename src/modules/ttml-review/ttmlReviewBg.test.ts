import { describe, expect, it } from "vitest";
import { buildSpicyLines } from "$/components/SpicyLyrics/model";
import type { LyricLine, TTMLLyric } from "$/types/ttml";
import type { ReviewLine, ReviewWord } from "./types";
import { getWordsText } from "./utils/exportMarkdown";

describe("Review Mode Background Vocals & Preview Mapping", () => {
	it("properly detects and maps isBG from parsed TTML lyric lines to ReviewLine", () => {
		const rawLyricLines: LyricLine[] = [
			{
				id: "line-main",
				startTime: 1000,
				endTime: 4000,
				isBG: false,
				isDuet: false,
				agent: "v1",
				ignoreSync: false,
				translatedLyric: "",
				romanLyric: "Main vocal roman",
				words: [
					{
						id: "w-0-0",
						word: "Main",
						startTime: 1000,
						endTime: 2000,
						romanWord: "Main",
						obscene: false,
					},
					{
						id: "w-0-1",
						word: " vocal",
						startTime: 2000,
						endTime: 4000,
						romanWord: " vocal",
						obscene: false,
					},
				],
			},
			{
				id: "line-bg",
				startTime: 2000,
				endTime: 4000,
				isBG: true,
				isDuet: false,
				agent: "v1",
				ignoreSync: false,
				translatedLyric: "",
				romanLyric: "Background roman",
				words: [
					{
						id: "w-1-0",
						word: "Background",
						startTime: 2000,
						endTime: 3000,
						romanWord: "Background",
						obscene: false,
					},
					{
						id: "w-1-1",
						word: " harmony",
						startTime: 3000,
						endTime: 4000,
						romanWord: " harmony",
						obscene: false,
					},
				],
			},
		];

		// Simulate loadLinesFromSource
		const reviewLines: ReviewLine[] = rawLyricLines.map((line, idx) => {
			const words: ReviewWord[] = (line.words || []).map(
				(w: any, wIdx: number) => ({
					id: w.id || `w-${idx}-${wIdx}`,
					word: w.word || "",
					startTime: w.startTime || 0,
					endTime: w.endTime || 0,
					romanWord: w.romanWord || "",
				}),
			);
			const text = getWordsText(words);
			const isBg = !!(line.isBg ?? line.isBG);
			const voice = line.voice || line.agent;
			const roman = line.roman || line.romanLyric || "";
			return {
				id: line.id || `l-${idx}`,
				lineNumber: idx + 1,
				startTime: line.startTime || (words[0]?.startTime ?? 0),
				endTime: line.endTime || (words[words.length - 1]?.endTime ?? 0),
				isBg,
				isBG: isBg,
				isDuet: !!line.isDuet,
				voice,
				agent: voice,
				isLineSynced: !!line.isLineSynced,
				words,
				text,
				roman,
				romanLyric: roman,
			};
		});

		expect(reviewLines[0].isBg).toBe(false);
		expect(reviewLines[0].isBG).toBe(false);
		expect(reviewLines[1].isBg).toBe(true);
		expect(reviewLines[1].isBG).toBe(true);

		// Map to activePreviewLyrics
		const activePreviewLyrics: TTMLLyric = {
			lyricLines: reviewLines.map((l, idx) => ({
				id: l.id || `line-${idx}`,
				startTime: l.startTime,
				endTime: l.endTime,
				isDuet: !!l.isDuet,
				isBG: !!(l.isBg ?? l.isBG),
				agent: l.voice || l.agent,
				ignoreSync: false,
				isLineSynced: l.isLineSynced,
				words: (l.words || []).map((w, wIdx) => ({
					id: w.id || `w-${idx}-${wIdx}`,
					word: w.word,
					startTime: w.startTime,
					endTime: w.endTime,
					romanWord: w.romanWord || "",
					obscene: false,
				})),
				romanLyric: l.roman || l.romanLyric || "",
				translatedLyric: "",
			})),
			metadata: [],
			marks: [],
			sections: [],
		};

		expect(activePreviewLyrics.lyricLines[0].isBG).toBe(false);
		expect(activePreviewLyrics.lyricLines[1].isBG).toBe(true);

		// Ensure SpicyLyrics buildSpicyLines renders the background vocal as isBackground: true
		const spicyLines = buildSpicyLines(activePreviewLyrics.lyricLines);
		const bgSpicyLine = spicyLines.find((l) => l.id === "line-bg");
		const mainSpicyLine = spicyLines.find((l) => l.id === "line-main");

		expect(mainSpicyLine?.isBackground).toBe(false);
		expect(bgSpicyLine?.isBackground).toBe(true);
		expect(bgSpicyLine?.words.every((w) => w.isBackground)).toBe(true);
	});
});
