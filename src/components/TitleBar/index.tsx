import {
	ArrowUpRight16Regular,
	Edit24Regular,
	PanelRight24Filled,
	PanelRight24Regular,
	Play24Regular,
	Timer24Regular,
} from "@fluentui/react-icons";
import { Button, Flex, SegmentedControl, Tooltip } from "@radix-ui/themes";
import { useAtom, useAtomValue } from "jotai";
import { useSetImmerAtom } from "jotai-immer";
import { type FC, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import WindowControls from "$/components/WindowControls";
import { loadedAudioFileNameAtom } from "$/modules/audio/states/index.ts";
import {
	formatTimerClock,
	formatTimerDuration,
} from "$/modules/project/timer/project-timer";
import {
	averageTTMLTimeSecondsAtom,
	currentProjectTimeSecondsAtom,
	isTimerInactiveAtom,
} from "$/modules/project/timer/states";
import {
	boykisserModeAtom,
	boykisserUnlockedAtom,
	geniusApiKeyAtom,
} from "$/modules/settings/states";
import {
	keyNextTabAtom,
	keyPrevTabAtom,
	keySwitchEditModeAtom,
	keySwitchPreviewModeAtom,
	keySwitchSyncModeAtom,
} from "$/states/keybindings.ts";
import {
	lyricLinesAtom,
	saveFileNameAtom,
	selectedLinesAtom,
	selectedWordsAtom,
	showPreviewPanelAtom,
	ToolMode,
	toolModeAtom,
} from "$/states/main.ts";
import { ttmlReviewShowPreviewAtom } from "$/modules/ttml-review/states.ts";
import { useKeyBindingAtom } from "$/utils/keybindings.ts";
import { openExternal } from "$/utils/openExternal";
import { TopMenu } from "../TopMenu/index.tsx";
import {
	getIsSongLoaded,
	resolveGeniusDirectTargetUrl,
	resolveGeniusTargetUrl,
} from "./genius-shortcut";
import styles from "./index.module.css";

export const TitleBar: FC = () => {
	const [toolMode, setToolMode] = useAtom(toolModeAtom);
	const isReviewMode = toolMode === ToolMode.Review;
	const [showPreviewPanel, setShowPreviewPanel] = useAtom(showPreviewPanelAtom);
	const [showReviewPreview, setShowReviewPreview] = useAtom(
		ttmlReviewShowPreviewAtom,
	);
	const isSidePreviewVisible = isReviewMode
		? showReviewPreview
		: showPreviewPanel;
	const handleTogglePreviewPanel = () => {
		if (isReviewMode) {
			setShowReviewPreview((prev) => !prev);
		} else {
			setShowPreviewPanel((prev) => !prev);
		}
	};
	const setSelectedLines = useSetImmerAtom(selectedLinesAtom);
	const setSelectedWords = useSetImmerAtom(selectedWordsAtom);
	const { t } = useTranslation();
	const [boykisserMode, setBoykisserMode] = useAtom(boykisserModeAtom);
	const [boykisserUnlocked] = useAtom(boykisserUnlockedAtom);
	const currentProjectTime = useAtomValue(currentProjectTimeSecondsAtom);
	const isTimerInactive = useAtomValue(isTimerInactiveAtom);
	const averageTime = useAtomValue(averageTTMLTimeSecondsAtom);
	const isApp = useMemo(() => {
		const isTauri =
			typeof window !== "undefined" &&
			(!!(window as any).__TAURI__ || !!import.meta.env.TAURI_ENV_PLATFORM);
		const isPwa =
			typeof window !== "undefined" &&
			(window.matchMedia("(display-mode: standalone)").matches ||
				(window.navigator as any).standalone);
		return isTauri || isPwa;
	}, []);
	const isUnlocked = !isApp || boykisserUnlocked;

	const lyricLines = useAtomValue(lyricLinesAtom);
	const saveFileName = useAtomValue(saveFileNameAtom);
	const loadedAudioFileName = useAtomValue(loadedAudioFileNameAtom);
	const geniusApiKey = useAtomValue(geniusApiKeyAtom);

	const isSongLoaded = useMemo(() => {
		return getIsSongLoaded({
			metadata: lyricLines.metadata,
			lyricLinesCount: lyricLines.lyricLines.length,
			loadedAudioFileName,
			saveFileName,
		});
	}, [lyricLines, loadedAudioFileName, saveFileName]);

	const handleOpenGenius = useCallback(async () => {
		if (!isSongLoaded) return;
		const targetUrl = await resolveGeniusDirectTargetUrl({
			metadata: lyricLines.metadata,
			loadedAudioFileName,
			saveFileName,
			apiKey: geniusApiKey,
		});
		void openExternal(targetUrl);
	}, [
		isSongLoaded,
		lyricLines.metadata,
		loadedAudioFileName,
		saveFileName,
		geniusApiKey,
	]);

	const onSwitchEditMode = useCallback(() => {
		setToolMode(ToolMode.Edit);
	}, [setToolMode]);
	const onSwitchSyncMode = useCallback(() => {
		setToolMode(ToolMode.Sync);
	}, [setToolMode]);
	const onSwitchPreviewMode = useCallback(() => {
		setToolMode(ToolMode.Preview);
	}, [setToolMode]);

	const onSwitchNextTab = useCallback(() => {
		if (document.querySelector('[role="dialog"]')) return;
		setToolMode((current) => {
			if (current === ToolMode.Edit) return ToolMode.Sync;
			if (current === ToolMode.Sync) return ToolMode.Preview;
			return ToolMode.Edit;
		});
	}, [setToolMode]);

	const onSwitchPrevTab = useCallback(() => {
		if (document.querySelector('[role="dialog"]')) return;
		setToolMode((current) => {
			if (current === ToolMode.Edit) return ToolMode.Preview;
			if (current === ToolMode.Preview) return ToolMode.Sync;
			return ToolMode.Edit;
		});
	}, [setToolMode]);

	useKeyBindingAtom(keySwitchEditModeAtom, onSwitchEditMode);
	useKeyBindingAtom(keySwitchSyncModeAtom, onSwitchSyncMode);
	useKeyBindingAtom(keySwitchPreviewModeAtom, onSwitchPreviewMode);
	useKeyBindingAtom(keyNextTabAtom, onSwitchNextTab);
	useKeyBindingAtom(keyPrevTabAtom, onSwitchPrevTab);

	return (
		<WindowControls
			startChildren={<TopMenu />}
			titleChildren={
				<SegmentedControl.Root
					value={toolMode}
					onValueChange={(v) => setToolMode(v as ToolMode)}
					size="2"
				>
					<SegmentedControl.Item
						value={ToolMode.Edit}
						title={t("topBar.modeBtns.edit", "Edit")}
					>
						<Flex align="center" gap="1" px="1">
							<Edit24Regular
								style={{
									width: "calc(17px * var(--scaling, 1))",
									height: "calc(17px * var(--scaling, 1))",
								}}
							/>
							<span className={styles.tabLabel}>
								{t("topBar.modeBtns.edit", "Edit")}
							</span>
						</Flex>
					</SegmentedControl.Item>
					<SegmentedControl.Item
						value={ToolMode.Sync}
						title={t("topBar.modeBtns.sync", "Sync")}
					>
						<Flex align="center" gap="1" px="1">
							<Timer24Regular
								style={{
									width: "calc(17px * var(--scaling, 1))",
									height: "calc(17px * var(--scaling, 1))",
								}}
							/>
							<span className={styles.tabLabel}>
								{t("topBar.modeBtns.sync", "Sync")}
							</span>
						</Flex>
					</SegmentedControl.Item>
					<SegmentedControl.Item
						value={ToolMode.Preview}
						title={t("topBar.modeBtns.preview", "Preview")}
					>
						<Flex align="center" gap="1" px="1">
							<Play24Regular
								style={{
									width: "calc(17px * var(--scaling, 1))",
									height: "calc(17px * var(--scaling, 1))",
								}}
							/>
							<span className={styles.tabLabel}>
								{t("topBar.modeBtns.preview", "Preview")}
							</span>
						</Flex>
					</SegmentedControl.Item>
				</SegmentedControl.Root>
			}
			endChildren={
				<Flex align="center" gap="2" mr="2">
					<Tooltip
						content={
							<div style={{ textAlign: "left" }}>
								<div>
									{t("topBar.timer.activeTime", "Active Time: {time}", {
										time: formatTimerDuration(currentProjectTime),
									})}
									{isTimerInactive && (
										<span style={{ opacity: 0.7, marginLeft: 4 }}>
											({t("topBar.timer.paused", "Idle")})
										</span>
									)}
								</div>
								{typeof averageTime === "number" && averageTime > 0 && (
									<div
										style={{ marginTop: 2, fontSize: "0.85em", opacity: 0.85 }}
									>
										⏱️{" "}
										{t("topBar.timer.average", "Avg Sync: {time}", {
											time: formatTimerDuration(averageTime),
										})}
									</div>
								)}
							</div>
						}
					>
						<div
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "5px",
								padding: "4px 8px",
								borderRadius: "6px",
								backgroundColor: isTimerInactive
									? "var(--gray-a3)"
									: "var(--accent-a3)",
								color: isTimerInactive ? "var(--gray-11)" : "var(--accent-11)",
								fontSize: "12px",
								fontVariantNumeric: "tabular-nums",
								fontWeight: 600,
								userSelect: "none",
								opacity: isTimerInactive ? 0.7 : 1,
								transition: "all 0.2s ease",
							}}
						>
							<Timer24Regular style={{ width: "14px", height: "14px" }} />
							<span>{formatTimerClock(currentProjectTime)}</span>
						</div>
					</Tooltip>
					{toolMode !== ToolMode.Preview && (
						<Tooltip
							content={
								isSidePreviewVisible
									? t("topBar.menu.hidePreviewPanel", "Hide Side Preview Panel")
									: t("topBar.menu.showPreviewPanel", "Show Side Preview Panel")
							}
						>
							<Button
								size="2"
								variant={isSidePreviewVisible ? "solid" : "soft"}
								color={isSidePreviewVisible ? undefined : "gray"}
								onClick={handleTogglePreviewPanel}
								style={{ cursor: "pointer", fontWeight: 500 }}
								aria-label={
									isSidePreviewVisible
										? t(
												"topBar.menu.hidePreviewPanel",
												"Hide Side Preview Panel",
											)
										: t(
												"topBar.menu.showPreviewPanel",
												"Show Side Preview Panel",
											)
								}
							>
								{isSidePreviewVisible ? (
									<PanelRight24Filled
										style={{ width: "16px", height: "16px" }}
									/>
								) : (
									<PanelRight24Regular
										style={{ width: "16px", height: "16px" }}
									/>
								)}
								<span className={styles.previewPanelLabel}>
									{t("topBar.sidePreview", "Preview Panel")}
								</span>
							</Button>
						</Tooltip>
					)}

					<Tooltip
						content={
							isSongLoaded
								? t("topBar.openInGenius", "Open on Genius")
								: t("topBar.noSongLoaded", "No song loaded")
						}
					>
						<span
							style={{
								display: "inline-flex",
								cursor: isSongLoaded ? undefined : "not-allowed",
							}}
						>
							<Button
								size="2"
								variant="soft"
								color="gray"
								disabled={!isSongLoaded}
								onClick={handleOpenGenius}
								style={{
									cursor: isSongLoaded ? "pointer" : "not-allowed",
									fontWeight: 500,
									display: "inline-flex",
									alignItems: "center",
									gap: "5px",
									opacity: isSongLoaded ? 1 : 0.45,
									filter: isSongLoaded ? "none" : "grayscale(0.6)",
									pointerEvents: isSongLoaded ? "auto" : "none",
								}}
								aria-label={t("topBar.openInGenius", "Open on Genius")}
							>
								<span
									style={{
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										width: "16px",
										height: "16px",
										borderRadius: "4px",
										backgroundColor: isSongLoaded ? "#ffff64" : "#9ca3af",
										color: "#000000",
										fontWeight: 900,
										fontSize: "11px",
										fontFamily: "system-ui, sans-serif",
										lineHeight: 1,
									}}
								>
									G
								</span>
								<span className={styles.previewPanelLabel}>Genius</span>
								<ArrowUpRight16Regular
									style={{ width: "12px", height: "12px", opacity: 0.7 }}
								/>
							</Button>
						</span>
					</Tooltip>

					{isUnlocked && !window.location.href.includes("spicylyrics.org") && (
						<button
							type="button"
							style={{
								display: "none",
								width: "6px",
								height: "6px",
								borderRadius: "50%",
								background: "var(--accent-9)",
								border: "none",
								cursor: "pointer",
								opacity: 0.2,
								transition: "opacity 0.2s",
								outline: "none",
								marginRight: "4px",
							}}
							onClick={() => setBoykisserMode(!boykisserMode)}
							title={t("topBar.boykisser", "boykisser")}
						/>
					)}
				</Flex>
			}
			onSpacerClicked={() => {
				setSelectedLines((o) => o.clear());
				setSelectedWords((o) => o.clear());
			}}
		/>
	);
};
