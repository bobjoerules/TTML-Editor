import {
	ArrowLeftRegular,
	ArrowRightRegular,
	SubtractRegular,
	AddRegular,
} from "@fluentui/react-icons";
import {
	Button,
	Checkbox,
	Dialog,
	Flex,
	IconButton,
	RadioGroup,
	Text,
	TextField,
	Slider,
	Box,
} from "@radix-ui/themes";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useSetImmerAtom } from "jotai-immer";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { audioEngine } from "$/modules/audio/audio-engine";
import { audioBufferAtom } from "$/modules/audio/states";
import {
	timeShiftDialogAtom,
	timeShiftPreviewOffsetAtom,
	timeShiftPreviewActiveAtom,
	timeShiftPreviewScopeAtom,
	timeShiftPreviewCustomRangeAtom,
} from "$/states/dialogs.ts";
import { lyricLinesAtom, selectedLinesAtom } from "$/states/main.ts";

type ShiftDirection = "delay" | "advance";
type ShiftScope = "all" | "selected" | "selected-following" | "custom";

export const TimeShiftDialog = () => {
	const { t } = useTranslation();
	const [open, setOpen] = useAtom(timeShiftDialogAtom);
	const lyricLines = useAtomValue(lyricLinesAtom);
	const selectedLines = useAtomValue(selectedLinesAtom);
	const setLyricLines = useSetImmerAtom(lyricLinesAtom);

	const setPreviewOffset = useSetAtom(timeShiftPreviewOffsetAtom);
	const setPreviewActive = useSetAtom(timeShiftPreviewActiveAtom);
	const setPreviewScope = useSetAtom(timeShiftPreviewScopeAtom);
	const setPreviewRange = useSetAtom(timeShiftPreviewCustomRangeAtom);

	const [offsetStr, setOffsetStr] = useState("0");
	const [direction, setDirection] = useState<ShiftDirection>("delay");
	const [scope, setScope] = useState<ShiftScope>("all");
	const [shiftAudio, setShiftAudio] = useState(false);
	const [customStart, setCustomStart] = useState("1");
	const [customEnd, setCustomEnd] = useState("1");

	const hasAudio = useAtomValue(audioBufferAtom) !== null;
	const hasSelection = selectedLines.size > 0;
	const totalLines = lyricLines.lyricLines.length;

	const currentOffset = useMemo(() => {
		const val = Number.parseInt(offsetStr, 10);
		return Number.isNaN(val) ? 0 : val;
	}, [offsetStr]);

	const finalOffset = useMemo(() => {
		return direction === "delay" ? currentOffset : -currentOffset;
	}, [currentOffset, direction]);

	// Sync with preview atoms
	useEffect(() => {
		if (open) {
			setPreviewActive(true);
			setPreviewOffset(finalOffset);
			setPreviewScope(scope);
			setPreviewRange([parseInt(customStart, 10), parseInt(customEnd, 10)]);
		} else {
			setPreviewActive(false);
			setPreviewOffset(0);
		}
	}, [
		open,
		finalOffset,
		scope,
		customStart,
		customEnd,
		setPreviewActive,
		setPreviewOffset,
		setPreviewScope,
		setPreviewRange,
	]);

	const adjustOffset = (delta: number) => {
		setOffsetStr(Math.max(0, currentOffset + delta).toString());
	};

	useEffect(() => {
		if (open) {
			if (hasSelection) {
				setScope("selected");
			} else {
				setScope("all");
			}
			setShiftAudio(false);
			setCustomEnd(totalLines.toString());
			setOffsetStr("0");
		}
	}, [open, hasSelection, totalLines]);

	const handleToggleShiftAudio = (checked: boolean) => {
		setShiftAudio(checked);
		if (checked) {
			setScope("all");
		}
	};

	const handleConfirm = () => {
		if (finalOffset === 0) {
			setOpen(false);
			return;
		}

		const targetLineIndices = new Set<number>();

		if (scope === "all") {
			for (let i = 0; i < totalLines; i++) targetLineIndices.add(i);
		} else if (scope === "selected") {
			lyricLines.lyricLines.forEach((line, index) => {
				if (selectedLines.has(line.id)) {
					targetLineIndices.add(index);
				}
			});
		} else if (scope === "selected-following") {
			let firstSelectedIndex = -1;
			lyricLines.lyricLines.forEach((line, index) => {
				if (selectedLines.has(line.id)) {
					if (firstSelectedIndex === -1 || index < firstSelectedIndex) {
						firstSelectedIndex = index;
					}
				}
			});
			if (firstSelectedIndex !== -1) {
				for (let i = firstSelectedIndex; i < totalLines; i++) {
					targetLineIndices.add(i);
				}
			}
		} else if (scope === "custom") {
			const start = parseInt(customStart, 10);
			const end = parseInt(customEnd, 10);
			if (!Number.isNaN(start) && !Number.isNaN(end)) {
				for (
					let i = Math.max(0, start - 1);
					i < Math.min(totalLines, end);
					i++
				) {
					targetLineIndices.add(i);
				}
			}
		}

		setLyricLines((draft) => {
			draft.lyricLines.forEach((line, index) => {
				if (targetLineIndices.has(index)) {
					line.startTime = Math.max(0, line.startTime + finalOffset);
					line.endTime = Math.max(0, line.endTime + finalOffset);

					line.words.forEach((word) => {
						word.startTime = Math.max(0, word.startTime + finalOffset);
						word.endTime = Math.max(0, word.endTime + finalOffset);
						if (word.ruby && word.ruby.length > 0) {
							word.ruby.forEach((rubyWord) => {
								rubyWord.startTime = Math.max(
									0,
									rubyWord.startTime + finalOffset,
								);
								rubyWord.endTime = Math.max(0, rubyWord.endTime + finalOffset);
							});
						}
					});
				}
			});
		});

		if (shiftAudio && hasAudio) {
			void audioEngine.shiftMusic(finalOffset / 1000);
		}

		setOpen(false);
	};

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Content maxWidth="450px">
				<Dialog.Title>{t("timeShiftDialog.title", "Shift Time")}</Dialog.Title>
				<Flex direction="column" gap="4">
					<Flex direction="column" gap="2">
						<Text size="2" weight="bold">
							{t("timeShiftDialog.amount", "Offset (ms)")}
						</Text>
						<Flex gap="3" align="center">
							<Flex gap="1">
								<IconButton
									variant="soft"
									onClick={() => adjustOffset(-100)}
									title="- 100ms"
								>
									<ArrowLeftRegular />
								</IconButton>
								<IconButton
									variant="soft"
									onClick={() => adjustOffset(-10)}
									title="- 10ms"
								>
									<SubtractRegular />
								</IconButton>
							</Flex>
							<TextField.Root
								type="number"
								min="0"
								value={offsetStr}
								onChange={(e) => setOffsetStr(e.target.value)}
								placeholder="0"
								style={{ flexGrow: 1 }}
							/>
							<Flex gap="1">
								<IconButton
									variant="soft"
									onClick={() => adjustOffset(10)}
									title="+ 10ms"
								>
									<AddRegular />
								</IconButton>
								<IconButton
									variant="soft"
									onClick={() => adjustOffset(100)}
									title="+ 100ms"
								>
									<ArrowRightRegular />
								</IconButton>
							</Flex>
						</Flex>
						<Box px="1" mt="1">
							<Slider
								min={0}
								max={2000}
								step={10}
								value={[currentOffset]}
								onValueChange={(v) => setOffsetStr(v[0].toString())}
							/>
						</Box>
					</Flex>

					<Flex direction="column" gap="1">
						<Text size="2" weight="bold">
							{t("timeShiftDialog.direction", "Direction")}
						</Text>
						<RadioGroup.Root
							value={direction}
							onValueChange={(v) => setDirection(v as ShiftDirection)}
							style={{ flexDirection: "row", gap: "16px" }}
						>
							<RadioGroup.Item value="advance">
								{t("timeShiftDialog.advance", "Earlier (-)")}
							</RadioGroup.Item>
							<RadioGroup.Item value="delay">
								{t("timeShiftDialog.delay", "Later (+)")}
							</RadioGroup.Item>
						</RadioGroup.Root>
					</Flex>

					<Flex direction="column" gap="2">
						<Text size="2" weight="bold">
							{t("timeShiftDialog.scopeLabel", "Apply to")}
						</Text>
						<RadioGroup.Root
							value={scope}
							onValueChange={(v) => setScope(v as ShiftScope)}
						>
							<RadioGroup.Item value="all">
								{t("timeShiftDialog.scope.all", "All lines")}
							</RadioGroup.Item>

							<RadioGroup.Item
								value="selected"
								disabled={!hasSelection || shiftAudio}
							>
								{t("timeShiftDialog.scope.selected", "Selected lines")}
								{hasSelection && ` (${selectedLines.size})`}
							</RadioGroup.Item>

							<RadioGroup.Item
								value="selected-following"
								disabled={!hasSelection || shiftAudio}
							>
								{t(
									"timeShiftDialog.scope.selectedFollowing",
									"Selected lines and following",
								)}
							</RadioGroup.Item>

							<RadioGroup.Item value="custom" disabled={shiftAudio}>
								{t("timeShiftDialog.scope.custom", "Custom range")}
							</RadioGroup.Item>
						</RadioGroup.Root>
					</Flex>

					{scope === "custom" && !shiftAudio && (
						<Flex align="center" gap="2" ml="4">
							<Text size="2">{t("timeShiftDialog.fromLine", "From line")}</Text>
							<TextField.Root
								style={{ width: "60px" }}
								size="1"
								type="number"
								value={customStart}
								onChange={(e) => setCustomStart(e.target.value)}
							/>
							<Text size="2">{t("timeShiftDialog.toLine", "to")}</Text>
							<TextField.Root
								style={{ width: "60px" }}
								size="1"
								type="number"
								value={customEnd}
								onChange={(e) => setCustomEnd(e.target.value)}
							/>
							<Text size="2">{t("timeShiftDialog.line", "line")}</Text>
						</Flex>
					)}

					<Flex direction="column" gap="1">
						<Text as="label" size="2">
							<Flex gap="2" align="center">
								<Checkbox
									checked={shiftAudio}
									disabled={!hasAudio}
									onCheckedChange={(checked) =>
										handleToggleShiftAudio(checked === true)
									}
								/>
								{t("timeShiftDialog.shiftAudio", "Shift audio with lyrics")}
							</Flex>
						</Text>
						<Text size="1" color="gray">
							{hasAudio
								? t(
										"timeShiftDialog.shiftAudioHint",
										"Shifts all lyrics and adjusts the loaded audio in the app (adds silence for Later, trims start for Earlier).",
									)
								: t(
										"timeShiftDialog.shiftAudioNoAudio",
										"Load an audio file to shift audio along with lyrics.",
									)}
						</Text>
					</Flex>
				</Flex>

				<Flex gap="3" mt="5" justify="end">
					<Dialog.Close>
						<Button variant="soft" color="gray">
							{t("common.cancel", "Cancel")}
						</Button>
					</Dialog.Close>
					<Button onClick={handleConfirm}>{t("common.apply", "Apply")}</Button>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};
