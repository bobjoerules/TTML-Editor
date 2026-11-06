import {
	Add16Regular,
	ArrowLeft12Regular,
	ArrowRight12Regular,
	ChevronRight16Regular,
	Delete16Regular,
	Dismiss12Regular,
	DismissRegular,
	Edit12Regular,
	Info16Regular,
	NumberSymbol16Regular,
	Open16Regular,
	ReOrder16Regular,
	Sparkle16Regular,
} from "@fluentui/react-icons";
import {
	Box,
	Button,
	Dialog,
	DropdownMenu,
	Flex,
	HoverCard,
	IconButton,
	Text,
	TextField,
} from "@radix-ui/themes";
import { useAtom, useSetAtom } from "jotai";
import { useImmerAtom } from "jotai-immer";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getBetterGeniusCoverArt } from "$/modules/genius/utils/image";
import {
	geniusSearchDialogAtom,
	metadataEditorDialogAtom,
} from "$/states/dialogs.ts";
import { lyricLinesAtom } from "$/states/main.ts";
import styles from "./MetadataEditor.module.css";
import {
	AppleMusicIcon,
	GithubIcon,
	NeteaseIcon,
	QQMusicIcon,
	SpotifyIcon,
} from "./PlatformIcons";

interface SelectOption {
	label: string;
	value: string;
	icon: ReactNode;
	isLinkable?: boolean;
	urlFormatter?: (value: string) => string | null;
	validation?: {
		verifier: (value: string) => boolean;
		message: string;
		severe?: boolean;
	};
}

const SONGWRITERS_GUIDE_URL =
	"https://guides.spicylyrics.org/s/ttml/doc/5-add-the-songwriters-cP7OWZhyKd";

export function parseDelimitedValues(text: string): string[] {
	return text
		.split(/[\n,;/，；、|\\]/)
		.map((s) => s.trim())
		.filter((s) => s !== "");
}

export function reorderArray<T>(
	array: T[],
	fromIndex: number,
	toIndex: number,
): T[] {
	if (
		fromIndex === toIndex ||
		fromIndex < 0 ||
		toIndex < 0 ||
		fromIndex >= array.length ||
		toIndex >= array.length
	) {
		return array;
	}
	const copy = [...array];
	const [moved] = copy.splice(fromIndex, 1);
	copy.splice(toIndex, 0, moved);
	return copy;
}

export const MetadataEditor = () => {
	const [metadataEditorDialog, setMetadataEditorDialog] = useAtom(
		metadataEditorDialogAtom,
	);
	const [lyricLines, setLyricLines] = useImmerAtom(lyricLinesAtom);
	const setGeniusSearchDialogOpen = useSetAtom(geniusSearchDialogAtom);
	const { t } = useTranslation();

	const [songwriterInput, setSongwriterInput] = useState("");
	const [artistInput, setArtistInput] = useState("");
	const [customKey, setCustomKey] = useState("");
	const [dragOverSongwriters, setDragOverSongwriters] = useState(false);
	const [dragOverArtists, setDragOverArtists] = useState(false);
	const [editingSongwriterIndex, setEditingSongwriterIndex] = useState<number | null>(null);
	const [editingSongwriterValue, setEditingSongwriterValue] = useState("");
	const [draggedSongwriterIndex, setDraggedSongwriterIndex] = useState<number | null>(null);
	const [dragOverSongwriterIndex, setDragOverSongwriterIndex] = useState<number | null>(null);

	const songwriterInputRef = useRef<HTMLInputElement | null>(null);
	const editingSongwriterInputRef = useRef<HTMLInputElement | null>(null);
	const artistInputRef = useRef<HTMLInputElement | null>(null);

	// Built-in other field definitions
	const otherFieldOptions: SelectOption[] = useMemo(() => {
		const numeric = (value: string) => /^\d+$/.test(value);
		const alphanumeric = (value: string) => /^[a-zA-Z0-9]+$/.test(value);

		const getPlatformUrl = (key: string, value: string) => {
			if (!value || !value.trim()) return null;
			switch (key) {
				case "ncmMusicId":
					return `https://music.163.com/#/song?id=${value}`;
				case "qqMusicId":
					return `https://y.qq.com/n/ryqq/songDetail/${value}`;
				case "spotifyId":
					return `https://open.spotify.com/track/${value}`;
				case "appleMusicId":
					return `https://music.apple.com/song/${value}`;
				case "ttmlAuthorGithubLogin":
					return `https://github.com/${value}`;
				case "isrc":
					return `https://isrcsearch.ifpi.org/?tab=%22code%22&isrcCode=%22${value}%22`;
				default:
					return null;
			}
		};

		return [
			{
				label: t("metadataDialog.builtinOptions.spotifyId", "Spotify Track ID"),
				value: "spotifyId",
				icon: <SpotifyIcon />,
				isLinkable: true,
				urlFormatter: (val) => getPlatformUrl("spotifyId", val),
				validation: {
					verifier: alphanumeric,
					message: t(
						"metadataDialog.builtinOptions.spotifyIdInvalidMsg",
						"Spotify Track ID should be alphanumeric",
					),
					severe: true,
				},
			},
			{
				label: t(
					"metadataDialog.builtinOptions.appleMusicId",
					"Apple Music Track ID",
				),
				value: "appleMusicId",
				icon: <AppleMusicIcon />,
				isLinkable: true,
				urlFormatter: (val) => getPlatformUrl("appleMusicId", val),
				validation: {
					verifier: numeric,
					message: t(
						"metadataDialog.builtinOptions.appleMusicIdInvalidMsg",
						"Apple Music Track ID should be numeric",
					),
					severe: true,
				},
			},
			{
				label: t("metadataDialog.builtinOptions.isrc", "Track ISRC Code"),
				value: "isrc",
				icon: <NumberSymbol16Regular />,
				isLinkable: true,
				urlFormatter: (val) => getPlatformUrl("isrc", val),
				validation: {
					verifier: (value: string) =>
						/^[A-Z]{2}-?[A-Z0-9]{3}-?\d{2}-?\d{5}$/.test(value),
					message: t(
						"metadataDialog.builtinOptions.isrcInvalidMsg",
						"ISRC code format should be CC-XXX-YY-NNNNN",
					),
					severe: true,
				},
			},
			{
				label: t(
					"metadataDialog.builtinOptions.ncmMusicId",
					"NetEase Music ID",
				),
				value: "ncmMusicId",
				icon: <NeteaseIcon />,
				isLinkable: true,
				urlFormatter: (val) => getPlatformUrl("ncmMusicId", val),
				validation: {
					verifier: numeric,
					message: t(
						"metadataDialog.builtinOptions.ncmMusicIdInvalidMsg",
						"NetEase Music ID should be numeric",
					),
					severe: true,
				},
			},
			{
				label: t("metadataDialog.builtinOptions.qqMusicId", "QQ Music ID"),
				value: "qqMusicId",
				icon: <QQMusicIcon />,
				isLinkable: true,
				urlFormatter: (val) => getPlatformUrl("qqMusicId", val),
				validation: {
					verifier: alphanumeric,
					message: t(
						"metadataDialog.builtinOptions.qqMusicIdInvalidMsg",
						"QQ Music ID should be alphanumeric",
					),
					severe: true,
				},
			},
			{
				label: t(
					"metadataDialog.builtinOptions.ttmlAuthorGithubLogin",
					"Lyrics Author GitHub Username",
				),
				value: "ttmlAuthorGithubLogin",
				icon: <GithubIcon />,
				isLinkable: true,
				urlFormatter: (val) => getPlatformUrl("ttmlAuthorGithubLogin", val),
				validation: {
					verifier: (value: string) =>
						/^(?!.*--)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(
							value,
						),
					message: t(
						"metadataDialog.builtinOptions.ttmlAuthorGithubLoginInvalidMsg",
						"GitHub username should be alphanumeric or hyphens, up to 39 characters",
					),
					severe: true,
				},
			},
			{
				label: t(
					"metadataDialog.builtinOptions.ttmlAuthorGithub",
					"Lyrics Author GitHub ID",
				),
				value: "ttmlAuthorGithub",
				icon: <GithubIcon />,
				validation: {
					verifier: numeric,
					message: t(
						"metadataDialog.builtinOptions.ttmlAuthorGithubInvalidMsg",
						"GitHub ID should be numeric",
					),
					severe: true,
				},
			},
		];
	}, [t]);

	// Helpers to get / set metadata values
	const getArrayValues = useCallback(
		(key: string): string[] => {
			const entry = lyricLines.metadata.find((m) => m.key === key);
			return entry ? entry.value.filter((v) => v.trim() !== "") : [];
		},
		[lyricLines.metadata],
	);

	const getSingleValue = useCallback(
		(key: string): string => {
			const entry = lyricLines.metadata.find((m) => m.key === key);
			return entry?.value?.[0] ?? "";
		},
		[lyricLines.metadata],
	);

	const setSingleValue = useCallback(
		(key: string, val: string) => {
			setLyricLines((prev) => {
				const existingIndex = prev.metadata.findIndex((m) => m.key === key);
				if (existingIndex >= 0) {
					if (val.trim() !== "") {
						prev.metadata[existingIndex].value = [val];
					} else {
						prev.metadata.splice(existingIndex, 1);
					}
				} else if (val.trim() !== "") {
					prev.metadata.push({ key, value: [val] });
				}
			});
		},
		[setLyricLines],
	);

	const addArrayValues = useCallback(
		(key: string, newItems: string[]) => {
			if (newItems.length === 0) return;
			setLyricLines((prev) => {
				const existing = prev.metadata.find((m) => m.key === key);
				if (existing) {
					const existingSet = new Set(existing.value);
					for (const item of newItems) {
						if (!existingSet.has(item)) {
							existing.value.push(item);
							existingSet.add(item);
						}
					}
				} else {
					const unique = Array.from(new Set(newItems));
					prev.metadata.push({ key, value: unique });
				}
			});
		},
		[setLyricLines],
	);

	const removeArrayValue = useCallback(
		(key: string, index: number) => {
			setLyricLines((prev) => {
				const existing = prev.metadata.find((m) => m.key === key);
				if (existing) {
					existing.value.splice(index, 1);
					if (existing.value.length === 0) {
						const idx = prev.metadata.indexOf(existing);
						if (idx >= 0) prev.metadata.splice(idx, 1);
					}
				}
			});
		},
		[setLyricLines],
	);

	const updateArrayValue = useCallback(
		(key: string, index: number, newValue: string) => {
			setLyricLines((prev) => {
				const existing = prev.metadata.find((m) => m.key === key);
				if (existing && existing.value[index] !== undefined) {
					existing.value[index] = newValue;
				}
			});
		},
		[setLyricLines],
	);

	const reorderArrayValues = useCallback(
		(key: string, fromIndex: number, toIndex: number) => {
			setLyricLines((prev) => {
				const existing = prev.metadata.find((m) => m.key === key);
				if (existing) {
					existing.value = reorderArray(existing.value, fromIndex, toIndex);
				}
			});
		},
		[setLyricLines],
	);

	const startEditingSongwriter = useCallback(
		(index: number, currentName: string) => {
			setEditingSongwriterIndex(index);
			setEditingSongwriterValue(currentName);
		},
		[],
	);

	const commitEditingSongwriter = useCallback(() => {
		if (editingSongwriterIndex !== null) {
			const trimmed = editingSongwriterValue.trim();
			if (trimmed.length > 0) {
				updateArrayValue("songwriter", editingSongwriterIndex, trimmed);
			}
			setEditingSongwriterIndex(null);
		}
	}, [editingSongwriterIndex, editingSongwriterValue, updateArrayValue]);

	const cancelEditingSongwriter = useCallback(() => {
		setEditingSongwriterIndex(null);
	}, []);

	const songwriters = getArrayValues("songwriter");
	const artists = getArrayValues("artists");
	const songTitle = getSingleValue("musicName");
	const album = getSingleValue("album");
	const coverUrl = getSingleValue("cover_art");

	// Key fields already handled in top section
	const primaryKeys = useMemo(
		() => new Set(["songwriter", "musicName", "artists", "album", "cover_art"]),
		[],
	);

	// Other fields currently in metadata
	const otherEntries = useMemo(() => {
		return lyricLines.metadata.filter((m) => !primaryKeys.has(m.key));
	}, [lyricLines.metadata, primaryKeys]);

	const findOptionByKey = useCallback(
		(key: string) => {
			return otherFieldOptions.find((v) => v.value === key) || null;
		},
		[otherFieldOptions],
	);

	const handleAddSongwriterFromInput = () => {
		const parts = parseDelimitedValues(songwriterInput);
		if (parts.length > 0) {
			addArrayValues("songwriter", parts);
			setSongwriterInput("");
		}
	};

	const handleAddArtistFromInput = () => {
		const parts = parseDelimitedValues(artistInput);
		if (parts.length > 0) {
			addArrayValues("artists", parts);
			setArtistInput("");
		}
	};

	const handleClearAll = () => {
		if (
			window.confirm(
				t(
					"metadataDialog.confirmClear",
					"Are you sure you want to clear all metadata?",
				),
			)
		) {
			setLyricLines((prev) => {
				prev.metadata = [];
			});
		}
	};

	return (
		<Dialog.Root
			open={metadataEditorDialog}
			onOpenChange={setMetadataEditorDialog}
		>
			<Dialog.Content
				aria-describedby={undefined}
				className={styles.dialogContent}
			>
				{/* Dialog Header */}
				<div className={styles.dialogHeader}>
					<Dialog.Title className={styles.dialogTitle}>
						{t("metadataDialog.editMetadata", "Edit metadata")}
					</Dialog.Title>
					<Dialog.Close>
						<button
							type="button"
							className={styles.closeButton}
							aria-label={t("common.close", "Close")}
						>
							<DismissRegular style={{ width: 16, height: 16 }} />
						</button>
					</Dialog.Close>
				</div>

				{/* Dialog Body */}
				<div className={styles.dialogBody}>
					{/* 1. Songwriters Card */}
					<div
						className={`${styles.songwritersCard} ${
							dragOverSongwriters ? styles.dragOver : ""
						}`}
						onDragOver={(e) => {
							e.preventDefault();
							setDragOverSongwriters(true);
						}}
						onDragLeave={(e) => {
							if (!e.currentTarget.contains(e.relatedTarget as Node)) {
								setDragOverSongwriters(false);
							}
						}}
						onDrop={(e) => {
							e.preventDefault();
							setDragOverSongwriters(false);
							const text = e.dataTransfer.getData("text");
							if (text) {
								const parts = parseDelimitedValues(text);
								addArrayValues("songwriter", parts);
							}
						}}
					>
						<div className={styles.songwritersHeader}>
							<span className={styles.songwritersTitle}>
								{t("metadataDialog.builtinOptions.songwriter", "Songwriters")}
							</span>
						</div>

						{/* Songwriters Pills List */}
						<div
							className={styles.songwritersTagsWrapper}
							onClick={() => songwriterInputRef.current?.focus()}
						>
							{songwriters.map((name, i) => {
								const isEditing = editingSongwriterIndex === i;
								const isDragging = draggedSongwriterIndex === i;
								const isDragOver = dragOverSongwriterIndex === i;

								if (isEditing) {
									return (
										<span
											key={`sw-edit-${i}`}
											className={`${styles.tagPill} ${styles.tagPillEditing}`}
											onClick={(e) => e.stopPropagation()}
										>
											<input
												ref={editingSongwriterInputRef}
												type="text"
												className={styles.tagInlineInput}
												value={editingSongwriterValue}
												onChange={(e) =>
													setEditingSongwriterValue(e.currentTarget.value)
												}
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														commitEditingSongwriter();
													} else if (e.key === "Escape") {
														e.preventDefault();
														cancelEditingSongwriter();
													}
												}}
												onBlur={commitEditingSongwriter}
												autoFocus
											/>
										</span>
									);
								}

								return (
									<span
										key={`sw-${name}-${i}`}
										className={`${styles.tagPill} ${styles.tagPillDraggable} ${
											isDragging ? styles.tagPillDragging : ""
										} ${isDragOver ? styles.tagPillDragOver : ""}`}
										draggable
										onDragStart={(e) => {
											e.dataTransfer.setData("text/plain", `${i}`);
											e.dataTransfer.effectAllowed = "move";
											setDraggedSongwriterIndex(i);
										}}
										onDragEnd={() => {
											setDraggedSongwriterIndex(null);
											setDragOverSongwriterIndex(null);
										}}
										onDragOver={(e) => {
											e.preventDefault();
											e.dataTransfer.dropEffect = "move";
											if (dragOverSongwriterIndex !== i) {
												setDragOverSongwriterIndex(i);
											}
										}}
										onDragLeave={() => {
											if (dragOverSongwriterIndex === i) {
												setDragOverSongwriterIndex(null);
											}
										}}
										onDrop={(e) => {
											e.preventDefault();
											e.stopPropagation();
											if (
												draggedSongwriterIndex !== null &&
												draggedSongwriterIndex !== i
											) {
												reorderArrayValues(
													"songwriter",
													draggedSongwriterIndex,
													i,
												);
											}
											setDraggedSongwriterIndex(null);
											setDragOverSongwriterIndex(null);
										}}
										onClick={(e) => {
											e.stopPropagation();
										}}
									>
										<span
											className={styles.tagReorderHandle}
											title={t(
												"metadataDialog.dragToReorder",
												"Drag to reorder",
											)}
										>
											<ReOrder16Regular style={{ width: 12, height: 12 }} />
										</span>
										<span
											className={styles.tagText}
											title={t(
												"metadataDialog.clickToEdit",
												"Click to edit {{name}}",
												{ name },
											)}
											onClick={(e) => {
												e.stopPropagation();
												startEditingSongwriter(i, name);
											}}
											style={{ cursor: "pointer" }}
										>
											{name}
										</span>
										<div className={styles.tagBtnGroup}>
											<button
												type="button"
												className={styles.tagActionBtn}
												disabled={i === 0}
												onClick={(e) => {
													e.stopPropagation();
													reorderArrayValues("songwriter", i, i - 1);
												}}
												title={t("metadataDialog.moveLeft", "Move left")}
												aria-label={t("metadataDialog.moveLeft", "Move left")}
											>
												<ArrowLeft12Regular />
											</button>
											<button
												type="button"
												className={styles.tagActionBtn}
												disabled={i === songwriters.length - 1}
												onClick={(e) => {
													e.stopPropagation();
													reorderArrayValues("songwriter", i, i + 1);
												}}
												title={t("metadataDialog.moveRight", "Move right")}
												aria-label={t("metadataDialog.moveRight", "Move right")}
											>
												<ArrowRight12Regular />
											</button>
											<button
												type="button"
												className={styles.tagActionBtn}
												onClick={(e) => {
													e.stopPropagation();
													startEditingSongwriter(i, name);
												}}
												title={t(
													"metadataDialog.editSongwriter",
													"Edit songwriter",
												)}
												aria-label={t(
													"metadataDialog.editSongwriter",
													"Edit songwriter",
												)}
											>
												<Edit12Regular />
											</button>
											<button
												type="button"
												className={styles.tagActionBtn}
												onClick={(e) => {
													e.stopPropagation();
													removeArrayValue("songwriter", i);
												}}
												title={t(
													"metadataDialog.removeSongwriter",
													"Remove {{name}}",
													{ name },
												)}
												aria-label={`Remove ${name}`}
											>
												<Dismiss12Regular />
											</button>
										</div>
									</span>
								);
							})}
							<input
								ref={songwriterInputRef}
								type="text"
								className={styles.tagInput}
								value={songwriterInput}
								onChange={(e) => setSongwriterInput(e.currentTarget.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === ",") {
										e.preventDefault();
										handleAddSongwriterFromInput();
									} else if (
										e.key === "Backspace" &&
										songwriterInput === "" &&
										songwriters.length > 0
									) {
										removeArrayValue("songwriter", songwriters.length - 1);
									}
								}}
								onBlur={handleAddSongwriterFromInput}
								onPaste={(e) => {
									const text = e.clipboardData.getData("text");
									const parts = parseDelimitedValues(text);
									if (parts.length > 1) {
										e.preventDefault();
										addArrayValues("songwriter", parts);
										setSongwriterInput("");
									}
								}}
								placeholder={
									songwriters.length === 0
										? t(
												"metadataDialog.addSongwriterPlaceholder",
												"Add songwriter...",
											)
										: "+ Add"
								}
							/>
						</div>

						{/* Songwriters Card Footer Actions */}
						<div className={styles.songwritersFooter}>
							<Button
								type="button"
								variant="soft"
								onClick={() => setGeniusSearchDialogOpen(true)}
							>
								<Sparkle16Regular />
								{t("metadataDialog.findSongwriters", "Find songwriters")}
							</Button>
							<a
								href={SONGWRITERS_GUIDE_URL}
								target="_blank"
								rel="noopener noreferrer"
								className={styles.guideLink}
							>
								{t(
									"metadataDialog.songwritersGuide",
									"Open the songwriters guide",
								)}
							</a>
						</div>
					</div>

					{/* 2. Song Title */}
					<div className={styles.formGroup}>
						<label htmlFor="metadata-song-title" className={styles.formLabel}>
							{t("metadataDialog.songTitle", "Song title")}
						</label>
						<TextField.Root
							id="metadata-song-title"
							size="3"
							value={songTitle}
							onChange={(e) =>
								setSingleValue("musicName", e.currentTarget.value)
							}
							placeholder={t("metadataDialog.songTitle", "Song title")}
							className={styles.textInput}
						/>
					</div>

					{/* 3. Artists */}
					<div className={styles.formGroup}>
						<label htmlFor="metadata-artists" className={styles.formLabel}>
							{t("metadataDialog.artistsLabel", "Artists")}
						</label>
						<span className={styles.formSubtitle}>
							{t(
								"metadataDialog.artistsSubtitle",
								"As credited on streaming services. One name per artist.",
							)}
						</span>
						<div
							id="metadata-artists"
							className={`${styles.artistsContainer} ${
								dragOverArtists ? styles.dragOver : ""
							}`}
							onClick={() => artistInputRef.current?.focus()}
							onDragOver={(e) => {
								e.preventDefault();
								setDragOverArtists(true);
							}}
							onDragLeave={(e) => {
								if (!e.currentTarget.contains(e.relatedTarget as Node)) {
									setDragOverArtists(false);
								}
							}}
							onDrop={(e) => {
								e.preventDefault();
								setDragOverArtists(false);
								const text = e.dataTransfer.getData("text");
								if (text) {
									const parts = parseDelimitedValues(text);
									addArrayValues("artists", parts);
								}
							}}
						>
							{artists.map((artist, i) => (
								<span key={`art-${artist}`} className={styles.tagPill}>
									<span className={styles.tagText}>{artist}</span>
									<button
										type="button"
										className={styles.tagRemoveBtn}
										onClick={(e) => {
											e.stopPropagation();
											removeArrayValue("artists", i);
										}}
										aria-label={`Remove ${artist}`}
									>
										<Dismiss12Regular />
									</button>
								</span>
							))}
							<input
								ref={artistInputRef}
								type="text"
								className={styles.tagInput}
								value={artistInput}
								onChange={(e) => setArtistInput(e.currentTarget.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === ",") {
										e.preventDefault();
										handleAddArtistFromInput();
									} else if (
										e.key === "Backspace" &&
										artistInput === "" &&
										artists.length > 0
									) {
										removeArrayValue("artists", artists.length - 1);
									}
								}}
								onBlur={handleAddArtistFromInput}
								onPaste={(e) => {
									const text = e.clipboardData.getData("text");
									const parts = parseDelimitedValues(text);
									if (parts.length > 1) {
										e.preventDefault();
										addArrayValues("artists", parts);
										setArtistInput("");
									}
								}}
								placeholder={
									artists.length === 0
										? t("metadataDialog.addArtistPlaceholder", "Add artist...")
										: ""
								}
							/>
						</div>
					</div>

					{/* 4. Album */}
					<div className={styles.formGroup}>
						<label htmlFor="metadata-album" className={styles.formLabel}>
							{t("metadataDialog.album", "Album")}
						</label>
						<TextField.Root
							id="metadata-album"
							size="3"
							value={album}
							onChange={(e) => setSingleValue("album", e.currentTarget.value)}
							placeholder={t("metadataDialog.album", "Album")}
							className={styles.textInput}
						/>
					</div>

					{/* 5. Cover image URL */}
					<div className={styles.formGroup}>
						<label htmlFor="metadata-cover-url" className={styles.formLabel}>
							{t("metadataDialog.coverImageUrl", "Cover image URL")}
						</label>
						<TextField.Root
							id="metadata-cover-url"
							size="3"
							value={coverUrl}
							onChange={(e) =>
								setSingleValue("cover_art", e.currentTarget.value)
							}
							placeholder="https://..."
							className={styles.textInput}
						>
							{coverUrl && (
								<TextField.Slot side="right">
									<HoverCard.Root>
										<HoverCard.Trigger>
											<img
												src={getBetterGeniusCoverArt(coverUrl, 160)}
												alt="Cover"
												className={styles.coverThumbnail}
												onError={(e) => {
													(e.currentTarget as HTMLImageElement).style.display =
														"none";
												}}
											/>
										</HoverCard.Trigger>
										<HoverCard.Content
											size="1"
											style={{ maxWidth: 260, padding: 8 }}
										>
											<Box
												style={{
													width: "240px",
													height: "240px",
													borderRadius: "8px",
													overflow: "hidden",
												}}
											>
												<img
													src={getBetterGeniusCoverArt(coverUrl, 480)}
													alt="Cover Preview"
													style={{
														width: "100%",
														height: "100%",
														objectFit: "cover",
													}}
													referrerPolicy="no-referrer"
												/>
											</Box>
										</HoverCard.Content>
									</HoverCard.Root>
								</TextField.Slot>
							)}
						</TextField.Root>
					</div>

					{/* 6. Other Fields (Collapsible) */}
					<details className={styles.otherFieldsDetails}>
						<summary className={styles.otherFieldsSummary}>
							<ChevronRight16Regular className={styles.otherFieldsChevron} />
							<span>{t("metadataDialog.otherFields", "Other fields")}</span>
						</summary>

						<div className={styles.otherFieldsContent}>
							{/* Render each other field currently present */}
							{otherEntries.map((entry) => {
								const opt = findOptionByKey(entry.key);
								const val = entry.value[0] ?? "";
								const url = opt?.urlFormatter?.(val);
								const isLinkable = !!opt?.isLinkable;
								const isValid = opt?.validation
									? opt.validation.verifier(val)
									: true;
								const hasError = val.trim() !== "" && !isValid;

								return (
									<div
										key={`other-${entry.key}`}
										className={styles.otherFieldRow}
									>
										<div className={styles.otherFieldHeader}>
											<span className={styles.otherFieldLabel}>
												{opt?.icon || <Info16Regular />}
												{opt?.label || entry.key}
											</span>
											<div className={styles.otherFieldControls}>
												{isLinkable && (
													<IconButton
														size="1"
														variant="ghost"
														disabled={!url || !isValid}
														asChild={!!url && isValid}
														title={t("metadataDialog.openLink", "Open link")}
													>
														{url && isValid ? (
															<a
																href={url}
																target="_blank"
																rel="noopener noreferrer"
															>
																<Open16Regular />
															</a>
														) : (
															<Open16Regular />
														)}
													</IconButton>
												)}
												<IconButton
													size="1"
													variant="ghost"
													color="red"
													onClick={() => {
														setLyricLines((prev) => {
															const idx = prev.metadata.findIndex(
																(m) => m.key === entry.key,
															);
															if (idx >= 0) prev.metadata.splice(idx, 1);
														});
													}}
													title={t("metadataDialog.delete", "Delete")}
												>
													<Delete16Regular />
												</IconButton>
											</div>
										</div>
										<TextField.Root
											size="2"
											value={val}
											onChange={(e) => {
												setSingleValue(entry.key, e.currentTarget.value);
											}}
											placeholder={opt?.label || entry.key}
											color={
												hasError
													? opt?.validation?.severe
														? "red"
														: "orange"
													: undefined
											}
										/>
										{hasError && opt?.validation && (
											<Text
												size="1"
												color={opt.validation.severe ? "red" : "orange"}
											>
												{opt.validation.message}
											</Text>
										)}
									</div>
								);
							})}

							{/* Add other field controls */}
							<Flex gap="2" align="center" mt="2" wrap="wrap">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										<Button size="1" variant="soft">
											<Add16Regular />
											{t("metadataDialog.addKeyValue", "Add new key-value")}
											<DropdownMenu.TriggerIcon />
										</Button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content>
										<Flex gap="1" p="1">
											<TextField.Root
												size="1"
												style={{ flexGrow: 1 }}
												placeholder={t(
													"metadataDialog.customKey",
													"Custom Key",
												)}
												value={customKey}
												onChange={(e) => setCustomKey(e.currentTarget.value)}
												onKeyDown={(e) => {
													if (e.key === "Enter" && customKey.trim()) {
														setSingleValue(customKey.trim(), "");
														setCustomKey("");
													}
												}}
											/>
											<IconButton
												size="1"
												variant="soft"
												onClick={() => {
													if (customKey.trim()) {
														setSingleValue(customKey.trim(), "");
														setCustomKey("");
													}
												}}
											>
												<Add16Regular />
											</IconButton>
										</Flex>
										<DropdownMenu.Separator />
										{otherFieldOptions
											.filter(
												(opt) =>
													!lyricLines.metadata.some((m) => m.key === opt.value),
											)
											.map((opt) => (
												<DropdownMenu.Item
													key={opt.value}
													onClick={() => {
														setSingleValue(opt.value, "");
													}}
												>
													<Flex align="center" gap="2">
														{opt.icon}
														{opt.label}
													</Flex>
												</DropdownMenu.Item>
											))}
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Flex>
						</div>
					</details>
				</div>

				{/* Dialog Footer */}
				<div className={styles.dialogFooter}>
					<Button
						type="button"
						variant="ghost"
						color="red"
						onClick={handleClearAll}
						className={styles.clearAllBtn}
					>
						{t("metadataDialog.clearAll", "Clear all...")}
					</Button>
					<Dialog.Close>
						<Button
							type="button"
							variant="solid"
							size="2"
							className={styles.doneBtn}
						>
							{t("metadataDialog.done", "Done")}
						</Button>
					</Dialog.Close>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	);
};
