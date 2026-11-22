import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const CUSTOM_BAD_WORDS_STORAGE_KEY = "ttml_custom_bad_words";

/**
 * List of user-added custom bad words, persisted across app sessions.
 */
export const customBadWordsAtom = atomWithStorage<string[]>(
	CUSTOM_BAD_WORDS_STORAGE_KEY,
	[],
);

/**
 * Global open state for the Search Bad Words & Clean Version dialog.
 */
export const censorWordsDialogAtom = atom(false);
