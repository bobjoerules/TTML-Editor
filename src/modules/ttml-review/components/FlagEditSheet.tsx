import {
	Chat16Regular,
	Cut16Regular,
	Delete16Regular,
	Dismiss16Regular,
	DocumentText16Regular,
	Mic16Regular,
	PersonAdd16Regular,
	PersonDelete16Regular,
	Star16Regular,
	TextQuote16Regular,
	TextWrap16Regular,
	Timer16Regular,
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
	SegmentedControl,
	Text,
	TextArea,
	TextField,
} from "@radix-ui/themes";
import { useAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ttmlReviewPresetsAtom } from "../states";
import type {
	ReviewFlag,
	ReviewFlagCategory,
	ReviewPreset,
	ReviewWord,
	TimingWhen,
	TimingWhere,
} from "../types";
import {
	BUILTIN_CATEGORIES,
	getDefaultFlagNote,
	getFlagLabel,
	TIMING_WHEN_LABELS,
	TIMING_WHERE_LABELS,
	WRITER_CATEGORIES,
} from "../utils/templateDefaults";
import { getWordsText } from "../utils/exportMarkdown";

interface FlagEditSheetProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (flag: ReviewFlag) => void;
	onDelete?: (flagId: number) => void;
	initialFlag?: Partial<ReviewFlag> | null;
	quotedText: string;
	lineIndex: number;
	startWordIndex: number;
	endWordIndex: number;
	lineWords?: ReviewWord[];
	targetType?: "line" | "writer";
	writerName?: string;
	availableWriters?: string[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
	Timing: <Timer16Regular />,
	"Suggest syllable split": <Cut16Regular />,
	Spelling: <DocumentText16Regular />,
	"Line break": <TextWrap16Regular />,
	"Background vocals": <Mic16Regular />,
	Punctuation: <TextQuote16Regular />,
	"Incorrect writer": <Dismiss16Regular />,
	"Missing writer": <PersonAdd16Regular />,
	"Extra writer": <PersonDelete16Regular />,
	"Writer formatting": <TextQuote16Regular />,
	Other: <Chat16Regular />,
};

export const FlagEditSheet: React.FC<FlagEditSheetProps> = ({
	isOpen,
	onClose,
	onSave,
	onDelete,
	initialFlag,
	quotedText,
	lineIndex,
	startWordIndex,
	endWordIndex,
	lineWords,
	targetType = "line",
	writerName,
	availableWriters,
}) => {
	const { t } = useTranslation();
	const [presets, setPresets] = useAtom(ttmlReviewPresetsAtom);

	const isWriter =
		targetType === "writer" || initialFlag?.targetType === "writer";
	const [writerInput, setWriterInput] = useState(
		writerName || initialFlag?.writerName || quotedText || "",
	);
	const [rangeStart, setRangeStart] = useState(startWordIndex);
	const [rangeEnd, setRangeEnd] = useState(endWordIndex);
	const [tpl, setTpl] = useState<ReviewFlagCategory>(
		isWriter ? "Incorrect writer" : "Timing",
	);
	const [where, setWhere] = useState<TimingWhere>("sync");
	const [when, setWhen] = useState<TimingWhen>("early");
	const [notes, setNotes] = useState("");
	const [autoNote, setAutoNote] = useState("");
	const [isAddingPreset, setIsAddingPreset] = useState(false);
	const [newPresetName, setNewPresetName] = useState("");

	const currentQuoted = useMemo(() => {
		if (isWriter) {
			return writerInput.trim() || quotedText || "Songwriter";
		}
		if (lineWords && lineWords.length > 0) {
			const s = Math.max(0, Math.min(rangeStart, lineWords.length - 1));
			const e = Math.max(s, Math.min(rangeEnd, lineWords.length - 1));
			return getWordsText(lineWords.slice(s, e + 1));
		}
		return quotedText;
	}, [isWriter, writerInput, lineWords, rangeStart, rangeEnd, quotedText]);

	useEffect(() => {
		if (isOpen) {
			setRangeStart(startWordIndex);
			setRangeEnd(endWordIndex);
			const initWriter =
				writerName ||
				initialFlag?.writerName ||
				(isWriter ? quotedText : "");
			setWriterInput(initWriter);

			const initialTpl =
				initialFlag?.tpl || (isWriter ? "Incorrect writer" : "Timing");
			const initialWhere = initialFlag?.where || "sync";
			const initialWhen = initialFlag?.when || "early";
			const initialNotes = initialFlag?.notes || "";

			setTpl(initialTpl);
			setWhere(initialWhere);
			setWhen(initialWhen);

			const currentText = isWriter
				? initWriter.trim() || "Songwriter"
				: currentQuoted;

			const defaultNote = getDefaultFlagNote(
				initialTpl,
				currentText,
				initialWhere,
				initialWhen,
				presets,
			);
			setAutoNote(defaultNote);

			if (initialNotes) {
				setNotes(initialNotes);
			} else {
				setNotes(defaultNote);
			}

			setIsAddingPreset(false);
			setNewPresetName("");
		}
	}, [
		isOpen,
		initialFlag,
		startWordIndex,
		endWordIndex,
		writerName,
		isWriter,
		presets,
	]);

	// Update default note when selection range changes if note has not been custom edited
	useEffect(() => {
		if (!isOpen) return;
		const defaultNote = getDefaultFlagNote(
			tpl,
			currentQuoted,
			where,
			when,
			presets,
		);
		setAutoNote(defaultNote);
		setNotes((prev) => {
			if (!prev.trim() || prev === autoNote) {
				return defaultNote;
			}
			return prev;
		});
	}, [isOpen, currentQuoted, tpl, where, when, presets]);

	const handleCategoryClick = (category: ReviewFlagCategory) => {
		setTpl(category);
		const newDefault = getDefaultFlagNote(
			category,
			currentQuoted,
			where,
			when,
			presets,
		);
		setAutoNote(newDefault);
		if (!notes.trim() || notes === autoNote) {
			setNotes(newDefault);
		}
	};

	const handleTimingChange = (newWhere: TimingWhere, newWhen: TimingWhen) => {
		setWhere(newWhere);
		setWhen(newWhen);
		const newDefault = getDefaultFlagNote(
			"Timing",
			currentQuoted,
			newWhere,
			newWhen,
			presets,
		);
		setAutoNote(newDefault);
		if (!notes.trim() || notes === autoNote) {
			setNotes(newDefault);
		}
	};

	const handleSave = () => {
		const flagId = initialFlag?.id || Date.now();
		const finalFlag: ReviewFlag = {
			id: flagId,
			targetType: isWriter ? "writer" : "line",
			lineIndex: isWriter ? -1 : lineIndex,
			startWordIndex: isWriter ? -1 : rangeStart,
			endWordIndex: isWriter ? -1 : rangeEnd,
			writerName: isWriter
				? writerInput.trim() || currentQuoted
				: undefined,
			tpl,
			where: !isWriter && tpl === "Timing" ? where : undefined,
			when: !isWriter && tpl === "Timing" ? when : undefined,
			notes: notes.trim(),
			autoNote,
			quotedText: currentQuoted.trim(),
		};
		onSave(finalFlag);
		onClose();
	};

	const handleSaveAsPreset = () => {
		const name = newPresetName.trim();
		if (!name) return;
		if (BUILTIN_CATEGORIES.includes(name)) {
			toast.error(t("ttmlReview.builtInName", "That name is built-in. Pick another."));
			return;
		}
		const newPreset: ReviewPreset = {
			name,
			detail: notes.trim(),
		};
		setPresets((prev) => [...prev.filter((p) => p.name !== name), newPreset]);
		setIsAddingPreset(false);
		setNewPresetName("");
		toast.success(t("ttmlReview.presetSaved", `Preset "${name}" saved!`));
	};

	const handleDeletePreset = (presetName: string, e: React.MouseEvent) => {
		e.stopPropagation();
		setPresets((prev) => prev.filter((p) => p.name !== presetName));
		if (tpl === presetName) {
			handleCategoryClick("Timing");
		}
	};

	return (
		<Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<Dialog.Content
				style={{
					maxWidth: 520,
					borderRadius: "var(--radius-4)",
					backgroundColor: "var(--color-panel-solid)",
					boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
				}}
			>
				<Flex justify="between" align="center" mb="3">
					<Heading size="3">
						{initialFlag?.id
							? isWriter
								? t("ttmlReview.editWriterFlag", "Edit Writer Flag")
								: t("ttmlReview.editFlag", "Edit Flag")
							: isWriter
								? t("ttmlReview.raiseWriterFlag", "Flag Writer")
								: t("ttmlReview.raiseFlag", "Raise Flag")}
					</Heading>
					<Dialog.Close>
						<IconButton variant="ghost" color="gray" size="1">
							<Dismiss16Regular />
						</IconButton>
					</Dialog.Close>
				</Flex>

				{/* Writer Selection & Input */}
				{isWriter && (
					<Box mb="3">
						{availableWriters && availableWriters.length > 0 && (
							<Box mb="2">
								<Text size="1" color="gray" weight="bold" mb="1" as="div">
									{t("ttmlReview.selectExistingWriter", "SELECT FROM TRACK CREDITS:")}
								</Text>
								<Flex wrap="wrap" gap="1">
									{availableWriters.map((name) => {
										const isSelected = writerInput === name;
										return (
											<Button
												key={name}
												size="1"
												variant={isSelected ? "solid" : "soft"}
												color={isSelected ? "red" : "gray"}
												onClick={() => setWriterInput(name)}
												style={{ cursor: "pointer" }}
											>
												{name}
											</Button>
										);
									})}
								</Flex>
							</Box>
						)}
						<Text size="1" color="gray" weight="bold" mb="1" as="div">
							{t("ttmlReview.writerName", "WRITER NAME:")}
						</Text>
						<TextField.Root
							size="2"
							value={writerInput}
							onChange={(e) => setWriterInput(e.target.value)}
							placeholder={t(
								"ttmlReview.writerNamePlaceholder",
								"Enter writer name (e.g. Max Martin)...",
							)}
							style={{ fontFamily: "var(--editor-font-family, inherit)" }}
						/>
					</Box>
				)}

				{/* Word / Section Range Selector (lines only) */}
				{!isWriter && lineWords && lineWords.length > 1 && (
					<Box mb="3">
						<Flex justify="between" align="center" mb="1">
							<Text size="1" color="gray" weight="bold">
								{t("ttmlReview.selectSection", "SECTION OF LINE TO FLAG:")}
							</Text>
							<Button
								size="1"
								variant="ghost"
								color="gray"
								onClick={() => {
									setRangeStart(0);
									setRangeEnd(lineWords.length - 1);
								}}
							>
								{t("ttmlReview.entireLine", "Entire Line")}
							</Button>
						</Flex>
						<Text size="1" color="gray" mb="2" style={{ display: "block", fontSize: 11 }}>
							{t("ttmlReview.sectionHelper", "Click words to extend or narrow the flagged phrase.")}
						</Text>
						<Flex
							wrap="wrap"
							gap="1"
							p="2"
							style={{
								backgroundColor: "var(--gray-a2)",
								borderRadius: "var(--radius-3)",
								border: "1px solid var(--gray-a4)",
							}}
						>
							{lineWords.map((w, idx) => {
								const isSpace =
									w.word.length > 0 && w.word.trim().length === 0;
								if (isSpace) {
									return (
										<span
											key={w.id || idx}
											style={{
												display: "inline-block",
												width: "6px",
											}}
										/>
									);
								}
								const inRange = idx >= rangeStart && idx <= rangeEnd;
								return (
									<Button
										key={w.id || idx}
										size="1"
										variant={inRange ? "solid" : "soft"}
										color={inRange ? "red" : "gray"}
										style={{
											cursor: "pointer",
											fontFamily: "var(--editor-font-family, inherit)",
											whiteSpace: "pre-wrap",
										}}
										onClick={() => {
											if (rangeStart === idx && rangeEnd === idx) {
												return;
											}
											if (idx < rangeStart) {
												setRangeStart(idx);
											} else if (idx > rangeEnd) {
												setRangeEnd(idx);
											} else {
												setRangeStart(idx);
												setRangeEnd(idx);
											}
										}}
									>
										{w.word}
									</Button>
								);
							})}
						</Flex>
					</Box>
				)}

				{/* Quoted lyric snippet */}
				<Card
					variant="classic"
					mb="3"
					style={{
						padding: "10px 14px",
						borderLeft: "3px solid var(--red-9)",
						backgroundColor: "var(--gray-a2)",
					}}
				>
					<Text
						size="2"
						weight="medium"
						style={{
							fontStyle: "italic",
							fontFamily: "var(--editor-font-family, inherit)",
						}}
					>
						"{currentQuoted}"
					</Text>
				</Card>

				<Flex direction="column" gap="3">
					{/* Template categories */}
					<Box>
						<Text size="1" color="gray" weight="bold" mb="2" as="div">
							{t("ttmlReview.whatIsWrong", "WHAT'S WRONG?")}
						</Text>
						<Flex wrap="wrap" gap="2">
							{(isWriter ? WRITER_CATEGORIES : BUILTIN_CATEGORIES).map((cat) => {
								const isSelected = tpl === cat;
								return (
									<Button
										key={cat}
										size="2"
										variant={isSelected ? "solid" : "soft"}
										color={isSelected ? "red" : "gray"}
										onClick={() => handleCategoryClick(cat)}
										style={{ cursor: "pointer" }}
									>
										{CATEGORY_ICONS[cat]}
										{cat}
									</Button>
								);
							})}
						</Flex>
					</Box>

					{/* Custom presets if any */}
					{presets.length > 0 && (
						<Box>
							<Text size="1" color="gray" weight="bold" mb="2" as="div">
								{t("ttmlReview.yourPresets", "YOUR PRESETS")}
							</Text>
							<Flex wrap="wrap" gap="2">
								{presets.map((preset) => {
									const isSelected = tpl === preset.name;
									return (
										<Flex
											key={preset.name}
											align="center"
											style={{
												backgroundColor: isSelected
													? "var(--red-9)"
													: "var(--gray-a3)",
												color: isSelected ? "#fff" : "var(--gray-12)",
												borderRadius: "var(--radius-3)",
												padding: "4px 8px 4px 10px",
												cursor: "pointer",
											}}
											onClick={() => handleCategoryClick(preset.name)}
										>
											<Text size="2" weight="medium" mr="2">
												{preset.name}
											</Text>
											<IconButton
												size="1"
												variant="ghost"
												color={isSelected ? "gray" : "gray"}
												onClick={(e) => handleDeletePreset(preset.name, e)}
												style={{
													color: isSelected ? "#fff" : "inherit",
													opacity: 0.7,
												}}
											>
												<Dismiss16Regular />
											</IconButton>
										</Flex>
									);
								})}
							</Flex>
						</Box>
					)}

					{/* Timing specific parameters */}
					{!isWriter && tpl === "Timing" && (
						<Card
							variant="surface"
							style={{ padding: 12, backgroundColor: "var(--gray-a2)" }}
						>
							<Flex direction="column" gap="3">
								<Flex justify="between" align="center">
									<Text size="1" weight="medium" color="gray">
										{t("ttmlReview.timingPart", "Which part:")}
									</Text>
									<SegmentedControl.Root
										size="1"
										value={where}
										onValueChange={(val) =>
											handleTimingChange(val as TimingWhere, when)
										}
									>
										<SegmentedControl.Item value="sync">
											{TIMING_WHERE_LABELS.sync}
										</SegmentedControl.Item>
										<SegmentedControl.Item value="start">
											{TIMING_WHERE_LABELS.start}
										</SegmentedControl.Item>
										<SegmentedControl.Item value="end">
											{TIMING_WHERE_LABELS.end}
										</SegmentedControl.Item>
									</SegmentedControl.Root>
								</Flex>

								<Flex justify="between" align="center">
									<Text size="1" weight="medium" color="gray">
										{t("ttmlReview.timingDirection", "Direction:")}
									</Text>
									<SegmentedControl.Root
										size="1"
										value={when}
										onValueChange={(val) =>
											handleTimingChange(where, val as TimingWhen)
										}
									>
										<SegmentedControl.Item value="early">
											{TIMING_WHEN_LABELS.early}
										</SegmentedControl.Item>
										<SegmentedControl.Item value="late">
											{TIMING_WHEN_LABELS.late}
										</SegmentedControl.Item>
									</SegmentedControl.Root>
								</Flex>
							</Flex>
						</Card>
					)}

					{/* Note textarea */}
					<Box>
						<Text size="1" color="gray" weight="bold" mb="1" as="div">
							{t("ttmlReview.noteLabel", "NOTE / INSTRUCTIONS")}
						</Text>
						<TextArea
							rows={3}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder={t(
								"ttmlReview.notePlaceholder",
								"How should this be fixed?",
							)}
							style={{ width: "100%", fontSize: 13 }}
						/>
					</Box>

					{/* Save as preset input */}
					{isAddingPreset ? (
						<Flex gap="2" align="center">
							<TextField.Root
								size="1"
								placeholder={t("ttmlReview.presetName", "Preset name...")}
								value={newPresetName}
								onChange={(e) => setNewPresetName(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleSaveAsPreset()}
								style={{ flex: 1 }}
							/>
							<Button size="1" variant="solid" onClick={handleSaveAsPreset}>
								{t("common.add", "Add")}
							</Button>
							<Button
								size="1"
								variant="soft"
								color="gray"
								onClick={() => setIsAddingPreset(false)}
							>
								{t("common.cancel", "Cancel")}
							</Button>
						</Flex>
					) : (
						<Button
							size="1"
							variant="ghost"
							color="gray"
							style={{ alignSelf: "flex-start" }}
							onClick={() => setIsAddingPreset(true)}
						>
							<Star16Regular />
							{t("ttmlReview.saveAsPreset", "Save this note as a preset")}
						</Button>
					)}
				</Flex>

				<Flex justify="between" align="center" mt="4">
					{initialFlag?.id && onDelete ? (
						<Button
							color="red"
							variant="soft"
							size="2"
							onClick={() => {
								onDelete(initialFlag.id!);
								onClose();
							}}
						>
							<Delete16Regular />
							{t("common.delete", "Delete")}
						</Button>
					) : (
						<Box />
					)}
					<Flex gap="2">
						<Button variant="soft" color="gray" size="2" onClick={onClose}>
							{t("common.cancel", "Cancel")}
						</Button>
						<Button variant="solid" color="red" size="2" onClick={handleSave}>
							{initialFlag?.id
								? t("common.save", "Save")
								: t("ttmlReview.raiseFlag", "Raise Flag")}
						</Button>
					</Flex>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};
