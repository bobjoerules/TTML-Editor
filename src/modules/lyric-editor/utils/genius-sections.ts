import type { LyricLine, LyricSection } from "$/types/ttml.ts";
import { getSectionHeader } from "./section-system.ts";

/** Returns a normalized, display-ready Genius section label, if this is one. */
export function getGeniusHeader(value: string): string | undefined {
	return getSectionHeader(value);
}

export function getSectionBounds(lines: LyricLine[], lineIndex: number) {
	const target = lines[lineIndex];
	const key = target?.sectionId ?? target?.geniusHeader;
	if (!key) return undefined;

	let start = lineIndex;
	while (
		start > 0 &&
		(lines[start - 1].sectionId ?? lines[start - 1].geniusHeader) === key
	)
		start--;

	let end = lineIndex + 1;
	while (
		end < lines.length &&
		(lines[end].sectionId ?? lines[end].geniusHeader) === key
	)
		end++;

	return {
		header: target.geniusHeader,
		sectionId: target.sectionId,
		start,
		end,
	};
}

export function findPreviousMatchingSection(
	lines: LyricLine[],
	lineIndex: number,
	sections: LyricSection[] = [],
) {
	const current = getSectionBounds(lines, lineIndex);
	if (!current) return undefined;
	const sectionMap = new Map(sections.map((section) => [section.id, section]));
	const currentSection = current.sectionId
		? sectionMap.get(current.sectionId)
		: undefined;

	for (let index = current.start - 1; index >= 0; ) {
		const candidate = getSectionBounds(lines, index);
		if (!candidate) {
			index--;
			continue;
		}
		if (
			((currentSection &&
				candidate.sectionId &&
				((!!currentSection.repeatGroupId &&
					sectionMap.get(candidate.sectionId)?.repeatGroupId ===
						currentSection.repeatGroupId) ||
					sectionMap.get(candidate.sectionId)?.label ===
						currentSection.label)) ||
				(!currentSection && candidate.header === current.header)) &&
			lines[candidate.start].endTime > lines[candidate.start].startTime
		) {
			return candidate;
		}
		index = candidate.start - 1;
	}
}

export function shiftSectionToTime(
	lines: LyricLine[],
	lineIndex: number,
	targetStartTime: number,
) {
	const section = getSectionBounds(lines, lineIndex);
	if (!section) return false;
	const firstTimedLine = lines
		.slice(section.start, section.end)
		.find((l) => l.startTime > 0 || l.endTime > 0);
	if (!firstTimedLine) return false;
	const offset = targetStartTime - firstTimedLine.startTime;

	for (let index = section.start; index < section.end; index++) {
		const line = lines[index];
		// Skip untimed lines: do NOT assign timestamps to lines that are untimed
		if (line.startTime === 0 && line.endTime === 0) {
			continue;
		}
		line.startTime = Math.max(0, line.startTime + offset);
		line.endTime = Math.max(0, line.endTime + offset);
		for (const word of line.words) {
			if (word.startTime > 0 || word.endTime > 0) {
				word.startTime = Math.max(0, word.startTime + offset);
				word.endTime = Math.max(0, word.endTime + offset);
			}
			if (word.ruby) {
				for (const r of word.ruby) {
					if (r.startTime > 0 || r.endTime > 0) {
						r.startTime = Math.max(0, r.startTime + offset);
						r.endTime = Math.max(0, r.endTime + offset);
					}
				}
			}
		}
	}
	return true;
}

export function copySectionTimings(
	lines: LyricLine[],
	targetLineIndex: number,
	source: { start: number; end: number },
) {
	const target = getSectionBounds(lines, targetLineIndex);
	if (!target) return undefined;
	const normalizeLine = (line: LyricLine) =>
		line.words
			.map((word) => word.word)
			.join(" ")
			.normalize("NFKC")
			.toLocaleLowerCase()
			.replace(/[^\p{L}\p{N}]+/gu, " ")
			.trim();
	const sourceByText = new Map<string, LyricLine[]>();
	for (let index = source.start; index < source.end; index++) {
		const sourceLine = lines[index];
		const text = normalizeLine(sourceLine);
		if (!text) continue;
		const matches = sourceByText.get(text) ?? [];
		matches.push(sourceLine);
		sourceByText.set(text, matches);
	}
	let copiedLineCount = 0;
	for (let index = target.start; index < target.end; index++) {
		const targetLine = lines[index];
		const matches = sourceByText.get(normalizeLine(targetLine));
		const sourceLine = matches?.shift();
		if (!sourceLine || (sourceLine.startTime === 0 && sourceLine.endTime === 0)) {
			targetLine.startTime = 0;
			targetLine.endTime = 0;
			targetLine.isLineSynced = false;
			if (targetLine.endTimeLink) delete targetLine.endTimeLink;
			for (const word of targetLine.words) {
				word.startTime = 0;
				word.endTime = 0;
				if (word.ruby) {
					for (const r of word.ruby) {
						r.startTime = 0;
						r.endTime = 0;
					}
				}
			}
			continue;
		}
		targetLine.startTime = sourceLine.startTime;
		targetLine.endTime = sourceLine.endTime;
		targetLine.isLineSynced = sourceLine.isLineSynced ?? false;
		if (targetLine.endTimeLink) delete targetLine.endTimeLink;
		for (
			let wordIndex = 0;
			wordIndex < Math.min(targetLine.words.length, sourceLine.words.length);
			wordIndex++
		) {
			targetLine.words[wordIndex].startTime =
				sourceLine.words[wordIndex].startTime;
			targetLine.words[wordIndex].endTime = sourceLine.words[wordIndex].endTime;
			if (targetLine.words[wordIndex].ruby && sourceLine.words[wordIndex].ruby) {
				for (
					let ri = 0;
					ri <
					Math.min(
						targetLine.words[wordIndex].ruby!.length,
						sourceLine.words[wordIndex].ruby!.length,
					);
					ri++
				) {
					targetLine.words[wordIndex].ruby![ri].startTime =
						sourceLine.words[wordIndex].ruby![ri].startTime;
					targetLine.words[wordIndex].ruby![ri].endTime =
						sourceLine.words[wordIndex].ruby![ri].endTime;
				}
			}
		}
		for (
			let wordIndex = sourceLine.words.length;
			wordIndex < targetLine.words.length;
			wordIndex++
		) {
			targetLine.words[wordIndex].startTime = 0;
			targetLine.words[wordIndex].endTime = 0;
			if (targetLine.words[wordIndex].ruby) {
				for (const r of targetLine.words[wordIndex].ruby!) {
					r.startTime = 0;
					r.endTime = 0;
				}
			}
		}
		copiedLineCount++;
	}

	return {
		copiedLineCount,
		lengthsMatch: target.end - target.start === source.end - source.start,
	};
}
