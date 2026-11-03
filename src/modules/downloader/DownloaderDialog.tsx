import {
	ArrowSync20Regular,
	QuestionCircle20Regular,
} from "@fluentui/react-icons";
import {
	Box,
	Button,
	Callout,
	Dialog,
	Flex,
	Grid,
	Progress,
	SegmentedControl,
	Select,
	Text,
	TextField,
} from "@radix-ui/themes";
import { Channel, invoke, isTauri } from "@tauri-apps/api/core";
import { useAtom, useStore } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { audioEngine } from "$/modules/audio/audio-engine";
import { lyricLinesAtom } from "$/states/main";
import { loadAudioFromPath } from "./download-helper";
import styles from "./downloader.module.css";
import { DownloaderSetupGuideDialog } from "./DownloaderSetupGuideDialog";
import {
	AUDIO_FORMATS,
	type DownloadEvent,
	type DownloadFormat,
	downloadError,
	formatDuration,
	metadataQuery,
	nextSearchQuery,
	type SearchResult,
	VIDEO_FORMATS,
	validDownloadUrl,
} from "./model";
import {
	downloaderInitialFormatAtom,
	downloaderInitialQueryAtom,
	downloaderInitialTrackAtom,
	downloaderInitialUrlAtom,
	downloaderOpenAtom,
} from "./states";

export function DownloaderDialog() {
	const { t } = useTranslation();
	const [open, setOpen] = useAtom(downloaderOpenAtom);
	const [initialQuery, setInitialQuery] = useAtom(downloaderInitialQueryAtom);
	const [initialUrl, setInitialUrl] = useAtom(downloaderInitialUrlAtom);
	const [initialTrack, setInitialTrack] = useAtom(downloaderInitialTrackAtom);
	const [initialFormat, setInitialFormat] = useAtom(
		downloaderInitialFormatAtom,
	);
	const store = useStore();
	const [query, setQuery] = useState("");
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<SearchResult[] | null>(null);
	const [searchFailure, setSearchFailure] = useState<string | null>(null);
	const searchRun = useRef(0);
	// The last query filled in from the lyrics, so a new song can replace it
	// as long as the user hasn't typed their own.
	const lastAutoQuery = useRef("");
	const jobId = useRef<string | null>(null);
	const [available, setAvailable] = useState<boolean | null>(null);
	const [url, setUrl] = useState("");
	const [mode, setMode] = useState("audio");
	const [format, setFormat] = useState<DownloadFormat>("mp3");
	const [height, setHeight] = useState("1080");
	const [busy, setBusy] = useState(false);
	const [cancelling, setCancelling] = useState(false);
	const [event, setEvent] = useState<DownloadEvent | null>(null);
	const [failure, setFailure] = useState<{
		code: string;
		detail: string;
	} | null>(null);
	const [result, setResult] = useState<string | null>(null);
	const running = useRef(false);
	const [guideOpen, setGuideOpen] = useState(false);

	const checkAvailability = useCallback(() => {
		setAvailable(null);
		if (!isTauri()) {
			setAvailable(false);
			return;
		}
		void invoke<boolean>("downloader_available").then(
			(value) => setAvailable(value),
			() => setAvailable(false),
		);
	}, []);

	useEffect(() => {
		if (!open) return;
		checkAvailability();
	}, [open, checkAvailability]);

	const search = useCallback(
		async (searchText?: string) => {
			const text = (searchText ?? query).trim();
			if (!text || !available) return;
			const run = ++searchRun.current;
			setSearching(true);
			setSearchFailure(null);
			try {
				const found = await invoke<SearchResult[]>("search_media", {
					query: text,
				});
				if (run === searchRun.current) {
					setResults(found);
					if (found.length > 0 && !url) {
						setUrl(found[0].url);
					}
				}
			} catch (error) {
				if (run !== searchRun.current) return;
				setResults(null);
				const { detail } = downloadError(error);
				setSearchFailure(detail);
			} finally {
				if (run === searchRun.current) setSearching(false);
			}
		},
		[available, query, url],
	);

	// Fill the search with initial track, initial URL, initial query or open lyrics' metadata
	useEffect(() => {
		if (!open) return;

		let targetUrl = initialUrl || "";
		if (initialUrl) {
			setUrl(initialUrl);
			setInitialUrl(null);
		}

		const targetTrack = initialTrack;
		if (initialTrack) {
			targetUrl = initialTrack.url;
			setUrl(initialTrack.url);
			setQuery(initialTrack.title || "");
			setResults([initialTrack]);
			setInitialTrack(null);
		}

		let queryText = "";
		if (initialQuery) {
			if (validDownloadUrl(initialQuery)) {
				targetUrl = initialQuery;
				setUrl(initialQuery);
			} else {
				queryText = initialQuery;
				setQuery(initialQuery);
				lastAutoQuery.current = initialQuery;
			}
			setInitialQuery(null);
		} else if (!targetTrack && !targetUrl) {
			const songQuery = metadataQuery(
				store.get(lyricLinesAtom)?.metadata ?? [],
			);
			const lastAuto = lastAutoQuery.current;
			queryText = nextSearchQuery(query, lastAuto, songQuery);
			setQuery(queryText);
			if (songQuery) lastAutoQuery.current = songQuery;
		}

		if (targetUrl && !targetTrack) {
			setResults([
				{
					url: targetUrl,
					title: queryText || targetUrl,
					channel: null,
				},
			]);
		}

		if (initialFormat) {
			setFormat(initialFormat);
			setMode(
				initialFormat === "mp4" || initialFormat === "mkv" ? "video" : "audio",
			);
			setInitialFormat(null);
		}

		// Only auto-search if a query string exists, no direct target URL was supplied, and available
		if (queryText && !targetUrl && available) {
			void search(queryText);
		}
	}, [
		open,
		initialTrack,
		initialUrl,
		initialQuery,
		initialFormat,
		available,
		store,
		query,
		search,
		setInitialTrack,
		setInitialUrl,
		setInitialQuery,
		setInitialFormat,
	]);

	// When availability is confirmed, auto-trigger search if query exists and no results yet and no URL already chosen
	useEffect(() => {
		if (open && available && query.trim() && !results && !searching && !url) {
			void search(query.trim());
		}
	}, [open, available, query, results, searching, url, search]);

	async function start() {
		if (running.current || !available || !validDownloadUrl(url.trim())) return;
		running.current = true;
		setBusy(true);
		setCancelling(false);
		setFailure(null);
		setResult(null);
		setEvent(null);
		const events = new Channel<DownloadEvent>();
		events.onmessage = setEvent;
		const id = crypto.randomUUID();
		jobId.current = id;
		try {
			const downloadedPath = await invoke<string | null>("download_media", {
				request: {
					url: url.trim(),
					format,
					maxHeight:
						mode === "video" && height !== "best" ? Number(height) : null,
				},
				jobId: id,
				events,
			});
			setResult(downloadedPath);
			if (downloadedPath && mode === "audio") {
				try {
					const file = await loadAudioFromPath(downloadedPath, format);
					await audioEngine.loadMusic(file, false, true);
					toast.success(
						t("downloader.loadedIntoEditor", 'Loaded "{title}" into editor', {
							title: file.name,
						}),
					);
				} catch (loadErr) {
					console.warn("Failed to auto-load audio into editor:", loadErr);
				}
			}
		} catch (error) {
			setFailure(downloadError(error));
		} finally {
			jobId.current = null;
			running.current = false;
			setBusy(false);
			setCancelling(false);
			setEvent(null);
		}
	}

	async function cancel() {
		const id = jobId.current;
		if (!id) return;
		setCancelling(true);
		try {
			await invoke("cancel_download", { jobId: id });
		} catch (error) {
			setFailure(downloadError(error));
			setCancelling(false);
		}
	}

	const progress = event?.kind === "downloading" ? event.percent : null;
	const status = cancelling
		? t("downloader.cancelling")
		: event?.kind === "processing"
			? t("downloader.processing")
			: event?.kind === "downloading"
				? t("downloader.downloading")
				: event?.kind === "preparing"
					? t("downloader.preparing")
					: t("downloader.pickFolder");
	const errorText =
		failure?.code === "invalidUrl"
			? t("downloader.invalidUrl")
			: failure?.code === "cancelled"
				? t("downloader.cancelled")
				: failure?.code === "timeout"
					? t("downloader.timeout")
					: failure?.code === "busy"
						? t("downloader.busy")
						: t("downloader.failed");

	return (
		<>
			<Dialog.Root open={open} onOpenChange={setOpen}>
				<Dialog.Content maxWidth="840px" className={styles.content}>
					<Flex justify="between" align="start" wrap="wrap" gap="2" mb="2">
						<Box>
							<Dialog.Title style={{ margin: 0 }}>
								{t("downloader.title")}
							</Dialog.Title>
							<Dialog.Description size="2" mt="1">
								{t("downloader.description")}
							</Dialog.Description>
						</Box>
						<Button
							type="button"
							variant="soft"
							size="1"
							onClick={() => setGuideOpen(true)}
						>
							<QuestionCircle20Regular />
							{t("downloader.setupGuide", "Setup Guide")}
						</Button>
					</Flex>
					<Flex direction="column" gap="3">
						{available === false && (
							<Callout.Root color="amber">
								<Flex
									justify="between"
									align="center"
									wrap="wrap"
									gap="2"
									style={{ width: "100%" }}
								>
									<Callout.Text>
										{t(
											isTauri()
												? "downloader.unavailable"
												: "downloader.desktopOnly",
										)}
									</Callout.Text>
									<Flex gap="2">
										<Button
											type="button"
											size="1"
											variant="surface"
											color="amber"
											onClick={() => setGuideOpen(true)}
										>
											<QuestionCircle20Regular />
											{t("downloader.setupGuide", "Setup Guide")}
										</Button>
										{isTauri() && (
											<Button
												type="button"
												size="1"
												variant="surface"
												onClick={checkAvailability}
											>
												<ArrowSync20Regular />
												{t("downloader.recheck", "Recheck")}
											</Button>
										)}
									</Flex>
								</Flex>
							</Callout.Root>
						)}
					<Grid
						columns={{ initial: "1", sm: "1.1fr 1fr" }}
						gap="4"
						align="start"
					>
						{/* Left Column: Search & Results */}
						<Box>
							<form
								role="search"
								onSubmit={(e) => {
									e.preventDefault();
									void search();
								}}
							>
								<Flex direction="column" gap="2">
									<Text as="label" size="2" htmlFor="downloader-search">
										{t("downloader.searchLabel")}
									</Text>
									<Flex gap="2">
										<TextField.Root
											id="downloader-search"
											type="search"
											className={styles.grow}
											value={query}
											onChange={(e) => setQuery(e.target.value)}
											placeholder={t("downloader.searchPlaceholder")}
											maxLength={200}
										/>
										<Button
											type="submit"
											variant="soft"
											disabled={!available || searching || !query.trim()}
										>
											{t(
												searching
													? "downloader.searching"
													: "downloader.search",
											)}
										</Button>
									</Flex>
									{searchFailure != null && (
										<Callout.Root color="red" role="alert">
											<Callout.Text>
												{t("downloader.searchFailed")}
											</Callout.Text>
											{searchFailure && (
												<details className={styles.details}>
													<summary>{t("downloader.details")}</summary>
													<pre>{searchFailure}</pre>
												</details>
											)}
										</Callout.Root>
									)}
									{results === null ? (
										<Flex
											align="center"
											justify="center"
											direction="column"
											gap="1"
											className={styles.emptyResults}
										>
											<Text size="2" color="gray">
												{t("downloader.searchLabel")}
											</Text>
										</Flex>
									) : results.length === 0 ? (
										<Flex
											align="center"
											justify="center"
											className={styles.emptyResults}
										>
											<Text size="2" color="gray" role="status">
												{t("downloader.noResults")}
											</Text>
										</Flex>
									) : (
										<ul
											className={styles.results}
											aria-label={t("downloader.searchResults")}
										>
											{results.map((item) => {
												const selected = item.url === url.trim();
												const meta = [
													item.channel,
													formatDuration(item.duration),
												]
													.filter(Boolean)
													.join(" · ");
												return (
													<li key={item.url}>
														<button
															type="button"
															className={styles.result}
															aria-pressed={selected}
															disabled={busy}
															onClick={() => setUrl(item.url)}
														>
															<span className={styles.resultTitle}>
																{item.title}
															</span>
															{meta && (
																<span className={styles.resultMeta}>
																	{meta}
																</span>
															)}
														</button>
													</li>
												);
											})}
										</ul>
									)}
								</Flex>
							</form>
						</Box>

						{/* Right Column: Download Configuration & Actions */}
						<Box>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									void start();
								}}
							>
								<Flex direction="column" gap="3">
									<Text as="label" size="2" htmlFor="downloader-url">
										{t("downloader.url")}
									</Text>
									<TextField.Root
										id="downloader-url"
										aria-label={t("downloader.url")}
										type="url"
										value={url}
										onChange={(e) => setUrl(e.target.value)}
										disabled={busy}
										required
										placeholder="https://..."
									/>
									{url.trim() && !validDownloadUrl(url.trim()) && (
										<Text size="2" color="red">
											{t("downloader.invalidUrl")}
										</Text>
									)}
									<SegmentedControl.Root
										aria-label={t("downloader.mediaType")}
										value={mode}
										disabled={busy}
										onValueChange={(value) => {
											setMode(value);
											setFormat(value === "audio" ? "mp3" : "mp4");
										}}
									>
										<SegmentedControl.Item value="audio">
											{t("downloader.audio")}
										</SegmentedControl.Item>
										<SegmentedControl.Item value="video">
											{t("downloader.video")}
										</SegmentedControl.Item>
									</SegmentedControl.Root>
									<Flex gap="3" wrap="wrap">
										<Flex direction="column" gap="2" flexGrow="1">
											<Text as="label" size="2" htmlFor="downloader-format">
												{t("downloader.format")}
											</Text>
											<Select.Root
												key={mode}
												value={format}
												onValueChange={(value) => {
													if (
														[...AUDIO_FORMATS, ...VIDEO_FORMATS].includes(
															value as DownloadFormat,
														)
													)
														setFormat(value as DownloadFormat);
												}}
												disabled={busy}
											>
												<Select.Trigger
													id="downloader-format"
													aria-label={t("downloader.format")}
												/>
												<Select.Content>
													{(mode === "audio"
														? AUDIO_FORMATS
														: VIDEO_FORMATS
													).map((value) => (
														<Select.Item key={value} value={value}>
															{value.toUpperCase()}
														</Select.Item>
													))}
												</Select.Content>
											</Select.Root>
										</Flex>
										{mode === "video" && (
											<Flex direction="column" gap="2" flexGrow="1">
												<Text as="label" size="2" htmlFor="downloader-height">
													{t("downloader.quality")}
												</Text>
												<Select.Root
													value={height}
													onValueChange={setHeight}
													disabled={busy}
												>
													<Select.Trigger
														id="downloader-height"
														aria-label={t("downloader.quality")}
													/>
													<Select.Content>
														{["720", "1080", "2160"].map((value) => (
															<Select.Item key={value} value={value}>
																{value}p
															</Select.Item>
														))}
														<Select.Item value="best">
															{t("downloader.best")}
														</Select.Item>
													</Select.Content>
												</Select.Root>
											</Flex>
										)}
									</Flex>
									<Text size="1" color="gray">
										{t("downloader.folderHint")}
									</Text>
									{busy && (
										<Flex
											direction="column"
											gap="2"
											role="status"
											aria-live="polite"
										>
											<Text size="2">
												{status}
												{progress != null ? ` (${progress.toFixed(1)}%)` : ""}
											</Text>
											{progress != null && (
												<Progress
													value={progress}
													aria-label={t("downloader.downloading")}
												/>
											)}
										</Flex>
									)}
									{failure && (
										<Callout.Root
											color={failure.code === "cancelled" ? "gray" : "red"}
											role="alert"
										>
											<Callout.Text>{errorText}</Callout.Text>
											{failure.detail && (
												<details className={styles.details}>
													<summary>{t("downloader.details")}</summary>
													<pre>{failure.detail}</pre>
												</details>
											)}
										</Callout.Root>
									)}
									{result && (
										<Flex direction="column" gap="2">
											<Callout.Root color="green" role="status">
												<Callout.Text>
													{t("downloader.saved")}
													<br />
													<span className={styles.path}>{result}</span>
												</Callout.Text>
											</Callout.Root>
											{mode === "audio" && (
												<Flex justify="end">
													<Button
														size="1"
														variant="surface"
														type="button"
														onClick={async () => {
															try {
																const file = await loadAudioFromPath(
																	result,
																	format,
																);
																await audioEngine.loadMusic(file, false, true);
																toast.success(
																	t(
																		"downloader.loadedIntoEditor",
																		'Loaded "{title}" into editor',
																		{
																			title: file.name,
																		},
																	),
																);
															} catch (loadErr) {
																console.warn(
																	"Failed to load audio into editor:",
																	loadErr,
																);
															}
														}}
													>
														{t("downloader.loadIntoEditor", "Load into Editor")}
													</Button>
												</Flex>
											)}
										</Flex>
									)}
									<Flex justify="end" gap="2" wrap="wrap" mt="2">
										<Dialog.Close>
											<Button type="button" variant="soft">
												{t("downloader.close")}
											</Button>
										</Dialog.Close>
										{busy ? (
											<Button
												type="button"
												color="red"
												variant="soft"
												disabled={cancelling}
												onClick={() => void cancel()}
											>
												{t("downloader.cancel")}
											</Button>
										) : (
											<Button
												type="submit"
												disabled={!available || !validDownloadUrl(url.trim())}
											>
												{t(
													available === null
														? "downloader.checking"
														: "downloader.download",
												)}
											</Button>
										)}
									</Flex>
								</Flex>
							</form>
						</Box>
					</Grid>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
		<DownloaderSetupGuideDialog
			open={guideOpen}
			onOpenChange={setGuideOpen}
			available={available}
			onAvailabilityChange={setAvailable}
		/>
	</>
	);
}
