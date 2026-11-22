import {
	Broom20Regular,
	CheckmarkCircle20Regular,
	Dismiss16Regular,
	Eye20Regular,
	Filter20Regular,
	Location20Regular,
	ShieldCheckmark20Regular,
	Warning20Regular,
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
	SegmentedControl,
	Text,
	TextField,
	Tooltip,
} from "@radix-ui/themes";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useSetImmerAtom } from "jotai-immer";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { audioEngine } from "$/modules/audio/audio-engine";
import { currentTimeAtom } from "$/modules/audio/states";
import exportTTMLText from "$/modules/project/logic/ttml-writer";
import {
	allowConsecutiveBackgroundLinesAtom,
	lyricTextNormalizationOptionsAtom,
} from "$/modules/settings/states";
import {
	lyricLinesAtom,
	projectIdAtom,
	saveFileNameAtom,
	selectedLinesAtom,
	selectedWordsAtom,
} from "$/states/main";
import { saveFile } from "$/utils/fileSystem";
import { msToTimestamp } from "$/utils/timestamp";
import {
	censorWordsDialogAtom,
	customBadWordsAtom,
} from "../states/censor-words";
import {
	type BadWordOccurrence,
	censorTTMLLyric,
	cleanWordToken,
	findBadWordOccurrences,
	maskWordKeepPunctuation,
} from "../utils/censor-words";

export const CensorWordsDialog = () => {
	const { t } = useTranslation();
	const store = useStore();
	const [isOpen, setIsOpen] = useAtom(censorWordsDialogAtom);
	const lyricData = useAtomValue(lyricLinesAtom);
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const setSelectedLines = useSetAtom(selectedLinesAtom);
	const setSelectedWords = useSetAtom(selectedWordsAtom);
	const saveFileName = useAtomValue(saveFileNameAtom);

	const [customBadWords, setCustomBadWords] = useAtom(customBadWordsAtom);
	const [ignoredWords, setIgnoredWords] = useState<string[]>([]);
	const [excludedOccurrenceIds, setExcludedOccurrenceIds] = useState<
		Set<string>
	>(new Set());
	const [activeTab, setActiveTab] = useState<"detected" | "custom">("detected");
	const [searchFilter, setSearchFilter] = useState("");
	const [newWordInput, setNewWordInput] = useState("");

	const occurrences = useMemo(() => {
		if (!isOpen || !lyricData?.lyricLines) return [];
		return findBadWordOccurrences(
			lyricData.lyricLines,
			customBadWords,
			ignoredWords,
		);
	}, [isOpen, lyricData, customBadWords, ignoredWords]);

	const filteredOccurrences = useMemo(() => {
		if (!searchFilter.trim()) return occurrences;
		const query = searchFilter.toLowerCase();
		return occurrences.filter(
			(occ) =>
				occ.matchedWord.toLowerCase().includes(query) ||
				occ.lineContext.toLowerCase().includes(query),
		);
	}, [occurrences, searchFilter]);

	const toggleExcludeOccurrence = (id: string) => {
		setExcludedOccurrenceIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleAddCustomWord = () => {
		const word = cleanWordToken(newWordInput);
		if (!word) return;
		if (!customBadWords.includes(word)) {
			setCustomBadWords((prev) => [...prev, word]);
			toast.success(
				t("cleanLyrics.addedBadWord", 'Added "{{word}}" to bad words list', {
					word,
				}),
			);
		} else {
			toast.info(
				t("cleanLyrics.wordAlreadyInList", 'Word "{{word}}" is already in list', {
					word,
				}),
			);
		}
		setNewWordInput("");
	};

	const handleRemoveCustomWord = (word: string) => {
		setCustomBadWords((prev) => prev.filter((w) => w !== word));
		toast.info(
			t("cleanLyrics.removedBadWord", 'Removed "{{word}}" from bad words list', {
				word,
			}),
		);
	};

	const handleIgnoreWord = (word: string) => {
		const clean = cleanWordToken(word);
		if (!clean) return;
		setIgnoredWords((prev) => Array.from(new Set([...prev, clean])));
		toast.info(
			t("cleanLyrics.ignoredWord", 'Ignored "{{word}}" for this song', {
				word: clean,
			}),
		);
	};

	const handleJumpToOccurrence = (occ: BadWordOccurrence) => {
		setSelectedLines(new Set([occ.lineId]));
		if (occ.wordId) {
			setSelectedWords(new Set([occ.wordId]));
		}
		audioEngine.seekMusic(occ.startTime / 1000);
		store.set(currentTimeAtom, occ.startTime);
	};

	const handleMarkAllAsObscene = () => {
		if (occurrences.length === 0) return;
		editLyricLines((state) => {
			for (const occ of occurrences) {
				if (occ.wordId) {
					const line = state.lyricLines[occ.lineIndex];
					if (line?.words) {
						const word = line.words.find((w) => w.id === occ.wordId);
						if (word) {
							word.obscene = true;
						}
					}
				}
			}
		});
		toast.success(
			t(
				"cleanLyrics.markedAllAsObscene",
				"Marked {{count}} words as bad in project",
				{
					count: occurrences.length,
				},
			),
		);
	};

	const getCleanLyricState = () => {
		const excludedWordIds = new Set<string>();
		for (const occ of occurrences) {
			if (excludedOccurrenceIds.has(occ.id) && occ.wordId) {
				excludedWordIds.add(occ.wordId);
			}
		}
		return censorTTMLLyric(
			lyricData,
			customBadWords,
			ignoredWords,
			"****",
			excludedWordIds,
		);
	};

	const handleApplyToEditor = () => {
		editLyricLines((state) => {
			const clean = getCleanLyricState();
			state.lyricLines = clean.lyricLines;
		});
		toast.success(
			t("cleanLyrics.appliedToEditor", "Replaced bad words with **** in editor"),
		);
		setIsOpen(false);
	};

	const handleSaveCleanFile = async () => {
		try {
			const cleanLyricState = getCleanLyricState();
			const ttmlText = exportTTMLText(
				cleanLyricState,
				store.get(lyricTextNormalizationOptionsAtom),
				{
					allowConsecutiveBackgroundLines: store.get(
						allowConsecutiveBackgroundLinesAtom,
					),
				},
			);

			const baseName = saveFileName.replace(/\.[^.]*$/, "");
			const cleanSuggestedName = `${baseName} (Clean).ttml`;

			const savedName = await saveFile(ttmlText, {
				suggestedName: cleanSuggestedName,
				types: [
					{
						description: "TTML Files",
						accept: { "application/ttml+xml": [".ttml"] },
					},
				],
			});

			if (savedName) {
				toast.success(
					t("cleanLyrics.savedCleanFile", 'Saved clean version as "{{name}}"', {
						name: savedName,
					}),
				);

				try {
					const { recordTTMLCompletion } = await import(
						"$/modules/project/timer/project-timer"
					);
					const metadata = cleanLyricState.metadata || [];
					const title =
						metadata.find((m) => (m.key || "").toLowerCase() === "title")
							?.value[0] || savedName.replace(/\.[^.]*$/, "");
					const artist =
						metadata.find((m) => (m.key || "").toLowerCase() === "artist")
							?.value[0] || "";
					const projectId = store.get(projectIdAtom);
					await recordTTMLCompletion({
						projectId,
						title: `${title} (Clean)`,
						artist,
						lineCount: cleanLyricState.lyricLines.length,
					});
				} catch {
					// ignore
				}

				setIsOpen(false);
			}
		} catch (e) {
			console.error("Failed to save clean TTML file", e);
			toast.error(t("cleanLyrics.saveFailed", "Failed to save clean version"));
		}
	};

	const handleCopyCleanToClipboard = async () => {
		try {
			const cleanLyricState = getCleanLyricState();
			const ttmlText = exportTTMLText(
				cleanLyricState,
				store.get(lyricTextNormalizationOptionsAtom),
				{
					allowConsecutiveBackgroundLines: store.get(
						allowConsecutiveBackgroundLinesAtom,
					),
				},
			);
			await navigator.clipboard.writeText(ttmlText);
			toast.success(
				t(
					"cleanLyrics.copiedToClipboard",
					"Clean TTML lyrics copied to clipboard!",
				),
			);
		} catch (e) {
			console.error("Failed to copy clean TTML", e);
			toast.error(t("cleanLyrics.copyFailed", "Failed to copy to clipboard"));
		}
	};

	return (
		<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Content maxWidth="650px" style={{ maxHeight: "85vh" }}>
				<Dialog.Title>
					<Flex align="center" gap="2">
						<Broom20Regular />
						<Text size="5" weight="bold">
							{t("cleanLyrics.dialogTitle", "Search Bad Words & Clean Version")}
						</Text>
						{occurrences.length > 0 ? (
							<Badge color="red" size="2" variant="soft">
								{t("cleanLyrics.detectedCount", "{{count}} detected", {
									count: occurrences.length,
								})}
							</Badge>
						) : (
							<Badge color="green" size="2" variant="soft">
								{t("cleanLyrics.noneDetectedBadge", "Clean")}
							</Badge>
						)}
					</Flex>
				</Dialog.Title>
				<Dialog.Description size="2" color="gray" mb="3">
					{t(
						"cleanLyrics.dialogDesc",
						"Find, review, and mark explicit words to replace with **** before saving or exporting a clean version.",
					)}
				</Dialog.Description>

				<Flex direction="column" gap="3">
					<SegmentedControl.Root
						value={activeTab}
						onValueChange={(val) => setActiveTab(val as "detected" | "custom")}
					>
						<SegmentedControl.Item value="detected">
							{t("cleanLyrics.tabDetected", "Detected Words ({{count}})", {
								count: occurrences.length,
							})}
						</SegmentedControl.Item>
						<SegmentedControl.Item value="custom">
							{t("cleanLyrics.tabCustom", "Custom Bad Words ({{count}})", {
								count: customBadWords.length,
							})}
						</SegmentedControl.Item>
					</SegmentedControl.Root>

					{activeTab === "detected" && (
						<Flex direction="column" gap="3">
							<Flex gap="2" align="center">
								<Box style={{ flex: 1 }}>
									<TextField.Root
										placeholder={t(
											"cleanLyrics.searchPlaceholder",
											"Filter detected words...",
										)}
										value={searchFilter}
										onChange={(e) => setSearchFilter(e.target.value)}
										size="2"
									>
										<TextField.Slot>
											<Filter20Regular />
										</TextField.Slot>
									</TextField.Root>
								</Box>

								{occurrences.length > 0 && (
									<Tooltip
										content={t(
											"cleanLyrics.markAllTooltip",
											"Mark all detected words as obscene in the project",
										)}
									>
										<Button
											variant="soft"
											color="amber"
											size="2"
											onClick={handleMarkAllAsObscene}
										>
											<Warning20Regular />
											{t("cleanLyrics.markAllBtn", "Mark All in Editor")}
										</Button>
									</Tooltip>
								)}
							</Flex>

							<Flex gap="2" align="center">
								<TextField.Root
									placeholder={t(
										"cleanLyrics.addWordPlaceholder",
										"Mark new word as bad...",
									)}
									value={newWordInput}
									onChange={(e) => setNewWordInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											handleAddCustomWord();
										}
									}}
									size="2"
									style={{ flex: 1 }}
								/>
								<Button size="2" variant="surface" onClick={handleAddCustomWord}>
									{t("cleanLyrics.addWordBtn", "Add Bad Word")}
								</Button>
							</Flex>

							<ScrollArea style={{ maxHeight: "360px" }} type="auto">
								{filteredOccurrences.length === 0 ? (
									<Card size="2">
										<Flex
											direction="column"
											align="center"
											justify="center"
											gap="2"
											py="5"
										>
											<CheckmarkCircle20Regular
												style={{ color: "var(--green-9)", width: 32, height: 32 }}
											/>
											<Heading size="3" color="green">
												{t(
													"cleanLyrics.allCleanTitle",
													"No bad words detected!",
												)}
											</Heading>
											<Text size="2" color="gray" align="center">
												{t(
													"cleanLyrics.allCleanDesc",
													"No commonly censored words or marked explicit words were found in this song.",
												)}
											</Text>
										</Flex>
									</Card>
								) : (
									<Flex direction="column" gap="2">
										{filteredOccurrences.map((occ) => {
											const isExcluded = excludedOccurrenceIds.has(occ.id);
											return (
												<Card
													key={occ.id}
													size="1"
													style={{
														opacity: isExcluded ? 0.6 : 1,
														borderLeft: isExcluded
															? "3px solid var(--gray-6)"
															: "3px solid var(--red-9)",
													}}
												>
													<Flex justify="between" align="center" gap="3">
														<Flex align="center" gap="3" style={{ flex: 1 }}>
															<Tooltip
																content={
																	isExcluded
																		? t(
																				"cleanLyrics.uncheckedTooltip",
																				"Unchecked: will NOT be censored",
																			)
																		: t(
																				"cleanLyrics.checkedTooltip",
																				"Checked: will be replaced with ****",
																			)
																}
															>
																<Checkbox
																	checked={!isExcluded}
																	onCheckedChange={() =>
																		toggleExcludeOccurrence(occ.id)
																	}
																/>
															</Tooltip>

															<Flex direction="column" gap="1" style={{ flex: 1 }}>
																<Flex align="center" gap="2">
																	<Badge size="1" color="gray" variant="surface">
																		Line {occ.displayLineNumber}
																	</Badge>
																	<Badge size="1" color="indigo" variant="soft">
																		{msToTimestamp(occ.startTime)}
																	</Badge>
																	<Badge size="1" color="red" variant="solid">
																		{occ.matchedWord}
																	</Badge>
																	{occ.isObsceneMarked && (
																		<Badge size="1" color="amber" variant="soft">
																			Obscene
																		</Badge>
																	)}
																</Flex>
																<Text size="2" style={{ wordBreak: "break-word" }}>
																	{occ.lineContext}
																</Text>
															</Flex>
														</Flex>

														<Flex gap="1" align="center">
															<Tooltip
																content={t(
																	"cleanLyrics.jumpToWord",
																	"Locate in Editor",
																)}
															>
																<IconButton
																	size="1"
																	variant="ghost"
																	onClick={() => handleJumpToOccurrence(occ)}
																>
																	<Location20Regular />
																</IconButton>
															</Tooltip>

															<Tooltip
																content={t(
																	"cleanLyrics.ignoreWordTooltip",
																	"Ignore this word everywhere",
																)}
															>
																<IconButton
																	size="1"
																	variant="ghost"
																	color="gray"
																	onClick={() => handleIgnoreWord(occ.matchedWord)}
																>
																	<Dismiss16Regular />
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
						</Flex>
					)}

					{activeTab === "custom" && (
						<Flex direction="column" gap="3">
							<Text size="2" color="gray">
								{t(
									"cleanLyrics.customWordsDesc",
									"Manage custom words that should always be identified as bad words and censored across all songs.",
								)}
							</Text>

							<Flex gap="2">
								<TextField.Root
									placeholder={t(
										"cleanLyrics.addCustomWordInput",
										"Enter word to always censor...",
									)}
									value={newWordInput}
									onChange={(e) => setNewWordInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											handleAddCustomWord();
										}
									}}
									style={{ flex: 1 }}
									size="2"
								/>
								<Button size="2" onClick={handleAddCustomWord}>
									{t("cleanLyrics.addBtn", "Add Word")}
								</Button>
							</Flex>

							<ScrollArea style={{ maxHeight: "300px" }} type="auto">
								{customBadWords.length === 0 ? (
									<Card size="2">
										<Text size="2" color="gray" align="center">
											{t(
												"cleanLyrics.noCustomWords",
												"No custom bad words added yet. You can add words here or right-click any word in the editor to mark it as bad.",
											)}
										</Text>
									</Card>
								) : (
									<Flex wrap="wrap" gap="2">
										{customBadWords.map((word) => (
											<Badge key={word} size="2" color="red" variant="soft">
												<Flex align="center" gap="1">
													<span>{word}</span>
													<IconButton
														size="1"
														variant="ghost"
														color="red"
														style={{ cursor: "pointer", padding: 0, width: 14, height: 14 }}
														onClick={() => handleRemoveCustomWord(word)}
													>
														<Dismiss16Regular style={{ width: 12, height: 12 }} />
													</IconButton>
												</Flex>
											</Badge>
										))}
									</Flex>
								)}
							</ScrollArea>
						</Flex>
					)}

					<Flex justify="between" align="center" pt="3" style={{ borderTop: "1px solid var(--gray-5)" }}>
						<Flex gap="2">
							<Button
								variant="soft"
								color="gray"
								size="2"
								onClick={handleCopyCleanToClipboard}
							>
								{t("cleanLyrics.copyCleanTtml", "Copy Clean TTML")}
							</Button>
							{occurrences.length > 0 && (
								<Button
									variant="soft"
									color="amber"
									size="2"
									onClick={handleApplyToEditor}
								>
									{t("cleanLyrics.applyToEditor", "Apply **** in Editor")}
								</Button>
							)}
						</Flex>

						<Flex gap="2">
							<Dialog.Close>
								<Button variant="surface" color="gray" size="2">
									{t("common.close", "Close")}
								</Button>
							</Dialog.Close>
							<Button
								variant="solid"
								color="indigo"
								size="2"
								onClick={handleSaveCleanFile}
							>
								<ShieldCheckmark20Regular />
								{t("cleanLyrics.saveCleanTtml", "Save Clean TTML...")}
							</Button>
						</Flex>
					</Flex>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};
