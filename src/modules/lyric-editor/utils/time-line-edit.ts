import type { LyricWord } from "$/types/ttml";
import { isSpaceWord, isWordSynced } from "./normalize-line-time";

/**
 * Checks whether the visible, timed words still run in non-overlapping start
 * order. Unsynced words and spaces are ignored because they do not have a
 * meaningful position yet.
 */
export function hasOutOfOrderWordTimings(words: readonly LyricWord[]): boolean {
	let previousStart = Number.NEGATIVE_INFINITY;
	let previousEnd = Number.NEGATIVE_INFINITY;

	for (const word of words) {
		if (isSpaceWord(word) || !isWordSynced(word)) continue;

		// A word that starts before the previous word, or overlaps it, means the
		// visual order and the timing order disagree. Do not repair this here:
		// the user may intentionally be preparing for a later timing pass.
		if (word.startTime < previousStart || word.startTime < previousEnd) {
			return true;
		}

		previousStart = word.startTime;
		previousEnd = word.endTime;
	}

	return false;
}

/**
 * Applies a line-text draft to the current line words.
 *
 * Existing words are matched by ID, so their current timing (and other fields
 * such as ruby or romanization) always wins over the draft. That keeps a text
 * edit from overwriting a timing change that happened while the editor was
 * open. Words created by the draft are intentionally left unsynced.
 */
export function applyTimeLineDraft(
	currentWords: readonly LyricWord[],
	draftWords: readonly LyricWord[],
): LyricWord[] {
	const currentById = new Map(currentWords.map((word) => [word.id, word]));

	return draftWords.map((draftWord) => {
		const currentWord = currentById.get(draftWord.id);
		if (currentWord) {
			return { ...currentWord, word: draftWord.word };
		}

		return {
			...draftWord,
			startTime: 0,
			endTime: 0,
		};
	});
}
