import { Button, DropdownMenu } from "@radix-ui/themes";
import { isTauri } from "@tauri-apps/api/core";
import { useAtom, useSetAtom } from "jotai";
import { Toolbar } from "radix-ui";
import type { CSSProperties } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
	downloaderInitialQueryAtom,
	downloaderOpenAtom,
} from "$/modules/downloader/states";
import { pluginManager } from "$/modules/plugins/plugin-manager";
import { lyricLinesAtom } from "$/states/main";
import { formatKeyBindings } from "$/utils/keybindings";
import { useTopMenuActions } from "../useTopMenuActions";

type ToolMenuProps = {
	variant: "toolbar" | "submenu";
	triggerStyle?: CSSProperties;
	buttonStyle?: CSSProperties;
};

const ToolMenuItems = () => {
	const { t } = useTranslation();
	const menu = useTopMenuActions();
	const [lyricLines, setLyricLines] = useAtom(lyricLinesAtom);
	const openDownloader = useSetAtom(downloaderOpenAtom);
	const setDownloaderInitialQuery = useSetAtom(downloaderInitialQueryAtom);

	const getShortcut = (key: string[] | undefined) =>
		key ? formatKeyBindings(key) : undefined;

	const tools = pluginManager.getTools();

	const onRunPluginTool = (pluginId: string) => async () => {
		try {
			const nextLines = await pluginManager.runTool(
				pluginId,
				lyricLines.lyricLines,
			);
			setLyricLines((prev) => ({
				...prev,
				lyricLines: nextLines,
			}));
		} catch (e) {
			console.error(`Failed to run tool ${pluginId}:`, e);
		}
	};

	return (
		<>
			<DropdownMenu.Item
				onSelect={menu.onAutoSegment}
				shortcut={getShortcut(menu.autoSegmentKey)}
			>
				{t("topBar.menu.autoSegment", "Auto Segment")}
			</DropdownMenu.Item>
			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>
					{t("topBar.menu.segmentationTools", "Segmentation Tools")}
				</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent>
					<DropdownMenu.Item onSelect={menu.onRubySegment}>
						{t("topBar.menu.rubySegment", "Ruby Segmentation")}
					</DropdownMenu.Item>
					<DropdownMenu.Item onSelect={menu.onOpenAdvancedSegmentation}>
						{t("topBar.menu.advancedSegment", "Advanced Segmentation...")}
					</DropdownMenu.Item>
					<DropdownMenu.Item onSelect={menu.onOpenLearnedSplits}>
						{t("topBar.menu.learnedSplits", "Learned Splits...")}
					</DropdownMenu.Item>
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>
			<DropdownMenu.Item onSelect={menu.onSyncLineTimestamps}>
				{t("topBar.menu.syncLineTimestamps", "Sync Line Timestamps")}
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={menu.onAutoDuetBySinger}>
				{t("topBar.menu.autoDuetBySinger", "Auto Duet Based on Singer")}
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item onSelect={menu.onOpenTimeShift}>
				{t("topBar.menu.timeShift", "Time Shift...")}
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={menu.onOpenTimeStretch}>
				{t("topBar.menu.timeStretch", "Time Stretch...")}
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item
				onSelect={menu.onOpenTTMLChecklist}
				shortcut={getShortcut(menu.ttmlChecklistKey)}
			>
				{t("topBar.menu.ttmlChecklist", "TTML Checklist...")}
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={menu.onOpenGrammarCheck}>
				{t("topBar.menu.grammarCheck", "Grammar and Spelling Check...")}
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={menu.onOpenStatsAndProfiles}>
				{t("topBar.menu.statsAndProfiles", "User Profiles & Stats...")}
			</DropdownMenu.Item>
			<DropdownMenu.Item
				onSelect={menu.onOpenSpotMatch}
				shortcut={getShortcut(menu.spotMatchKey)}
			>
				{t("topBar.menu.spotMatch", "SpotMatch (Alternate Spotify IDs)...")}
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={menu.onDownloadAudio}>
				{t("topBar.menu.downloadAudio", "Download Audio...")}
			</DropdownMenu.Item>
			{isTauri() && (
				<DropdownMenu.Item
					onSelect={() => {
						const metadata = lyricLines.metadata;
						const title = metadata.find(
							(m) => (m.key || "").toLowerCase() === "title",
						)?.value[0];
						const artist = metadata.find(
							(m) => (m.key || "").toLowerCase() === "artist",
						)?.value[0];
						const q = [artist, title].filter(Boolean).join(" ").trim();
						setDownloaderInitialQuery(q || null);
						openDownloader(true);
					}}
				>
					{t("topBar.menu.mediaDownloader", "Media Downloader (yt-dlp)...")}
				</DropdownMenu.Item>
			)}
			<DropdownMenu.Item onSelect={menu.onOpenLatencyTest}>
				{t("settingsDialog.common.latencyTest", "Latency Test...")}
			</DropdownMenu.Item>

			{tools.length > 0 && <DropdownMenu.Separator />}
			{tools.map((tool) => (
				<DropdownMenu.Item
					key={tool.metadata.id}
					onSelect={onRunPluginTool(tool.metadata.id)}
				>
					{tool.metadata.name}
				</DropdownMenu.Item>
			))}
		</>
	);
};

export const ToolMenu = (props: ToolMenuProps) => {
	if (props.variant === "submenu") {
		return (
			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>
					<Trans i18nKey="topBar.menu.tool">Tools</Trans>
				</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent>
					<ToolMenuItems />
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>
		);
	}

	return (
		<DropdownMenu.Root>
			<Toolbar.Button asChild>
				<DropdownMenu.Trigger style={props.triggerStyle}>
					<Button
						variant="ghost"
						className="topMenuBarButton"
						style={props.buttonStyle}
					>
						<Trans i18nKey="topBar.menu.tool">Tools</Trans>
					</Button>
				</DropdownMenu.Trigger>
			</Toolbar.Button>
			<DropdownMenu.Content>
				<ToolMenuItems />
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
};
