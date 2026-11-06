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
	Beaker24Regular,
	ClipboardPaste16Regular,
	Clock24Regular,
	Copy16Regular,
	Cut16Regular,
	DocumentSync16Regular,
	Eye16Regular,
	FastForward16Regular,
	Flash16Regular,
	Flow16Regular,
	Keyboard16Regular,
	Lightbulb16Regular,
	List24Regular,
	LocalLanguage16Regular,
	Settings24Regular,
	Sparkle16Regular,
	TextT24Regular,
	TextWrap16Regular,
	Timer16Regular,
	Warning16Regular,
} from "@fluentui/react-icons";
import {
	Box,
	Button,
	Checkbox,
	Flex,
	Grid,
	IconButton,
	Popover,
	SegmentedControl,
	Slider,
	Switch,
	Text,
	TextField,
	Tooltip,
} from "@radix-ui/themes";
import { useAtom, useAtomValue, useStore } from "jotai";
import { useSetImmerAtom } from "jotai-immer";
import { type FC, forwardRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getProgressBadgeColor } from "$/components/TopMenu/HeaderFileInfo";
import { useSyncProgress } from "$/hooks/useSyncProgress";
import { currentTimeAtom } from "$/modules/audio/states/index.ts";
import { snapSelectedLineTimingsToTime } from "$/modules/lyric-editor/utils/line-timing.ts";
import { useCurrentLocation } from "$/modules/lyric-editor/utils/lyric-states.ts";
import { advancedRibbonControlsAtom } from "$/modules/onboarding/states";
import {
	displayRomanizationInSyncAtom,
	enableManualTimestampEditAtom,
	enableSyncGlowAnimationAtom,
	highlightActiveWordAtom,
	highlightErrorsAtom,
	showTimestampsAtom,
	showWordRomanizationInputAtom,
	wrapLyricLinesAtom,
} from "$/modules/settings/states/index.ts";
import { instantHighlightFadeAtom } from "$/modules/settings/states/preview";
import {
	type AutoSegmentSyncMode,
	autoSegmentOnLineSyncAtom,
	autoSegmentSyncModeAtom,
	enableTimeModeDoubleClickEditAtom,
	type SyncLevelMode,
	showTouchSyncPanelAtom,
	syncCommitOffsetAtom,
	syncLevelModeAtom,
	syncTimeOffsetAtom,
	visualizeTimestampUpdateAtom,
} from "$/modules/settings/states/sync.ts";
import {
	bgLyricIgnoreSyncAtom,
	type CopiedTimingsData,
	copiedTimingsAtom,
	lyricLinesAtom,
	mainLyricIgnoreSyncAtom,
	selectedLinesAtom,
	selectedWordsAtom,
	showPreviewPanelAtom,
} from "$/states/main.ts";
import { RibbonFrame, RibbonSection } from "./common";

export const LineTimingTools = () => {
	const { t } = useTranslation();
	const store = useStore();
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const [copiedTimings, setCopiedTimings] = useAtom(copiedTimingsAtom);

	const handleCopyTimings = useCallback(() => {
		const lyricLines = store.get(lyricLinesAtom).lyricLines;
		const selLines = store.get(selectedLinesAtom);
		const selWords = store.get(selectedWordsAtom);

		if (selLines.size === 0 && selWords.size === 0) {
			toast.info(
				t(
					"ribbonBar.timingTools.selectLineFirst",
					"Please select a line first",
				),
			);
			return;
		}

		if (selLines.size > 0) {
			const targetLine = lyricLines.find((l) => selLines.has(l.id));
			if (targetLine) {
				const duration = Math.max(0, targetLine.endTime - targetLine.startTime);
				const wordTimings = (targetLine.words || []).map((w) => ({
					relativeStart: Math.max(0, w.startTime - targetLine.startTime),
					duration: Math.max(0, w.endTime - w.startTime),
				}));
				const data: CopiedTimingsData = {
					startTime: targetLine.startTime,
					endTime: targetLine.endTime,
					duration,
					wordTimings,
				};
				setCopiedTimings(data);
				try {
					navigator?.clipboard?.writeText(
						JSON.stringify({
							type: "amll-timings",
							version: 1,
							...data,
						}),
					);
				} catch {}
				toast.success(
					t(
						"ribbonBar.timingTools.copiedLineTimings",
						"Copied line timings to clipboard",
					),
				);
				return;
			}
		}

		if (selWords.size > 0) {
			for (const line of lyricLines) {
				for (const word of line.words) {
					if (selWords.has(word.id)) {
						const duration = Math.max(0, word.endTime - word.startTime);
						const data: CopiedTimingsData = {
							startTime: word.startTime,
							endTime: word.endTime,
							duration,
						};
						setCopiedTimings(data);
						try {
							navigator?.clipboard?.writeText(
								JSON.stringify({
									type: "amll-timings",
									version: 1,
									...data,
								}),
							);
						} catch {}
						toast.success(
							t(
								"ribbonBar.timingTools.copiedWordTimings",
								"Copied word timing",
							),
						);
						return;
					}
				}
			}
		}
	}, [setCopiedTimings, store, t]);

	const handlePasteTimings = useCallback(async () => {
		let timingToApply = copiedTimings;

		// Check system clipboard for timing JSON
		try {
			if (navigator?.clipboard?.readText) {
				const clipText = await navigator.clipboard.readText();
				if (clipText) {
					const parsed = JSON.parse(clipText);
					if (
						parsed &&
						(parsed.type === "amll-timings" ||
							(typeof parsed.startTime === "number" &&
								typeof parsed.endTime === "number"))
					) {
						timingToApply = {
							startTime: parsed.startTime,
							endTime: parsed.endTime,
							duration:
								typeof parsed.duration === "number"
									? parsed.duration
									: Math.max(0, parsed.endTime - parsed.startTime),
							wordTimings: Array.isArray(parsed.wordTimings)
								? parsed.wordTimings
								: undefined,
						};
						setCopiedTimings(timingToApply);
					}
				}
			}
		} catch {}

		if (!timingToApply) {
			toast.info(
				t("ribbonBar.timingTools.noTimingsCopied", "No timings copied yet"),
			);
			return;
		}
		const selLines = store.get(selectedLinesAtom);
		const selWords = store.get(selectedWordsAtom);

		if (selLines.size === 0 && selWords.size === 0) {
			toast.info(
				t(
					"ribbonBar.timingTools.selectTargetFirst",
					"Please select a target line or word",
				),
			);
			return;
		}

		editLyricLines((state) => {
			for (const line of state.lyricLines) {
				if (selLines.has(line.id)) {
					line.startTime = timingToApply.startTime;
					line.endTime = timingToApply.endTime;
					if (
						timingToApply.wordTimings &&
						line.words &&
						line.words.length > 0
					) {
						const count = Math.min(
							line.words.length,
							timingToApply.wordTimings.length,
						);
						for (let i = 0; i < count; i++) {
							const wt = timingToApply.wordTimings[i];
							line.words[i].startTime = line.startTime + wt.relativeStart;
							line.words[i].endTime = line.words[i].startTime + wt.duration;
						}
					}
				}
				if (selWords.size > 0) {
					for (const word of line.words) {
						if (selWords.has(word.id)) {
							word.startTime = timingToApply.startTime;
							word.endTime = timingToApply.endTime;
						}
					}
				}
			}
			return state;
		});
		toast.success(
			t("ribbonBar.timingTools.pastedTimings", "Pasted timings to selection"),
		);
	}, [copiedTimings, editLyricLines, setCopiedTimings, store, t]);

	const handleSnapToPlayhead = useCallback(() => {
		const currentTime = Math.round(store.get(currentTimeAtom));
		const selLines = store.get(selectedLinesAtom);
		const selWords = store.get(selectedWordsAtom);

		if (selLines.size === 0 && selWords.size === 0) {
			toast.info(
				t(
					"ribbonBar.timingTools.selectLineFirst",
					"Please select a line first",
				),
			);
			return;
		}

		editLyricLines((state) => {
			if (selLines.size > 0) {
				snapSelectedLineTimingsToTime(state.lyricLines, selLines, currentTime);
			} else if (selWords.size > 0) {
				let firstSelectedWord: (typeof state.lyricLines)[0]["words"][0] | null =
					null;
				for (const line of state.lyricLines) {
					for (const word of line.words) {
						if (selWords.has(word.id)) {
							firstSelectedWord = word;
							break;
						}
					}
					if (firstSelectedWord) break;
				}

				if (firstSelectedWord) {
					const baseWordStart = firstSelectedWord.startTime;
					const wordOffset = currentTime - baseWordStart;
					for (const line of state.lyricLines) {
						for (const word of line.words) {
							if (selWords.has(word.id)) {
								const wDur =
									word.endTime > word.startTime
										? word.endTime - word.startTime
										: 500;
								word.startTime = Math.max(0, word.startTime + wordOffset);
								word.endTime = word.startTime + wDur;
							}
						}
					}
				}
			}
			return state;
		});
		toast.success(
			t(
				"ribbonBar.timingTools.snappedToPlayhead",
				"Snapped timing to playhead",
			),
		);
	}, [editLyricLines, store, t]);

	return (
		<Flex gap="2" align="center" justify="center" style={{ height: "100%" }}>
			<Tooltip content={t("ribbonBar.timingTools.copyTimings", "Copy Timings")}>
				<IconButton
					size="2"
					variant="soft"
					onClick={handleCopyTimings}
					aria-label={t("ribbonBar.timingTools.copyTimings", "Copy Timings")}
					style={{ cursor: "pointer", borderRadius: "6px" }}
				>
					<Copy16Regular />
				</IconButton>
			</Tooltip>
			<Tooltip
				content={t("ribbonBar.timingTools.pasteTimings", "Paste Timings")}
			>
				<IconButton
					size="2"
					variant="soft"
					onClick={handlePasteTimings}
					disabled={!copiedTimings}
					aria-label={t("ribbonBar.timingTools.pasteTimings", "Paste Timings")}
					style={{ cursor: "pointer", borderRadius: "6px" }}
				>
					<ClipboardPaste16Regular />
				</IconButton>
			</Tooltip>
			<Tooltip
				content={t(
					"ribbonBar.timingTools.snapPlayhead",
					"Snap Timings to Playhead",
				)}
			>
				<IconButton
					size="2"
					variant="soft"
					onClick={handleSnapToPlayhead}
					aria-label={t(
						"ribbonBar.timingTools.snapPlayhead",
						"Snap Timings to Playhead",
					)}
					style={{ cursor: "pointer", borderRadius: "6px" }}
				>
					<FastForward16Regular />
				</IconButton>
			</Tooltip>
		</Flex>
	);
};

export const RibbonSyncProgressWidget = () => {
	const syncProgress = useSyncProgress();
	const { t } = useTranslation();

	if (!syncProgress.hasLyrics) {
		return (
			<Flex align="center" justify="center" px="3" py="1">
				<Text size="1" color="gray">
					{t("ribbonBar.syncMode.noLyrics", "No Lyrics")}
				</Text>
			</Flex>
		);
	}

	return (
		<Flex align="center" gap="3" px="2" py="1">
			<Box
				style={{
					position: "relative",
					width: 36,
					height: 36,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
				}}
			>
				<svg
					width="36"
					height="36"
					viewBox="0 0 36 36"
					style={{ transform: "rotate(-90deg)", display: "block" }}
				>
					<circle
						cx="18"
						cy="18"
						r="15"
						stroke="var(--gray-a4)"
						strokeWidth="3"
						fill="none"
					/>
					<circle
						cx="18"
						cy="18"
						r="15"
						stroke={
							syncProgress.linePercent === 100
								? "var(--green-9)"
								: `var(--${getProgressBadgeColor(syncProgress.linePercent)}-9)`
						}
						strokeWidth="3"
						fill="none"
						strokeDasharray={2 * Math.PI * 15}
						strokeDashoffset={
							2 * Math.PI * 15 * (1 - syncProgress.linePercent / 100)
						}
						strokeLinecap="round"
						style={{ transition: "stroke-dashoffset 0.3s ease" }}
					/>
				</svg>
				<Text
					size="1"
					weight="bold"
					style={{
						position: "absolute",
						fontSize: syncProgress.linePercent === 100 ? "8.5px" : "10px",
						letterSpacing:
							syncProgress.linePercent === 100 ? "-0.5px" : undefined,
						lineHeight: 1,
						color:
							syncProgress.linePercent === 100
								? "var(--green-11)"
								: `var(--${getProgressBadgeColor(syncProgress.linePercent)}-11)`,
					}}
				>
					{syncProgress.linePercent}%
				</Text>
			</Box>
			<Flex direction="column" gap="0" style={{ lineHeight: 1.2 }}>
				<Text size="1" weight="bold" style={{ color: "var(--gray-12)" }}>
					{syncProgress.timedLines} / {syncProgress.totalLines}{" "}
					{t("ribbonBar.syncMode.lines", "Lines")}
				</Text>
				<Text size="1" color="gray" style={{ fontSize: "11px" }}>
					{syncProgress.timedWords} / {syncProgress.totalWords}{" "}
					{t("ribbonBar.syncMode.words", "Words")}
				</Text>
			</Flex>
		</Flex>
	);
};

export const SyncModeRibbonBar: FC<{ isSidebar?: boolean }> = forwardRef<
	HTMLDivElement,
	{ isSidebar?: boolean }
>(({ isSidebar }, ref) => {
	const [visualizeTimestampUpdate, setVisualizeTimestampUpdate] = useAtom(
		visualizeTimestampUpdateAtom,
	);
	const [showTouchSyncPanel, setShowTouchSyncPanel] = useAtom(
		showTouchSyncPanelAtom,
	);
	const [showPreviewPanel, setShowPreviewPanel] = useAtom(showPreviewPanelAtom);
	const [showTimestamps, setShowTimestamps] = useAtom(showTimestampsAtom);
	const [highlightErrors, setHighlightErrors] = useAtom(highlightErrorsAtom);
	const [highlightActiveWord, setHighlightActiveWord] = useAtom(
		highlightActiveWordAtom,
	);
	const [enableSyncGlowAnimation, setEnableSyncGlowAnimation] = useAtom(
		enableSyncGlowAnimationAtom,
	);
	const [enableManualTimestampEdit, setEnableManualTimestampEdit] = useAtom(
		enableManualTimestampEditAtom,
	);
	const [enableTimeModeDoubleClickEdit, setEnableTimeModeDoubleClickEdit] =
		useAtom(enableTimeModeDoubleClickEditAtom);

	const [displayRomanizationInSync, setdisplayRomanizationInSync] = useAtom(
		displayRomanizationInSyncAtom,
	);
	const [bgLyricIgnoreSync, setBgLyricIgnoreSync] = useAtom(
		bgLyricIgnoreSyncAtom,
	);
	const [mainLyricIgnoreSync, setMainLyricIgnoreSync] = useAtom(
		mainLyricIgnoreSyncAtom,
	);
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const showWordRomanizationInput = useAtomValue(showWordRomanizationInputAtom);
	const [syncTimeOffset, setSyncTimeOffset] = useAtom(syncTimeOffsetAtom);
	const [syncCommitOffset, setSyncCommitOffset] = useAtom(syncCommitOffsetAtom);
	const [syncLevelMode, setSyncLevelMode] = useAtom(syncLevelModeAtom);
	const [autoSegmentOnLineSync, setAutoSegmentOnLineSync] = useAtom(
		autoSegmentOnLineSyncAtom,
	);
	const [autoSegmentSyncMode, setAutoSegmentSyncMode] = useAtom(
		autoSegmentSyncModeAtom,
	);
	const [instantFade, setInstantFade] = useAtom(instantHighlightFadeAtom);
	const [wrapLyricLines, setWrapLyricLines] = useAtom(wrapLyricLinesAtom);
	const { t } = useTranslation();
	const [showAdvanced, setShowAdvanced] = useAtom(advancedRibbonControlsAtom);

	return (
		<RibbonFrame ref={ref} isSidebar={isSidebar}>
			<RibbonSection
				isSidebar={isSidebar}
				label={
					<Flex align="center" gap="1" style={{ display: "inline-flex" }}>
						<Timer16Regular style={{ width: "12px", height: "12px" }} />
						<span>{t("ribbonBar.syncMode.syncProgress", "Sync Progress")}</span>
					</Flex>
				}
			>
				<RibbonSyncProgressWidget />
			</RibbonSection>
			<RibbonSection
				isSidebar={isSidebar}
				label={
					<Flex align="center" gap="1" style={{ display: "inline-flex" }}>
						<Timer16Regular style={{ width: "12px", height: "12px" }} />
						<span>{t("ribbonBar.timingTools.title", "Timing Tools")}</span>
					</Flex>
				}
			>
				<Flex direction="column" align="center" gap="2">
					<LineTimingTools />
				</Flex>
			</RibbonSection>

			{showAdvanced && (
				<RibbonSection
					isSidebar={isSidebar}
					label={
						<Flex align="center" gap="1" style={{ display: "inline-flex" }}>
							<Clock24Regular style={{ width: "12px", height: "12px" }} />
							<span>
								{t("ribbonBar.syncMode.syncAdjustment", "Timing Adjustment")}
							</span>
						</Flex>
					}
				>
					<Grid
						columns="max-content auto"
						gap="4"
						gapY="1"
						flexGrow="1"
						align="center"
					>
						<Text wrap="nowrap" size="1" style={{ color: "var(--accent-11)" }}>
							<Flex gap="1" align="center">
								<Timer16Regular />
								{t("ribbonBar.syncMode.timeOffset", "Time Offset")}
							</Flex>
						</Text>
						<TextField.Root
							type="number"
							step={1}
							size="1"
							style={{
								width: "8em",
							}}
							value={syncTimeOffset}
							onChange={(e) => setSyncTimeOffset(e.target.valueAsNumber)}
						>
							<TextField.Slot />
							<TextField.Slot>
								<Text>ms</Text>
							</TextField.Slot>
						</TextField.Root>
						<Text wrap="nowrap" size="1" style={{ color: "var(--accent-11)" }}>
							<Flex gap="1" align="center">
								<Timer16Regular />
								{t("ribbonBar.syncMode.commitOffset", "Commit Offset")}
							</Flex>
						</Text>
						<TextField.Root
							type="number"
							step={1}
							size="1"
							style={{
								width: "8em",
							}}
							value={syncCommitOffset}
							onChange={(e) => setSyncCommitOffset(e.target.valueAsNumber)}
						>
							<TextField.Slot />
							<TextField.Slot>
								<Text>ms</Text>
							</TextField.Slot>
						</TextField.Root>
					</Grid>
				</RibbonSection>
			)}
			<RibbonSection
				isSidebar={isSidebar}
				label={
					<Flex align="center" gap="1" style={{ display: "inline-flex" }}>
						<List24Regular style={{ width: "12px", height: "12px" }} />
						<span>{t("ribbonBar.syncMode.syncLevel", "Sync Level")}</span>
					</Flex>
				}
			>
				<Flex
					direction="column"
					gap="1"
					justify="center"
					px="1"
					style={{ height: "100%" }}
				>
					<Button
						size="1"
						variant={syncLevelMode === "word" ? "solid" : "soft"}
						color={syncLevelMode === "word" ? undefined : "gray"}
						onClick={() => setSyncLevelMode("word")}
						style={{
							justifyContent: "flex-start",
							cursor: "pointer",
							width: "100%",
							paddingLeft: "6px",
							paddingRight: "8px",
						}}
					>
						<TextT24Regular style={{ width: "14px", height: "14px" }} />
						<span>{t("ribbonBar.syncMode.syncLevelWord", "Word Sync")}</span>
					</Button>
					<Button
						size="1"
						variant={syncLevelMode === "line" ? "solid" : "soft"}
						color={syncLevelMode === "line" ? undefined : "gray"}
						onClick={() => setSyncLevelMode("line")}
						style={{
							justifyContent: "flex-start",
							cursor: "pointer",
							width: "100%",
							paddingLeft: "6px",
							paddingRight: "8px",
						}}
					>
						<List24Regular style={{ width: "14px", height: "14px" }} />
						<span>{t("ribbonBar.syncMode.syncLevelLine", "Line Sync")}</span>
					</Button>
				</Flex>
			</RibbonSection>
			{showAdvanced && (
				<RibbonSection
					isSidebar={isSidebar}
					label={
						<Flex align="center" gap="1" style={{ display: "inline-flex" }}>
							<Settings24Regular style={{ width: "12px", height: "12px" }} />
							<span>{t("ribbonBar.syncMode.options", "Options")}</span>
						</Flex>
					}
				>
					<Flex
						direction="column"
						gap="1"
						justify="center"
						px="1"
						style={{ height: "100%" }}
					>
						<Popover.Root>
							<Popover.Trigger>
								<Button
									size="1"
									variant="soft"
									color="gray"
									style={{
										cursor: "pointer",
										borderRadius: "6px",
										fontWeight: 500,
										width: "100%",
										justifyContent: "flex-start",
									}}
								>
									<Beaker24Regular style={{ width: "14px", height: "14px" }} />
									<span>
										{t(
											"ribbonBar.syncMode.assistSettings",
											"Assistant Settings",
										)}
									</span>
								</Button>
							</Popover.Trigger>
							<Popover.Content
								size="2"
								style={{ width: 280, maxWidth: "90vw" }}
							>
								<Flex direction="column" gap="3">
									<Text size="2" weight="bold">
										{t(
											"ribbonBar.syncMode.assistSettings",
											"Assistant Settings",
										)}
									</Text>
									<Grid
										columns="auto max-content"
										gap="3"
										gapY="2"
										align="center"
									>
										<Text size="2" style={{ color: "var(--accent-11)" }}>
											<Flex gap="2" align="center">
												<Eye16Regular />
												{t(
													"ribbonBar.syncMode.showTimestampUpdate",
													"Show Timestamp Updates",
												)}
											</Flex>
										</Text>
										<Checkbox
											checked={visualizeTimestampUpdate}
											onCheckedChange={(v) => setVisualizeTimestampUpdate(!!v)}
										/>
										<Text size="2" style={{ color: "var(--accent-11)" }}>
											<Flex gap="2" align="center">
												<DocumentSync16Regular />
												{t(
													"ribbonBar.syncMode.touchSyncPanel",
													"Touch Sync Panel",
												)}
											</Flex>
										</Text>
										<Checkbox
											checked={showTouchSyncPanel}
											onCheckedChange={(v) => setShowTouchSyncPanel(!!v)}
										/>
										<Text size="2" style={{ color: "var(--accent-11)" }}>
											<Flex gap="2" align="center">
												<Flow16Regular />
												{t(
													"ribbonBar.syncMode.mainLyricIgnoreSync",
													"Ignore Main Vocals",
												)}
											</Flex>
										</Text>
										<Checkbox
											checked={mainLyricIgnoreSync}
											onCheckedChange={(v) => {
												const next = !!v;
												setMainLyricIgnoreSync(next);
												editLyricLines((state) => {
													for (const line of state.lyricLines) {
														if (!line.isBG) {
															line.ignoreSync = next;
														}
													}
													return state;
												});
											}}
										/>
										<Text size="2" style={{ color: "var(--accent-11)" }}>
											<Flex gap="2" align="center">
												<Flow16Regular />
												{t(
													"ribbonBar.syncMode.bgLyricIgnoreSync",
													"Ignore Background Vocals",
												)}
											</Flex>
										</Text>
										<Checkbox
											checked={bgLyricIgnoreSync}
											onCheckedChange={(v) => {
												const next = !!v;
												setBgLyricIgnoreSync(next);
												editLyricLines((state) => {
													for (const line of state.lyricLines) {
														if (line.isBG) {
															line.ignoreSync = next;
														}
													}
													return state;
												});
											}}
										/>
										<Text size="2" style={{ color: "var(--accent-11)" }}>
											<Flex gap="2" align="center">
												<Timer16Regular />
												{t(
													"ribbonBar.syncMode.manualTimestampEdit",
													"Manual Timestamp Editing",
												)}
											</Flex>
										</Text>
										<Checkbox
											checked={enableManualTimestampEdit}
											onCheckedChange={(v) => setEnableManualTimestampEdit(!!v)}
										/>
										<Text size="2" style={{ color: "var(--accent-11)" }}>
											<Flex gap="2" align="center">
												<Keyboard16Regular />
												{t(
													"ribbonBar.syncMode.doubleClickEdit",
													"Double-Click Word Editing",
												)}
											</Flex>
										</Text>
										<Checkbox
											checked={enableTimeModeDoubleClickEdit}
											onCheckedChange={(v) =>
												setEnableTimeModeDoubleClickEdit(!!v)
											}
										/>
										<Text size="2" style={{ color: "var(--accent-11)" }}>
											<Flex gap="2" align="center">
												<Cut16Regular />
												{t(
													"ribbonBar.syncMode.autoSegmentOnSync",
													"Auto-Segment Single Words",
												)}
											</Flex>
										</Text>
										<Checkbox
											checked={autoSegmentOnLineSync}
											onCheckedChange={(v) => setAutoSegmentOnLineSync(!!v)}
										/>
										{autoSegmentOnLineSync && (
											<Flex
												direction="row"
												align="center"
												justify="between"
												gap="2"
												style={{
													gridColumn: "span 2",
													paddingLeft: "24px",
													paddingTop: "2px",
												}}
											>
												<Text size="1" color="gray">
													{t("ribbonBar.syncMode.splitType", "Split:")}
												</Text>
												<SegmentedControl.Root
													value={autoSegmentSyncMode}
													onValueChange={(v) =>
														setAutoSegmentSyncMode(v as AutoSegmentSyncMode)
													}
													size="1"
												>
													<SegmentedControl.Item value="word">
														{t("settings.common.autoSegmentModeWord", "Word")}
													</SegmentedControl.Item>
													<SegmentedControl.Item value="syllable">
														{t(
															"settings.common.autoSegmentModeSyllable",
															"Syllable",
														)}
													</SegmentedControl.Item>
												</SegmentedControl.Root>
											</Flex>
										)}
									</Grid>
								</Flex>
							</Popover.Content>
						</Popover.Root>

						<Popover.Root>
							<Popover.Trigger>
								<Button
									size="1"
									variant="soft"
									color="gray"
									style={{
										cursor: "pointer",
										borderRadius: "6px",
										fontWeight: 500,
										width: "100%",
										justifyContent: "flex-start",
									}}
								>
									<Eye16Regular style={{ width: "14px", height: "14px" }} />
									<span>
										{t("ribbonBar.syncMode.displayOptions", "Display Options")}
									</span>
								</Button>
							</Popover.Trigger>
							<Popover.Content
								size="2"
								style={{ width: 290, maxWidth: "90vw" }}
							>
								<Flex direction="column" gap="3">
									<Text size="2" weight="bold">
										{t("ribbonBar.syncMode.displayOptions", "Display Options")}
									</Text>
									<Grid
										columns="auto max-content"
										gap="3"
										gapY="2"
										align="center"
									>
										<Text size="2" style={{ color: "var(--accent-11)" }}>
											<Flex gap="2" align="center">
												<Eye16Regular />
												{t(
													"ribbonBar.syncMode.showTimestamps",
													"Show Timestamps",
												)}
											</Flex>
										</Text>
										<Checkbox
											checked={showTimestamps}
											onCheckedChange={(v) => setShowTimestamps(!!v)}
										/>
										<Text size="2" style={{ color: "var(--accent-11)" }}>
											<Flex gap="2" align="center">
												<Lightbulb16Regular />
												{t(
													"ribbonBar.syncMode.highlightActiveWord",
													"Highlight Active Word",
												)}
											</Flex>
										</Text>
										<Checkbox
											checked={highlightActiveWord}
											onCheckedChange={(v) => setHighlightActiveWord(!!v)}
										/>
										<Text size="2" style={{ color: "var(--accent-11)" }}>
											<Flex gap="2" align="center">
												<Sparkle16Regular />
												{t(
													"ribbonBar.syncMode.enableGlowAnimation",
													"Enable Glow Animation",
												)}
											</Flex>
										</Text>
										<Checkbox
											checked={enableSyncGlowAnimation}
											onCheckedChange={(v) => setEnableSyncGlowAnimation(!!v)}
										/>
										<Text size="2" style={{ color: "var(--accent-11)" }}>
											<Flex gap="2" align="center">
												<Flash16Regular />
												{t(
													"ribbonBar.previewMode.instantFade",
													"Instant Fade Out",
												)}
											</Flex>
										</Text>
										<Checkbox
											checked={instantFade}
											onCheckedChange={(v) => setInstantFade(!!v)}
										/>
										<Text size="2" style={{ color: "var(--accent-11)" }}>
											<Flex gap="2" align="center">
												<Warning16Regular />
												{t(
													"ribbonBar.syncMode.highlightErrors",
													"Highlight Errors",
												)}
											</Flex>
										</Text>
										<Checkbox
											checked={highlightErrors}
											onCheckedChange={(v) => setHighlightErrors(!!v)}
										/>
										<Text size="2" style={{ color: "var(--accent-11)" }}>
											<Flex gap="2" align="center">
												<TextWrap16Regular />
												{t(
													"ribbonBar.syncMode.wrapLyricLines",
													"Wrap Long Lines",
												)}
											</Flex>
										</Text>
										<Checkbox
											checked={wrapLyricLines}
											onCheckedChange={(v) => setWrapLyricLines(!!v)}
										/>
										{showWordRomanizationInput && (
											<>
												<Text size="2" style={{ color: "var(--accent-11)" }}>
													<Flex gap="2" align="center">
														<LocalLanguage16Regular />
														{t(
															"ribbonBar.syncMode.showPerWordRomanization",
															"Show Per-Word Romanization",
														)}
													</Flex>
												</Text>
												<Checkbox
													checked={displayRomanizationInSync}
													onCheckedChange={(v) =>
														setdisplayRomanizationInSync(!!v)
													}
												/>
											</>
										)}
									</Grid>
								</Flex>
							</Popover.Content>
						</Popover.Root>
					</Flex>
				</RibbonSection>
			)}
			<RibbonSection
				label={
					<Flex align="center" gap="1" style={{ display: "inline-flex" }}>
						<Settings24Regular style={{ width: "12px", height: "12px" }} />
						<span>{t("ribbonBar.advanced", "Advanced")}</span>
					</Flex>
				}
				isSidebar={isSidebar}
			>
				<Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
			</RibbonSection>
		</RibbonFrame>
	);
});

export default SyncModeRibbonBar;
