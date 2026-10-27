import { CheckmarkCircle24Filled } from "@fluentui/react-icons";
import {
	Badge,
	Box,
	Button,
	Flex,
	Text,
	TextField,
	Tooltip,
} from "@radix-ui/themes";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSuggestedTtmlFileName } from "$/modules/project/logic/metadata-filename";
import { confirmDialogAtom } from "$/states/dialogs";
import {
	lyricLinesAtom,
	saveFileNameAtom,
} from "$/states/main";
import { useSyncProgress } from "$/hooks/useSyncProgress";

export const getProgressBadgeColor = (
	percent: number,
): "red" | "orange" | "yellow" | "green" => {
	if (percent >= 75) return "green";
	if (percent >= 50) return "yellow";
	if (percent >= 25) return "orange";
	return "red";
};

export const HeaderFileInfo = () => {
	const { t } = useTranslation();
	const syncProgress = useSyncProgress();
	const [filename, setFilename] = useAtom(saveFileNameAtom);
	const setConfirmDialog = useSetAtom(confirmDialogAtom);
	const metadata = useAtomValue(lyricLinesAtom).metadata;
	const [isEditing, setIsEditing] = useState(false);
	const [draftName, setDraftName] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const suffix = ".ttml";
	const suggestedFile = getSuggestedTtmlFileName(metadata);

	const getBaseName = useCallback(
		(value: string) =>
			value.toLowerCase().endsWith(suffix)
				? value.slice(0, -suffix.length)
				: value,
		[],
	);

	const finishEditing = useCallback(
		({ commit }: { commit: boolean }) => {
			if (commit) {
				const trimmed = draftName.trim();
				if (trimmed.length > 0) {
					setFilename(`${trimmed}${suffix}`);
				} else {
					setDraftName(getBaseName(filename));
				}
			}
			setIsEditing(false);
		},
		[draftName, filename, getBaseName, setFilename],
	);

	useEffect(() => {
		if (!isEditing) return;
		setDraftName(getBaseName(filename));
		inputRef.current?.focus();
		inputRef.current?.select();
	}, [filename, getBaseName, isEditing]);



	const handleNameClick = useCallback(() => {
		const isDefaultName =
			filename.toLowerCase() === "unnamed.ttml" ||
			filename.toLowerCase() === "lyric.ttml";
		if (isDefaultName && suggestedFile) {
			setConfirmDialog({
				open: true,
				title: t("confirmDialog.useMetadataName.title", "Use metadata name?"),
				description: t(
					"confirmDialog.useMetadataName.description",
					'Use "{name}" as file name?',
					{ name: suggestedFile.baseName },
				),
				onConfirm: () => {
					setFilename(suggestedFile.fileName);
				},
			});
			return;
		}
		setIsEditing(true);
	}, [filename, setConfirmDialog, setFilename, suggestedFile, t]);

	return (
		<Flex
			align="center"
			gap="2"
			style={{ maxWidth: "100%", minWidth: 0, flexShrink: 1 }}
		>


			<Box style={{ minWidth: 0, flexShrink: 1 }}>
				{isEditing ? (
					<Flex align="center" gap="1">
						<TextField.Root
							ref={inputRef}
							size="1"
							value={draftName}
							onChange={(e) => setDraftName(e.target.value)}
							placeholder="example"
							style={{ width: "clamp(10rem, 25vw, 24rem)", minWidth: 0 }}
							onBlur={() => finishEditing({ commit: true })}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									finishEditing({ commit: true });
								}
								if (event.key === "Escape") {
									finishEditing({ commit: false });
								}
							}}
						/>
						<Text size="2" style={{ flexShrink: 0 }}>
							{suffix}
						</Text>
					</Flex>
				) : (
					<Tooltip content={filename}>
						<Button
							variant="ghost"
							style={{
								height: "auto",
								padding: "6px 10px",
								fontWeight: "normal",
								color: "var(--accent-11)",
								maxWidth: "100%",
								minWidth: 0,
							}}
							onClick={handleNameClick}
						>
							<Flex
								align="center"
								gap="2"
								style={{ maxWidth: "100%", minWidth: 0 }}
							>
								<Flex
									align="center"
									style={{
										maxWidth: "clamp(6rem, 36vw, 42rem)",
										minWidth: 0,
										overflow: "hidden",
										whiteSpace: "nowrap",
									}}
								>
									<Text
										weight="bold"
										size="2"
										style={{
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
											minWidth: 0,
										}}
									>
										{getBaseName(filename)}
									</Text>
									<Text size="2" style={{ flexShrink: 0 }}>
										{suffix}
									</Text>
								</Flex>
							</Flex>
						</Button>
					</Tooltip>
				)}
			</Box>

			{syncProgress.hasLyrics && (
				<Badge
					size="1"
					variant="surface"
					color={getProgressBadgeColor(syncProgress.linePercent)}
					style={{
						cursor: "default",
						fontWeight: 600,
						display: "flex",
						alignItems: "center",
						gap: "3px",
						padding: "2px 7px",
						borderRadius: "12px",
					}}
				>
					{syncProgress.linePercent === 100 ? (
						<CheckmarkCircle24Filled
							style={{
								width: "12px",
								height: "12px",
								color: "var(--green-9)",
							}}
						/>
					) : (
						<svg
							width="12"
							height="12"
							viewBox="0 0 16 16"
							style={{ transform: "rotate(-90deg)", flexShrink: 0 }}
						>
							<circle
								cx="8"
								cy="8"
								r="6"
								stroke="var(--gray-a6)"
								strokeWidth="2.4"
								fill="none"
							/>
							<circle
								cx="8"
								cy="8"
								r="6"
								stroke="currentColor"
								strokeWidth="2.4"
								fill="none"
								strokeDasharray={2 * Math.PI * 6}
								strokeDashoffset={
									2 * Math.PI * 6 * (1 - syncProgress.linePercent / 100)
								}
								strokeLinecap="round"
								style={{ transition: "stroke-dashoffset 0.3s ease" }}
							/>
						</svg>
					)}
					<span>{syncProgress.linePercent}%</span>
				</Badge>
			)}
		</Flex>
	);
};
