import { ToolMode } from "$/states/main.ts";
import type { LyricLine } from "$/types/ttml.ts";

export const shouldAutoCenterSelection = (toolMode: ToolMode) =>
	toolMode === ToolMode.Sync;

export const findCurrentLineIndex = (
	lines: LyricLine[],
	currentTime: number,
): number => {
	const scan = (predicate?: (line: LyricLine) => boolean) => {
		let previousIndex = -1;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (predicate && !predicate(line)) continue;
			if (line.endTime <= line.startTime) continue;
			if (currentTime < line.startTime) {
				return previousIndex !== -1 ? previousIndex : i;
			}
			if (currentTime >= line.startTime && currentTime <= line.endTime) {
				return i;
			}
			previousIndex = i;
		}
		return previousIndex;
	};

	const mainIndex = scan((line) => !line.isBG);
	if (mainIndex !== -1) return mainIndex;
	return scan();
};

export const getActiveLineIndex = ({
	lyricLines,
	selectedLines,
	selectedWords,
	currentTime,
	fallbackIndex,
}: {
	lyricLines: LyricLine[];
	selectedLines?: Set<string>;
	selectedWords?: Set<string>;
	currentTime?: number;
	fallbackIndex?: number;
}): number => {
	if (!lyricLines || lyricLines.length === 0) return -1;

	// 1. Check explicitly selected lines
	if (selectedLines && selectedLines.size > 0) {
		const index = lyricLines.findIndex((l) => selectedLines.has(l.id));
		if (index !== -1) return index;
	}

	// 2. Check selected words (find containing line)
	if (selectedWords && selectedWords.size > 0) {
		const index = lyricLines.findIndex((l) =>
			l.words?.some((w) => selectedWords.has(w.id)),
		);
		if (index !== -1) return index;
	}

	// 3. Check current audio playback line
	if (currentTime !== undefined && currentTime > 0) {
		const index = findCurrentLineIndex(lyricLines, currentTime);
		if (index !== -1) return index;
	}

	// 4. Fallback index (e.g. last visible viewport line)
	if (
		fallbackIndex !== undefined &&
		fallbackIndex >= 0 &&
		fallbackIndex < lyricLines.length
	) {
		return fallbackIndex;
	}

	return -1;
};

export const isLineVisibleInViewport = (
	lineIndex: number,
	viewportRange: [number, number],
): boolean => {
	const [start, end] = viewportRange;
	if (start < 0 || end < 0) return false;
	return lineIndex >= start && lineIndex <= end;
};
