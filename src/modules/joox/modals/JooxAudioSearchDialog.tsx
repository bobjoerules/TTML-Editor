import {
	ArrowDownload24Regular,
	DismissRegular,
	MusicNote2Regular,
	Search24Regular,
} from "@fluentui/react-icons";
import {
	Badge,
	Box,
	Button,
	Card,
	Dialog,
	Flex,
	IconButton,
	ScrollArea,
	Select,
	Spinner,
	Text,
	TextField,
} from "@radix-ui/themes";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { audioEngine } from "$/modules/audio/audio-engine";
import { formatDuration, type SearchResult } from "$/modules/downloader/model";
import {
	downloaderInitialQueryAtom,
	downloaderInitialTrackAtom,
	downloaderOpenAtom,
} from "$/modules/downloader/states";
import { DmApi } from "$/modules/dm/api/client";
import { JooxApi } from "$/modules/joox/api/client";
import type { JooxTrack } from "$/modules/joox/types";
import { KuwoApi } from "$/modules/kuwo/api/client";
import { QqMusicApi } from "$/modules/qqmusic/api/client";
import {
	jooxApiTokenAtom,
	jooxAudioQualityAtom,
} from "$/modules/settings/states/index.ts";
import { isSpotifyUrl, SpotifyResolver } from "$/modules/spotify/client";
import { jooxAudioSearchDialogAtom } from "$/states/dialogs.ts";

const JooxTrackThumbnail = ({
	track,
	isDm,
	isKuwo,
	isQq,
	isYtDlp,
}: {
	track: JooxTrack;
	isDm: boolean;
	isKuwo: boolean;
	isQq: boolean;
	isYtDlp: boolean;
}) => {
	const [error, setError] = useState(false);

	useEffect(() => {
		if (track.cover) {
			setError(false);
		}
	}, [track.cover]);

	if (!track.cover || error) {
		return (
			<Box
				style={{
					width: 44,
					height: 44,
					borderRadius: "8px",
					backgroundColor: isDm
						? "var(--cyan-3)"
						: isKuwo
							? "var(--amber-3)"
							: isQq
								? "var(--indigo-3)"
								: isYtDlp
									? "var(--red-3)"
									: "var(--teal-3)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
				}}
			>
				<MusicNote2Regular
					style={{
						width: 22,
						height: 22,
						color: isDm
							? "var(--cyan-10)"
							: isKuwo
								? "var(--amber-10)"
								: isQq
									? "var(--indigo-10)"
									: isYtDlp
										? "var(--red-10)"
										: "var(--teal-10)",
					}}
				/>
			</Box>
		);
	}

	return (
		<img
			src={track.cover}
			alt={track.name}
			style={{
				width: 44,
				height: 44,
				borderRadius: "8px",
				objectFit: "cover",
				flexShrink: 0,
				backgroundColor: "var(--gray-3)",
			}}
			loading="lazy"
			onError={() => setError(true)}
		/>
	);
};

export const JooxAudioSearchDialog = () => {
	const { t } = useTranslation();
	const [searchState, setSearchState] = useAtom(jooxAudioSearchDialogAtom);
	const jooxToken = useAtomValue(jooxApiTokenAtom);
	const [audioQuality, setAudioQuality] = useAtom(jooxAudioQualityAtom);
	const [sourceProvider, setSourceProvider] = useState<
		"dm" | "all" | "kuwo" | "joox" | "qq" | "ytdlp"
	>("dm");

	const setDownloaderOpen = useSetAtom(downloaderOpenAtom);
	const setDownloaderInitialQuery = useSetAtom(downloaderInitialQueryAtom);
	const setDownloaderInitialTrack = useSetAtom(downloaderInitialTrackAtom);

	const [query, setQuery] = useState("");
	const [lastSearchedQuery, setLastSearchedQuery] = useState("");
	const [results, setResults] = useState<JooxTrack[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);
	const [downloadingTrackId, setDownloadingTrackId] = useState<string | null>(
		null,
	);

	const inputRef = useRef<HTMLInputElement>(null);
	const wasOpenRef = useRef(false);
	const queryRef = useRef(query);
	queryRef.current = query;
	const lastSearchedQueryRef = useRef(lastSearchedQuery);
	lastSearchedQueryRef.current = lastSearchedQuery;

	const handleClose = useCallback(() => {
		setSearchState({ open: false, title: "", artist: "" });
	}, [setSearchState]);

	const handleSearch = useCallback(
		async (
			searchStr?: string,
			forceProvider?: "dm" | "all" | "kuwo" | "joox" | "qq" | "ytdlp",
		) => {
			const targetQuery = (searchStr ?? queryRef.current).trim();
			if (!targetQuery) return;

			setLoading(true);
			setHasSearched(true);
			setResults([]);

			let effectiveQuery = targetQuery;
			if (isSpotifyUrl(effectiveQuery)) {
				try {
					const resolved = await SpotifyResolver.resolveTrack(effectiveQuery);
					if (resolved) {
						effectiveQuery = resolved.artist
							? `${resolved.artist} ${resolved.title}`
							: resolved.title;
						setQuery(effectiveQuery);
					}
				} catch (err) {
					console.warn("Spotify link resolution failed:", err);
				}
			}

			setLastSearchedQuery(effectiveQuery);
			const provider = forceProvider ?? sourceProvider;

			try {
				const trackList: JooxTrack[] = [];

				// 1. Query Deezer / DM first (fast, reliable, https://dm.rmmreviv.al)
				if (provider === "all" || provider === "dm") {
					try {
						const dmTracks = await DmApi.search(effectiveQuery);
						trackList.push(...dmTracks);
					} catch (dmErr) {
						console.warn("DM search failed:", dmErr);
					}
				}

				// 2. Query Kuwo (catalog)
				if (provider === "all" || provider === "kuwo") {
					try {
						const kuwoTracks = await KuwoApi.search(effectiveQuery);
						trackList.push(...kuwoTracks);
					} catch (kuwoErr) {
						console.warn("Kuwo search failed:", kuwoErr);
					}
				}

				// 3. Query JOOX (lossless, high quality)
				if (provider === "all" || provider === "joox") {
					try {
						const jooxTracks = await JooxApi.search(effectiveQuery, jooxToken);
						trackList.push(...jooxTracks);
					} catch (jooxErr) {
						console.warn("JOOX search failed:", jooxErr);
					}
				}

				// 4. Query QQ Music
				if (provider === "all" || provider === "qq") {
					try {
						let qqTracks = await QqMusicApi.search(effectiveQuery);
						// If 0 results for multi-word query, try reversed words or title only
						if (qqTracks.length === 0 && effectiveQuery.includes(" ")) {
							const parts = effectiveQuery.split(" ").filter(Boolean);
							if (parts.length >= 2) {
								const reversed = [...parts].reverse().join(" ");
								const fallbackQq = await QqMusicApi.search(reversed);
								if (fallbackQq.length > 0) {
									qqTracks = fallbackQq;
								}
							}
						}
						trackList.push(...qqTracks);
					} catch (qqErr) {
						console.warn("QQ Music search failed:", qqErr);
					}
				}

				// 5. Query yt-dlp (YouTube)
				if ((provider === "all" || provider === "ytdlp") && isTauri()) {
					try {
						const ytResults = await invoke<SearchResult[]>("search_media", {
							query: effectiveQuery,
						});
						if (ytResults && ytResults.length > 0) {
							for (let idx = 0; idx < ytResults.length; idx++) {
								const item = ytResults[idx];
								trackList.push({
									id: item.url,
									index: idx,
									name: item.title,
									artist: item.channel,
									duration: formatDuration(item.duration),
									source: "yt-dlp",
								} as unknown as JooxTrack);
							}
						}
					} catch (ytErr) {
						console.warn("yt-dlp search failed:", ytErr);
					}
				}

				setResults(trackList);
			} catch (err) {
				console.error("Audio search failed:", err);
				toast.error(
					err instanceof Error ? err.message : "Failed to search audio catalog",
				);
			} finally {
				setLoading(false);
			}
		},
		[jooxToken, sourceProvider],
	);

	// Pre-fill query and auto-search ONLY once when the modal is opened
	useEffect(() => {
		if (searchState.open && !wasOpenRef.current) {
			wasOpenRef.current = true;
			const initialQuery = [searchState.artist, searchState.title]
				.filter(Boolean)
				.join(" ")
				.trim();

			setQuery(initialQuery);
			setLastSearchedQuery(initialQuery);
			setResults([]);
			setHasSearched(false);

			if (initialQuery) {
				void handleSearch(initialQuery);
			}

			setTimeout(() => {
				inputRef.current?.focus();
				inputRef.current?.select();
			}, 60);
		} else if (!searchState.open && wasOpenRef.current) {
			wasOpenRef.current = false;
		}
	}, [searchState.open, searchState.title, searchState.artist, handleSearch]);

	const handleDownloadTrack = async (track: JooxTrack) => {
		if (track.source === "yt-dlp") {
			setDownloaderInitialTrack({
				url: track.id,
				title: track.name,
				channel: track.artist,
			});
			setDownloaderOpen(true);
			handleClose();
			return;
		}

		setDownloadingTrackId(track.id);

		const toastId = toast.loading(
			t("joox.downloadingAudio", '[Beta] Downloading audio for "{title}"...', {
				title: track.name,
			}),
			{
				autoClose: false,
				closeButton: false,
				closeOnClick: false,
			},
		);

		try {
			let audioBlob: Blob;
			let fileExt = "mp3";

			if (
				track.source === "Deezer" ||
				track.source === "Deezer (DM)" ||
				track.source === "dm"
			) {
				audioBlob = await DmApi.downloadAudioBlob(track.id);
				fileExt = "mp3";
			} else if (track.source === "Kuwo") {
				const queryToUse =
					track.name && track.artist
						? `${track.name} ${track.artist}`
						: lastSearchedQueryRef.current || queryRef.current;
				const detail = await KuwoApi.getDetail(
					queryToUse,
					track.index,
					audioQuality,
				);
				if (!detail.url) {
					throw new Error("No playable audio link found for this Kuwo track");
				}
				audioBlob = await KuwoApi.downloadAudioBlob(detail.url);
				fileExt = detail.format || (audioQuality === "flac" ? "flac" : "mp3");
			} else if (track.source === "QQ Music") {
				const detail = await QqMusicApi.getDetail(track.songmid || track.id);
				let streamUrl: string | undefined;

				if (audioQuality === "flac" && detail.song_play_url_sq) {
					streamUrl = detail.song_play_url_sq;
					fileExt = "flac";
				} else if (detail.song_play_url_hq) {
					streamUrl = detail.song_play_url_hq;
					fileExt = "m4a";
				} else if (detail.song_play_url) {
					streamUrl = detail.song_play_url;
					fileExt = "m4a";
				} else if (detail.song_play_url_standard) {
					streamUrl = detail.song_play_url_standard;
					fileExt = "m4a";
				} else if (detail.song_play_url_sq) {
					streamUrl = detail.song_play_url_sq;
					fileExt = "flac";
				}

				if (!streamUrl) {
					throw new Error("No playable audio link found for this track");
				}

				audioBlob = await QqMusicApi.downloadAudioBlob(streamUrl);
			} else {
				// JOOX source
				const activeSearchQuery =
					lastSearchedQueryRef.current || queryRef.current;
				const detail = await JooxApi.getDetail(
					activeSearchQuery,
					track.index,
					jooxToken,
				);
				const bestAudio = JooxApi.getBestAudioUrl(
					detail.播放链接,
					audioQuality,
				);

				if (!bestAudio) {
					throw new Error("No playable audio link found for this track");
				}

				audioBlob = await JooxApi.downloadAudioBlob(bestAudio.url);
				fileExt = bestAudio.ext;
			}

			const outArtist = track.artist || searchState.artist || "";
			const outTitle = track.name || searchState.title || "audio";
			const fileName = (outArtist ? `${outArtist} - ${outTitle}` : outTitle)
				? `${outArtist ? `${outArtist} - ` : ""}${outTitle}.${fileExt}`
						.replace(/[/\\?%*:|"<>]/g, "-")
						.trim()
				: `audio.${fileExt}`;

			const mimeType = audioBlob.type?.startsWith("audio/")
				? audioBlob.type
				: fileExt === "flac"
					? "audio/flac"
					: fileExt === "m4a"
						? "audio/mp4"
						: "audio/mpeg";

			(audioBlob as Blob & { isAutoDownloaded?: boolean }).isAutoDownloaded =
				true;

			const audioFile = new File([audioBlob], fileName, {
				type: mimeType,
			});
			(audioFile as File & { isAutoDownloaded?: boolean }).isAutoDownloaded =
				true;

			await audioEngine.loadMusic(audioFile, false, true);

			toast.update(toastId, {
				render: t("joox.audioLoaded", 'Loaded audio for "{title}"', {
					title: track.name,
				}),
				type: "success",
				isLoading: false,
				autoClose: 3000,
				closeButton: true,
				closeOnClick: true,
			});

			handleClose();
		} catch (err) {
			console.error("Download failed:", err);
			toast.update(toastId, {
				render: t("joox.audioFailed", "Could not download audio: {error}", {
					error: (err as Error)?.message || "Unknown error",
				}),
				type: "error",
				isLoading: false,
				autoClose: 5000,
				closeButton: true,
				closeOnClick: true,
			});
		} finally {
			setDownloadingTrackId(null);
		}
	};

	return (
		<Dialog.Root
			open={searchState.open}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
		>
			<Dialog.Content
				style={{
					maxWidth: 880,
					width: "min(880px, 94vw)",
					height: "76vh",
					maxHeight: 740,
					minHeight: 520,
					display: "flex",
					flexDirection: "column",
					padding: "24px",
					borderRadius: "16px",
					boxSizing: "border-box",
				}}
			>
				<Flex justify="between" align="center" mb="2">
					<Flex
						direction="column"
						gap="1"
						style={{ minWidth: 0, flex: 1, paddingRight: "12px" }}
					>
						<Dialog.Title
							style={{
								margin: 0,
								fontSize: "1.25rem",
								fontWeight: 600,
								display: "flex",
								alignItems: "center",
								gap: "8px",
							}}
						>
							{t("audioSearch.dialogTitle", "Select Audio Track")}
							<Badge color="orange" size="1" variant="soft">
								Beta
							</Badge>
						</Dialog.Title>
						<Dialog.Description size="2" color="gray">
							{t(
								"audioSearch.dialogDesc",
								'Pick the exact recording for "{title}" to load into the app.',
								{ title: searchState.title || query || "song" },
							)}
						</Dialog.Description>
					</Flex>
					<IconButton
						variant="ghost"
						color="gray"
						onClick={handleClose}
						style={{ cursor: "pointer", flexShrink: 0 }}
					>
						<DismissRegular style={{ width: 20, height: 20 }} />
					</IconButton>
				</Flex>

				{/* Search Input Bar (Full Width with Search Button) */}
				<Flex gap="2" align="center" mt="3" mb="2" style={{ width: "100%" }}>
					<Box style={{ flex: 1, minWidth: 0 }}>
						<TextField.Root
							ref={inputRef}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									void handleSearch();
								}
							}}
							placeholder={t(
								"joox.searchPlaceholder",
								"Search song title, artist, or paste Spotify / media link…",
							)}
							size="3"
						>
							<TextField.Slot>
								<Search24Regular
									style={{ width: 18, height: 18, opacity: 0.6 }}
								/>
							</TextField.Slot>
						</TextField.Root>
					</Box>

					<Button
						onClick={() => void handleSearch()}
						disabled={loading || !query.trim()}
						size="3"
						variant="solid"
						style={{ cursor: "pointer", flexShrink: 0, minWidth: "90px" }}
					>
						{loading ? <Spinner size="2" /> : t("joox.searchBtn", "Search")}
					</Button>
				</Flex>

				{/* Options & Downloader Bar */}
				<Flex
					justify="between"
					align="center"
					mb="3"
					wrap="wrap"
					gap="3"
					style={{ width: "100%" }}
				>
					<Flex align="center" gap="2" wrap="wrap">
						<Text size="2" color="gray" weight="medium">
							{t("audioSearch.source", "Source:")}
						</Text>
						<Select.Root
							value={sourceProvider}
							onValueChange={(
								val: "dm" | "all" | "kuwo" | "joox" | "qq" | "ytdlp",
							) => {
								setSourceProvider(val);
								if (query.trim()) {
									void handleSearch(query, val);
								}
							}}
							size="2"
						>
							<Select.Trigger
								placeholder="Source"
								style={{ minWidth: "150px" }}
							/>
							<Select.Content>
								<Select.Item value="dm">Deezer (DM Revival)</Select.Item>
								<Select.Item value="all">All Sources</Select.Item>
								<Select.Item value="kuwo">Kuwo Music</Select.Item>
								<Select.Item value="joox">JOOX</Select.Item>
								<Select.Item value="qq">QQ Music</Select.Item>
								{isTauri() ? (
									<Select.Item value="ytdlp">yt-dlp (YouTube)</Select.Item>
								) : (
									<Select.Item value="ytdlp" disabled>
										yt-dlp (Desktop only)
									</Select.Item>
								)}
							</Select.Content>
						</Select.Root>

						<Text size="2" color="gray" weight="medium" ml="2">
							{t("audioSearch.quality", "Quality:")}
						</Text>
						<Select.Root
							value={audioQuality}
							onValueChange={(val) => setAudioQuality(val)}
							size="2"
						>
							<Select.Trigger
								placeholder="Quality"
								style={{ minWidth: "140px" }}
							/>
							<Select.Content>
								<Select.Item value="flac">FLAC (Lossless)</Select.Item>
								<Select.Item value="320">MP3 320k / HQ</Select.Item>
								<Select.Item value="128">MP3 128k / Standard</Select.Item>
							</Select.Content>
						</Select.Root>
					</Flex>

					{isTauri() && (
						<Button
							onClick={() => {
								setDownloaderInitialQuery(query.trim() || null);
								setDownloaderOpen(true);
								handleClose();
							}}
							size="2"
							variant="soft"
							color="red"
							style={{ cursor: "pointer", flexShrink: 0 }}
							title="Open Media Downloader (yt-dlp)"
						>
							<ArrowDownload24Regular style={{ width: 15, height: 15 }} />
							{t("joox.openDownloader", "Open Media Downloader (yt-dlp)…")}
						</Button>
					)}
				</Flex>

				{/* Results List */}
				<Box
					style={{
						flex: 1,
						minHeight: 0,
						overflow: "hidden",
						width: "100%",
						minWidth: 0,
						display: "flex",
						flexDirection: "column",
					}}
				>
					{loading ? (
						<Flex
							align="center"
							justify="center"
							direction="column"
							gap="3"
							style={{ flex: 1, minHeight: "240px" }}
						>
							<Spinner size="3" />
							<Text size="2" color="gray">
								{t("audioSearch.searching", "Searching music catalogs…")}
							</Text>
						</Flex>
					) : results.length > 0 ? (
						<ScrollArea
							type="auto"
							scrollbars="vertical"
							style={{
								flex: 1,
								height: "100%",
								width: "100%",
								maxWidth: "100%",
								minWidth: 0,
							}}
						>
							<Flex
								direction="column"
								gap="2"
								pr="2"
								style={{
									width: "100%",
									maxWidth: "100%",
									minWidth: 0,
									boxSizing: "border-box",
								}}
							>
								{results.map((track) => {
									const isDownloading = downloadingTrackId === track.id;
									const isDm =
										track.source === "Deezer" ||
										track.source === "Deezer (DM)" ||
										track.source === "dm";
									const isKuwo = track.source === "Kuwo";
									const isQq = track.source === "QQ Music";
									const isYtDlp = track.source === "yt-dlp";

									return (
										<Card
											key={`${track.source || "music"}-${track.id}-${track.index}`}
											style={{
												padding: "12px 14px",
												borderRadius: "10px",
												backgroundColor: "var(--color-surface)",
												border: "1px solid var(--gray-a4)",
												transition: "border-color 0.15s ease",
												width: "100%",
												maxWidth: "100%",
												minWidth: 0,
												boxSizing: "border-box",
												overflow: "hidden",
											}}
										>
											<Flex
												align="center"
												justify="between"
												gap="3"
												style={{
													width: "100%",
													maxWidth: "100%",
													minWidth: 0,
												}}
											>
												{/* Left: Thumbnail & Info */}
												<Flex
													align="center"
													gap="3"
													style={{ minWidth: 0, flex: 1, overflow: "hidden" }}
												>
													<JooxTrackThumbnail
														track={track}
														isDm={isDm}
														isKuwo={isKuwo}
														isQq={isQq}
														isYtDlp={isYtDlp}
													/>

													<Flex
														direction="column"
														gap="1"
														style={{ minWidth: 0, flex: 1, overflow: "hidden" }}
													>
														<Flex
															align="center"
															gap="2"
															style={{
																minWidth: 0,
																width: "100%",
																overflow: "hidden",
															}}
														>
															<Text
																as="div"
																weight="bold"
																size="2"
																truncate
																style={{
																	minWidth: 0,
																	flex: "0 1 auto",
																}}
															>
																{track.name}
															</Text>
															{track.duration && (
																<Badge
																	size="1"
																	color="gray"
																	variant="soft"
																	style={{ flexShrink: 0 }}
																>
																	{track.duration}
																</Badge>
															)}
															<Badge
																size="1"
																color={
																	isDm
																		? "cyan"
																		: isKuwo
																			? "amber"
																			: isQq
																				? "indigo"
																				: isYtDlp
																					? "red"
																					: "teal"
																}
																variant="surface"
																style={{ flexShrink: 0 }}
															>
																{track.source || "Audio"}
															</Badge>
														</Flex>
														<Text
															as="div"
															size="1"
															color="gray"
															truncate
															style={{
																minWidth: 0,
																width: "100%",
															}}
														>
															{track.artist}
															{track.album ? ` • ${track.album}` : ""}
														</Text>
													</Flex>
												</Flex>

												{/* Use Audio Button */}
												<Button
													size="2"
													variant={isYtDlp ? "surface" : "solid"}
													color={isYtDlp ? "red" : undefined}
													disabled={isDownloading}
													onClick={() => void handleDownloadTrack(track)}
													style={{
														cursor: "pointer",
														flexShrink: 0,
														whiteSpace: "nowrap",
													}}
												>
													{isDownloading ? (
														<>
															<Spinner size="1" />
															{t("joox.downloading", "Downloading…")}
														</>
													) : isYtDlp ? (
														<>
															<ArrowDownload24Regular
																style={{ width: 16, height: 16 }}
															/>
															yt-dlp…
														</>
													) : (
														<>
															<ArrowDownload24Regular
																style={{ width: 16, height: 16 }}
															/>
															{t("joox.useAudio", "Use Audio")}
														</>
													)}
												</Button>
											</Flex>
										</Card>
									);
								})}
							</Flex>
						</ScrollArea>
					) : hasSearched ? (
						<Flex
							align="center"
							justify="center"
							direction="column"
							gap="2"
							style={{ flex: 1, minHeight: "260px" }}
						>
							<Text size="3" weight="medium">
								{t("audioSearch.noTracksFound", "No tracks found.")}
							</Text>
							<Text
								size="2"
								color="gray"
								style={{ textAlign: "center", maxWidth: "420px" }}
							>
								{t(
									"audioSearch.noTracksFoundTip",
									"Try switching the source (QQ Music / JOOX / yt-dlp) or refining keywords.",
								)}
							</Text>
						</Flex>
					) : (
						<Flex
							align="center"
							justify="center"
							direction="column"
							gap="3"
							style={{ flex: 1, minHeight: "260px" }}
						>
							<MusicNote2Regular
								style={{ width: 44, height: 44, opacity: 0.3 }}
							/>
							<Text size="2" color="gray">
								{t(
									"joox.enterKeywords",
									"Enter song title or artist to search",
								)}
							</Text>
						</Flex>
					)}
				</Box>
			</Dialog.Content>
		</Dialog.Root>
	);
};
