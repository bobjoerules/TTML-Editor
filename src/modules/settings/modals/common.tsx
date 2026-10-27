import resources from "virtual:i18next-loader";
import {
	ArrowDownload24Regular,
	Cloud24Regular,
	ContentView24Regular,
	Cut24Regular,
	Database24Regular,
	History24Regular,
	Keyboard12324Regular,
	LocalLanguage24Regular,
	PaddingLeft24Regular,
	PaddingRight24Regular,
	Save24Regular,
	Sparkle24Regular,
	Speaker224Regular,
	Stack24Regular,
	TextWrap24Regular,
	Timer24Regular,
	TopSpeed24Regular,
	VideoBackgroundEffect24Regular,
} from "@fluentui/react-icons";
import {
	Badge,
	Box,
	Button,
	Card,
	Flex,
	Heading,
	Link,
	SegmentedControl,
	Select,
	Slider,
	Switch,
	Text,
	TextArea,
	TextField,
} from "@radix-ui/themes";
import { useAtom, useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { playbackRateAtom, volumeAtom } from "$/modules/audio/states";
import { segmentationIgnoreListTextAtom } from "$/modules/segmentation/states";
import {
	allowConsecutiveBackgroundLinesAtom,
	autoLoadCloudAudioAtom,
	autosaveEnabledAtom,
	autosaveIntervalAtom,
	autosaveLimitAtom,
	compactBGInSyncAtom,
	downloadAudioOnLyricImportAtom,
	geniusCategorizationEnabledAtom,
	highlightUnsyncedWordsInEditorAtom,
	keepPlayingWordInViewAtom,
	LayoutMode,
	layoutModeAtom,
	normalizeApostrophesOnImportAtom,
	normalizeCyrillicEsOnImportAtom,
	openSpotMatchAfterSaveAtom,
	SyncJudgeMode,
	smartFirstWordAtom,
	smartLastWordAtom,
	smartWordAnywhereAtom,
	splitOccupiedWordAtPlayheadAtom,
	autoSplitTrailingSpaceOnInputAtom,
	syncJudgeModeAtom,
	wrapLyricLinesAtom,
} from "$/modules/settings/states";
import {
	type AutoSegmentSyncMode,
	autoSegmentOnLineSyncAtom,
	autoSegmentSyncModeAtom,
	enableUpcomingWordHighlightAtom,
	syncCommitOffsetAtom,
	syncTimeOffsetAtom,
	upcomingWordHighlightColorAtom,
	upcomingWordHighlightThresholdAtom,
} from "$/modules/settings/states/sync";
import { checklistShowUploadedToDbAtom } from "$/modules/ttml-checklist/states";
import { latencyTestDialogAtom } from "$/states/dialogs.ts";
import {
	KeyBindingTriggerMode,
	keyBindingTriggerModeAtom,
} from "$/utils/keybindings";
import { UIScaleSetting } from "./UIScaleSetting";

export type CommonSettingsSection =
	| "general"
	| "editor"
	| "files"
	| "audio"
	| "all";

export const SettingsCommonTab = ({
	section = "general",
	filterItemIds,
}: {
	section?: CommonSettingsSection;
	filterItemIds?: Set<string>;
}) => {
	const shouldShow = (id: string) => !filterItemIds || filterItemIds.has(id);
	const setLatencyDialogOpen = useSetAtom(latencyTestDialogAtom);
	const languageOptions: readonly string[] = Object.keys(resources);
	const [layoutMode, setLayoutMode] = useAtom(layoutModeAtom);
	const [syncJudgeMode, setSyncJudgeMode] = useAtom(syncJudgeModeAtom);
	const [keyBindingTriggerMode, setKeyBindingTriggerMode] = useAtom(
		keyBindingTriggerModeAtom,
	);
	const [smartFirstWord, setSmartFirstWord] = useAtom(smartFirstWordAtom);
	const [smartWordAnywhere, setSmartWordAnywhere] = useAtom(
		smartWordAnywhereAtom,
	);
	const [smartLastWord, setSmartLastWord] = useAtom(smartLastWordAtom);
	const [splitOccupiedWordAtPlayhead, setSplitOccupiedWordAtPlayhead] = useAtom(
		splitOccupiedWordAtPlayheadAtom,
	);
	const [autoSplitTrailingSpaceOnInput, setAutoSplitTrailingSpaceOnInput] =
		useAtom(autoSplitTrailingSpaceOnInputAtom);
	const [volume, setVolume] = useAtom(volumeAtom);
	const [playbackRate, setPlaybackRate] = useAtom(playbackRateAtom);
	const [autosaveEnabled, setAutosaveEnabled] = useAtom(autosaveEnabledAtom);
	const [autosaveInterval, setAutosaveInterval] = useAtom(autosaveIntervalAtom);
	const [autosaveLimit, setAutosaveLimit] = useAtom(autosaveLimitAtom);
	const [autoLoadCloudAudio, setAutoLoadCloudAudio] = useAtom(
		autoLoadCloudAudioAtom,
	);
	const [downloadAudioOnLyricImport, setDownloadAudioOnLyricImport] = useAtom(
		downloadAudioOnLyricImportAtom,
	);
	const [enableUpcomingWordHighlight, setEnableUpcomingWordHighlight] = useAtom(
		enableUpcomingWordHighlightAtom,
	);
	const [upcomingWordHighlightThreshold, setUpcomingWordHighlightThreshold] =
		useAtom(upcomingWordHighlightThresholdAtom);
	const [upcomingWordHighlightColor, setUpcomingWordHighlightColor] = useAtom(
		upcomingWordHighlightColorAtom,
	);
	const [syncTimeOffset, setSyncTimeOffset] = useAtom(syncTimeOffsetAtom);
	const [syncCommitOffset, setSyncCommitOffset] = useAtom(syncCommitOffsetAtom);
	const [keepPlayingWordInView, setKeepPlayingWordInView] = useAtom(
		keepPlayingWordInViewAtom,
	);
	const [highlightUnsyncedWordsInEditor, setHighlightUnsyncedWordsInEditor] =
		useAtom(highlightUnsyncedWordsInEditorAtom);
	const [autoSegmentOnLineSync, setAutoSegmentOnLineSync] = useAtom(
		autoSegmentOnLineSyncAtom,
	);
	const [autoSegmentSyncMode, setAutoSegmentSyncMode] = useAtom(
		autoSegmentSyncModeAtom,
	);
	const [ignoreListText, setIgnoreListText] = useAtom(
		segmentationIgnoreListTextAtom,
	);

	const [compactBGInSync, setCompactBGInSync] = useAtom(compactBGInSyncAtom);
	const [normalizeApostrophesOnImport, setNormalizeApostrophesOnImport] =
		useAtom(normalizeApostrophesOnImportAtom);
	const [normalizeCyrillicEsOnImport, setNormalizeCyrillicEsOnImport] = useAtom(
		normalizeCyrillicEsOnImportAtom,
	);
	const [allowConsecutiveBackgroundLines, setAllowConsecutiveBackgroundLines] =
		useAtom(allowConsecutiveBackgroundLinesAtom);
	const [openSpotMatchAfterSave, setOpenSpotMatchAfterSave] = useAtom(
		openSpotMatchAfterSaveAtom,
	);
	const [geniusCategorizationEnabled, setGeniusCategorizationEnabled] = useAtom(
		geniusCategorizationEnabledAtom,
	);
	const [wrapLyricLines, setWrapLyricLines] = useAtom(wrapLyricLinesAtom);
	const [checklistShowUploadedToDb, setChecklistShowUploadedToDb] = useAtom(
		checklistShowUploadedToDbAtom,
	);

	const { t, i18n } = useTranslation();
	const currentLanguage = i18n.resolvedLanguage || i18n.language;

	const getLanguageName = (code: string) => {
		if (code === "lolcat") return "Lolcat";
		try {
			interface DisplayNamesLike {
				new (
					locales: string | string[],
					options: { type: string },
				): {
					of: (code: string) => string | undefined;
				};
			}
			const DN: DisplayNamesLike | undefined = (
				Intl as unknown as {
					DisplayNames?: DisplayNamesLike;
				}
			).DisplayNames;
			if (DN) {
				const nativeDn = new DN([code], { type: "language" });
				const nativeName = nativeDn.of(code) || code;
				// Capitalize first letter (e.g., français -> Français)
				return nativeName.charAt(0).toUpperCase() + nativeName.slice(1);
			}
		} catch {
			// ignore errors and fallback
		}
		return code;
	};

	const getTranslationProgress = (code: string) => {
		const source = (resources as any)["en-US"]?.translation;
		const target = (resources as any)[code]?.translation;
		if (!source || !target || code === "en-US") return null;

		const countKeys = (obj: any): number => {
			let count = 0;
			for (const key in obj) {
				if (typeof obj[key] === "object") {
					count += countKeys(obj[key]);
				} else {
					count++;
				}
			}
			return count;
		};

		const countTranslatedKeys = (s: any, t: any): number => {
			let count = 0;
			for (const key in s) {
				if (t[key] !== undefined) {
					if (typeof s[key] === "object") {
						count += countTranslatedKeys(s[key], t[key]);
					} else if (t[key] !== s[key] && t[key] !== "") {
						// Only count as translated if it's different from English and not empty
						count++;
					}
				}
			}
			return count;
		};

		const total = countKeys(source);
		const translated = countTranslatedKeys(source, target);
		return Math.floor((translated / total) * 100);
	};

	const showGeneralSection =
		(section === "general" || section === "all") &&
		(shouldShow("general-language") ||
			shouldShow("general-layout") ||
			shouldShow("general-scale") ||
			shouldShow("editor-compact-bg") ||
			shouldShow("editor-word-wrap") ||
			shouldShow("general-latency"));

	const showEditorTimingSection =
		(section === "editor" || section === "all") &&
		(shouldShow("editor-sync-judge") ||
			shouldShow("general-key-trigger") ||
			shouldShow("editor-key-trigger") ||
			shouldShow("editor-sync-offset") ||
			shouldShow("editor-commit-offset") ||
			shouldShow("editor-smart-first-word") ||
			shouldShow("editor-smart-last-word") ||
			shouldShow("editor-split-occupied-word") ||
			shouldShow("editor-auto-split-trailing-space") ||
			shouldShow("editor-auto-segment") ||
			shouldShow("editor-never-split-words"));

	const showEditorVisualSection =
		(section === "editor" || section === "all") &&
		(shouldShow("editor-upcoming-highlight") ||
			shouldShow("editor-unsynced-highlight") ||
			shouldShow("editor-genius-header") ||
			shouldShow("editor-auto-scroll"));

	const showFilesImportSection =
		(section === "files" || section === "all") &&
		(shouldShow("files-apostrophe") ||
			shouldShow("files-cyrillic-es") ||
			shouldShow("editor-consecutive-bg") ||
			shouldShow("files-consecutive-bg") ||
			shouldShow("files-spotmatch-save"));

	const showAudioSection =
		(section === "audio" || section === "all") &&
		(shouldShow("audio-volume") || shouldShow("audio-playback-rate"));

	const showFilesStorageSection =
		(section === "files" || section === "all") &&
		(shouldShow("files-autosave") ||
			shouldShow("files-checklist") ||
			shouldShow("files-cloud-audio") ||
			shouldShow("files-download-audio"));

	if (
		!showGeneralSection &&
		!showEditorTimingSection &&
		!showEditorVisualSection &&
		!showFilesImportSection &&
		!showAudioSection &&
		!showFilesStorageSection
	) {
		return null;
	}

	return (
		<Flex direction="column" gap="4">
			{showGeneralSection && (
				<Flex direction="column" gap="2">
					{(shouldShow("general-language") ||
						shouldShow("general-layout") ||
						shouldShow("general-scale") ||
						shouldShow("editor-compact-bg") ||
						shouldShow("editor-word-wrap") ||
						shouldShow("general-latency")) && (
						<Heading size="4">{t("settings.group.display", "Display")}</Heading>
					)}

					{shouldShow("general-language") && (
						<Card>
							<Flex gap="3" align="center">
								<LocalLanguage24Regular />
								<Box flexGrow="1">
									<Flex align="center" justify="between" gap="4">
										<Flex direction="column" gap="1">
											<Text>
												{t("settings.common.language", "Interface Language")}
											</Text>
											<Text size="1" color="gray">
												{t(
													"settings.common.languageDesc",
													"Select the language for the interface",
												)}
											</Text>
										</Flex>

										<Flex direction="column" gap="2" align="end">
											<Select.Root
												value={currentLanguage}
												onValueChange={(lng) => {
													i18n.changeLanguage(lng).then(() => {
														localStorage.setItem("language", lng);
														if (typeof document !== "undefined") {
															document.documentElement.lang = lng;
														}
													});
												}}
											>
												<Select.Trigger />
												<Select.Content>
													{languageOptions.map((code) => {
														const progress = getTranslationProgress(code);
														return (
															<Select.Item key={code} value={code}>
																<Flex
																	justify="between"
																	gap="4"
																	align="center"
																	style={{ width: "100%" }}
																>
																	<Text>{getLanguageName(code)}</Text>
																	{code === "en-US" ? (
																		<Text size="1" color="gray">
																			(Source)
																		</Text>
																	) : (
																		progress !== null && (
																			<Text
																				size="1"
																				color={
																					progress === 100 ? "green" : "gray"
																				}
																			>
																				{progress}%
																			</Text>
																		)
																	)}
																</Flex>
															</Select.Item>
														);
													})}
												</Select.Content>
											</Select.Root>
										</Flex>
									</Flex>
								</Box>
							</Flex>
						</Card>
					)}

					{shouldShow("general-layout") && (
						<Card>
							<Flex gap="3" align="center">
								<ContentView24Regular />
								<Box flexGrow="1">
									<Flex align="center" justify="between" gap="4">
										<Flex direction="column" gap="1">
											<Text>
												{t("settings.common.layoutMode", "Editor Layout Mode")}
											</Text>
											<Text size="1" color="gray">
												{t(
													"settings.common.layoutModeDesc.line1",
													"Simple layout meets the basic needs of most users",
												)}
												<br />
												{t(
													"settings.common.layoutModeDesc.line2",
													"If you require higher syncing efficiency, consider switching to advanced mode",
												)}
											</Text>
										</Flex>

										<Select.Root
											value={layoutMode}
											onValueChange={(v) => setLayoutMode(v as LayoutMode)}
										>
											<Select.Trigger />
											<Select.Content>
												<Select.Item value={LayoutMode.Simple}>
													{t(
														"settings.common.layoutModeOptions.simple",
														"Simple Mode",
													)}
												</Select.Item>
												<Select.Item value={LayoutMode.Advance}>
													{t(
														"settings.common.layoutModeOptions.advance",
														"Advanced Mode",
													)}
												</Select.Item>
											</Select.Content>
										</Select.Root>
									</Flex>
								</Box>
							</Flex>
						</Card>
					)}

					{shouldShow("general-scale") && <UIScaleSetting />}

					{shouldShow("editor-compact-bg") && (
						<Card>
							<Text as="label">
								<Flex gap="3" align="center">
									<VideoBackgroundEffect24Regular />
									<Box flexGrow="1">
										<Flex gap="2" align="center" justify="between">
											<Flex direction="column" gap="1">
												<Text>
													{t(
														"settings.common.compactBGInSync",
														"Compact Background Vocals (Sync Mode)",
													)}
												</Text>
												<Text size="1" color="gray">
													{t(
														"settings.common.compactBGInSyncDesc",
														"Automatically compress vertical space for background vocal lines during synchronization.",
													)}
												</Text>
											</Flex>
											<Switch
												checked={compactBGInSync}
												onCheckedChange={setCompactBGInSync}
											/>
										</Flex>
									</Box>
								</Flex>
							</Text>
						</Card>
					)}

					{shouldShow("editor-word-wrap") && (
						<Card>
							<Text as="label">
								<Flex gap="3" align="center">
									<TextWrap24Regular />
									<Box flexGrow="1">
										<Flex gap="2" align="center" justify="between">
											<Flex direction="column" gap="1">
												<Text>
													{t(
														"settings.common.wrapLyricLines",
														"Wrap Long Lyric Lines",
													)}
												</Text>
												<Text size="1" color="gray">
													{t(
														"settings.common.wrapLyricLinesDesc",
														"Wrap lyrics to the next line when they exceed the editor width instead of scrolling horizontally.",
													)}
												</Text>
											</Flex>
											<Switch
												checked={wrapLyricLines}
												onCheckedChange={setWrapLyricLines}
											/>
										</Flex>
									</Box>
								</Flex>
							</Text>
						</Card>
					)}

					{shouldShow("general-latency") && (
						<Card>
							<Flex gap="3" align="center" justify="between">
								<Flex gap="3" align="center">
									<Timer24Regular />
									<Flex direction="column" gap="1">
										<Text>
											{t("latencyTestDialog.title", "Audio Latency Test")}
										</Text>
										<Text size="1" color="gray">
											{t(
												"settingsDialog.latencyTestDesc",
												"Calibrate keyboard input delay and timing offset with real-time audio beeps.",
											)}
										</Text>
									</Flex>
								</Flex>
								<Button
									size="1"
									variant="soft"
									onClick={() => setLatencyDialogOpen(true)}
								>
									{t("settings.latency.openTest", "Start Calibration")}
								</Button>
							</Flex>
						</Card>
					)}
				</Flex>
			)}

			{showEditorTimingSection && (
				<Flex direction="column" gap="3">
					{(shouldShow("editor-sync-judge") ||
						shouldShow("general-key-trigger") ||
						shouldShow("editor-key-trigger") ||
						shouldShow("editor-sync-offset") ||
						shouldShow("editor-commit-offset") ||
						shouldShow("editor-smart-first-word") ||
						shouldShow("editor-smart-last-word") ||
						shouldShow("editor-split-occupied-word") ||
						shouldShow("editor-auto-split-trailing-space") ||
						shouldShow("editor-auto-segment") ||
						shouldShow("editor-never-split-words")) && (
						<Heading size="4">{t("settings.group.timing", "Syncing")}</Heading>
					)}

					{shouldShow("editor-sync-judge") && (
						<Card>
							<Flex gap="3" align="center">
								<Timer24Regular />
								<Box flexGrow="1">
									<Flex align="center" justify="between" gap="4">
										<Flex direction="column" gap="1">
											<Text>
												{t(
													"settings.common.syncJudgeMode",
													"Sync Timestamp Judgment Mode",
												)}
											</Text>
											<Text size="1" color="gray">
												{t(
													"settings.common.syncJudgeModeDesc",
													'Set the sync timestamp judgment mode, default is "First Key Down Time".',
												)}
											</Text>
										</Flex>

										<Select.Root
											value={syncJudgeMode}
											onValueChange={(v) =>
												setSyncJudgeMode(v as SyncJudgeMode)
											}
										>
											<Select.Trigger />
											<Select.Content>
												<Select.Item value={SyncJudgeMode.FirstKeyDownTime}>
													{t(
														"settings.common.syncJudgeModeOptions.firstKeyDown",
														"First Key Down Time",
													)}
												</Select.Item>
												<Select.Item value={SyncJudgeMode.LastKeyUpTime}>
													{t(
														"settings.common.syncJudgeModeOptions.lastKeyUp",
														"Last Key Up Time",
													)}
												</Select.Item>
												<Select.Item value={SyncJudgeMode.MiddleKeyTime}>
													{t(
														"settings.common.syncJudgeModeOptions.middleKey",
														"Average of Key Down and Key Up Time",
													)}
												</Select.Item>
												<Select.Item
													value={SyncJudgeMode.FirstKeyDownTimeLegacy}
												>
													{t(
														"settings.common.syncJudgeModeOptions.firstKeyDownLegacy",
														"First Key Down Time (Legacy)",
													)}
												</Select.Item>
											</Select.Content>
										</Select.Root>
									</Flex>
								</Box>
							</Flex>
						</Card>
					)}

					{(shouldShow("general-key-trigger") ||
						shouldShow("editor-key-trigger")) && (
						<Card>
							<Flex gap="3" align="center">
								<Keyboard12324Regular />
								<Box flexGrow="1">
									<Flex align="center" justify="between" gap="4">
										<Flex direction="column" gap="1">
											<Text>
												{t(
													"settings.common.keyBindingTrigger",
													"Keybinding Trigger Timing",
												)}
											</Text>
											<Text size="1" color="gray">
												{t(
													"settings.common.keyBindingTriggerDesc",
													"Whether keybindings are triggered on key down or key up",
												)}
											</Text>
										</Flex>

										<Select.Root
											value={keyBindingTriggerMode}
											onValueChange={(v) =>
												setKeyBindingTriggerMode(v as KeyBindingTriggerMode)
											}
										>
											<Select.Trigger />
											<Select.Content>
												<Select.Item value={KeyBindingTriggerMode.KeyDown}>
													{t(
														"settings.common.keyBindingTriggerOptions.keyDown",
														"Trigger on Key Down",
													)}
												</Select.Item>
												<Select.Item value={KeyBindingTriggerMode.KeyUp}>
													{t(
														"settings.common.keyBindingTriggerOptions.keyUp",
														"Trigger on Key Up",
													)}
												</Select.Item>
											</Select.Content>
										</Select.Root>
									</Flex>
								</Box>
							</Flex>
						</Card>
					)}

					{shouldShow("editor-sync-offset") && (
						<Card>
							<Flex gap="3" align="center">
								<Timer24Regular />
								<Box flexGrow="1">
									<Flex align="center" justify="between" gap="4">
										<Flex direction="column" gap="1">
											<Text>
												{t(
													"settings.common.syncTimeOffset",
													"Global Sync Time Offset (ms)",
												)}
											</Text>
											<Text size="1" color="gray">
												{t(
													"settings.common.syncTimeOffsetDesc",
													"Adjust all sync timestamps by this amount to compensate for audio latency.",
												)}
											</Text>
										</Flex>
										<TextField.Root
											type="number"
											value={syncTimeOffset}
											onChange={(e) =>
												setSyncTimeOffset(
													Number.parseInt(e.target.value, 10) || 0,
												)
											}
										/>
									</Flex>
								</Box>
							</Flex>
						</Card>
					)}

					{shouldShow("editor-commit-offset") && (
						<Card>
							<Flex gap="3" align="center">
								<Timer24Regular />
								<Box flexGrow="1">
									<Flex align="center" justify="between" gap="4">
										<Flex direction="column" gap="1">
											<Text>
												{t(
													"settings.common.syncCommitOffset",
													"Commit Input Offset (ms)",
												)}
											</Text>
											<Text size="1" color="gray">
												{t(
													"settings.common.syncCommitOffsetDesc",
													"Specific offset for the 'Commit' action to fix delayed audio issues.",
												)}
											</Text>
										</Flex>
										<TextField.Root
											type="number"
											value={syncCommitOffset}
											onChange={(e) =>
												setSyncCommitOffset(
													Number.parseInt(e.target.value, 10) || 0,
												)
											}
										/>
									</Flex>
								</Box>
							</Flex>
						</Card>
					)}

					{shouldShow("editor-smart-first-word") && (
						<Card>
							<Text as="label">
								<Flex gap="3" align="center">
									<PaddingLeft24Regular />
									<Box flexGrow="1">
										<Flex gap="2" align="center" justify="between">
											<Flex direction="column" gap="1">
												<Text>
													{t(
														"settings.common.smartFirstWord",
														"Smart First Word",
													)}
												</Text>
												<Text size="1" color="gray">
													{t(
														"settings.common.smartFirstWordDesc",
														"When syncing the first syllable of a line, pressing the Start trigger records its start time but not its end time.",
													)}
												</Text>
											</Flex>
											<Switch
												checked={smartFirstWord}
												onCheckedChange={setSmartFirstWord}
											/>
										</Flex>
									</Box>
								</Flex>
							</Text>
						</Card>
					)}

					{shouldShow("editor-smart-word-anywhere") && (
						<Card>
							<Text as="label">
								<Flex gap="3" align="center">
									<Sparkle24Regular />
									<Box flexGrow="1">
										<Flex gap="2" align="center" justify="between">
											<Flex direction="column" gap="1">
												<Text>
													{t(
														"settings.common.smartWordAnywhere",
														"Smart Word (Any Word)",
													)}
												</Text>
												<Text size="1" color="gray">
													{t(
														"settings.common.smartWordAnywhereDesc",
														"When syncing any word without a start time, pressing the Next key (G) acts as the Start key (F) to set its start time instead of immediately ending it.",
													)}
												</Text>
											</Flex>
											<Switch
												checked={smartWordAnywhere}
												onCheckedChange={setSmartWordAnywhere}
											/>
										</Flex>
									</Box>
								</Flex>
							</Text>
						</Card>
					)}

					{shouldShow("editor-smart-last-word") && (
						<Card>
							<Text as="label">
								<Flex gap="3" align="center">
									<PaddingRight24Regular />
									<Box flexGrow="1">
										<Flex gap="2" align="center" justify="between">
											<Flex direction="column" gap="1">
												<Text>
													{t(
														"settings.common.smartLastWord",
														"Smart Last Word",
													)}
												</Text>
												<Text size="1" color="gray">
													{t(
														"settings.common.smartLastWordDesc",
														"When syncing the last syllable of a line, pressing the End trigger records its end time without starting the next syllable.",
													)}
												</Text>
											</Flex>
											<Switch
												checked={smartLastWord}
												onCheckedChange={setSmartLastWord}
											/>
										</Flex>
									</Box>
								</Flex>
							</Text>
						</Card>
					)}

					{shouldShow("editor-split-occupied-word") && (
						<Card>
							<Text as="label">
								<Flex gap="3" align="center">
									<Cut24Regular />
									<Box flexGrow="1">
										<Flex gap="2" align="center" justify="between">
											<Flex direction="column" gap="1">
												<Text>
													{t(
														"settings.common.splitOccupiedWordAtPlayhead",
														"Split Word at Playhead on Sync",
													)}
												</Text>
												<Text size="1" color="gray">
													{t(
														"settings.common.splitOccupiedWordAtPlayheadDesc",
														"When pressing the Sync Next trigger (G) while the playhead is inside a timed word, update that word's end time to the playhead and start the next word there to prevent timing errors.",
													)}
												</Text>
											</Flex>
											<Switch
												checked={splitOccupiedWordAtPlayhead}
												onCheckedChange={setSplitOccupiedWordAtPlayhead}
											/>
										</Flex>
									</Box>
								</Flex>
							</Text>
						</Card>
					)}

					{shouldShow("editor-auto-split-trailing-space") && (
						<Card>
							<Text as="label">
								<Flex gap="3" align="center">
									<Cut24Regular />
									<Box flexGrow="1">
										<Flex gap="2" align="center" justify="between">
											<Flex direction="column" gap="1">
												<Text>
													{t(
														"settings.common.autoSplitTrailingSpace",
														"Split Trailing Space on Input",
													)}
												</Text>
												<Text size="1" color="gray">
													{t(
														"settings.common.autoSplitTrailingSpaceDesc",
														"Automatically split a trailing space into a dedicated space capsule when editing or typing words.",
													)}
												</Text>
											</Flex>
											<Switch
												checked={autoSplitTrailingSpaceOnInput}
												onCheckedChange={setAutoSplitTrailingSpaceOnInput}
											/>
										</Flex>
									</Box>
								</Flex>
							</Text>
						</Card>
					)}

					{shouldShow("editor-auto-segment") && (
						<Card>
							<Flex direction="column" gap="3">
								<Flex gap="3" align="center">
									<Cut24Regular />
									<Box flexGrow="1">
										<Flex gap="2" align="center" justify="between">
											<Flex direction="column" gap="1">
												<Text>
													{t(
														"settings.common.autoSegmentOnSync",
														"Auto-Segment Single-Word Lines on Timing",
													)}
												</Text>
												<Text size="1" color="gray">
													{t(
														"settings.common.autoSegmentOnSyncDesc",
														"When timing a line that contains only a single word box, automatically split it into words or syllables and distribute the timestamps.",
													)}
												</Text>
											</Flex>
											<Switch
												checked={autoSegmentOnLineSync}
												onCheckedChange={setAutoSegmentOnLineSync}
											/>
										</Flex>
									</Box>
								</Flex>

								{autoSegmentOnLineSync && (
									<Flex
										direction="column"
										gap="2"
										pl="6"
										style={{
											borderTop: "1px solid var(--gray-a4)",
											paddingTop: "8px",
										}}
									>
										<Flex align="center" justify="between" gap="4">
											<Flex direction="column" gap="1">
												<Text size="2">
													{t("settings.common.autoSegmentMode", "Split Type")}
												</Text>
												<Text size="1" color="gray">
													{t(
														"settings.common.autoSegmentModeDesc",
														"Choose whether to split into whole words or syllables.",
													)}
												</Text>
											</Flex>
											<SegmentedControl.Root
												value={autoSegmentSyncMode}
												onValueChange={(v) =>
													setAutoSegmentSyncMode(v as AutoSegmentSyncMode)
												}
												size="1"
											>
												<SegmentedControl.Item value="word">
													{t("settings.common.autoSegmentModeWord", "By Word")}
												</SegmentedControl.Item>
												<SegmentedControl.Item value="syllable">
													{t(
														"settings.common.autoSegmentModeSyllable",
														"By Syllable",
													)}
												</SegmentedControl.Item>
											</SegmentedControl.Root>
										</Flex>
									</Flex>
								)}
							</Flex>
						</Card>
					)}

					{shouldShow("editor-never-split-words") && (
						<Card>
							<Flex direction="column" gap="3">
								<Flex gap="3" align="start">
									<TextWrap24Regular style={{ marginTop: 2, flexShrink: 0 }} />
									<Box flexGrow="1">
										<Flex direction="column" gap="1">
											<Text weight="medium">
												{t(
													"settings.common.neverSplitWords",
													"Words to Never Split",
												)}
											</Text>
											<Text size="1" color="gray">
												{t(
													"settings.common.neverSplitWordsDesc",
													"Words listed here will never be split into syllables or segments across all songs in the app. Separate words with newlines or commas.",
												)}
											</Text>
											<Box mt="2">
												<TextArea
													placeholder={t(
														"settings.common.neverSplitWordsPlaceholder",
														"e.g. baby, forever, superman (one word per line or comma-separated)",
													)}
													value={ignoreListText}
													onChange={(e) => setIgnoreListText(e.target.value)}
													style={{ minHeight: 90, resize: "vertical" }}
												/>
											</Box>
										</Flex>
									</Box>
								</Flex>
							</Flex>
						</Card>
					)}
				</Flex>
			)}

			{showEditorVisualSection && (
				<Flex direction="column" gap="3">
					{(shouldShow("editor-upcoming-highlight") ||
						shouldShow("editor-unsynced-highlight")) && (
						<>
							<Heading size="4">
								{t(
									"settings.group.timingHighlight",
									"Visual Timing Cue (Sync)",
								)}
							</Heading>
							<Card>
								<Text as="label">
									<Flex gap="3" align="center">
										<ContentView24Regular />
										<Box flexGrow="1">
											<Flex gap="2" align="center" justify="between">
												<Flex direction="column" gap="1">
													<Text>
														{t(
															"settings.common.highlightUnsyncedWordsInEditor",
															"Highlight Unsynced Words in Red",
														)}
													</Text>
													<Text size="1" color="gray">
														{t(
															"settings.common.highlightUnsyncedWordsInEditorDesc",
															"Displays non-synced words with a red tint in the editor and time tabs, matching the preview display.",
														)}
													</Text>
												</Flex>
												<Switch
													checked={highlightUnsyncedWordsInEditor}
													onCheckedChange={setHighlightUnsyncedWordsInEditor}
												/>
											</Flex>
										</Box>
									</Flex>
								</Text>
							</Card>
							<Card>
								<Text as="label">
									<Flex gap="3" align="center">
										<Timer24Regular />
										<Box flexGrow="1">
											<Flex gap="2" align="center" justify="between">
												<Flex direction="column" gap="1">
													<Text>
														{t(
															"settings.common.enableUpcomingWordHighlight",
															"Enable Upcoming Word Pre-Highlight",
														)}
													</Text>
													<Text size="1" color="gray">
														{t(
															"settings.common.enableUpcomingWordHighlightDesc",
															"Fades in a highlight color shortly before a word plays during Sync mode to improve precision.",
														)}
													</Text>
												</Flex>
												<Switch
													checked={enableUpcomingWordHighlight}
													onCheckedChange={setEnableUpcomingWordHighlight}
												/>
											</Flex>
										</Box>
									</Flex>
								</Text>
							</Card>
							<Card>
								<Flex gap="3" align="center">
									<Timer24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="2" align="start">
											<Text>
												{t(
													"settings.common.upcomingWordHighlightThreshold",
													"Pre-Highlight Time Threshold (ms)",
												)}
											</Text>
											<TextField.Root
												type="number"
												disabled={!enableUpcomingWordHighlight}
												value={upcomingWordHighlightThreshold}
												onChange={(e) =>
													setUpcomingWordHighlightThreshold(
														Math.max(
															0,
															Number.parseInt(e.target.value, 10) || 0,
														),
													)
												}
											/>
										</Flex>
									</Box>
								</Flex>
							</Card>
							<Card>
								<Flex gap="3" align="center">
									<ContentView24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="2" align="start">
											<Text>
												{t(
													"settings.common.upcomingWordHighlightColor",
													"Highlight Color (CSS Value)",
												)}
											</Text>
											<TextField.Root
												disabled={!enableUpcomingWordHighlight}
												value={upcomingWordHighlightColor}
												onChange={(e) =>
													setUpcomingWordHighlightColor(e.target.value)
												}
											/>
										</Flex>
									</Box>
								</Flex>
							</Card>
						</>
					)}

					{shouldShow("editor-genius-header") && (
						<>
							<Heading size="4">
								{t("settings.group.songSections", "Song Sections")}
							</Heading>
							<Card>
								<Text as="label">
									<Flex gap="3" align="center">
										<ContentView24Regular />
										<Box flexGrow="1">
											<Flex gap="2" align="center" justify="between">
												<Flex direction="column" gap="1">
													<Text>
														{t(
															"settings.common.geniusCategorization",
															"Genius Header Categorization",
														)}
													</Text>
													<Text size="1" color="gray">
														{t(
															"settings.common.geniusCategorizationDesc",
															"Detect, categorize, navigate, and edit song section headers.",
														)}
													</Text>
												</Flex>
												<Switch
													checked={geniusCategorizationEnabled}
													onCheckedChange={setGeniusCategorizationEnabled}
												/>
											</Flex>
										</Box>
									</Flex>
								</Text>
							</Card>
						</>
					)}

					{shouldShow("editor-auto-scroll") && (
						<>
							<Heading size="4">
								{t("settings.group.playbackScroll", "Playback & Navigation")}
							</Heading>
							<Card>
								<Text as="label">
									<Flex gap="3" align="center">
										<ContentView24Regular />
										<Box flexGrow="1">
											<Flex gap="2" align="center" justify="between">
												<Flex direction="column" gap="1">
													<Text>
														{t(
															"settings.common.keepPlayingWordInView",
															"Always Keep Playing Word in View",
														)}
													</Text>
													<Text size="1" color="gray">
														{t(
															"settings.common.keepPlayingWordInViewDesc",
															"Automatically scrolls the lyric editor during playback to keep the active line and playing word visible.",
														)}
													</Text>
												</Flex>
												<Switch
													checked={keepPlayingWordInView}
													onCheckedChange={setKeepPlayingWordInView}
												/>
											</Flex>
										</Box>
									</Flex>
								</Text>
							</Card>
						</>
					)}
				</Flex>
			)}

			{showFilesImportSection && (
				<Flex direction="column" gap="2">
					{(shouldShow("files-apostrophe") ||
						shouldShow("files-cyrillic-es") ||
						shouldShow("editor-consecutive-bg") ||
						shouldShow("files-consecutive-bg") ||
						shouldShow("files-spotmatch-save")) && (
						<Heading size="4">
							{t("settings.group.import", "Import & export")}
						</Heading>
					)}

					{shouldShow("files-apostrophe") && (
						<Card>
							<Text as="label">
								<Flex gap="3" align="center">
									<ContentView24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="1">
											<Flex align="center" justify="between" gap="4">
												<Text>
													{t(
														"settings.common.normalizeApostrophesOnImport",
														"Normalize apostrophes",
													)}
												</Text>
												<Switch
													checked={normalizeApostrophesOnImport}
													onCheckedChange={setNormalizeApostrophesOnImport}
												/>
											</Flex>
											<Text size="1" color="gray">
												{t(
													"settings.common.normalizeApostrophesOnImportDesc",
													"Convert curly and other apostrophe-like characters during import and export.",
												)}
											</Text>
										</Flex>
									</Box>
								</Flex>
							</Text>
						</Card>
					)}

					{shouldShow("files-cyrillic-es") && (
						<Card>
							<Text as="label">
								<Flex gap="3" align="center">
									<ContentView24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="1">
											<Flex align="center" justify="between" gap="4">
												<Text>
													{t(
														"settings.common.normalizeCyrillicEsOnImport",
														"Fix isolated Cyrillic Е/е in Latin words",
													)}
												</Text>
												<Switch
													checked={normalizeCyrillicEsOnImport}
													onCheckedChange={setNormalizeCyrillicEsOnImport}
												/>
											</Flex>
											<Text size="1" color="gray">
												{t(
													"settings.common.normalizeCyrillicEsOnImportDesc",
													"Correct hidden Cyrillic lookalikes in Latin words during import and export.",
												)}
											</Text>
										</Flex>
									</Box>
								</Flex>
							</Text>
						</Card>
					)}

					{(shouldShow("editor-consecutive-bg") ||
						shouldShow("files-consecutive-bg")) && (
						<Card>
							<Text as="label">
								<Flex gap="3" align="center">
									<Stack24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="1">
											<Flex align="center" justify="between" gap="4">
												<Text>
													{t(
														"settings.common.allowConsecutiveBackgroundLines",
														"Allow consecutive and standalone background vocals",
													)}
												</Text>
												<Switch
													checked={allowConsecutiveBackgroundLines}
													onCheckedChange={setAllowConsecutiveBackgroundLines}
												/>
											</Flex>
											<Text size="1" color="gray">
												{t(
													"settings.common.allowConsecutiveBackgroundLinesDesc",
													"Export consecutive background vocals together and preserve standalone background vocals for Spicy Lyrics compatibility. Other players may not support this structure.",
												)}
											</Text>
										</Flex>
									</Box>
								</Flex>
							</Text>
						</Card>
					)}

					{shouldShow("files-spotmatch-save") && (
						<Card>
							<Text as="label">
								<Flex gap="3" align="center">
									<Sparkle24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="1">
											<Flex align="center" justify="between" gap="4">
												<Text>
													{t(
														"settings.common.openSpotMatchAfterSave",
														"Open SpotMatch after saving",
													)}
												</Text>
												<Switch
													checked={openSpotMatchAfterSave}
													onCheckedChange={setOpenSpotMatchAfterSave}
												/>
											</Flex>
											<Text size="1" color="gray">
												{t(
													"settings.common.openSpotMatchAfterSaveDesc",
													"Automatically open the SpotMatch track finder after saving a TTML file with Ctrl+S or Cmd+S.",
												)}
											</Text>
										</Flex>
									</Box>
								</Flex>
							</Text>
						</Card>
					)}
				</Flex>
			)}

			{showAudioSection && (
				<Flex direction="column" gap="2">
					{(shouldShow("audio-volume") ||
						shouldShow("audio-playback-rate")) && (
						<Heading size="4">
							{t("settings.group.playback", "Playback")}
						</Heading>
					)}

					{shouldShow("audio-volume") && (
						<Card>
							<Flex gap="3" align="center">
								<Speaker224Regular />
								<Box flexGrow="1">
									<Flex direction="column" gap="2" align="start">
										<Flex
											align="center"
											justify="between"
											style={{ alignSelf: "stretch" }}
										>
											<Text>{t("settings.common.volume", "Music Volume")}</Text>
											<Text wrap="nowrap" color="gray" size="1">
												{(volume * 100).toFixed()}%
											</Text>
										</Flex>
										<Slider
											min={0}
											max={1}
											defaultValue={[volume]}
											step={0.01}
											onValueChange={(v) => setVolume(v[0])}
										/>
									</Flex>
								</Box>
							</Flex>
						</Card>
					)}

					{shouldShow("audio-playback-rate") && (
						<Card>
							<Flex gap="3" align="center">
								<TopSpeed24Regular />
								<Box flexGrow="1">
									<Flex direction="column" gap="2" align="start">
										<Flex
											align="center"
											justify="between"
											style={{ alignSelf: "stretch" }}
										>
											<Text>
												{t("settings.common.playbackRate", "Playback Speed")}
											</Text>
											<Text wrap="nowrap" color="gray" size="1">
												{playbackRate.toFixed(2)}x
											</Text>
										</Flex>
										<Slider
											min={0.1}
											max={2}
											defaultValue={[playbackRate]}
											step={0.05}
											onValueChange={(v) => setPlaybackRate(v[0])}
										/>
									</Flex>
								</Box>
							</Flex>
						</Card>
					)}
				</Flex>
			)}

			{showFilesStorageSection && (
				<Flex direction="column" gap="2">
					{shouldShow("files-autosave") && (
						<>
							<Heading size="4">
								{t("settings.group.autosave", "Auto Save")}
							</Heading>

							<Card>
								<Text as="label">
									<Flex gap="3" align="center">
										<Save24Regular />
										<Box flexGrow="1">
											<Flex gap="2" align="center" justify="between">
												<Text>
													{t(
														"settings.common.autosave.enable",
														"Enable Auto Save",
													)}
												</Text>
												<Switch
													checked={autosaveEnabled}
													onCheckedChange={setAutosaveEnabled}
												/>
											</Flex>
										</Box>
									</Flex>
								</Text>
							</Card>

							<Card>
								<Flex gap="3" align="center">
									<History24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="2" align="start">
											<Flex
												align="center"
												justify="between"
												style={{ alignSelf: "stretch" }}
											>
												<Text>
													{t(
														"settings.common.autosave.interval",
														"Save Interval",
													)}
												</Text>
												<Text wrap="nowrap" color="gray" size="1">
													{autosaveInterval} {t("time.minutes", "min")}
												</Text>
											</Flex>
											<Slider
												min={1}
												max={60}
												disabled={!autosaveEnabled}
												value={[autosaveInterval]}
												step={1}
												onValueChange={(v) => setAutosaveInterval(v[0])}
											/>
											<Flex gap="1" wrap="wrap" mt="1">
												{[1, 2, 5, 10, 15, 30].map((mins) => (
													<Button
														key={mins}
														size="1"
														variant={
															autosaveInterval === mins ? "solid" : "soft"
														}
														disabled={!autosaveEnabled}
														onClick={() => setAutosaveInterval(mins)}
													>
														{mins}m
													</Button>
												))}
											</Flex>
										</Flex>
									</Box>
								</Flex>
							</Card>

							<Card>
								<Flex gap="3" align="center">
									<Stack24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="2" align="start">
											<Flex
												align="center"
												justify="between"
												style={{ alignSelf: "stretch" }}
											>
												<Text>
													{t(
														"settings.common.autosave.limit",
														"Snapshots to keep",
													)}
												</Text>
												<Text wrap="nowrap" color="gray" size="1">
													{autosaveLimit}
												</Text>
											</Flex>
											<Slider
												min={1}
												max={50}
												disabled={!autosaveEnabled}
												value={[autosaveLimit]}
												step={1}
												onValueChange={(v) => setAutosaveLimit(v[0])}
											/>
										</Flex>
									</Box>
								</Flex>
							</Card>
						</>
					)}

					{shouldShow("files-checklist") && (
						<>
							<Heading size="4" mt="4">
								{t("settings.group.checklist", "TTML Checklist")}
							</Heading>

							<Card>
								<Text as="label">
									<Flex gap="3" align="center">
										<Database24Regular />
										<Box flexGrow="1">
											<Flex gap="2" align="center" justify="between">
												<Flex direction="column" gap="1">
													<Text>
														{t(
															"settings.common.checklist.showUploadedToDb",
															"Show 'Mark as uploaded to database' button",
														)}
													</Text>
													<Text size="1" color="gray">
														{t(
															"settings.common.checklist.showUploadedToDbDesc",
															"Displays a button on each checklist item to track whether the song has been uploaded to the database.",
														)}
													</Text>
												</Flex>
												<Switch
													checked={checklistShowUploadedToDb}
													onCheckedChange={setChecklistShowUploadedToDb}
												/>
											</Flex>
										</Box>
									</Flex>
								</Text>
							</Card>
						</>
					)}

					{(shouldShow("files-cloud-audio") ||
						shouldShow("files-download-audio")) && (
						<Heading size="4" mt="4">
							{t("settings.group.cloud", "Cloud saves")}
						</Heading>
					)}

					{shouldShow("files-cloud-audio") && (
						<Card>
							<Text as="label">
								<Flex gap="3" align="center">
									<Cloud24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="1">
											<Flex align="center" justify="between" gap="4">
												<Flex align="center" gap="2">
													<Text>
														{t(
															"settings.common.autoLoadCloudAudio",
															"Load audio when opening cloud saves",
														)}
													</Text>
													<Badge color="orange" size="1" variant="soft">
														Beta
													</Badge>
												</Flex>
												<Switch
													checked={autoLoadCloudAudio}
													onCheckedChange={setAutoLoadCloudAudio}
												/>
											</Flex>
											<Text size="1" color="gray">
												{t(
													"settings.common.autoLoadCloudAudioDesc",
													"Automatically load attached audio or match local audio files when loading from cloud saves.",
												)}
											</Text>
										</Flex>
									</Box>
								</Flex>
							</Text>
						</Card>
					)}

					{shouldShow("files-download-audio") && (
						<Card>
							<Text as="label">
								<Flex gap="3" align="center">
									<ArrowDownload24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="1">
											<Flex align="center" justify="between" gap="4">
												<Flex align="center" gap="2">
													<Text>
														{t(
															"settings.common.downloadAudioOnLyricImport",
															"Download audio when importing lyrics",
														)}
													</Text>
													<Badge color="orange" size="1" variant="soft">
														Beta
													</Badge>
												</Flex>
												<Switch
													checked={downloadAudioOnLyricImport}
													onCheckedChange={setDownloadAudioOnLyricImport}
												/>
											</Flex>
											<Text size="1" color="gray">
												{t(
													"settings.common.downloadAudioOnLyricImportDesc",
													"Automatically search and download matching audio into the app when importing lyrics.",
												)}
											</Text>
										</Flex>
									</Box>
								</Flex>
							</Text>
						</Card>
					)}
				</Flex>
			)}
		</Flex>
	);
};
