import { useAtomValue, useStore } from "jotai";
import { useSetImmerAtom } from "jotai-immer";
import { type FC, useEffect, useRef } from "react";
import { cmdCopy, cmdPaste } from "$/modules/keyboard/commands";
import { useCommand } from "$/modules/keyboard/hooks";
import { lyricLinesAtom, ToolMode, toolModeAtom } from "$/states/main";
import { newLyricLine, newLyricWord } from "$/types/ttml";
import {
	copiedLyricLinesAtom,
	copySelectedLines,
	isEditableTarget,
	pasteLinesBelowSelected,
	pasteLinesBelowSelectedWithClipboardFallback,
} from "../utils/line-clipboard";

export const LineClipboardKeybinding: FC = () => {
	const store = useStore();
	const toolMode = useAtomValue(toolModeAtom);
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const lastPasteTimeRef = useRef<number>(0);

	// Command integration
	useCommand(
		cmdCopy,
		() => {
			if (toolMode !== ToolMode.Edit) return;
			if (isEditableTarget(document.activeElement)) return;
			copySelectedLines(store);
		},
		[store, toolMode],
	);

	useCommand(
		cmdPaste,
		() => {
			if (toolMode !== ToolMode.Edit) return;
			if (isEditableTarget(document.activeElement)) return;
			lastPasteTimeRef.current = Date.now();
			void pasteLinesBelowSelectedWithClipboardFallback(store, editLyricLines);
		},
		[store, editLyricLines, toolMode],
	);

	// Native window copy and paste events (e.g. from OS menu bar or browser Edit menu)
	useEffect(() => {
		const handleWindowCopy = (e: ClipboardEvent) => {
			if (toolMode !== ToolMode.Edit) return;
			if (isEditableTarget(e.target, e)) return;

			const copied = copySelectedLines(store);
			if (copied && copied.length > 0) {
				e.preventDefault();
				const text = copied
					.map((l) => l.words.map((w) => w.word).join(""))
					.join("\n");
				e.clipboardData?.setData("text/plain", text);
			}
		};

		const handleWindowPaste = (e: ClipboardEvent) => {
			if (toolMode !== ToolMode.Edit) return;
			if (isEditableTarget(e.target, e)) return;

			const now = Date.now();
			if (now - lastPasteTimeRef.current < 150) {
				e.preventDefault();
				return;
			}
			lastPasteTimeRef.current = now;

			let handled = pasteLinesBelowSelected(store, editLyricLines);
			if (!handled && e.clipboardData) {
				const text = e.clipboardData.getData("text/plain");
				if (text?.trim()) {
					const textLines = text.split(/\r?\n/).filter((l) => l.length > 0);
					if (textLines.length > 0) {
						const parsedLines = textLines.map((lineText) => {
							const line = newLyricLine();
							const word = newLyricWord();
							word.word = lineText;
							line.words = [word];
							return line;
						});
						store.set(copiedLyricLinesAtom, parsedLines);
						handled = pasteLinesBelowSelected(store, editLyricLines);
					}
				}
			}
			if (handled) {
				e.preventDefault();
			}
		};

		window.addEventListener("copy", handleWindowCopy);
		window.addEventListener("paste", handleWindowPaste);
		return () => {
			window.removeEventListener("copy", handleWindowCopy);
			window.removeEventListener("paste", handleWindowPaste);
		};
	}, [store, editLyricLines, toolMode]);

	// Direct capture keyboard shortcut listener for robust Cmd+C / Cmd+V in Edit mode
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (toolMode !== ToolMode.Edit) return;
			if (isEditableTarget(e.target, e)) return;

			const isCtrlOrMeta = e.metaKey || e.ctrlKey;
			if (!isCtrlOrMeta || e.altKey) return;

			const key = e.key.toLowerCase();
			if (key === "c" && !e.shiftKey) {
				const copied = copySelectedLines(store);
				if (copied && copied.length > 0) {
					e.preventDefault();
					e.stopPropagation();
				}
			} else if (key === "v" && !e.shiftKey) {
				const now = Date.now();
				if (now - lastPasteTimeRef.current < 150) {
					e.preventDefault();
					return;
				}
				lastPasteTimeRef.current = now;
				e.preventDefault();
				e.stopPropagation();
				void pasteLinesBelowSelectedWithClipboardFallback(store, editLyricLines);
			}
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => {
			window.removeEventListener("keydown", handleKeyDown, { capture: true });
		};
	}, [store, editLyricLines, toolMode]);

	return null;
};

