import type { LyricLine, LyricWord } from "$/types/ttml";

export function getWordEndTime(word: LyricWord): number {
	let maxEnd = word.endTime || 0;
	if (word.ruby && word.ruby.length > 0) {
		for (const r of word.ruby) {
			if (r.endTime > maxEnd) maxEnd = r.endTime;
		}
	}
	return maxEnd;
}

export function getWordStartTime(word: LyricWord): number {
	let minStart = word.startTime || 0;
	if (word.ruby && word.ruby.length > 0) {
		for (const r of word.ruby) {
			if (r.startTime > 0 && (minStart === 0 || r.startTime < minStart)) {
				minStart = r.startTime;
			}
		}
	}
	return minStart;
}

export function isWordSynced(word: LyricWord): boolean {
	const end = getWordEndTime(word);
	const start = getWordStartTime(word);
	return end > 0 && (start === 0 || end >= start);
}

/**
 * Normalizes line start and end times based on its child words:
 * - Line start time matches the first word with a valid start time (> 0).
 * - Line end time always matches the last synced word (word with valid end time >= start time).
 */
export function normalizeLineTime(line: LyricLine) {
	if (!line.words || line.words.length === 0) return;

	// Find the last synced word
	let lastSyncedEnd = 0;
	for (let i = line.words.length - 1; i >= 0; i--) {
		if (isWordSynced(line.words[i])) {
			lastSyncedEnd = getWordEndTime(line.words[i]);
			break;
		}
	}

	// Find the first word with a valid start time
	let firstSyncedStart = 0;
	for (let i = 0; i < line.words.length; i++) {
		const start = getWordStartTime(line.words[i]);
		if (start > 0) {
			firstSyncedStart = start;
			break;
		}
	}

	if (firstSyncedStart > 0) {
		line.startTime = firstSyncedStart;
	}
	if (lastSyncedEnd > 0) {
		line.endTime = lastSyncedEnd;
	}
}

export function isSpaceWord(word: LyricWord): boolean {
	return (
		(!word.word || word.word.trim().length === 0) &&
		(!word.ruby || word.ruby.length === 0)
	);
}

/**
 * Cleans up spaces in a word list:
 * - Collapses consecutive space words into a single space word.
 * - Removes leading and trailing space words.
 * - Drops redundant space words adjacent to words with leading/trailing whitespace.
 * - Returns an empty array if only space words remain.
 */
export function cleanupLineSpaces(words: LyricWord[]): LyricWord[] {
	if (!words || words.length === 0) return [];

	const hasNonSpace = words.some((w) => !isSpaceWord(w));
	if (!hasNonSpace) return [];

	const result: LyricWord[] = [];
	for (let i = 0; i < words.length; i++) {
		const current = words[i];
		if (isSpaceWord(current)) {
			// Skip if previous item in result is already a space word
			if (result.length > 0 && isSpaceWord(result[result.length - 1])) {
				continue;
			}
			// Skip if previous item in result already ends with whitespace
			if (
				result.length > 0 &&
				result[result.length - 1].word &&
				/\s$/.test(result[result.length - 1].word)
			) {
				continue;
			}
		} else {
			// If current is a non-space word that starts with whitespace and previous was a space word,
			// remove the redundant preceding space word
			if (
				current.word &&
				/^\s/.test(current.word) &&
				result.length > 0 &&
				isSpaceWord(result[result.length - 1])
			) {
				result.pop();
			}
		}
		result.push(current);
	}

	// Remove leading space words
	while (result.length > 0 && isSpaceWord(result[0])) {
		result.shift();
	}

	// Remove trailing space words
	while (result.length > 0 && isSpaceWord(result[result.length - 1])) {
		result.pop();
	}

	return result;
}

/**
 * Removes words matching the specified set of IDs from the line,
 * cleans up any orphaned or adjacent space capsules,
 * and updates line timestamps.
 * Returns true if any words were removed.
 */
export function removeWordsFromLine(
	line: LyricLine,
	selectedWordIds: ReadonlySet<string>,
): boolean {
	if (!line.words || line.words.length === 0) return false;
	const initialLength = line.words.length;
	const filtered = line.words.filter((w) => !selectedWordIds.has(w.id));
	if (filtered.length === initialLength) return false;

	line.words = cleanupLineSpaces(filtered);
	normalizeLineTime(line);
	return true;
}

