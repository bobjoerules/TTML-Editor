import { ContextMenu } from "@radix-ui/themes";
import { type Atom, atom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useSetImmerAtom } from "jotai-immer";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
	combineWordsDialogAtom,
	replaceRomanizationDialogAtom,
	replaceWordDialogAtom,
	splitWordDialogAtom,
} from "$/states/dialogs";
import {
	editingWordStateAtom,
	lyricLinesAtom,
	selectedLinesAtom,
	selectedWordsAtom,
} from "$/states/main";
import {
	type LyricLine,
	type LyricWord,
	newLyricLine,
	newLyricWord,
} from "$/types/ttml";
import { getPhoneticSyllables } from "$/utils/phonetic";
import {
	combineWordsApplyToAllAtom,
	combineWordsIgnoreCaseAtom,
} from "../tools/combine-words-options";
import {
	combineMatchingWordSequences,
	combineSelectedWords,
	getCombineWordSelection,
} from "../utils/combine-words";
import {
	cleanupLineSpaces,
	normalizeLineTime,
	removeWordsFromLine,
} from "../utils/normalize-line-time";
import { repairSectionIntegrity } from "../utils/section-system";

const selectedLinesSizeAtom = atom((get) => get(selectedLinesAtom).size);
const selectedWordsSizeAtom = atom((get) => get(selectedWordsAtom).size);

export const LyricWordMenu = ({
	wordIndex,
	wordAtom,
	lineIndex,
}: {
	wordIndex: number;
	wordAtom?: Atom<LyricWord>;
	lineIndex: number;
}) => {
	const { t } = useTranslation();

	const store = useStore();
	const selectedWordsSize = useAtomValue(selectedWordsSizeAtom);
	const selectedLinesSize = useAtomValue(selectedLinesSizeAtom);
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const setOpenSplitWordDialog = useSetAtom(splitWordDialogAtom);
	const setOpenReplaceWordDialog = useSetAtom(replaceWordDialogAtom);
	const setReplaceRomanizationDialog = useSetAtom(
		replaceRomanizationDialogAtom,
	);
	const setCombineWordsDialog = useSetAtom(combineWordsDialogAtom);
	const setEditingWordState = useSetAtom(editingWordStateAtom);
	const resolvedWordAtom = useMemo(
		() =>
			wordAtom ??
			atom(
				(get) => get(lyricLinesAtom).lyricLines[lineIndex]?.words[wordIndex],
			),
		[wordAtom, lineIndex, wordIndex],
	);
	const word = useAtomValue(resolvedWordAtom);
	const combineApplyToAll = useAtomValue(combineWordsApplyToAllAtom);
	const combineIgnoreCase = useAtomValue(combineWordsIgnoreCaseAtom);
	const combineShiftClickRef = useRef(false);

	if (!word) return null;

	return (
		<>
			<ContextMenu.Item
				disabled={selectedWordsSize !== 1}
				onSelect={() => {
					setEditingWordState({
						wordIndex,
						lineIndex,
						word: word.word,
					});
					setOpenSplitWordDialog(true);
				}}
			>
				{t("contextMenu.splitWord", "Split Word…")}
			</ContextMenu.Item>
			{/[\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u4E00-\u9FA5]/.test(
				word.word,
			) && (
				<ContextMenu.Item
					disabled={selectedWordsSize !== 1 || word.word.length <= 1}
					onSelect={async () => {
						try {
							// Detect project-level language priority for context
							const allLines = store.get(lyricLinesAtom).lyricLines;
							const fullProjectText = allLines
								.map((l) => l.words.map((w) => w.word).join(""))
								.join("");
							let projectLangPriority: "ja" | "zh" | "ko" | "auto" = "auto";

							if (/[\u3040-\u309F\u30A0-\u30FF]/.test(fullProjectText))
								projectLangPriority = "ja";
							else if (/[\uAC00-\uD7AF]/.test(fullProjectText))
								projectLangPriority = "ko";
							else if (/[\u4E00-\u9FA5]/.test(fullProjectText))
								projectLangPriority = "zh";

							const syllables = await getPhoneticSyllables(
								word.word,
								projectLangPriority,
							);
							if (syllables.length <= 1) {
								toast.info(
									t(
										"contextMenu.noSyllablesFound",
										"No multiple syllables found.",
									),
								);
								return;
							}

							editLyricLines((state) => {
								const line = state.lyricLines[lineIndex];
								if (!line) return;

								const targetWordIndex = line.words.findIndex(
									(w) => w.id === word.id,
								);
								if (targetWordIndex === -1) return;

								const originalWord = line.words[targetWordIndex];
								const duration = originalWord.endTime - originalWord.startTime;
								const syllDuration = Math.floor(duration / syllables.length);

								const newWords: LyricWord[] = syllables.map((syll, i) => {
									const nw = newLyricWord();
									nw.word = word.word[i];
									nw.romanWord = syll;
									nw.startTime = originalWord.startTime + i * syllDuration;
									nw.endTime =
										i === syllables.length - 1
											? originalWord.endTime
											: originalWord.startTime + (i + 1) * syllDuration;
									return nw;
								});

								line.words.splice(targetWordIndex, 1, ...newWords);
							});
						} catch (e) {
							console.error("Failed to split syllables", e);
							toast.error(t("common.error", "An error occurred"));
						}
					}}
				>
					{t(
						"contextMenu.splitIntoSyllables",
						"Split into Syllables (Romanized)",
					)}
				</ContextMenu.Item>
			)}
			<ContextMenu.Item
				disabled={selectedWordsSize !== 1}
				onSelect={() => {
					setEditingWordState({
						wordIndex,
						lineIndex,
						word: word.word,
					});
					setOpenReplaceWordDialog(true);
				}}
			>
				{t("contextMenu.replaceWord", "Replace Word…")}
			</ContextMenu.Item>
			<ContextMenu.Item
				disabled={selectedWordsSize !== 1}
				onSelect={() => {
					setReplaceRomanizationDialog({
						open: true,
						lineIndex,
						wordIndex,
					});
				}}
			>
				{t("contextMenu.replaceRomanization", "Replace Romanization…")}
			</ContextMenu.Item>
			<ContextMenu.Item
				disabled={!(selectedWordsSize > 1 && selectedLinesSize === 1)}
				onPointerDown={(event) => {
					combineShiftClickRef.current = event.shiftKey;
				}}
				onPointerCancel={() => {
					combineShiftClickRef.current = false;
				}}
				onSelect={() => {
					const combineImmediately = combineShiftClickRef.current;
					combineShiftClickRef.current = false;
					if (combineImmediately) {
						editLyricLines((state) => {
							const sourceLine = state.lyricLines[lineIndex];
							if (!sourceLine) return;

							const selectedWordIds = store.get(selectedWordsAtom);
							const selection = getCombineWordSelection(
								sourceLine.words,
								selectedWordIds,
							);
							if (!selection) return;

							if (combineApplyToAll && selection.isContiguous) {
								for (const line of state.lyricLines) {
									line.words = combineMatchingWordSequences(
										line.words,
										selection.words,
										combineIgnoreCase,
									);
								}
							} else {
								sourceLine.words = combineSelectedWords(
									sourceLine.words,
									selectedWordIds,
								);
							}
						});
						return;
					}
					setCombineWordsDialog({ open: true, lineIndex });
				}}
			>
				{t("contextMenu.combineWords", "Combine Words")}
				<span style={{ marginLeft: "auto", color: "var(--gray-9)" }}>
					Shift+click
				</span>
			</ContextMenu.Item>

			<ContextMenu.Item
				disabled={selectedWordsSize === 0}
				onSelect={() => {
					editLyricLines((state) => {
						const selectedWords = store.get(selectedWordsAtom);
						for (const line of state.lyricLines) {
							removeWordsFromLine(line, selectedWords);
						}
					});
				}}
			>
				{t("contextMenu.deleteWords", {
					count: selectedWordsSize,
					defaultValue: "Delete Selected Words",
				})}
			</ContextMenu.Item>

			<ContextMenu.Separator />

			<ContextMenu.Item
				disabled={selectedWordsSize !== 1}
				onSelect={() => afterToNewLine()}
			>
				{t(
					"contextMenu.moveFollowingWordToNewLine",
					"Split Following Words to New Line",
				)}
			</ContextMenu.Item>

			<ContextMenu.Item
				disabled={selectedWordsSize === 0}
				onSelect={() => selectedToNewLine()}
			>
				{t("contextMenu.moveWordToNewLine", {
					count: selectedWordsSize,
					defaultValue: "Split Selected Words to New Line",
				})}
			</ContextMenu.Item>

			<ContextMenu.Separator />
		</>
	);

	function selectedToNewLine() {
		editLyricLines((state) => {
			const selectedWordIds = store.get(selectedWordsAtom);
			const selectedWords: LyricWord[] = [];
			const affectedLines: LyricLine[] = [];
			for (const line of state.lyricLines) {
				const hasSelected = line.words.some((w) => selectedWordIds.has(w.id));
				if (hasSelected) {
					for (const w of line.words) {
						if (selectedWordIds.has(w.id)) {
							selectedWords.push(w);
							affectedLines.push(line);
						}
					}
					removeWordsFromLine(line, selectedWordIds);
				}
			}
			const targetLine = state.lyricLines[lineIndex];
			const newLine = {
				...newLyricLine(),
				isBG: targetLine?.isBG,
				isDuet: targetLine?.isDuet,
				agent: targetLine?.agent,
				role: targetLine?.role,
				sectionId: targetLine?.sectionId,
				geniusHeader: targetLine?.geniusHeader,
			} as LyricLine;
			newLine.words.push(...cleanupLineSpaces(selectedWords));
			normalizeLineTime(newLine);
			state.lyricLines.splice(lineIndex + 1, 0, newLine);
			repairSectionIntegrity(state);
		});
	}

	function afterToNewLine() {
		editLyricLines((state) => {
			const line = state.lyricLines[lineIndex];
			if (!line) return;
			const word = line.words[wordIndex];
			if (!word) return;
			if (/^\s*$/.test(word.word) && !word.startTime && !word.endTime)
				line.words.splice(wordIndex, 1);
			const wordsToMove = line.words.splice(wordIndex);
			const newLine = {
				...newLyricLine(),
				isBG: line.isBG,
				isDuet: line.isDuet,
				agent: line.agent,
				role: line.role,
				sectionId: line.sectionId,
				geniusHeader: line.geniusHeader,
			} as LyricLine;
			newLine.words.push(...cleanupLineSpaces(wordsToMove));
			line.words = cleanupLineSpaces(line.words);
			normalizeLineTime(line);
			normalizeLineTime(newLine);
			state.lyricLines.splice(lineIndex + 1, 0, newLine);
			repairSectionIntegrity(state);
		});
	}
};
