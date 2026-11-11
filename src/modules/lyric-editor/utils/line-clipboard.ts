import { atom, type createStore } from "jotai";
import { toast } from "react-toastify";
import i18next from "i18next";
import {
	lyricLinesAtom,
	selectedLinesAtom,
	selectedWordsAtom,
} from "$/states/main";
import {
	type LyricLine,
	type LyricWord,
	type TTMLLyric,
	newLyricLine,
	newLyricWord,
} from "$/types/ttml";
import { isEditing } from "$/utils/keybindings";
import { repairSectionIntegrity } from "./section-system";

/**
 * In-memory clipboard atom holding copied lyric lines.
 */
export const copiedLyricLinesAtom = atom<LyricLine[] | null>(null);

export type Store = ReturnType<typeof createStore>;
export type EditLyricLines = (recipe: (draft: TTMLLyric) => void) => void;

/**
 * Checks whether the event or current active element is focused inside an editable text input,
 * textarea, or modal/dialog where default copy/paste behavior must be preserved.
 */
export function isEditableTarget(
	target?: EventTarget | null,
	event?: Event,
): boolean {
	if (event && isEditing(event as KeyboardEvent)) {
		return true;
	}

	const check = (el: HTMLElement | null): boolean => {
		if (!el) return false;
		const tag = el.tagName;
		if (
			tag === "INPUT" ||
			tag === "TEXTAREA" ||
			tag === "SELECT" ||
			el.isContentEditable
		) {
			return true;
		}
		if (el.closest?.("input, textarea, select, [contenteditable='true']")) {
			return true;
		}
		if (el.closest?.("[role='dialog'], [role='alertdialog'], .rt-DialogContent")) {
			return true;
		}
		return false;
	};

	if (target && check(target as any)) {
		return true;
	}

	if (typeof document !== "undefined" && check(document.activeElement as HTMLElement | null)) {
		return true;
	}

	return false;
}

/**
 * Clones a LyricLine with fresh unique IDs for the line and all its words,
 * maintaining word timings, lyrics, translation, romanization, and line attributes.
 */
export function cloneLyricLineWithNewIds(
	line: LyricLine,
	targetSectionId?: string,
	targetGeniusHeader?: string,
): LyricLine {
	const fresh = newLyricLine();
	fresh.isBG = line.isBG ?? false;
	fresh.isDuet = line.isDuet ?? false;
	fresh.agent = line.agent;
	fresh.translatedLyric = line.translatedLyric ?? "";
	fresh.romanLyric = line.romanLyric ?? "";
	fresh.startTime = line.startTime ?? 0;
	fresh.endTime = line.endTime ?? 0;
	fresh.ignoreSync = line.ignoreSync ?? false;
	fresh.isLineSynced = line.isLineSynced ?? false;
	fresh.language = line.language ?? "auto";

	if (targetSectionId !== undefined) {
		fresh.sectionId = targetSectionId;
	} else if (line.sectionId) {
		fresh.sectionId = line.sectionId;
	}

	if (targetGeniusHeader !== undefined) {
		fresh.geniusHeader = targetGeniusHeader;
	} else if (line.geniusHeader) {
		fresh.geniusHeader = line.geniusHeader;
	}

	fresh.words = (line.words || []).map((w): LyricWord => {
		const freshWord = newLyricWord();
		freshWord.word = w.word;
		freshWord.startTime = w.startTime ?? 0;
		freshWord.endTime = w.endTime ?? 0;
		freshWord.obscene = w.obscene ?? false;
		freshWord.romanWord = w.romanWord ?? "";
		return freshWord;
	});

	return fresh;
}

/**
 * Copies the currently selected/highlighted line(s) into the in-memory clipboard atom
 * and writes plain text representation to the system clipboard.
 */
export function copySelectedLines(
	store: Store,
	targetLineId?: string,
	showToast = true,
): LyricLine[] | null {
	const lyricLinesState = store.get(lyricLinesAtom);
	const selectedLines = store.get(selectedLinesAtom);
	const targetLineIds = new Set<string>();

	if (targetLineId) {
		if (selectedLines.has(targetLineId) && selectedLines.size > 1) {
			for (const id of selectedLines) targetLineIds.add(id);
		} else {
			targetLineIds.add(targetLineId);
			store.set(selectedLinesAtom, new Set([targetLineId]));
		}
	} else if (selectedLines.size > 0) {
		for (const id of selectedLines) targetLineIds.add(id);
	} else {
		// Fallback: check if words are selected
		const selectedWords = store.get(selectedWordsAtom);
		if (selectedWords.size > 0) {
			for (const line of lyricLinesState.lyricLines) {
				if (line.words.some((w) => selectedWords.has(w.id))) {
					targetLineIds.add(line.id);
				}
			}
		}
	}

	if (targetLineIds.size === 0) return null;

	// Maintain song line order
	const linesToCopy = lyricLinesState.lyricLines.filter((l) =>
		targetLineIds.has(l.id),
	);
	if (linesToCopy.length === 0) return null;

	// Deep clone lines
	const cloned: LyricLine[] = linesToCopy.map((l) => ({
		...l,
		words: l.words.map((w) => ({ ...w })),
	}));

	store.set(copiedLyricLinesAtom, cloned);

	// Write plain text representation to navigator.clipboard
	const plainText = linesToCopy
		.map((l) => l.words.map((w) => w.word).join(""))
		.join("\n");
	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(plainText).catch(() => {});
	}

	if (showToast) {
		toast.success(
			i18next.t("lyricEditor.copiedLines", {
				count: linesToCopy.length,
				defaultValue:
					linesToCopy.length > 1
						? `Copied ${linesToCopy.length} lines`
						: "Copied 1 line",
			}),
		);
	}

	return cloned;
}

/**
 * Pastes the copied line(s) directly *below* the highlighted/selected line.
 * Newly pasted line(s) are selected immediately so consecutive pastes continue downward.
 */
export function pasteLinesBelowSelected(
	store: Store,
	editLyricLines: EditLyricLines,
	targetLineId?: string,
	showToast = true,
): boolean {
	const copied = store.get(copiedLyricLinesAtom);
	if (!copied || copied.length === 0) {
		return false;
	}

	let pastedLineIds: string[] = [];

	editLyricLines((draft) => {
		let targetIndex = -1;

		if (targetLineId) {
			targetIndex = draft.lyricLines.findIndex((l) => l.id === targetLineId);
		} else {
			const selectedLines = store.get(selectedLinesAtom);
			const selectedWords = store.get(selectedWordsAtom);

			if (selectedLines.size > 0) {
				for (let i = draft.lyricLines.length - 1; i >= 0; i--) {
					if (selectedLines.has(draft.lyricLines[i].id)) {
						targetIndex = i;
						break;
					}
				}
			} else if (selectedWords.size > 0) {
				for (let i = draft.lyricLines.length - 1; i >= 0; i--) {
					if (draft.lyricLines[i].words.some((w) => selectedWords.has(w.id))) {
						targetIndex = i;
						break;
					}
				}
			}
		}

		// If no line selected, target the bottom of current lyrics
		if (targetIndex === -1 && draft.lyricLines.length > 0) {
			targetIndex = draft.lyricLines.length - 1;
		}

		const prevLine =
			targetIndex >= 0 ? draft.lyricLines[targetIndex] : undefined;
		const targetSectionId = prevLine?.sectionId;
		const targetGeniusHeader = prevLine?.geniusHeader;

		const newLines = copied.map((line) =>
			cloneLyricLineWithNewIds(line, targetSectionId, targetGeniusHeader),
		);

		const insertIndex = targetIndex >= 0 ? targetIndex + 1 : 0;
		draft.lyricLines.splice(insertIndex, 0, ...newLines);
		repairSectionIntegrity(draft);

		pastedLineIds = newLines.map((l) => l.id);
	});

	if (pastedLineIds.length > 0) {
		// Highlight newly pasted line(s)
		store.set(selectedLinesAtom, new Set(pastedLineIds));
		store.set(selectedWordsAtom, new Set<string>());

		if (showToast) {
			toast.success(
				i18next.t("lyricEditor.pastedLines", {
					count: pastedLineIds.length,
					defaultValue:
						pastedLineIds.length > 1
							? `Pasted ${pastedLineIds.length} lines`
							: "Pasted 1 line",
				}),
			);
		}
		return true;
	}

	return false;
}

/**
 * Pastes lines below selected, falling back to reading system clipboard text if in-memory atom is empty.
 */
export async function pasteLinesBelowSelectedWithClipboardFallback(
	store: Store,
	editLyricLines: EditLyricLines,
	targetLineId?: string,
	showToast = true,
): Promise<boolean> {
	if (pasteLinesBelowSelected(store, editLyricLines, targetLineId, showToast)) {
		return true;
	}

	if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
		try {
			const text = await navigator.clipboard.readText();
			if (!text || !text.trim()) return false;

			const textLines = text.split(/\r?\n/).filter((l) => l.length > 0);
			if (textLines.length === 0) return false;

			const parsedLines: LyricLine[] = textLines.map((lineText) => {
				const line = newLyricLine();
				const word = newLyricWord();
				word.word = lineText;
				line.words = [word];
				return line;
			});

			store.set(copiedLyricLinesAtom, parsedLines);
			return pasteLinesBelowSelected(
				store,
				editLyricLines,
				targetLineId,
				showToast,
			);
		} catch {
			// Clipboard read denied or not supported
		}
	}

	return false;
}
