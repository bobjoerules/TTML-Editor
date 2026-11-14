import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { lyricLinesAtom } from "$/states/main";

export interface SyncProgressResult {
	timedLines: number;
	totalLines: number;
	linePercent: number;
	timedWords: number;
	totalWords: number;
	wordPercent: number;
	percent: number;
	hasLyrics: boolean;
}

export function useSyncProgress(): SyncProgressResult {
	const lyricLines = useAtomValue(lyricLinesAtom).lyricLines;

	return useMemo(() => {
		const primaryLines = lyricLines.filter((l) => !l.isBG);
		const totalLines = primaryLines.length;

		const timedLines = primaryLines.filter((line) => {
			const hasLineTime = line.startTime > 0 || line.endTime > 0;
			const hasWordTime = Boolean(
				line.words && line.words.some((w) => w.startTime > 0 || w.endTime > 0),
			);
			return hasLineTime || hasWordTime;
		}).length;

		const linePercent =
			totalLines > 0 ? Math.round((timedLines / totalLines) * 100) : 0;

		const meaningfulWords = lyricLines.flatMap((l) =>
			(l.words || []).filter((w) =>
				Boolean(w.word && w.word.trim().length > 0),
			),
		);
		const totalWords = meaningfulWords.length;
		const timedWords = meaningfulWords.filter(
			(w) => w.startTime > 0 || w.endTime > 0,
		).length;
		const wordPercent =
			totalWords > 0 ? Math.round((timedWords / totalWords) * 100) : 0;
		const percent = totalWords > 0 ? wordPercent : linePercent;

		return {
			timedLines,
			totalLines,
			linePercent,
			timedWords,
			totalWords,
			wordPercent,
			percent,
			hasLyrics: totalLines > 0,
		};
	}, [lyricLines]);
}
