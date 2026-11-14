import {
	ArrowDownload24Regular,
	ArrowLeft20Regular,
	DismissRegular,
	GlobeSearch24Regular,
	MusicNote2Filled,
	Search24Regular,
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
	ScrollArea,
	Select,
	Spinner,
	Switch,
	Text,
	TextField,
} from "@radix-ui/themes";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { uid } from "uid";

import { audioEngine } from "$/modules/audio/audio-engine";
import { tryReloadAudioFromComputer } from "$/modules/audio/utils/autoReloadAudio";
import { audioCoverArtAtom } from "$/modules/audio/states";
import { GeniusResolver, isGeniusSongUrl } from "$/modules/genius/api/client";
import { JooxApi } from "$/modules/joox/api/client";
import { parseLyric as parseTTML } from "$/modules/project/logic/ttml-parser";
import {
	autoLoadCloudAudioAtom,
	downloadAudioOnLyricImportAtom,
	geniusApiKeyAtom,
	jooxApiTokenAtom,
	jooxAudioQualityAtom,
	lyricImportAudioSourceAtom,
	lyricImportYtDlpFormatAtom,
	type LyricImportAudioSource,
	normalizeApostrophesOnImportAtom,
	normalizeCyrillicEsOnImportAtom,
} from "$/modules/settings/states";
import { fetchGeniusSongwritersByQuery } from "$/modules/genius/utils/fetchSongwriters";
import { isTauri } from "@tauri-apps/api/core";
import {
	downloaderInitialFormatAtom,
	downloaderInitialQueryAtom,
	downloaderOpenAtom,
} from "$/modules/downloader/states";
import type { DownloadFormat } from "$/modules/downloader/model";
import { isSpotifyUrl } from "$/modules/spotify/client";
import {
	appleTtmlImportDialogAtom,
	confirmDialogAtom,
	importLyricsPrefillAtom,
	jooxAudioSearchDialogAtom,
} from "$/states/dialogs";
import {
	isDirtyAtom,
	lyricLinesAtom,
	newLyricLinesAtom,
	projectIdAtom,
	saveFileNameAtom,
	selectedLinesAtom,
	selectedWordsAtom,
} from "$/states/main";
import type { LyricLine, TTMLLyric } from "$/types/ttml";
import {
	normalizeImportedLyricApostrophes,
	normalizeImportedLyricCyrillicEs,
} from "$/utils/apostrophe-normalization";
import { parseLrc } from "$/utils/parse-lrc";
import {
	AppleTtmlApi,
	type AppleTtmlSearchResult,
	type AppleTtmlSong,
	extractSpotifyTrackId,
	isSpotifyTrackId,
} from "../api/client";

export const ImportAppleTtmlDialog = () => {
	const { t } = useTranslation();
	const store = useStore();

	const [isOpen, setIsOpen] = useAtom(appleTtmlImportDialogAtom);
	const [prefill, setPrefill] = useAtom(importLyricsPrefillAtom);

	const isDirty = useAtomValue(isDirtyAtom);
	const setNewLyricLines = useSetAtom(newLyricLinesAtom);
	const setLyricLines = useSetAtom(lyricLinesAtom);
	const setProjectId = useSetAtom(projectIdAtom);
	const setSaveFileName = useSetAtom(saveFileNameAtom);
	const setConfirmDialog = useSetAtom(confirmDialogAtom);
	const setAudioCoverArt = useSetAtom(audioCoverArtAtom);
	const autoLoadCloudAudio = useAtomValue(autoLoadCloudAudioAtom);
	const [downloadAudio, setDownloadAudio] = useAtom(
		downloadAudioOnLyricImportAtom,
	);
	const [lyricImportAudioSource, setLyricImportAudioSource] = useAtom(
		lyricImportAudioSourceAtom,
	);
	const [lyricImportYtDlpFormat, setLyricImportYtDlpFormat] = useAtom(
		lyricImportYtDlpFormatAtom,
	);
	const isDesktop = isTauri();
	const effectiveAudioSource: LyricImportAudioSource =
		!isDesktop && lyricImportAudioSource === "ytdlp"
			? "dm"
			: lyricImportAudioSource;
	const displayAudioSource: LyricImportAudioSource =
		effectiveAudioSource === "builtin" ? "all" : effectiveAudioSource;
	const setDownloaderOpen = useSetAtom(downloaderOpenAtom);
	const setDownloaderInitialQuery = useSetAtom(downloaderInitialQueryAtom);
	const setDownloaderInitialFormat = useSetAtom(downloaderInitialFormatAtom);
	const [jooxToken] = useAtom(jooxApiTokenAtom);
	const [audioQuality, setAudioQuality] = useAtom(jooxAudioQualityAtom);
	const setJooxAudioSearch = useSetAtom(jooxAudioSearchDialogAtom);
	const geniusApiKey = useAtomValue(geniusApiKeyAtom);

	const normalizeApostrophesOnImport = useAtomValue(
		normalizeApostrophesOnImportAtom,
	);
	const normalizeCyrillicEsOnImport = useAtomValue(
		normalizeCyrillicEsOnImportAtom,
	);

	const [query, setQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [isFetchingSong, setIsFetchingSong] = useState(false);
	const [searchResults, setSearchResults] = useState<AppleTtmlSearchResult[]>(
		[],
	);
	const [selectedSong, setSelectedSong] = useState<AppleTtmlSong | null>(null);
	const [lastSpotifyId, setLastSpotifyId] = useState<string>("");

	const fetchSongDetails = useCallback(
		async (idOrUrl: string) => {
			setIsFetchingSong(true);
			try {
				const trackId = extractSpotifyTrackId(idOrUrl);
				setLastSpotifyId(trackId);
				const song = await AppleTtmlApi.getLyrics(trackId || idOrUrl);
				if (!song || (!song.name && !song.artist)) {
					throw new Error(
						t("appleTtml.notFound", "No song found for this Spotify ID."),
					);
				}
				setSelectedSong(song);
			} catch (err) {
				console.error("Failed to fetch Apple TTML song:", err);
				setSelectedSong(null);
				toast.error(
					(err as Error)?.message ||
						t("appleTtml.fetchError", "Failed to fetch Apple Music TTML."),
				);
			} finally {
				setIsFetchingSong(false);
			}
		},
		[t],
	);

	const handleSearch = useCallback(
		async (customQuery?: string) => {
			let target = (customQuery ?? query).trim();
			if (!target) return;

			if (isGeniusSongUrl(target)) {
				try {
					const resolved = await GeniusResolver.resolveSong(target);
					if (resolved) {
						target = resolved.artist
							? `${resolved.artist} ${resolved.title}`
							: resolved.title;
						setQuery(target);
					}
				} catch (err) {
					console.warn(
						"Failed to resolve Genius song link in Apple TTML:",
						err,
					);
				}
			}

			// If user provided a Spotify URL or direct track ID, fetch directly!
			const looksLikeId = isSpotifyUrl(target) || isSpotifyTrackId(target);

			if (looksLikeId) {
				await fetchSongDetails(target);
				return;
			}

			setIsSearching(true);
			setSelectedSong(null);
			try {
				const results = await AppleTtmlApi.search(target);
				setSearchResults(results);
				if (results.length === 0) {
					toast.info(
						t("appleTtml.noResults", "No songs found for your search."),
					);
				}
			} catch (err) {
				console.error("Failed to search songs:", err);
				toast.error(
					(err as Error)?.message ||
						t("appleTtml.searchError", "Failed to search songs."),
				);
			} finally {
				setIsSearching(false);
			}
		},
		[query, fetchSongDetails, t],
	);

	// Handle prefill if opened from checklist or chooser
	useEffect(() => {
		if (
			isOpen &&
			prefill &&
			(prefill.source === "apple-ttml" || prefill.source === "spotify")
		) {
			const initialQuery =
				prefill.track?.id?.toString() ||
				prefill.query ||
				(prefill.track ? `${prefill.track.artist} ${prefill.track.name}` : "");

			if (initialQuery) {
				setQuery(initialQuery);
				if (prefill.track?.id) {
					fetchSongDetails(prefill.track.id.toString());
				} else {
					handleSearch(initialQuery);
				}
			}
			setPrefill(null);
		}
	}, [isOpen, prefill, fetchSongDetails, handleSearch, setPrefill]);

	// Reset state when modal closes
	useEffect(() => {
		if (!isOpen) {
			setSearchResults([]);
			setSelectedSong(null);
			setQuery("");
			setLastSpotifyId("");
		}
	}, [isOpen]);

	const executeImport = (song: AppleTtmlSong) => {
		try {
			let lyricData: TTMLLyric | null = null;

			if (song.ttml && song.ttml.trim()) {
				try {
					lyricData = parseTTML(song.ttml);
				} catch (ttmlErr) {
					console.warn("Failed to parse TTML directly:", ttmlErr);
				}
			}

			if (
				(!lyricData || lyricData.lyricLines.length === 0) &&
				song.syncedLyrics &&
				song.syncedLyrics.trim()
			) {
				const rawLines: LyricLine[] = parseLrc(song.syncedLyrics);
				lyricData = {
					lyricLines: rawLines.map((line) => ({
						...line,
						words: line.words.map((w) => ({
							...w,
							id: uid(),
							obscene: false,
						})),
						ignoreSync: false,
						id: uid(),
					})),
					metadata: lyricData?.metadata || [],
				};
			}

			if (!lyricData || lyricData.lyricLines.length === 0) {
				toast.error(
					t(
						"appleTtml.noLyricsFound",
						"No time-synced lyrics or TTML found for this song.",
					),
				);
				return;
			}

			// Ensure essential metadata is present
			const meta = [...lyricData.metadata];
			const setMetaKey = (key: string, value: string) => {
				if (!value) return;
				const idx = meta.findIndex(
					(m) => m.key.toLowerCase() === key.toLowerCase(),
				);
				if (idx >= 0) {
					if (!meta[idx].value.length || !meta[idx].value[0]) {
						meta[idx] = { key, value: [value] };
					}
				} else {
					meta.push({ key, value: [value] });
				}
			};

			if (song.name) {
				setMetaKey("musicName", song.name);
				setMetaKey("title", song.name);
			}
			if (song.artist) {
				setMetaKey("artists", song.artist);
				setMetaKey("artist", song.artist);
			}
			if (song.album) setMetaKey("album", song.album);
			if (song.artwork) setMetaKey("cover_art", song.artwork);
			if (song.isrc) setMetaKey("isrc", song.isrc);
			if (song.id) {
				setMetaKey("appleMusicId", song.id);
				setMetaKey("apple:track_id", song.id);
			}
			if (lastSpotifyId) {
				setMetaKey("spotifyId", lastSpotifyId);
				setMetaKey("spotify:track_id", lastSpotifyId);
			}

			lyricData.metadata = meta;

			// Normalization
			lyricData = normalizeImportedLyricApostrophes(
				lyricData,
				normalizeApostrophesOnImport,
			);
			lyricData = normalizeImportedLyricCyrillicEs(
				lyricData,
				normalizeCyrillicEsOnImport,
			);

			// Commit to editor
			setProjectId(uid());
			setNewLyricLines(lyricData);

			const safeTitle = song.name || "Unknown Track";
			const safeArtist = song.artist || "Unknown Artist";
			setSaveFileName(`${safeArtist} - ${safeTitle}.ttml`);

			// Fetch songwriters if not already present in the TTML metadata
			const hasSongwriter = meta.some(
				(m) => m.key === "songwriter" && m.value.some((v) => v.trim()),
			);
			if (!hasSongwriter && song.name) {
				const query = [song.artist, song.name].filter(Boolean).join(" ");
				void fetchGeniusSongwritersByQuery(query, {
					geniusApiKey,
					findRealNames: true,
				}).then((writers) => {
					if (writers && writers.length > 0) {
						setLyricLines((prev) => {
							const existing = prev.metadata.find(
								(m) => m.key === "songwriter",
							);
							if (existing) {
								existing.value = writers;
							} else {
								prev.metadata.push({ key: "songwriter", value: writers });
							}
						});
					}
				});
			}

			// Update artwork if provided
			if (song.artwork) {
				setAudioCoverArt(song.artwork);
			}

			// Select first line and word
			if (lyricData.lyricLines.length > 0) {
				const firstLine = lyricData.lyricLines[0];
				store.set(selectedLinesAtom, new Set([firstLine.id]));
				if (firstLine.words.length > 0) {
					store.set(selectedWordsAtom, new Set([firstLine.words[0].id]));
				}
			}

			toast.success(
				t(
					"appleTtml.importSuccess",
					"Imported Apple Music TTML with full timings successfully!",
				),
			);

			// Automatically load matching audio from computer or JOOX API
			if (autoLoadCloudAudio || downloadAudio) {
				void (async () => {
					let audioLoaded = await tryReloadAudioFromComputer({
						title: safeTitle,
						artist: safeArtist,
					});

					if (!audioLoaded && (safeTitle || safeArtist)) {
						if (downloadAudio && effectiveAudioSource === "ytdlp") {
							const query =
								[safeArtist, safeTitle].filter(Boolean).join(" - ").trim() ||
								safeTitle;
							setDownloaderInitialQuery(query);
							setDownloaderInitialFormat(
								lyricImportYtDlpFormat as DownloadFormat,
							);
							setDownloaderOpen(true);
							toast.info(
								t(
									"downloader.openedForTrack",
									'Opening Media Downloader for "{title}"...',
									{ title: safeTitle },
								),
								{ autoClose: 3000 },
							);
							return;
						}

						let audioToastId: any = null;
						try {
							audioToastId = toast.loading(
								t(
									"joox.downloadingAudio",
									'[Beta] Downloading audio for "{title}"...',
									{ title: safeTitle },
								),
								{
									autoClose: false,
									closeButton: false,
									closeOnClick: false,
								},
							);

							const result = await JooxApi.searchAndGetAudio(
								safeTitle,
								safeArtist,
								jooxToken,
								audioQuality,
								effectiveAudioSource,
							);
							if (result?.audioBlob) {
								const audioFile = new File(
									[result.audioBlob],
									result.fileName || `${safeArtist} - ${safeTitle}.mp3`,
									{ type: result.audioBlob.type || "audio/mpeg" },
								);
								(audioFile as any).isAutoDownloaded = true;
								await audioEngine.loadMusic(audioFile, false, true);
								toast.update(audioToastId, {
									render: t("joox.audioLoaded", 'Loaded audio for "{title}"', {
										title: safeTitle,
									}),
									type: "success",
									isLoading: false,
									autoClose: 3000,
									closeButton: true,
									closeOnClick: true,
								});
							} else {
								toast.update(audioToastId, {
									render: t(
										"joox.audioNotFound",
										'Could not find matching audio for "{title}" on JOOX',
										{ title: safeTitle },
									),
									type: "warning",
									isLoading: false,
									autoClose: 4000,
									closeButton: true,
									closeOnClick: true,
								});
								setJooxAudioSearch({
									open: true,
									title: safeTitle,
									artist: safeArtist,
								});
							}
						} catch (apiErr) {
							console.warn("Failed to auto-fetch audio from API:", apiErr);
							if (audioToastId) {
								toast.update(audioToastId, {
									render: t(
										"joox.audioFailed",
										"Could not download audio: {error}",
										{
											error: (apiErr as Error)?.message || "Unknown error",
										},
									),
									type: "error",
									isLoading: false,
									autoClose: 5000,
									closeButton: true,
									closeOnClick: true,
								});
							}
							setJooxAudioSearch({
								open: true,
								title: safeTitle,
								artist: safeArtist,
							});
						}
					}
				})();
			}

			setIsOpen(false);
		} catch (err) {
			console.error("Failed to parse and import Apple TTML:", err);
			toast.error(
				(err as Error)?.message ||
					t("appleTtml.parseError", "Failed to parse imported TTML."),
			);
		}
	};

	const handleImportClick = () => {
		if (!selectedSong) return;

		if (isDirty) {
			setConfirmDialog({
				open: true,
				title: t("confirmDialog.openFile.title", "Confirm Import"),
				description: t(
					"confirmDialog.openFile.description",
					"You have unsaved changes in the current project. If you proceed, these changes will be replaced. Do you want to continue?",
				),
				onConfirm: () => executeImport(selectedSong),
			});
		} else {
			executeImport(selectedSong);
		}
	};

	return (
		<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Content style={{ maxWidth: 680, width: "100%" }}>
				<Flex justify="between" align="start" gap="3" mb="3">
					<Flex align="center" gap="3">
						<Box
							style={{
								width: 36,
								height: 36,
								borderRadius: 8,
								background:
									"linear-gradient(135deg, var(--crimson-9, #e54666), var(--plum-9, #ab4aba))",
								color: "#fff",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<MusicNote2Filled style={{ width: 22, height: 22 }} />
						</Box>
						<Box>
							<Dialog.Title mb="1">
								{t("appleTtml.dialogTitle", "Import Apple Music TTML")}
							</Dialog.Title>
							<Dialog.Description size="2" color="gray">
								{t(
									"appleTtml.dialogDescription",
									"Import pre-existing word-timed TTML lyrics directly from Apple Music using a Spotify track link or ID.",
								)}
							</Dialog.Description>
						</Box>
					</Flex>
					<Dialog.Close>
						<IconButton variant="ghost" color="gray" size="2">
							<DismissRegular />
						</IconButton>
					</Dialog.Close>
				</Flex>

				{/* Search & Fetch Input */}
				<Flex gap="2" mb="4">
					<TextField.Root
						placeholder={t(
							"appleTtml.searchPlaceholder",
							"Paste Spotify / Genius link, track ID, or search title & artist...",
						)}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSearch();
						}}
						style={{ flex: 1 }}
						size="3"
					>
						<TextField.Slot>
							<Search24Regular
								style={{ width: 18, height: 18, opacity: 0.6 }}
							/>
						</TextField.Slot>
						{query && (
							<TextField.Slot>
								<IconButton
									variant="ghost"
									size="1"
									color="gray"
									onClick={() => setQuery("")}
								>
									<DismissRegular style={{ width: 14, height: 14 }} />
								</IconButton>
							</TextField.Slot>
						)}
					</TextField.Root>
					<Button
						size="3"
						disabled={!query.trim() || isSearching || isFetchingSong}
						onClick={() => handleSearch()}
					>
						{isSearching || isFetchingSong ? (
							<Spinner />
						) : isSpotifyUrl(query) || isSpotifyTrackId(query) ? (
							<>
								<ArrowDownload24Regular style={{ width: 18, height: 18 }} />
								{t("appleTtml.fetchLyrics", "Fetch TTML")}
							</>
						) : (
							<>
								<GlobeSearch24Regular style={{ width: 18, height: 18 }} />
								{t("common.search", "Search")}
							</>
						)}
					</Button>
				</Flex>

				{/* Loading indicator */}
				{(isSearching || isFetchingSong) && (
					<Flex
						direction="column"
						align="center"
						justify="center"
						py="6"
						gap="3"
					>
						<Spinner size="3" />
						<Text size="2" color="gray">
							{isFetchingSong
								? t(
										"appleTtml.fetchingTtml",
										"Retrieving Apple Music TTML with word timestamps...",
									)
								: t("appleTtml.searchingTracks", "Searching Spotify tracks...")}
						</Text>
					</Flex>
				)}

				{/* Selected Song Preview */}
				{!isSearching && !isFetchingSong && selectedSong && (
					<Flex direction="column" gap="3">
						{searchResults.length > 0 && (
							<Button
								variant="ghost"
								size="1"
								color="gray"
								onClick={() => setSelectedSong(null)}
								style={{ alignSelf: "flex-start", marginBottom: -4 }}
							>
								<ArrowLeft20Regular style={{ width: 16, height: 16 }} />
								{t("appleTtml.backToResults", "Back to search results")}
							</Button>
						)}

						<Card variant="surface" style={{ padding: "var(--space-3)" }}>
							<Flex gap="3" align="start">
								{selectedSong.artwork ? (
									<img
										src={selectedSong.artwork}
										alt={selectedSong.name}
										crossOrigin="anonymous"
										referrerPolicy="no-referrer"
										style={{
											width: 80,
											height: 80,
											borderRadius: 8,
											objectFit: "cover",
											boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
											flexShrink: 0,
										}}
									/>
								) : (
									<Box
										style={{
											width: 80,
											height: 80,
											borderRadius: 8,
											background: "var(--gray-4)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
										}}
									>
										<MusicNote2Filled
											style={{ width: 32, height: 32, opacity: 0.4 }}
										/>
									</Box>
								)}
								<Flex
									direction="column"
									gap="1"
									style={{ flex: 1, minWidth: 0 }}
								>
									<Heading size="3" style={{ wordBreak: "break-word" }}>
										{selectedSong.name}
									</Heading>
									<Text size="2" weight="medium" color="gray">
										{selectedSong.artist}
									</Text>
									{selectedSong.album && (
										<Text size="1" color="gray">
											{selectedSong.album}
										</Text>
									)}
									<Flex gap="2" mt="1" wrap="wrap">
										{selectedSong.ttmlTiming === "Word" ? (
											<Badge color="green" size="1">
												{t("appleTtml.badgeWordSynced", "Word-Synced TTML")}
											</Badge>
										) : selectedSong.ttmlTiming === "Line" ? (
											<Badge color="blue" size="1">
												{t("appleTtml.badgeLineSynced", "Line-Synced")}
											</Badge>
										) : selectedSong.hasTimeSyncedLyrics ? (
											<Badge color="cyan" size="1">
												{t("appleTtml.badgeSyncedLyrics", "Time Synced")}
											</Badge>
										) : (
											<Badge color="orange" size="1">
												{t(
													"appleTtml.badgeNoSyncedLyrics",
													"Plain Lyrics Only",
												)}
											</Badge>
										)}
										{selectedSong.hasDuetLyrics && (
											<Badge color="purple" size="1">
												{t("appleTtml.badgeDuet", "Duet")}
											</Badge>
										)}
									</Flex>
								</Flex>
							</Flex>
						</Card>

						{/* Lyrics Preview */}
						{(selectedSong.syncedLyrics ||
							selectedSong.lyrics ||
							selectedSong.ttml) && (
							<Box>
								<Text size="1" weight="bold" color="gray" mb="1" as="div">
									{t("appleTtml.previewLyrics", "Lyrics Preview:")}
								</Text>
								<Card
									variant="surface"
									style={{
										padding: "var(--space-2)",
										background: "var(--gray-2)",
									}}
								>
									<ScrollArea style={{ maxHeight: 180 }}>
										<Text
											size="1"
											as="p"
											style={{
												whiteSpace: "pre-wrap",
												fontFamily: "var(--font-mono, monospace)",
												lineHeight: 1.5,
												color: "var(--gray-11)",
											}}
										>
											{selectedSong.syncedLyrics ||
												selectedSong.lyrics ||
												t(
													"appleTtml.ttmlAvailable",
													"[TTML XML Data Available]",
												)}
										</Text>
									</ScrollArea>
								</Card>
							</Box>
						)}

						{/* Action bar with audio download toggle */}
						<Flex align="center" justify="between" gap="3" mt="3" wrap="wrap">
							<Flex
								align="center"
								gap="2"
								style={{
									padding: "4px 8px",
									borderRadius: "var(--radius-2)",
									backgroundColor: downloadAudio
										? "var(--accent-a3)"
										: "var(--gray-a2)",
									border: `1px solid ${
										downloadAudio
											? "var(--accent-a6)"
											: "var(--gray-a4)"
									}`,
									transition: "all 0.15s ease",
								}}
							>
								<Switch
									id="chk-apple-download-audio"
									size="1"
									checked={downloadAudio}
									onCheckedChange={setDownloadAudio}
								/>
								<Flex align="center" gap="2">
									<Text
										size="1"
										as="label"
										htmlFor="chk-apple-download-audio"
										weight={downloadAudio ? "medium" : "regular"}
										style={{
											cursor: "pointer",
											userSelect: "none",
											color: downloadAudio
												? "var(--accent-11)"
												: "var(--gray-12)",
										}}
									>
										{effectiveAudioSource === "ytdlp"
											? t(
													"joox.openDownloaderOnImport",
													"Open Media Downloader on import",
												)
											: t("joox.downloadAudio", "Download audio into app")}
									</Text>
									<Badge color="orange" size="1" variant="soft">
										Beta
									</Badge>
								</Flex>
								{downloadAudio && (
									<Select.Root
										size="1"
										value={displayAudioSource}
										onValueChange={(val: LyricImportAudioSource) => {
											if (isDesktop || val !== "ytdlp") {
												setLyricImportAudioSource(val);
											}
										}}
									>
										<Select.Trigger
											aria-label={t(
												"joox.downloaderSource",
												"Audio Downloader",
											)}
											style={{
												height: 22,
												fontSize: 11,
												padding: "0 8px",
												borderRadius: "var(--radius-1)",
												minWidth: 150,
											}}
										/>
										<Select.Content position="popper">
											<Select.Item value="dm">
												{t(
													"joox.dmDownloader",
													"Deezer (DM Revival)",
												)}
											</Select.Item>
											<Select.Item value="all">
												{t(
													"joox.allSourcesDownloader",
													"All Sources (Auto)",
												)}
											</Select.Item>
											<Select.Item value="kuwo">
												{t(
													"joox.kuwoDownloader",
													"Kuwo Music",
												)}
											</Select.Item>
											<Select.Item value="joox">
												{t("joox.jooxDownloader", "JOOX")}
											</Select.Item>
											<Select.Item value="qq">
												{t("joox.qqDownloader", "QQ Music")}
											</Select.Item>
											<Select.Item value="ytdlp" disabled={!isDesktop}>
												{t("joox.ytdlpDownloader", "yt-dlp")}
												{!isDesktop
													? ` (${t("downloader.desktopOnlyShort", "Desktop only")})`
													: ""}
											</Select.Item>
										</Select.Content>
									</Select.Root>
								)}
								{downloadAudio &&
									effectiveAudioSource !== "ytdlp" && (
										<Select.Root
											size="1"
											value={audioQuality}
											onValueChange={setAudioQuality}
										>
											<Select.Trigger
												aria-label="Quality"
												style={{
													height: 22,
													fontSize: 11,
													padding: "0 8px",
													borderRadius: "var(--radius-1)",
													minWidth: 115,
												}}
											/>
											<Select.Content position="popper">
												<Select.Item value="320">MP3 320k</Select.Item>
												<Select.Item value="flac">
													FLAC Lossless
												</Select.Item>
												<Select.Item value="128">MP3 128k</Select.Item>
											</Select.Content>
										</Select.Root>
									)}
								{downloadAudio &&
									effectiveAudioSource === "ytdlp" && (
										<Select.Root
											size="1"
											value={lyricImportYtDlpFormat}
											onValueChange={(val: string) =>
												setLyricImportYtDlpFormat(val)
											}
										>
											<Select.Trigger
												aria-label="Format"
												style={{
													height: 22,
													fontSize: 11,
													padding: "0 8px",
													borderRadius: "var(--radius-1)",
													minWidth: 80,
												}}
											/>
											<Select.Content position="popper">
												<Select.Item value="mp3">MP3</Select.Item>
												<Select.Item value="m4a">M4A</Select.Item>
												<Select.Item value="flac">FLAC</Select.Item>
												<Select.Item value="wav">WAV</Select.Item>
												<Select.Item value="opus">Opus</Select.Item>
											</Select.Content>
										</Select.Root>
									)}
							</Flex>
							<Flex justify="end" gap="3">
								<Button
									variant="soft"
									color="gray"
									onClick={() => setIsOpen(false)}
								>
									{t("common.cancel", "Cancel")}
								</Button>
								<Button
									color="crimson"
									disabled={!selectedSong.ttml && !selectedSong.syncedLyrics}
									onClick={handleImportClick}
								>
									<ArrowDownload24Regular style={{ width: 18, height: 18 }} />
									{t("appleTtml.importIntoEditor", "Import TTML into Editor")}
								</Button>
							</Flex>
						</Flex>
					</Flex>
				)}

				{/* Search Results List */}
				{!isSearching &&
					!isFetchingSong &&
					!selectedSong &&
					searchResults.length > 0 && (
						<Flex direction="column" gap="2">
							<Text size="1" weight="bold" color="gray">
								{t(
									"appleTtml.selectTrack",
									"Select a track to fetch Apple Music TTML:",
								)}
							</Text>
							<ScrollArea style={{ maxHeight: 320 }}>
								<Flex direction="column" gap="2" pr="2">
									{searchResults.map((item) => (
										<Card
											key={item.id}
											asChild
											variant="surface"
											style={{
												cursor: "pointer",
												transition: "background 0.15s ease",
												padding: "var(--space-2)",
											}}
										>
											<button
												type="button"
												onClick={() => fetchSongDetails(item.id)}
												style={{
													textAlign: "left",
													background: "transparent",
													border: "none",
													width: "100%",
													display: "flex",
													alignItems: "center",
													gap: "var(--space-3)",
												}}
											>
												{item.artwork ? (
													<img
														src={item.artwork}
														alt={item.name}
														crossOrigin="anonymous"
														referrerPolicy="no-referrer"
														style={{
															width: 48,
															height: 48,
															borderRadius: 6,
															objectFit: "cover",
															flexShrink: 0,
														}}
													/>
												) : (
													<Box
														style={{
															width: 48,
															height: 48,
															borderRadius: 6,
															background: "var(--gray-4)",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
															flexShrink: 0,
														}}
													>
														<MusicNote2Filled
															style={{ width: 20, height: 20, opacity: 0.4 }}
														/>
													</Box>
												)}
												<Flex
													direction="column"
													gap="0"
													style={{ flex: 1, minWidth: 0 }}
												>
													<Text size="2" weight="bold" truncate>
														{item.name}
													</Text>
													<Text size="1" color="gray" truncate>
														{item.artistNames || item.artist}
													</Text>
													{item.album && (
														<Text
															size="1"
															color="gray"
															truncate
															style={{ opacity: 0.8 }}
														>
															{item.album}
														</Text>
													)}
												</Flex>
												<ArrowDownload24Regular
													style={{
														width: 18,
														height: 18,
														opacity: 0.5,
														flexShrink: 0,
													}}
												/>
											</button>
										</Card>
									))}
								</Flex>
							</ScrollArea>
						</Flex>
					)}

				{/* Empty / Initial guide state */}
				{!isSearching &&
					!isFetchingSong &&
					!selectedSong &&
					searchResults.length === 0 && (
						<Box
							py="6"
							px="4"
							style={{
								textAlign: "center",
								background: "var(--gray-2)",
								borderRadius: 8,
								border: "1px dashed var(--gray-6)",
							}}
						>
							<MusicNote2Filled
								style={{
									width: 32,
									height: 32,
									color: "var(--crimson-9, #e54666)",
									marginBottom: 8,
								}}
							/>
							<Text size="2" weight="bold" as="div" mb="1">
								{t("appleTtml.guideTitle", "Quick TTML Import")}
							</Text>
							<Text
								size="1"
								color="gray"
								as="div"
								style={{ maxWidth: 440, margin: "0 auto" }}
							>
								{t(
									"appleTtml.guideText",
									"Copy a track link from Spotify (e.g. open.spotify.com/track/...) or enter a song name above to retrieve word-timed Apple Music TTML.",
								)}
							</Text>
						</Box>
					)}
			</Dialog.Content>
		</Dialog.Root>
	);
};
