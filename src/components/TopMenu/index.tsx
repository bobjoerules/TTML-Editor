import { Box, Flex } from "@radix-ui/themes";
import { useAtomValue, useStore } from "jotai";
import { Toolbar } from "radix-ui";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { CloudStatusButton } from "$/modules/cloud/components/CloudStatusButton";
import { autoSegmentDoublePressAtom } from "$/modules/keyboard/states";
import {
	guideExportedAtom,
	guidePanelOpenAtom,
	guideStepAtom,
	guideWelcomeOpenAtom,
} from "$/modules/onboarding/states";
import {
	changelogDialogAtom,
	settingsDialogAtom,
	settingsTabAtom,
	whatsNewDialogAtom,
} from "$/states/dialogs.ts";
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
} from "$/states/keybindings";
import { ToolMode, showPreviewPanelAtom, toolModeAtom } from "$/states/main";
import {
	registerKeyBindings,
	useDoubleKeyBindingAtom,
	useKeyBindingAtom,
} from "$/utils/keybindings";
import { HeaderFileInfo } from "./HeaderFileInfo";
import { EditMenu } from "./modals/EditMenu";
import { FileMenu } from "./modals/FileMenu";
import { HelpMenu } from "./modals/HelpMenu";
import { HomeMenu } from "./modals/HomeMenu";
import { ToolMenu } from "./modals/ToolMenu";
import { useTopMenuActions } from "./useTopMenuActions";

// top menu actions are used inside individual menu components

const useWindowSize = () => {
	const [windowSize, setWindowSize] = useState({
		width: window.innerWidth,
		height: window.innerHeight,
	});

	useEffect(() => {
		const handleResize = () => {
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return windowSize;
};

export const TopMenu: FC = () => {
	const store = useStore();
	const { width } = useWindowSize();
	const showHomeButton = width < 800;
	const menu = useTopMenuActions();
	const menuRef = useRef(menu);
	menuRef.current = menu;

	const toolMode = useAtomValue(toolModeAtom);
	const autoSegmentDoublePress = useAtomValue(autoSegmentDoublePressAtom);
	const onSingleAutoSegment = useCallback(() => {
		if (toolMode !== ToolMode.Edit) return;
		if (!autoSegmentDoublePress) menu.onQuickAutoSegment();
	}, [toolMode, autoSegmentDoublePress, menu.onQuickAutoSegment]);

	useKeyBindingAtom(keyNewFileAtom, menu.onNewFile, [menu.onNewFile]);
	useKeyBindingAtom(keyNewWindowAtom, menu.onNewWindow, [menu.onNewWindow]);
	useKeyBindingAtom(keyOpenFileAtom, menu.onOpenFile, [menu.onOpenFile]);
	useKeyBindingAtom(keySaveFileAtom, menu.onSaveFile, [menu.onSaveFile]);
	useKeyBindingAtom(keyUndoAtom, menu.onUndo, [menu.onUndo]);
	useKeyBindingAtom(keyRedoAtom, menu.onRedo, [menu.onRedo]);
	useKeyBindingAtom(keyFindAtom, menu.onOpenFind, [menu.onOpenFind]);
	useKeyBindingAtom(keyReplaceAtom, menu.onOpenReplace, [menu.onOpenReplace]);
	useEffect(() => {
		const unbinds = [
			registerKeyBindings(["Control", "KeyY"], menu.onRedo),
			registerKeyBindings(["Control", "Shift", "KeyZ"], menu.onRedo),
			registerKeyBindings(["Shift", "Control", "KeyZ"], menu.onRedo),
		];
		return () => {
			unbinds.forEach((unbind) => {
				unbind();
			});
		};
	}, [menu.onRedo]);
	useKeyBindingAtom(keySelectAllAtom, menu.onUnselectAll, [menu.onUnselectAll]);
	useKeyBindingAtom(keySelectAllAtom, menu.onSelectAll, [menu.onSelectAll]);
	useKeyBindingAtom(keySelectInvertedAtom, menu.onSelectInverted, [
		menu.onSelectInverted,
	]);
	useKeyBindingAtom(
		keySelectWordsOfMatchedSelectionAtom,
		menu.onSelectWordsOfMatchedSelection,
		[menu.onSelectWordsOfMatchedSelection],
	);
	useKeyBindingAtom(keyDeleteSelectionAtom, menu.onDeleteSelection, [
		menu.onDeleteSelection,
	]);
	useKeyBindingAtom(keySpotMatchAtom, menu.onOpenSpotMatch, [
		menu.onOpenSpotMatch,
	]);
	useKeyBindingAtom(keyTtmlChecklistAtom, menu.onOpenTTMLChecklist, [
		menu.onOpenTTMLChecklist,
	]);
	useKeyBindingAtom(keyAutoSegmentAtom, onSingleAutoSegment, [
		onSingleAutoSegment,
	]);
	useDoubleKeyBindingAtom(
		keyAutoSegmentAtom,
		menu.onQuickAutoSegment,
		[menu.onQuickAutoSegment],
		autoSegmentDoublePress,
	);

	// Global shortcut listener as direct fallback
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (
				(e.metaKey || e.ctrlKey) &&
				e.key.toLowerCase() === "s" &&
				!e.shiftKey &&
				!e.altKey
			) {
				e.preventDefault();
				e.stopPropagation();
				menuRef.current.onSaveFile();
			} else if (
				(e.metaKey || e.ctrlKey) &&
				e.key.toLowerCase() === "s" &&
				e.shiftKey &&
				!e.altKey
			) {
				e.preventDefault();
				e.stopPropagation();
				menuRef.current.onSaveToCloud();
			} else if (
				(e.metaKey || e.ctrlKey) &&
				e.key.toLowerCase() === "o" &&
				e.shiftKey &&
				!e.altKey
			) {
				e.preventDefault();
				e.stopPropagation();
				menuRef.current.onOpenFromCloud();
			} else if (
				(e.metaKey || e.ctrlKey) &&
				e.key.toLowerCase() === "c" &&
				e.shiftKey &&
				!e.altKey
			) {
				e.preventDefault();
				e.stopPropagation();
				menuRef.current.onOpenTTMLChecklist();
			} else if (
				(e.metaKey || e.ctrlKey) &&
				e.key.toLowerCase() === "m" &&
				e.shiftKey &&
				!e.altKey
			) {
				e.preventDefault();
				e.stopPropagation();
				menuRef.current.onOpenSpotMatch();
			} else if (
				(e.metaKey || e.ctrlKey) &&
				e.key.toLowerCase() === "n" &&
				e.shiftKey &&
				!e.altKey
			) {
				e.preventDefault();
				e.stopPropagation();
				menuRef.current.onNewWindow();
			} else if (
				(e.metaKey || e.ctrlKey) &&
				e.key.toLowerCase() === "f" &&
				!e.shiftKey &&
				!e.altKey
			) {
				e.preventDefault();
				e.stopPropagation();
				menuRef.current.onOpenFind();
			} else if (
				(e.metaKey || e.ctrlKey) &&
				(e.key.toLowerCase() === "h" ||
					(e.key.toLowerCase() === "f" && e.altKey)) &&
				!e.shiftKey
			) {
				e.preventDefault();
				e.stopPropagation();
				menuRef.current.onOpenReplace();
			} else if (
				(e.metaKey || e.ctrlKey) &&
				e.key.toLowerCase() === "k" &&
				!e.shiftKey &&
				!e.altKey
			) {
				e.preventDefault();
				e.stopPropagation();
				menuRef.current.onAutoSegment();
			}
		};
		window.addEventListener("keydown", onKeyDown, { capture: true });
		return () => {
			window.removeEventListener("keydown", onKeyDown, { capture: true });
		};
	}, []);

	useEffect(() => {
		const isTauri =
			typeof window !== "undefined" &&
			(!!(window as unknown as { __TAURI__?: unknown }).__TAURI__ ||
				!!import.meta.env.TAURI_ENV_PLATFORM);
		if (!isTauri) return;

		let isCleanedUp = false;
		const unlistens: (() => void)[] = [];

		import("@tauri-apps/api/event").then(({ listen }) => {
			if (isCleanedUp) return;
			const mappings: Record<string, () => void> = {
				"menu-new-file": () => menuRef.current.onNewFile(),
				"menu-new-window": () => menuRef.current.onNewWindow(),
				"menu-open-file": () => menuRef.current.onOpenFile(),
				"menu-cloud-open": () => menuRef.current.onOpenFromCloud(),
				"menu-save-file": () => menuRef.current.onSaveFile(),
				"menu-cloud-save": () => menuRef.current.onSaveToCloud(),
				"menu-history-restore": () => menuRef.current.onOpenHistoryRestore(),
				"menu-cloud-auth": () => menuRef.current.onOpenCloudAuth(),
				"menu-undo": () => menuRef.current.onUndo(),
				"menu-redo": () => menuRef.current.onRedo(),
				"menu-find": () => menuRef.current.onOpenFind(),
				"menu-replace": () => menuRef.current.onOpenReplace(),
				"menu-select-all": () => menuRef.current.onSelectAll(),
				"menu-quick-segment": () => menuRef.current.onQuickAutoSegment(),
				"menu-auto-segment": () => menuRef.current.onAutoSegment(),
				"menu-auto-segment-sub": () => menuRef.current.onAutoSegment(),
				"menu-ruby-segment": () => menuRef.current.onRubySegment(),
				"menu-advanced-segment": () =>
					menuRef.current.onOpenAdvancedSegmentation(),
				"menu-learned-splits": () => menuRef.current.onOpenLearnedSplits(),
				"menu-sync-line-timestamps": () =>
					menuRef.current.onSyncLineTimestamps(),
				"menu-auto-duet-singer": () => menuRef.current.onAutoDuetBySinger(),
				"menu-toggle-preview-panel": () =>
					store.set(showPreviewPanelAtom, (prev) => !prev),
				"menu-time-shift": () => menuRef.current.onOpenTimeShift(),
				"menu-time-stretch": () => menuRef.current.onOpenTimeStretch(),
				"menu-metadata": () => menuRef.current.onOpenMetadataEditor(),
				"menu-settings": () => menuRef.current.onOpenSettings(),
				"menu-latency-test": () => menuRef.current.onOpenLatencyTest(),
				"menu-checklist": () => menuRef.current.onOpenTTMLChecklist(),
				"menu-grammar-check": () => menuRef.current.onOpenGrammarCheck(),
				"menu-spotmatch": () => menuRef.current.onOpenSpotMatch(),
				"menu-download-audio": () => menuRef.current.onDownloadAudio(),
				"menu-start-guide": () => {
					store.set(guideWelcomeOpenAtom, false);
					store.set(guideExportedAtom, false);
					store.set(guideStepAtom, 0);
					store.set(guidePanelOpenAtom, true);
				},
				"menu-github": () => menuRef.current.onOpenGitHub(),
				"menu-wiki": () => menuRef.current.onOpenWiki(),
				"menu-whats-new": () => store.set(whatsNewDialogAtom, true),
				"menu-changelog": () => store.set(changelogDialogAtom, true),
				"menu-about": () => {
					store.set(settingsTabAtom, "about");
					store.set(settingsDialogAtom, true);
				},
			};

			for (const [event, action] of Object.entries(mappings)) {
				listen(event, () => action()).then((unlisten) => {
					if (isCleanedUp) {
						unlisten();
					} else {
						unlistens.push(unlisten);
					}
				});
			}
		});

		return () => {
			isCleanedUp = true;
			for (const unlisten of unlistens) {
				unlisten();
			}
		};
	}, [store]);

	const isMac =
		typeof window !== "undefined" &&
		import.meta.env.TAURI_ENV_PLATFORM === "darwin";

	if (isMac) {
		return (
			<Flex
				py="0"
				px="2"
				pr="0"
				align="center"
				gap="1"
				style={{
					whiteSpace: "nowrap",
					minWidth: 0,
					flexShrink: 1,
					overflow: "hidden",
					height: "100%",
				}}
			>
				<HeaderFileInfo />
				<CloudStatusButton />
			</Flex>
		);
	}

	return (
		<Flex
			px="2"
			pr="0"
			align="center"
			gap="2"
			style={{
				whiteSpace: "nowrap",
				height: "100%",
				minWidth: 0,
				flexShrink: 1,
			}}
		>
			{showHomeButton ? (
				<HomeMenu />
			) : (
				<Toolbar.Root
					className="topMenuToolbar"
					style={{ display: "flex", alignItems: "center", gap: "2px" }}
				>
					<FileMenu variant="toolbar" />
					<EditMenu variant="toolbar" />
					<ToolMenu variant="toolbar" />
					<HelpMenu variant="toolbar" />
				</Toolbar.Root>
			)}
			<Box style={{ marginLeft: "16px", minWidth: 0, flexShrink: 1 }}>
				<HeaderFileInfo />
			</Box>
			<CloudStatusButton />
		</Flex>
	);
};
