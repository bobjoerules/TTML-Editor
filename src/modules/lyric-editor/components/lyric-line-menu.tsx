import { ContextMenu, Flex } from "@radix-ui/themes";
import { atom, useAtomValue, useSetAtom, useStore } from "jotai";
import { selectAtom } from "jotai/utils";
import { useSetImmerAtom } from "jotai-immer";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { lyricLinesAtom, selectedLinesAtom } from "$/states/main";
import {
	formatVoiceLabel,
	getLineVoice,
	getVoiceColor,
	type LyricLine,
	newLyricLine,
	newLyricWord,
	normalizeVoice,
} from "$/types/ttml";
import {
	globalEnableInsertAtom,
	timingCopyPlacementAtom,
} from "./lyric-line-view-states";
import { mergeLyricLines } from "../utils/merge-lines";
import { MergeLineDialog } from "../modals/MergeLineDialog";
import { repairSectionIntegrity } from "../utils/section-system";
import {
	copiedLyricLinesAtom,
	copySelectedLines,
	pasteLinesBelowSelected,
} from "../utils/line-clipboard";

const selectedLinesSizeAtom = atom((get) => get(selectedLinesAtom).size);
const totalLinesAtom = selectAtom(
	lyricLinesAtom,
	(state) => state.lyricLines.length,
);

export const LyricLineMenu = ({ lineIndex }: { lineIndex: number }) => {
	const { t } = useTranslation();
	const store = useStore();
	const setGlobalEnableInsert = useSetAtom(globalEnableInsertAtom);
	const setTimingCopyPlacement = useSetAtom(timingCopyPlacementAtom);

	const selectedLinesSize = useAtomValue(selectedLinesSizeAtom);
	const selectedLines = useAtomValue(selectedLinesAtom);
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const totalLines = useAtomValue(totalLinesAtom);
	const copiedLyricLines = useAtomValue(copiedLyricLinesAtom);
	const hasCopiedLines = (copiedLyricLines?.length ?? 0) > 0;

	const [mergePickerOpen, setMergePickerOpen] = React.useState(false);

	const [Bgchecked, setBgChecked] = React.useState(() => {
		const lines = store.get(lyricLinesAtom).lyricLines;
		const selected = store.get(selectedLinesAtom);
		const selectedLineObjs = lines.filter((line) => selected.has(line.id));
		if (selectedLineObjs.length === 0) {
			const cur = lines[lineIndex];
			return cur?.isBG ?? false;
		}
		if (selectedLineObjs.every((line) => line.isBG)) return true;
		else if (selectedLineObjs.every((line) => !line.isBG)) return false;
		else return "indeterminate" as const;
	});
	const [DuetChecked, setDuetChecked] = React.useState(() => {
		const lines = store.get(lyricLinesAtom).lyricLines;
		const selected = store.get(selectedLinesAtom);
		const selectedLineObjs = lines.filter((line) => selected.has(line.id));
		if (selectedLineObjs.length === 0) {
			const cur = lines[lineIndex];
			return cur?.isDuet ?? false;
		}
		if (selectedLineObjs.every((line) => line.isDuet)) return true;
		else if (selectedLineObjs.every((line) => !line.isDuet)) return false;
		else return "indeterminate" as const;
	});

	const currentVoice = React.useMemo(() => {
		const lines = store.get(lyricLinesAtom).lyricLines;
		const selected = store.get(selectedLinesAtom);
		const selectedLineObjs = lines.filter((line) => selected.has(line.id));
		if (selectedLineObjs.length === 0) {
			const cur = lines[lineIndex];
			return cur ? getLineVoice(cur) : "v1";
		}
		const firstVoice = getLineVoice(selectedLineObjs[0]);
		if (selectedLineObjs.every((l) => getLineVoice(l) === firstVoice)) {
			return firstVoice;
		}
		return "mixed";
	}, [store, lineIndex]);

	const availableVoices = React.useMemo(() => {
		const lines = store.get(lyricLinesAtom).lyricLines;
		const voiceSet = new Set<string>(["v1", "v2", "v3", "v4"]);
		for (const l of lines) {
			voiceSet.add(getLineVoice(l));
		}
		return Array.from(voiceSet).sort((a, b) => {
			const numA = parseInt(a.replace(/\D/g, "") || "1", 10);
			const numB = parseInt(b.replace(/\D/g, "") || "1", 10);
			return numA - numB;
		});
	}, [store]);

	function setVoice(voice: string) {
		const norm = normalizeVoice(voice);
		const isDuet = norm !== "v1";
		setDuetChecked(isDuet);
		editLyricLines((state) => {
			const targetIds =
				selectedLines.size > 0
					? selectedLines
					: new Set([state.lyricLines[lineIndex]?.id]);
			for (const line of state.lyricLines) {
				if (targetIds.has(line.id)) {
					line.agent = norm;
					line.isDuet = isDuet;
				}
			}
		});
	}

	function bgOnCheck(checked: boolean) {
		setBgChecked(checked);
		editLyricLines((state) => {
			const lines = state.lyricLines.filter((line) =>
				selectedLines.has(line.id),
			);
			for (const line of lines) line.isBG = checked;
		});
	}

	function duetOnCheck(checked: boolean) {
		setDuetChecked(checked);
		editLyricLines((state) => {
			const targetIds =
				selectedLines.size > 0
					? selectedLines
					: new Set([state.lyricLines[lineIndex]?.id]);
			for (const line of state.lyricLines) {
				if (targetIds.has(line.id)) {
					line.isDuet = checked;
					line.agent = checked
						? line.agent && line.agent !== "v1"
							? line.agent
							: "v2"
						: "v1";
				}
			}
		});
	}

	function mergeWithPrevious() {
		if (lineIndex <= 0) return;
		editLyricLines((state) => {
			const prevLine = state.lyricLines[lineIndex - 1];
			const curLine = state.lyricLines[lineIndex];
			if (!prevLine || !curLine) return;
			const merged = mergeLyricLines([prevLine, curLine]);
			if (!merged) return;
			state.lyricLines.splice(lineIndex, 1);
			state.lyricLines.splice(lineIndex - 1, 1, merged);
		});
	}

	function mergeWithNext() {
		if (lineIndex >= totalLines - 1) return;
		editLyricLines((state) => {
			const curLine = state.lyricLines[lineIndex];
			const nextLine = state.lyricLines[lineIndex + 1];
			if (!curLine || !nextLine) return;
			const merged = mergeLyricLines([curLine, nextLine]);
			if (!merged) return;
			state.lyricLines.splice(lineIndex + 1, 1);
			state.lyricLines.splice(lineIndex, 1, merged);
		});
	}

	function mergeSelectedLines() {
		if (selectedLinesSize < 2) return;
		editLyricLines((state) => {
			const selectedIdxs = state.lyricLines
				.map((line, idx) => (selectedLines.has(line.id) ? idx : -1))
				.filter((idx) => idx !== -1)
				.sort((a, b) => a - b);
			if (selectedIdxs.length < 2) return;

			const targetLines = selectedIdxs.map((idx) => state.lyricLines[idx]);
			const merged = mergeLyricLines(targetLines);
			if (!merged) return;

			const firstIdx = selectedIdxs[0];
			for (let i = selectedIdxs.length - 1; i >= 1; i--) {
				state.lyricLines.splice(selectedIdxs[i], 1);
			}
			state.lyricLines.splice(firstIdx, 1, merged);
		});
	}

	function handleCopyLines() {
		const targetLine = store.get(lyricLinesAtom).lyricLines[lineIndex];
		copySelectedLines(store, targetLine?.id);
	}

	function handlePasteLines() {
		const targetLine = store.get(lyricLinesAtom).lyricLines[lineIndex];
		pasteLinesBelowSelected(store, editLyricLines, targetLine?.id);
	}

	return (
		<>
			{mergePickerOpen && (
				<MergeLineDialog
					sourceLineIndex={lineIndex}
					open={mergePickerOpen}
					onOpenChange={setMergePickerOpen}
				/>
			)}
			<ContextMenu.CheckboxItem checked={Bgchecked} onCheckedChange={bgOnCheck}>
				{t("contextMenu.bgLyric", "Background Lyric")}
			</ContextMenu.CheckboxItem>
			<ContextMenu.CheckboxItem
				checked={DuetChecked}
				onCheckedChange={duetOnCheck}
			>
				{t("contextMenu.duetLyric", "Duet Lyric")}
			</ContextMenu.CheckboxItem>
			<ContextMenu.Sub>
				<ContextMenu.SubTrigger>
					{t("contextMenu.voice", "Voice / Singer")}
				</ContextMenu.SubTrigger>
				<ContextMenu.SubContent>
					{availableVoices.map((voice) => (
						<ContextMenu.CheckboxItem
							key={voice}
							checked={currentVoice === voice}
							onSelect={() => setVoice(voice)}
						>
							<Flex align="center" gap="2">
								<span
									style={{
										width: 8,
										height: 8,
										borderRadius: "50%",
										backgroundColor: getVoiceColor(voice),
										display: "inline-block",
									}}
								/>
								{formatVoiceLabel(voice)}
							</Flex>
						</ContextMenu.CheckboxItem>
					))}
					<ContextMenu.Separator />
					<ContextMenu.Item
						onSelect={() => {
							const input = window.prompt(
								t(
									"contextMenu.enterVoicePrompt",
									"Enter voice ID (v1 to v1000):",
								),
								currentVoice !== "mixed" ? currentVoice : "v3",
							);
							if (input) {
								setVoice(input);
							}
						}}
					>
						{t("contextMenu.customVoice", "Custom Voice (v#)...")}
					</ContextMenu.Item>
				</ContextMenu.SubContent>
			</ContextMenu.Sub>
			<ContextMenu.Separator />
			<ContextMenu.Item
				onSelect={() => {
					editLyricLines((state) => {
						const cur = state.lyricLines[lineIndex];
						const newLine = newLyricLine();
						if (cur?.sectionId) newLine.sectionId = cur.sectionId;
						if (cur?.geniusHeader) newLine.geniusHeader = cur.geniusHeader;
						state.lyricLines.splice(lineIndex, 0, newLine);
						repairSectionIntegrity(state);
					});
				}}
			>
				{t("contextMenu.insertLineBefore", "Insert Empty Line Before")}
			</ContextMenu.Item>
			<ContextMenu.Item
				onSelect={() => {
					editLyricLines((state) => {
						const cur = state.lyricLines[lineIndex];
						const newLine = newLyricLine();
						if (cur?.sectionId) newLine.sectionId = cur.sectionId;
						if (cur?.geniusHeader) newLine.geniusHeader = cur.geniusHeader;
						state.lyricLines.splice(lineIndex + 1, 0, newLine);
						repairSectionIntegrity(state);
					});
				}}
			>
				{t("contextMenu.insertLineAfter", "Insert Empty Line After")}
			</ContextMenu.Item>
			<ContextMenu.Item
				onSelect={handleCopyLines}
				disabled={
					selectedLinesSize === 0 &&
					!store.get(lyricLinesAtom).lyricLines[lineIndex]
				}
			>
				{t("contextMenu.copyLine", {
					count: Math.max(1, selectedLinesSize),
					defaultValue:
						selectedLinesSize > 1
							? `Copy ${selectedLinesSize} Lines`
							: "Copy Line",
				})}
			</ContextMenu.Item>
			<ContextMenu.Item
				onSelect={handlePasteLines}
				disabled={!hasCopiedLines}
			>
				{t("contextMenu.pasteLineBelow", "Paste Line Below")}
			</ContextMenu.Item>
			<ContextMenu.Item
				onSelect={() => {
					setTimingCopyPlacement(null);
					setGlobalEnableInsert(true);
				}}
				disabled={selectedLinesSize === 0}
			>
				{t("contextMenu.duplicateTo", "Duplicate to...")}
			</ContextMenu.Item>
			<ContextMenu.Separator />
			<ContextMenu.Sub>
				<ContextMenu.SubTrigger>
					{t("contextMenu.mergeLine", "Merge line")}
				</ContextMenu.SubTrigger>
				<ContextMenu.SubContent>
					<ContextMenu.Item
						onSelect={mergeWithPrevious}
						disabled={lineIndex <= 0}
					>
						{t("contextMenu.mergeWithPrevious", "Merge with previous line")}
					</ContextMenu.Item>
					<ContextMenu.Item
						onSelect={mergeWithNext}
						disabled={lineIndex >= totalLines - 1}
					>
						{t("contextMenu.mergeWithNext", "Merge with next line")}
					</ContextMenu.Item>
					<ContextMenu.Item
						onSelect={() => setMergePickerOpen(true)}
						disabled={totalLines <= 1}
					>
						{t("contextMenu.mergeWithAnother", "Merge with another line…")}
					</ContextMenu.Item>
					{selectedLinesSize >= 2 && (
						<ContextMenu.Item onSelect={mergeSelectedLines}>
							{t("contextMenu.mergeSelectedLines", {
								count: selectedLinesSize,
								defaultValue: `Merge ${selectedLinesSize} selected lines`,
							})}
						</ContextMenu.Item>
					)}
				</ContextMenu.SubContent>
			</ContextMenu.Sub>
			<ContextMenu.Separator />
			<ContextMenu.Item
				onSelect={() => {
					editLyricLines((state) => {
						if (selectedLinesSize === 0) {
							state.lyricLines.splice(lineIndex, 1);
						} else {
							state.lyricLines = state.lyricLines.filter(
								(line) => !selectedLines.has(line.id),
							);
						}
						repairSectionIntegrity(state);
					});
				}}
			>
				{t("contextMenu.deleteLine", {
					count: selectedLinesSize,
					defaultValue: "Delete Line",
				})}
			</ContextMenu.Item>
		</>
	);
};
