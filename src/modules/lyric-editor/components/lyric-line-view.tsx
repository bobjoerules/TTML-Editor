/*
 * Copyright 2023-2025 Steve Xiao (stevexmh@qq.com) and contributors.
 *
 * 本源代码文件是属于 AMLL TTML Tool 项目的一部分。
 * This source code file is a part of AMLL TTML Tool project.
 * 本项目的源代码的使用受到 GNU GENERAL PUBLIC LICENSE version 3 许可证的约束，具体可以参阅以下链接。
 * Use of this source code is governed by the GNU GPLv3 license that can be found through the following link.
 *
 * https://github.com/bobjoerules/AMLL-TTML-TOOL/blob/main/LICENSE
 */

import {
	AddFilled,
	LinkMultiple20Regular,
	TextAlignRightFilled,
	VideoBackgroundEffectFilled,
} from "@fluentui/react-icons";
import {
	Badge,
	Box,
	Button,
	Flex,
	IconButton,
	Text,
	TextField,
} from "@radix-ui/themes";
import classNames from "classnames";
import { type Atom, atom, useAtom, useAtomValue, useStore } from "jotai";
import { selectAtom, splitAtom } from "jotai/utils";
import { useSetImmerAtom } from "jotai-immer";
import {
	type FC,
	Fragment,
	memo,
	type SyntheticEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { currentTimeAtom } from "$/modules/audio/states/index.ts";
import {
	advGeniusHeaderColorAtom,
	compactBGInSyncAtom,
	geniusCategorizationEnabledAtom,
	legacySpaceLabelsAtom,
	showLineRomanizationAtom,
	showLineTranslationAtom,
	showTimestampsAtom,
	showWordRomanizationInputAtom,
	wrapLyricLinesAtom,
} from "$/modules/settings/states/index.ts";
import {
	syncLevelModeAtom,
	visualizeTimestampUpdateAtom,
} from "$/modules/settings/states/sync.ts";
import {
	collapsedSectionIdsAtom,
	lyricLinesAtom,
	selectedLinesAtom,
	selectedWordsAtom,
	showEndTimeAsDurationAtom,
	ToolMode,
	toolModeAtom,
} from "$/states/main.ts";
import {
	formatVoiceLabel,
	getLineVoice,
	getVoiceColor,
	type LyricLine,
	newLyricLine,
	newLyricWord,
} from "$/types/ttml.ts";
import { msToTimestamp } from "$/utils/timestamp.ts";
import {
	copySectionTimings,
	findPreviousMatchingSection,
	shiftSectionToTime,
} from "../utils/genius-sections.ts";
import {
	type ApplyLineTimingsResult,
	applyLineTimingSnapshots,
} from "../utils/line-timing.ts";
import { getSynchronizableUnits } from "../utils/lyric-states.ts";
import {
	cleanSectionHeader,
	duplicateLinesWithSections,
	repairSectionIntegrity,
} from "../utils/section-system.ts";
import { getWordConnections } from "../utils/word-connections.ts";
import styles from "./index.module.css";
import {
	globalEnableInsertAtom,
	lastLineDragEndAtom,
	lineDragAtom,
	timingCopyPlacementAtom,
} from "./lyric-line-view-states.ts";
import LyricWordView, { splitTrailingSpace } from "./lyric-word-view.tsx";
import { RomanWordView } from "./roman-word-view.tsx";
import { SectionActions } from "./SectionActions.tsx";
import { shouldAutoCenterSelection } from "./selection-scroll";

const parseRubyShortcut = (value: string) => {
	if (value.endsWith("|")) {
		return {
			word: value.slice(0, -1),
			enableRuby: true,
		};
	}
	return {
		word: value,
		enableRuby: false,
	};
};

// 定义一个派生 Atom，用于计算每一行的显示行号
// 性能优化：只有当行数或 isBG 状态发生变化时，才重新计算行号
// 这样在打轴（仅修改时间戳）时，不会触发全量行号重新计算
const isBGSequenceAtom = selectAtom(
	lyricLinesAtom,
	(state) => state.lyricLines.map((line) => line.isBG),
	(prev, next) => {
		if (prev.length !== next.length) return false;
		for (let i = 0; i < prev.length; i++) {
			if (prev[i] !== next[i]) return false;
		}
		return true;
	},
);

const lineDisplayNumbersAtom = atom((get) => {
	const { lyricLines } = get(lyricLinesAtom);
	get(isBGSequenceAtom); // 订阅稳定序列的变化
	const displayNumbers: number[] = [];
	let currentNumber = 0;

	for (const [index, line] of lyricLines.entries()) {
		if (!index || !line.isBG) {
			currentNumber++;
		}
		displayNumbers.push(currentNumber);
	}

	return displayNumbers;
});

const LyricLineScroller = ({
	lineAtom,
	wordsContainer,
	editingRomanWordIndex,
}: {
	lineAtom: Atom<LyricLine>;
	wordsContainer: HTMLDivElement | null;
	editingRomanWordIndex: number | null;
}) => {
	const wrapLyricLines = useAtomValue(wrapLyricLinesAtom);
	const toolMode = useAtomValue(toolModeAtom);
	const scrollToIndexAtom = useMemo(
		() =>
			atom((get) => {
				if (wrapLyricLines || !shouldAutoCenterSelection(toolMode))
					return Number.NaN;
				const line = get(lineAtom);
				const selectedWords = get(selectedWordsAtom);
				if (selectedWords.size === 0) return Number.NaN;
				let scrollToIndex = Number.NaN;
				let i = 0;
				for (const word of line.words) {
					if (selectedWords.has(word.id)) {
						scrollToIndex = i;
						break;
					}
					i++;
				}
				return scrollToIndex;
			}),
		[lineAtom, toolMode, wrapLyricLines],
	);
	const scrollToIndex = useAtomValue(scrollToIndexAtom);

	useEffect(() => {
		if (wrapLyricLines) return;
		const targetIndex = !Number.isNaN(scrollToIndex)
			? scrollToIndex
			: editingRomanWordIndex;
		if (targetIndex === null || Number.isNaN(targetIndex)) return;
		// console.log({ scrollToIndex, wordsContainer });
		if (!wordsContainer) return;
		const wordEl = wordsContainer.children[targetIndex] as HTMLElement;
		// console.log({ wordEl, wordsContainer });
		if (!wordEl) return;
		wordsContainer.scrollTo({
			left: wordEl.offsetLeft - wordsContainer.clientWidth / 2,
			behavior: "auto",
		});
	}, [scrollToIndex, editingRomanWordIndex, wordsContainer, wrapLyricLines]);

	useEffect(() => {
		if (wrapLyricLines || !wordsContainer) return;
		const handleFocusIn = (evt: FocusEvent) => {
			const target = evt.target as HTMLElement | null;
			if (!target) return;
			const wordGroup = target.closest<HTMLElement>("[data-word-index]");
			if (!wordGroup || !wordsContainer.contains(wordGroup)) return;
			wordsContainer.scrollTo({
				left: wordGroup.offsetLeft - wordsContainer.clientWidth / 2,
				behavior: "auto",
			});
		};
		wordsContainer.addEventListener("focusin", handleFocusIn);
		return () => {
			wordsContainer.removeEventListener("focusin", handleFocusIn);
		};
	}, [wordsContainer, wrapLyricLines]);

	return null;
};

const SubLineEdit = memo(
	({
		lineAtom,
		lineIndex,
		type,
	}: {
		lineAtom: Atom<LyricLine>;
		lineIndex: number;
		type: "translatedLyric" | "romanLyric";
	}) => {
		const editLyricLines = useSetImmerAtom(lyricLinesAtom);
		const line = useAtomValue(lineAtom);
		const wrapLyricLines = useAtomValue(wrapLyricLinesAtom);
		const [editing, setEditing] = useState(false);
		const [inputValue, setInputValue] = useState("");
		const { t } = useTranslation();

		const onEnter = useCallback(
			(evt: SyntheticEvent<HTMLInputElement>) => {
				setEditing(false);
				const newValue = evt.currentTarget.value;
				if (newValue !== line[type]) {
					editLyricLines((state) => {
						state.lyricLines[lineIndex][type] = newValue;
					});
				}
			},
			[editLyricLines, line, lineIndex, type],
		);

		useEffect(() => {
			if (editing) {
				setInputValue(line[type] || "");
			}
		}, [editing, line, type]);

		const inputWidth = useMemo(() => {
			if (inputValue.length > 0) {
				return `${Math.min(Math.max(inputValue.length, 2), 60)}ch`;
			}
			return "12ch";
		}, [inputValue]);

		const label = useMemo(
			() =>
				type === "translatedLyric"
					? t("lyricLineView.translatedLabel", "Translation: ")
					: t("lyricLineView.romanLabel", "Romanization: "),
			[type, t],
		);

		return (
			<Flex
				align="baseline"
				style={{
					color:
						type === "translatedLyric"
							? "var(--translation-color, inherit)"
							: "var(--romanization-color, inherit)",
					flexWrap: wrapLyricLines ? "wrap" : "nowrap",
					maxWidth: "100%",
				}}
			>
				<Text size="2" style={{ color: "inherit", flexShrink: 0 }}>
					{label}
				</Text>
				{editing ? (
					<TextField.Root
						autoFocus
						size="1"
						data-lyric-line-interactive=""
						value={inputValue}
						style={{ width: inputWidth, maxWidth: "100%" }}
						onChange={(evt) => setInputValue(evt.currentTarget.value)}
						onBlur={onEnter}
						onKeyDown={(evt) => {
							if (evt.key === "Enter") onEnter(evt);
						}}
					/>
				) : (
					<Button
						size="2"
						variant="ghost"
						data-lyric-line-interactive=""
						className={wrapLyricLines ? styles.subLineWrap : undefined}
						style={{
							color: "inherit",
							...(wrapLyricLines
								? {
										whiteSpace: "normal",
										wordBreak: "break-word",
										textAlign: "start",
										height: "auto",
										minHeight: "28px",
									}
								: {}),
						}}
						onClick={(evt) => {
							evt.stopPropagation();
							setEditing(true);
						}}
					>
						{line[type] || (
							<Text color="gray">{t("lyricLineView.empty", "None")}</Text>
						)}
					</Button>
				)}
			</Flex>
		);
	},
);

const InsertLineButton = ({
	lineIndex,
	selectedLinesCountAtom,
	disableInsert,
}: {
	lineIndex: number;
	selectedLinesCountAtom: Atom<number>;
	disableInsert: () => void;
}) => {
	const { t } = useTranslation();
	const store = useStore();
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const selectedLinesCount = useAtomValue(selectedLinesCountAtom);

	return (
		<Button
			mx="1"
			my="1"
			variant="soft"
			size="1"
			style={{
				width: "calc(100% - var(--space-4))",
			}}
			onClick={(evt) => {
				editLyricLines((state) => {
					const selectedLines = store.get(selectedLinesAtom);
					if (selectedLines.size > 0) {
						const newLines = duplicateLinesWithSections(
							state,
							selectedLines,
							lineIndex,
						);
						state.lyricLines.splice(lineIndex, 0, ...newLines);
						repairSectionIntegrity(state);
					} else {
						const cur = state.lyricLines[lineIndex];
						const newLine = newLyricLine();
						if (cur?.sectionId) newLine.sectionId = cur.sectionId;
						if (cur?.geniusHeader) newLine.geniusHeader = cur.geniusHeader;
						state.lyricLines.splice(lineIndex, 0, newLine);
						repairSectionIntegrity(state);
					}
				});
				if (!evt.shiftKey) {
					disableInsert();
				}
			}}
		>
			{selectedLinesCount > 0
				? t("lyricLineView.duplicateLinesHere", {
						count: selectedLinesCount,
						defaultValue: "Duplicate {count} selected line(s) here",
					})
				: t("lyricLineView.insertLine", "Insert line here")}
		</Button>
	);
};

export const LyricLineView: FC<{
	lineAtom: Atom<LyricLine>;
	lineIndex: number;
}> = memo(({ lineAtom, lineIndex }) => {
	const { t } = useTranslation();
	const line = useAtomValue(lineAtom);
	const setSelectedLines = useSetImmerAtom(selectedLinesAtom);
	const lineSelectedAtom = useMemo(() => {
		const a = atom((get) => get(selectedLinesAtom).has(line.id));
		if (import.meta.env.DEV) {
			a.debugLabel = `lineSelectedAtom-${line.id}`;
		}
		return a;
	}, [line.id]);
	const wordsAtom = useMemo(
		() => splitAtom(atom((get) => get(lineAtom).words)),
		[lineAtom],
	);
	const words = useAtomValue(wordsAtom);
	const lineSelected = useAtomValue(lineSelectedAtom);
	const setSelectedWords = useSetImmerAtom(selectedWordsAtom);
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const visualizeTimestampUpdate = useAtomValue(visualizeTimestampUpdateAtom);
	const showTimestamps = useAtomValue(showTimestampsAtom);
	const showEndTimeAsDuration = useAtomValue(showEndTimeAsDurationAtom);
	const toolMode = useAtomValue(toolModeAtom);
	const syncLevelMode = useAtomValue(syncLevelModeAtom);
	const store = useStore();
	const geniusCategorizationEnabled = useAtomValue(
		geniusCategorizationEnabledAtom,
	);
	const sectionAtom = useMemo(
		() =>
			atom((get) =>
				get(lyricLinesAtom).sections?.find(
					(section) => section.id === line.sectionId,
				),
			),
		[line.sectionId],
	);
	const activeSection = useAtomValue(sectionAtom);
	const sectionActionsEnabled = geniusCategorizationEnabled && !!activeSection;

	const activeGeniusHeader = geniusCategorizationEnabled
		? (activeSection?.label ?? line.geniusHeader)
		: undefined;

	const cleanHeader = useMemo(
		() => cleanSectionHeader(activeGeniusHeader),
		[activeGeniusHeader],
	);

	const collapsedSections = useAtomValue(collapsedSectionIdsAtom);
	const isSectionCollapsed = Boolean(
		line.sectionId && collapsedSections.has(line.sectionId),
	);

	const sectionLineCount = useMemo(() => {
		if (!line.sectionId) return 0;
		const lyricLines = store.get(lyricLinesAtom).lyricLines;
		return lyricLines.filter((l) => l.sectionId === line.sectionId).length || 1;
	}, [store, line.sectionId, collapsedSections]);

	const customHeaderColor = useAtomValue(advGeniusHeaderColorAtom);

	const headerType = useMemo(() => {
		if (activeSection) return activeSection.category;
		if (!cleanHeader) return "accent";
		const match = cleanHeader.match(
			/^(Chorus|Verse|Bridge|Intro|Outro|Pre-Chorus|Hook|Strofa|Refren|Skit|Interlude|Instrumental|Pre-Refren|Partea|Slofa|Section|Part|S\d+|V\d+|C\d+|Strophe|Refrain|Pont|Couplet|Refrain|Break)/i,
		);
		return match ? match[1].toLowerCase() : "accent";
	}, [cleanHeader, activeSection]);

	const sectionBoundsAtom = useMemo(
		() =>
			atom((get) => {
				const { lyricLines, sections } = get(lyricLinesAtom);
				const cur = lyricLines[lineIndex];
				if (!cur) return { isStart: false, isEnd: false };

				const sec = sections?.find((s) => s.id === cur.sectionId);
				const header = sec?.label ?? cur.geniusHeader;
				if (!header) return { isStart: false, isEnd: false };

				const prev = lineIndex > 0 ? lyricLines[lineIndex - 1] : undefined;
				const isStart =
					lineIndex === 0 ||
					(cur.sectionId
						? prev?.sectionId !== cur.sectionId
						: prev?.geniusHeader !== header);

				const next =
					lineIndex < lyricLines.length - 1
						? lyricLines[lineIndex + 1]
						: undefined;
				const isEnd =
					lineIndex === lyricLines.length - 1 ||
					(cur.sectionId
						? next?.sectionId !== cur.sectionId
						: next?.geniusHeader !== header);

				return { isStart, isEnd };
			}),
		[lineIndex],
	);
	const { isStart: isSectionStart, isEnd: rawSectionEnd } =
		useAtomValue(sectionBoundsAtom);
	const isSectionEnd = rawSectionEnd || isSectionCollapsed;

	const categoryColor = useMemo(() => {
		if (!headerType) return "accent";
		if (
			headerType.includes("chorus") ||
			headerType.includes("refren") ||
			headerType.includes("refrain")
		)
			return "pink";
		if (
			headerType.includes("verse") ||
			headerType.includes("strofa") ||
			headerType.includes("couplet")
		)
			return "blue";
		if (headerType.includes("bridge") || headerType.includes("break"))
			return "orange";
		if (headerType.includes("hook") || headerType.includes("post-chorus"))
			return "purple";
		if (headerType.includes("solo") || headerType.includes("instrumental"))
			return "green";
		if (
			headerType.includes("intro") ||
			headerType.includes("outro") ||
			headerType.includes("skit") ||
			headerType.includes("interlude")
		)
			return "gray";
		return "accent";
	}, [headerType]);

	const wordsContainerRef = useRef<HTMLDivElement>(null);
	const blockDragRef = useRef(false);

	const isLastLineAtom = useMemo(
		() =>
			atom((get) => get(lyricLinesAtom).lyricLines.length - 1 === lineIndex),
		[lineIndex],
	);
	const isLastLine = useAtomValue(isLastLineAtom);

	const selectedLinesCountAtom = useMemo(
		() => atom((get) => get(selectedLinesAtom).size),
		[],
	);

	// 创建一个仅订阅当前行显示行号的 atom，优化性能
	const displayNumberAtom = useMemo(
		() => atom((get) => get(lineDisplayNumbersAtom)[lineIndex]),
		[lineIndex],
	);
	const displayNumber = useAtomValue(displayNumberAtom);
	const selectedLinesCount = useAtomValue(selectedLinesCountAtom);

	const hasError = useMemo(() => {
		if (line.startTime > line.endTime) {
			return true;
		}
		for (const word of line.words) {
			if (word.startTime > word.endTime) {
				return true;
			}
		}
		return false;
	}, [line.startTime, line.endTime, line.words]);

	const showWordRomanizationInput = useAtomValue(showWordRomanizationInputAtom);
	const showTranslation = useAtomValue(showLineTranslationAtom);
	const showRomanization = useAtomValue(showLineRomanizationAtom);
	const wordTexts = useMemo(
		() => line.words.map((lineWord) => lineWord.word),
		[line.words],
	);
	const editingRomanWordIndexAtom = useMemo(
		() => atom<number | null>(null),
		[],
	);
	const editingRomanWordIndex = useAtomValue(editingRomanWordIndexAtom);
	const compactBGInSync = useAtomValue(compactBGInSyncAtom);
	const legacySpaceLabels = useAtomValue(legacySpaceLabelsAtom);
	const wrapLyricLines = useAtomValue(wrapLyricLinesAtom);

	const startTimeRef = useRef<HTMLDivElement>(null);
	const endTimeRef = useRef<HTMLButtonElement>(null);
	const [globalEnableInsert, setGlobalEnableInsert] = useAtom(
		globalEnableInsertAtom,
	);
	const [timingCopyPlacement, setTimingCopyPlacement] = useAtom(
		timingCopyPlacementAtom,
	);
	const enableInsert = globalEnableInsert;

	const disableInsert = useCallback(() => {
		if (globalEnableInsert) setGlobalEnableInsert(false);
	}, [globalEnableInsert, setGlobalEnableInsert]);

	const [endTimeLinked, setEndTimeLinked] = useState(() =>
		Boolean(line.endTimeLink),
	);
	const originalEndTimeRef = useRef<number | null>(null);
	const originalNextStartTimeRef = useRef<number | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: 用于呈现时间戳更新效果
	useEffect(() => {
		if (!visualizeTimestampUpdate) return;
		const animation = startTimeRef.current?.animate(
			[
				{
					backgroundColor: "var(--accent-a8)",
				},
				{
					backgroundColor: "var(--accent-a4)",
				},
			],
			{
				duration: 500,
			},
		);

		return () => {
			animation?.cancel();
		};
	}, [line.startTime, visualizeTimestampUpdate]);

	useLayoutEffect(() => {
		if (toolMode !== ToolMode.Edit) {
			disableInsert();
		}
	}, [toolMode, disableInsert]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: 用于呈现时间戳更新效果
	useEffect(() => {
		if (!visualizeTimestampUpdate) return;
		const animation = endTimeRef.current?.animate(
			[
				{
					backgroundColor: "var(--accent-a8)",
				},
				{
					backgroundColor: "var(--accent-a4)",
				},
			],
			{
				duration: 500,
			},
		);

		return () => {
			animation?.cancel();
		};
	}, [line.endTime, visualizeTimestampUpdate]);

	useEffect(() => {
		if (!endTimeLinked) return;
		const nextLine = store.get(lyricLinesAtom).lyricLines[lineIndex + 1];
		if (!nextLine) {
			editLyricLines((state) => {
				const targetLine = state.lyricLines[lineIndex];
				if (!targetLine) return;
				if (targetLine.endTimeLink) delete targetLine.endTimeLink;
			});
			return;
		}
		if (nextLine.startTime === line.endTime) return;
		editLyricLines((state) => {
			const targetLine = state.lyricLines[lineIndex + 1];
			if (!targetLine) return;
			targetLine.startTime = line.endTime;
		});
	}, [endTimeLinked, editLyricLines, line.endTime, lineIndex, store]);
	useEffect(() => {
		const linked = Boolean(line.endTimeLink);
		if (linked === endTimeLinked) return;
		setEndTimeLinked(linked);
	}, [endTimeLinked, line.endTimeLink]);

	const onToggleEndTimeLink = useCallback(
		(evt: React.MouseEvent<HTMLButtonElement>) => {
			evt.preventDefault();
			evt.stopPropagation();
			if (endTimeLinked) {
				setEndTimeLinked(false);
				originalEndTimeRef.current = null;
				originalNextStartTimeRef.current = null;
				editLyricLines((state) => {
					const targetLine = state.lyricLines[lineIndex];
					if (!targetLine) return;
					const linkInfo = targetLine.endTimeLink;
					if (!linkInfo) return;
					if (
						typeof linkInfo.originalEndTime !== "number" ||
						!Number.isFinite(linkInfo.originalEndTime)
					) {
						delete targetLine.endTimeLink;
						return;
					}
					targetLine.endTime = linkInfo.originalEndTime;
					const nextTarget = state.lyricLines[lineIndex + 1];
					if (
						nextTarget &&
						Number.isFinite(linkInfo.originalNextStartTime ?? Number.NaN)
					) {
						nextTarget.startTime =
							linkInfo.originalNextStartTime ?? nextTarget.startTime;
					}
					delete targetLine.endTimeLink;
				});
				return;
			}
			const nextLine = store.get(lyricLinesAtom).lyricLines[lineIndex + 1];
			if (!nextLine) return;
			originalEndTimeRef.current = line.endTime;
			originalNextStartTimeRef.current = nextLine?.startTime ?? null;
			editLyricLines((state) => {
				const targetLine = state.lyricLines[lineIndex];
				if (!targetLine) return;
				const nextTarget = state.lyricLines[lineIndex + 1];
				if (!nextTarget) return;
				const originalEndTime =
					targetLine.endTimeLink?.originalEndTime ?? targetLine.endTime;
				const originalNextStartTime =
					targetLine.endTimeLink?.originalNextStartTime ??
					nextTarget.startTime ??
					null;
				const desiredEndTime = nextTarget.startTime ?? targetLine.endTime;
				targetLine.endTimeLink = {
					originalEndTime,
					originalNextStartTime,
				};
				targetLine.endTime = desiredEndTime;
				nextTarget.startTime = desiredEndTime;
			});
			setEndTimeLinked(true);
		},
		[editLyricLines, endTimeLinked, line.endTime, lineIndex, store],
	);

	return (
		<Box style={{ width: "100%" }}>
			{lineSelected && (
				<LyricLineScroller
					lineAtom={lineAtom}
					wordsContainer={wordsContainerRef.current}
					editingRomanWordIndex={editingRomanWordIndex}
				/>
			)}
			{timingCopyPlacement && (
				<Button
					mx="1"
					my="1"
					variant="soft"
					size="1"
					style={{ width: "calc(100% - var(--space-4))" }}
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						let result: ApplyLineTimingsResult | undefined;
						editLyricLines((state) => {
							result = applyLineTimingSnapshots(
								state.lyricLines,
								lineIndex,
								timingCopyPlacement.snapshots,
							);
						});
						setTimingCopyPlacement(null);

						if (!result || result.appliedLineCount === 0) return;
						toast.success(
							t("lyricLineView.timingsApplied", {
								count: result.appliedLineCount,
								defaultValue: "Applied timing to {count} line(s).",
							}),
						);
						const warnings: string[] = [];
						if (result.partial) {
							warnings.push(
								t("lyricLineView.partialTimingCopy", {
									applied: result.appliedLineCount,
									total: timingCopyPlacement.snapshots.length,
									defaultValue:
										"Only {applied} of {total} source timings fit before the end of the lyrics.",
								}),
							);
						}
						if (result.wordCountMismatchCount > 0) {
							warnings.push(
								t("lyricLineView.wordTimingMismatch", {
									count: result.wordCountMismatchCount,
									defaultValue:
										"{count} line(s) had different word counts; copied matching word positions only.",
								}),
							);
						}
						if (warnings.length > 0) toast.info(warnings.join(" "));
					}}
				>
					{Math.min(
						timingCopyPlacement.snapshots.length,
						store.get(lyricLinesAtom).lyricLines.length - lineIndex,
					) < timingCopyPlacement.snapshots.length
						? t("lyricLineView.applyPartialTimingsHere", {
								applied: Math.min(
									timingCopyPlacement.snapshots.length,
									store.get(lyricLinesAtom).lyricLines.length - lineIndex,
								),
								total: timingCopyPlacement.snapshots.length,
								defaultValue:
									"Apply {applied} of {total} timings starting here",
							})
						: t("lyricLineView.applyTimingsHere", {
								count: timingCopyPlacement.snapshots.length,
								defaultValue: "Apply {count} timing(s) starting here",
							})}
				</Button>
			)}
			{enableInsert && (
				<InsertLineButton
					lineIndex={lineIndex}
					selectedLinesCountAtom={selectedLinesCountAtom}
					disableInsert={disableInsert}
				/>
			)}
			<Flex
				mx="1"
				my={
					activeGeniusHeader
						? "0"
						: line.isBG && toolMode === ToolMode.Sync && compactBGInSync
							? "0"
							: "1"
				}
				direction="row"
				className={classNames(
					styles.lyricLine,
					activeGeniusHeader && styles.inSection,
					isSectionStart && styles.sectionStart,
					isSectionEnd && styles.sectionEnd,
					isSectionCollapsed && styles.sectionCollapsed,
					line.isBG &&
						toolMode === ToolMode.Sync &&
						compactBGInSync &&
						styles.bg,
					lineSelected && styles.selected,
					toolMode === ToolMode.Sync && styles.sync,
					toolMode === ToolMode.Edit && styles.edit,
					line.ignoreSync && styles.ignoreSync,
					hasError && toolMode === ToolMode.Edit && styles.error,
				)}
				align="center"
				gapX="4"
				data-lyric-line-draggable={toolMode === ToolMode.Edit ? "" : undefined}
				data-lyric-line-id={line.id}
				data-lyric-line-index={lineIndex}
				style={{
					...(isSectionStart
						? { marginTop: "18px" }
						: activeGeniusHeader
							? { marginTop: "0px" }
							: {}),
					...(isSectionEnd
						? { marginBottom: "14px" }
						: activeGeniusHeader
							? { marginBottom: "0px" }
							: {}),
					...(isSectionCollapsed
						? {
								minHeight: "auto",
								paddingTop: "6px",
								paddingBottom: "6px",
							}
						: {}),
					...(activeGeniusHeader
						? {
								borderTopLeftRadius:
									isSectionStart || isSectionCollapsed
										? "var(--global-radius, var(--radius-4))"
										: 0,
								borderTopRightRadius:
									isSectionStart || isSectionCollapsed
										? "var(--global-radius, var(--radius-4))"
										: 0,
								borderBottomLeftRadius: isSectionEnd
									? "var(--global-radius, var(--radius-4))"
									: 0,
								borderBottomRightRadius: isSectionEnd
									? "var(--global-radius, var(--radius-4))"
									: 0,
								borderLeft: `4px solid ${customHeaderColor || `var(--${categoryColor}-9)`}`,
								...(!isSectionEnd && !lineSelected
									? {
											borderBottom: "1px solid var(--gray-a3)",
										}
									: {}),
							}
						: {}),
				}}
				onPointerDown={(evt) => {
					if (
						(evt.target as HTMLElement | null)?.closest(
							"[data-lyric-word-interactive], [data-lyric-line-interactive]",
						)
					)
						return;
					blockDragRef.current =
						(evt.target as HTMLElement | null)?.tagName === "INPUT";
					if (
						toolMode !== ToolMode.Edit ||
						blockDragRef.current ||
						evt.button !== 0
					)
						return;
					evt.currentTarget.setPointerCapture(evt.pointerId);
					store.set(lineDragAtom, {
						id: line.id,
						pointerId: evt.pointerId,
						startX: evt.clientX,
						startY: evt.clientY,
						isDragging: false,
					});
				}}
				onPointerUp={() => {
					blockDragRef.current = false;
				}}
				onClick={(evt) => {
					if (
						(evt.target as HTMLElement | null)?.closest(
							"[data-lyric-word-interactive], [data-lyric-line-interactive]",
						)
					)
						return;
					evt.stopPropagation();
					evt.preventDefault();

					const now = Date.now();
					if (now - store.get(lastLineDragEndAtom) < 250) return;
					if (evt.ctrlKey) {
						setSelectedLines((v) => {
							if (v.has(line.id)) {
								v.delete(line.id);
							} else {
								v.add(line.id);
							}
						});
					} else if (evt.shiftKey) {
						setSelectedLines((v) => {
							if (v.size > 0) {
								let minBoundry = Number.NaN;
								let maxBoundry = Number.NaN;
								const lyricLines = store.get(lyricLinesAtom).lyricLines;
								lyricLines.forEach((line, i) => {
									if (v.has(line.id)) {
										if (Number.isNaN(minBoundry)) minBoundry = i;
										if (Number.isNaN(maxBoundry)) maxBoundry = i;

										minBoundry = Math.min(minBoundry, i, lineIndex);
										maxBoundry = Math.max(maxBoundry, i, lineIndex);
									}
								});
								for (let i = minBoundry; i <= maxBoundry; i++) {
									v.add(lyricLines[i].id);
								}
							} else {
								v.add(line.id);
							}
						});
					} else {
						if (
							line.sectionId &&
							store.get(collapsedSectionIdsAtom).has(line.sectionId)
						) {
							setSelectedLines((state) => {
								state.clear();
								for (const candidate of store.get(lyricLinesAtom).lyricLines) {
									if (candidate.sectionId === line.sectionId)
										state.add(candidate.id);
								}
							});
							return;
						}
						setSelectedLines((state) => {
							if (!state.has(line.id) || state.size !== 1) {
								state.clear();
								state.add(line.id);
							}
						});
						setSelectedWords((state) => {
							state.clear();
							if (toolMode === ToolMode.Sync && syncLevelMode === "line") {
								const units = getSynchronizableUnits(line);
								for (const unit of units) {
									state.add(unit.id);
								}
							}
						});
					}
				}}
				asChild
			>
				<div>
					<Flex
						direction="column"
						align="center"
						justify="center"
						ml={isSectionCollapsed ? "1" : "3"}
						style={{ minWidth: isSectionCollapsed ? "0px" : "40px" }}
					>
						{!isSectionCollapsed && (
							<>
								<Text
									className={classNames(
										styles.lineNumber,
										line.ignoreSync && styles.ignored,
									)}
									align="center"
									color="gray"
								>
									{displayNumber > 0 && displayNumber}
								</Text>
								{line.isBG && (
									<VideoBackgroundEffectFilled color="var(--accent-9)" />
								)}
								{(() => {
									const lineVoice = getLineVoice(line);
									if (!line.isDuet && lineVoice === "v1") return null;
									const voiceColor = getVoiceColor(lineVoice);
									return (
										<span
											title={formatVoiceLabel(lineVoice)}
											style={{
												display: "inline-flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: "9px",
												fontWeight: 700,
												padding: "1px 3px",
												borderRadius: "3px",
												backgroundColor: `${voiceColor}20`,
												color: voiceColor,
												border: `1px solid ${voiceColor}80`,
												lineHeight: 1,
												cursor: "pointer",
												marginTop: "2px",
												userSelect: "none",
											}}
											onClick={(e) => {
												e.stopPropagation();
												editLyricLines((state) => {
													const curLine = state.lyricLines[lineIndex];
													if (!curLine) return;
													const voiceSet = new Set<string>(["v1", "v2"]);
													for (const l of state.lyricLines) {
														voiceSet.add(getLineVoice(l));
													}
													const sorted = Array.from(voiceSet).sort((a, b) => {
														const numA = parseInt(
															a.replace(/\D/g, "") || "1",
															10,
														);
														const numB = parseInt(
															b.replace(/\D/g, "") || "1",
															10,
														);
														return numA - numB;
													});
													const idx = sorted.indexOf(lineVoice);
													const nextVoice = sorted[(idx + 1) % sorted.length];
													curLine.agent = nextVoice;
													curLine.isDuet = nextVoice !== "v1";
												});
											}}
										>
											{lineVoice}
										</span>
									);
								})()}
							</>
						)}
					</Flex>
					<div
						className={classNames(
							styles.lyricLineContainer,
							toolMode === ToolMode.Edit && styles.edit,
							toolMode === ToolMode.Sync && styles.sync,
						)}
					>
						{isSectionStart && (
							<Flex gap="2" mb={isSectionCollapsed ? "0" : "1"} align="center">
								<Text
									size="1"
									weight="bold"
									color={customHeaderColor ? undefined : (categoryColor as any)}
									style={{
										opacity: 0.8,
										textTransform: "uppercase",
										color: customHeaderColor || undefined,
									}}
								>
									{cleanHeader}
								</Text>
								{sectionActionsEnabled && activeSection && (
									<SectionActions section={activeSection} />
								)}
								{isSectionCollapsed && (
									<Badge size="1" color="gray" variant="soft">
										{t(
											"sectionActions.linesCount",
											"{count, plural, one {# line} other {# lines}}",
											{
												count: sectionLineCount,
											},
										)}
									</Badge>
								)}
								{!isSectionCollapsed && toolMode === ToolMode.Sync && (
									<Button
										size="1"
										variant="ghost"
										onClick={(e) => {
											e.stopPropagation();
											const currentTime = store.get(currentTimeAtom);
											editLyricLines((state) => {
												shiftSectionToTime(
													state.lyricLines,
													lineIndex,
													currentTime,
												);
											});
										}}
									>
										{t(
											"experimentalFeatures.geniusCategorization.snapToPlayhead",
											"Snap to Playhead",
										)}
									</Button>
								)}
								{!isSectionCollapsed && toolMode === ToolMode.Sync && (
									<Button
										size="1"
										variant="ghost"
										onClick={(e) => {
											e.stopPropagation();
											const lyricLines = store.get(lyricLinesAtom).lyricLines;
											const previousSection = findPreviousMatchingSection(
												lyricLines,
												lineIndex,
												store.get(lyricLinesAtom).sections,
											);

											if (previousSection) {
												let copyResult: ReturnType<typeof copySectionTimings>;
												editLyricLines((state) => {
													copyResult = copySectionTimings(
														state.lyricLines,
														lineIndex,
														previousSection,
													);
												});
												toast.success(t("common.success", "Success"));
												if (copyResult && !copyResult.lengthsMatch) {
													toast.info(
														"Section lengths differ; copied matching lines only.",
													);
												}
											} else {
												toast.info(
													t(
														"experimentalFeatures.geniusCategorization.noPreviousFound",
														"No previous identical header found with timing.",
													),
												);
											}
										}}
									>
										{t(
											"experimentalFeatures.geniusCategorization.copyPrevious",
											"Copy Previous Timing",
										)}
									</Button>
								)}
							</Flex>
						)}
						{!isSectionCollapsed && (
							<>
								<div
									className={classNames(
										styles.lyricWordsContainer,
										toolMode === ToolMode.Edit && styles.edit,
										toolMode === ToolMode.Sync && styles.sync,
										!showTimestamps && styles.hideTimestamps,
										wrapLyricLines && styles.wrapped,
									)}
									ref={wordsContainerRef}
									style={{
										borderRadius: isSectionStart ? "var(--radius-2)" : "0",
									}}
								>
									{words.map((wordAtom, wi) => {
										const word = store.get(wordAtom);
										const connections = getWordConnections(wordTexts, wi);
										return (
											<Fragment key={`word-${word.id}`}>
												{enableInsert && (
													<IconButton
														size="1"
														variant="soft"
														onClick={(evt) => {
															evt.preventDefault();
															evt.stopPropagation();
															editLyricLines((state) => {
																state.lyricLines[lineIndex].words.splice(
																	wi,
																	0,
																	newLyricWord(),
																);
															});
														}}
													>
														<AddFilled />
													</IconButton>
												)}
												<Flex
													direction="column"
													align="stretch"
													gap={showWordRomanizationInput ? "0" : "3"}
													data-word-index={wi}
													className={classNames(
														styles.wordGroup,
														!legacySpaceLabels &&
															word.word.length > 0 &&
															word.word.trim().length === 0 &&
															styles.spaceGroup,
														showWordRomanizationInput &&
															styles.withRomanization,
														toolMode === ToolMode.Edit &&
															!enableInsert &&
															connections.previous &&
															styles.connectedPrevious,
														toolMode === ToolMode.Edit &&
															!enableInsert &&
															connections.next &&
															styles.connectedNext,
													)}
												>
													<LyricWordView
														wordAtom={wordAtom}
														wordIndex={wi}
														line={line}
														lineIndex={lineIndex}
														isHeaderLine={false}
													/>
													{toolMode === ToolMode.Edit &&
														showWordRomanizationInput && (
															<RomanWordView
																wordAtom={wordAtom}
																wordIndex={wi}
																editingIndexAtom={editingRomanWordIndexAtom}
															/>
														)}
												</Flex>
											</Fragment>
										);
									})}
									{enableInsert && (
										<IconButton
											size="1"
											variant="soft"
											onClick={(evt) => {
												evt.preventDefault();
												evt.stopPropagation();
												editLyricLines((state) => {
													state.lyricLines[lineIndex].words.push(
														newLyricWord(),
													);
												});
											}}
										>
											<AddFilled />
										</IconButton>
									)}
									{toolMode === ToolMode.Edit && (
										<TextField.Root
											placeholder={t(
												"lyricLineView.insertWord",
												"Insert word…",
											)}
											className={classNames(
												styles.insertWordField,
												words.length === 0 && styles.empty,
											)}
											style={{
												alignSelf: "center",
											}}
											onKeyDown={(evt) => {
												if (evt.key === "Enter") {
													evt.preventDefault();
													evt.stopPropagation();
													const { word, enableRuby } = parseRubyShortcut(
														evt.currentTarget.value,
													);
													const { baseWord, spaceWord } =
														splitTrailingSpace(word);
													editLyricLines((state) => {
														const newWord = newLyricWord();
														state.lyricLines[lineIndex].words.push({
															...newWord,
															word: baseWord,
															ruby: enableRuby
																? [
																		{
																			word: "",
																			startTime: newWord.startTime,
																			endTime: newWord.endTime,
																		},
																	]
																: undefined,
														});
														if (spaceWord) {
															const spaceNewWord = newLyricWord();
															state.lyricLines[lineIndex].words.push({
																...spaceNewWord,
																word: spaceWord,
															});
														}
													});
													evt.currentTarget.value = "";
												}
											}}
										/>
									)}
								</div>
								{toolMode === ToolMode.Edit && (
									<>
										{showTranslation && (
											<SubLineEdit
												lineAtom={lineAtom}
												lineIndex={lineIndex}
												type="translatedLyric"
											/>
										)}
										{showRomanization && (
											<SubLineEdit
												lineAtom={lineAtom}
												lineIndex={lineIndex}
												type="romanLyric"
											/>
										)}
									</>
								)}
							</>
						)}
					</div>
					{!isSectionCollapsed &&
						toolMode === ToolMode.Sync &&
						showTimestamps && (
							<Flex pr="3" gap="1" direction="column" align="stretch">
								<div className={styles.startTime} ref={startTimeRef}>
									{msToTimestamp(line.startTime)}
								</div>
								<button
									type="button"
									className={classNames(styles.endTime, styles.endTimeButton)}
									ref={endTimeRef}
									onClick={onToggleEndTimeLink}
								>
									<span
										style={{
											display: "inline-flex",
											alignItems: "center",
										}}
									>
										{endTimeLinked ? (
											<LinkMultiple20Regular />
										) : showEndTimeAsDuration ? (
											`+${line.endTime - line.startTime}ms`
										) : (
											msToTimestamp(line.endTime)
										)}
									</span>
								</button>
							</Flex>
						)}
				</div>
			</Flex>
			{globalEnableInsert && isLastLine && (
				<Button
					mx="1"
					my="1"
					variant="soft"
					size="1"
					style={{
						width: "calc(100% - var(--space-4))",
					}}
					onClick={(evt) => {
						editLyricLines((state) => {
							const selectedLines = store.get(selectedLinesAtom);
							if (selectedLines.size > 0) {
								const newLines = duplicateLinesWithSections(
									state,
									selectedLines,
									lineIndex + 1,
								);
								state.lyricLines.splice(lineIndex + 1, 0, ...newLines);
								repairSectionIntegrity(state);
							} else {
								const cur = state.lyricLines[lineIndex];
								const newLine = newLyricLine();
								if (cur?.sectionId) newLine.sectionId = cur.sectionId;
								if (cur?.geniusHeader) newLine.geniusHeader = cur.geniusHeader;
								state.lyricLines.splice(lineIndex + 1, 0, newLine);
								repairSectionIntegrity(state);
							}
						});
						// setInsertMode(InsertMode.None);
						if (!evt.shiftKey) {
							disableInsert();
						}
					}}
				>
					{selectedLinesCount > 0
						? t("lyricLineView.duplicateLinesHere", {
								count: selectedLinesCount,
								defaultValue: "Duplicate {count} selected line(s) here",
							})
						: t("lyricLineView.insertLine", "Insert line here")}
				</Button>
			)}
		</Box>
	);
});
