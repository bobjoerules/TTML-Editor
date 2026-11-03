/**
 * @fileoverview 只用于兼容旧代码
 */

import type { WritableAtom } from "jotai";
import {
	cmdAutoSegment,
	cmdDeleteSelection,
	cmdFind,
	cmdMoveFirstWordAndPlay,
	cmdMoveLastWordAndPlay,
	cmdMoveNextLine,
	cmdMoveNextWord,
	cmdMoveNextWordAndPlay,
	cmdMovePrevLine,
	cmdMovePrevWord,
	cmdMovePrevWordAndPlay,
	cmdNewFile,
	cmdNewWindow,
	cmdNextTab,
	cmdOpenFile,
	cmdPlaybackRateDown,
	cmdPlaybackRateReset,
	cmdPlaybackRateUp,
	cmdPlayPause,
	cmdPreviewFullscreen,
	cmdPrevTab,
	cmdRedo,
	cmdReplace,
	cmdSaveFile,
	cmdSeekBackward,
	cmdSeekForward,
	cmdSelectAll,
	cmdSelectInverted,
	cmdSelectWordsOfMatchedSelection,
	cmdSpotMatch,
	cmdSwitchEditMode,
	cmdSwitchPreviewMode,
	cmdSwitchSyncMode,
	cmdSyncEnd,
	cmdSyncNext,
	cmdSyncStart,
	cmdToggleBackground,
	cmdToggleDuet,
	cmdToggleTimeLineEdit,
	cmdToggleWordHighlight,
	cmdTtmlChecklist,
	cmdUndo,
	cmdUnselectAll,
	cmdUrbanDictionary,
	cmdUrbanDictionarySync,
	cmdVolumeDown,
	cmdVolumeUp,
} from "$/modules/keyboard/commands";

import type { KeyBindingsConfig } from "$/utils/keybindings";

export type KeyBindingAtom = WritableAtom<
	KeyBindingsConfig,
	[update?: KeyBindingsConfig | undefined],
	Promise<void>
>;

export const keyNewFileAtom = cmdNewFile.atom;
export const keyNewWindowAtom = cmdNewWindow.atom;
export const keyOpenFileAtom = cmdOpenFile.atom;
export const keySaveFileAtom = cmdSaveFile.atom;

export const keyUndoAtom = cmdUndo.atom;
export const keyRedoAtom = cmdRedo.atom;
export const keySelectAllAtom = cmdSelectAll.atom;
export const keyUnselectAllAtom = cmdUnselectAll.atom;
export const keySelectInvertedAtom = cmdSelectInverted.atom;
export const keySelectWordsOfMatchedSelectionAtom =
	cmdSelectWordsOfMatchedSelection.atom;
export const keyFindAtom = cmdFind.atom;
export const keyReplaceAtom = cmdReplace.atom;
export const keyDeleteSelectionAtom = cmdDeleteSelection.atom;
export const keyAutoSegmentAtom = cmdAutoSegment.atom;
export const keyToggleBackgroundAtom = cmdToggleBackground.atom;
export const keyToggleDuetAtom = cmdToggleDuet.atom;

export const keySwitchEditModeAtom = cmdSwitchEditMode.atom;
export const keySwitchSyncModeAtom = cmdSwitchSyncMode.atom;
export const keySwitchPreviewModeAtom = cmdSwitchPreviewMode.atom;
export const keyPreviewFullscreenAtom = cmdPreviewFullscreen.atom;
export const keyNextTabAtom = cmdNextTab.atom;
export const keyPrevTabAtom = cmdPrevTab.atom;

export const keyMoveNextWordAtom = cmdMoveNextWord.atom;
export const keyMovePrevWordAtom = cmdMovePrevWord.atom;
export const keyMoveNextLineAtom = cmdMoveNextLine.atom;
export const keyMovePrevLineAtom = cmdMovePrevLine.atom;
export const keyMovePrevWordAndPlayAtom = cmdMovePrevWordAndPlay.atom;
export const keyMoveNextWordAndPlayAtom = cmdMoveNextWordAndPlay.atom;

export const keySyncStartAtom = cmdSyncStart.atom;
export const keySyncNextAtom = cmdSyncNext.atom;
export const keySyncEndAtom = cmdSyncEnd.atom;
export const keyToggleWordHighlightAtom = cmdToggleWordHighlight.atom;
export const keyToggleTimeLineEditAtom = cmdToggleTimeLineEdit.atom;
export const keyUrbanDictionaryAtom = cmdUrbanDictionary.atom;
export const keyUrbanDictionarySyncAtom = cmdUrbanDictionarySync.atom;

export const keyMoveFirstWordAndPlayAtom = cmdMoveFirstWordAndPlay.atom;
export const keyMoveLastWordAndPlayAtom = cmdMoveLastWordAndPlay.atom;

export const keyPlayPauseAtom = cmdPlayPause.atom;
export const keySeekForwardAtom = cmdSeekForward.atom;
export const keySeekBackwardAtom = cmdSeekBackward.atom;
export const keyVolumeUpAtom = cmdVolumeUp.atom;
export const keyVolumeDownAtom = cmdVolumeDown.atom;
export const keyPlaybackRateUpAtom = cmdPlaybackRateUp.atom;
export const keyPlaybackRateDownAtom = cmdPlaybackRateDown.atom;
export const keyPlaybackRateResetAtom = cmdPlaybackRateReset.atom;
export const keySpotMatchAtom = cmdSpotMatch.atom;
export const keyTtmlChecklistAtom = cmdTtmlChecklist.atom;
