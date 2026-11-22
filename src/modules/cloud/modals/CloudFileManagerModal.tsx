import {
	Badge,
	Box,
	Button,
	Card,
	Checkbox,
	Dialog,
	Flex,
	IconButton,
	Progress,
	ScrollArea,
	SegmentedControl,
	Select,
	Spinner,
	Switch,
	Text,
	TextField,
	Tooltip,
} from "@radix-ui/themes";
import {
	ArrowClockwise16Regular,
	ArrowDownload16Regular,
	ArrowUpload16Regular,
	Checkmark16Filled,
	Checkmark16Regular,
	CheckmarkCircle16Filled,
	ChevronDown16Regular,
	ChevronUp16Regular,
	Cloud24Filled,
	Delete16Regular,
	Dismiss16Regular,
	DocumentArrowDown16Regular,
	Folder16Regular,
	Globe16Regular,
	History16Regular,
	List16Regular,
	MusicNote2Filled,
	Person16Regular,
	Play16Regular,
	Save16Regular,
	Search16Regular,
	Timer16Regular,
} from "@fluentui/react-icons";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { type FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { uid } from "uid";
import { useFileOpener } from "$/hooks/useFileOpener";
import { audioEngine } from "$/modules/audio/audio-engine";
import { tryReloadAudioFromComputer } from "$/modules/audio/utils/autoReloadAudio";
import {
	loadedAudioFileNameAtom,
	loadedAudioPathAtom,
} from "$/modules/audio/states";
import exportTTMLText from "$/modules/project/logic/ttml-writer";
import { parseLyric as parseTTML } from "$/modules/project/logic/ttml-parser";
import { openExternal } from "$/utils/openExternal";
import { openFileWithDialog } from "$/utils/fileDialog";
import { parseLrc } from "$/utils/parse-lrc";
import {
	isTTML100PercentCompleted,
	addChecklistEntry,
} from "$/modules/ttml-checklist/logic";
import { ttmlChecklistAtom } from "$/modules/ttml-checklist/states";
import {
	areCloudTTMLsSameSong,
	groupCloudTTMLs,
	type SongGroup,
} from "../songGrouping";
import { JooxApi } from "$/modules/joox/api/client";
import {
	allowConsecutiveBackgroundLinesAtom,
	autoLoadCloudAudioAtom,
	jooxApiTokenAtom,
	jooxAudioQualityAtom,
	lyricTextNormalizationOptionsAtom,
} from "$/modules/settings/states";
import {
	jooxAudioSearchDialogAtom,
	openAccountSettingsAtom,
} from "$/states/dialogs";
import { lyricLinesAtom, saveFileNameAtom } from "$/states/main";
import {
	cloudFileManagerInitialTabAtom,
	cloudFileManagerOpenAtom,
	cloudTTMLListAtom,
	cloudTTMLLoadingAtom,
	currentUserAtom,
} from "../states";
import {
	batchSaveTTMLsToCloud,
	deleteTTMLFromCloud,
	downloadCloudAudio,
	fetchUserTTMLList,
	loadTTMLFromCloud,
	saveTTMLToCloud,
	updateTTMLFinishedInCloud,
} from "../ttmlStorage";
import type { CloudTTMLMetadata } from "../types";

const formatDuration = (ms: number): string => {
	if (!ms || ms <= 0) return "--:--";
	const totalSecs = Math.floor(ms / 1000);
	const mins = Math.floor(totalSecs / 60);
	const secs = totalSecs % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatDate = (timestamp: number): string => {
	if (!timestamp) return "";
	return new Date(timestamp).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

export type { SongGroup };

const SongGroupItem: FC<{
	group: SongGroup;
	loadingDocId: string | null;
	deletingDocId: string | null;
	togglingDocId: string | null;
	downloadingAudioDocId: string | null;
	selected?: boolean;
	onToggleSelect?: (id: string) => void;
	handleOpenItem: (item: CloudTTMLMetadata) => Promise<void>;
	handleDownloadRawTTML: (item: CloudTTMLMetadata) => Promise<void>;
	handleDownloadAudio: (item: CloudTTMLMetadata) => Promise<void>;
	handleDeleteItem: (item: CloudTTMLMetadata) => Promise<void>;
	handleToggleFinished: (item: CloudTTMLMetadata) => Promise<void>;
}> = ({
	group,
	loadingDocId,
	deletingDocId,
	togglingDocId,
	downloadingAudioDocId,
	selected,
	onToggleSelect,
	handleOpenItem,
	handleDownloadRawTTML,
	handleDownloadAudio,
	handleDeleteItem,
	handleToggleFinished,
}) => {
	const { t } = useTranslation();
	const [selectedVersionId, setSelectedVersionId] = useState<string>(
		group.versions[0]?.id || "",
	);
	const [isExpanded, setIsExpanded] = useState<boolean>(false);

	const activeVersion = useMemo(() => {
		return (
			group.versions.find((v) => v.id === selectedVersionId) ||
			group.versions[0]
		);
	}, [group.versions, selectedVersionId]);

	if (!activeVersion) return null;

	const hasMultipleVersions = group.versions.length > 1;

	return (
		<Card
			variant="surface"
			style={{
				width: "100%",
				boxSizing: "border-box",
				padding: "10px 14px",
				border: selected
					? "1px solid var(--accent-a8)"
					: "1px solid var(--gray-a4)",
				borderRadius: "12px",
				backgroundColor: selected ? "var(--accent-a2)" : "var(--color-surface)",
				transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
			}}
		>
			<Flex direction="column" gap="2">
				<Flex gap="3" align="center" style={{ width: "100%", minWidth: 0 }}>
					{/* Selection Checkbox */}
					{onToggleSelect && (
						<Checkbox
							checked={selected}
							onCheckedChange={() => onToggleSelect(activeVersion.id)}
							style={{ cursor: "pointer", flexShrink: 0 }}
							aria-label={`Select ${group.title}`}
						/>
					)}

					{/* Cover Art / Icon */}
					<Box
						style={{
							width: "56px",
							height: "56px",
							minWidth: "56px",
							borderRadius: "10px",
							overflow: "hidden",
							backgroundColor: "var(--gray-a4)",
							border: "1px solid var(--gray-a5)",
							boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
					>
						{activeVersion.coverArt || group.coverArt ? (
							<img
								src={activeVersion.coverArt || group.coverArt!}
								alt={group.title}
								loading="lazy"
								style={{
									width: "100%",
									height: "100%",
									objectFit: "cover",
								}}
							/>
						) : (
							<MusicNote2Filled
								style={{
									width: 24,
									height: 24,
									color: "var(--accent-9)",
								}}
							/>
						)}
					</Box>

					{/* Song Info */}
					<Flex direction="column" gap="1" style={{ flex: 1, minWidth: 0 }}>
						{/* Title, Version Dropdown & Badges */}
						<Flex
							align="center"
							gap="2"
							wrap="wrap"
							style={{ minWidth: 0, width: "100%" }}
						>
							<Text
								weight="bold"
								size="3"
								title={activeVersion.title || group.title}
								style={{
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis",
									minWidth: 0,
									flexShrink: 1,
								}}
							>
								{activeVersion.title || group.title}
							</Text>

							{/* Multiple versions dropdown selector */}
							{hasMultipleVersions && (
								<Flex align="center" gap="1" style={{ flexShrink: 0 }}>
									<Select.Root
										value={activeVersion.id}
										onValueChange={(val) => setSelectedVersionId(val)}
										size="1"
									>
										<Select.Trigger
											style={{
												borderRadius: "6px",
												fontWeight: 600,
												fontSize: "12px",
												height: "22px",
												padding: "0 8px",
											}}
										/>
										<Select.Content>
											{group.versions.map((ver, idx) => (
												<Select.Item key={ver.id} value={ver.id}>
													v{group.versions.length - idx}
													{idx === 0 ? " (Latest)" : ""} •{" "}
													{formatDate(ver.updatedAt || ver.createdAt)}
												</Select.Item>
											))}
										</Select.Content>
									</Select.Root>
									<Tooltip
										content={
											isExpanded
												? t("cloud.collapseVersions", "Collapse versions list")
												: t("cloud.expandVersions", "Expand versions list")
										}
									>
										<IconButton
											size="1"
											variant="ghost"
											color="gray"
											onClick={() => setIsExpanded(!isExpanded)}
											style={{
												cursor: "pointer",
												height: "22px",
												width: "22px",
											}}
											aria-label="Toggle version list"
										>
											{isExpanded ? (
												<ChevronUp16Regular />
											) : (
												<ChevronDown16Regular />
											)}
										</IconButton>
									</Tooltip>
								</Flex>
							)}

							{activeVersion.publishedToCommunity ? (
								<Badge
									size="1"
									color="green"
									variant="surface"
									style={{ fontWeight: 600, flexShrink: 0 }}
								>
									{t("cloud.publicBadge", "Public")}
								</Badge>
							) : (
								<Flex align="center" gap="1" style={{ flexShrink: 0 }}>
									<Badge
										size="1"
										color="gray"
										variant="surface"
										style={{ flexShrink: 0 }}
									>
										{t("cloud.privateBadge", "Private")}
									</Badge>
									{activeVersion.finished && (
										<Badge
											size="1"
											color="green"
											variant="surface"
											style={{ fontWeight: 600, flexShrink: 0 }}
										>
											{t("cloud.completedBadge", "Completed")}
										</Badge>
									)}
								</Flex>
							)}
							{activeVersion.durationMs > 0 && (
								<Badge
									size="1"
									color="gray"
									variant="surface"
									style={{ flexShrink: 0 }}
								>
									{formatDuration(activeVersion.durationMs)}
								</Badge>
							)}
						</Flex>

						{/* Artist & Album */}
						<Flex align="center" gap="2" style={{ minWidth: 0, width: "100%" }}>
							<Text
								size="2"
								color="gray"
								title={activeVersion.artist || group.artist}
								style={{
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis",
									minWidth: 0,
									flexShrink: 1,
								}}
							>
								{activeVersion.artist ||
									group.artist ||
									t("cloud.unknownArtist", "Unknown Artist")}
							</Text>
							{Boolean(activeVersion.album || group.album) && (
								<>
									<Text size="1" color="gray" style={{ flexShrink: 0 }}>
										•
									</Text>
									<Badge
										size="1"
										color="gray"
										variant="surface"
										title={activeVersion.album || group.album}
										style={{
											maxWidth: "200px",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
											flexShrink: 1,
										}}
									>
										{activeVersion.album || group.album}
									</Badge>
								</>
							)}
						</Flex>

						{/* Timestamp */}
						<Text size="1" color="gray">
							{t("cloud.updated", "Updated")}{" "}
							{formatDate(activeVersion.updatedAt || activeVersion.createdAt)}
						</Text>
					</Flex>

					{/* Actions for Active Version */}
					<Flex
						gap="2"
						align="center"
						style={{ flexShrink: 0, marginLeft: "auto" }}
					>
						{/* Open in Editor */}
						<Button
							size="2"
							variant="solid"
							disabled={
								loadingDocId === activeVersion.id ||
								deletingDocId === activeVersion.id
							}
							onClick={() => handleOpenItem(activeVersion)}
							style={{
								borderRadius: "8px",
								cursor: "pointer",
							}}
						>
							{loadingDocId === activeVersion.id ? (
								<Spinner size="1" />
							) : (
								<>
									<Play16Regular />
									{t("cloud.openInEditor", "Open")}
								</>
							)}
						</Button>

						{/* Download Raw TTML */}
						<Tooltip content={t("cloud.downloadTTML", "Download .ttml file")}>
							<IconButton
								size="2"
								variant="surface"
								color="gray"
								disabled={
									loadingDocId === activeVersion.id ||
									deletingDocId === activeVersion.id
								}
								onClick={() => handleDownloadRawTTML(activeVersion)}
								aria-label={t("cloud.downloadTTML", "Download .ttml file")}
								style={{
									borderRadius: "8px",
									cursor: "pointer",
									flexShrink: 0,
								}}
							>
								<DocumentArrowDown16Regular />
							</IconButton>
						</Tooltip>

						{/* Download Audio */}
						{activeVersion.audioUrl && (
							<Tooltip
								content={t("cloud.downloadAudio", "Download attached audio")}
							>
								<IconButton
									size="2"
									variant="surface"
									color="blue"
									disabled={
										loadingDocId === activeVersion.id ||
										deletingDocId === activeVersion.id ||
										downloadingAudioDocId === activeVersion.id
									}
									onClick={() => handleDownloadAudio(activeVersion)}
									aria-label={t(
										"cloud.downloadAudio",
										"Download attached audio",
									)}
									style={{
										borderRadius: "8px",
										cursor: "pointer",
										flexShrink: 0,
									}}
								>
									{downloadingAudioDocId === activeVersion.id ? (
										<Spinner size="1" />
									) : (
										<MusicNote2Filled />
									)}
								</IconButton>
							</Tooltip>
						)}

						{/* Toggle Completed */}
						{!activeVersion.publishedToCommunity && (
							<Tooltip
								content={
									activeVersion.finished
										? t("cloud.markInProgressTooltip", "Mark as in-progress")
										: t("cloud.markCompletedTooltip", "Mark as completed")
								}
							>
								<IconButton
									size="2"
									variant={activeVersion.finished ? "solid" : "surface"}
									color={activeVersion.finished ? "green" : "gray"}
									disabled={
										loadingDocId === activeVersion.id ||
										deletingDocId === activeVersion.id ||
										togglingDocId === activeVersion.id
									}
									onClick={() => handleToggleFinished(activeVersion)}
									aria-label={
										activeVersion.finished
											? t("cloud.markInProgressTooltip", "Mark as in-progress")
											: t("cloud.markCompletedTooltip", "Mark as completed")
									}
									style={{
										borderRadius: "8px",
										cursor: "pointer",
										flexShrink: 0,
									}}
								>
									{togglingDocId === activeVersion.id ? (
										<Spinner size="1" />
									) : activeVersion.finished ? (
										<Checkmark16Filled />
									) : (
										<Checkmark16Regular />
									)}
								</IconButton>
							</Tooltip>
						)}

						{/* Delete */}
						<Tooltip content={t("cloud.deleteTooltip", "Delete from Cloud")}>
							<IconButton
								size="2"
								variant="soft"
								color="red"
								disabled={
									loadingDocId === activeVersion.id ||
									deletingDocId === activeVersion.id
								}
								onClick={() => handleDeleteItem(activeVersion)}
								aria-label={t("cloud.delete", "Delete")}
								style={{
									borderRadius: "8px",
									cursor: "pointer",
									flexShrink: 0,
								}}
							>
								{deletingDocId === activeVersion.id ? (
									<Spinner size="1" />
								) : (
									<Delete16Regular />
								)}
							</IconButton>
						</Tooltip>
					</Flex>
				</Flex>

				{/* Expanded Versions Dropdown List */}
				{hasMultipleVersions && isExpanded && (
					<Flex
						direction="column"
						gap="2"
						style={{
							marginTop: "8px",
							paddingTop: "8px",
							borderTop: "1px solid var(--gray-a4)",
							paddingLeft: "12px",
						}}
					>
						<Text size="1" color="gray" weight="bold">
							{t("cloud.savedVersions", "All Saved Versions")} (
							{group.versions.length})
						</Text>
						{group.versions.map((ver, vIdx) => {
							const isSelected = ver.id === activeVersion.id;
							return (
								<Flex
									key={ver.id}
									align="center"
									justify="between"
									gap="2"
									style={{
										padding: "6px 10px",
										borderRadius: "8px",
										backgroundColor: isSelected
											? "var(--accent-a3)"
											: "var(--gray-a2)",
										border: isSelected
											? "1px solid var(--accent-a6)"
											: "1px solid var(--gray-a3)",
									}}
								>
									<Flex
										align="center"
										gap="2"
										wrap="wrap"
										style={{ minWidth: 0, flex: 1 }}
									>
										<Text size="1" weight="bold">
											v{group.versions.length - vIdx}
											{vIdx === 0 && (
												<Text
													color="accent"
													size="1"
													style={{ marginLeft: "4px" }}
												>
													({t("cloud.latest", "Latest")})
												</Text>
											)}
										</Text>
										{Boolean(ver.artist && ver.artist !== group.artist) && (
											<Text
												size="1"
												color="gray"
												style={{ fontStyle: "italic" }}
											>
												• {ver.artist}
											</Text>
										)}
										{ver.publishedToCommunity ? (
											<Badge size="1" color="green" variant="surface">
												{t("cloud.publicBadge", "Public")}
											</Badge>
										) : (
											<Flex align="center" gap="1" style={{ flexShrink: 0 }}>
												<Badge size="1" color="gray" variant="surface">
													{t("cloud.privateBadge", "Private")}
												</Badge>
												{ver.finished && (
													<Badge
														size="1"
														color="green"
														variant="surface"
														style={{ fontWeight: 600 }}
													>
														{t("cloud.completedBadge", "Completed")}
													</Badge>
												)}
											</Flex>
										)}
										{ver.durationMs > 0 && (
											<Badge size="1" color="gray" variant="surface">
												{formatDuration(ver.durationMs)}
											</Badge>
										)}
										<Text size="1" color="gray">
											{formatDate(ver.updatedAt || ver.createdAt)}
										</Text>
									</Flex>

									<Flex gap="1" align="center" style={{ flexShrink: 0 }}>
										<Button
											size="1"
											variant={isSelected ? "solid" : "soft"}
											disabled={
												loadingDocId === ver.id || deletingDocId === ver.id
											}
											onClick={() => handleOpenItem(ver)}
											style={{ borderRadius: "6px", cursor: "pointer" }}
										>
											{loadingDocId === ver.id ? (
												<Spinner size="1" />
											) : (
												<>
													<Play16Regular />
													{t("cloud.openInEditor", "Open")}
												</>
											)}
										</Button>
										<Tooltip
											content={t("cloud.downloadTTML", "Download .ttml file")}
										>
											<IconButton
												size="1"
												variant="surface"
												color="gray"
												disabled={
													loadingDocId === ver.id || deletingDocId === ver.id
												}
												onClick={() => handleDownloadRawTTML(ver)}
												style={{ borderRadius: "6px", cursor: "pointer" }}
											>
												<DocumentArrowDown16Regular />
											</IconButton>
										</Tooltip>
										{ver.audioUrl && (
											<Tooltip
												content={t(
													"cloud.downloadAudio",
													"Download attached audio",
												)}
											>
												<IconButton
													size="1"
													variant="surface"
													color="blue"
													disabled={
														loadingDocId === ver.id ||
														deletingDocId === ver.id ||
														downloadingAudioDocId === ver.id
													}
													onClick={() => handleDownloadAudio(ver)}
													style={{ borderRadius: "6px", cursor: "pointer" }}
													aria-label={t(
														"cloud.downloadAudio",
														"Download attached audio",
													)}
												>
													{downloadingAudioDocId === ver.id ? (
														<Spinner size="1" />
													) : (
														<MusicNote2Filled />
													)}
												</IconButton>
											</Tooltip>
										)}
										{!ver.publishedToCommunity && (
											<Tooltip
												content={
													ver.finished
														? t(
																"cloud.markInProgressTooltip",
																"Mark as in-progress",
															)
														: t(
																"cloud.markCompletedTooltip",
																"Mark as completed",
															)
												}
											>
												<IconButton
													size="1"
													variant={ver.finished ? "solid" : "surface"}
													color={ver.finished ? "green" : "gray"}
													disabled={
														loadingDocId === ver.id ||
														deletingDocId === ver.id ||
														togglingDocId === ver.id
													}
													onClick={() => handleToggleFinished(ver)}
													aria-label={
														ver.finished
															? t(
																	"cloud.markInProgressTooltip",
																	"Mark as in-progress",
																)
															: t(
																	"cloud.markCompletedTooltip",
																	"Mark as completed",
																)
													}
													style={{ borderRadius: "6px", cursor: "pointer" }}
												>
													{togglingDocId === ver.id ? (
														<Spinner size="1" />
													) : ver.finished ? (
														<Checkmark16Filled />
													) : (
														<Checkmark16Regular />
													)}
												</IconButton>
											</Tooltip>
										)}
										<Tooltip
											content={t("cloud.deleteTooltip", "Delete from Cloud")}
										>
											<IconButton
												size="1"
												variant="soft"
												color="red"
												disabled={
													loadingDocId === ver.id || deletingDocId === ver.id
												}
												onClick={() => handleDeleteItem(ver)}
												style={{ borderRadius: "6px", cursor: "pointer" }}
											>
												{deletingDocId === ver.id ? (
													<Spinner size="1" />
												) : (
													<Delete16Regular />
												)}
											</IconButton>
										</Tooltip>
									</Flex>
								</Flex>
							);
						})}
					</Flex>
				)}
			</Flex>
		</Card>
	);
};

export const CloudFileManagerModal: FC = () => {
	const { t } = useTranslation();
	const [open, setOpen] = useAtom(cloudFileManagerOpenAtom);
	const initialTab = useAtomValue(cloudFileManagerInitialTabAtom);
	const [activeTab, setActiveTab] = useState<"open" | "save" | "batch">("open");
	const [filterTab, setFilterTab] = useState<
		"all" | "pending" | "completed" | "public" | "private"
	>("all");
	const [sortBy, setSortBy] = useState<
		| "recent"
		| "title-asc"
		| "title-desc"
		| "artist-asc"
		| "lines-desc"
		| "status-completed"
		| "status-pending"
	>("recent");

	const user = useAtomValue(currentUserAtom);
	const openAccountSettings = useSetAtom(openAccountSettingsAtom);

	const lyricLines = useAtomValue(lyricLinesAtom);
	const saveFileName = useAtomValue(saveFileNameAtom);
	const normalizationOptions = useAtomValue(lyricTextNormalizationOptionsAtom);
	const allowConsecutiveBackgroundLines = useAtomValue(
		allowConsecutiveBackgroundLinesAtom,
	);
	const autoLoadCloudAudio = useAtomValue(autoLoadCloudAudioAtom);
	const loadedAudioFileName = useAtomValue(loadedAudioFileNameAtom);
	const loadedAudioPath = useAtomValue(loadedAudioPathAtom);
	const [jooxToken] = useAtom(jooxApiTokenAtom);
	const [audioQuality] = useAtom(jooxAudioQualityAtom);
	const setJooxAudioSearch = useSetAtom(jooxAudioSearchDialogAtom);
	const { openFile } = useFileOpener();

	const [cloudList, setCloudList] = useAtom(cloudTTMLListAtom);
	const isLoading = useAtomValue(cloudTTMLLoadingAtom);

	const [checklist, setChecklist] = useAtom(ttmlChecklistAtom);
	const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

	// Batch Import State
	interface BatchImportItem {
		id: string;
		file: File;
		name: string;
		title: string;
		artist: string;
		album: string;
		lineCount: number;
		durationMs: number;
		rawTTML: string;
		status: "ready" | "uploading" | "success" | "error";
		error?: string;
	}
	const [batchItems, setBatchItems] = useState<BatchImportItem[]>([]);
	const [isBatchImporting, setIsBatchImporting] = useState<boolean>(false);
	const [batchImportProgress, setBatchImportProgress] = useState<{
		current: number;
		total: number;
		title: string;
	} | null>(null);
	const [batchPublishToCommunity, setBatchPublishToCommunity] =
		useState<boolean>(false);
	const [batchAutoCompleted, setBatchAutoCompleted] = useState<boolean>(true);

	const [searchQuery, setSearchQuery] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [publishToCommunity, setPublishToCommunity] = useState(false);
	const [isSaveCompleted, setIsSaveCompleted] = useState(false);
	const [, setUploadProgress] = useState<number | null>(null);
	const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
	const [downloadingAudioDocId, setDownloadingAudioDocId] = useState<
		string | null
	>(null);
	const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
	const [togglingDocId, setTogglingDocId] = useState<string | null>(null);

	// Extract track info from metadata & file name
	const currentTrackInfo = useMemo(() => {
		let title = "";
		let artist = "";
		let album = "";

		for (const meta of lyricLines.metadata) {
			const key = meta.key.toLowerCase();
			const val = meta.value.join(", ").trim();
			if (!val) continue;
			if (
				key === "musicname" ||
				key === "title" ||
				key === "track" ||
				key === "ti"
			) {
				if (!title) title = val;
			} else if (key === "artists" || key === "artist" || key === "ar") {
				if (!artist) artist = val;
			} else if (key === "album" || key === "al") {
				if (!album) album = val;
			}
		}

		if (!title || !artist) {
			const base = saveFileName.replace(/\.ttml$/i, "").trim();
			if (base && base.toLowerCase() !== "lyric") {
				if (base.includes(" - ")) {
					const parts = base.split(" - ");
					if (!artist && parts[0]?.trim()) artist = parts[0].trim();
					if (!title && parts.slice(1).join(" - ")?.trim())
						title = parts.slice(1).join(" - ").trim();
				} else if (!title) {
					title = base;
				}
			}
		}

		return {
			title: title || "Untitled",
			artist,
			album,
			lineCount: lyricLines.lyricLines.length,
			durationMs:
				lyricLines.lyricLines.length > 0
					? lyricLines.lyricLines[lyricLines.lyricLines.length - 1].endTime
					: 0,
		};
	}, [lyricLines, saveFileName]);

	const [saveTitle, setSaveTitle] = useState(currentTrackInfo.title);
	const [saveArtist, setSaveArtist] = useState(currentTrackInfo.artist);
	const [saveAlbum, setSaveAlbum] = useState(currentTrackInfo.album);

	const [overwriteLatest, setOverwriteLatest] = useState<boolean>(false);

	const isCurrentFullySynced = useMemo(() => {
		return isTTML100PercentCompleted(lyricLines);
	}, [lyricLines]);

	useEffect(() => {
		if (open) {
			setActiveTab(initialTab === "save" ? "save" : "open");
			setSaveTitle(currentTrackInfo.title);
			setSaveArtist(currentTrackInfo.artist);
			setSaveAlbum(currentTrackInfo.album);
			setPublishToCommunity(false);
			setIsSaveCompleted(isCurrentFullySynced);
			setOverwriteLatest(false);
			if (user) {
				// Instant local cache hydration if state is empty
				if (cloudList.length === 0) {
					try {
						const cached = localStorage.getItem(`amll_cloud_ttmls_${user.uid}`);
						if (cached) {
							const parsed = JSON.parse(cached);
							if (Array.isArray(parsed) && parsed.length > 0) {
								setCloudList(parsed);
							}
						}
					} catch {
						// ignore
					}
				}
				fetchUserTTMLList().catch(console.error);
			}
		}
	}, [open, initialTab, user]);

	// Group saved songs by title and artist to consolidate multiple versions
	const songGroups = useMemo(() => {
		return groupCloudTTMLs(cloudList);
	}, [cloudList]);

	// Detect if current lyric matches an existing song in cloud library
	const matchingExistingGroup = useMemo(() => {
		if (!saveTitle) return null;
		return songGroups.find((g) =>
			areCloudTTMLsSameSong(
				{
					title: saveTitle,
					artist: saveArtist,
					album: saveAlbum,
				} as CloudTTMLMetadata,
				{
					title: g.title,
					artist: g.artist,
					album: g.album,
				} as CloudTTMLMetadata,
			),
		);
	}, [songGroups, saveTitle, saveArtist, saveAlbum]);

	// Stats calculations - each unique song is only counted once
	const uniqueSongsCount = songGroups.length;
	const completedCount = useMemo(
		() => songGroups.filter((g) => g.isCompleted).length,
		[songGroups],
	);
	const inProgressCount = uniqueSongsCount - completedCount;
	const publicCount = useMemo(
		() => songGroups.filter((g) => g.isPublic).length,
		[songGroups],
	);
	const privateCount = uniqueSongsCount - publicCount;

	const filteredSongGroups = useMemo(() => {
		let result = [...songGroups];

		if (filterTab === "pending") {
			result = result.filter((g) => !g.isCompleted);
		} else if (filterTab === "completed") {
			result = result.filter((g) => g.isCompleted);
		} else if (filterTab === "public") {
			result = result.filter((g) => g.isPublic);
		} else if (filterTab === "private") {
			result = result.filter((g) => !g.isPublic);
		}

		const q = searchQuery.toLowerCase().trim();
		if (q) {
			result = result.filter(
				(g) =>
					g.title.toLowerCase().includes(q) ||
					g.artist.toLowerCase().includes(q) ||
					g.album.toLowerCase().includes(q) ||
					g.versions.some(
						(v) =>
							(v.title && v.title.toLowerCase().includes(q)) ||
							(v.artist && v.artist.toLowerCase().includes(q)) ||
							(v.album && v.album.toLowerCase().includes(q)),
					),
			);
		}

		if (sortBy === "title-asc") {
			result.sort((a, b) => a.title.localeCompare(b.title));
		} else if (sortBy === "title-desc") {
			result.sort((a, b) => b.title.localeCompare(a.title));
		} else if (sortBy === "artist-asc") {
			result.sort(
				(a, b) =>
					(a.artist || "zzz").localeCompare(b.artist || "zzz") ||
					a.title.localeCompare(b.title),
			);
		} else if (sortBy === "lines-desc") {
			result.sort((a, b) => b.maxLines - a.maxLines);
		} else if (sortBy === "status-completed") {
			result.sort(
				(a, b) =>
					(b.isCompleted === a.isCompleted ? 0 : b.isCompleted ? 1 : -1) ||
					b.latestUpdated - a.latestUpdated,
			);
		} else if (sortBy === "status-pending") {
			result.sort(
				(a, b) =>
					(b.isCompleted === a.isCompleted ? 0 : a.isCompleted ? 1 : -1) ||
					b.latestUpdated - a.latestUpdated,
			);
		} else {
			// recent
			result.sort((a, b) => b.latestUpdated - a.latestUpdated);
		}

		return result;
	}, [songGroups, filterTab, searchQuery, sortBy]);

	const handleSave = async () => {
		if (!user) {
			toast.error(
				t(
					"cloud.loginRequiredToSave",
					"Please sign in to save lyrics to the cloud.",
				),
			);
			openAccountSettings();
			return;
		}

		try {
			setIsSaving(true);
			const rawTTML = exportTTMLText(lyricLines, normalizationOptions, {
				allowConsecutiveBackgroundLines,
			});

			const docIdToUse =
				overwriteLatest && matchingExistingGroup
					? matchingExistingGroup.versions[0].id
					: undefined;

			const shouldMarkCompleted =
				isSaveCompleted ||
				isCurrentFullySynced ||
				isTTML100PercentCompleted(lyricLines);

			await saveTTMLToCloud({
				title: saveTitle || "Untitled",
				artist: saveArtist,
				album: saveAlbum,
				rawTTML,
				docId: docIdToUse,
				lineCount: lyricLines.lyricLines.length,
				durationMs: currentTrackInfo.durationMs,
				includeAudio: false,
				audioBlob: null,
				audioFileName:
					loadedAudioFileName || (audioEngine.currentFile as any)?.name || null,
				audioPath:
					loadedAudioPath || (audioEngine.currentFile as any)?.path || null,
				publishToCommunity,
				isCompleted: shouldMarkCompleted,
				onProgress: (pct) => setUploadProgress(pct),
			});
			toast.success(
				t("cloud.savedSuccess", "Lyrics saved to Cloud successfully!"),
			);
			setActiveTab("open");
		} catch (err: unknown) {
			console.error(err);
			toast.error((err as Error)?.message || "Failed to save to cloud");
		} finally {
			setIsSaving(false);
			setUploadProgress(null);
		}
	};

	const handleOpenItem = async (item: CloudTTMLMetadata) => {
		try {
			setLoadingDocId(item.id);
			const doc = await loadTTMLFromCloud(item.id, item.authorUid);
			const file = new File([doc.rawTTML], `${doc.title || "lyric"}.ttml`, {
				type: "application/xml",
			});
			await openFile(file);

			setOpen(false);
			toast.success(
				t("cloud.openedSuccess", 'Loaded "{title}" from Cloud', {
					title: doc.title || "Untitled",
				}),
			);

			// Auto-load audio into audio-engine in the background if setting is enabled
			if (autoLoadCloudAudio) {
				(async () => {
					// 1. Check if audio file still exists in original location on disk or computer
					let audioLoaded = await tryReloadAudioFromComputer({
						audioPath: doc.audioPath,
						audioFileName: doc.audioFileName,
						title: doc.title,
						artist: doc.artist,
					});

					// 2. Only if not found locally, try downloading attached audio from cloud storage
					if (!audioLoaded && (doc.audioUrl || doc.audioStoragePath)) {
						let audioToastId: any = null;
						try {
							audioToastId = toast.loading(
								t(
									"cloud.loadingAudio",
									'Loading audio for "{title}"…',
									{
										title: doc.title || "song",
									},
								),
							);
							const audioBlob = await downloadCloudAudio(
								doc.audioUrl,
								doc.audioStoragePath,
							);
							const audioFileName =
								doc.audioFileName || `${doc.title || "audio"}.mp3`;
							const audioFile = new File([audioBlob], audioFileName, {
								type: audioBlob.type || "audio/mpeg",
							});
							await audioEngine.loadMusic(audioFile);
							audioLoaded = true;
							if (audioToastId) {
								toast.update(audioToastId, {
									render: t(
										"cloud.audioAutoLoaded",
										'Loaded attached audio for "{title}"',
										{ title: doc.title || "Untitled" },
									),
									type: "success",
									isLoading: false,
									autoClose: 3000,
								});
							}
						} catch (audioErr) {
							console.warn("Failed to auto-load cloud audio:", audioErr);
							if (audioToastId) toast.dismiss(audioToastId);
						}
					}

					// 3. If audio still was not found locally or in cloud storage, fetch matching audio from online APIs
					if (!audioLoaded && (doc.title || doc.artist)) {
						let streamToastId: any = null;
						try {
							streamToastId = toast.loading(
								t(
									"joox.downloadingAudio",
									'[Beta] Downloading audio for "{title}"…',
									{ title: doc.title || "song" },
								),
								{
									autoClose: false,
									closeButton: false,
									closeOnClick: false,
								},
							);
							const result = await JooxApi.searchAndGetAudio(
								doc.title || "",
								doc.artist || "",
								jooxToken,
								audioQuality,
							);
							if (result?.audioBlob) {
								const audioFile = new File(
									[result.audioBlob],
									result.fileName || `${doc.title || "audio"}.mp3`,
									{ type: result.audioBlob.type || "audio/mpeg" },
								);
								(audioFile as any).isAutoDownloaded = true;
								await audioEngine.loadMusic(audioFile, false, true);
								audioLoaded = true;
								if (streamToastId) {
									toast.update(streamToastId, {
										render: t(
											"joox.audioLoaded",
											'Loaded audio for "{title}"',
											{
												title: doc.title || "song",
											},
										),
										type: "success",
										isLoading: false,
										autoClose: 3000,
										closeButton: true,
										closeOnClick: true,
									});
								}
							} else {
								if (streamToastId) toast.dismiss(streamToastId);
								setJooxAudioSearch({
									open: true,
									title: doc.title || "",
									artist: doc.artist || "",
								});
							}
						} catch (apiErr) {
							console.warn("Failed to auto-fetch audio from API:", apiErr);
							if (streamToastId) toast.dismiss(streamToastId);
							setJooxAudioSearch({
								open: true,
								title: doc.title || "",
								artist: doc.artist || "",
							});
						}
					}
				})();
			}
		} catch (err: unknown) {
			console.error(err);
			toast.error((err as Error)?.message || "Failed to open cloud file");
		} finally {
			setLoadingDocId(null);
		}
	};

	const handleDownloadAudio = async (item: CloudTTMLMetadata) => {
		if (!item.audioUrl) return;
		let toastId: any = null;
		try {
			setDownloadingAudioDocId(item.id);
			toastId = toast.loading(
				t(
					"cloud.downloadingAudio",
					'Downloading audio for "{title}"…',
					{ title: item.title || "Untitled" },
				),
				{
					autoClose: false,
					closeButton: false,
					closeOnClick: false,
				},
			);
			const blob = await downloadCloudAudio(
				item.audioUrl,
				item.audioStoragePath,
			);
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			const cleanName =
				`${item.artist ? `${item.artist} - ` : ""}${item.title || "audio"}.mp3`.replace(
					/[/\\?%*:|"<>]/g,
					"-",
				);
			a.download = item.audioFileName || cleanName;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			if (toastId) {
				toast.update(toastId, {
					render: t(
						"cloud.downloadedAudioSuccess",
						'Downloaded audio for "{title}"',
						{
							title: item.title || "Untitled",
						},
					),
					type: "success",
					isLoading: false,
					autoClose: 3000,
					closeButton: true,
					closeOnClick: true,
				});
			}
		} catch (err: unknown) {
			console.error(err);
			if (toastId) {
				toast.update(toastId, {
					render: (err as Error)?.message || "Failed to download audio",
					type: "error",
					isLoading: false,
					autoClose: 5000,
					closeButton: true,
					closeOnClick: true,
				});
			} else {
				toast.error((err as Error)?.message || "Failed to download audio");
			}
		} finally {
			setDownloadingAudioDocId(null);
		}
	};

	const handleToggleSelect = (id: string) => {
		setSelectedDocIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleSelectAll = () => {
		if (selectedDocIds.size === filteredSongGroups.length) {
			setSelectedDocIds(new Set());
		} else {
			const allIds = new Set<string>();
			for (const g of filteredSongGroups) {
				if (g.versions[0]?.id) allIds.add(g.versions[0].id);
			}
			setSelectedDocIds(allIds);
		}
	};

	const handleBatchDownloadSelected = async () => {
		const selectedItems = cloudList.filter((doc) => selectedDocIds.has(doc.id));
		if (selectedItems.length === 0) return;
		toast.info(
			t("cloud.batchDownloading", "Downloading {{count}} TTML files...", {
				count: selectedItems.length,
			}),
		);
		for (const item of selectedItems) {
			try {
				await handleDownloadRawTTML(item);
			} catch (err) {
				console.error(err);
			}
		}
	};

	const handleBatchAddToChecklist = () => {
		const selectedItems = cloudList.filter((doc) => selectedDocIds.has(doc.id));
		if (selectedItems.length === 0) return;

		const currentList = Array.isArray(checklist) ? checklist : [];
		let nextList = [...currentList];
		let addedCount = 0;
		for (const item of selectedItems) {
			const itemTitle = item.title || "Untitled";
			const itemArtist = item.artist || "";
			const exists = nextList.some(
				(e) =>
					e.cloudDocId === item.id ||
					(e.song.toLowerCase() === itemTitle.toLowerCase() &&
						(e.artist || "").toLowerCase() === itemArtist.toLowerCase()),
			);
			if (!exists) {
				nextList = addChecklistEntry(nextList, {
					song: itemTitle,
					artist: itemArtist,
					album: item.album || "",
					coverArt: item.coverArt || undefined,
					cloudDocId: item.id,
					notes: "Imported from TTML Cloud Library",
				});
				addedCount++;
			}
		}

		if (addedCount > 0) {
			setChecklist(nextList);
		}

		toast.success(
			t(
				"cloud.batchAddedToChecklist",
				"Added {{count}} songs to your TTML Checklist!",
				{ count: addedCount },
			),
		);
		setSelectedDocIds(new Set());
	};

	const processBatchFiles = async (files: FileList | File[]) => {
		const newItems: BatchImportItem[] = [];
		for (const file of Array.from(files)) {
			const ext = file.name.split(".").pop()?.toLowerCase();
			if (ext !== "ttml" && ext !== "lrc" && ext !== "xml") {
				continue;
			}
			try {
				const text = await file.text();
				let title = "";
				let artist = "";
				let album = "";
				let lineCount = 0;
				let durationMs = 0;
				let rawTTML = "";

				if (ext === "lrc") {
					const lrcLines = parseLrc(text);
					lineCount = lrcLines.length;
					durationMs =
						lrcLines.length > 0 ? lrcLines[lrcLines.length - 1].endTime : 0;
					const tiMatch = text.match(/\[ti:\s*([^\]]+)\]/i);
					const arMatch = text.match(/\[ar:\s*([^\]]+)\]/i);
					const alMatch = text.match(/\[al:\s*([^\]]+)\]/i);
					if (tiMatch) title = tiMatch[1].trim();
					if (arMatch) artist = arMatch[1].trim();
					if (alMatch) album = alMatch[1].trim();

					rawTTML = exportTTMLText(
						{
							lyricLines: lrcLines,
							metadata: [
								...(title ? [{ key: "title", value: [title] }] : []),
								...(artist ? [{ key: "artist", value: [artist] }] : []),
								...(album ? [{ key: "album", value: [album] }] : []),
							],
						},
						normalizationOptions,
						{ allowConsecutiveBackgroundLines },
					);
				} else {
					rawTTML = text;
					const parsed = parseTTML(text);
					lineCount = parsed.lyricLines.length;
					durationMs =
						parsed.lyricLines.length > 0
							? parsed.lyricLines[parsed.lyricLines.length - 1].endTime
							: 0;

					for (const meta of parsed.metadata) {
						const k = meta.key.toLowerCase();
						const v = meta.value.join(", ").trim();
						if (!v) continue;
						if (
							k === "musicname" ||
							k === "title" ||
							k === "track" ||
							k === "ti"
						) {
							if (!title) title = v;
						} else if (k === "artists" || k === "artist" || k === "ar") {
							if (!artist) artist = v;
						} else if (k === "album" || k === "al") {
							if (!album) album = v;
						}
					}
				}

				if (!title || !artist) {
					const base = file.name.replace(/\.(ttml|lrc|xml)$/i, "").trim();
					if (base.includes(" - ")) {
						const parts = base.split(" - ");
						if (!artist && parts[0]?.trim()) artist = parts[0].trim();
						if (!title && parts.slice(1).join(" - ")?.trim())
							title = parts.slice(1).join(" - ").trim();
					} else if (!title) {
						title = base;
					}
				}

				newItems.push({
					id: uid(),
					file,
					name: file.name,
					title: title || file.name.replace(/\.[^/.]+$/, ""),
					artist: artist || "",
					album: album || "",
					lineCount,
					durationMs,
					rawTTML,
					status: "ready",
				});
			} catch (err) {
				console.error("Failed to parse batch file:", file.name, err);
				newItems.push({
					id: uid(),
					file,
					name: file.name,
					title: file.name,
					artist: "",
					album: "",
					lineCount: 0,
					durationMs: 0,
					rawTTML: "",
					status: "error",
					error: (err as Error)?.message || "Failed to parse file",
				});
			}
		}

		setBatchItems((prev) => [...prev, ...newItems]);
	};

	const handleRunBatchImport = async () => {
		if (!user) {
			toast.error(
				t("cloud.signInToSync", "Please sign in to save to the cloud."),
			);
			openAccountSettings();
			return;
		}

		const readyItems = batchItems.filter(
			(item) => item.status === "ready" && item.rawTTML,
		);
		if (readyItems.length === 0) {
			toast.info(t("cloud.noReadyItems", "No files ready to upload."));
			return;
		}

		setIsBatchImporting(true);
		setBatchImportProgress({
			current: 0,
			total: readyItems.length,
			title: readyItems[0].title,
		});

		try {
			const inputs = readyItems.map((item) => ({
				title: item.title,
				artist: item.artist,
				album: item.album,
				rawTTML: item.rawTTML,
				lineCount: item.lineCount,
				durationMs: item.durationMs,
				publishToCommunity: batchPublishToCommunity,
				isCompleted: batchAutoCompleted,
			}));

			const res = await batchSaveTTMLsToCloud(
				inputs,
				(current, total, title) => {
					setBatchImportProgress({ current, total, title });
				},
			);

			setBatchItems((prev) =>
				prev.map((item) => {
					const errObj = res.errors.find((e) => e.title === item.title);
					if (errObj) {
						return { ...item, status: "error", error: errObj.error };
					}
					if (readyItems.some((r) => r.id === item.id)) {
						return { ...item, status: "success" };
					}
					return item;
				}),
			);

			if (res.successCount > 0) {
				toast.success(
					t(
						"cloud.batchSuccessSummary",
						"Successfully imported {{count}} songs to Cloud!",
						{ count: res.successCount },
					),
				);
			}
			if (res.failCount > 0) {
				toast.error(
					t(
						"cloud.batchFailSummary",
						"{{count}} songs failed to upload. Check the list.",
						{ count: res.failCount },
					),
				);
			}
		} catch (err: unknown) {
			console.error(err);
			toast.error((err as Error)?.message || "Batch upload failed");
		} finally {
			setIsBatchImporting(false);
			setBatchImportProgress(null);
		}
	};

	const handleDownloadRawTTML = async (item: CloudTTMLMetadata) => {
		try {
			setLoadingDocId(item.id);
			const doc = await loadTTMLFromCloud(item.id, item.authorUid);
			const blob = new Blob([doc.rawTTML], { type: "application/xml" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${doc.title || "lyric"}.ttml`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success(
				t("cloud.downloadedSuccess", 'Downloaded "{title}.ttml"', {
					title: doc.title || "Untitled",
				}),
			);
		} catch (err: unknown) {
			console.error(err);
			toast.error((err as Error)?.message || "Failed to download TTML");
		} finally {
			setLoadingDocId(null);
		}
	};

	const handleDeleteItem = async (item: CloudTTMLMetadata) => {
		if (
			!confirm(
				t(
					"cloud.confirmDelete",
					'Are you sure you want to delete "{title}" from your Cloud library?',
					{ title: item.title || "Untitled" },
				),
			)
		) {
			return;
		}

		try {
			setDeletingDocId(item.id);
			await deleteTTMLFromCloud(item.id);
			toast.info(
				t("cloud.deletedSuccess", 'Deleted "{title}" from Cloud.', {
					title: item.title || "Untitled",
				}),
			);
		} catch (err: unknown) {
			console.error(err);
			toast.error((err as Error)?.message || "Failed to delete cloud file");
		} finally {
			setDeletingDocId(null);
		}
	};

	const handleToggleFinished = async (item: CloudTTMLMetadata) => {
		try {
			setTogglingDocId(item.id);
			const newFinished = !item.finished;
			await updateTTMLFinishedInCloud(item.id, newFinished);
			toast.success(
				newFinished
					? t(
							"cloud.markedCompletedSuccess",
							'Marked "{title}" as completed.',
							{
								title: item.title || "Untitled",
							},
						)
					: t(
							"cloud.markedInProgressSuccess",
							'Marked "{title}" as in-progress.',
							{
								title: item.title || "Untitled",
							},
						),
			);
		} catch (err: unknown) {
			console.error(err);
			toast.error(
				(err as Error)?.message || "Failed to update completion status",
			);
		} finally {
			setTogglingDocId(null);
		}
	};

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Content
				aria-describedby={undefined}
				onOpenAutoFocus={(e) => e.preventDefault()}
				style={{
					maxWidth: 1000,
					width: "min(1000px, 96vw)",
					height: "640px",
					maxHeight: "88vh",
					borderRadius: "16px",
					display: "flex",
					flexDirection: "column",
				}}
			>
				{/* Dialog Title / Header */}
				<Dialog.Title style={{ flexShrink: 0 }}>
					<Flex
						justify="between"
						align="center"
						gap="3"
						wrap="nowrap"
						style={{ width: "100%" }}
					>
						{/* Left: Cloud Icon Tile & Titles */}
						<Flex align="center" gap="3" style={{ minWidth: 0, flex: 1 }}>
							<Box
								style={{
									width: "48px",
									height: "48px",
									borderRadius: "50%",
									backgroundColor: "var(--accent-a3)",
									color: "var(--accent-9)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									flexShrink: 0,
								}}
							>
								<Cloud24Filled style={{ width: 28, height: 28 }} />
							</Box>
							<Flex align="center" gap="2" style={{ minWidth: 0, flex: 1 }}>
								<Text size="5" weight="bold" style={{ whiteSpace: "nowrap" }}>
									{t("cloud.fileManagerTitle", "TTML Cloud Storage")}
								</Text>
							</Flex>
						</Flex>

						{/* Right: Actions */}
						<Flex
							align="center"
							gap="2"
							wrap="nowrap"
							style={{ flexShrink: 0 }}
						>
							{/* Tab Switcher: Library | Batch Import | Save Song */}
							{user && (
								<SegmentedControl.Root
									size="2"
									value={activeTab}
									onValueChange={(val) =>
										setActiveTab(val as "open" | "save" | "batch")
									}
									style={{ flexShrink: 0, minWidth: "350px" }}
								>
									<SegmentedControl.Item value="open">
										<Flex align="center" gap="1">
											<Folder16Regular style={{ width: 14, height: 14 }} />
											<span>{t("cloud.backToLibrary", "My Library")}</span>
										</Flex>
									</SegmentedControl.Item>
									<SegmentedControl.Item value="batch">
										<Flex align="center" gap="1">
											<ArrowUpload16Regular style={{ width: 14, height: 14 }} />
											<span>{t("cloud.batchImportTab", "Batch Import")}</span>
										</Flex>
									</SegmentedControl.Item>
									<SegmentedControl.Item value="save">
										<Flex align="center" gap="1">
											<Save16Regular style={{ width: 14, height: 14 }} />
											<span>{t("cloud.saveCurrentShort", "Save Song")}</span>
										</Flex>
									</SegmentedControl.Item>
								</SegmentedControl.Root>
							)}

							{/* Close Button */}
							<Dialog.Close>
								<IconButton
									size="2"
									variant="ghost"
									color="gray"
									style={{
										height: "32px",
										width: "32px",
										borderRadius: "8px",
										cursor: "pointer",
									}}
									aria-label={t("common.close", "Close")}
								>
									<Dismiss16Regular />
								</IconButton>
							</Dialog.Close>
						</Flex>
					</Flex>
				</Dialog.Title>

				{/* Body Content */}
				{!user ? (
					/* Not Signed In View */
					<Flex
						direction="column"
						align="center"
						justify="center"
						gap="4"
						style={{
							flex: 1,
							minHeight: 280,
							padding: "32px 16px",
							textAlign: "center",
						}}
					>
						<Box
							style={{
								width: "64px",
								height: "64px",
								borderRadius: "50%",
								backgroundColor: "var(--accent-a3)",
								color: "var(--accent-9)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Cloud24Filled style={{ width: 36, height: 36 }} />
						</Box>
						<Flex
							direction="column"
							gap="1"
							align="center"
							style={{ maxWidth: 460 }}
						>
							<Text size="4" weight="bold">
								{t("cloud.signInTitle", "Sign in to access TTML Cloud")}
							</Text>
							<Text size="2" color="gray">
								{t(
									"cloud.mustSignIn",
									"Sync your lyrics across devices, back up your progress, and optionally publish finished works to the community library.",
								)}
							</Text>
						</Flex>
						<Button
							size="3"
							variant="solid"
							style={{ borderRadius: "8px", cursor: "pointer" }}
							onClick={() => {
								setOpen(false);
								openAccountSettings();
							}}
						>
							<Person16Regular style={{ width: 18, height: 18 }} />
							{t("cloud.signInButton", "Sign In to TTML Cloud")}
						</Button>
					</Flex>
				) : activeTab === "save" ? (
					/* Save Current Song View */
					<Box
						style={{
							flex: 1,
							minHeight: 0,
							overflowY: "auto",
							marginTop: "8px",
						}}
					>
						<Card
							variant="surface"
							style={{
								padding: "16px",
								borderRadius: "12px",
								border: "1px solid var(--gray-a4)",
								background: "var(--gray-a2)",
							}}
						>
							<Flex direction="column" gap="3">
								<Flex direction="column" gap="1">
									<Text size="2" weight="bold">
										{t("cloud.trackTitle", "Track Title")}
									</Text>
									<TextField.Root
										value={saveTitle}
										onChange={(e) => setSaveTitle(e.target.value)}
										placeholder="Song Title"
										style={{ borderRadius: "8px" }}
									/>
								</Flex>

								<Flex gap="3" wrap="wrap">
									<Flex
										direction="column"
										gap="1"
										style={{ flex: 1, minWidth: 200 }}
									>
										<Text size="2" weight="bold">
											{t("cloud.artist", "Artist")}
										</Text>
										<TextField.Root
											value={saveArtist}
											onChange={(e) => setSaveArtist(e.target.value)}
											placeholder="Artist Name"
											style={{ borderRadius: "8px" }}
										/>
									</Flex>

									<Flex
										direction="column"
										gap="1"
										style={{ flex: 1, minWidth: 200 }}
									>
										<Text size="2" weight="bold">
											{t("cloud.album", "Album")}
										</Text>
										<TextField.Root
											value={saveAlbum}
											onChange={(e) => setSaveAlbum(e.target.value)}
											placeholder="Album Name"
											style={{ borderRadius: "8px" }}
										/>
									</Flex>
								</Flex>

								<Flex gap="2" align="center" wrap="wrap" mt="1">
									<Badge color="purple" size="1" variant="surface">
										{lyricLines.lyricLines.length}{" "}
										{t("cloud.lyricLines", "lyric lines")}
									</Badge>
									{currentTrackInfo.durationMs > 0 && (
										<Badge color="gray" size="1" variant="surface">
											{formatDuration(currentTrackInfo.durationMs)}
										</Badge>
									)}
									<Text size="1" color="gray">
										{t("cloud.savedAsAuthor", "Author:")}{" "}
										{user.displayName || user.email || user.uid}
									</Text>
								</Flex>

								{matchingExistingGroup && (
									<Card
										variant="surface"
										style={{
											background: "var(--accent-a3)",
											padding: "12px 14px",
											marginTop: 4,
											borderRadius: "10px",
											border: "1px solid var(--accent-a5)",
										}}
									>
										<Flex align="center" justify="between" gap="2" wrap="wrap">
											<Flex align="center" gap="2">
												<History16Regular
													style={{ color: "var(--accent-9)" }}
												/>
												<Flex direction="column" gap="0">
													<Flex align="center" gap="2">
														<Text size="2" weight="bold">
															{t(
																"cloud.existingFound",
																'Existing song in Cloud: "{title}"',
																{
																	title: matchingExistingGroup.title,
																},
															)}
														</Text>
														<Badge size="1" color="purple" variant="surface">
															{matchingExistingGroup.versions.length}{" "}
															{matchingExistingGroup.versions.length === 1
																? t("cloud.versionSingular", "version")
																: t("cloud.versionPlural", "versions")}
														</Badge>
													</Flex>
													<Text size="1" color="gray">
														{overwriteLatest
															? t(
																	"cloud.willOverwrite",
																	"Will overwrite v{ver}",
																	{
																		ver: matchingExistingGroup.versions.length,
																	},
																)
															: t(
																	"cloud.willAddVersion",
																	"Will save as new version v{ver}",
																	{
																		ver:
																			matchingExistingGroup.versions.length + 1,
																	},
																)}
													</Text>
												</Flex>
											</Flex>
											<Button
												size="1"
												variant={overwriteLatest ? "solid" : "soft"}
												color={overwriteLatest ? "amber" : "gray"}
												onClick={() => setOverwriteLatest(!overwriteLatest)}
												style={{ borderRadius: "6px", cursor: "pointer" }}
											>
												{overwriteLatest
													? t(
															"cloud.saveAsNewVersionBtn",
															"Save as New Version",
														)
													: t("cloud.overwriteLatestBtn", "Overwrite Latest")}
											</Button>
										</Flex>
									</Card>
								)}

								<Card
									variant="surface"
									style={{
										background: "var(--gray-a3)",
										padding: "12px 14px",
										marginTop: 4,
										borderRadius: "10px",
										border: "1px solid var(--gray-a4)",
									}}
								>
									<Flex align="center" justify="between" gap="3">
										<Flex direction="column" gap="1">
											<Flex align="center" gap="2" wrap="wrap">
												<Text size="2" weight="bold">
													✅ {t("cloud.markAsCompleted", "Mark as Completed")}
												</Text>
												<Badge
													color={
														isSaveCompleted || isCurrentFullySynced
															? "green"
															: "gray"
													}
													size="1"
													variant="surface"
												>
													{isSaveCompleted || isCurrentFullySynced
														? t("cloud.completedBadge", "Completed")
														: t("cloud.inProgressBadge", "In Progress")}
												</Badge>
												{isCurrentFullySynced && (
													<Badge color="blue" size="1" variant="surface">
														{t(
															"cloud.autoDetectedBadge",
															"Auto-detected (Fully Synced)",
														)}
													</Badge>
												)}
											</Flex>
											<Text size="1" color="gray">
												{isCurrentFullySynced
													? t(
															"cloud.markAsCompletedAutoDesc",
															"All lines are fully synchronized. This song will be saved as Completed automatically.",
														)
													: t(
															"cloud.markAsCompletedDesc",
															"Mark this lyric file as completed. Automatically set when all lines are fully synced.",
														)}
											</Text>
										</Flex>
										<Switch
											checked={isSaveCompleted || isCurrentFullySynced}
											disabled={isCurrentFullySynced}
											onCheckedChange={setIsSaveCompleted}
										/>
									</Flex>
								</Card>

								<Card
									variant="surface"
									style={{
										background: "var(--gray-a3)",
										padding: "12px 14px",
										marginTop: 4,
										borderRadius: "10px",
										border: "1px solid var(--gray-a4)",
									}}
								>
									<Flex align="center" justify="between" gap="3">
										<Flex direction="column" gap="1">
											<Flex align="center" gap="2">
												<Text size="2" weight="bold">
													🌐{" "}
													{t(
														"cloud.publishToCommunity",
														"Publish to Website Library",
													)}
												</Text>
												<Badge
													color={publishToCommunity ? "green" : "gray"}
													size="1"
													variant="surface"
												>
													{publishToCommunity
														? t("cloud.publicBadge", "Public")
														: t("cloud.privateBadge", "Private (Default)")}
												</Badge>
											</Flex>
											<Text size="1" color="gray">
												{t(
													"cloud.publishToCommunityDesc",
													"Opt-in to showcase this finished song in the public community library on ttml.bobjoerules.com/#finished.",
												)}
											</Text>
										</Flex>
										<Switch
											checked={publishToCommunity}
											onCheckedChange={(val) => {
												setPublishToCommunity(val);
												if (val) setIsSaveCompleted(true);
											}}
										/>
									</Flex>
								</Card>

								<Flex justify="end" gap="2" mt="2">
									<Button
										variant="soft"
										color="gray"
										onClick={() => setActiveTab("open")}
										style={{ borderRadius: "8px", cursor: "pointer" }}
									>
										{t("common.cancel", "Cancel")}
									</Button>
									<Button
										variant="solid"
										disabled={isSaving}
										onClick={handleSave}
										style={{ borderRadius: "8px", cursor: "pointer" }}
									>
										{isSaving ? (
											<Flex align="center" gap="2">
												<Spinner size="1" />
												<Text size="2">{t("cloud.saving", "Saving...")}</Text>
											</Flex>
										) : (
											<>
												<Save16Regular />
												{t("cloud.saveToCloudButton", "Save to Cloud")}
											</>
										)}
									</Button>
								</Flex>
							</Flex>
						</Card>
					</Box>
				) : activeTab === "batch" ? (
					/* Batch Import View */
					<Box
						style={{
							flex: 1,
							minHeight: 0,
							overflowY: "auto",
							marginTop: "8px",
						}}
					>
						<Card
							variant="surface"
							style={{
								padding: "16px",
								borderRadius: "12px",
								border: "1px solid var(--gray-a4)",
								background: "var(--gray-a2)",
							}}
						>
							<Flex direction="column" gap="3">
								{/* Header info */}
								<Flex justify="between" align="center" wrap="wrap" gap="2">
									<Flex direction="column" gap="0">
										<Text size="3" weight="bold">
											{t(
												"cloud.batchImportTitle",
												"Batch Import TTML / LRC Files",
											)}
										</Text>
										<Text size="1" color="gray">
											{t(
												"cloud.batchImportDesc",
												"Select or drop multiple lyric files (.ttml, .lrc) to parse and save them to your Cloud storage all at once.",
											)}
										</Text>
									</Flex>

									<Flex align="center" gap="2">
										{batchItems.length > 0 && (
											<Button
												size="2"
												variant="soft"
												color="gray"
												disabled={isBatchImporting}
												onClick={() => setBatchItems([])}
												style={{ borderRadius: "8px", cursor: "pointer" }}
											>
												{t("common.clear", "Clear All")}
											</Button>
										)}
										<Button
											size="2"
											variant="solid"
											disabled={isBatchImporting}
											onClick={() => {
												const input = document.createElement("input");
												input.type = "file";
												input.multiple = true;
												input.accept = ".ttml,.lrc,.xml";
												input.onchange = (e) => {
													const files = (e.target as HTMLInputElement).files;
													if (files && files.length > 0) {
														processBatchFiles(files);
													}
												};
												input.click();
											}}
											style={{ borderRadius: "8px", cursor: "pointer" }}
										>
											<ArrowUpload16Regular />
											{t("cloud.browseFiles", "Select Files")}
										</Button>
									</Flex>
								</Flex>

								{/* Drop Zone */}
								<Box
									onDragOver={(e) => {
										e.preventDefault();
										e.stopPropagation();
									}}
									onDrop={(e) => {
										e.preventDefault();
										e.stopPropagation();
										if (
											e.dataTransfer.files &&
											e.dataTransfer.files.length > 0
										) {
											processBatchFiles(e.dataTransfer.files);
										}
									}}
									style={{
										border: "2px dashed var(--gray-a6)",
										borderRadius: "12px",
										padding: batchItems.length > 0 ? "16px" : "36px 16px",
										textAlign: "center",
										backgroundColor: "var(--gray-a1)",
										cursor: "pointer",
										transition: "border-color 0.2s ease",
									}}
									onClick={() => {
										const input = document.createElement("input");
										input.type = "file";
										input.multiple = true;
										input.accept = ".ttml,.lrc,.xml";
										input.onchange = (e) => {
											const files = (e.target as HTMLInputElement).files;
											if (files && files.length > 0) {
												processBatchFiles(files);
											}
										};
										input.click();
									}}
								>
									<Flex direction="column" align="center" gap="2">
										<Folder16Regular
											style={{
												width: 28,
												height: 28,
												color: "var(--accent-9)",
											}}
										/>
										<Text size="2" weight="bold">
											{t(
												"cloud.dragAndDropFiles",
												"Drag and drop .ttml or .lrc files here",
											)}
										</Text>
										<Text size="1" color="gray">
											{t(
												"cloud.dragAndDropHint",
												"or click to browse from your computer",
											)}
										</Text>
									</Flex>
								</Box>

								{/* Batch Options */}
								<Flex gap="3" wrap="wrap">
									<Card
										variant="surface"
										style={{
											flex: 1,
											minWidth: 240,
											background: "var(--gray-a3)",
											padding: "10px 14px",
											borderRadius: "10px",
											border: "1px solid var(--gray-a4)",
										}}
									>
										<Flex align="center" justify="between" gap="2">
											<Flex direction="column">
												<Text size="2" weight="bold">
													{t("cloud.batchAutoComplete", "Mark as Completed")}
												</Text>
												<Text size="1" color="gray">
													{t(
														"cloud.batchAutoCompleteDesc",
														"Mark imported songs as 100% finished",
													)}
												</Text>
											</Flex>
											<Switch
												checked={batchAutoCompleted}
												onCheckedChange={setBatchAutoCompleted}
											/>
										</Flex>
									</Card>

									<Card
										variant="surface"
										style={{
											flex: 1,
											minWidth: 240,
											background: "var(--gray-a3)",
											padding: "10px 14px",
											borderRadius: "10px",
											border: "1px solid var(--gray-a4)",
										}}
									>
										<Flex align="center" justify="between" gap="2">
											<Flex direction="column">
												<Text size="2" weight="bold">
													{t(
														"cloud.batchPublishToCommunity",
														"Publish to Website Library",
													)}
												</Text>
												<Text size="1" color="gray">
													{t(
														"cloud.batchPublishDesc",
														"Make public on ttml.bobjoerules.com/#finished",
													)}
												</Text>
											</Flex>
											<Switch
												checked={batchPublishToCommunity}
												onCheckedChange={setBatchPublishToCommunity}
											/>
										</Flex>
									</Card>
								</Flex>

								{/* Progress Bar when uploading */}
								{isBatchImporting && batchImportProgress && (
									<Card
										variant="surface"
										style={{
											padding: "12px 14px",
											borderRadius: "10px",
											border: "1px solid var(--accent-a6)",
											backgroundColor: "var(--accent-a2)",
										}}
									>
										<Flex direction="column" gap="2">
											<Flex justify="between" align="center">
												<Text size="2" weight="bold">
													{t(
														"cloud.uploadingBatchProgress",
														"Uploading to Cloud...",
													)}{" "}
													({batchImportProgress.current} /{" "}
													{batchImportProgress.total})
												</Text>
												<Text size="1" color="gray">
													{Math.round(
														(batchImportProgress.current /
															batchImportProgress.total) *
															100,
													)}
													%
												</Text>
											</Flex>
											<Progress
												value={
													(batchImportProgress.current /
														batchImportProgress.total) *
													100
												}
											/>
											<Text
												size="1"
												color="gray"
												style={{ fontStyle: "italic" }}
											>
												{batchImportProgress.title}
											</Text>
										</Flex>
									</Card>
								)}

								{/* File List Table */}
								{batchItems.length > 0 && (
									<Flex direction="column" gap="2">
										<Flex justify="between" align="center">
											<Text size="2" weight="bold">
												{t("cloud.parsedSongsQueue", "Queue")} (
												{batchItems.length})
											</Text>
											<Text size="1" color="gray">
												{batchItems.filter((i) => i.status === "ready").length}{" "}
												ready •{" "}
												{
													batchItems.filter((i) => i.status === "success")
														.length
												}{" "}
												uploaded
											</Text>
										</Flex>

										<ScrollArea
											style={{ maxHeight: "240px", paddingRight: "6px" }}
										>
											<Flex direction="column" gap="2">
												{batchItems.map((item) => (
													<Flex
														key={item.id}
														align="center"
														justify="between"
														gap="2"
														style={{
															padding: "8px 12px",
															borderRadius: "8px",
															backgroundColor:
																item.status === "success"
																	? "var(--green-a2)"
																	: item.status === "error"
																		? "var(--red-a2)"
																		: "var(--color-surface)",
															border:
																item.status === "success"
																	? "1px solid var(--green-a5)"
																	: item.status === "error"
																		? "1px solid var(--red-a5)"
																		: "1px solid var(--gray-a4)",
														}}
													>
														<Flex
															align="center"
															gap="2"
															style={{ minWidth: 0, flex: 1 }}
														>
															<Badge size="1" color="gray" variant="surface">
																{item.name.split(".").pop()?.toUpperCase()}
															</Badge>
															<Flex direction="column" style={{ minWidth: 0 }}>
																<Text
																	size="2"
																	weight="bold"
																	style={{
																		whiteSpace: "nowrap",
																		overflow: "hidden",
																		textOverflow: "ellipsis",
																	}}
																>
																	{item.title}
																</Text>
																<Text size="1" color="gray">
																	{item.artist ||
																		t(
																			"cloud.unknownArtist",
																			"Unknown Artist",
																		)}{" "}
																	{item.lineCount > 0
																		? `• ${item.lineCount} lines`
																		: ""}{" "}
																	{item.durationMs > 0
																		? `• ${formatDuration(item.durationMs)}`
																		: ""}
																</Text>
															</Flex>
														</Flex>

														<Flex
															align="center"
															gap="2"
															style={{ flexShrink: 0 }}
														>
															{item.status === "ready" && (
																<Badge size="1" color="gray" variant="surface">
																	{t("cloud.readyStatus", "Ready")}
																</Badge>
															)}
															{item.status === "uploading" && (
																<Flex align="center" gap="1">
																	<Spinner size="1" />
																	<Text size="1" color="blue">
																		{t("cloud.uploading", "Uploading...")}
																	</Text>
																</Flex>
															)}
															{item.status === "success" && (
																<Badge size="1" color="green" variant="surface">
																	<Checkmark16Filled
																		style={{ marginRight: 2 }}
																	/>
																	{t("cloud.uploadedStatus", "Saved")}
																</Badge>
															)}
															{item.status === "error" && (
																<Tooltip
																	content={item.error || "Upload failed"}
																>
																	<Badge size="1" color="red" variant="surface">
																		{t("cloud.errorStatus", "Error")}
																	</Badge>
																</Tooltip>
															)}
															{!isBatchImporting && (
																<IconButton
																	size="1"
																	variant="ghost"
																	color="gray"
																	onClick={() =>
																		setBatchItems((prev) =>
																			prev.filter((i) => i.id !== item.id),
																		)
																	}
																	aria-label="Remove item"
																>
																	<Dismiss16Regular />
																</IconButton>
															)}
														</Flex>
													</Flex>
												))}
											</Flex>
										</ScrollArea>
									</Flex>
								)}

								{/* Action Bottom Bar */}
								<Flex justify="end" gap="2" mt="2">
									<Button
										variant="soft"
										color="gray"
										onClick={() => setActiveTab("open")}
										style={{ borderRadius: "8px", cursor: "pointer" }}
									>
										{t("cloud.backToLibrary", "Back to Library")}
									</Button>
									<Button
										variant="solid"
										disabled={
											isBatchImporting ||
											batchItems.filter(
												(i) => i.status === "ready" && i.rawTTML,
											).length === 0
										}
										onClick={handleRunBatchImport}
										style={{ borderRadius: "8px", cursor: "pointer" }}
									>
										{isBatchImporting ? (
											<Flex align="center" gap="2">
												<Spinner size="1" />
												<Text size="2">
													{t("cloud.batchUploadingBtn", "Uploading...")}
												</Text>
											</Flex>
										) : (
											<>
												<ArrowUpload16Regular />
												{t(
													"cloud.batchUploadBtn",
													"Upload {{count}} Songs to Cloud",
													{
														count: batchItems.filter(
															(i) => i.status === "ready" && i.rawTTML,
														).length,
													},
												)}
											</>
										)}
									</Button>
								</Flex>
							</Flex>
						</Card>
					</Box>
				) : (
					/* Library List View */
					<Flex
						direction="column"
						style={{ flex: 1, minHeight: 0, marginTop: "8px" }}
					>
						{/* Multi-Selection Batch Actions Bar */}
						{selectedDocIds.size > 0 && (
							<Card
								variant="surface"
								style={{
									padding: "8px 14px",
									marginBottom: "10px",
									borderRadius: "10px",
									border: "1px solid var(--accent-a7)",
									backgroundColor: "var(--accent-a3)",
									flexShrink: 0,
								}}
							>
								<Flex justify="between" align="center" wrap="wrap" gap="2">
									<Flex align="center" gap="2">
										<Badge size="2" color="indigo" variant="solid">
											{selectedDocIds.size} {t("cloud.selected", "Selected")}
										</Badge>
										<Button
											size="1"
											variant="ghost"
											color="gray"
											onClick={handleSelectAll}
											style={{ cursor: "pointer" }}
										>
											{selectedDocIds.size === filteredSongGroups.length
												? t("cloud.deselectAll", "Deselect All")
												: t("cloud.selectAll", "Select All")}
										</Button>
									</Flex>
									<Flex align="center" gap="2">
										<Button
											size="1"
											variant="surface"
											color="gray"
											onClick={handleBatchDownloadSelected}
											style={{ borderRadius: "6px", cursor: "pointer" }}
										>
											<ArrowDownload16Regular />
											{t("cloud.downloadSelected", "Download Selected")}
										</Button>
										<Button
											size="1"
											variant="solid"
											color="purple"
											onClick={handleBatchAddToChecklist}
											style={{ borderRadius: "6px", cursor: "pointer" }}
										>
											<Checkmark16Filled />
											{t("cloud.addToChecklist", "Add to Checklist")}
										</Button>
										<IconButton
											size="1"
											variant="ghost"
											color="gray"
											onClick={() => setSelectedDocIds(new Set())}
											aria-label="Clear selection"
										>
											<Dismiss16Regular />
										</IconButton>
									</Flex>
								</Flex>
							</Card>
						)}

						{/* Summary Stats Banner (Checklist style) */}
						{cloudList.length > 0 && (
							<Card
								variant="surface"
								style={{
									padding: "12px 16px",
									marginBottom: "12px",
									borderRadius: "12px",
									border: "1px solid var(--gray-a4)",
									background:
										"linear-gradient(135deg, var(--gray-a3) 0%, var(--gray-a2) 100%)",
									flexShrink: 0,
								}}
							>
								<Flex justify="between" align="center" wrap="wrap" gap="2">
									<Flex align="center" gap="2">
										<Text size="2" weight="bold">
											{uniqueSongsCount} {t("cloud.savedSongs", "Saved Songs")}
										</Text>
									</Flex>
									<Flex align="center" gap="3" wrap="wrap">
										<Flex align="center" gap="1">
											<span
												style={{
													width: 6,
													height: 6,
													borderRadius: "50%",
													backgroundColor: "var(--amber-9)",
												}}
											/>
											<Text size="1" color="gray">
												{inProgressCount} {t("ttmlChecklist.pending", "In Progress")}
											</Text>
										</Flex>
										<Flex align="center" gap="1">
											<span
												style={{
													width: 6,
													height: 6,
													borderRadius: "50%",
													backgroundColor: "var(--green-9)",
												}}
											/>
											<Text size="1" color="gray">
												{completedCount} {t("ttmlChecklist.completed", "Completed")}
											</Text>
										</Flex>
										<Flex align="center" gap="1">
											<span
												style={{
													width: 6,
													height: 6,
													borderRadius: "50%",
													backgroundColor: "var(--accent-9)",
												}}
											/>
											<Text size="1" color="gray">
												{publicCount} {t("cloud.publicBadge", "Public")}
											</Text>
										</Flex>
										<Flex align="center" gap="1">
											<span
												style={{
													width: 6,
													height: 6,
													borderRadius: "50%",
													backgroundColor: "var(--gray-9)",
												}}
											/>
											<Text size="1" color="gray">
												{privateCount} {t("cloud.privateBadge", "Private")}
											</Text>
										</Flex>
									</Flex>
								</Flex>
							</Card>
						)}

						{/* Search, Sort & Filter Controls */}
						<Flex
							gap="2"
							mb="3"
							align="center"
							wrap="wrap"
							style={{ flexShrink: 0 }}
						>
							<Box style={{ flex: 1, minWidth: "160px" }}>
								<TextField.Root
									size="2"
									placeholder={t(
										"cloud.searchPlaceholder",
										"Search songs, artists, or albums...",
									)}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.currentTarget.value)}
									style={{ borderRadius: "8px" }}
								>
									<TextField.Slot>
										<Search16Regular style={{ color: "var(--gray-9)" }} />
									</TextField.Slot>
									{searchQuery && (
										<TextField.Slot>
											<IconButton
												size="1"
												variant="ghost"
												color="gray"
												onClick={() => setSearchQuery("")}
											>
												<Dismiss16Regular />
											</IconButton>
										</TextField.Slot>
									)}
								</TextField.Root>
							</Box>

							{/* Sort Selector */}
							<Select.Root
								value={sortBy}
								onValueChange={(val) => setSortBy(val as typeof sortBy)}
								size="2"
							>
								<Select.Trigger
									style={{ borderRadius: "8px" }}
									placeholder={t("ttmlChecklist.sortBy", "Sort")}
								/>
								<Select.Content>
									<Select.Item value="recent">
										{t("ttmlChecklist.sortDefault", "Recently Updated")}
									</Select.Item>
									<Select.Item value="title-asc">
										{t("ttmlChecklist.sortTitleAsc", "Title (A–Z)")}
									</Select.Item>
									<Select.Item value="title-desc">
										{t("ttmlChecklist.sortTitleDesc", "Title (Z–A)")}
									</Select.Item>
									<Select.Item value="artist-asc">
										{t("ttmlChecklist.sortArtistAsc", "Artist (A–Z)")}
									</Select.Item>
									<Select.Item value="lines-desc">
										{t("cloud.sortLinesDesc", "Most Lines")}
									</Select.Item>
									<Select.Item value="status-completed">
										{t("cloud.sortCompletedFirst", "Completed First")}
									</Select.Item>
									<Select.Item value="status-pending">
										{t("cloud.sortInProgressFirst", "In Progress First")}
									</Select.Item>
								</Select.Content>
							</Select.Root>

							{/* Segmented Filter Pills with Active Indicator Line (Checklist style) */}
							<Flex
								align="center"
								style={{
									position: "relative",
									backgroundColor: "var(--gray-a3)",
									borderRadius: "10px",
									padding: "2px",
									border: "1px solid var(--gray-a4)",
									gap: "2px",
								}}
							>
								<Tooltip
									content={`${t("ttmlChecklist.all", "All")} (${uniqueSongsCount})`}
								>
									<button
										type="button"
										onClick={() => setFilterTab("all")}
										style={{
											position: "relative",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											padding: "6px 12px 9px 12px",
											borderRadius: "8px",
											border: "none",
											background:
												filterTab === "all"
													? "var(--color-surface)"
													: "transparent",
											color:
												filterTab === "all"
													? "var(--accent-11)"
													: "var(--gray-10)",
											cursor: "pointer",
											transition: "all 0.15s ease",
											boxShadow:
												filterTab === "all"
													? "0 1px 3px rgba(0, 0, 0, 0.2)"
													: "none",
										}}
									>
										<List16Regular style={{ width: 16, height: 16 }} />
										{filterTab === "all" && (
											<span
												style={{
													position: "absolute",
													bottom: "3px",
													left: "6px",
													right: "6px",
													height: "2.5px",
													borderRadius: "2px",
													backgroundColor: "var(--accent-9)",
													boxShadow: "0 0 6px var(--accent-9)",
												}}
											/>
										)}
									</button>
								</Tooltip>

								<Tooltip
									content={`${t("ttmlChecklist.pending", "In Progress")} (${inProgressCount})`}
								>
									<button
										type="button"
										onClick={() => setFilterTab("pending")}
										style={{
											position: "relative",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											padding: "6px 12px 9px 12px",
											borderRadius: "8px",
											border: "none",
											background:
												filterTab === "pending"
													? "var(--color-surface)"
													: "transparent",
											color:
												filterTab === "pending"
													? "var(--amber-11)"
													: "var(--gray-10)",
											cursor: "pointer",
											transition: "all 0.15s ease",
											boxShadow:
												filterTab === "pending"
													? "0 1px 3px rgba(0, 0, 0, 0.2)"
													: "none",
										}}
									>
										<Timer16Regular style={{ width: 16, height: 16 }} />
										{filterTab === "pending" && (
											<span
												style={{
													position: "absolute",
													bottom: "3px",
													left: "6px",
													right: "6px",
													height: "2.5px",
													borderRadius: "2px",
													backgroundColor: "var(--amber-9)",
													boxShadow: "0 0 6px var(--amber-9)",
												}}
											/>
										)}
									</button>
								</Tooltip>

								<Tooltip
									content={`${t("ttmlChecklist.completed", "Completed")} (${completedCount})`}
								>
									<button
										type="button"
										onClick={() => setFilterTab("completed")}
										style={{
											position: "relative",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											padding: "6px 12px 9px 12px",
											borderRadius: "8px",
											border: "none",
											background:
												filterTab === "completed"
													? "var(--color-surface)"
													: "transparent",
											color:
												filterTab === "completed"
													? "var(--green-11)"
													: "var(--gray-10)",
											cursor: "pointer",
											transition: "all 0.15s ease",
											boxShadow:
												filterTab === "completed"
													? "0 1px 3px rgba(0, 0, 0, 0.2)"
													: "none",
										}}
									>
										<CheckmarkCircle16Filled
											style={{ width: 16, height: 16 }}
										/>
										{filterTab === "completed" && (
											<span
												style={{
													position: "absolute",
													bottom: "3px",
													left: "6px",
													right: "6px",
													height: "2.5px",
													borderRadius: "2px",
													backgroundColor: "var(--green-9)",
													boxShadow: "0 0 6px var(--green-9)",
												}}
											/>
										)}
									</button>
								</Tooltip>

								<Tooltip
									content={`${t("cloud.publicBadge", "Public")} (${publicCount})`}
								>
									<button
										type="button"
										onClick={() => setFilterTab("public")}
										style={{
											position: "relative",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											padding: "6px 12px 9px 12px",
											borderRadius: "8px",
											border: "none",
											background:
												filterTab === "public"
													? "var(--color-surface)"
													: "transparent",
											color:
												filterTab === "public"
													? "var(--green-11)"
													: "var(--gray-10)",
											cursor: "pointer",
											transition: "all 0.15s ease",
											boxShadow:
												filterTab === "public"
													? "0 1px 3px rgba(0, 0, 0, 0.2)"
													: "none",
										}}
									>
										<Globe16Regular style={{ width: 16, height: 16 }} />
										{filterTab === "public" && (
											<span
												style={{
													position: "absolute",
													bottom: "3px",
													left: "6px",
													right: "6px",
													height: "2.5px",
													borderRadius: "2px",
													backgroundColor: "var(--green-9)",
													boxShadow: "0 0 6px var(--green-9)",
												}}
											/>
										)}
									</button>
								</Tooltip>

								<Tooltip
									content={`${t("cloud.privateBadge", "Private")} (${privateCount})`}
								>
									<button
										type="button"
										onClick={() => setFilterTab("private")}
										style={{
											position: "relative",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											padding: "6px 12px 9px 12px",
											borderRadius: "8px",
											border: "none",
											background:
												filterTab === "private"
													? "var(--color-surface)"
													: "transparent",
											color:
												filterTab === "private"
													? "var(--gray-11)"
													: "var(--gray-10)",
											cursor: "pointer",
											transition: "all 0.15s ease",
											boxShadow:
												filterTab === "private"
													? "0 1px 3px rgba(0, 0, 0, 0.2)"
													: "none",
										}}
									>
										<Folder16Regular style={{ width: 16, height: 16 }} />
										{filterTab === "private" && (
											<span
												style={{
													position: "absolute",
													bottom: "3px",
													left: "6px",
													right: "6px",
													height: "2.5px",
													borderRadius: "2px",
													backgroundColor: "var(--gray-9)",
													boxShadow: "0 0 6px var(--gray-9)",
												}}
											/>
										)}
									</button>
								</Tooltip>
							</Flex>

							{/* Refresh Library Button */}
							<Tooltip content={t("cloud.refresh", "Refresh Library")}>
								<IconButton
									size="2"
									variant="surface"
									color="gray"
									disabled={isLoading}
									onClick={() => fetchUserTTMLList()}
									style={{
										height: "32px",
										width: "32px",
										borderRadius: "8px",
										cursor: "pointer",
										flexShrink: 0,
									}}
									aria-label={t("cloud.refresh", "Refresh")}
								>
									{isLoading ? (
										<Spinner size="1" />
									) : (
										<ArrowClockwise16Regular
											style={{ width: "16px", height: "16px" }}
										/>
									)}
								</IconButton>
							</Tooltip>
						</Flex>

						{/* Scrollable Song Cards List */}
						<ScrollArea
							style={{
								flex: 1,
								minHeight: 0,
								paddingRight: "8px",
							}}
						>
							{isLoading && cloudList.length === 0 ? (
								<Flex
									justify="center"
									align="center"
									style={{ minHeight: 240 }}
								>
									<Spinner size="3" />
								</Flex>
							) : filteredSongGroups.length === 0 ? (
								<Flex
									direction="column"
									justify="center"
									align="center"
									gap="3"
									style={{ minHeight: 240, textAlign: "center" }}
								>
									<Box
										style={{
											width: "48px",
											height: "48px",
											borderRadius: "50%",
											backgroundColor: "var(--gray-a3)",
											color: "var(--gray-9)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										<Folder16Regular style={{ width: 24, height: 24 }} />
									</Box>
									<Text size="2" color="gray">
										{searchQuery
											? t(
													"cloud.noSearchResults",
													"No cloud lyrics found matching your search.",
												)
											: filterTab !== "all"
												? t("cloud.noCategoryResults", "No songs in this view.")
												: t(
														"cloud.emptyLibrary",
														"No saved lyrics in your Cloud library yet.",
													)}
									</Text>
									<Button
										size="2"
										variant="soft"
										onClick={() => setActiveTab("save")}
										style={{ borderRadius: "8px", cursor: "pointer" }}
									>
										<Save16Regular />
										{t("cloud.saveCurrentNow", "Save Current Lyrics to Cloud")}
									</Button>
								</Flex>
							) : (
								<Flex direction="column" gap="2" pb="2">
									{filteredSongGroups.map((group) => (
										<SongGroupItem
											key={group.key}
											group={group}
											loadingDocId={loadingDocId}
											downloadingAudioDocId={downloadingAudioDocId}
											deletingDocId={deletingDocId}
											togglingDocId={togglingDocId}
											selected={selectedDocIds.has(group.versions[0]?.id)}
											onToggleSelect={handleToggleSelect}
											handleOpenItem={handleOpenItem}
											handleDownloadRawTTML={handleDownloadRawTTML}
											handleDownloadAudio={handleDownloadAudio}
											handleDeleteItem={handleDeleteItem}
											handleToggleFinished={handleToggleFinished}
										/>
									))}
								</Flex>
							)}
						</ScrollArea>
					</Flex>
				)}
			</Dialog.Content>
		</Dialog.Root>
	);
};
