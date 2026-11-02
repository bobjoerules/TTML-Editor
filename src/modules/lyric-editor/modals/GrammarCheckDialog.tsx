import {
	AlertRegular,
	CheckRegular,
	DismissRegular,
	HistoryRegular,
	SearchRegular,
	SubtractRegular,
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
	SegmentedControl,
	Text,
	Tooltip,
} from "@radix-ui/themes";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useSetImmerAtom } from "jotai-immer";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	collectPossibleGrammarWarnings,
	getGrammarSuggestions,
	normalizeWord,
} from "$/modules/lyric-editor/utils/grammar-warning";
import {
	lyricLinesAtom,
	requestFocusAtom,
	selectedLinesAtom,
} from "$/states/main.ts";
import type { LyricWord } from "$/types/ttml";

export const grammarCheckDialogAtom = atom(false);

const IGNORED_WORDS_KEY = "grammarCheckIgnoredWords";

const ignoredWordsAtom = atomWithStorage<string[]>(IGNORED_WORDS_KEY, []);

interface GrammarIssue {
	type: "repeated" | "ambiguous" | "article" | "capitalization";
	lineId: string;
	lineIndex: number;
	isBackground: boolean;
	wordId: string;
	wordIndex: number;
	word: string;
	wordSnapshot: LyricWord;
	message: string;
	suggestion?: string;
}

interface GrammarChange {
	action: "fix" | "ignore";
	issue: GrammarIssue;
	timestamp: number;
}

export const GrammarCheckDialog = () => {
	const { t } = useTranslation();
	const [isOpen, setIsOpen] = useAtom(grammarCheckDialogAtom);
	const lyricData = useAtomValue(lyricLinesAtom);
	const allLyricLines = lyricData?.lyricLines || [];
	const setSelectedLines = useSetAtom(selectedLinesAtom);
	const setRequestFocus = useSetAtom(requestFocusAtom);
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const [changeHistory, setChangeHistory] = useState<GrammarChange[]>([]);
	const [activeTab, setActiveTab] = useState<"issues" | "history" | "ignored">(
		"issues",
	);
	const [ignoredIssues, setIgnoredIssues] = useState<Set<string>>(new Set());
	const [ignoredWords = [], setIgnoredWords] = useAtom(ignoredWordsAtom);
	const safeIgnoredList = Array.isArray(ignoredWords) ? ignoredWords : [];

	const issues = useMemo(() => {
		const result: GrammarIssue[] = [];
		if (!allLyricLines || allLyricLines.length === 0) return result;

		// Count main vocal lines for display (BG lines don't increase the count)
		let mainLineCount = 0;
		const safeIgnored = new Set(
			(Array.isArray(ignoredWords) ? ignoredWords : [])
				.map((word) => normalizeWord(word))
				.filter(Boolean),
		);

		allLyricLines.forEach((line) => {
			const isBackground = line.isBG;
			if (!isBackground) {
				mainLineCount++;
			}

			const warnings = collectPossibleGrammarWarnings(line, safeIgnored);
			const wordIdsWithWarnings = Array.from(warnings);

			const wordIndexMap = new Map<string, number>();
			line.words?.forEach((w, i) => {
				wordIndexMap.set(w.id, i);
			});

			wordIdsWithWarnings.forEach((wordId) => {
				const wordIndex = wordIndexMap.get(wordId);
				if (wordIndex === undefined) return;
				const word = line.words?.[wordIndex];
				if (!word) return;

				const normalized = normalizeWord(word.word);
				if (safeIgnored.has(normalized)) return;

				const suggestions = getGrammarSuggestions(line, wordIndex);
				if (suggestions.length === 0) return;

				const firstAlphaIndex = word.word.search(/[a-zA-Zа-яёÁ-ЯЁ]/);
				const hasCapitalInMiddle = /[a-zA-Zà-ÿÀ-ÿ].*[A-ZÀ-Ý]/.test(word.word);
				const isRepeatedRemoval = suggestions.includes(
					"__REMOVE_REPEATED_WORD__",
				);
				let issueType: GrammarIssue["type"] = "ambiguous";
				let message = t("grammarCheck.ambiguous", "Possible grammar issue");
				let suggestion = suggestions[0];

				if (isRepeatedRemoval) {
					issueType = "repeated";
					message = t("grammarCheck.repeatedWord", "Repeated word");
					suggestion = "__REMOVE_REPEATED_WORD__";
				} else if (
					wordIndex === 0 &&
					firstAlphaIndex !== -1 &&
					word.word[firstAlphaIndex] ===
						word.word[firstAlphaIndex].toLowerCase()
				) {
					issueType = "capitalization";
					message = t(
						"grammarCheck.capitalization",
						"Word should be capitalized",
					);
				} else if (wordIndex > 0 && hasCapitalInMiddle) {
					issueType = "capitalization";
					message = t(
						"grammarCheck.capitalInMiddle",
						"Word has capital letters in middle",
					);
				}

				if (message) {
					result.push({
						type: issueType,
						lineId: line.id,
						lineIndex: mainLineCount,
						isBackground,
						wordId,
						wordIndex,
						word: word.word,
						wordSnapshot: {
							...word,
							ruby: word.ruby?.map((rubyWord) => ({ ...rubyWord })),
						},
						message,
						suggestion,
					});
				}
			});
		});

		return result;
	}, [allLyricLines, t, ignoredWords]);

	const displayedIssues = useMemo(() => {
		return issues.filter((issue) => !ignoredIssues.has(issue.wordId));
	}, [issues, ignoredIssues]);

	const issueCount = displayedIssues.length;

	const handleJumpToIssue = (issue: GrammarIssue) => {
		setSelectedLines(new Set([issue.lineId]));
		setRequestFocus("startTime");
	};

	const handleFix = (issue: GrammarIssue) => {
		if (!issue.suggestion) return;

		const lineIndex = allLyricLines.findIndex((l) => l.id === issue.lineId);
		if (lineIndex === -1) return;

		editLyricLines((lyrics) => {
			const line = lyrics.lyricLines[lineIndex];
			if (line?.words) {
				const wordIndex = line.words.findIndex((w) => w.id === issue.wordId);
				if (wordIndex !== -1 && line.words[wordIndex]) {
					if (issue.suggestion === "__REMOVE_REPEATED_WORD__") {
						line.words.splice(wordIndex, 1);
					} else {
						line.words[wordIndex].word = issue.suggestion ?? "";
					}
				}
			}
		});

		setChangeHistory((prev) => [
			...prev,
			{ action: "fix", issue, timestamp: Date.now() },
		]);
	};

	const handleIgnore = (issue: GrammarIssue) => {
		setIgnoredIssues((prev) => new Set(prev).add(issue.wordId));
		setChangeHistory((prev) => [
			...prev,
			{ action: "ignore", issue, timestamp: Date.now() },
		]);
	};

	const handleIgnoreWord = (word: string) => {
		const normalized = normalizeWord(word);
		const safeList = Array.isArray(ignoredWords) ? ignoredWords : [];
		if (normalized && !safeList.includes(normalized)) {
			setIgnoredWords([...safeList, normalized]);
		}
	};

	const handleClearHistory = () => {
		setChangeHistory([]);
	};

	const handleUndoLast = () => {
		if (changeHistory.length === 0) return;

		const lastChange = changeHistory[changeHistory.length - 1];

		if (lastChange.action === "ignore") {
			// Remove from ignored issues so it reappears in the list
			setIgnoredIssues((prev) => {
				const newSet = new Set(prev);
				newSet.delete(lastChange.issue.wordId);
				return newSet;
			});
			setChangeHistory((prev) => prev.slice(0, -1));
			return;
		}

		// For fix actions, revert the fix
		const issue = lastChange.issue;
		const lineIndex = allLyricLines.findIndex((l) => l.id === issue.lineId);
		if (lineIndex === -1) return;

		editLyricLines((lyrics) => {
			const line = lyrics.lyricLines[lineIndex];
			if (line?.words) {
				if (issue.suggestion === "__REMOVE_REPEATED_WORD__") {
					line.words.splice(issue.wordIndex, 0, issue.wordSnapshot);
					return;
				}

				const wordIndex = line.words.findIndex((w) => w.id === issue.wordId);
				if (wordIndex !== -1 && line.words[wordIndex]) {
					line.words[wordIndex].word = issue.word;
				}
			}
		});

		setChangeHistory((prev) => prev.slice(0, -1));
	};

	return (
		<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Content
				maxWidth="720px"
				style={{
					maxWidth: 720,
					width: "min(720px, 94vw)",
					maxHeight: "85vh",
					display: "flex",
					flexDirection: "column",
					padding: "20px 24px",
					borderRadius: "16px",
				}}
			>
				{/* Header */}
				<Flex
					justify="between"
					align="center"
					pb="3"
					style={{ borderBottom: "1px solid var(--gray-a4)" }}
				>
					<Flex align="center" gap="2">
						<Box
							style={{
								width: 32,
								height: 32,
								borderRadius: "50%",
								backgroundColor: "var(--accent-a3)",
								color: "var(--accent-11)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<AlertRegular style={{ width: 18, height: 18 }} />
						</Box>
						<Dialog.Title asChild>
							<Text size="4" weight="bold">
								{t("grammarCheck.title", "Grammar & Spelling Check")}
							</Text>
						</Dialog.Title>
					</Flex>

					<Dialog.Close>
						<IconButton
							size="2"
							variant="ghost"
							color="gray"
							style={{ cursor: "pointer" }}
							aria-label={t("common.close", "Close")}
						>
							<DismissRegular style={{ width: 18, height: 18 }} />
						</IconButton>
					</Dialog.Close>
				</Flex>

				{/* Tab Bar & Status */}
				<Flex justify="between" align="center" py="3" wrap="wrap" gap="2">
					<SegmentedControl.Root
						value={activeTab}
						onValueChange={(val) =>
							setActiveTab(val as "issues" | "history" | "ignored")
						}
						size="2"
					>
						<SegmentedControl.Item value="issues">
							<Flex align="center" gap="1">
								<AlertRegular style={{ width: 14, height: 14 }} />
								<span>
									{t("grammarCheck.issues", "Issues")} ({issueCount})
								</span>
							</Flex>
						</SegmentedControl.Item>
						<SegmentedControl.Item value="history">
							<Flex align="center" gap="1">
								<HistoryRegular style={{ width: 14, height: 14 }} />
								<span>
									{t("grammarCheck.history", "History")} ({changeHistory.length}
									)
								</span>
							</Flex>
						</SegmentedControl.Item>
						<SegmentedControl.Item value="ignored">
							<Flex align="center" gap="1">
								<SubtractRegular style={{ width: 14, height: 14 }} />
								<span>
									{t("grammarCheck.ignoredWords", "Ignored Words")} (
									{safeIgnoredList.length})
								</span>
							</Flex>
						</SegmentedControl.Item>
					</SegmentedControl.Root>

					<Text size="2" color="gray">
						{issueCount === 0
							? t("grammarCheck.noIssues", "No issues found!")
							: `${issueCount} ${t("grammarCheck.issuesFound", "issues found")}`}
					</Text>
				</Flex>

				{/* Content Tab Panes */}
				<Box style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
					{activeTab === "issues" && (
						<ScrollArea
							type="auto"
							scrollbars="vertical"
							style={{ height: "420px", maxHeight: "55vh" }}
						>
							<Box pr="2">
								{issueCount === 0 ? (
									<Flex
										direction="column"
										align="center"
										justify="center"
										style={{ padding: "60px 20px" }}
										gap="3"
									>
										<Box
											style={{
												width: 52,
												height: 52,
												borderRadius: "50%",
												backgroundColor: "var(--green-a3)",
												color: "var(--green-9)",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
											}}
										>
											<CheckRegular style={{ width: 28, height: 28 }} />
										</Box>
										<Text size="3" weight="bold">
											{t("grammarCheck.noIssues", "No issues found!")}
										</Text>
										<Text size="2" color="gray" align="center">
											{t(
												"grammarCheck.noIssuesMessage",
												"No issues found! Your lyrics look good.",
											)}
										</Text>
									</Flex>
								) : (
									<Flex direction="column" gap="2">
										{displayedIssues.map((issue) => (
											<Card
												key={`${issue.lineId}-${issue.wordId}`}
												style={{
													padding: "12px 14px",
													borderRadius: "10px",
													backgroundColor: "var(--color-surface)",
													border: "1px solid var(--gray-a4)",
													transition: "border-color 0.15s ease",
												}}
											>
												<Flex align="center" justify="between" gap="3">
													<Box
														style={{ cursor: "pointer", flex: 1, minWidth: 0 }}
														onClick={() => handleJumpToIssue(issue)}
													>
														<Flex align="center" gap="2" wrap="wrap">
															<Badge
																size="1"
																color={
																	issue.type === "repeated"
																		? "orange"
																		: issue.type === "capitalization"
																			? "blue"
																			: issue.type === "article"
																				? "purple"
																				: "amber"
																}
																variant="surface"
															>
																{issue.type}
															</Badge>
															<Text size="2" weight="bold">
																"{issue.word}"
															</Text>
															<Text size="2" color="gray">
																— {issue.message}
															</Text>
															{issue.suggestion && (
																<Flex align="center" gap="1">
																	<Text size="2" color="gray">
																		→
																	</Text>
																	<Badge size="1" color="green" variant="soft">
																		{issue.suggestion ===
																		"__REMOVE_REPEATED_WORD__"
																			? t(
																					"grammarCheck.removeWord",
																					"Remove word",
																				)
																			: issue.suggestion}
																	</Badge>
																</Flex>
															)}
														</Flex>
														<Text
															size="1"
															color="gray"
															style={{ marginTop: "4px" }}
														>
															{t("grammarCheck.line", "Line")} {issue.lineIndex}
															{issue.isBackground ? " (BG)" : ""}
														</Text>
													</Box>

													<Flex
														gap="1"
														align="center"
														style={{ flexShrink: 0 }}
													>
														<Tooltip
															content={t(
																"grammarCheck.jumpToIssue",
																"Jump to line in editor",
															)}
														>
															<IconButton
																size="1"
																variant="soft"
																color="gray"
																onClick={() => handleJumpToIssue(issue)}
															>
																<SearchRegular />
															</IconButton>
														</Tooltip>
														{issue.suggestion && (
															<Tooltip
																content={t(
																	"grammarCheck.applyFix",
																	"Apply suggested fix",
																)}
															>
																<IconButton
																	size="1"
																	variant="soft"
																	color="green"
																	onClick={() => handleFix(issue)}
																>
																	<CheckRegular />
																</IconButton>
															</Tooltip>
														)}
														<Tooltip
															content={t(
																"grammarCheck.ignoreSession",
																"Ignore this word in this session",
															)}
														>
															<IconButton
																size="1"
																variant="soft"
																color="gray"
																onClick={() => handleIgnore(issue)}
															>
																<DismissRegular />
															</IconButton>
														</Tooltip>
														<Tooltip
															content={t(
																"grammarCheck.ignoreAlways",
																"Always ignore this word",
															)}
														>
															<IconButton
																size="1"
																variant="soft"
																color="red"
																onClick={() => handleIgnoreWord(issue.word)}
															>
																<SubtractRegular />
															</IconButton>
														</Tooltip>
													</Flex>
												</Flex>
											</Card>
										))}
									</Flex>
								)}
							</Box>
						</ScrollArea>
					)}

					{activeTab === "history" && (
						<ScrollArea
							type="auto"
							scrollbars="vertical"
							style={{ height: "420px", maxHeight: "55vh" }}
						>
							<Box pr="2">
								<Flex justify="end" gap="2" style={{ marginBottom: "10px" }}>
									<Button
										size="1"
										variant="outline"
										disabled={changeHistory.length === 0}
										onClick={handleUndoLast}
									>
										{t("grammarCheck.undoLast", "Undo Last")}
									</Button>
									<Button
										size="1"
										variant="outline"
										color="red"
										disabled={changeHistory.length === 0}
										onClick={handleClearHistory}
									>
										{t("grammarCheck.clearHistory", "Clear History")}
									</Button>
								</Flex>
								{changeHistory.length === 0 ? (
									<Flex
										direction="column"
										align="center"
										justify="center"
										style={{ padding: "60px 20px" }}
									>
										<Text size="2" color="gray">
											{t("grammarCheck.noHistory", "No changes made yet")}
										</Text>
									</Flex>
								) : (
									<Flex direction="column" gap="2">
										{[...changeHistory].reverse().map((change) => (
											<Card
												key={`${change.issue.wordId}-${change.timestamp}`}
												style={{
													padding: "10px 12px",
													borderRadius: "8px",
													backgroundColor: "var(--color-surface)",
													border: "1px solid var(--gray-a4)",
												}}
											>
												<Flex align="center" justify="between" gap="2">
													<Flex align="center" gap="2">
														{change.action === "fix" ? (
															<CheckRegular
																style={{ color: "var(--green-9)" }}
															/>
														) : (
															<DismissRegular
																style={{ color: "var(--gray-9)" }}
															/>
														)}
														<Text size="2">
															"{change.issue.word}" —{" "}
															{change.action === "fix"
																? t("grammarCheck.fixed", "fixed")
																: t("grammarCheck.ignored", "ignored")}
														</Text>
													</Flex>
													<Text size="1" color="gray">
														({t("grammarCheck.line", "Line")}{" "}
														{change.issue.lineIndex}
														{change.issue.isBackground ? " (BG)" : ""})
													</Text>
												</Flex>
											</Card>
										))}
									</Flex>
								)}
							</Box>
						</ScrollArea>
					)}

					{activeTab === "ignored" && (
						<ScrollArea
							type="auto"
							scrollbars="vertical"
							style={{ height: "420px", maxHeight: "55vh" }}
						>
							<Box pr="2">
								<Flex justify="end" gap="2" style={{ marginBottom: "10px" }}>
									<Button
										size="1"
										variant="outline"
										color="red"
										disabled={safeIgnoredList.length === 0}
										onClick={() => setIgnoredWords([])}
									>
										{t("grammarCheck.clearIgnoredWords", "Clear All")}
									</Button>
								</Flex>
								{safeIgnoredList.length === 0 ? (
									<Flex
										direction="column"
										align="center"
										justify="center"
										style={{ padding: "60px 20px" }}
									>
										<Text size="2" color="gray">
											{t("grammarCheck.noIgnoredWords", "No ignored words")}
										</Text>
									</Flex>
								) : (
									<Flex direction="column" gap="2">
										{safeIgnoredList.map((word) => (
											<Card
												key={word}
												style={{
													padding: "8px 12px",
													borderRadius: "8px",
													backgroundColor: "var(--color-surface)",
													border: "1px solid var(--gray-a4)",
												}}
											>
												<Flex align="center" justify="between">
													<Text size="2" weight="medium">
														{word}
													</Text>
													<IconButton
														size="1"
														variant="ghost"
														color="red"
														onClick={() => {
															setIgnoredWords(
																safeIgnoredList.filter((w) => w !== word),
															);
														}}
													>
														<DismissRegular />
													</IconButton>
												</Flex>
											</Card>
										))}
									</Flex>
								)}
							</Box>
						</ScrollArea>
					)}
				</Box>
			</Dialog.Content>
		</Dialog.Root>
	);
};
