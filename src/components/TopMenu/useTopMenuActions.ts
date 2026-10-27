import { openExternal } from "$/utils/openExternal";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useSetImmerAtom, withImmer } from "jotai-immer";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { uid } from "uid";
import { useFileOpener } from "$/hooks/useFileOpener.ts";
import { audioEngine } from "$/modules/audio/audio-engine";
import { currentTimeAtom } from "$/modules/audio/states/index.ts";
import {
	cloudFileManagerInitialTabAtom,
	cloudFileManagerOpenAtom,
} from "$/modules/cloud/states";
import { applyAutoDuetBySinger } from "$/modules/lyric-editor/utils/auto-duet.ts";
import { getSynchronizableUnits } from "$/modules/lyric-editor/utils/lyric-states.ts";
import { notifySectionIssues } from "$/modules/lyric-editor/utils/notify-section-issues.tsx";
import { validateSections } from "$/modules/lyric-editor/utils/section-system.ts";
import exportTTMLText from "$/modules/project/logic/ttml-writer";
import {
	segmentationEngineAtom,
	segmentationSplitEnglishAtom,
} from "$/modules/segmentation/states";
import { matchesSavedSyllabificationEngine } from "$/modules/segmentation/utils/detect-syllabification-engine";
import {
	segmentLyricLines,
	segmentWord,
} from "$/modules/segmentation/utils/segmentation";
import { SYLLABIFICATION_ENGINES } from "$/modules/segmentation/utils/syllabification-engines";
import { useSegmentationConfig } from "$/modules/segmentation/utils/useSegmentationConfig";
import { removeWordsFromLine } from "$/modules/lyric-editor/utils/normalize-line-time";
import {
	allowConsecutiveBackgroundLinesAtom,
	lyricTextNormalizationOptionsAtom,
	openSpotMatchAfterSaveAtom,
} from "$/modules/settings/states";
import {
	advancedSegmentationDialogAtom,
	autoSegmentDialogAtom,
	confirmDialogAtom,
	findReplaceStateAtom,
	historyRestoreDialogAtom,
	latencyTestDialogAtom,
	learnedSplitsDialogAtom,
	metadataEditorDialogAtom,
	openAccountSettingsAtom,
	settingsDialogAtom,
	spotMatchDialogAtom,
	spotMatchInitialTrackIdAtom,
	timeShiftDialogAtom,
	timeStretchDialogAtom,
	ttmlChecklistDialogAtom,
	jooxAudioSearchDialogAtom,
} from "$/states/dialogs.ts";
import { grammarCheckDialogAtom } from "$/modules/lyric-editor/modals/GrammarCheckDialog.tsx";
import {
	keyAutoSegmentAtom,
	keyDeleteSelectionAtom,
	keyFindAtom,
	keyNewFileAtom,
	keyNewWindowAtom,
	keyOpenFileAtom,
	keyRedoAtom,
	keyReplaceAtom,
	keySaveFileAtom,
	keySelectAllAtom,
	keySelectInvertedAtom,
	keySelectWordsOfMatchedSelectionAtom,
	keySpotMatchAtom,
	keyTtmlChecklistAtom,
	keyUndoAtom,
} from "$/states/keybindings.ts";
import {
	isDirtyAtom,
	lyricLinesAtom,
	markSavedAtom,
	newLyricLinesAtom,
	projectIdAtom,
	redoLyricLinesAtom,
	saveFileNameAtom,
	selectedLinesAtom,
	selectedWordsAtom,
	undoableLyricLinesAtom,
	undoLyricLinesAtom,
} from "$/states/main.ts";
import { type LyricWord, type LyricWordBase, newLyricWord } from "$/types/ttml";
import { openFileWithDialog } from "$/utils/fileDialog.ts";
import { saveFile } from "$/utils/fileSystem.ts";
import { error, log } from "$/utils/logging.ts";
import { createHistoryActionGate } from "./history-action-gate";

export const useTopMenuActions = () => {
	const { t } = useTranslation();
	const [saveFileName, setSaveFileName] = useAtom(saveFileNameAtom);
	const newLyricLine = useSetAtom(newLyricLinesAtom);
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const setMetadataEditorOpened = useSetAtom(metadataEditorDialogAtom);
	const setSettingsDialogOpened = useSetAtom(settingsDialogAtom);
	const undoLyricLines = useAtomValue(undoableLyricLinesAtom);
	const store = useStore();
	const isDirty = useAtomValue(isDirtyAtom);
	const setConfirmDialog = useSetAtom(confirmDialogAtom);
	const setHistoryRestoreDialog = useSetAtom(historyRestoreDialogAtom);
	const setAdvancedSegmentationDialog = useSetAtom(
		advancedSegmentationDialogAtom,
	);
	const setAutoSegmentDialog = useSetAtom(autoSegmentDialogAtom);
	const savedSegmentationEngine = useAtomValue(segmentationEngineAtom);
	const setSplitEnglish = useSetAtom(segmentationSplitEnglishAtom);
	const setLearnedSplitsDialog = useSetAtom(learnedSplitsDialogAtom);
	const setTimeShiftDialog = useSetAtom(timeShiftDialogAtom);
	const setTimeStretchDialog = useSetAtom(timeStretchDialogAtom);
	const setTTMLChecklistDialog = useSetAtom(ttmlChecklistDialogAtom);
	const setGrammarCheckDialog = useSetAtom(grammarCheckDialogAtom);
	const setSpotMatchDialog = useSetAtom(spotMatchDialogAtom);
	const { openFile } = useFileOpener();
	const setProjectId = useSetAtom(projectIdAtom);
	const { config: segmentationConfig } = useSegmentationConfig();
	const lyricLines = useAtomValue(lyricLinesAtom);
	const newFileKey = useAtomValue(keyNewFileAtom);
	const newWindowKey = useAtomValue(keyNewWindowAtom);
	const openFileKey = useAtomValue(keyOpenFileAtom);
	const saveFileKey = useAtomValue(keySaveFileAtom);
	const undoKey = useAtomValue(keyUndoAtom);
	const redoKey = useAtomValue(keyRedoAtom);
	const selectAllLinesKey = useAtomValue(keySelectAllAtom);
	const selectInvertedLinesKey = useAtomValue(keySelectInvertedAtom);
	const selectWordsOfMatchedSelectionKey = useAtomValue(
		keySelectWordsOfMatchedSelectionAtom,
	);
	const findKey = useAtomValue(keyFindAtom);
	const replaceKey = useAtomValue(keyReplaceAtom);
	const deleteSelectionKey = useAtomValue(keyDeleteSelectionAtom);
	const autoSegmentKey = useAtomValue(keyAutoSegmentAtom);
	const spotMatchKey = useAtomValue(keySpotMatchAtom);
	const ttmlChecklistKey = useAtomValue(keyTtmlChecklistAtom);
	const runHistoryAction = useMemo(
		() => createHistoryActionGate(requestAnimationFrame),
		[],
	);

	const buildRubySegments = useCallback(
		(text: string, baseWord: LyricWordBase) => {
			const sourceWord: LyricWord = {
				...newLyricWord(),
				word: text,
				startTime: baseWord.startTime,
				endTime: baseWord.endTime,
			};
			const segments = segmentWord(sourceWord, segmentationConfig);
			if (segments.length === 0) {
				return [
					{
						word: text,
						startTime: baseWord.startTime,
						endTime: baseWord.endTime,
					},
				];
			}
			return segments.map((segment) => ({
				word: segment.word,
				startTime: segment.startTime,
				endTime: segment.endTime,
			}));
		},
		[segmentationConfig],
	);

	const onNewFile = useCallback(() => {
		const action = () => {
			newLyricLine();
			audioEngine.unloadMusic();
			setProjectId(uid());
			setSaveFileName("lyric.ttml");
		};

		if (isDirty) {
			setConfirmDialog({
				open: true,
				title: t("confirmDialog.newFile.title", "Confirm New File"),
				description: t(
					"confirmDialog.newFile.description",
					"You have unsaved changes. If you proceed, these changes will be lost. Are you sure you want to create a new file?",
				),
				onConfirm: action,
			});
		} else {
			action();
		}
	}, [
		isDirty,
		newLyricLine,
		setConfirmDialog,
		t,
		setProjectId,
		setSaveFileName,
	]);

	const onNewWindow = useCallback(async () => {
		if (import.meta.env.TAURI_ENV_PLATFORM) {
			try {
				const { invoke } = await import("@tauri-apps/api/core");
				await invoke("create_new_window");
			} catch (e) {
				console.error("Failed to create new window via Tauri:", e);
			}
		} else {
			window.open(window.location.origin + window.location.pathname, "_blank");
		}
	}, []);

	const onOpenFile = useCallback(async () => {
		const file = await openFileWithDialog({
			multiple: false,
			filters: [
				{
					name: "Lyric/Audio files",
					extensions: [
						"ttml",
						"lrc",
						"qrc",
						"eslrc",
						"lys",
						"yrc",
						"mp3",
						"flac",
						"wav",
						"ogg",
						"m4a",
						"opus",
						"webm",
					],
				},
			],
		});
		if (!file || Array.isArray(file)) return;
		openFile(file);
	}, [openFile]);

	const onOpenFileFromClipboard = useCallback(async () => {
		try {
			const ttmlText = await navigator.clipboard.readText();
			const file = new File([ttmlText], "lyric.ttml", {
				type: "application/xml",
			});
			openFile(file);
		} catch (e) {
			error("Failed to parse TTML file from clipboard", e);
		}
	}, [openFile]);

	const onSaveFile = useCallback(async () => {
		const action = async () => {
			try {
				const currentLyrics = store.get(lyricLinesAtom);
				notifySectionIssues(currentLyrics);
				const ttmlText = exportTTMLText(
					currentLyrics,
					store.get(lyricTextNormalizationOptionsAtom),
					{
						allowConsecutiveBackgroundLines: store.get(
							allowConsecutiveBackgroundLinesAtom,
						),
					},
				);
				const savedName = await saveFile(ttmlText, {
					suggestedName: saveFileName,
					types: [
						{
							description: "TTML Files",
							accept: { "application/ttml+xml": [".ttml"] },
						},
					],
				});
				if (savedName) {
					setSaveFileName(savedName);
					store.set(markSavedAtom);

					try {
						const { recordTTMLCompletion } = await import(
							"$/modules/project/timer/project-timer"
						);
						const metadata = currentLyrics.metadata || [];
						const title =
							metadata.find((m) => (m.key || "").toLowerCase() === "title")
								?.value[0] || savedName.replace(/\.[^.]*$/, "");
						const artist =
							metadata.find((m) => (m.key || "").toLowerCase() === "artist")
								?.value[0] || "";
						const projectId = store.get(projectIdAtom);
						await recordTTMLCompletion({
							projectId,
							title,
							artist,
							lineCount: currentLyrics.lyricLines.length,
						});
					} catch {
						// ignore
					}

					if (store.get(openSpotMatchAfterSaveAtom)) {
						const metadata = currentLyrics.metadata || [];
						const spotifyMeta = metadata.find((m) => {
							const k = (m.key || (m as any).name || "").toLowerCase();
							return (
								k === "spotifyid" ||
								k === "spotify:track_id" ||
								k === "spotify"
							);
						});
						const rawId = Array.isArray(spotifyMeta?.value)
							? spotifyMeta?.value[0]
							: (spotifyMeta?.value as unknown as string);
						if (rawId && typeof rawId === "string" && rawId.trim()) {
							store.set(spotMatchInitialTrackIdAtom, rawId.trim());
						}
						store.set(spotMatchDialogAtom, true);
					}
				}
			} catch (e) {
				error("Failed to save TTML file", e);
			}
		};

		const lyrics = store.get(lyricLinesAtom);
		const firstUntimedLine = lyrics.lyricLines.find(
			(line) => line.endTime === 0 && getSynchronizableUnits(line).length > 0,
		);
		let untimedWord: LyricWord | undefined;
		let untimedLine: import("$/types/ttml").LyricLine | undefined;

		if (firstUntimedLine) {
			untimedLine = firstUntimedLine;
			untimedWord = getSynchronizableUnits(firstUntimedLine)[0].word;
		} else {
			untimedLine = lyrics.lyricLines.find((line) =>
				getSynchronizableUnits(line).some((u) => u.word.endTime === 0),
			);
			if (untimedLine) {
				untimedWord = getSynchronizableUnits(untimedLine).find(
					(u) => u.word.endTime === 0,
				)?.word;
			}
		}

		if (untimedLine && untimedWord) {
			setConfirmDialog({
				open: true,
				title: t(
					"confirmDialog.untimedLyrics.title",
					"Untimed Lyrics Detected",
				),
				description: t(
					"confirmDialog.untimedLyrics.description",
					"There is an untimed line or word in your lyrics. Would you like to fix it or export anyway?",
				),
				confirmText: t(
					"confirmDialog.untimedLyrics.exportAnyway",
					"Export Anyway",
				),
				cancelText: t("confirmDialog.untimedLyrics.fixIt", "Fix It"),
				onConfirm: action,
				onCancel: () => {
					store.set(selectedLinesAtom, new Set([untimedLine!.id]));
					store.set(selectedWordsAtom, new Set([untimedWord!.id]));
					audioEngine.seekMusic(untimedLine!.startTime / 1000);
					store.set(currentTimeAtom, untimedLine!.startTime);
				},
			});
		} else {
			action();
		}
	}, [saveFileName, store, setSaveFileName, setConfirmDialog, t]);

	const onOpenHistoryRestore = useCallback(() => {
		setHistoryRestoreDialog(true);
	}, [setHistoryRestoreDialog]);

	const onSaveFileToClipboard = useCallback(async () => {
		const action = async () => {
			try {
				const lyric = store.get(lyricLinesAtom);
				notifySectionIssues(lyric);
				const ttml = exportTTMLText(
					lyric,
					store.get(lyricTextNormalizationOptionsAtom),
					{
						allowConsecutiveBackgroundLines: store.get(
							allowConsecutiveBackgroundLinesAtom,
						),
					},
				);
				await navigator.clipboard.writeText(ttml);
			} catch (e) {
				error("Failed to save TTML file into clipboard", e);
			}
		};

		const lyrics = store.get(lyricLinesAtom);
		const firstUntimedLine = lyrics.lyricLines.find(
			(line) => line.endTime === 0 && getSynchronizableUnits(line).length > 0,
		);
		let untimedWord: LyricWord | undefined;
		let untimedLine: import("$/types/ttml").LyricLine | undefined;

		if (firstUntimedLine) {
			untimedLine = firstUntimedLine;
			untimedWord = getSynchronizableUnits(firstUntimedLine)[0].word;
		} else {
			untimedLine = lyrics.lyricLines.find((line) =>
				getSynchronizableUnits(line).some((u) => u.word.endTime === 0),
			);
			if (untimedLine) {
				untimedWord = getSynchronizableUnits(untimedLine).find(
					(u) => u.word.endTime === 0,
				)?.word;
			}
		}

		if (untimedLine && untimedWord) {
			setConfirmDialog({
				open: true,
				title: t(
					"confirmDialog.untimedLyrics.title",
					"Untimed Lyrics Detected",
				),
				description: t(
					"confirmDialog.untimedLyrics.description",
					"There is an untimed line or word in your lyrics. Would you like to fix it or export anyway?",
				),
				confirmText: t(
					"confirmDialog.untimedLyrics.exportAnyway",
					"Export Anyway",
				),
				cancelText: t("confirmDialog.untimedLyrics.fixIt", "Fix It"),
				onConfirm: action,
				onCancel: () => {
					store.set(selectedLinesAtom, new Set([untimedLine!.id]));
					store.set(selectedWordsAtom, new Set([untimedWord!.id]));
					audioEngine.seekMusic(untimedLine!.startTime / 1000);
					store.set(currentTimeAtom, untimedLine!.startTime);
				},
			});
		} else {
			action();
		}
	}, [store, setConfirmDialog, t]);

	const onOpenMetadataEditor = useCallback(() => {
		setMetadataEditorOpened(true);
	}, [setMetadataEditorOpened]);

	const onOpenSettings = useCallback(() => {
		setSettingsDialogOpened(true);
	}, [setSettingsDialogOpened]);

	const onOpenLatencyTest = useCallback(() => {
		store.set(latencyTestDialogAtom, true);
	}, [store]);

	const onOpenTTMLChecklist = useCallback(() => {
		setTTMLChecklistDialog(true);
	}, [setTTMLChecklistDialog]);

	const onOpenGrammarCheck = useCallback(() => {
		setGrammarCheckDialog(true);
	}, [setGrammarCheckDialog]);

	const onOpenStatsAndProfiles = useCallback(async () => {
		await openExternal("https://ttml.bobjoerules.com/#stats");
	}, []);

	const onOpenSpotMatch = useCallback(() => {
		setSpotMatchDialog(true);
	}, [setSpotMatchDialog]);

	const onOpenGitHub = useCallback(async () => {
		await openExternal("https://github.com/bobjoerules/AMLL-TTML-TOOL");
	}, []);

	const onOpenWiki = useCallback(async () => {
		await openExternal("https://guide.spicylyrics.org/");
	}, []);

	const onUndo = useCallback(() => {
		if (!store.get(undoableLyricLinesAtom).canUndo) return;
		runHistoryAction(() => store.set(undoLyricLinesAtom));
	}, [runHistoryAction, store]);

	const onRedo = useCallback(() => {
		if (!store.get(undoableLyricLinesAtom).canRedo) return;
		runHistoryAction(() => store.set(redoLyricLinesAtom));
	}, [runHistoryAction, store]);

	const onUnselectAll = useCallback(() => {
		const immerSelectedLinesAtom = withImmer(selectedLinesAtom);
		const immerSelectedWordsAtom = withImmer(selectedWordsAtom);
		store.set(immerSelectedLinesAtom, (old) => {
			old.clear();
		});
		store.set(immerSelectedWordsAtom, (old) => {
			old.clear();
		});
	}, [store]);

	const onSelectAll = useCallback(() => {
		const lines = store.get(lyricLinesAtom).lyricLines;
		const selectedLineIds = store.get(selectedLinesAtom);
		const selectedLines = lines.filter((l) => selectedLineIds.has(l.id));
		const selectedWordIds = store.get(selectedWordsAtom);
		const selectedWords = lines
			.flatMap((l) => l.words)
			.filter((w) => selectedWordIds.has(w.id));
		if (selectedWords.length > 0) {
			const tmpWordIds = new Set(selectedWordIds);
			for (const selLine of selectedLines) {
				for (const word of selLine.words) {
					tmpWordIds.delete(word.id);
				}
			}
			if (tmpWordIds.size === 0) {
				store.set(
					selectedWordsAtom,
					new Set(selectedLines.flatMap((line) => line.words.map((w) => w.id))),
				);
				return;
			}
		} else {
			store.set(
				selectedLinesAtom,
				new Set(store.get(lyricLinesAtom).lyricLines.map((l) => l.id)),
			);
		}
		const sel = window.getSelection();
		if (sel) {
			if (sel.empty) {
				sel.empty();
			} else if (sel.removeAllRanges) {
				sel.removeAllRanges();
			}
		}
	}, [store]);

	const onSelectInverted = useCallback(() => {}, []);

	const onSelectWordsOfMatchedSelection = useCallback(() => {}, []);

	const setFindReplaceState = useSetAtom(findReplaceStateAtom);

	const onOpenFind = useCallback(() => {
		setFindReplaceState((prev) => ({
			...prev,
			open: true,
			replaceMode: false,
			focusTarget: "find",
			focusTrigger: Date.now(),
		}));
	}, [setFindReplaceState]);

	const onOpenReplace = useCallback(() => {
		setFindReplaceState((prev) => ({
			...prev,
			open: true,
			replaceMode: true,
			focusTarget: prev.query ? "replace" : "find",
			focusTrigger: Date.now(),
		}));
	}, [setFindReplaceState]);

	const onDeleteSelection = useCallback(() => {
		const selectedWordIds = store.get(selectedWordsAtom);
		const selectedLineIds = store.get(selectedLinesAtom);
		log("deleting selections", selectedWordIds, selectedLineIds);
		if (selectedWordIds.size === 0) {
			editLyricLines((prev) => {
				prev.lyricLines = prev.lyricLines.filter(
					(l) => !selectedLineIds.has(l.id),
				);
			});
		} else {
			editLyricLines((prev) => {
				for (const line of prev.lyricLines) {
					removeWordsFromLine(line, selectedWordIds);
				}
			});
		}
		store.set(selectedWordsAtom, new Set());
		store.set(selectedLinesAtom, new Set());
	}, [store, editLyricLines]);

	const onAutoSegment = useCallback(() => {
		setAutoSegmentDialog(true);
	}, [setAutoSegmentDialog]);

	const onQuickAutoSegment = useCallback(() => {
		if (
			!matchesSavedSyllabificationEngine(
				lyricLines.lyricLines,
				savedSegmentationEngine,
			)
		) {
			setAutoSegmentDialog(true);
			return;
		}

		setSplitEnglish(savedSegmentationEngine !== "none");
		editLyricLines((draft) => {
			draft.lyricLines = segmentLyricLines(draft.lyricLines, {
				...segmentationConfig,
				engine: savedSegmentationEngine,
				splitEnglish: savedSegmentationEngine !== "none",
			});
		});
		toast.success(
			t("autoSegmentApplied", {
				defaultValue: "Auto-segmented with {engine}",
				engine:
					SYLLABIFICATION_ENGINES.find(
						({ id }) => id === savedSegmentationEngine,
					)?.name ?? savedSegmentationEngine,
			}),
		);
	}, [
		editLyricLines,
		lyricLines.lyricLines,
		savedSegmentationEngine,
		segmentationConfig,
		setAutoSegmentDialog,
		setSplitEnglish,
		t,
	]);

	const onRubySegment = useCallback(() => {
		const selectedWordIds = store.get(selectedWordsAtom);
		const hasSelection = selectedWordIds.size > 0;
		editLyricLines((state) => {
			for (const line of state.lyricLines) {
				for (const word of line.words) {
					if (hasSelection && !selectedWordIds.has(word.id)) continue;
					if (!word.ruby || word.ruby.length === 0) continue;
					const nextRuby: LyricWordBase[] = [];
					for (const rubyWord of word.ruby) {
						const parts = rubyWord.word.split("|");
						const nextSegments = buildRubySegments(parts[0] ?? "", rubyWord);
						const fallbackBase = {
							word: "",
							startTime: word.startTime,
							endTime: word.endTime,
						};
						const extraSegments = parts
							.slice(1)
							.flatMap((part) => buildRubySegments(part, fallbackBase));
						nextRuby.push(...nextSegments, ...extraSegments);
					}
					word.ruby = nextRuby;
				}
			}
		});
	}, [buildRubySegments, editLyricLines, store]);

	const onOpenTimeShift = useCallback(() => {
		setTimeShiftDialog(true);
	}, [setTimeShiftDialog]);

	const onOpenTimeStretch = useCallback(() => {
		setTimeStretchDialog(true);
	}, [setTimeStretchDialog]);

	const onSyncLineTimestamps = useCallback(() => {
		const action = () => {
			editLyricLines((draft) => {
				for (let i = 0; i < draft.lyricLines.length; i++) {
					const line = draft.lyricLines[i];
					if (line.words.length === 0) continue;

					let startTime = line.words[0].startTime;
					let endTime = line.words[line.words.length - 1].endTime;

					if (i + 1 < draft.lyricLines.length) {
						const nextLine = draft.lyricLines[i + 1];
						if (nextLine.isBG && nextLine.words.length > 0) {
							const nextLineStart = nextLine.words[0].startTime;
							const nextLineEnd =
								nextLine.words[nextLine.words.length - 1].endTime;
							startTime = Math.min(startTime, nextLineStart);
							endTime = Math.max(endTime, nextLineEnd);
						}
					}

					line.startTime = startTime;
					line.endTime = endTime;
				}
			});
		};

		setConfirmDialog({
			open: true,
			title: t(
				"confirmDialog.syncLineTimestamps.title",
				"Confirm Sync Line Timestamps",
			),
			description: t(
				"confirmDialog.syncLineTimestamps.description",
				"This action will automatically synchronize the start and end times of all lines based on the timestamps of each word in the line, matching the start and end times of the first and last syllables. Are you sure you want to proceed?",
			),
			onConfirm: action,
		});
	}, [editLyricLines, setConfirmDialog, t]);

	const onAutoDuetBySinger = useCallback(() => {
		const action = () => {
			runHistoryAction(() => {
				editLyricLines((draft) => {
					const result = applyAutoDuetBySinger(draft);

					if ("error" in result) {
						toast.info(
							t(
								"topBar.menu.autoDuetNotEnoughSingers",
								"At least two distinct singers/vocalists are required to auto-duet.",
							),
						);
						return;
					}

					const mappingSummary = Object.entries(result.singerMap)
						.map(([singer, voice]) => `${singer} (${voice})`)
						.join(", ");

					toast.success(
						t(
							"topBar.menu.autoDuetSuccess",
							"Auto duet assigned {singers} singers to {count} lines: {mapping}",
							{
								count: result.modifiedCount,
								singers: result.singersCount,
								mapping: mappingSummary,
							},
						),
					);
				});
			});
		};

		setConfirmDialog({
			open: true,
			title: t("confirmDialog.autoDuet.title", "Auto Duet Based on Singer"),
			description: t(
				"confirmDialog.autoDuet.description",
				"This will automatically assign lines sung by detected vocalists to sequential voices (v1, v2, v3, ... v1000) and mark additional vocalists as Duet. Continue?",
			),
			onConfirm: action,
		});
	}, [editLyricLines, runHistoryAction, setConfirmDialog, t]);

	const onOpenAdvancedSegmentation = useCallback(() => {
		setAdvancedSegmentationDialog(true);
	}, [setAdvancedSegmentationDialog]);
	const onOpenLearnedSplits = useCallback(() => {
		setLearnedSplitsDialog(true);
	}, [setLearnedSplitsDialog]);
	const setCloudFileManagerOpen = useSetAtom(cloudFileManagerOpenAtom);
	const setCloudFileManagerTab = useSetAtom(cloudFileManagerInitialTabAtom);
	const openAccountSettings = useSetAtom(openAccountSettingsAtom);

	const onOpenFromCloud = useCallback(() => {
		setCloudFileManagerTab("open");
		setCloudFileManagerOpen(true);
	}, [setCloudFileManagerTab, setCloudFileManagerOpen]);

	const onSaveToCloud = useCallback(() => {
		setCloudFileManagerTab("save");
		setCloudFileManagerOpen(true);
	}, [setCloudFileManagerTab, setCloudFileManagerOpen]);

	const onOpenCloudAuth = useCallback(() => {
		openAccountSettings();
	}, [openAccountSettings]);

	const onDownloadAudio = useCallback(() => {
		const lyrics = store.get(lyricLinesAtom);
		const titleMeta = lyrics?.metadata?.find((m) => {
			const key = (m?.key || (m as any)?.name || "").toLowerCase();
			return key === "musicname" || key === "title" || key === "trackname";
		});
		const artistMeta = lyrics?.metadata?.find((m) => {
			const key = (m?.key || (m as any)?.name || "").toLowerCase();
			return key === "artists" || key === "artist" || key === "author";
		});
		let title = titleMeta?.value?.[0]?.trim() || "";
		let artist = artistMeta?.value?.[0]?.trim() || "";

		if (!title && !artist) {
			const baseFileName = saveFileName
				? saveFileName
						.replace(/\.(ttml|lrc|txt|mp3|flac|wav|m4a|ogg|opus|aac)$/i, "")
						.trim()
				: "";
			if (
				baseFileName &&
				baseFileName !== "lyric" &&
				baseFileName !== "untitled"
			) {
				if (baseFileName.includes(" - ")) {
					const parts = baseFileName.split(" - ");
					artist = parts[0]?.trim() || "";
					title = parts.slice(1).join(" - ")?.trim() || "";
				} else {
					title = baseFileName;
				}
			}
		}

		store.set(jooxAudioSearchDialogAtom, {
			open: true,
			title,
			artist,
		});
	}, [saveFileName, store]);

	return {
		newFileKey,
		newWindowKey,
		openFileKey,
		saveFileKey,
		undoKey,
		redoKey,
		selectAllLinesKey,
		unselectAllLinesKey: selectAllLinesKey,
		selectInvertedLinesKey,
		selectWordsOfMatchedSelectionKey,
		deleteSelectionKey,
		autoSegmentKey,
		findKey,
		replaceKey,
		spotMatchKey,
		ttmlChecklistKey,
		undoDisabled: !undoLyricLines.canUndo,
		redoDisabled: !undoLyricLines.canRedo,
		onNewFile,
		onNewWindow,
		onOpenFile,
		onOpenFileFromClipboard,
		onSaveFile,
		onOpenFromCloud,
		onSaveToCloud,
		onOpenCloudAuth,
		onOpenHistoryRestore,
		onSaveFileToClipboard,
		onUndo,
		onRedo,
		onOpenFind,
		onOpenReplace,
		onSelectAll,
		onUnselectAll,
		onSelectInverted,
		onSelectWordsOfMatchedSelection,
		onDeleteSelection,
		onOpenTimeShift,
		onOpenTimeStretch,
		onOpenMetadataEditor,
		onOpenSettings,
		onAutoSegment,
		onQuickAutoSegment,
		onRubySegment,
		onOpenAdvancedSegmentation,
		onOpenLearnedSplits,
		onSyncLineTimestamps,
		onAutoDuetBySinger,
		onOpenLatencyTest,
		onOpenTTMLChecklist,
		onOpenGrammarCheck,
		onOpenStatsAndProfiles,
		onOpenSpotMatch,
		onDownloadAudio,
		onOpenGitHub,
		onOpenWiki,
	};
};
