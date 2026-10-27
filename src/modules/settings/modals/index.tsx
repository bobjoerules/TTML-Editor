import {
	Dismiss16Regular,
	Edit24Regular,
	Folder24Regular,
	Info24Regular,
	Keyboard12324Regular,
	PaintBrush24Regular,
	PersonCircle24Regular,
	PlugConnected24Regular,
	Search24Regular,
	Settings24Regular,
	Speaker224Regular,
} from "@fluentui/react-icons";
import {
	Badge,
	Box,
	Button,
	Card,
	Dialog,
	Flex,
	Heading,
	IconButton,
	Tabs,
	Text,
	TextField,
} from "@radix-ui/themes";
import { useAtom } from "jotai";
import { memo, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { settingsDialogAtom, settingsTabAtom } from "$/states/dialogs.ts";
import { filterSettings, type SettingSearchItem } from "../searchIndex";
import { SettingsAboutTab } from "./about";
import { SettingsAccountTab } from "./account";
import { SettingsAppearanceTab } from "./appearance";
import { AudioSettingsTab } from "./audio";
import { SettingsBackupTab } from "./backup";
import { SettingsCommonTab } from "./common";
import { SettingsKeyBindingsDialog } from "./keybindings";
import styles from "./settings.module.css";
import { SettingsSpectrogramTab } from "./spectrogram";
import { DiscordPresenceSettings } from "$/modules/discord-presence/DiscordPresenceSettings";

const SettingsPage = ({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) => (
	<Flex direction="column" gap="4" className={styles.page}>
		<Box className={styles.pageHeader}>
			<Heading size="6" className={styles.pageTitle}>
				{title}
			</Heading>
			{description && (
				<Text size="2" color="gray">
					{description}
				</Text>
			)}
		</Box>
		{children}
	</Flex>
);

const NavigationItem = ({
	value,
	icon,
	matchCount,
	onSelect,
	children,
}: {
	value: string;
	icon: ReactNode;
	matchCount?: number;
	onSelect?: () => void;
	children: ReactNode;
}) => (
	<Tabs.Trigger
		value={value}
		className={styles.navigationItem}
		onClick={onSelect}
	>
		{icon}
		<span
			style={{
				flex: 1,
				minWidth: 0,
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap",
			}}
		>
			{children}
		</span>
		{typeof matchCount === "number" && matchCount > 0 && (
			<Badge
				size="1"
				color="blue"
				variant="solid"
				style={{
					borderRadius: 10,
					padding: "0 6px",
					fontSize: "11px",
					height: "18px",
					minWidth: "18px",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
					marginLeft: "auto",
				}}
			>
				{matchCount}
			</Badge>
		)}
	</Tabs.Trigger>
);

const COMMON_TAB_IDS = new Set([
	"general-language",
	"general-scale",
	"general-layout",
	"general-key-trigger",
	"editor-key-trigger",
	"general-latency",
	"editor-sync-judge",
	"editor-sync-offset",
	"editor-commit-offset",
	"editor-smart-first-word",
	"editor-smart-last-word",
	"editor-split-occupied-word",
	"editor-auto-segment",
	"editor-word-wrap",
	"editor-upcoming-highlight",
	"editor-unsynced-highlight",
	"editor-auto-scroll",
	"editor-compact-bg",
	"editor-consecutive-bg",
	"files-consecutive-bg",
	"editor-genius-header",
	"editor-never-split-words",
	"files-autosave",
	"files-download-audio",
	"files-cloud-audio",
	"files-apostrophe",
	"files-cyrillic-es",
	"files-spotmatch-save",
	"files-checklist",
	"audio-volume",
	"audio-playback-rate",
]);

export const SettingsDialog = memo(() => {
	const [settingsDialogOpen, setSettingsDialogOpen] =
		useAtom(settingsDialogAtom);
	const [activeTab, setActiveTab] = useAtom(settingsTabAtom);
	const [searchQuery, setSearchQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);
	const { t } = useTranslation();
	const displayedTab = activeTab === "assistant" ? "ai" : activeTab;

	const searchResults = useMemo(
		() => filterSettings(searchQuery),
		[searchQuery],
	);

	const matchingItemIds = useMemo(() => {
		return new Set(searchResults.map((item) => item.id));
	}, [searchResults]);

	const matchingTabs = useMemo(() => {
		return new Set(searchResults.map((item) => item.tab));
	}, [searchResults]);

	const hasCommonMatches = useMemo(() => {
		return searchResults.some((item) => COMMON_TAB_IDS.has(item.id));
	}, [searchResults]);

	const tabMatchCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		if (!searchQuery.trim()) return counts;
		for (const item of searchResults) {
			counts[item.tab] = (counts[item.tab] || 0) + 1;
		}
		return counts;
	}, [searchResults, searchQuery]);

	// Reset search query when dialog closes
	useEffect(() => {
		if (!settingsDialogOpen) {
			setSearchQuery("");
		}
	}, [settingsDialogOpen]);

	// Keyboard shortcut: Cmd/Ctrl+F focuses settings search
	useEffect(() => {
		if (!settingsDialogOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
				e.preventDefault();
				searchInputRef.current?.focus();
				searchInputRef.current?.select();
			} else if (e.key === "Escape" && searchQuery) {
				e.preventDefault();
				setSearchQuery("");
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [settingsDialogOpen, searchQuery]);

	return (
		<Dialog.Root open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
			<Dialog.Content maxWidth="1000px" className={styles.dialogContent}>
				<Tabs.Root
					value={displayedTab}
					onValueChange={(val) => {
						setActiveTab(val);
						if (searchQuery.trim()) {
							setSearchQuery("");
						}
					}}
					orientation="vertical"
					className={styles.settingsLayout}
				>
					<aside className={styles.sidebar}>
						<Dialog.Title className={styles.sidebarTitle}>
							{t("settingsDialog.title", "Preferences")}
						</Dialog.Title>

						<Box className={styles.searchBoxWrapper}>
							<TextField.Root
								ref={searchInputRef}
								size="2"
								placeholder={t("settingsDialog.searchPlaceholder", "Search settings...")}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className={styles.searchField}
							>
								<TextField.Slot>
									<Search24Regular style={{ width: 15, height: 15, opacity: 0.7 }} />
								</TextField.Slot>
								{searchQuery && (
									<TextField.Slot>
										<IconButton
											size="1"
											variant="ghost"
											color="gray"
											onClick={() => {
												setSearchQuery("");
												searchInputRef.current?.focus();
											}}
											style={{ cursor: "pointer" }}
											aria-label="Clear search"
										>
											<Dismiss16Regular />
										</IconButton>
									</TextField.Slot>
								)}
							</TextField.Root>
						</Box>

						<Tabs.List className={styles.navigation}>
							<NavigationItem
								value="common"
								icon={<Settings24Regular />}
								matchCount={tabMatchCounts["common"]}
								onSelect={() => searchQuery && setSearchQuery("")}
							>
								{t("settingsDialog.tab.common", "General")}
							</NavigationItem>
							<NavigationItem
								value="account"
								icon={<PersonCircle24Regular />}
								matchCount={tabMatchCounts["account"]}
								onSelect={() => searchQuery && setSearchQuery("")}
							>
								{t("settingsDialog.tab.account", "Account")}
							</NavigationItem>
							<NavigationItem
								value="editor"
								icon={<Edit24Regular />}
								matchCount={tabMatchCounts["editor"]}
								onSelect={() => searchQuery && setSearchQuery("")}
							>
								{t("settingsDialog.tab.editor", "Editor & Sync")}
							</NavigationItem>
							<NavigationItem
								value="files"
								icon={<Folder24Regular />}
								matchCount={tabMatchCounts["files"]}
								onSelect={() => searchQuery && setSearchQuery("")}
							>
								{t("settingsDialog.tab.files", "Files & Storage")}
							</NavigationItem>
							<NavigationItem
								value="audio"
								icon={<Speaker224Regular />}
								matchCount={tabMatchCounts["audio"]}
								onSelect={() => searchQuery && setSearchQuery("")}
							>
								{t("settingsDialog.tab.audio", "Audio")}
							</NavigationItem>
							<NavigationItem
								value="keybinding"
								icon={<Keyboard12324Regular />}
								matchCount={tabMatchCounts["keybinding"]}
								onSelect={() => searchQuery && setSearchQuery("")}
							>
								{t("settingsDialog.tab.keybindings", "Keybindings")}
							</NavigationItem>
							<NavigationItem
								value="appearance"
								icon={<PaintBrush24Regular />}
								matchCount={tabMatchCounts["appearance"]}
								onSelect={() => searchQuery && setSearchQuery("")}
							>
								{t("settingsDialog.tab.appearance", "Appearance")}
							</NavigationItem>
							{import.meta.env.TAURI_ENV_PLATFORM && (
								<NavigationItem
									value="discord"
									icon={<PlugConnected24Regular />}
									matchCount={tabMatchCounts["discord"]}
									onSelect={() => searchQuery && setSearchQuery("")}
								>
									{t("settingsDialog.tab.discord", "Discord RPC")}
								</NavigationItem>
							)}
							<NavigationItem
								value="about"
								icon={<Info24Regular />}
								matchCount={tabMatchCounts["about"]}
								onSelect={() => searchQuery && setSearchQuery("")}
							>
								{t("common.about", "About")}
							</NavigationItem>
						</Tabs.List>
					</aside>

					<main className={styles.contentPane}>
						{searchQuery.trim() ? (
							<Flex direction="column" gap="4" className={styles.page}>
								<Box className={styles.pageHeader}>
									<Heading size="6" className={styles.pageTitle}>
										{t("settingsDialog.searchResults", "Search Results")}
									</Heading>
									<Text size="2" color="gray">
										{searchResults.length > 0
											? t(
													"settingsDialog.foundResults",
													'Found {count} setting(s) matching "{query}"',
													{
														count: searchResults.length,
														query: searchQuery,
													},
											  )
											: t(
													"settingsDialog.noResults",
													'No settings match "{query}"',
													{
														query: searchQuery,
													},
											  )}
									</Text>
								</Box>

								{searchResults.length > 0 ? (
									<Flex direction="column" gap="4">
										{hasCommonMatches && (
											<SettingsCommonTab
												section="all"
												filterItemIds={matchingItemIds}
											/>
										)}

										{matchingItemIds.has("audio-equalizer") && (
											<Flex direction="column" gap="2">
												<Heading size="4">
													{t("settings.group.equalizer", "Graphic Equalizer")}
												</Heading>
												<AudioSettingsTab />
											</Flex>
										)}

										{matchingItemIds.has("audio-spectrogram") && (
											<Flex direction="column" gap="2">
												<Heading size="4">
													{t("settings.group.spectrogram", "Spectrogram Visualizer")}
												</Heading>
												<SettingsSpectrogramTab />
											</Flex>
										)}

										{matchingItemIds.has("files-backup") && (
											<Flex direction="column" gap="2">
												<Heading size="4">
													{t("settings.group.backup", "Data Backup & Restore")}
												</Heading>
												<SettingsBackupTab />
											</Flex>
										)}

										{matchingTabs.has("account") && (
											<Flex direction="column" gap="2">
												<Heading size="4">
													{t("settingsDialog.tab.account", "Account & Cloud")}
												</Heading>
												<SettingsAccountTab />
											</Flex>
										)}

										{matchingTabs.has("keybinding") && (
											<Flex direction="column" gap="2">
												<Heading size="4">
													{t("settingsDialog.tab.keybindings", "Keybindings")}
												</Heading>
												<SettingsKeyBindingsDialog />
											</Flex>
										)}

										{matchingTabs.has("appearance") && (
											<Flex direction="column" gap="2">
												<Heading size="4">
													{t("settingsDialog.tab.appearance", "Appearance")}
												</Heading>
												<SettingsAppearanceTab />
											</Flex>
										)}

										{import.meta.env.TAURI_ENV_PLATFORM &&
											matchingTabs.has("discord") && (
												<Flex direction="column" gap="2">
													<Heading size="4">
														{t("settingsDialog.tab.discord", "Discord RPC")}
													</Heading>
													<DiscordPresenceSettings />
												</Flex>
											)}

										{matchingTabs.has("about") && (
											<Flex direction="column" gap="2">
												<Heading size="4">
													{t("common.about", "About")}
												</Heading>
												<SettingsAboutTab />
											</Flex>
										)}

										{matchingTabs.has("dev") && (
											<Flex direction="column" gap="2">
												<Heading size="4">
													{t("settingsDialog.tab.dev", "Developer")}
												</Heading>
												<SettingsDevTab />
											</Flex>
										)}
									</Flex>
								) : (
									<Card style={{ padding: "32px 16px", textAlign: "center" }}>
										<Text size="2" color="gray">
											{t(
												"settingsDialog.noResultsHelp",
												"Try searching with broader terms like 'audio', 'theme', 'sync', 'font', or 'offset'.",
											)}
										</Text>
									</Card>
								)}
							</Flex>
						) : (
							<>
								<Tabs.Content value="common" className={styles.tabContent}>
									<SettingsPage
										title={t("settingsDialog.tab.common", "General")}
										description={t(
											"settingsDialog.page.generalDesc",
											"Language, layout, privacy, and app-wide behavior.",
										)}
									>
										<SettingsCommonTab section="general" />
									</SettingsPage>
								</Tabs.Content>
								<Tabs.Content value="account" className={styles.tabContent}>
									<SettingsPage
										title={t("settingsDialog.tab.account", "Account & Cloud")}
										description={t(
											"settingsDialog.page.accountDesc",
											"Manage your cloud profile, synchronized lyrics statistics, and account security.",
										)}
									>
										<SettingsAccountTab />
									</SettingsPage>
								</Tabs.Content>
								<Tabs.Content value="editor" className={styles.tabContent}>
									<SettingsPage
										title={t("settingsDialog.tab.editor", "Editor & Sync")}
										description={t(
											"settingsDialog.page.editorDesc",
											"Timing input, synchronization behavior, and visual cues.",
										)}
									>
										<SettingsCommonTab section="editor" />
									</SettingsPage>
								</Tabs.Content>
								<Tabs.Content value="files" className={styles.tabContent}>
									<SettingsPage
										title={t("settingsDialog.tab.files", "Files & Storage")}
										description={t(
											"settingsDialog.page.filesDesc",
											"Import cleanup, autosave history, and portable backups.",
										)}
									>
										<SettingsCommonTab section="files" />
										<SettingsBackupTab />
									</SettingsPage>
								</Tabs.Content>
								<Tabs.Content value="audio" className={styles.tabContent}>
									<SettingsPage
										title={t("settingsDialog.tab.audio", "Audio")}
										description={t(
											"settingsDialog.page.audioDesc",
											"Playback, conversion, equalizer, and spectrogram display.",
										)}
									>
										<SettingsCommonTab section="audio" />
										<AudioSettingsTab />
										<SettingsSpectrogramTab />
									</SettingsPage>
								</Tabs.Content>
								<Tabs.Content value="keybinding" className={styles.tabContent}>
									<SettingsPage
										title={t("settingsDialog.tab.keybindings", "Keybindings")}
									>
										<SettingsKeyBindingsDialog />
									</SettingsPage>
								</Tabs.Content>
								<Tabs.Content value="appearance" className={styles.tabContent}>
									<SettingsPage
										title={t("settingsDialog.tab.appearance", "Appearance")}
									>
										<SettingsAppearanceTab />
									</SettingsPage>
								</Tabs.Content>
								{import.meta.env.TAURI_ENV_PLATFORM && (
									<Tabs.Content value="discord" className={styles.tabContent}>
										<SettingsPage
											title={t("settingsDialog.tab.discord", "Discord RPC")}
											description={t(
												"settingsDialog.page.discordDesc",
												"Manage how the tool publishes your editing activity and playback progress to Discord.",
											)}
										>
											<DiscordPresenceSettings />
										</SettingsPage>
									</Tabs.Content>
								)}
								<Tabs.Content value="about" className={styles.tabContent}>
									<SettingsPage
										title={t("common.about", "About")}
										description={t(
											"aboutModal.description",
											"A TTML lyric and timing editor designed for the Apple Music-like lyrics ecosystem",
										)}
									>
										<SettingsAboutTab />
									</SettingsPage>
								</Tabs.Content>
							</>
						)}
					</main>
				</Tabs.Root>
			</Dialog.Content>
		</Dialog.Root>
	);
});
