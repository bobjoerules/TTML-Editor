import {
	Checkmark16Regular,
	Circle16Regular,
	ClipboardPaste16Regular,
	Copy16Regular,
	Dismiss16Regular,
	MusicNote2Filled,
	Open16Regular,
	Save16Regular,
	Search16Regular,
	Timer16Regular,
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
	Progress,
	ScrollArea,
	Select,
	Switch,
	Text,
	TextField,
	Tooltip,
} from "@radix-ui/themes";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { checkIsTauri } from "$/modules/spotify/client";
import { saveFile } from "$/utils/fileSystem";
import {
	extractSpotifyTrackId,
	findSpotMatches,
	formatDuration,
	formatSpicyLyricsIds,
	getSpotMatchTxtFileName,
	type SpotMatchPreset,
} from "./engine";
import styles from "./SpotMatchDialog.module.css";
import {
	spotMatchCandidatesAtom,
	spotMatchDialogAtom,
	spotMatchExactTitleAtom,
	spotMatchIncludeOriginalIdAtom,
	spotMatchInitialTrackIdAtom,
	spotMatchMaxDurationSecondsAtom,
	spotMatchMinScoreAtom,
	spotMatchPresetAtom,
	spotMatchSelectedIdsAtom,
	spotMatchSourceAtom,
} from "./states";

export function SpotMatchDialog() {
	const { t } = useTranslation();
	const [isOpen, setIsOpen] = useAtom(spotMatchDialogAtom);
	const [initialTrackId, setInitialTrackId] = useAtom(
		spotMatchInitialTrackIdAtom,
	);

	const [preset, setPreset] = useAtom(spotMatchPresetAtom);
	const [minScore, setMinScore] = useAtom(spotMatchMinScoreAtom);
	const [maxDurationSecs, setMaxDurationSecs] = useAtom(
		spotMatchMaxDurationSecondsAtom,
	);
	const [exactTitle, setExactTitle] = useAtom(spotMatchExactTitleAtom);
	const [includeOriginalId, setIncludeOriginalId] = useAtom(
		spotMatchIncludeOriginalIdAtom,
	);

	const [sourceTrack, setSourceTrack] = useAtom(spotMatchSourceAtom);
	const [candidates, setCandidates] = useAtom(spotMatchCandidatesAtom);
	const [selectedIds, setSelectedIds] = useAtom(spotMatchSelectedIdsAtom);

	const [inputQuery, setInputQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [progressMessage, setProgressMessage] = useState("");
	const [progressPercent, setProgressPercent] = useState(0);
	const [copiedNotice, setCopiedNotice] = useState(false);

	// Load prefilled track if opened from outside
	useEffect(() => {
		if (isOpen && initialTrackId) {
			setInputQuery(initialTrackId);
			setInitialTrackId(undefined);
		}
	}, [isOpen, initialTrackId, setInitialTrackId]);

	const handlePaste = async () => {
		try {
			const text = await navigator.clipboard.readText();
			if (text) {
				setInputQuery(text.trim());
			}
		} catch {
			toast.error(t("spotmatch.clipboardError", "Could not read clipboard."));
		}
	};

	const handleSearch = useCallback(
		async (trackInput?: string) => {
			const target = trackInput || inputQuery;
			if (!target.trim()) return;

			try {
				extractSpotifyTrackId(target);
			} catch (err: any) {
				toast.error(err.message || "Invalid Spotify track link or ID.");
				return;
			}

			setIsSearching(true);
			setProgressPercent(5);
			setProgressMessage(t("spotmatch.starting", "Resolving track..."));

			try {
				const result = await findSpotMatches(
					target,
					{
						preset,
						minimumScore: minScore,
						maxDurationSeconds: maxDurationSecs,
						exactTitle,
					},
					(message, current, total) => {
						setProgressMessage(message);
						setProgressPercent(Math.round((current / total) * 100));
					},
				);

				setSourceTrack(result.source);
				setCandidates(result.matches);

				// Pre-select all matching candidates by default
				const initialSelected = new Set<string>();
				for (const m of result.matches) {
					initialSelected.add(m.trackId);
				}
				setSelectedIds(initialSelected);

				if (result.matches.length === 0) {
					toast.info(
						t(
							"spotmatch.noMatchesFound",
							"No alternate matches found with the current filters.",
						),
					);
				} else {
					toast.success(
						t("spotmatch.matchesFound", {
							count: result.matches.length,
							defaultValue: `Found ${result.matches.length} alternate recordings!`,
						}),
					);
				}
			} catch (err: any) {
				console.error("SpotMatch execution error:", err);
				toast.error(
					err.message ||
						t(
							"spotmatch.searchError",
							"Failed to search for alternate Spotify IDs.",
						),
				);
			} finally {
				setIsSearching(false);
			}
		},
		[
			inputQuery,
			preset,
			minScore,
			maxDurationSecs,
			exactTitle,
			setSourceTrack,
			setCandidates,
			setSelectedIds,
			t,
		],
	);

	const toggleSelectAll = () => {
		if (selectedIds.size === candidates.length) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(candidates.map((c) => c.trackId)));
		}
	};

	const toggleCandidateSelection = (trackId: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(trackId)) {
				next.delete(trackId);
			} else {
				next.add(trackId);
			}
			return next;
		});
	};

	const selectedCandidates = useMemo(() => {
		return candidates.filter((c) => selectedIds.has(c.trackId));
	}, [candidates, selectedIds]);

	const canExport =
		selectedCandidates.length > 0 ||
		(includeOriginalId && Boolean(sourceTrack?.id));

	const exportCount =
		selectedCandidates.length +
		(includeOriginalId &&
		sourceTrack?.id &&
		!selectedCandidates.some((c) => c.trackId === sourceTrack.id)
			? 1
			: 0);

	const handleCopySpicyLyricsIds = async () => {
		if (!canExport) {
			toast.error(
				t("spotmatch.noTracksSelected", "No tracks selected to copy."),
			);
			return;
		}

		const formatted = formatSpicyLyricsIds(
			selectedCandidates,
			includeOriginalId ? sourceTrack?.id : undefined,
		);
		try {
			await navigator.clipboard.writeText(formatted);
			setCopiedNotice(true);
			setTimeout(() => setCopiedNotice(false), 2500);
			toast.success(
				t("spotmatch.copiedToast", {
					count: exportCount,
					defaultValue: `Copied ${exportCount} Spotify IDs!`,
				}),
			);
		} catch {
			toast.error(t("spotmatch.copyFailed", "Failed to write to clipboard."));
		}
	};

	const handleSaveTxt = async () => {
		if (!canExport) {
			toast.error(
				t("spotmatch.noTracksSelected", "No tracks selected to copy."),
			);
			return;
		}

		const formatted = formatSpicyLyricsIds(
			selectedCandidates,
			includeOriginalId ? sourceTrack?.id : undefined,
		);
		const suggestedName = getSpotMatchTxtFileName(sourceTrack);

		try {
			const saved = await saveFile(formatted, {
				suggestedName,
				types: [
					{
						description: t("spotmatch.textFileDescription", "Text Files"),
						accept: { "text/plain": [".txt"] },
					},
				],
			});

			if (saved) {
				toast.success(t("spotmatch.savedToast", "Saved Spotify IDs to file!"));
			}
		} catch (e) {
			console.error("Failed to save SpotMatch IDs as .txt:", e);
			toast.error(t("spotmatch.saveFailed", "Failed to save file."));
		}
	};

	const handleOpenLink = async (url: string) => {
		if (checkIsTauri()) {
			try {
				await openUrl(url);
				return;
			} catch {
				// fallback
			}
		}
		window.open(url, "_blank", "noopener,noreferrer");
	};

	return (
		<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Content className={styles.dialogContent}>
				{/* Header */}
				<Flex justify="between" align="start" mb="3">
					<Box>
						<Flex align="center" gap="2">
							<Dialog.Title asChild style={{ margin: 0 }}>
								<Heading size="5" style={{ margin: 0, lineHeight: 1 }}>
									SpotMatch
								</Heading>
							</Dialog.Title>
							<Badge
								size="1"
								color="indigo"
								variant="soft"
								style={{
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
								}}
								onClick={() => handleOpenLink("https://tx24.dev")}
								title="Original SpotMatch concept & tool by tx24"
							>
								by tx24
							</Badge>
						</Flex>
						<Dialog.Description asChild>
							<Text size="2" color="gray">
								{t(
									"spotmatch.subtitle",
									"Find alternate Spotify IDs for the same recording without an API key. Original tool & algorithm credit to tx24.",
								)}
							</Text>
						</Dialog.Description>
					</Box>
					<Dialog.Close>
						<IconButton variant="ghost" color="gray">
							<Dismiss16Regular />
						</IconButton>
					</Dialog.Close>
				</Flex>

				{/* Input & Search Bar */}
				<Flex gap="2" mb="3">
					<TextField.Root
						placeholder={t(
							"spotmatch.inputPlaceholder",
							"Paste Spotify track URL, URI, or ID (e.g. open.spotify.com/track/...)",
						)}
						value={inputQuery}
						onChange={(e) => setInputQuery(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !isSearching) {
								handleSearch();
							}
						}}
						style={{ flex: 1 }}
						size="2"
					>
						<TextField.Slot>
							<MusicNote2Filled />
						</TextField.Slot>
					</TextField.Root>

					<Tooltip
						content={t("spotmatch.pasteTooltip", "Paste from clipboard")}
					>
						<IconButton
							variant="soft"
							color="gray"
							onClick={handlePaste}
							style={{ cursor: "pointer" }}
						>
							<ClipboardPaste16Regular />
						</IconButton>
					</Tooltip>

					<Button
						variant="solid"
						disabled={isSearching || !inputQuery.trim()}
						onClick={() => handleSearch()}
						style={{ cursor: isSearching ? "not-allowed" : "pointer" }}
					>
						<Search16Regular />
						{isSearching
							? t("spotmatch.searching", "Searching...")
							: t("spotmatch.findMatches", "Find Matches")}
					</Button>
				</Flex>

				{/* Options & Filters Row */}
				<Card variant="surface" className={styles.filtersCard}>
					<Flex justify="between" align="center" wrap="wrap" gap="3">
						{/* Preset Selector */}
						<Flex align="center" gap="2">
							<Text size="2" weight="medium">
								{t("spotmatch.presetLabel", "Preset:")}
							</Text>
							<Select.Root
								value={preset}
								onValueChange={(v) => setPreset(v as SpotMatchPreset)}
								size="1"
							>
								<Select.Trigger style={{ minWidth: 105 }} />
								<Select.Content>
									<Select.Item value="Quick">
										{t("spotmatch.presetQuick", "Quick")}
									</Select.Item>
									<Select.Item value="Balanced">
										{t("spotmatch.presetBalanced", "Balanced")}
									</Select.Item>
									<Select.Item value="Deep">
										{t("spotmatch.presetDeep", "Deep")}
									</Select.Item>
								</Select.Content>
							</Select.Root>
						</Flex>

						{/* Minimum Match Score */}
						<Flex align="center" gap="2">
							<Text size="2" weight="medium">
								{t("spotmatch.minScoreLabel", "Min Match:")}
							</Text>
							<Select.Root
								value={String(minScore)}
								onValueChange={(v) => setMinScore(Number(v))}
								size="1"
							>
								<Select.Trigger style={{ minWidth: 70 }} />
								<Select.Content>
									<Select.Item value="50">50%</Select.Item>
									<Select.Item value="60">60%</Select.Item>
									<Select.Item value="70">70%</Select.Item>
									<Select.Item value="75">75%</Select.Item>
									<Select.Item value="80">80%</Select.Item>
									<Select.Item value="90">90%</Select.Item>
								</Select.Content>
							</Select.Root>
						</Flex>

						{/* Max Duration Delta */}
						<Flex align="center" gap="2">
							<Text size="2" weight="medium">
								{t("spotmatch.maxDurationLabel", "Max Δ:")}
							</Text>
							<Select.Root
								value={String(maxDurationSecs)}
								onValueChange={(v) => setMaxDurationSecs(Number(v))}
								size="1"
							>
								<Select.Trigger style={{ minWidth: 80 }} />
								<Select.Content>
									<Select.Item value="1">1 sec</Select.Item>
									<Select.Item value="2">2 sec</Select.Item>
									<Select.Item value="5">5 sec</Select.Item>
									<Select.Item value="10">10 sec</Select.Item>
									<Select.Item value="30">30 sec</Select.Item>
								</Select.Content>
							</Select.Root>
						</Flex>

						{/* Exact Title Toggle */}
						<Flex align="center" gap="2">
							<Switch
								size="1"
								checked={exactTitle}
								onCheckedChange={setExactTitle}
							/>
							<Text size="2">{t("spotmatch.exactTitle", "Exact Title")}</Text>
						</Flex>
					</Flex>
				</Card>

				{/* Progress Indicator */}
				{isSearching && (
					<Box mb="3">
						<Flex justify="between" align="center" mb="1">
							<Text size="1" color="gray">
								{progressMessage}
							</Text>
							<Text size="1" weight="medium">
								{progressPercent}%
							</Text>
						</Flex>
						<Progress value={progressPercent} size="1" />
					</Box>
				)}

				{/* Source Track Card */}
				{sourceTrack && (
					<Card variant="ghost" className={styles.sourceCard}>
						<Flex align="center" justify="between">
							<Flex align="center" gap="3">
								{sourceTrack.cover ? (
									<img
										src={sourceTrack.cover}
										alt={sourceTrack.title}
										style={{
											width: 44,
											height: 44,
											borderRadius: 6,
											objectFit: "cover",
										}}
									/>
								) : (
									<Box
										style={{
											width: 44,
											height: 44,
											borderRadius: 6,
											backgroundColor: "var(--gray-a4)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										<MusicNote2Filled />
									</Box>
								)}
								<Box>
									<Flex align="center" gap="2">
										<Text size="2" weight="bold">
											{sourceTrack.title}
										</Text>
										<Badge size="1" color="gray">
											{t("spotmatch.sourceBadge", "Original Track")}
										</Badge>
									</Flex>
									<Text size="1" color="gray">
										{sourceTrack.artists.join(", ")}
										{sourceTrack.album && ` • ${sourceTrack.album}`}
									</Text>
								</Box>
							</Flex>

							<Flex align="center" gap="3">
								<Text size="1" color="gray">
									<Timer16Regular
										style={{ verticalAlign: "middle", marginRight: 4 }}
									/>
									{formatDuration(sourceTrack.durationMs)}
								</Text>
								<Tooltip
									content={t("spotmatch.openSpotify", "Open on Spotify")}
								>
									<IconButton
										size="1"
										variant="ghost"
										color="gray"
										onClick={() =>
											handleOpenLink(
												`https://open.spotify.com/track/${sourceTrack.id}`,
											)
										}
									>
										<Open16Regular />
									</IconButton>
								</Tooltip>
							</Flex>
						</Flex>
					</Card>
				)}

				{/* Results List */}
				<Box style={{ flex: 1, minHeight: 0, position: "relative" }}>
					<Flex justify="between" align="center" mb="2">
						<Text size="2" weight="bold">
							{t("spotmatch.matchesCount", {
								count: candidates.length,
								defaultValue: `${candidates.length} Alternate Recordings`,
							})}
						</Text>

						{candidates.length > 0 && (
							<Button
								size="1"
								variant="ghost"
								color="gray"
								onClick={toggleSelectAll}
								style={{ cursor: "pointer" }}
							>
								{selectedIds.size === candidates.length
									? t("spotmatch.deselectAll", "Deselect All")
									: t("spotmatch.selectAll", "Select All")}
							</Button>
						)}
					</Flex>

					<ScrollArea
						type="always"
						scrollbars="vertical"
						style={{ height: "calc(100% - 32px)" }}
					>
						{candidates.length === 0 ? (
							<Flex
								direction="column"
								align="center"
								justify="center"
								style={{ height: "180px" }}
								gap="2"
							>
								<Circle16Regular
									style={{ opacity: 0.3, width: 28, height: 28 }}
								/>
								<Text size="2" color="gray">
									{isSearching
										? t(
												"spotmatch.searchingStatus",
												"Scanning Spotify catalog...",
											)
										: t(
												"spotmatch.emptyState",
												"Enter a Spotify track URL or ID above and click Find Matches.",
											)}
								</Text>
							</Flex>
						) : (
							<Flex direction="column" gap="2" pr="3">
								{candidates.map((candidate) => {
									const isSelected = selectedIds.has(candidate.trackId);
									const scoreColor =
										candidate.score >= 90
											? "green"
											: candidate.score >= 75
												? undefined
												: "amber";

									const deltaSecs = (candidate.durationDeltaMs / 1000).toFixed(
										1,
									);

									return (
										<Card
											key={candidate.trackId}
											variant="surface"
											onClick={() =>
												toggleCandidateSelection(candidate.trackId)
											}
											className={`${styles.candidateCard} ${isSelected ? styles.candidateCardSelected : ""}`}
										>
											<Flex align="center" justify="between" gap="3">
												<Flex
													align="center"
													gap="3"
													style={{ minWidth: 0, flex: 1 }}
												>
													<Checkbox
														checked={isSelected}
														onCheckedChange={() =>
															toggleCandidateSelection(candidate.trackId)
														}
														onClick={(e) => e.stopPropagation()}
													/>

													{candidate.cover ? (
														<img
															src={candidate.cover}
															alt={candidate.title}
															style={{
																width: 40,
																height: 40,
																borderRadius: 6,
																objectFit: "cover",
																flexShrink: 0,
															}}
														/>
													) : (
														<Box
															style={{
																width: 40,
																height: 40,
																borderRadius: 6,
																backgroundColor: "var(--gray-a4)",
																display: "flex",
																alignItems: "center",
																justifyContent: "center",
																flexShrink: 0,
															}}
														>
															<MusicNote2Filled />
														</Box>
													)}

													<Box style={{ minWidth: 0, flex: 1 }}>
														<Flex align="center" gap="2">
															<Text
																size="2"
																weight="bold"
																style={{
																	whiteSpace: "nowrap",
																	overflow: "hidden",
																	textOverflow: "ellipsis",
																}}
															>
																{candidate.title}
															</Text>
															<Badge size="1" color={scoreColor}>
																{candidate.score}% Match
															</Badge>
														</Flex>
														<Text
															size="1"
															color="gray"
															style={{
																whiteSpace: "nowrap",
																overflow: "hidden",
																textOverflow: "ellipsis",
																display: "block",
															}}
														>
															{candidate.artists}
															{candidate.album && ` • ${candidate.album}`}
														</Text>
													</Box>
												</Flex>

												<Flex align="center" gap="2" style={{ flexShrink: 0 }}>
													<Box style={{ textAlign: "right" }}>
														<Text
															size="1"
															weight="medium"
															style={{ display: "block" }}
														>
															{formatDuration(candidate.durationMs)}
														</Text>
														<Text size="1" color="gray">
															Δ {deltaSecs}s
														</Text>
													</Box>

													<Tooltip
														content={t(
															"spotmatch.copyTrackId",
															"Copy Spotify Track ID",
														)}
													>
														<IconButton
															size="1"
															variant="ghost"
															color="gray"
															onClick={async (e) => {
																e.stopPropagation();
																try {
																	await navigator.clipboard.writeText(
																		candidate.trackId,
																	);
																	toast.success(
																		t(
																			"spotmatch.copiedSingleToast",
																			"Copied Spotify track ID!",
																		),
																	);
																} catch {
																	toast.error(
																		t(
																			"spotmatch.copyFailed",
																			"Failed to write to clipboard.",
																		),
																	);
																}
															}}
														>
															<Copy16Regular />
														</IconButton>
													</Tooltip>

													<Tooltip
														content={t(
															"spotmatch.openSpotify",
															"Open on Spotify",
														)}
													>
														<IconButton
															size="1"
															variant="ghost"
															color="gray"
															onClick={(e) => {
																e.stopPropagation();
																handleOpenLink(candidate.spotifyUrl);
															}}
														>
															<Open16Regular />
														</IconButton>
													</Tooltip>
												</Flex>
											</Flex>
										</Card>
									);
								})}
							</Flex>
						)}
					</ScrollArea>
				</Box>

				{/* Footer Actions */}
				<Flex
					justify="between"
					align="center"
					wrap="wrap"
					gap="3"
					className={styles.footer}
				>
					<Flex align="center" gap="4" wrap="wrap">
						<Text size="2" color="gray">
							{t("spotmatch.selectedCount", {
								selected: selectedCandidates.length,
								total: candidates.length,
								defaultValue: `${selectedCandidates.length} of ${candidates.length} selected`,
							})}
						</Text>

						<Tooltip
							content={t(
								"spotmatch.includeOriginalIdTooltip",
								"Prepend the searched original track ID to copied or exported IDs",
							)}
						>
							<Flex align="center" gap="2">
								<Switch
									size="1"
									id="spotmatch-include-original"
									checked={includeOriginalId}
									onCheckedChange={setIncludeOriginalId}
								/>
								<Text
									as="label"
									size="2"
									htmlFor="spotmatch-include-original"
									style={{ cursor: "pointer", userSelect: "none" }}
								>
									{t("spotmatch.includeOriginalId", "Include original ID")}
								</Text>
							</Flex>
						</Tooltip>
					</Flex>

					<Flex gap="2">
						<Button
							variant="soft"
							color="gray"
							disabled={!canExport}
							onClick={handleSaveTxt}
							style={{
								cursor: !canExport ? "not-allowed" : "pointer",
							}}
						>
							<Save16Regular />
							{t("spotmatch.saveAsTxt", "Save as .txt")}
						</Button>

						<Button
							variant="solid"
							color={copiedNotice ? "green" : undefined}
							disabled={!canExport}
							onClick={handleCopySpicyLyricsIds}
							style={{
								cursor: !canExport ? "not-allowed" : "pointer",
							}}
						>
							{copiedNotice ? <Checkmark16Regular /> : <Copy16Regular />}
							{copiedNotice
								? t("spotmatch.copied", "Copied IDs!")
								: t("spotmatch.copySpicyLyrics", "Copy IDs")}
						</Button>
					</Flex>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
}
