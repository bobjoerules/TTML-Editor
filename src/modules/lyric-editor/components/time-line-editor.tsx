import {
	AddFilled,
	ArrowLeftRegular,
	ArrowRightRegular,
	DeleteRegular,
	Warning20Filled,
} from "@fluentui/react-icons";
import { Badge, Button, Flex, IconButton, Text } from "@radix-ui/themes";
import classNames from "classnames";
import { type Atom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useSetImmerAtom } from "jotai-immer";
import {
	type ChangeEvent,
	type CSSProperties,
	type FC,
	type KeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
	lyricLinesAtom,
	selectedWordsAtom,
} from "$/states/main.ts";
import {
	type LyricLine,
	type LyricWord,
	newLyricWord,
} from "$/types/ttml.ts";
import { msToTimestamp } from "$/utils/timestamp.ts";
import { isWordSynced, normalizeLineTime } from "../utils/normalize-line-time";
import {
	applyTimeLineDraft,
	hasOutOfOrderWordTimings,
} from "../utils/time-line-edit";
import styles from "./index.module.css";
import { timeLineEditorAtom } from "./lyric-line-view-states";

interface TimeLineInitialState {
	ids: string[];
	texts: string[];
}

interface TimeLineEditorProps {
	lineAtom: Atom<LyricLine>;
}

const cloneDraftWord = (word: LyricWord): LyricWord => ({
	...word,
	ruby: word.ruby?.map((item) => ({ ...item })),
});

const getInputWidth = (value: string): CSSProperties => ({
	width: `${Math.min(Math.max(value.length + 1, 2), 24)}ch`,
});

/**
 * Inline text editor for the Time page.
 *
 * Editing is kept in a local draft so Escape can discard it. The draft is
 * committed in one change to the shared lyric atom, which also means it is one
 * undo step and is visible in Edit mode immediately after closing.
 */
export const TimeLineEditor: FC<TimeLineEditorProps> = ({
	lineAtom,
}) => {
	const { t } = useTranslation();
	const line = useAtomValue(lineAtom);
	const store = useStore();
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const setSelectedWords = useSetImmerAtom(selectedWordsAtom);
	const setTimeLineEditor = useSetAtom(timeLineEditorAtom);
	const rootRef = useRef<HTMLDivElement>(null);
	const addButtonRef = useRef<HTMLButtonElement>(null);
	const inputRefs = useRef(new Map<string, HTMLInputElement>());
	const initialRef = useRef<TimeLineInitialState | null>(null);
	const [draftWords, setDraftWords] = useState<LyricWord[]>(() =>
		line.words.map(cloneDraftWord),
	);
	const [pendingFocusId, setPendingFocusId] = useState<string | null>(
		() => line.words[0]?.id ?? null,
	);

	if (!initialRef.current) {
		initialRef.current = {
			ids: line.words.map((word) => word.id),
			texts: line.words.map((word) => word.word),
		};
	}

	const hasChanges = useMemo(() => {
		const initial = initialRef.current;
		if (!initial) return false;
		return (
			draftWords.length !== initial.ids.length ||
			draftWords.some(
				(word, index) =>
					word.id !== initial.ids[index] || word.word !== initial.texts[index],
			)
		);
	}, [draftWords]);

	const hasOrderWarning = useMemo(
		() => hasOutOfOrderWordTimings(draftWords),
		[draftWords],
	);

	const close = useCallback(() => {
		setTimeLineEditor(null);
	}, [setTimeLineEditor]);

	const focusWord = useCallback((wordId: string) => {
		setPendingFocusId(wordId);
	}, []);

	const addWord = useCallback(
		(index: number) => {
			const newWord = newLyricWord();
			setDraftWords((words) => {
				const next = [...words];
				next.splice(index, 0, newWord);
				return next;
			});
			focusWord(newWord.id);
		},
		[focusWord],
	);

	const updateWord = useCallback(
		(wordId: string, value: string) => {
			setDraftWords((words) =>
				words.map((word) =>
					word.id === wordId ? { ...word, word: value } : word,
				),
			);
		},
		[],
	);

	const deleteWord = useCallback(
		(wordId: string) => {
			const index = draftWords.findIndex((word) => word.id === wordId);
			const fallback = draftWords[index + 1] ?? draftWords[index - 1];
			setDraftWords((words) => words.filter((word) => word.id !== wordId));
			if (fallback) focusWord(fallback.id);
		},
		[draftWords, focusWord],
	);

	const moveWord = useCallback(
		(wordId: string, direction: -1 | 1) => {
			setDraftWords((words) => {
				const index = words.findIndex((word) => word.id === wordId);
				const targetIndex = index + direction;
				if (index < 0 || targetIndex < 0 || targetIndex >= words.length) {
					return words;
				}
				const next = [...words];
				[next[index], next[targetIndex]] = [next[targetIndex], next[index]];
				return next;
			});
			focusWord(wordId);
		},
		[focusWord],
	);

	const commit = useCallback(() => {
		const initial = initialRef.current;
		const currentLine = store
			.get(lyricLinesAtom)
			.lyricLines.find((item) => item.id === line.id);
		if (!initial || !currentLine) {
			close();
			return;
		}

		if (!hasChanges) {
			close();
			return;
		}

		const currentIds = new Set(currentLine.words.map((word) => word.id));
		const draftIds = new Set(draftWords.map((word) => word.id));
		const structureChanged =
			draftWords.some((word) => !currentIds.has(word.id)) ||
			currentLine.words.some((word) => !draftIds.has(word.id));

		editLyricLines((state) => {
			const targetLine = state.lyricLines.find((item) => item.id === line.id);
			if (!targetLine) return;
			targetLine.words = applyTimeLineDraft(targetLine.words, draftWords);
			if (structureChanged) normalizeLineTime(targetLine);
		});

		// Remove selections for words that no longer exist. The selected line is
		// left untouched, so switching modes keeps the same line selected.
		setSelectedWords((selected) => {
			for (const wordId of selected) {
				if (!draftIds.has(wordId)) selected.delete(wordId);
			}
		});

		close();
	}, [
		close,
		draftWords,
		editLyricLines,
		hasChanges,
		line.id,
		setSelectedWords,
		store,
	]);

	const cancel = useCallback(() => {
		close();
	}, [close]);

	// Clicking anywhere outside saves and closes. The line's own edit button is
	// exempt so pressing it while the editor is open does not immediately
	// reopen the editor.
	useEffect(() => {
		const handlePointerDown = (event: PointerEvent) => {
			const root = rootRef.current;
			const target = event.target;
			if (!root || !(target instanceof Node) || root.contains(target)) return;

			if (target instanceof HTMLElement) {
				const toggle = target.closest<HTMLElement>(
					"[data-time-line-editor-toggle]",
				);
				if (toggle?.dataset.timeLineEditorToggle === line.id) return;
			}

			commit();
		};

		document.addEventListener("pointerdown", handlePointerDown, true);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown, true);
		};
	}, [commit, line.id]);

	useEffect(() => {
		if (!pendingFocusId) return;
		const input = inputRefs.current.get(pendingFocusId);
		if (!input) return;
		input.focus();
		input.select();
		setPendingFocusId(null);
	}, [pendingFocusId]);

	useEffect(() => {
		if (draftWords.length > 0) return;
		addButtonRef.current?.focus();
	}, [draftWords.length]);

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		// Keep the global syncing shortcuts from receiving keys while this editor
		// is open. The window listeners are bubble listeners, so stopping here is
		// enough; closing the editor restores them.
		event.stopPropagation();

		if (event.nativeEvent.isComposing) return;

		if (event.key === "Escape") {
			event.preventDefault();
			cancel();
			return;
		}

		if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
			event.preventDefault();
			commit();
		}
	};

	const renderInsertButton = (index: number) => (
		<IconButton
			ref={index === 0 ? addButtonRef : undefined}
			type="button"
			size="1"
			variant="soft"
			color="gray"
			className={styles.timeLineEditorAdd}
			title={t("timeLineEditor.addWord", "Add word")}
			aria-label={t("timeLineEditor.addWord", "Add word")}
			data-lyric-line-interactive=""
			onClick={() => addWord(index)}
		>
			<AddFilled />
		</IconButton>
	);

	return (
		<div
			ref={rootRef}
			tabIndex={-1}
			className={styles.timeLineEditor}
			data-lyric-line-interactive=""
			data-time-line-editor=""
			onKeyDown={handleKeyDown}
			onPointerDown={(event) => {
				const target = event.target;
				if (
					target instanceof HTMLElement &&
					!target.closest("input, button, [contenteditable=true]")
				) {
					rootRef.current?.focus();
				}
			}}
		>
			<Flex justify="between" align="center" gap="2" mb="2">
				<Flex align="center" gap="2" style={{ minWidth: 0 }}>
					<Text size="2" weight="medium">
						{t("timeLineEditor.title", "Edit line text")}
					</Text>
					<Text size="1" color="gray">
						{t(
							"timeLineEditor.hint",
							"Enter saves · click away saves · Esc cancels",
						)}
					</Text>
				</Flex>
				<Flex align="center" gap="1">
					<Button
						type="button"
						size="1"
						variant="soft"
						color="gray"
						data-lyric-line-interactive=""
						onClick={cancel}
					>
						{t("common.cancel", "Cancel")}
					</Button>
					<Button
						type="button"
						size="1"
						data-lyric-line-interactive=""
						onClick={commit}
					>
						{t("timeLineEditor.done", "Done")}
					</Button>
				</Flex>
			</Flex>

			{hasOrderWarning && (
				<Flex
					align="center"
					gap="1"
					mb="2"
					className={styles.timeLineEditorWarning}
					role="status"
				>
					<Warning20Filled />
					<Text size="1">
						{t(
							"timeLineEditor.timingsOutOfOrder",
							"Timing order no longer matches word order. The timings were left unchanged.",
						)}
					</Text>
				</Flex>
			)}

			<Flex
				align="center"
				wrap="wrap"
				gap="1"
				className={styles.timeLineEditorWords}
			>
				{renderInsertButton(0)}
				{draftWords.map((word, index) => (
					<Flex key={word.id} align="center" gap="1">
						<Flex
							direction="column"
							gap="1"
							className={classNames(
								styles.timeLineEditorWord,
								!isWordSynced(word) && styles.timeLineEditorWordUnsynced,
							)}
						>
							<input
								ref={(input) => {
									if (input) inputRefs.current.set(word.id, input);
									else inputRefs.current.delete(word.id);
								}}
								type="text"
								value={word.word}
								placeholder={t("timeLineEditor.wordPlaceholder", "Word")}
								aria-label={`${t("timeLineEditor.word", "Word")} ${index + 1}`}
								className={styles.timeLineEditorInput}
								style={getInputWidth(word.word)}
								data-lyric-line-interactive=""
								onChange={(event: ChangeEvent<HTMLInputElement>) =>
									updateWord(word.id, event.currentTarget.value)
								}
							/>
							<Flex align="center" justify="center" gap="1">
								{isWordSynced(word) ? (
									<Text size="1" color="gray">
										{msToTimestamp(word.startTime)} –{" "}
										{msToTimestamp(word.endTime)}
									</Text>
								) : (
									<Badge size="1" color="red" variant="soft">
										{t("timeLineEditor.unsynced", "Unsynced")}
									</Badge>
								)}
							</Flex>
							<Flex align="center" justify="center" gap="0">
								<IconButton
									type="button"
									size="1"
									variant="ghost"
									color="gray"
									disabled={index === 0}
									title={t("timeLineEditor.moveLeft", "Move word left")}
									aria-label={t("timeLineEditor.moveLeft", "Move word left")}
									data-lyric-line-interactive=""
									onClick={() => moveWord(word.id, -1)}
								>
									<ArrowLeftRegular />
								</IconButton>
								<IconButton
									type="button"
									size="1"
									variant="ghost"
									color="gray"
									disabled={index === draftWords.length - 1}
									title={t("timeLineEditor.moveRight", "Move word right")}
									aria-label={t("timeLineEditor.moveRight", "Move word right")}
									data-lyric-line-interactive=""
									onClick={() => moveWord(word.id, 1)}
								>
									<ArrowRightRegular />
								</IconButton>
								<IconButton
									type="button"
									size="1"
									variant="ghost"
									color="gray"
									title={t("timeLineEditor.deleteWord", "Delete word")}
									aria-label={t("timeLineEditor.deleteWord", "Delete word")}
									data-lyric-line-interactive=""
									onClick={() => deleteWord(word.id)}
								>
									<DeleteRegular />
								</IconButton>
							</Flex>
						</Flex>
						{renderInsertButton(index + 1)}
					</Flex>
				))}
			</Flex>

			{draftWords.length === 0 && (
				<Text size="1" color="gray">
					{t("timeLineEditor.empty", "No words yet. Add the first word above.")}
				</Text>
			)}
		</div>
	);
};
