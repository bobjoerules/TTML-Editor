import {
	ArrowDownload24Regular,
	ArrowLeft20Regular,
	DismissRegular,
	Edit20Regular,
	Eye20Regular,
	GlobeSearch24Regular,
	Key20Regular,
	MusicNote1Regular,
	MusicNote2Filled,
	Search24Regular,
} from "@fluentui/react-icons";
import {
	Badge,
	Box,
	Button,
	Card,
	Checkbox,
	Dialog,
	Flex,
	Heading,
	IconButton,
	ScrollArea,
	Select,
	Spinner,
	Text,
	TextArea,
	TextField,
} from "@radix-ui/themes";
import { isTauri } from "@tauri-apps/api/core";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useImmerAtom } from "jotai-immer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { uid } from "uid";
import { audioEngine } from "$/modules/audio/audio-engine";
import type { DownloadFormat } from "$/modules/downloader/model";
import {
	downloaderInitialFormatAtom,
	downloaderInitialQueryAtom,
	downloaderOpenAtom,
} from "$/modules/downloader/states";
import {
	GeniusApi,
	GeniusResolver,
	isGeniusSongUrl,
} from "$/modules/genius/api/client";
import { getBetterGeniusCoverArt } from "$/modules/genius/utils/image";
import { fetchItunesCover, JooxApi } from "$/modules/joox/api/client";
import { LrcLibApi } from "$/modules/lrclib/api/client";
import {
	type AutoDuetResult,
	applyAutoDuetBySinger,
} from "$/modules/lyric-editor/utils/auto-duet.ts";
import { getGeniusHeader } from "$/modules/lyric-editor/utils/genius-sections.ts";
import { applyReviewedSections } from "$/modules/lyric-editor/utils/section-system.ts";
import { LyricallyApi } from "$/modules/lyrically/api/client";
import {
	segmentationEngineAtom,
	segmentationSplitEnglishAtom,
} from "$/modules/segmentation/states/index.ts";
import type { SegmentationEngineId } from "$/modules/segmentation/types";
import { detectSyllabificationEngineFromText } from "$/modules/segmentation/utils/detect-syllabification-engine";
import { loadHyphenator } from "$/modules/segmentation/utils/hyphen-loader";
import { segmentLyricLines } from "$/modules/segmentation/utils/segmentation";
import {
	getHyphenationLanguage,
	SYLLABIFICATION_ENGINES,
} from "$/modules/segmentation/utils/syllabification-engines";
import { useSegmentationConfig } from "$/modules/segmentation/utils/useSegmentationConfig";
import {
	autoDuetOnGeniusImportAtom,
	autoSegmentOnLyricImportAtom,
	downloadAudioOnLyricImportAtom,
	geniusApiKeyAtom,
	geniusCategorizationEnabledAtom,
	jooxApiTokenAtom,
	jooxAudioQualityAtom,
	type LyricImportAudioSource,
	lyricImportAudioSourceAtom,
	lyricImportYtDlpFormatAtom,
	normalizeApostrophesOnImportAtom,
	normalizeCyrillicEsOnImportAtom,
	splitBackgroundLyricsOnGeniusImportAtom,
} from "$/modules/settings/states/index.ts";
import { isSpotifyUrl, SpotifyResolver } from "$/modules/spotify/client";
import {
	confirmDialogAtom,
	geniusImportLyricsDialogAtom,
	importFromLRCLIBDialogAtom,
	importLyricsPrefillAtom,
	jooxAudioSearchDialogAtom,
	jooxImportLyricsDialogAtom,
	lyricallyImportLyricsDialogAtom,
} from "$/states/dialogs.ts";
import {
	isDirtyAtom,
	lyricLinesAtom,
	saveFileNameAtom,
	selectedLinesAtom,
	selectedWordsAtom,
} from "$/states/main.ts";
import type { LyricLine, LyricWord } from "$/types/ttml.ts";
import {
	normalizeImportedLyricApostrophes,
	normalizeImportedLyricCyrillicEs,
} from "$/utils/apostrophe-normalization";
import { getGeniusKeyGuideUrl } from "$/utils/genius-guide";
import { prepareLyricLine, splitBackgroundLine } from "$/utils/lyric-prep";
import type { ReviewedSection } from "./SectionImportReviewDialog";

type ImportSource = "lyrically" | "genius" | "lrclib" | "joox";

type ImportTrack = {
	id: string | number;
	name: string;
	artist: string;
	album?: string;
	cover?: string;
	lyrics?: string;
	source?: string;
	duration?: string;
	fetchLyrics?: () => Promise<string>;
	fetchSongwriters?: () => Promise<string[]>;
	audioUrls?: Record<string, string>;
};

const lrcToPlainLyrics = (lyrics: string) =>
	lyrics.replace(/^\s*\[(?:\d+:)?\d{1,2}(?:[.:]\d{1,3})?\]\s*/gm, "");

const PROVIDER_CONFIG = {
	genius: {
		name: "Genius",
		badgeColor: "orange" as const,
		icon: <MusicNote1Regular style={{ width: 22, height: 22 }} />,
		color: "var(--orange-11)",
		background: "var(--orange-3)",
		titleKey: "genius.importTitle",
		defaultTitle: "Import Lyrics from Genius",
		descKey: "genius.importDesc",
		defaultDesc:
			"Search and import rich lyrics, headers, and songwriter metadata from Genius.",
		buttonColor: "orange" as const,
	},
	joox: {
		name: "JOOX Music",
		badgeColor: "teal" as const,
		icon: <ArrowDownload24Regular style={{ width: 22, height: 22 }} />,
		color: "var(--teal-11)",
		background: "var(--teal-3)",
		titleKey: "joox.title",
		defaultTitle: "Import Lyrics & Audio from JOOX",
		descKey: "joox.importDesc",
		defaultDesc:
			"Search and import synced lyrics or download audio straight into your project.",
		buttonColor: "teal" as const,
	},
	lrclib: {
		name: "LRCLIB",
		badgeColor: "green" as const,
		icon: <Search24Regular style={{ width: 22, height: 22 }} />,
		color: "var(--green-11)",
		background: "var(--green-3)",
		titleKey: "lrclib.title",
		defaultTitle: "Import Lyrics from LRCLIB",
		descKey: "lrclib.importDesc",
		defaultDesc:
			"Search and import synchronized or plain lyrics from the LRCLIB open database.",
		buttonColor: "green" as const,
	},
	lyrically: {
		name: "Lyrically",
		badgeColor: "purple" as const,
		icon: <GlobeSearch24Regular style={{ width: 22, height: 22 }} />,
		color: "var(--purple-11)",
		background: "var(--purple-3)",
		titleKey: "lyrically.importTitle",
		defaultTitle: "Import Lyrics safely via Lyrically",
		descKey: "lyrically.importDesc",
		defaultDesc:
			"Search and import clean lyrics safely across multiple platforms via Lyrically.",
		buttonColor: "purple" as const,
	},
};

const TrackCover = ({
	cover,
	name,
	size = 48,
	borderRadius = 8,
}: {
	cover?: string;
	name: string;
	size?: number;
	borderRadius?: number;
}) => {
	const [error, setError] = useState(false);

	useEffect(() => {
		setError(false);
	}, [cover]);

	if (!cover || error) {
		return (
			<Box
				style={{
					width: size,
					height: size,
					borderRadius,
					backgroundColor: "var(--gray-4)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
				}}
			>
				<MusicNote2Filled
					style={{
						width: Math.round(size * 0.45),
						height: Math.round(size * 0.45),
						opacity: 0.4,
					}}
				/>
			</Box>
		);
	}

	return (
		<img
			src={getBetterGeniusCoverArt(cover, 100)}
			alt={name}
			style={{
				width: size,
				height: size,
				borderRadius,
				objectFit: "cover",
				boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
				flexShrink: 0,
			}}
			referrerPolicy="no-referrer"
			onError={() => setError(true)}
		/>
	);
};

export const ImportLyricsDialog = ({
	source = "lyrically",
}: {
	source?: ImportSource;
}) => {
	const { t, i18n } = useTranslation();
	const store = useStore();
	const provider = PROVIDER_CONFIG[source] || PROVIDER_CONFIG.lyrically;

	const dialogAtom =
		source === "genius"
			? geniusImportLyricsDialogAtom
			: source === "lrclib"
				? importFromLRCLIBDialogAtom
				: source === "joox"
					? jooxImportLyricsDialogAtom
					: lyricallyImportLyricsDialogAtom;
	const [isOpen, setIsOpen] = useAtom(dialogAtom);
	const [, setLyricLines] = useImmerAtom(lyricLinesAtom);
	const setSaveFileName = useSetAtom(saveFileNameAtom);
	const isDirty = useAtomValue(isDirtyAtom);
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
	const effectiveAudioSource = isDesktop ? lyricImportAudioSource : "builtin";
	const setDownloaderOpen = useSetAtom(downloaderOpenAtom);
	const setDownloaderInitialQuery = useSetAtom(downloaderInitialQueryAtom);
	const setDownloaderInitialFormat = useSetAtom(downloaderInitialFormatAtom);
	const [autoSegment, setAutoSegment] = useAtom(autoSegmentOnLyricImportAtom);
	const savedSegmentationEngine = useAtomValue(segmentationEngineAtom);
	const setSavedSegmentationEngine = useSetAtom(segmentationEngineAtom);
	const setSplitEnglish = useSetAtom(segmentationSplitEnglishAtom);
	const { config: segmentationConfig } = useSegmentationConfig();
	const [selectedEngine, setSelectedEngine] = useState<SegmentationEngineId>(
		savedSegmentationEngine === "hyphenation-pt"
			? "prosodic"
			: savedSegmentationEngine,
	);
	const [jooxToken] = useAtom(jooxApiTokenAtom);
	const [audioQuality, setAudioQuality] = useAtom(jooxAudioQualityAtom);
	const [, setDownloadingAudio] = useState(false);
	const normalizeApostrophesOnImport = useAtomValue(
		normalizeApostrophesOnImportAtom,
	);
	const normalizeCyrillicEsOnImport = useAtomValue(
		normalizeCyrillicEsOnImportAtom,
	);
	const setConfirmDialog = useSetAtom(confirmDialogAtom);
	const setJooxAudioSearch = useSetAtom(jooxAudioSearchDialogAtom);

	// Search
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<ImportTrack[]>([]);
	const [searching, setSearching] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);

	// Lyrics preview
	const [selectedHit, setSelectedHit] = useState<ImportTrack | null>(null);
	const [fetchingLyrics, setFetchingLyrics] = useState(false);
	const [editableLyrics, setEditableLyrics] = useState("");
	const [isEditing, setIsEditing] = useState(false);
	const [processLyrics, setProcessLyrics] = useState(source === "genius");
	const [categorizeGeniusHeaders, setCategorizeGeniusHeaders] = useState(
		source === "genius",
	);
	const [autoDuet, setAutoDuet] = useAtom(autoDuetOnGeniusImportAtom);
	const [splitBackgroundLyrics, setSplitBackgroundLyrics] = useAtom(
		splitBackgroundLyricsOnGeniusImportAtom,
	);

	const detectedEngine = useMemo(
		() => detectSyllabificationEngineFromText(editableLyrics),
		[editableLyrics],
	);

	// Dynamically resolve missing artwork for the selected hit
	useEffect(() => {
		if (selectedHit && !selectedHit.cover) {
			let active = true;
			fetchItunesCover(selectedHit.name, selectedHit.artist).then((cover) => {
				if (active && cover) {
					setSelectedHit((prev) =>
						prev && prev.id === selectedHit.id ? { ...prev, cover } : prev,
					);
				}
			});
			return () => {
				active = false;
			};
		}
	}, [selectedHit?.id, selectedHit?.name, selectedHit?.artist]);

	useEffect(() => {
		if (detectedEngine) {
			setSelectedEngine(detectedEngine);
		} else {
			setSelectedEngine(
				savedSegmentationEngine === "hyphenation-pt"
					? "prosodic"
					: savedSegmentationEngine,
			);
		}
	}, [detectedEngine, savedSegmentationEngine]);
	const inputRef = useRef<HTMLInputElement>(null);
	const [geniusApiKey, setGeniusApiKey] = useAtom(geniusApiKeyAtom);
	const [, setGeniusCategorizationEnabled] = useAtom(
		geniusCategorizationEnabledAtom,
	);
	const [tempApiKey, setTempApiKey] = useState("");
	const [prefill, setPrefill] = useAtom(importLyricsPrefillAtom);

	const handleSelectSong = useCallback(
		async (hit: ImportTrack) => {
			setSelectedHit(hit);
			setFetchingLyrics(true);
			setEditableLyrics("");
			setIsEditing(false);

			try {
				const lyrics =
					hit.lyrics?.trim() ||
					(hit.fetchLyrics ? await hit.fetchLyrics() : "");
				setEditableLyrics(
					lyrics ||
						t("lyrically.noLyricsLabel", "No lyrics available for this track."),
				);
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e);
				toast.error(
					t(
						"metadataDialog.fetchSongwriters.fetchError",
						"Could not fetch lyrics: {error}",
						{ error: msg },
					),
				);
				setSelectedHit(null);
			} finally {
				setFetchingLyrics(false);
			}
		},
		[t],
	);

	const handleSearch = useCallback(async () => {
		if (!query.trim()) return;
		setSearching(true);
		setHasSearched(true);
		setResults([]);
		setSelectedHit(null);
		setEditableLyrics("");
		setIsEditing(false);

		let effectiveQuery = query.trim();
		let spotifyTrack: import("$/modules/spotify/client").ResolvedTrack | null =
			null;
		let geniusSong:
			| import("$/modules/genius/api/client").GeniusResolvedSong
			| null = null;

		if (isSpotifyUrl(effectiveQuery)) {
			try {
				const resolved = await SpotifyResolver.resolveTrack(effectiveQuery);
				if (resolved) {
					spotifyTrack = resolved;
					effectiveQuery = resolved.artist
						? `${resolved.artist} ${resolved.title}`
						: resolved.title;
					setQuery(effectiveQuery);
					toast.info(
						t(
							"lyricsImport.spotifyDetected",
							"Spotify track detected: {track}",
							{
								track: resolved.artist
									? `${resolved.artist} – ${resolved.title}`
									: resolved.title,
							},
						),
					);
				}
			} catch (err) {
				console.warn("Failed to resolve Spotify track link:", err);
			}
		} else if (isGeniusSongUrl(effectiveQuery)) {
			try {
				const resolved = await GeniusResolver.resolveSong(
					effectiveQuery,
					geniusApiKey,
				);
				if (resolved) {
					geniusSong = resolved;
					effectiveQuery = resolved.artist
						? `${resolved.artist} ${resolved.title}`
						: resolved.title;
					setQuery(effectiveQuery);
					toast.info(
						t("lyricsImport.geniusDetected", "Genius track detected: {track}", {
							track: resolved.artist
								? `${resolved.artist} – ${resolved.title}`
								: resolved.title,
						}),
					);
				}
			} catch (err) {
				console.warn("Failed to resolve Genius song link:", err);
			}
		}

		try {
			const hits: ImportTrack[] =
				source === "genius"
					? (
							await GeniusApi.search(effectiveQuery, geniusApiKey)
						).response.hits.map(({ result }) => ({
							id: result.id,
							name: result.title,
							artist: result.primary_artist.name,
							album: result.album?.name,
							cover:
								result.song_art_image_url ||
								result.song_art_image_thumbnail_url,
							fetchLyrics: () => GeniusApi.getLyrics(result.id),
							fetchSongwriters: async () => {
								const artists = (
									await GeniusApi.getSongById(result.id, geniusApiKey)
								).response.song.writer_artists;
								const realNames: string[] = [];
								for (const artist of artists) {
									try {
										const detail = (
											await GeniusApi.getArtistById(artist.id, geniusApiKey)
										).response.artist;
										const description = detail.description.plain || "";
										const bornMatch = description.match(
											/born\s+([A-Z][a-zA-Z.]+(?:\s[A-Z][a-zA-Z.]+){1,4})/,
										);
										const realNameMatch = description.match(
											/real\s+name\s+(?:is\s+)?([A-Z][a-zA-Z.]+(?:\s[A-Z][a-zA-Z.]+){1,4})/i,
										);
										const potentialNames = detail.alternate_names.filter(
											(name) => {
												const lowerArtist = artist.name.toLowerCase();
												return (
													!name.toLowerCase().includes(lowerArtist) &&
													!lowerArtist.includes(name.toLowerCase()) &&
													name.split(" ").length >= 2 &&
													name.split(" ").length <= 4 &&
													![
														"King ",
														"The ",
														"Mr. ",
														"aka ",
														"alias ",
														"DJ ",
													].some((prefix) => name.startsWith(prefix)) &&
													name
														.split(" ")
														.every((word) => /^[A-Z]/.test(word)) &&
													!name.includes("http") &&
													!name.includes("www.")
												);
											},
										);
										realNames.push(
											bornMatch?.[1] ||
												realNameMatch?.[1] ||
												potentialNames.sort((a, b) => a.length - b.length)[0] ||
												artist.name,
										);
									} catch {
										realNames.push(artist.name);
									}
								}
								return realNames;
							},
						}))
					: source === "lrclib"
						? (await LrcLibApi.search(query)).map((track) => ({
								id: track.id,
								name: track.name,
								artist: track.artistName,
								album: track.albumName,
								lyrics:
									track.plainLyrics ||
									(track.syncedLyrics
										? lrcToPlainLyrics(track.syncedLyrics)
										: ""),
								source: track.syncedLyrics
									? "LRCLIB • synced lyrics available"
									: "LRCLIB",
							}))
						: source === "joox"
							? (await JooxApi.search(effectiveQuery, jooxToken)).map(
									(track) => {
										const item: ImportTrack = {
											id: track.id,
											name: track.name,
											artist: track.artist,
											album: track.album,
											duration: track.duration,
											cover: track.cover,
											source: "JOOX",
											fetchLyrics: async () => {
												const detail = await JooxApi.getDetail(
													effectiveQuery,
													track.index,
													jooxToken,
												);
												item.audioUrls = detail.播放链接;
												const lyrics = detail.歌词内容?.trim();
												if (lyrics && lyrics !== "No lyric") {
													return lrcToPlainLyrics(lyrics);
												}
												return "";
											},
										};
										return item;
									},
								)
							: (await LyricallyApi.search(query)).map((track, index) => ({
									id: `${track.artist}-${track.name}-${index}`,
									...track,
									fetchLyrics: () =>
										LyricallyApi.getLyrics(track.name, track.artist).then(
											(detail) => detail.lyrics || "",
										),
								}));
			if (geniusSong && source === "genius") {
				const currentGeniusSong = geniusSong;
				const existingIndex = hits.findIndex(
					(h) => Number(h.id) === currentGeniusSong.id,
				);
				if (existingIndex > 0) {
					const [matched] = hits.splice(existingIndex, 1);
					hits.unshift(matched);
				} else if (existingIndex === -1) {
					hits.unshift({
						id: currentGeniusSong.id,
						name: currentGeniusSong.title,
						artist: currentGeniusSong.artist,
						album: currentGeniusSong.album,
						cover: currentGeniusSong.cover,
						fetchLyrics: () => GeniusApi.getLyrics(currentGeniusSong.id),
						fetchSongwriters: async () => {
							if (!geniusApiKey) return [currentGeniusSong.artist];
							try {
								const artists = (
									await GeniusApi.getSongById(
										currentGeniusSong.id,
										geniusApiKey,
									)
								).response.song.writer_artists;
								return artists.map((a: { name: string }) => a.name);
							} catch {
								return [currentGeniusSong.artist];
							}
						},
					});
				}
			}

			if (spotifyTrack && hits.length > 0) {
				hits[0].album = hits[0].album || spotifyTrack.album;
				hits[0].cover = hits[0].cover || spotifyTrack.cover;
			} else if (geniusSong && hits.length > 0) {
				hits[0].album = hits[0].album || geniusSong.album;
				hits[0].cover = hits[0].cover || geniusSong.cover;
			}
			setResults(hits);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			toast.error(
				t(
					"metadataDialog.fetchSongwriters.searchError",
					"Search failed: {error}",
					{ error: msg },
				),
			);
		} finally {
			setSearching(false);
		}
	}, [query, t, source, geniusApiKey, jooxToken]);

	useEffect(() => {
		if (isOpen) {
			if (prefill && prefill.source === source) {
				const currentPrefill = prefill;
				setPrefill(null);
				const rawQuery =
					currentPrefill.query ??
					(currentPrefill.track
						? `${currentPrefill.track.artist ? `${currentPrefill.track.artist} - ` : ""}${currentPrefill.track.name}`
						: "");
				const searchQuery = String(rawQuery || "").trim();

				if (searchQuery) {
					setQuery(searchQuery);
					setSearching(true);
					setHasSearched(true);
					setResults([]);
					setSelectedHit(null);
					setEditableLyrics("");
					setIsEditing(false);

					// If track has pre-defined id/lyrics, set it as initial selected hit
					if (currentPrefill.track) {
						const track = currentPrefill.track;
						let hit: ImportTrack;
						if (source === "genius") {
							hit = {
								id: track.id ? Number(track.id) : 0,
								name: track.name,
								artist: track.artist,
								album: track.album,
								cover: track.cover,
								fetchLyrics: async () => {
									const numericId = Number(track.id);
									if (Number.isFinite(numericId) && numericId > 0) {
										try {
											const l = await GeniusApi.getLyrics(numericId);
											if (l) return l;
										} catch (err) {
											console.warn(
												"Genius getLyrics failed, fallback to search:",
												err,
											);
										}
									}
									const searchRes = await GeniusApi.search(
										`${track.artist} ${track.name}`,
										geniusApiKey,
									);
									const first = searchRes.response.hits[0]?.result;
									if (first) {
										return GeniusApi.getLyrics(first.id);
									}
									const lyrRes = await LyricallyApi.search(
										`${track.artist} ${track.name}`,
									);
									if (lyrRes[0]) {
										const d = await LyricallyApi.getLyrics(
											lyrRes[0].name,
											lyrRes[0].artist,
										);
										return d.lyrics || "";
									}
									return "";
								},
								fetchSongwriters: async () => {
									try {
										let songId = track.id ? Number(track.id) : null;
										if (!songId) {
											const searchRes = await GeniusApi.search(
												`${track.artist} ${track.name}`,
												geniusApiKey,
											);
											songId = searchRes.response.hits[0]?.result?.id || null;
										}
										if (songId) {
											const artists = (
												await GeniusApi.getSongById(songId, geniusApiKey)
											).response.song.writer_artists;
											return artists.map((a: any) => a.name);
										}
										return [track.artist];
									} catch {
										return [track.artist];
									}
								},
							};
						} else if (source === "lrclib") {
							hit = {
								id: track.id ? Number(track.id) : 0,
								name: track.name,
								artist: track.artist,
								album: track.album,
								cover: track.cover,
								lyrics: track.lyrics || "",
								fetchLyrics: async () => {
									if (track.id) {
										try {
											const res = await LrcLibApi.get(Number(track.id));
											const l =
												res.plainLyrics ||
												(res.syncedLyrics
													? lrcToPlainLyrics(res.syncedLyrics)
													: "");
											if (l) return l;
										} catch (err) {
											console.warn(
												"LRCLIB get failed, fallback to search:",
												err,
											);
										}
									}
									const searchRes = await LrcLibApi.search(
										`${track.artist} ${track.name}`,
									);
									const first = searchRes[0];
									return (
										first?.plainLyrics ||
										(first?.syncedLyrics
											? lrcToPlainLyrics(first.syncedLyrics)
											: "") ||
										""
									);
								},
								source: "LRCLIB",
							};
						} else {
							hit = {
								id: track.id || `${track.artist}-${track.name}`,
								name: track.name,
								artist: track.artist,
								album: track.album,
								cover: track.cover,
								lyrics: track.lyrics || "",
								fetchLyrics: async () => {
									try {
										const d = await LyricallyApi.getLyrics(
											track.name,
											track.artist,
										);
										if (d?.lyrics) return d.lyrics;
									} catch (err) {
										console.warn(
											"Lyrically getLyrics failed, fallback to search:",
											err,
										);
									}
									const searchRes = await LyricallyApi.search(
										`${track.artist} ${track.name}`,
									);
									if (searchRes[0]) {
										const d = await LyricallyApi.getLyrics(
											searchRes[0].name,
											searchRes[0].artist,
										);
										return d.lyrics || "";
									}
									return "";
								},
							};
						}
						void handleSelectSong(hit);
					}

					// Simultaneously search provider to populate results list and ensure matches
					(async () => {
						try {
							let hits: ImportTrack[] = [];
							if (source === "genius") {
								try {
									hits = (
										await GeniusApi.search(searchQuery, geniusApiKey)
									).response.hits.map(({ result }) => ({
										id: result.id,
										name: result.title,
										artist: result.primary_artist.name,
										album: result.album?.name,
										cover:
											result.song_art_image_url ||
											result.song_art_image_thumbnail_url,
										fetchLyrics: () => GeniusApi.getLyrics(result.id),
										fetchSongwriters: async () => {
											try {
												const artists = (
													await GeniusApi.getSongById(result.id, geniusApiKey)
												).response.song.writer_artists;
												return artists.map((a: any) => a.name);
											} catch {
												return [result.primary_artist.name];
											}
										},
									}));
								} catch (err) {
									console.warn(
										"Genius search failed in prefill, fallback to Lyrically:",
										err,
									);
									hits = (await LyricallyApi.search(searchQuery)).map(
										(track, index) => ({
											id: `${track.artist}-${track.name}-${index}`,
											...track,
											fetchLyrics: () =>
												LyricallyApi.getLyrics(track.name, track.artist).then(
													(detail) => detail.lyrics || "",
												),
										}),
									);
								}
							} else if (source === "lrclib") {
								hits = (await LrcLibApi.search(searchQuery)).map((track) => ({
									id: track.id,
									name: track.name,
									artist: track.artistName,
									album: track.albumName,
									lyrics:
										track.plainLyrics ||
										(track.syncedLyrics
											? lrcToPlainLyrics(track.syncedLyrics)
											: ""),
									source: track.syncedLyrics
										? "LRCLIB • synced lyrics available"
										: "LRCLIB",
								}));
							} else if (source === "joox") {
								hits = (await JooxApi.search(searchQuery, jooxToken)).map(
									(track) => {
										const item: ImportTrack = {
											id: track.id,
											name: track.name,
											artist: track.artist,
											album: track.album,
											duration: track.duration,
											cover: track.cover,
											source: "JOOX",
											fetchLyrics: async () => {
												const detail = await JooxApi.getDetail(
													searchQuery,
													track.index,
													jooxToken,
												);
												item.audioUrls = detail.播放链接;
												const lyrics = detail.歌词内容?.trim();
												if (lyrics && lyrics !== "No lyric") {
													return lrcToPlainLyrics(lyrics);
												}
												return "";
											},
										};
										return item;
									},
								);
							} else {
								hits = (await LyricallyApi.search(searchQuery)).map(
									(track, index) => ({
										id: `${track.artist}-${track.name}-${index}`,
										...track,
										fetchLyrics: () =>
											LyricallyApi.getLyrics(track.name, track.artist).then(
												(detail) => detail.lyrics || "",
											),
									}),
								);
							}
							setResults(hits);
							if (hits.length > 0 && !currentPrefill.track) {
								void handleSelectSong(hits[0]);
							}
						} catch (e) {
							console.error("Auto search failed", e);
						} finally {
							setSearching(false);
						}
					})();
					return;
				}
			}

			setHasSearched(false);
			setResults([]);
			setSelectedHit(null);
			setEditableLyrics("");
			setIsEditing(false);
			if (source === "genius") {
				setProcessLyrics(true);
				setCategorizeGeniusHeaders(true);
			}
			setTimeout(() => {
				inputRef.current?.focus();
			}, 50);
		}
	}, [
		isOpen,
		source,
		prefill,
		setPrefill,
		geniusApiKey,
		jooxToken,
		handleSelectSong,
	]);

	const performImport = useCallback(
		async (reviewed: ReviewedSection[] = []) => {
			const preserveHeaders = categorizeGeniusHeaders || autoDuet;
			const rawLines = (
				processLyrics
					? editableLyrics.split("\n").flatMap((line) =>
							preserveHeaders && /^\[.+\]$/.test(line.trim())
								? [line]
								: prepareLyricLine(line, true, {
										splitBackground:
											source === "genius" && splitBackgroundLyrics,
									}).split("\n"),
						)
					: editableLyrics
							.split("\n")
							.flatMap((line) =>
								source === "genius" && splitBackgroundLyrics
									? splitBackgroundLine(line)
									: [line],
							)
			).map((line) => line.trim());

			const slopPatterns = preserveHeaders ? [] : [/^\[.*\]$/];

			const lines = rawLines.filter((l) => {
				if (!l) return false;
				return !slopPatterns.some((pattern) => pattern.test(l));
			});

			if (lines.length === 0) {
				setSectionReviewSubmitted(false);
				toast.error(
					t(
						"metadataDialog.fetchSongwriters.noLyricsError",
						"No lyrics to import.",
					),
				);
				return;
			}

			const importSongwriters = async () => {
				if (!selectedHit?.fetchSongwriters) return;
				const writers = await selectedHit.fetchSongwriters();
				setLyricLines((current) => {
					const entry = current.metadata.find(
						(item) => item.key === "songwriter",
					);
					if (entry) {
						entry.value = writers;
					} else if (writers.length) {
						current.metadata.push({ key: "songwriter", value: writers });
					}
				});
			};

			if (downloadAudio && selectedHit) {
				const trackTitle = selectedHit.name;
				const trackArtist = selectedHit.artist;

				if (effectiveAudioSource === "ytdlp") {
					const query =
						[trackArtist, trackTitle].filter(Boolean).join(" - ").trim() ||
						trackTitle;
					setDownloaderInitialQuery(query);
					setDownloaderInitialFormat(lyricImportYtDlpFormat as DownloadFormat);
					setDownloaderOpen(true);
					toast.info(
						t(
							"downloader.openedForTrack",
							'Opening Media Downloader for "{title}"...',
							{ title: trackTitle },
						),
						{ autoClose: 3000 },
					);
				} else {
					const audioToastId = toast.loading(
						t(
							"joox.downloadingAudio",
							'[Beta] Downloading audio for "{title}"...',
							{
								title: trackTitle,
							},
						),
						{
							autoClose: false,
							closeButton: false,
							closeOnClick: false,
						},
					);

					void (async () => {
						try {
							let audioBlob: Blob | null = null;
							let audioFileName = "";

							if (selectedHit.audioUrls) {
								const best = JooxApi.getBestAudioUrl(
									selectedHit.audioUrls,
									audioQuality,
								);
								if (best) {
									audioBlob = await JooxApi.downloadAudioBlob(best.url);
									audioFileName = `${trackArtist} - ${trackTitle}.${best.ext}`
										.replace(/[/\\?%*:|"<>]/g, "-")
										.trim();
								}
							}

							if (!audioBlob) {
								const result = await JooxApi.searchAndGetAudio(
									trackTitle,
									trackArtist,
									jooxToken,
									audioQuality,
								);
								if (result) {
									audioBlob = result.audioBlob;
									audioFileName = result.fileName;
								}
							}

							if (audioBlob) {
								const mime =
									audioBlob.type ||
									(audioFileName.endsWith(".flac")
										? "audio/flac"
										: audioFileName.endsWith(".ogg")
											? "audio/ogg"
											: audioFileName.endsWith(".m4a")
												? "audio/mp4"
												: "audio/mpeg");
								const audioFile = new File(
									[audioBlob],
									audioFileName || `${trackTitle}.mp3`,
									{ type: mime },
								);
								(audioFile as any).isAutoDownloaded = true;
								await audioEngine.loadMusic(audioFile, false, true);
								toast.update(audioToastId, {
									render: t("joox.audioLoaded", 'Loaded audio for "{title}"', {
										title: trackTitle,
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
										{ title: trackTitle },
									),
									type: "warning",
									isLoading: false,
									autoClose: 4000,
									closeButton: true,
									closeOnClick: true,
								});
								setJooxAudioSearch({
									open: true,
									title: trackTitle,
									artist: trackArtist,
								});
							}
						} catch (audioErr) {
							console.warn("Audio download failed:", audioErr);
							toast.update(audioToastId, {
								render: t(
									"joox.audioFailed",
									"Could not download audio: {error}",
									{
										error: (audioErr as Error)?.message || "Unknown error",
									},
								),
								type: "error",
								isLoading: false,
								autoClose: 5000,
								closeButton: true,
								closeOnClick: true,
							});
							setJooxAudioSearch({
								open: true,
								title: trackTitle,
								artist: trackArtist,
							});
						}
					})();
				}
			}

			const processedLines: LyricLine[] = [];
			let geniusHeader: string | undefined;

			if (processLyrics) {
				for (const lineText of lines) {
					const header = preserveHeaders
						? getGeniusHeader(lineText)
						: undefined;
					if (header) {
						geniusHeader = header;
						continue;
					}
					const isBG = lineText.startsWith("<");
					const words: LyricWord[] = lineText
						.slice(isBG ? 1 : 0)
						.split("\\")
						.filter(Boolean)
						.map((word) => ({
							id: uid(),
							word,
							startTime: 0,
							endTime: 0,
							obscene: false,
							romanWord: "",
						}));
					processedLines.push({
						id: uid(),
						words,
						startTime: 0,
						endTime: 0,
						isBG,
						isDuet: false,
						ignoreSync: false,
						translatedLyric: "",
						romanLyric: "",
						geniusHeader,
					});
				}
			} else {
				// Standard import: preserve source lines verbatim, including parentheses.
				for (const lineText of lines) {
					const header = preserveHeaders
						? getGeniusHeader(lineText)
						: undefined;
					if (header) {
						geniusHeader = header;
						continue;
					}
					const parts = [lineText];

					for (const part of parts) {
						const trimmed = part.trim();
						if (!trimmed) continue;

						const isBG = false;
						let text = trimmed;

						text = text.replace(/\\/g, "").replace(/\s+/g, " ");
						if (!text) continue;

						const wordStrings = [text];

						const words: LyricWord[] = wordStrings.map((word) => ({
							id: uid(),
							word,
							startTime: 0,
							endTime: 0,
							obscene: false,
							romanWord: "",
						}));

						processedLines.push({
							id: uid(),
							words,
							startTime: 0,
							endTime: 0,
							isBG,
							isDuet: false,
							ignoreSync: false,
							translatedLyric: "",
							romanLyric: "",
							geniusHeader,
						});
					}
				}
			}

			const normalizedLyrics = normalizeImportedLyricCyrillicEs(
				normalizeImportedLyricApostrophes(
					{ lyricLines: processedLines, metadata: [], sections: [] },
					normalizeApostrophesOnImport,
				),
				normalizeCyrillicEsOnImport,
			);

			if (autoSegment) {
				const language = getHyphenationLanguage(selectedEngine);
				let hyphenatorFunc = segmentationConfig.hyphenator;
				if (language && selectedEngine !== segmentationConfig.engine) {
					hyphenatorFunc = (await loadHyphenator(language)) || undefined;
				}
				normalizedLyrics.lyricLines = segmentLyricLines(
					normalizedLyrics.lyricLines,
					{
						...segmentationConfig,
						engine: selectedEngine,
						splitEnglish: selectedEngine !== "none",
						hyphenator: hyphenatorFunc,
					},
				);
			}

			if (selectedHit) {
				const title = selectedHit.name;
				const artist = selectedHit.artist;
				const safeFileName = `${artist} - ${title}.ttml`
					.replace(/[/\\?%*:|"<>]/g, "-")
					.trim();

				setSaveFileName(safeFileName);
			}

			let autoDuetResult: AutoDuetResult | null = null;

			setLyricLines((prev) => {
				if (selectedHit) {
					const upsert = (key: string, value: string) => {
						const existing = prev.metadata.find((m) => m.key === key);
						if (existing) {
							existing.value = [value];
						} else {
							prev.metadata.push({ key, value: [value] });
						}
					};
					upsert("musicName", selectedHit.name);
					upsert("artists", selectedHit.artist);
					if (selectedHit.album) upsert("album", selectedHit.album);
					if (selectedHit.cover) upsert("cover_art", selectedHit.cover);
				}
				prev.lyricLines = normalizedLyrics.lyricLines;
				prev.sections = [];
				applyReviewedSections(prev, reviewed);
				if (source === "genius" && autoDuet) {
					autoDuetResult = applyAutoDuetBySinger(prev);
				}
			});
			if (categorizeGeniusHeaders || autoDuet)
				setGeniusCategorizationEnabled(true);
			try {
				await importSongwriters();
			} catch (error) {
				console.error("Genius songwriter fetch failed", error);
			}

			if (source === "genius" && autoDuet && autoDuetResult) {
				if (!("error" in autoDuetResult) && autoDuetResult.modifiedCount > 0) {
					const mappingSummary = Object.entries(autoDuetResult.singerMap)
						.map(([singer, voice]) => `${singer} (${voice})`)
						.join(", ");
					toast.success(
						t(
							"topBar.menu.autoDuetSuccess",
							"Auto duet assigned {singers} singers to {count} lines: {mapping}",
							{
								count: autoDuetResult.modifiedCount,
								singers: autoDuetResult.singersCount,
								mapping: mappingSummary,
							},
						),
					);
				} else if ("error" in autoDuetResult) {
					toast.info(
						t(
							"topBar.menu.autoDuetNotEnoughSingers",
							"At least two distinct singers/vocalists are required to auto-duet.",
						),
					);
				}
			}

			// Select first new word
			if (normalizedLyrics.lyricLines.length > 0) {
				store.set(
					selectedLinesAtom,
					new Set([normalizedLyrics.lyricLines[0].id]),
				);
				if (normalizedLyrics.lyricLines[0].words.length > 0) {
					store.set(
						selectedWordsAtom,
						new Set([normalizedLyrics.lyricLines[0].words[0].id]),
					);
				}
			}

			toast.success(
				t(
					"metadataDialog.fetchSongwriters.importSuccess",
					"Imported {count} lines from Genius.",
					{
						count: normalizedLyrics.lyricLines.length,
					},
				),
			);
			setIsOpen(false);
		},
		[
			editableLyrics,
			setLyricLines,
			setSaveFileName,
			setIsOpen,
			t,
			processLyrics,
			store,
			categorizeGeniusHeaders,
			autoDuet,
			splitBackgroundLyrics,
			normalizeApostrophesOnImport,
			normalizeCyrillicEsOnImport,
			source,
			selectedHit,
			setGeniusCategorizationEnabled,
			downloadAudio,
			lyricImportAudioSource,
			lyricImportYtDlpFormat,
			setDownloaderOpen,
			audioQuality,
			jooxToken,
			autoSegment,
			selectedEngine,
			segmentationConfig,
			setSavedSegmentationEngine,
			setSplitEnglish,
		],
	);

	const confirmAndPerformImport = useCallback(
		(reviewed: ReviewedSection[] = [], onCancel?: () => void) => {
			const currentLyrics = store.get(lyricLinesAtom);
			const hasExistingContent =
				currentLyrics.lyricLines.length > 0 ||
				currentLyrics.metadata.some((m) => m.value.some((v) => v.trim()));

			if (isDirty && hasExistingContent) {
				setConfirmDialog({
					open: true,
					title: t("confirmDialog.importFile.title", "Confirm lyric import"),
					description: t(
						"confirmDialog.importFile.description",
						"This project has unsaved changes. Importing will replace its lyrics. Continue?",
					),
					onConfirm: () => {
						void performImport(reviewed);
					},
					onCancel,
				});
				return;
			}
			void performImport(reviewed);
		},
		[isDirty, performImport, setConfirmDialog, store, t],
	);

	const handleImport = useCallback(() => {
		confirmAndPerformImport();
	}, [confirmAndPerformImport]);

	// ── Lyrics preview pane ────────────────────────────────────────────────────
	if (source === "genius" && !geniusApiKey) {
		return (
			<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
				<Dialog.Content style={{ maxWidth: 520 }}>
					<Flex justify="between" align="start" mb="4">
						<Flex align="center" gap="3">
							<Box
								style={{
									width: 40,
									height: 40,
									borderRadius: "var(--radius-3)",
									background: "var(--orange-3)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "var(--orange-11)",
									flexShrink: 0,
								}}
							>
								<Key20Regular style={{ width: 22, height: 22 }} />
							</Box>
							<Box>
								<Flex align="center" gap="2">
									<Dialog.Title size="5" mb="0" style={{ fontWeight: 600 }}>
										{t("genius.setupTitle", "Genius API Key Setup")}
									</Dialog.Title>
									<Badge color="orange" variant="soft" radius="full" size="1">
										Genius
									</Badge>
								</Flex>
								<Dialog.Description size="2" color="gray">
									{t(
										"genius.setupDesc",
										"To import lyrics from Genius you need a CLIENT ACCESS TOKEN.",
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

					<Flex direction="column" gap="4">
						<Card
							variant="surface"
							style={{
								padding: "var(--space-3)",
								background: "var(--gray-2)",
							}}
						>
							<Text size="2" color="gray">
								<a
									href={getGeniusKeyGuideUrl(i18n.resolvedLanguage)}
									target="_blank"
									rel="noopener noreferrer"
									style={{
										color: "var(--accent-11)",
										textDecoration: "none",
										fontWeight: 500,
									}}
								>
									{t(
										"genius.howToGetKey",
										"How to create a Genius Client Access Token →",
									)}
								</a>
							</Text>
						</Card>

						<TextField.Root
							size="3"
							value={tempApiKey}
							onChange={(e) => setTempApiKey(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && tempApiKey.trim()) {
									setGeniusApiKey(tempApiKey.trim());
								}
							}}
							placeholder={t(
								"genius.keyPlaceholder",
								"Paste CLIENT ACCESS TOKEN here…",
							)}
						>
							<TextField.Slot>
								<Key20Regular style={{ width: 18, height: 18, opacity: 0.6 }} />
							</TextField.Slot>
							{tempApiKey && (
								<TextField.Slot>
									<IconButton
										variant="ghost"
										size="1"
										color="gray"
										onClick={() => setTempApiKey("")}
									>
										<DismissRegular style={{ width: 14, height: 14 }} />
									</IconButton>
								</TextField.Slot>
							)}
						</TextField.Root>

						<Flex justify="end" gap="3" mt="2">
							<Dialog.Close>
								<Button variant="soft" color="gray">
									{t("common.cancel", "Cancel")}
								</Button>
							</Dialog.Close>
							<Button
								color="orange"
								disabled={!tempApiKey.trim()}
								onClick={() => setGeniusApiKey(tempApiKey.trim())}
							>
								{t("common.save", "Save & Continue")}
							</Button>
						</Flex>
					</Flex>
				</Dialog.Content>
			</Dialog.Root>
		);
	}

	if (selectedHit) {
		return (
			<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
				<Dialog.Content
					style={{
						maxWidth: 820,
						width: "100%",
						height: "85vh",
						maxHeight: 780,
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
						padding: "var(--space-4)",
					}}
				>
					{/* Top Header with Back button and Close button */}
					<Flex
						justify="between"
						align="center"
						mb="2"
						style={{ flexShrink: 0 }}
					>
						<Button
							variant="ghost"
							size="2"
							color="gray"
							onClick={() => {
								setSelectedHit(null);
								setEditableLyrics("");
							}}
						>
							<ArrowLeft20Regular style={{ width: 16, height: 16 }} />
							{t("genius.back", "Back to results")}
						</Button>
						<Dialog.Close>
							<IconButton variant="ghost" color="gray" size="2">
								<DismissRegular />
							</IconButton>
						</Dialog.Close>
					</Flex>

					{/* Track Header Card */}
					<Card
						variant="surface"
						style={{
							padding: "var(--space-2) var(--space-3)",
							marginBottom: "var(--space-2)",
							flexShrink: 0,
						}}
					>
						<Flex gap="3" align="center">
							<TrackCover
								cover={selectedHit.cover}
								name={selectedHit.name}
								size={48}
								borderRadius={6}
							/>
							<Flex direction="column" gap="0" style={{ flex: 1, minWidth: 0 }}>
								<Heading size="3" truncate>
									{selectedHit.name}
								</Heading>
								<Text size="2" weight="medium" color="gray" truncate>
									{selectedHit.artist}
								</Text>
								{selectedHit.album && (
									<Text size="1" color="gray" truncate style={{ opacity: 0.8 }}>
										{selectedHit.album}
									</Text>
								)}
							</Flex>
							<Flex gap="2" align="center" style={{ flexShrink: 0 }}>
								<Badge color={provider.badgeColor} size="1" variant="soft">
									{provider.name}
								</Badge>
								{selectedHit.duration && (
									<Badge color="gray" size="1" variant="surface">
										{selectedHit.duration}
									</Badge>
								)}
							</Flex>
						</Flex>
					</Card>

					{fetchingLyrics ? (
						<Flex
							direction="column"
							align="center"
							justify="center"
							gap="3"
							style={{ flex: "1 1 0", minHeight: 0 }}
						>
							<Spinner size="3" />
							<Text size="2" color="gray">
								{t("lyricsImport.fetchingLyrics", "Fetching lyrics…")}
							</Text>
						</Flex>
					) : (
						<Flex
							direction="column"
							style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}
						>
							<Flex
								justify="between"
								align="center"
								mb="2"
								style={{ flexShrink: 0 }}
							>
								<Flex align="center" gap="2">
									<Text size="1" color="gray" weight="medium">
										{isEditing
											? t("lyrically.editingRawText", "Editing Raw Text")
											: t(
													"genius.previewSubtitle",
													"Text in parentheses will be separated as background lyrics.",
												)}
									</Text>
									{editableLyrics && (
										<Badge size="1" color="gray" variant="surface">
											{t("genius.linesCount", "{count} lines", {
												count: editableLyrics
													.split("\n")
													.filter((line) => line.trim()).length,
											})}
										</Badge>
									)}
								</Flex>
								<Button
									variant="soft"
									size="1"
									color="gray"
									onClick={() => setIsEditing(!isEditing)}
								>
									{isEditing ? (
										<>
											<Eye20Regular style={{ width: 14, height: 14 }} />
											{t("lyrically.backToPreview", "Back to Preview")}
										</>
									) : (
										<>
											<Edit20Regular style={{ width: 14, height: 14 }} />
											{t("lyrically.manualEdit", "Manual Edit")}
										</>
									)}
								</Button>
							</Flex>

							{isEditing ? (
								<TextArea
									value={editableLyrics}
									onChange={(e) => setEditableLyrics(e.target.value)}
									style={{
										flex: "1 1 0",
										height: "100%",
										minHeight: 0,
										resize: "none",
										fontFamily: "var(--font-mono, monospace)",
										fontSize: 13,
										lineHeight: 1.6,
									}}
								/>
							) : (
								<Box
									style={{
										flex: "1 1 0",
										height: "100%",
										minHeight: 0,
										padding: "12px 16px",
										backgroundColor: "var(--gray-2)",
										border: "1px solid var(--gray-5)",
										borderRadius: "var(--radius-3)",
										overflow: "auto",
									}}
								>
									<pre
										style={{
											margin: 0,
											whiteSpace: "pre-wrap",
											fontFamily: "inherit",
											fontSize: "13px",
											lineHeight: "1.6",
											color: "var(--gray-12)",
										}}
										// biome-ignore lint/security/noDangerouslySetInnerHtml: Used for syntax highlighting
										dangerouslySetInnerHTML={{
											__html: editableLyrics
												.replace(/&/g, "&amp;")
												.replace(/</g, "&lt;")
												.replace(/>/g, "&gt;")
												.replace(
													/(\([^)]+\))/g,
													'<span style="opacity: 0.35; font-style: italic; font-weight: 300;">$1</span>',
												),
										}}
									/>
								</Box>
							)}

							{/* Options Bar Card */}
							<Box
								style={{
									padding: "8px 12px",
									background: "var(--gray-2)",
									border: "1px solid var(--gray-5)",
									borderRadius: "var(--radius-3)",
									marginTop: "var(--space-2)",
									flexShrink: 0,
								}}
							>
								<Flex direction="column" gap="2">
									{/* Row 1: Core Processing & Audio */}
									<Flex gap="4" align="center" wrap="wrap">
										{/* Download Audio */}
										<Flex align="center" gap="2">
											<Text
												as="label"
												size="1"
												weight={downloadAudio ? "medium" : "regular"}
												style={{
													cursor: "pointer",
													userSelect: "none",
													color: downloadAudio
														? "var(--gray-12)"
														: "var(--gray-11)",
												}}
											>
												<Flex gap="2" align="center">
													<Checkbox
														id="chk-download-audio"
														size="1"
														checked={downloadAudio}
														onCheckedChange={(val) =>
															setDownloadAudio(val === true)
														}
													/>
													{effectiveAudioSource === "ytdlp"
														? t(
																"joox.openDownloaderOnImport",
																"Open Media Downloader on import",
															)
														: t(
																"joox.downloadAudio",
																"Download audio into app",
															)}
												</Flex>
											</Text>
											<Badge color="orange" size="1" variant="soft">
												Beta
											</Badge>
											{downloadAudio && (
												<Select.Root
													size="1"
													value={effectiveAudioSource}
													onValueChange={(val: LyricImportAudioSource) => {
														if (isDesktop) {
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
															padding: "0 6px",
															borderRadius: "var(--radius-1)",
															minWidth: 110,
														}}
													/>
													<Select.Content position="popper">
														<Select.Item value="builtin">
															{t("joox.builtinDownloader", "Built-in (JOOX)")}
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
											{downloadAudio && effectiveAudioSource === "builtin" && (
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
															padding: "0 6px",
															borderRadius: "var(--radius-1)",
															minWidth: 105,
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
											{downloadAudio && effectiveAudioSource === "ytdlp" && (
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
															padding: "0 6px",
															borderRadius: "var(--radius-1)",
															minWidth: 75,
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

										{/* Auto Segment */}
										<Flex align="center" gap="2">
											<Text
												as="label"
												size="1"
												weight={autoSegment ? "medium" : "regular"}
												style={{
													cursor: "pointer",
													userSelect: "none",
													color: autoSegment
														? "var(--gray-12)"
														: "var(--gray-11)",
												}}
											>
												<Flex gap="2" align="center">
													<Checkbox
														id="chk-auto-segment"
														size="1"
														checked={autoSegment}
														onCheckedChange={(val) =>
															setAutoSegment(val === true)
														}
													/>
													{t("autoSegmentDialog.title", "Auto Segment")}
												</Flex>
											</Text>
											{autoSegment && (
												<Select.Root
													size="1"
													value={selectedEngine}
													onValueChange={(val) =>
														setSelectedEngine(val as SegmentationEngineId)
													}
												>
													<Select.Trigger
														style={{
															height: 22,
															fontSize: 11,
															padding: "0 6px",
															borderRadius: "var(--radius-1)",
															minWidth: 110,
														}}
													/>
													<Select.Content position="popper">
														{SYLLABIFICATION_ENGINES.map(({ id, name }) => (
															<Select.Item key={id} value={id}>
																{name}
																{id === detectedEngine ? " ★" : ""}
															</Select.Item>
														))}
													</Select.Content>
												</Select.Root>
											)}
										</Flex>

										{/* Process Lyrics */}
										<Text
											as="label"
											size="1"
											weight={processLyrics ? "medium" : "regular"}
											style={{
												cursor: "pointer",
												userSelect: "none",
												color: processLyrics
													? "var(--gray-12)"
													: "var(--gray-11)",
											}}
										>
											<Flex gap="2" align="center">
												<Checkbox
													id="chk-process-lyrics"
													size="1"
													checked={processLyrics}
													onCheckedChange={(val) =>
														setProcessLyrics(val === true)
													}
												/>
												{t("textImportDialog.processLyrics", "Process Lyrics")}
											</Flex>
										</Text>
									</Flex>

									{/* Row 2: Genius Categorization, Duet, and Background Vocals */}
									{source === "genius" && (
										<Flex gap="4" align="center" wrap="wrap">
											{/* Genius Header Categorization */}
											<Text
												as="label"
												size="1"
												weight={categorizeGeniusHeaders ? "medium" : "regular"}
												style={{
													cursor: "pointer",
													userSelect: "none",
													color: categorizeGeniusHeaders
														? "var(--gray-12)"
														: "var(--gray-11)",
												}}
											>
												<Flex gap="2" align="center">
													<Checkbox
														id="chk-categorize-headers"
														size="1"
														checked={categorizeGeniusHeaders}
														onCheckedChange={(checked) => {
															const val = checked === true;
															setCategorizeGeniusHeaders(val);
															if (!val && autoDuet) {
																setAutoDuet(false);
															}
														}}
													/>
													{t(
														"experimentalFeatures.geniusCategorization.title",
														"Genius Header Categorization",
													)}
												</Flex>
											</Text>

											{/* Auto Duet by Singer */}
											<Text
												as="label"
												size="1"
												weight={autoDuet ? "medium" : "regular"}
												style={{
													cursor: "pointer",
													userSelect: "none",
													color: autoDuet ? "var(--gray-12)" : "var(--gray-11)",
												}}
											>
												<Flex gap="2" align="center">
													<Checkbox
														id="chk-auto-duet"
														size="1"
														checked={autoDuet}
														onCheckedChange={(checked) => {
															const val = checked === true;
															setAutoDuet(val);
															if (val && !categorizeGeniusHeaders) {
																setCategorizeGeniusHeaders(true);
															}
														}}
													/>
													{t("genius.autoDuet", "Auto Duet by Singer")}
												</Flex>
											</Text>

											{/* Split Background Vocals */}
											<Text
												as="label"
												size="1"
												weight={splitBackgroundLyrics ? "medium" : "regular"}
												style={{
													cursor: "pointer",
													userSelect: "none",
													color: splitBackgroundLyrics
														? "var(--gray-12)"
														: "var(--gray-11)",
												}}
											>
												<Flex gap="2" align="center">
													<Checkbox
														id="chk-split-background-lyrics"
														size="1"
														checked={splitBackgroundLyrics}
														onCheckedChange={(checked) => {
															setSplitBackgroundLyrics(checked === true);
														}}
													/>
													{t(
														"genius.splitBackgroundLyrics",
														"Split Background Vocals",
													)}
												</Flex>
											</Text>
										</Flex>
									)}
								</Flex>
							</Box>

							{/* Bottom Action Footer */}
							<Flex justify="end" gap="3" mt="3" style={{ flexShrink: 0 }}>
								<Dialog.Close>
									<Button variant="soft" color="gray">
										{t("common.cancel", "Cancel")}
									</Button>
								</Dialog.Close>
								<Button
									color={provider.buttonColor}
									onClick={handleImport}
									disabled={
										!editableLyrics.trim() ||
										editableLyrics ===
											t(
												"lyrically.noLyricsLabel",
												"No lyrics available for this track.",
											)
									}
								>
									<ArrowDownload24Regular style={{ width: 18, height: 18 }} />
									{t("genius.importButton", "Import Lyrics")}
								</Button>
							</Flex>
						</Flex>
					)}
				</Dialog.Content>
			</Dialog.Root>
		);
	}

	// ── Search pane ────────────────────────────────────────────────────────────
	return (
		<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Content
				style={{
					maxWidth: 820,
					width: "100%",
					height: "76vh",
					maxHeight: 720,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				{/* Modern Header */}
				<Flex justify="between" align="start" mb="4" style={{ flexShrink: 0 }}>
					<Flex align="center" gap="3">
						<Box
							style={{
								width: 40,
								height: 40,
								borderRadius: "var(--radius-3)",
								background: provider.background,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: provider.color,
								flexShrink: 0,
							}}
						>
							{provider.icon}
						</Box>
						<Box>
							<Flex align="center" gap="2">
								<Dialog.Title size="5" mb="0" style={{ fontWeight: 600 }}>
									{t(provider.titleKey, provider.defaultTitle)}
								</Dialog.Title>
								<Badge
									color={provider.badgeColor}
									variant="soft"
									radius="full"
									size="1"
								>
									{provider.name}
								</Badge>
							</Flex>
							<Dialog.Description size="2" color="gray">
								{t(provider.descKey, provider.defaultDesc)}
							</Dialog.Description>
						</Box>
					</Flex>
					<Dialog.Close>
						<IconButton variant="ghost" color="gray" size="2">
							<DismissRegular />
						</IconButton>
					</Dialog.Close>
				</Flex>

				{/* Search Input Bar */}
				<Flex gap="2" mb="4" style={{ flexShrink: 0 }}>
					<TextField.Root
						ref={inputRef}
						size="3"
						style={{ flex: 1 }}
						placeholder={
							source === "joox"
								? t(
										"joox.searchPlaceholderWithLink",
										"Song title, artist, or paste Spotify link…",
									)
								: t(
										"genius.searchPlaceholderWithLink",
										"Artist – Song title, or paste Spotify link…",
									)
						}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
						color={provider.buttonColor}
						onClick={handleSearch}
						disabled={!query.trim() || searching}
					>
						{searching ? (
							<Spinner />
						) : (
							<>
								<GlobeSearch24Regular style={{ width: 18, height: 18 }} />
								{t("common.search", "Search")}
							</>
						)}
					</Button>
				</Flex>

				{/* Results / Empty / Loading State Container */}
				<ScrollArea
					type="auto"
					scrollbars="vertical"
					style={{ flex: "1 1 0", minHeight: 0 }}
				>
					{searching && (
						<Flex
							direction="column"
							align="center"
							justify="center"
							py="8"
							gap="3"
						>
							<Spinner size="3" />
							<Text size="2" color="gray">
								{t(
									"lyricsImport.searchingWithProvider",
									`Searching ${provider.name}…`,
								)}
							</Text>
						</Flex>
					)}

					{!searching && results.length > 0 && (
						<Flex direction="column" gap="2" pr="2">
							{results.map((hit, i) => (
								<Card
									key={`${hit.artist}-${hit.name}-${i}`}
									asChild
									variant="surface"
									style={{
										cursor: "pointer",
										transition: "all 0.15s ease",
										padding: "var(--space-2)",
									}}
								>
									<button
										type="button"
										onClick={() => handleSelectSong(hit)}
										style={{
											textAlign: "left",
											background: "transparent",
											border: "none",
											width: "100%",
											display: "flex",
											alignItems: "center",
											gap: "var(--space-3)",
											cursor: "pointer",
											padding: 0,
										}}
									>
										<TrackCover
											cover={hit.cover}
											name={hit.name}
											size={48}
											borderRadius={8}
										/>
										<Flex
											direction="column"
											gap="0"
											style={{ flex: 1, minWidth: 0 }}
										>
											<Text size="2" weight="bold" truncate>
												{hit.name}
											</Text>
											<Text size="1" color="gray" truncate>
												{hit.artist}
											</Text>
											{hit.album && (
												<Text
													size="1"
													color="gray"
													truncate
													style={{ opacity: 0.75 }}
												>
													{hit.album}
												</Text>
											)}
										</Flex>
										<Flex align="center" gap="2" style={{ flexShrink: 0 }}>
											{hit.duration && (
												<Badge size="1" color="gray" variant="soft">
													{hit.duration}
												</Badge>
											)}
											{hit.source && (
												<Badge size="1" color="gray" variant="surface">
													{hit.source}
												</Badge>
											)}
											<ArrowDownload24Regular
												style={{
													width: 18,
													height: 18,
													opacity: 0.5,
													flexShrink: 0,
												}}
											/>
										</Flex>
									</button>
								</Card>
							))}
						</Flex>
					)}

					{!searching && hasSearched && results.length === 0 && (
						<Box
							py="8"
							px="4"
							style={{
								textAlign: "center",
								background: "var(--gray-2)",
								borderRadius: 8,
								border: "1px dashed var(--gray-6)",
								margin: "var(--space-2) 0",
							}}
						>
							<Flex direction="column" align="center" justify="center" gap="2">
								<Search24Regular
									style={{ width: 36, height: 36, opacity: 0.4 }}
								/>
								<Heading size="3" color="gray">
									{t("genius.notFound", "No results found")}
								</Heading>
								<Text size="2" color="gray">
									{t(
										"lyricsImport.tryDifferentKeywords",
										"Try searching with different keywords, artist name, or paste a link.",
									)}
								</Text>
							</Flex>
						</Box>
					)}

					{!hasSearched && !searching && results.length === 0 && (
						<Box
							py="8"
							px="4"
							style={{
								textAlign: "center",
								background: "var(--gray-2)",
								borderRadius: 8,
								border: "1px dashed var(--gray-6)",
								margin: "var(--space-2) 0",
							}}
						>
							<Flex direction="column" align="center" justify="center" gap="2">
								<Box
									style={{
										width: 48,
										height: 48,
										borderRadius: "50%",
										background: provider.background,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: provider.color,
										marginBottom: 4,
									}}
								>
									{provider.icon}
								</Box>
								<Heading size="3">
									{t("lyricsImport.initialHeading", `Search ${provider.name}`)}
								</Heading>
								<Text size="2" color="gray" style={{ maxWidth: 360 }}>
									{t(
										"lyricsImport.initialSubtext",
										"Enter song title and artist name, or paste a Spotify link to fetch lyrics automatically.",
									)}
								</Text>
							</Flex>
						</Box>
					)}
				</ScrollArea>

				{/* Footer */}
				<Flex justify="between" align="center" mt="4" style={{ flexShrink: 0 }}>
					{source === "genius" ? (
						<Button
							variant="ghost"
							size="2"
							color="gray"
							onClick={() => setGeniusApiKey("")}
						>
							<Key20Regular style={{ width: 16, height: 16 }} />
							{t("genius.changeKey", "Change API Key")}
						</Button>
					) : (
						<Box />
					)}
					<Dialog.Close>
						<Button variant="soft" color="gray" size="2">
							{t("common.close", "Close")}
						</Button>
					</Dialog.Close>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};
