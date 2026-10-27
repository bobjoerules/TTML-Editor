/*
 * Copyright 2023-2026 Steve Xiao (stevexmh@qq.com) and contributors.
 *
 * 本源代码文件是属于 AMLL TTML Tool 项目的一部分。
 * This source code file is a part of AMLL TTML Tool project.
 * 本项目的源代码的使用受到 GNU GENERAL PUBLIC LICENSE version 3 许可证的约束，具体可以参阅以下链接。
 * Use of this source code is governed by the GNU GPLv3 license that can be found through the following link.
 *
 * https://github.com/bobjoerules/AMLL-TTML-TOOL/blob/main/LICENSE
 */

import { useAtomValue } from "jotai";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import {
	displayRomanizationInSyncAtom,
	enableManualTimestampEditAtom,
	enableSyncGlowAnimationAtom,
	highlightActiveWordAtom,
	highlightErrorsAtom,
	LayoutMode,
	layoutModeAtom,
	legacySpaceLabelsAtom,
	showTimestampsAtom,
	autoSplitTrailingSpaceOnInputAtom,
} from "$/modules/settings/states/index.ts";
import {
	enableTimeModeDoubleClickEditAtom,
	enableUpcomingWordHighlightAtom,
	type SyncLevelMode,
	syncLevelModeAtom,
	upcomingWordHighlightColorAtom,
	upcomingWordHighlightThresholdAtom,
	visualizeTimestampUpdateAtom,
} from "$/modules/settings/states/sync.ts";
import {
	showEndTimeAsDurationAtom,
	ToolMode,
	toolModeAtom,
} from "$/states/main.ts";

export interface LyricWordSettings {
	toolMode: ToolMode;
	syncLevelMode: SyncLevelMode;
	layoutMode: LayoutMode;
	showTimestamps: boolean;
	showEndTimeAsDuration: boolean;
	highlightErrors: boolean;
	highlightActiveWord: boolean;
	enableSyncGlowAnimation: boolean;
	enableManualTimestampEdit: boolean;
	enableTimeModeDoubleClickEdit: boolean;
	enableUpcomingWordHighlight: boolean;
	upcomingWordHighlightColor: string;
	upcomingWordHighlightThreshold: number;
	visualizeTimestampUpdate: boolean;
	displayRomanizationInSync: boolean;
	legacySpaceLabels: boolean;
	autoSplitTrailingSpaceOnInput: boolean;
}

const defaultSettings: LyricWordSettings = {
	toolMode: ToolMode.Edit,
	syncLevelMode: "word",
	layoutMode: LayoutMode.Balanced,
	showTimestamps: true,
	showEndTimeAsDuration: false,
	highlightErrors: true,
	highlightActiveWord: true,
	enableSyncGlowAnimation: true,
	enableManualTimestampEdit: false,
	enableTimeModeDoubleClickEdit: true,
	enableUpcomingWordHighlight: false,
	upcomingWordHighlightColor: "accent",
	upcomingWordHighlightThreshold: 500,
	visualizeTimestampUpdate: true,
	displayRomanizationInSync: true,
	legacySpaceLabels: false,
	autoSplitTrailingSpaceOnInput: true,
};

const LyricWordSettingsContext =
	createContext<LyricWordSettings>(defaultSettings);

export function useLyricWordSettings(): LyricWordSettings {
	return useContext(LyricWordSettingsContext);
}

export function LyricWordSettingsProvider({
	children,
}: {
	children: ReactNode;
}) {
	const toolMode = useAtomValue(toolModeAtom);
	const syncLevelMode = useAtomValue(syncLevelModeAtom);
	const layoutMode = useAtomValue(layoutModeAtom);
	const showTimestamps = useAtomValue(showTimestampsAtom);
	const showEndTimeAsDuration = useAtomValue(showEndTimeAsDurationAtom);
	const highlightErrors = useAtomValue(highlightErrorsAtom);
	const highlightActiveWord = useAtomValue(highlightActiveWordAtom);
	const enableSyncGlowAnimation = useAtomValue(enableSyncGlowAnimationAtom);
	const enableManualTimestampEdit = useAtomValue(enableManualTimestampEditAtom);
	const enableTimeModeDoubleClickEdit = useAtomValue(
		enableTimeModeDoubleClickEditAtom,
	);
	const enableUpcomingWordHighlight = useAtomValue(
		enableUpcomingWordHighlightAtom,
	);
	const upcomingWordHighlightColor = useAtomValue(
		upcomingWordHighlightColorAtom,
	);
	const upcomingWordHighlightThreshold = useAtomValue(
		upcomingWordHighlightThresholdAtom,
	);
	const visualizeTimestampUpdate = useAtomValue(visualizeTimestampUpdateAtom);
	const displayRomanizationInSync = useAtomValue(displayRomanizationInSyncAtom);
	const legacySpaceLabels = useAtomValue(legacySpaceLabelsAtom);
	const autoSplitTrailingSpaceOnInput = useAtomValue(
		autoSplitTrailingSpaceOnInputAtom,
	);

	const value = useMemo<LyricWordSettings>(
		() => ({
			toolMode,
			syncLevelMode,
			layoutMode,
			showTimestamps,
			showEndTimeAsDuration,
			highlightErrors,
			highlightActiveWord,
			enableSyncGlowAnimation,
			enableManualTimestampEdit,
			enableTimeModeDoubleClickEdit,
			enableUpcomingWordHighlight,
			upcomingWordHighlightColor,
			upcomingWordHighlightThreshold,
			visualizeTimestampUpdate,
			displayRomanizationInSync,
			legacySpaceLabels,
			autoSplitTrailingSpaceOnInput,
		}),
		[
			toolMode,
			syncLevelMode,
			layoutMode,
			showTimestamps,
			showEndTimeAsDuration,
			highlightErrors,
			highlightActiveWord,
			enableSyncGlowAnimation,
			enableManualTimestampEdit,
			enableTimeModeDoubleClickEdit,
			enableUpcomingWordHighlight,
			upcomingWordHighlightColor,
			upcomingWordHighlightThreshold,
			visualizeTimestampUpdate,
			displayRomanizationInSync,
			legacySpaceLabels,
			autoSplitTrailingSpaceOnInput,
		],
	);

	return (
		<LyricWordSettingsContext.Provider value={value}>
			{children}
		</LyricWordSettingsContext.Provider>
	);
}
