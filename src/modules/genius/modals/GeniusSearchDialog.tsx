import { Search16Regular, Search24Regular } from "@fluentui/react-icons";
import {
	Button,
	Card,
	Checkbox,
	Dialog,
	Flex,
	ScrollArea,
	Spinner,
	Text,
	TextField,
} from "@radix-ui/themes";
import { useAtom } from "jotai";
import { useImmerAtom } from "jotai-immer";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { geniusApiKeyAtom } from "$/modules/settings/states/index.ts";
import { isSpotifyUrl, SpotifyResolver } from "$/modules/spotify/client";
import { geniusSearchDialogAtom } from "$/states/dialogs.ts";
import { lyricLinesAtom } from "$/states/main.ts";
import { getGeniusKeyGuideUrl } from "$/utils/genius-guide";
import { openExternal } from "$/utils/openExternal";
import { GeniusApi, GeniusResolver, isGeniusSongUrl } from "../api/client";
import type { GeniusSearchHit } from "../types";
import { fetchGeniusSongwritersBySongId } from "../utils/fetchSongwriters";
import { getBetterGeniusCoverArt } from "../utils/image";
import styles from "./GeniusSearchDialog.module.css";

export const GeniusSearchDialog = () => {
	const { t, i18n } = useTranslation();
	const [isOpen, setIsOpen] = useAtom(geniusSearchDialogAtom);
	const [lyricLines, setLyricLines] = useImmerAtom(lyricLinesAtom);

	const [query, setQuery] = useState("");
	const [results, setResults] = useState<GeniusSearchHit[]>([]);
	const [loading, setLoading] = useState(false);
	const [isFetchingDetails, setIsFetchingDetails] = useState(false);
	const [fetchingSongId, setFetchingSongId] = useState<number | null>(null);
	const [hasSearched, setHasSearched] = useState(false);
	const [findRealNames, setFindRealNames] = useState(true);
	const [processingMessage, setProcessingMessage] = useState("");

	const [geniusApiKey, setGeniusApiKey] = useAtom(geniusApiKeyAtom);
	const [tempApiKey, setTempApiKey] = useState("");

	const inputRef = useRef<HTMLInputElement>(null);

	// Pre-fill query from metadata when opening
	useEffect(() => {
		if (isOpen) {
			const musicName = lyricLines.metadata.find((m) => m.key === "musicName")
				?.value[0];
			const primaryArtist = lyricLines.metadata.find((m) => m.key === "artists")
				?.value[0];

			const initialQuery = [primaryArtist, musicName].filter(Boolean).join(" ");
			setQuery(initialQuery);
			setHasSearched(false);
			setResults([]);

			// Auto-focus after a short delay to ensure the dialog is open
			setTimeout(() => {
				inputRef.current?.focus();
				inputRef.current?.select();
			}, 50);
		}
	}, [isOpen, lyricLines.metadata]);

	const handleSearch = useCallback(async () => {
		const rawQuery = query.trim();
		if (!rawQuery) return;
		setLoading(true);
		setHasSearched(true);
		setResults([]);

		let effectiveQuery = rawQuery;
		let geniusSong: import("../utils/resolver").GeniusResolvedSong | null =
			null;

		if (isSpotifyUrl(effectiveQuery)) {
			try {
				const resolved = await SpotifyResolver.resolveTrack(effectiveQuery);
				if (resolved) {
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
				console.warn(
					"Failed to resolve Spotify link in GeniusSearchDialog:",
					err,
				);
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
				console.warn(
					"Failed to resolve Genius song link in GeniusSearchDialog:",
					err,
				);
			}
		}

		try {
			const data = await GeniusApi.search(effectiveQuery, geniusApiKey);
			const hits = [...data.response.hits];

			if (geniusSong) {
				const currentGeniusSong = geniusSong;
				const existingIndex = hits.findIndex(
					(h) => h.result.id === currentGeniusSong.id,
				);
				if (existingIndex > 0) {
					const [matched] = hits.splice(existingIndex, 1);
					hits.unshift(matched);
				} else if (existingIndex === -1) {
					const directHit: GeniusSearchHit = {
						type: "song",
						result: {
							id: currentGeniusSong.id,
							title: currentGeniusSong.title,
							title_with_featured: currentGeniusSong.title,
							song_art_image_url: currentGeniusSong.cover,
							song_art_image_thumbnail_url: currentGeniusSong.cover,
							header_image_url: currentGeniusSong.cover,
							url: currentGeniusSong.url,
							primary_artist: {
								id: 0,
								name: currentGeniusSong.artist,
								api_path: "",
								image_url: currentGeniusSong.cover || "",
								header_image_url: currentGeniusSong.cover || "",
								is_meme_verified: false,
								is_verified: false,
								url: "",
								iq: 0,
							},
							artist_names: currentGeniusSong.artist,
							album: currentGeniusSong.album
								? {
										id: currentGeniusSong.albumId || 0,
										name: currentGeniusSong.album,
										cover_art_url: currentGeniusSong.cover || "",
										full_title: currentGeniusSong.album,
										url: "",
									}
								: null,
						} as any,
						highlights: [],
						index: "song",
					};
					hits.unshift(directHit);
				}
			}

			setResults(hits);
			if (hits.length > 0) {
				toast.success(
					t("common.resultsFound", "Found {count} results", {
						count: hits.length,
					}),
				);
			}
		} catch (e: unknown) {
			console.error("Genius Search Error", e);
			const errorMsg = e instanceof Error ? e.message : String(e);
			toast.error(
				`${t("metadataDialog.fetchSongwriters.error", "Failed to fetch songwriters")}: ${errorMsg}`,
			);
		} finally {
			setLoading(false);
		}
	}, [query, t, geniusApiKey]);

	const handleSelectSong = useCallback(
		async (hit: GeniusSearchHit) => {
			setIsFetchingDetails(true);
			setFetchingSongId(hit.result.id);
			try {
				const [songDetailsRes, songwriters] = await Promise.all([
					GeniusApi.getSongById(hit.result.id, geniusApiKey),
					fetchGeniusSongwritersBySongId(hit.result.id, {
						geniusApiKey,
						findRealNames,
						onProgress: (_msg, current, total) => {
							setProcessingMessage(
								t(
									"metadataDialog.fetchSongwriters.findingRealName",
									"Finding real name for {name} ({current}/{total})...",
									{
										name: hit.result.primary_artist?.name || "",
										current,
										total,
									},
								),
							);
						},
					}),
				]);
				setProcessingMessage("");

				if (songwriters.length === 0) {
					toast.info(
						t(
							"metadataDialog.fetchSongwriters.noSongwriters",
							"No songwriting credits recorded for this song",
						),
					);
					setIsFetchingDetails(false);
					setFetchingSongId(null);
					return;
				}

				setLyricLines((prev) => {
					// 1. Update Songwriters
					const songwriterEntry = prev.metadata.find(
						(m) => m.key === "songwriter",
					);
					if (songwriterEntry) {
						songwriterEntry.value = songwriters;
					} else {
						prev.metadata.push({
							key: "songwriter",
							value: songwriters,
						});
					}

					// 2. Update Other Metadata if missing
					const upsertIfMissing = (key: string, value: string) => {
						const existing = prev.metadata.find((m) => m.key === key);
						if (
							!existing ||
							(existing.value.length === 1 && existing.value[0] === "")
						) {
							if (existing) {
								existing.value = [value];
							} else {
								prev.metadata.push({ key, value: [value] });
							}
						}
					};

					if (songDetailsRes?.response?.song?.title) {
						upsertIfMissing("musicName", songDetailsRes.response.song.title);
					}
					if (songDetailsRes?.response?.song?.primary_artist?.name) {
						upsertIfMissing(
							"artists",
							songDetailsRes.response.song.primary_artist.name,
						);
					}
					if (songDetailsRes?.response?.song?.album?.name) {
						upsertIfMissing("album", songDetailsRes.response.song.album.name);
					}
					if (songDetailsRes?.response?.song?.song_art_image_url) {
						upsertIfMissing(
							"cover_art",
							songDetailsRes.response.song.song_art_image_url,
						);
					}
					if (songDetailsRes?.response?.song?.url) {
						upsertIfMissing("geniusUrl", songDetailsRes.response.song.url);
					}
				});

				toast.success(
					t(
						"metadataDialog.fetchSongwriters.success",
						"Songwriters successfully fetched from Genius",
					),
				);
				setIsOpen(false);
			} catch (error) {
				console.error(error);
				toast.error(
					t(
						"metadataDialog.fetchSongwriters.error",
						"Failed to fetch songwriters",
					),
				);
			} finally {
				setIsFetchingDetails(false);
				setFetchingSongId(null);
			}
		},
		[setLyricLines, setIsOpen, t, findRealNames, geniusApiKey],
	);

	const onKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSearch();
		}
	};

	if (!geniusApiKey) {
		return (
			<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
				<Dialog.Content aria-describedby={undefined} style={{ maxWidth: 480 }}>
					<Dialog.Title>
						{t(
							"metadataDialog.fetchSongwriters.setupTitle",
							"Genius API Key Setup",
						)}
					</Dialog.Title>
					<Flex direction="column" gap="4">
						<Text>
							{t(
								"metadataDialog.fetchSongwriters.setupDesc",
								'To use this feature, please configure your Genius API Key (specifically, you need the "CLIENT ACCESS TOKEN"). You can generate one from the ',
							)}
							<a
								href="https://genius.com/api-clients"
								target="_blank"
								rel="noopener noreferrer"
								onClick={(e) => {
									e.preventDefault();
									void openExternal("https://genius.com/api-clients");
								}}
							>
								Genius
							</a>
							{t(
								"metadataDialog.fetchSongwriters.setupDescEnd",
								" developer portal.",
							)}
						</Text>
						<Text size="2">
							<a
								href={getGeniusKeyGuideUrl(i18n.resolvedLanguage)}
								target="_blank"
								rel="noopener noreferrer"
								onClick={(e) => {
									e.preventDefault();
									void openExternal(
										getGeniusKeyGuideUrl(i18n.resolvedLanguage),
									);
								}}
							>
								{t(
									"metadataDialog.fetchSongwriters.howToGetKey",
									"How to create a Genius Client Access Token",
								)}
							</a>
						</Text>
						<TextField.Root
							placeholder={t(
								"metadataDialog.fetchSongwriters.keyPlaceholder",
								"Enter CLIENT ACCESS TOKEN",
							)}
							value={tempApiKey}
							onChange={(e) => setTempApiKey(e.target.value)}
						/>
						<Flex justify="end" gap="2" mt="2">
							<Dialog.Close>
								<Button
									variant="soft"
									color="gray"
									onClick={() => setIsOpen(false)}
								>
									{t("common.cancel", "Cancel")}
								</Button>
							</Dialog.Close>
							<Button
								disabled={!tempApiKey.trim()}
								onClick={() => setGeniusApiKey(tempApiKey.trim())}
							>
								{t("common.save", "Save")}
							</Button>
						</Flex>
					</Flex>
				</Dialog.Content>
			</Dialog.Root>
		);
	}

	return (
		<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Content aria-describedby={undefined} className={styles.dialogContent}>
				<Dialog.Title>
					{t(
						"metadataDialog.fetchSongwriters.button",
						"Fetch Songwriters from Genius",
					)}
				</Dialog.Title>

				<Flex gap="3" mb="4">
					<TextField.Root
						ref={inputRef}
						className={styles.searchBar}
						placeholder={t("lrclib.placeholder", "Title Artist...")}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={onKeyDown}
					>
						<TextField.Slot>
							<Search16Regular />
						</TextField.Slot>
					</TextField.Root>
					<Button
						onClick={handleSearch}
						disabled={loading || isFetchingDetails}
					>
						{loading ? <Spinner /> : t("common.search", "Search")}
					</Button>
				</Flex>

				<ScrollArea
					type="auto"
					scrollbars="vertical"
					className={styles.scrollArea}
				>
					<Flex direction="column" gap="2" className={styles.resultList}>
						{loading ? (
							<Flex align="center" justify="center" p="4">
								<Spinner size="3" />
							</Flex>
						) : (
							results.map((hit) => (
								<Card
									key={hit.result.id}
									className={styles.resultCard}
									onClick={() => !isFetchingDetails && handleSelectSong(hit)}
								>
									<Flex align="center" gap="4">
										<img
											src={getBetterGeniusCoverArt(
												hit.result.song_art_image_url ||
													hit.result.song_art_image_thumbnail_url,
												100,
											)}
											alt={hit.result.title}
											className={styles.thumbnail}
											style={{
												width: 48,
												height: 48,
												borderRadius: 6,
												objectFit: "cover",
												flexShrink: 0,
												backgroundColor: "var(--gray-3)",
											}}
											referrerPolicy="no-referrer"
										/>
										<Flex
											direction="column"
											gap="1"
											style={{ flex: 1, minWidth: 0 }}
										>
											<Text size="3" weight="bold" truncate>
												{hit.result.title}
											</Text>
											<Text size="1" color="gray" truncate>
												{hit.result.primary_artist.name}
												{hit.result.album?.name
													? ` • ${hit.result.album.name}`
													: ""}
											</Text>
										</Flex>
										{isFetchingDetails && fetchingSongId === hit.result.id && (
											<Spinner />
										)}
									</Flex>
								</Card>
							))
						)}

						{!loading && hasSearched && results.length === 0 && (
							<Flex className={styles.emptyState}>
								<Search24Regular className={styles.emptyStateIcon} />
								<Text>
									{t(
										"lrclib.notFound",
										"No results found, please try different keywords",
									)}
								</Text>
							</Flex>
						)}

						{!loading && !hasSearched && results.length === 0 && (
							<Flex className={styles.emptyState}>
								<Search24Regular className={styles.emptyStateIcon} />
								<Text>
									{t("lrclib.noResult", "Enter keywords to start searching")}
								</Text>
							</Flex>
						)}
					</Flex>
				</ScrollArea>

				<Flex justify="between" align="center" mt="4">
					<Flex align="center" gap="2">
						<Text as="label" size="2">
							<Flex gap="2" align="center">
								<Checkbox
									checked={findRealNames}
									onCheckedChange={(c) => setFindRealNames(!!c)}
								/>
								{t(
									"metadataDialog.fetchSongwriters.tryFindRealNames",
									"Try to find real names (Legal Names)",
								)}
							</Flex>
						</Text>
						{processingMessage && (
							<Flex align="center" gap="2">
								<Spinner size="1" />
								<Text
									size="1"
									color="gray"
									truncate
									style={{ maxWidth: "250px" }}
								>
									{processingMessage}
								</Text>
							</Flex>
						)}
					</Flex>
					<Dialog.Close>
						<Button variant="soft" color="gray" disabled={isFetchingDetails}>
							{t("common.close", "Close")}
						</Button>
					</Dialog.Close>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};
