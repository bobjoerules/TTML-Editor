import { describe, expect, it } from "vitest";
import { createStore } from "jotai";
import {
	lyricLinesAtom,
	selectedLinesAtom,
	selectedWordsAtom,
} from "$/states/main";
import {
	newLyricLine,
	newLyricWord,
	type LyricLine,
	type TTMLLyric,
} from "$/types/ttml";
import {
	cloneLyricLineWithNewIds,
	copiedLyricLinesAtom,
	copySelectedLines,
	isEditableTarget,
	pasteLinesBelowSelected,
} from "./line-clipboard";

describe("line-clipboard utilities", () => {
	it("cloneLyricLineWithNewIds generates fresh IDs while preserving attributes", () => {
		const originalWord = {
			...newLyricWord(),
			id: "word-1",
			word: "Hello",
			startTime: 1000,
			endTime: 1500,
			romanWord: "he-llo",
			obscene: true,
		};
		const originalLine: LyricLine = {
			...newLyricLine(),
			id: "line-1",
			words: [originalWord],
			startTime: 1000,
			endTime: 2000,
			isBG: true,
			isDuet: true,
			agent: "v2",
			translatedLyric: "Bonjour",
			romanLyric: "hello",
			sectionId: "sec-1",
			geniusHeader: "[Verse 1]",
		};

		const cloned = cloneLyricLineWithNewIds(originalLine, "sec-2", "[Chorus]");

		expect(cloned.id).not.toBe("line-1");
		expect(cloned.words[0].id).not.toBe("word-1");
		expect(cloned.words[0].word).toBe("Hello");
		expect(cloned.words[0].startTime).toBe(1000);
		expect(cloned.words[0].endTime).toBe(1500);
		expect(cloned.words[0].romanWord).toBe("he-llo");
		expect(cloned.words[0].obscene).toBe(true);
		expect(cloned.isBG).toBe(true);
		expect(cloned.isDuet).toBe(true);
		expect(cloned.agent).toBe("v2");
		expect(cloned.translatedLyric).toBe("Bonjour");
		expect(cloned.romanLyric).toBe("hello");
		expect(cloned.sectionId).toBe("sec-2");
		expect(cloned.geniusHeader).toBe("[Chorus]");
	});

	it("copySelectedLines returns null if nothing is selected", () => {
		const store = createStore();
		const line1 = { ...newLyricLine(), id: "line-1" };
		store.set(lyricLinesAtom, { metadata: [], lyricLines: [line1] });
		store.set(selectedLinesAtom, new Set());
		store.set(selectedWordsAtom, new Set());

		const result = copySelectedLines(store, undefined, false);
		expect(result).toBeNull();
		expect(store.get(copiedLyricLinesAtom)).toBeNull();
	});

	it("copySelectedLines copies highlighted line into copiedLyricLinesAtom", () => {
		const store = createStore();
		const word1 = { ...newLyricWord(), id: "w-1", word: "Sunshine" };
		const line1 = { ...newLyricLine(), id: "line-1", words: [word1] };
		const line2 = { ...newLyricLine(), id: "line-2", words: [] };

		store.set(lyricLinesAtom, { metadata: [], lyricLines: [line1, line2] });
		store.set(selectedLinesAtom, new Set(["line-1"]));

		const result = copySelectedLines(store, undefined, false);
		expect(result).toHaveLength(1);
		expect(result?.[0].id).toBe("line-1");
		expect(result?.[0].words[0].word).toBe("Sunshine");

		const clipboardState = store.get(copiedLyricLinesAtom);
		expect(clipboardState).toHaveLength(1);
		expect(clipboardState?.[0].id).toBe("line-1");
	});

	it("copySelectedLines copies multiple selected lines in document order", () => {
		const store = createStore();
		const line1 = { ...newLyricLine(), id: "line-1" };
		const line2 = { ...newLyricLine(), id: "line-2" };
		const line3 = { ...newLyricLine(), id: "line-3" };

		store.set(lyricLinesAtom, { metadata: [], lyricLines: [line1, line2, line3] });
		// User selected line 3 then line 1
		store.set(selectedLinesAtom, new Set(["line-3", "line-1"]));

		const result = copySelectedLines(store, undefined, false);
		expect(result).toHaveLength(2);
		// Preserves document order
		expect(result?.[0].id).toBe("line-1");
		expect(result?.[1].id).toBe("line-3");
	});

	it("copySelectedLines falls back to line containing selected words", () => {
		const store = createStore();
		const word1 = { ...newLyricWord(), id: "w-1", word: "Word" };
		const line1 = { ...newLyricLine(), id: "line-1", words: [word1] };

		store.set(lyricLinesAtom, { metadata: [], lyricLines: [line1] });
		store.set(selectedLinesAtom, new Set());
		store.set(selectedWordsAtom, new Set(["w-1"]));

		const result = copySelectedLines(store, undefined, false);
		expect(result).toHaveLength(1);
		expect(result?.[0].id).toBe("line-1");
	});

	it("pasteLinesBelowSelected returns false if copiedLyricLinesAtom is empty", () => {
		const store = createStore();
		const line1 = { ...newLyricLine(), id: "line-1" };
		let state: TTMLLyric = { metadata: [], lyricLines: [line1] };
		store.set(lyricLinesAtom, state);
		store.set(selectedLinesAtom, new Set(["line-1"]));

		const editLyricLines = (recipe: (draft: TTMLLyric) => void) => {
			const clone = JSON.parse(JSON.stringify(state));
			recipe(clone);
			state = clone;
			store.set(lyricLinesAtom, state);
		};

		const handled = pasteLinesBelowSelected(store, editLyricLines, undefined, false);
		expect(handled).toBe(false);
		expect(state.lyricLines).toHaveLength(1);
	});

	it("pasteLinesBelowSelected pastes copied line directly below highlighted line and updates selection", () => {
		const store = createStore();
		const word1 = { ...newLyricWord(), id: "w-1", word: "Line 1" };
		const word2 = { ...newLyricWord(), id: "w-2", word: "Line 2" };
		const line1 = { ...newLyricLine(), id: "line-1", words: [word1] };
		const line2 = { ...newLyricLine(), id: "line-2", words: [word2] };

		let state: TTMLLyric = {
			metadata: [],
			lyricLines: [line1, line2],
		};
		store.set(lyricLinesAtom, state);
		store.set(selectedLinesAtom, new Set(["line-1"]));

		const editLyricLines = (recipe: (draft: TTMLLyric) => void) => {
			const clone = JSON.parse(JSON.stringify(state));
			recipe(clone);
			state = clone;
			store.set(lyricLinesAtom, state);
		};

		// 1. Copy line 1
		copySelectedLines(store, undefined, false);

		// 2. Paste line below line 1
		const handled = pasteLinesBelowSelected(store, editLyricLines, undefined, false);
		expect(handled).toBe(true);

		// There are now 3 lines
		expect(state.lyricLines).toHaveLength(3);
		expect(state.lyricLines[0].id).toBe("line-1");
		expect(state.lyricLines[0].words[0].word).toBe("Line 1");

		// Line pasted at index 1 (below line 1)
		const pastedLine = state.lyricLines[1];
		expect(pastedLine.id).not.toBe("line-1");
		expect(pastedLine.words[0].word).toBe("Line 1");
		expect(pastedLine.words[0].id).not.toBe("w-1");

		// Line 2 shifted to index 2
		expect(state.lyricLines[2].id).toBe("line-2");

		// Selection was updated to the newly pasted line!
		const currentSelected = store.get(selectedLinesAtom);
		expect(currentSelected.size).toBe(1);
		expect(currentSelected.has(pastedLine.id)).toBe(true);
	});

	it("consecutive pastes continue inserting downward", () => {
		const store = createStore();
		const word1 = { ...newLyricWord(), id: "w-1", word: "Chorus" };
		const line1 = { ...newLyricLine(), id: "line-1", words: [word1] };

		let state: TTMLLyric = {
			metadata: [],
			lyricLines: [line1],
		};
		store.set(lyricLinesAtom, state);
		store.set(selectedLinesAtom, new Set(["line-1"]));

		const editLyricLines = (recipe: (draft: TTMLLyric) => void) => {
			const clone = JSON.parse(JSON.stringify(state));
			recipe(clone);
			state = clone;
			store.set(lyricLinesAtom, state);
		};

		// Copy line 1
		copySelectedLines(store, undefined, false);

		// First paste -> inserted at index 1
		pasteLinesBelowSelected(store, editLyricLines, undefined, false);
		expect(state.lyricLines).toHaveLength(2);
		const pasted1Id = state.lyricLines[1].id;
		expect(store.get(selectedLinesAtom).has(pasted1Id)).toBe(true);

		// Second paste -> inserted at index 2 (below the newly pasted line 1)
		pasteLinesBelowSelected(store, editLyricLines, undefined, false);
		expect(state.lyricLines).toHaveLength(3);
		const pasted2Id = state.lyricLines[2].id;
		expect(pasted2Id).not.toBe(pasted1Id);
		expect(store.get(selectedLinesAtom).has(pasted2Id)).toBe(true);
	});

	it("pastes multiple copied lines directly below target", () => {
		const store = createStore();
		const line1 = { ...newLyricLine(), id: "line-1", words: [{ ...newLyricWord(), id: "w-1", word: "A" }] };
		const line2 = { ...newLyricLine(), id: "line-2", words: [{ ...newLyricWord(), id: "w-2", word: "B" }] };
		const line3 = { ...newLyricLine(), id: "line-3", words: [{ ...newLyricWord(), id: "w-3", word: "C" }] };

		let state: TTMLLyric = {
			metadata: [],
			lyricLines: [line1, line2, line3],
		};
		store.set(lyricLinesAtom, state);
		store.set(selectedLinesAtom, new Set(["line-1", "line-2"]));

		const editLyricLines = (recipe: (draft: TTMLLyric) => void) => {
			const clone = JSON.parse(JSON.stringify(state));
			recipe(clone);
			state = clone;
			store.set(lyricLinesAtom, state);
		};

		// Copy lines 1 and 2
		copySelectedLines(store, undefined, false);

		// Target line 3
		store.set(selectedLinesAtom, new Set(["line-3"]));

		// Paste below line 3
		pasteLinesBelowSelected(store, editLyricLines, undefined, false);

		expect(state.lyricLines).toHaveLength(5);
		expect(state.lyricLines[0].id).toBe("line-1");
		expect(state.lyricLines[1].id).toBe("line-2");
		expect(state.lyricLines[2].id).toBe("line-3");
		expect(state.lyricLines[3].words[0].word).toBe("A");
		expect(state.lyricLines[4].words[0].word).toBe("B");

		// Both pasted lines are selected
		const selected = store.get(selectedLinesAtom);
		expect(selected.size).toBe(2);
		expect(selected.has(state.lyricLines[3].id)).toBe(true);
		expect(selected.has(state.lyricLines[4].id)).toBe(true);
	});

	it("pastes below explicit targetLineId even if selection is elsewhere", () => {
		const store = createStore();
		const line1 = { ...newLyricLine(), id: "line-1", words: [{ ...newLyricWord(), id: "w-1", word: "1" }] };
		const line2 = { ...newLyricLine(), id: "line-2", words: [{ ...newLyricWord(), id: "w-2", word: "2" }] };

		let state: TTMLLyric = {
			metadata: [],
			lyricLines: [line1, line2],
		};
		store.set(lyricLinesAtom, state);
		store.set(selectedLinesAtom, new Set(["line-2"]));

		const editLyricLines = (recipe: (draft: TTMLLyric) => void) => {
			const clone = JSON.parse(JSON.stringify(state));
			recipe(clone);
			state = clone;
			store.set(lyricLinesAtom, state);
		};

		// Copy line 2
		copySelectedLines(store, "line-2", false);

		// Paste specifically below line 1 (e.g. right-click menu on line 1)
		pasteLinesBelowSelected(store, editLyricLines, "line-1", false);

		expect(state.lyricLines).toHaveLength(3);
		expect(state.lyricLines[0].id).toBe("line-1");
		expect(state.lyricLines[1].words[0].word).toBe("2"); // inserted below line 1
		expect(state.lyricLines[2].id).toBe("line-2");
	});

	it("isEditableTarget identifies form controls and dialogs", () => {
		const input = { tagName: "INPUT", isContentEditable: false };
		expect(isEditableTarget(input as any)).toBe(true);

		const textarea = { tagName: "TEXTAREA", isContentEditable: false };
		expect(isEditableTarget(textarea as any)).toBe(true);

		const select = { tagName: "SELECT", isContentEditable: false };
		expect(isEditableTarget(select as any)).toBe(true);

		const editableDiv = { tagName: "DIV", isContentEditable: true };
		expect(isEditableTarget(editableDiv as any)).toBe(true);

		const normalDiv = {
			tagName: "DIV",
			isContentEditable: false,
			closest: () => null,
		};
		expect(isEditableTarget(normalDiv as any)).toBe(false);

		const childInDialog = {
			tagName: "SPAN",
			isContentEditable: false,
			closest: (selector: string) =>
				selector.includes("role='dialog'") ? {} : null,
		};
		expect(isEditableTarget(childInDialog as any)).toBe(true);
	});
});
