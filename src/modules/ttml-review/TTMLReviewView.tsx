import {
	ArrowClockwise16Regular,
	ArrowDownload16Regular,
	Copy16Regular,
	DismissRegular,
	Flag20Regular,
	FolderOpen16Regular,
	Play12Filled,
	Sparkle16Regular,
	Warning16Filled,
	ZoomIn16Regular,
	ZoomOut16Regular,
} from "@fluentui/react-icons";
import {
	Badge,
	Box,
	Button,
	Card,
	Flex,
	Heading,
	IconButton,
	ScrollArea,
	Switch,
	Text,
	TextField,
	Tooltip,
} from "@radix-ui/themes";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { audioEngine } from "$/modules/audio/audio-engine";
import {
	audioPlayingAtom,
	currentTimeAtom,
} from "$/modules/audio/states";
import { jooxAudioSearchDialogAtom } from "$/states/dialogs.ts";
import { parseLyric as parseTTML } from "$/modules/project/logic/ttml-parser";
import { ResizablePanel } from "$/components/ResizablePanel";
import { PreviewModeSwitcher } from "$/components/PreviewModeSwitcher";
import type { TTMLLyric } from "$/types/ttml";
import {
	lyricLinesAtom,
	saveFileNameAtom,
	selectedLinesAtom,
	ToolMode,
	toolModeAtom,
} from "$/states/main";
import { FlagEditSheet } from "./components/FlagEditSheet";
import {
	ttmlReviewFlagsAtom,
	ttmlReviewIncludeLineNumbersAtom,
	ttmlReviewPreviewWidthAtom,
	ttmlReviewRomajiAtom,
	ttmlReviewShowPreviewAtom,
	ttmlReviewTrackAtom,
	ttmlReviewZoomAtom,
} from "./states";
import type { ReviewFlag, ReviewLine, ReviewTrackInfo, ReviewWord } from "./types";
import {
	buildDiscordReviewMarkdown,
	formatTimestampClock,
	getWordsText,
} from "./utils/exportMarkdown";
import { getFlagLabel } from "./utils/templateDefaults";

interface LineWordsListProps {
	line: ReviewLine;
	lineIdx: number;
	lineFlags: ReviewFlag[];
	isPlaying: boolean;
	isAudioPlaying: boolean;
	selectedSection: {
		lineIndex: number;
		startIndex: number;
		endIndex: number;
	} | null;
	handleWordMouseDown: (
		e: React.MouseEvent,
		lineIdx: number,
		wIdx: number,
	) => void;
	handleWordMouseEnter: (lineIdx: number, wIdx: number) => void;
	openFlagSheet: (
		lineIdx: number,
		startWIdx?: number,
		endWIdx?: number,
		existing?: ReviewFlag,
	) => void;
	t: (key: string, defaultValue?: string) => string;
}

const LineWordsList: FC<LineWordsListProps> = ({
	line,
	lineIdx,
	lineFlags,
	isPlaying,
	isAudioPlaying,
	selectedSection,
	handleWordMouseDown,
	handleWordMouseEnter,
	openFlagSheet,
	t,
}) => {
	const store = useStore();
	const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);
	const activeWordIdxRef = useRef<number>(-1);

	// Synchronous active word fallback so word 0 is active on frame 0 with no 1-frame delay or flash
	const curTime = isPlaying && isAudioPlaying ? store.get(currentTimeAtom) : -1;
	const currentActiveWord = activeWordIdx >= 0
		? activeWordIdx
		: (isPlaying && isAudioPlaying && curTime > 0
			? (line.words || []).findIndex(
					(w) =>
						(w.startTime > 0 || w.endTime > 0) &&
						w.endTime >= w.startTime &&
						curTime >= w.startTime &&
						curTime < w.endTime,
				)
			: -1);

	useEffect(() => {
		if (!isPlaying || !isAudioPlaying) {
			if (activeWordIdxRef.current !== -1) {
				activeWordIdxRef.current = -1;
				setActiveWordIdx(-1);
			}
			return;
		}

		const words = line.words || [];
		if (words.length === 0) return;

		const updateActiveWord = () => {
			const curTime = store.get(currentTimeAtom);
			const curActive = activeWordIdxRef.current;

			// Quick check: if current active word is still running, avoid re-rendering
			if (curActive >= 0 && curActive < words.length) {
				const w = words[curActive];
				if (curTime >= w.startTime && curTime < w.endTime) {
					return;
				}
			}

			// Find newly active word
			const newActive = words.findIndex(
				(w) =>
					(w.startTime > 0 || w.endTime > 0) &&
					w.endTime >= w.startTime &&
					curTime >= w.startTime &&
					curTime < w.endTime,
			);

			if (newActive !== activeWordIdxRef.current) {
				activeWordIdxRef.current = newActive;
				setActiveWordIdx(newActive);
			}
		};

		updateActiveWord();
		return store.sub(currentTimeAtom, updateActiveWord);
	}, [isPlaying, isAudioPlaying, line.words, store]);

	if (!line.words || line.words.length === 0) {
		return (
			<span
				onClick={() => openFlagSheet(lineIdx, 0, 0)}
				style={{
					fontFamily: "var(--editor-font-family, inherit)",
					cursor: "pointer",
					padding: "4px 8px",
					borderRadius: "var(--radius-2)",
					color: isPlaying ? "var(--accent-11)" : "var(--gray-9)",
					backgroundColor: "var(--color-panel, var(--gray-a2))",
					border: "1px dashed var(--gray-a6)",
					fontSize: 13,
					fontWeight: isPlaying ? 600 : 500,
					display: "inline-block",
				}}
				title={t(
					"ttmlReview.emptyLineClickToFlag",
					"Empty line - click to flag",
				)}
			>
				{line.text || t("ttmlReview.emptyLine", "— Empty Line —")}
			</span>
		);
	}

	return (
		<>
			{line.words.map((w, wIdx) => {
				const isSpace =
					w.word.length > 0 && w.word.trim().length === 0;
				if (isSpace) {
					return (
						<span
							key={w.id || `${lineIdx}-${wIdx}`}
							data-space-word="true"
							style={{
								display: "inline-block",
								width: `${Math.max(1, w.word.length) * 6}px`,
								minWidth: "4px",
								height: "1.2em",
								pointerEvents: "none",
								userSelect: "none",
							}}
						/>
					);
				}

				const wordFlag = lineFlags.find(
					(f) => wIdx >= f.startWordIndex && wIdx <= f.endWordIndex,
				);
				const isWordPlaying = isPlaying && isAudioPlaying && currentActiveWord === wIdx;
				const isSelectedWord =
					selectedSection?.lineIndex === lineIdx &&
					wIdx >= selectedSection.startIndex &&
					wIdx <= selectedSection.endIndex;

				const wordSpan = (
					<span
						data-line-idx={lineIdx}
						data-word-idx={wIdx}
						onMouseDown={(e) => handleWordMouseDown(e, lineIdx, wIdx)}
						onMouseEnter={() => handleWordMouseEnter(lineIdx, wIdx)}
						onDoubleClick={() => {
							const s =
								selectedSection && selectedSection.lineIndex === lineIdx
									? selectedSection.startIndex
									: wIdx;
							const end =
								selectedSection && selectedSection.lineIndex === lineIdx
									? selectedSection.endIndex
									: wIdx;
							openFlagSheet(lineIdx, s, end, wordFlag);
						}}
						onClick={() => {
							if (wordFlag) {
								openFlagSheet(
									lineIdx,
									wordFlag.startWordIndex,
									wordFlag.endWordIndex,
									wordFlag,
								);
							}
						}}
						title={
							wordFlag
								? `${getFlagLabel(wordFlag.tpl)}: ${
										wordFlag.notes || wordFlag.autoNote || "Flagged"
									}`
								: t(
										"ttmlReview.clickToFlag",
										"Click word or drag across to select (Shift+click for range, double-click to flag)",
									)
						}
						style={{
							fontFamily: "var(--editor-font-family, inherit)",
							display: "inline-flex",
							alignItems: "center",
							cursor: "pointer",
							padding: "3px 8px",
							borderRadius: "var(--chip-radius, var(--radius-2))",
							backgroundColor: isSelectedWord
								? "var(--accent-a5)"
								: isWordPlaying
									? wordFlag
										? "var(--red-9)"
										: "var(--accent-9)"
									: wordFlag
										? "var(--red-3)"
										: "var(--color-panel, var(--gray-a3))",
							border: isSelectedWord
								? "1px solid var(--accent-a10)"
								: isWordPlaying
									? wordFlag
										? "1px solid var(--red-11)"
										: "1px solid var(--accent-11)"
									: wordFlag
										? "1px solid var(--red-8)"
										: "1px solid var(--gray-a5)",
							color: isWordPlaying
								? "#ffffff"
								: isSelectedWord
									? "var(--accent-12)"
									: wordFlag
										? "var(--red-11)"
										: "inherit",
							boxShadow: isWordPlaying
								? wordFlag
									? "0 0 10px var(--red-8)"
									: "0 0 10px var(--accent-a8)"
								: isSelectedWord
									? "0 0 0 2px var(--accent-a8)"
									: "var(--base-card-surface-box-shadow, 0 1px 2px rgba(0,0,0,0.06))",
							fontWeight: isWordPlaying || isSelectedWord ? 600 : 500,
							userSelect: "none",
							whiteSpace: "pre-wrap",
							transition: isWordPlaying
								? "none"
								: "background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
						}}
					>
						{w.word}
					</span>
				);

				if (wordFlag) {
					return (
						<Tooltip
							key={w.id || `${lineIdx}-${wIdx}`}
							content={`${getFlagLabel(wordFlag.tpl)}: ${
								wordFlag.notes || wordFlag.autoNote || "Flagged"
							}`}
						>
							{wordSpan}
						</Tooltip>
					);
				}

				return <span key={w.id || `${lineIdx}-${wIdx}`}>{wordSpan}</span>;
			})}
		</>
	);
};

export const TTMLReviewView = () => {
	const { t } = useTranslation();
	const setToolMode = useSetAtom(toolModeAtom);

	// Editor state
	const editorLyrics = useAtomValue(lyricLinesAtom);
	const editorSaveFileName = useAtomValue(saveFileNameAtom);
	const setSelectedLines = useSetAtom(selectedLinesAtom);

	const store = useStore();

	// Audio state
	const isAudioPlaying = useAtomValue(audioPlayingAtom);
	const setJooxAudioSearch = useSetAtom(jooxAudioSearchDialogAtom);

	// Review settings
	const [zoom, setZoom] = useAtom(ttmlReviewZoomAtom);
	const [showPreview, setShowPreview] = useAtom(ttmlReviewShowPreviewAtom);
	const [includeLineNumbers, setIncludeLineNumbers] = useAtom(
		ttmlReviewIncludeLineNumbersAtom,
	);
	const [showRomaji, setShowRomaji] = useAtom(ttmlReviewRomajiAtom);
	const activeLineRef = useRef<HTMLDivElement | null>(null);

	// Review data
	const [trackInfo, setTrackInfo] = useAtom(ttmlReviewTrackAtom);
	const [flags, setFlags] = useAtom(ttmlReviewFlagsAtom);
	const [reviewLines, setReviewLines] = useState<ReviewLine[]>([]);

	// Flag modal state
	const [flagSheetOpen, setFlagSheetOpen] = useState(false);
	const [editingFlag, setEditingFlag] = useState<ReviewFlag | null>(null);
	const [activeLineIndex, setActiveLineIndex] = useState(0);
	const [activeStartWordIndex, setActiveStartWordIndex] = useState(0);
	const [activeEndWordIndex, setActiveEndWordIndex] = useState(0);
	const [activeQuotedText, setActiveQuotedText] = useState("");
	const [activeTargetType, setActiveTargetType] = useState<"line" | "writer">("line");
	const [activeWriterName, setActiveWriterName] = useState("");

	// Multi-word section selection & drag state
	const [selectedSection, setSelectedSection] = useState<{
		lineIndex: number;
		startIndex: number;
		endIndex: number;
	} | null>(null);
	const isDraggingRef = useRef(false);
	const dragAnchorRef = useRef<{ lineIndex: number; wordIndex: number } | null>(
		null,
	);
	const lastClickedWordRef = useRef<{
		lineIndex: number;
		wordIndex: number;
	} | null>(null);

	// URL / Paste popover
	const [showUrlInput, setShowUrlInput] = useState(false);
	const [urlOrXmlInput, setUrlOrXmlInput] = useState("");

	// File input ref
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Storage key for saving flags
	const storageKey = useMemo(() => {
		const name = trackInfo?.fileName || trackInfo?.title || "current-project";
		return `tf:flags:${name}`;
	}, [trackInfo]);

	// Load flags from localStorage whenever track changes
	useEffect(() => {
		if (storageKey) {
			try {
				const saved = localStorage.getItem(storageKey);
				if (saved) {
					const parsedFlags = JSON.parse(saved);
					if (Array.isArray(parsedFlags)) {
						setFlags(parsedFlags);
					}
				}
			} catch {
				// Ignore
			}
		}
	}, [storageKey, setFlags]);

	// Save flags to localStorage
	const updateFlags = useCallback(
		(newFlags: ReviewFlag[] | ((prev: ReviewFlag[]) => ReviewFlag[])) => {
			setFlags((prev) => {
				const resolved =
					typeof newFlags === "function" ? newFlags(prev) : newFlags;
				try {
					localStorage.setItem(storageKey, JSON.stringify(resolved));
				} catch {
					// Ignore
				}
				return resolved;
			});
		},
		[storageKey, setFlags],
	);

	// Convert parsed/editor lines into ReviewLine[]
	const loadLinesFromSource = useCallback(
		(
			rawLines: any[],
			metaItems: { key: string; value: string[] }[] = [],
			info: Partial<ReviewTrackInfo> = {},
		) => {
			let songTitle = info.title || "";
			let songArtist = info.artist || "";
			let songAlbum = info.album || "";
			const songWriters: string[] = [...(info.songwriters || [])];

			for (const m of metaItems) {
				const k = m.key.toLowerCase();
				if (k === "title" || k === "musicname") songTitle = m.value[0] || songTitle;
				if (k === "artist" || k === "artists")
					songArtist = m.value[0] || songArtist;
				if (k === "album") songAlbum = m.value[0] || songAlbum;
				if (k === "songwriter") {
					for (const w of m.value) {
						if (w.trim() && !songWriters.includes(w.trim()))
							songWriters.push(w.trim());
					}
				}
			}

			const lines: ReviewLine[] = rawLines.map((line, idx) => {
				const words: ReviewWord[] = (line.words || []).map(
					(w: any, wIdx: number) => ({
						id: w.id || `w-${idx}-${wIdx}`,
						word: w.word || "",
						startTime: w.startTime || 0,
						endTime: w.endTime || 0,
						romanWord: w.romanWord || "",
					}),
				);
				const text = getWordsText(words);
				const isBg = !!(line.isBg ?? line.isBG);
				const voice = line.voice || line.agent;
				const roman = line.roman || line.romanLyric || "";
				return {
					id: line.id || `l-${idx}`,
					lineNumber: idx + 1,
					startTime: line.startTime || (words[0]?.startTime ?? 0),
					endTime:
						line.endTime || (words[words.length - 1]?.endTime ?? 0),
					isBg,
					isBG: isBg,
					isDuet: !!line.isDuet,
					voice,
					agent: voice,
					isLineSynced: !!line.isLineSynced,
					words,
					text,
					roman,
					romanLyric: roman,
				};
			});

			setReviewLines(lines);
			setTrackInfo({
				title: songTitle || "Untitled Track",
				artist: songArtist || "Unknown Artist",
				album: songAlbum,
				songwriters: songWriters,
				sourceType: info.sourceType || "current-project",
				fileName: info.fileName || `${songArtist} - ${songTitle}`,
				rawXml: info.rawXml,
			});
		},
		[setTrackInfo],
	);

	// Load Current Editor Project
	const loadCurrentProject = useCallback(() => {
		if (editorLyrics && editorLyrics.lyricLines.length > 0) {
			loadLinesFromSource(
				editorLyrics.lyricLines,
				editorLyrics.metadata || [],
				{
					sourceType: "current-project",
					fileName: editorSaveFileName || "current-editor-project",
				},
			);
			toast.info(
				t("ttmlReview.loadedCurrentProject", "Loaded current editor project"),
				{ autoClose: 2000 },
			);
		} else {
			toast.warning(
				t(
					"ttmlReview.emptyProject",
					"Current editor project is empty. Open a TTML file to review.",
				),
			);
		}
	}, [editorLyrics, editorSaveFileName, loadLinesFromSource, t]);

	// Auto-load current project on initial mount if empty
	useEffect(() => {
		if (reviewLines.length === 0) {
			if (editorLyrics && editorLyrics.lyricLines.length > 0) {
				loadCurrentProject();
			}
		}
	}, [reviewLines.length, editorLyrics, loadCurrentProject]);

	// Listen for Escape key to exit review mode
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !flagSheetOpen) {
				setToolMode(ToolMode.Edit);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [flagSheetOpen, setToolMode]);

	// Parse XML file or text
	const loadFromXmlString = useCallback(
		(xmlText: string, fileName = "Imported TTML") => {
			try {
				const parsed = parseTTML(xmlText);
				if (!parsed.lyricLines || parsed.lyricLines.length === 0) {
					toast.error(
						t(
							"ttmlReview.noLinesFound",
							"Could not find any lyric lines in this TTML.",
						),
					);
					return;
				}

				// Also parse any general songwriter tags if not already in metadata
				const parser = new DOMParser();
				const doc = parser.parseFromString(xmlText, "application/xml");
				const rawWriters = Array.from(doc.getElementsByTagName("songwriter"))
					.map((el) => el.textContent?.trim() || "")
					.filter(Boolean);

				const meta = [...(parsed.metadata || [])];
				if (rawWriters.length > 0) {
					const existing = meta.find((m) => m.key.toLowerCase() === "songwriter");
					if (existing) {
						for (const w of rawWriters) {
							if (!existing.value.includes(w)) existing.value.push(w);
						}
					} else {
						meta.push({ key: "songwriter", value: rawWriters });
					}
				}

				loadLinesFromSource(parsed.lyricLines, meta, {
					sourceType: "file",
					fileName,
					rawXml: xmlText,
				});
				toast.success(
					t(
						"ttmlReview.loadedFile",
						`Loaded ${parsed.lyricLines.length} lines for review!`,
					),
				);
			} catch (err) {
				console.error("Failed to parse TTML:", err);
				toast.error(
					t(
						"ttmlReview.parseError",
						"Failed to parse TTML file. Please ensure it is valid XML.",
					),
				);
			}
		},
		[loadLinesFromSource, t],
	);

	// Handle File Upload
	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (event) => {
			const content = event.target?.result as string;
			if (content) {
				loadFromXmlString(content, file.name);
			}
		};
		reader.readAsText(file);
		e.target.value = "";
	};

	// Handle Drag and Drop
	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		const file = e.dataTransfer.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (event) => {
				const content = event.target?.result as string;
				if (content) {
					loadFromXmlString(content, file.name);
				}
			};
			reader.readAsText(file);
		}
	};

	// Handle URL Fetch or Raw XML Paste
	const handleUrlOrXmlSubmit = async () => {
		const input = urlOrXmlInput.trim();
		if (!input) return;

		if (input.startsWith("<") && input.includes("tt")) {
			loadFromXmlString(input, "Pasted TTML");
			setShowUrlInput(false);
			setUrlOrXmlInput("");
			return;
		}

		try {
			toast.info(t("ttmlReview.fetchingUrl", "Fetching TTML from URL..."));
			const res = await fetch(input);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const text = await res.text();
			const urlFileName =
				decodeURIComponent(input.split("?")[0].split("/").pop() || "") ||
				"remote-ttml";
			loadFromXmlString(text, urlFileName);
			setShowUrlInput(false);
			setUrlOrXmlInput("");
		} catch (err) {
			console.error("Failed to fetch TTML URL:", err);
			toast.error(
				t("ttmlReview.fetchFailed", "Could not fetch TTML link. Check the URL."),
			);
		}
	};

	// Raise Flag on Word / Span
	const openFlagSheet = (
		lineIdx: number,
		startWIdx: number,
		endWIdx: number,
		existing?: ReviewFlag,
	) => {
		const line = reviewLines[lineIdx];
		if (!line) return;

		let quote = "";
		if (line.words && line.words.length > 0) {
			const s = Math.max(0, Math.min(startWIdx, line.words.length - 1));
			const e = Math.max(s, Math.min(endWIdx, line.words.length - 1));
			quote = getWordsText(line.words.slice(s, e + 1));
		} else {
			quote = line.text;
		}

		setActiveTargetType("line");
		setActiveWriterName("");
		setActiveLineIndex(lineIdx);
		setActiveStartWordIndex(startWIdx);
		setActiveEndWordIndex(endWIdx);
		setActiveQuotedText(quote);
		setEditingFlag(existing || null);
		setFlagSheetOpen(true);
	};

	// Raise or Edit Flag on a Songwriter
	const openWriterFlagSheet = (writerName: string, existing?: ReviewFlag) => {
		setActiveTargetType("writer");
		setActiveWriterName(writerName);
		setActiveQuotedText(writerName || "Songwriter");
		setActiveLineIndex(-1);
		setActiveStartWordIndex(-1);
		setActiveEndWordIndex(-1);
		setEditingFlag(existing || null);
		setFlagSheetOpen(true);
	};

	// Word mouse interactions for single-word click, Shift+click range, and drag selection
	const handleWordMouseDown = (
		e: React.MouseEvent,
		lineIdx: number,
		wIdx: number,
	) => {
		if (e.button !== 0) return;
		// Prevent native text dragging / selection so mousemove/mouseenter tracks across words
		e.preventDefault();

		if (e.shiftKey && lastClickedWordRef.current?.lineIndex === lineIdx) {
			const start = Math.min(lastClickedWordRef.current.wordIndex, wIdx);
			const end = Math.max(lastClickedWordRef.current.wordIndex, wIdx);
			lastClickedWordRef.current = { lineIndex: lineIdx, wordIndex: wIdx };
			setSelectedSection({
				lineIndex: lineIdx,
				startIndex: start,
				endIndex: end,
			});
			return;
		}

		isDraggingRef.current = true;
		dragAnchorRef.current = { lineIndex: lineIdx, wordIndex: wIdx };
		lastClickedWordRef.current = { lineIndex: lineIdx, wordIndex: wIdx };
		setSelectedSection({
			lineIndex: lineIdx,
			startIndex: wIdx,
			endIndex: wIdx,
		});
	};

	const handleWordMouseEnter = (lineIdx: number, wIdx: number) => {
		if (
			isDraggingRef.current &&
			dragAnchorRef.current &&
			dragAnchorRef.current.lineIndex === lineIdx
		) {
			const start = Math.min(dragAnchorRef.current.wordIndex, wIdx);
			const end = Math.max(dragAnchorRef.current.wordIndex, wIdx);
			setSelectedSection({
				lineIndex: lineIdx,
				startIndex: start,
				endIndex: end,
			});
		}
	};

	const handleContainerMouseMove = (e: React.MouseEvent) => {
		if (!isDraggingRef.current || !dragAnchorRef.current) return;
		const el = document.elementFromPoint(e.clientX, e.clientY);
		const wordEl = el?.closest("[data-word-idx]") as HTMLElement | null;
		if (wordEl) {
			const targetLine = Number(wordEl.dataset.lineIdx);
			const targetWord = Number(wordEl.dataset.wordIdx);
			if (
				targetLine === dragAnchorRef.current.lineIndex &&
				!Number.isNaN(targetWord)
			) {
				const start = Math.min(dragAnchorRef.current.wordIndex, targetWord);
				const end = Math.max(dragAnchorRef.current.wordIndex, targetWord);
				setSelectedSection({
					lineIndex: targetLine,
					startIndex: start,
					endIndex: end,
				});
			}
		}
	};

	useEffect(() => {
		const handleGlobalMouseUp = () => {
			if (isDraggingRef.current) {
				isDraggingRef.current = false;
				if (
					dragAnchorRef.current &&
					selectedSection &&
					dragAnchorRef.current.lineIndex === selectedSection.lineIndex &&
					selectedSection.startIndex !== selectedSection.endIndex
				) {
					// User explicitly dragged across multiple words - auto open flag sheet for section
					const lineFlags = flags.filter(
						(f) => f.lineIndex === selectedSection.lineIndex,
					);
					const matchingFlag = lineFlags.find(
						(f) =>
							(selectedSection.startIndex >= f.startWordIndex &&
								selectedSection.endIndex <= f.endWordIndex) ||
							(f.startWordIndex >= selectedSection.startIndex &&
								f.endWordIndex <= selectedSection.endIndex),
					);
					openFlagSheet(
						selectedSection.lineIndex,
						selectedSection.startIndex,
						selectedSection.endIndex,
						matchingFlag,
					);
				}
				dragAnchorRef.current = null;
			}
		};

		window.addEventListener("mouseup", handleGlobalMouseUp);
		return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
	}, [selectedSection, flags]);

	// Save or Delete Flag
	const handleSaveFlag = (flag: ReviewFlag) => {
		updateFlags((prev) => {
			const existingIndex = prev.findIndex((f) => f.id === flag.id);
			if (existingIndex >= 0) {
				const next = [...prev];
				next[existingIndex] = flag;
				return next;
			}
			return [...prev, flag];
		});
		toast.success(t("ttmlReview.flagSaved", "Flag saved!"));
	};

	const handleDeleteFlag = (flagId: string) => {
		updateFlags((prev) => prev.filter((f) => f.id !== flagId));
		toast.info(t("ttmlReview.flagDeleted", "Flag removed"));
	};

	// Copy formatted report for Discord
	const handleCopyDiscord = async () => {
		if (flags.length === 0) {
			toast.info(t("ttmlReview.noFlagsToCopy", "No flags to export yet."));
			return;
		}

		const markdown = buildDiscordReviewMarkdown({
			flags,
			lines: reviewLines,
			includeLineNumbers,
			trackTitle: trackInfo?.title,
			trackArtist: trackInfo?.artist,
		});

		if (!markdown) {
			toast.warning(t("ttmlReview.noFlagsToCopy", "No flags to export yet."));
			return;
		}

		let copied = false;
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(markdown);
				copied = true;
			} catch (e) {
				console.warn(
					"navigator.clipboard.writeText failed, attempting fallback:",
					e,
				);
			}
		}

		if (!copied) {
			try {
				const textArea = document.createElement("textarea");
				textArea.value = markdown;
				textArea.style.position = "fixed";
				textArea.style.left = "-9999px";
				textArea.style.top = "-9999px";
				document.body.appendChild(textArea);
				textArea.focus();
				textArea.select();
				copied = document.execCommand("copy");
				document.body.removeChild(textArea);
			} catch (e) {
				console.error("Fallback clipboard copy failed:", e);
			}
		}

		if (copied) {
			toast.success(
				t(
					"ttmlReview.copiedDiscord",
					"Copied formatted review for Discord to clipboard!",
				),
			);
		} else {
			toast.error(t("ttmlReview.copyFailed", "Failed to copy to clipboard."));
		}
	};

	// Download report as .md
	const handleDownloadMarkdown = () => {
		const markdown = buildDiscordReviewMarkdown({
			flags,
			lines: reviewLines,
			includeLineNumbers,
			trackTitle: trackInfo?.title,
			trackArtist: trackInfo?.artist,
		});

		const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		const safeTitle = (trackInfo?.title || "review")
			.toLowerCase()
			.replace(/[^a-z0-9_-]/g, "-");
		a.href = url;
		a.download = `${safeTitle}-review.md`;
		a.click();
		URL.revokeObjectURL(url);
	};

	// Jump back to main editor and highlight line
	const jumpToEditorLine = (lineIdx: number) => {
		const line = reviewLines[lineIdx];
		if (!line) return;
		setSelectedLines(new Set([line.id]));
		setToolMode(ToolMode.Edit);
	};

	// Download Audio Beta action
	const handleDownloadAudio = useCallback(() => {
		setJooxAudioSearch({
			open: true,
			title: trackInfo?.title || "",
			artist: trackInfo?.artist || "",
		});
	}, [trackInfo, setJooxAudioSearch]);

	const seekToLine = (line: ReviewLine) => {
		audioEngine.seekMusic(line.startTime / 1000);
		if (!isAudioPlaying) {
			void audioEngine.play();
		}
	};

	// Calculate writer flags and lines that have flags
	const writerFlags = useMemo(() => {
		return flags.filter((f) => f.targetType === "writer" || f.lineIndex < 0);
	}, [flags]);

	const flaggedLineIndices = useMemo(() => {
		return new Set(
			flags
				.filter((f) => f.targetType !== "writer" && f.lineIndex >= 0)
				.map((f) => f.lineIndex),
		);
	}, [flags]);

	// Track active playing line index via store subscription to avoid 60fps re-rendering of whole tree
	const [activePlayingLineIndex, setActivePlayingLineIndex] = useState(-1);
	const activePlayingLineIndexRef = useRef(-1);

	useEffect(() => {
		if (!isAudioPlaying) {
			if (activePlayingLineIndexRef.current !== -1) {
				activePlayingLineIndexRef.current = -1;
				setActivePlayingLineIndex(-1);
			}
			return;
		}

		const handleTimeUpdate = () => {
			const curTime = store.get(currentTimeAtom);
			if (curTime <= 0 || reviewLines.length === 0) {
				if (activePlayingLineIndexRef.current !== -1) {
					activePlayingLineIndexRef.current = -1;
					setActivePlayingLineIndex(-1);
				}
				return;
			}

			const curIdx = activePlayingLineIndexRef.current;
			if (curIdx >= 0 && curIdx < reviewLines.length) {
				const curLine = reviewLines[curIdx];
				// 1. If currently inside the active line
				if (curTime >= curLine.startTime && curTime <= curLine.endTime) {
					return;
				}
				// 2. If in a normal inter-line gap before the next line (within 2s),
				// keep current line active until the next line actually starts,
				// avoiding jarring 1-frame unhighlight flicker!
				if (curIdx < reviewLines.length - 1) {
					const nextLine = reviewLines[curIdx + 1];
					if (curTime > curLine.endTime && curTime < nextLine.startTime) {
						if (nextLine.startTime - curLine.endTime <= 2000) {
							return;
						}
					}
				}
			}

			// 3. Find exact line index
			let newIdx = reviewLines.findIndex(
				(l) => curTime >= l.startTime && curTime <= l.endTime,
			);

			// 4. If between lines within a 2s inter-line gap, keep the line that just ended
			if (newIdx === -1) {
				const recentIdx = reviewLines.findLastIndex(
					(l) => curTime >= l.startTime && curTime <= l.endTime + 2000,
				);
				if (recentIdx !== -1 && recentIdx < reviewLines.length - 1) {
					const nextLine = reviewLines[recentIdx + 1];
					if (
						curTime < nextLine.startTime &&
						nextLine.startTime - reviewLines[recentIdx].endTime <= 2000
					) {
						newIdx = recentIdx;
					}
				}
			}

			if (newIdx !== activePlayingLineIndexRef.current) {
				activePlayingLineIndexRef.current = newIdx;
				setActivePlayingLineIndex(newIdx);
			}
		};

		handleTimeUpdate();
		return store.sub(currentTimeAtom, handleTimeUpdate);
	}, [isAudioPlaying, reviewLines, store]);

	// Auto-scroll to active playing line only when outside viewport
	useEffect(() => {
		if (!isAudioPlaying || activePlayingLineIndex < 0 || !activeLineRef.current) {
			return;
		}
		const el = activeLineRef.current;
		const viewport = el.closest(".rt-ScrollAreaViewport");
		if (viewport) {
			const vRect = viewport.getBoundingClientRect();
			const elRect = el.getBoundingClientRect();
			// Only scroll if line is out of viewport view
			if (elRect.top < vRect.top + 24 || elRect.bottom > vRect.bottom - 24) {
				el.scrollIntoView({
					block: "nearest",
					inline: "nearest",
					behavior: "smooth",
				});
			}
		} else {
			el.scrollIntoView({
				block: "nearest",
				inline: "nearest",
				behavior: "smooth",
			});
		}
	}, [activePlayingLineIndex, isAudioPlaying]);

	// Check if any line is duet
	const hasAnyDuetLines = useMemo(() => {
		return reviewLines.some((l) => l.isDuet);
	}, [reviewLines]);

	// Check if any line has romanization
	const hasAnyRomaji = useMemo(() => {
		return reviewLines.some((l) => !!l.roman);
	}, [reviewLines]);

	// Active lyrics for live preview switcher
	const activePreviewLyrics = useMemo<TTMLLyric>(() => {
		if (
			trackInfo?.sourceType === "current-project" &&
			editorLyrics?.lyricLines?.length > 0
		) {
			return editorLyrics;
		}
		return {
			lyricLines: reviewLines.map((l, idx) => ({
				id: l.id || `line-${idx}`,
				startTime: l.startTime,
				endTime: l.endTime,
				isDuet: !!l.isDuet,
				isBG: !!(l.isBg ?? l.isBG),
				agent: l.voice || l.agent,
				ignoreSync: false,
				isLineSynced: l.isLineSynced,
				words: (l.words || []).map((w, wIdx) => ({
					id: w.id || `w-${idx}-${wIdx}`,
					word: w.word,
					startTime: w.startTime,
					endTime: w.endTime,
					romanWord: w.romanWord || "",
					obscene: false,
				})),
				romanLyric: l.roman || l.romanLyric || "",
				translatedLyric: "",
			})),
			metadata: [
				...(trackInfo?.title ? [{ key: "title", value: [trackInfo.title] }] : []),
				...(trackInfo?.artist
					? [{ key: "artist", value: [trackInfo.artist] }]
					: []),
				...(trackInfo?.album ? [{ key: "album", value: [trackInfo.album] }] : []),
				...(trackInfo?.sourceType === "current-project" && editorLyrics?.metadata
					? editorLyrics.metadata
					: []),
			],
			marks:
				trackInfo?.sourceType === "current-project" && editorLyrics?.marks
					? editorLyrics.marks
					: [],
			sections:
				trackInfo?.sourceType === "current-project" && editorLyrics?.sections
					? editorLyrics.sections
					: [],
		};
	}, [trackInfo, editorLyrics, reviewLines]);

	return (
		<Box
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				backgroundColor: "var(--color-background, var(--editor-bg, #0b0b0d))",
			}}
		>
			{/* Top Bar */}
			<Flex
				justify="between"
				align="center"
				px="4"
				py="2"
				style={{
					borderBottom: "1px solid var(--gray-a4)",
					backgroundColor: "var(--gray-a2)",
					flexShrink: 0,
				}}
			>
				<Flex align="center" gap="3">
					<Flex direction="column" gap="0">
						<Heading size="3" style={{ lineHeight: 1.2 }}>
							{t("ttmlReview.title", "TTML Reviewer")}
						</Heading>
						<Text size="1" color="gray">
							{trackInfo?.title
								? `${trackInfo.title} • ${trackInfo.artist}`
								: t("ttmlReview.subtitle", "Review TTML & export for Discord")}
						</Text>
					</Flex>
				</Flex>

				{/* Action Controls */}
				<Flex align="center" gap="2">
					{/* Source Switcher */}
					<Button
						size="1"
						variant={
							trackInfo?.sourceType === "current-project" ? "solid" : "soft"
						}
						color={
							trackInfo?.sourceType === "current-project" ? "indigo" : "gray"
						}
						onClick={loadCurrentProject}
						title={t(
							"ttmlReview.loadCurrentProject",
							"Review current project from editor",
						)}
					>
						<Sparkle16Regular />
						{t("ttmlReview.currentProject", "Current Project")}
					</Button>

					<Button
						size="1"
						variant={trackInfo?.sourceType === "file" ? "solid" : "soft"}
						color="gray"
						onClick={() => fileInputRef.current?.click()}
						title={t("ttmlReview.openFile", "Open an external TTML file")}
					>
						<FolderOpen16Regular />
						{t("ttmlReview.openFileShort", "Open TTML...")}
					</Button>

					{/* Download Audio (Beta) */}
					<Button
						size="1"
						variant="soft"
						color="orange"
						onClick={handleDownloadAudio}
						title={t(
							"ttmlReview.downloadAudioTitle",
							"Search and download audio using the in-app downloader (Beta)",
						)}
						style={{ cursor: "pointer" }}
					>
						<ArrowDownload16Regular />
						{t("ttmlReview.downloadAudio", "Download Audio")}
						<Badge color="orange" size="1" variant="soft">
							Beta
						</Badge>
					</Button>

					{/* Export to Discord */}
					<Button
						size="1"
						variant="solid"
						color="red"
						onClick={handleCopyDiscord}
						style={{ fontWeight: 600, cursor: "pointer" }}
					>
						<Copy16Regular />
						{t("ttmlReview.copyForDiscord", "Copy for Discord")}
						{flags.length > 0 && ` (${flags.length})`}
					</Button>

					<Button
						size="1"
						variant="soft"
						color="gray"
						onClick={handleDownloadMarkdown}
						title={t("ttmlReview.downloadMd", "Download as .md file")}
					>
						<ArrowDownload16Regular />
					</Button>

					<Button
						size="1"
						variant="soft"
						color="gray"
						onClick={() => setToolMode(ToolMode.Edit)}
						title={t("ttmlReview.exitReview", "Exit Review (Return to Editor)")}
					>
						<DismissRegular />
						{t("ttmlReview.exitReviewShort", "Exit Review")}
					</Button>
				</Flex>
			</Flex>

			{/* Secondary Toolbar: Options, Zoom, Presets, Stats */}
			<Flex
				justify="between"
				align="center"
				px="4"
				py="2"
				style={{
					borderBottom: "1px solid var(--gray-a3)",
					backgroundColor: "var(--gray-a1)",
					fontSize: 12,
					flexShrink: 0,
				}}
			>
				<Flex align="center" gap="3">
					<Text size="1" color="gray">
						{flags.length > 0
							? `${flags.length} flag${flags.length > 1 ? "s" : ""}${
									writerFlags.length > 0
										? ` (${flaggedLineIndices.size} line${
												flaggedLineIndices.size === 1 ? "" : "s"
											}, ${writerFlags.length} writer${
												writerFlags.length === 1 ? "" : "s"
											})`
										: ` across ${flaggedLineIndices.size} line${
												flaggedLineIndices.size > 1 ? "s" : ""
											}`
								}`
							: t(
									"ttmlReview.noFlags",
									"No flags yet. Click words or writers to flag.",
								)}
					</Text>
					{trackInfo?.songwriters && trackInfo.songwriters.length > 0 && (
						<Text size="1" color="gray">
							• Written by {trackInfo.songwriters.join(", ")}
						</Text>
					)}
				</Flex>

				<Flex align="center" gap="4">
					{/* Text Zoom */}
					<Flex align="center" gap="1">
						<Text size="1" color="gray">
							Zoom:
						</Text>
						<IconButton
							size="1"
							variant="soft"
							color="gray"
							onClick={() => setZoom((z) => Math.max(0.8, +(z - 0.1).toFixed(1)))}
							title="Zoom Out"
						>
							<ZoomOut16Regular />
						</IconButton>
						<Text size="1" style={{ minWidth: 32, textAlign: "center" }}>
							{Math.round(zoom * 100)}%
						</Text>
						<IconButton
							size="1"
							variant="soft"
							color="gray"
							onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.1).toFixed(1)))}
							title="Zoom In"
						>
							<ZoomIn16Regular />
						</IconButton>
						{zoom !== 1.0 && (
							<IconButton
								size="1"
								variant="soft"
								color="gray"
								onClick={() => setZoom(1.0)}
								title="Reset Zoom"
							>
								<ArrowClockwise16Regular />
							</IconButton>
						)}
					</Flex>

					{/* Line numbers in export */}
					<Flex align="center" gap="2">
						<Switch
							size="1"
							id="chk-review-linenum"
							checked={includeLineNumbers}
							onCheckedChange={setIncludeLineNumbers}
						/>
						<Text as="label" htmlFor="chk-review-linenum" size="1" color="gray">
							{t("ttmlReview.lineNumbers", "Line numbers")}
						</Text>
					</Flex>

					{/* Romaji toggle - only shown when track contains romanized lyrics */}
					{hasAnyRomaji && (
						<Flex align="center" gap="2">
							<Switch
								size="1"
								id="chk-review-romaji"
								checked={showRomaji}
								onCheckedChange={setShowRomaji}
							/>
							<Text as="label" htmlFor="chk-review-romaji" size="1" color="gray">
								{t("ttmlReview.showRomaji", "Romaji")}
							</Text>
						</Flex>
					)}
				</Flex>
			</Flex>

			{/* Main Lyrics Area & Live Preview Split */}
			<Flex
				flexGrow="1"
				direction="row"
				style={{
					minHeight: 0,
					overflow: "hidden",
					width: "100%",
				}}
			>
				{/* Left side: Review Lines Inspector */}
				<Box
					style={{
						flex: "1 1 0",
						minWidth: 0,
						height: "100%",
						overflow: "hidden",
						display: "flex",
						flexDirection: "column",
						borderRight: showPreview ? "1px solid var(--gray-a4)" : "none",
					}}
					onDragOver={(e) => e.preventDefault()}
					onDrop={handleDrop}
				>
					<ScrollArea type="always" scrollbars="vertical" style={{ height: "100%" }}>
						<Box
							px="4"
							py="4"
							style={{
								width: "100%",
								minWidth: "100%",
								boxSizing: "border-box",
								maxWidth: showPreview ? "none" : 960,
								margin: "0 auto",
							}}
						>
							{reviewLines.length === 0 ? (
								<Flex
									direction="column"
									align="center"
									justify="center"
									py="9"
									gap="3"
									style={{ textAlign: "center" }}
								>
									<Flex
										align="center"
										justify="center"
										style={{
											width: 64,
											height: 64,
											borderRadius: 32,
											backgroundColor: "var(--gray-a3)",
											color: "var(--gray-10)",
										}}
									>
										<Flag20Regular style={{ width: 32, height: 32 }} />
									</Flex>
									<Heading size="4">
										{t("ttmlReview.emptyPromptTitle", "Ready to review TTML")}
									</Heading>
									<Text size="2" color="gray" style={{ maxWidth: 420 }}>
										{t(
											"ttmlReview.emptyPromptDesc",
											"Load the current lyrics from the editor or open any TTML file to start proofreading, raising flags, and exporting to Discord.",
										)}
									</Text>
									<Flex gap="3" mt="2">
										<Button
											size="2"
											variant="solid"
											color="indigo"
											onClick={loadCurrentProject}
										>
											<Sparkle16Regular />
											{t("ttmlReview.loadCurrentProject", "Review Current Project")}
										</Button>
										<Button
											size="2"
											variant="soft"
											onClick={() => fileInputRef.current?.click()}
										>
											<FolderOpen16Regular />
											{t("ttmlReview.chooseFile", "Choose TTML File")}
										</Button>
									</Flex>
								</Flex>
							) : (
								<Flex direction="column" gap="2">
									{/* Songwriters Card */}
									<Card
										size="1"
										style={{
											marginBottom: 4,
											padding: "10px 14px",
											backgroundColor:
												writerFlags.length > 0
													? "var(--red-a2)"
													: "var(--color-panel, var(--gray-a2))",
											border:
												writerFlags.length > 0
													? "1px solid var(--red-a6)"
													: "1px solid var(--gray-a4)",
											borderLeft:
												writerFlags.length > 0
													? "4px solid var(--red-9)"
													: undefined,
											borderRadius: "var(--global-radius, var(--radius-3))",
											boxShadow:
												"var(--base-card-surface-box-shadow, 0 1px 3px rgba(0,0,0,0.1))",
										}}
									>
										<Flex justify="between" align="center" wrap="wrap" gap="2">
											<Flex align="center" gap="2" wrap="wrap">
												<Text size="1" color="gray" weight="bold">
													{t("ttmlReview.songwriters", "SONGWRITERS:")}
												</Text>
												{trackInfo?.songwriters &&
												trackInfo.songwriters.length > 0 ? (
													trackInfo.songwriters.map((writer, wIdx) => {
														const writerFlag = flags.find(
															(f) =>
																(f.targetType === "writer" ||
																	f.lineIndex < 0) &&
																(f.writerName === writer ||
																	f.quotedText === writer),
														);
														return (
															<Badge
																key={wIdx}
																size="2"
																variant={writerFlag ? "solid" : "surface"}
																color={writerFlag ? "red" : "gray"}
																style={{
																	cursor: "pointer",
																	fontFamily:
																		"var(--editor-font-family, inherit)",
																}}
																onClick={() =>
																	openWriterFlagSheet(writer, writerFlag)
																}
																title={
																	writerFlag
																		? `${getFlagLabel(writerFlag)}: ${
																				writerFlag.notes ||
																				writerFlag.autoNote ||
																				"Flagged"
																			}`
																		: t(
																				"ttmlReview.clickToFlagWriter",
																				"Click to flag this writer",
																			)
																}
															>
																{writerFlag && (
																	<Warning16Filled
																		style={{
																			width: 12,
																			height: 12,
																			marginRight: 4,
																		}}
																	/>
																)}
																{writer}
															</Badge>
														);
													})
												) : (
													<Text
														size="1"
														color="gray"
														style={{ fontStyle: "italic" }}
													>
														{t(
															"ttmlReview.noWritersListed",
															"None listed in TTML metadata",
														)}
													</Text>
												)}
											</Flex>

											<Flex align="center" gap="2">
												{writerFlags.length > 0 && (
													<Badge color="red" size="1" variant="soft">
														<Warning16Filled
															style={{ width: 12, height: 12 }}
														/>
														{writerFlags.length}{" "}
														{writerFlags.length === 1 ? "flag" : "flags"}
													</Badge>
												)}
												<Button
													size="1"
													variant="ghost"
													color="gray"
													onClick={() => openWriterFlagSheet("", undefined)}
													style={{ cursor: "pointer", fontSize: 11 }}
												>
													<Flag20Regular
														style={{ width: 13, height: 13 }}
													/>
													{t("ttmlReview.flagWriter", "Flag Writer...")}
												</Button>
											</Flex>
										</Flex>

										{/* Inline Writer Flags Display */}
										{writerFlags.length > 0 && (
											<Flex direction="column" gap="1" mt="2">
												{writerFlags.map((flag) => (
													<Card
														key={flag.id}
														size="1"
														style={{
															backgroundColor: "var(--red-a2)",
															border: "1px solid var(--red-a5)",
															borderRadius: "var(--radius-2)",
															padding: "6px 10px",
															textAlign: "left",
														}}
													>
														<Flex
															justify="between"
															align="center"
															gap="2"
														>
															<Flex
																align="center"
																gap="2"
																wrap="wrap"
															>
																<Badge
																	color="red"
																	size="1"
																	variant="solid"
																>
																	{getFlagLabel(flag)}
																</Badge>
																<Text
																	size="1"
																	weight="bold"
																	style={{
																		color: "var(--red-11)",
																		fontFamily:
																			"var(--editor-font-family, inherit)",
																	}}
																>
																	"
																	{flag.writerName ||
																		flag.quotedText ||
																		"Songwriter"}
																	"
																</Text>
																{(flag.notes || flag.autoNote) && (
																	<Text
																		size="1"
																		color="gray"
																		style={{ fontStyle: "italic" }}
																	>
																		({flag.notes || flag.autoNote})
																	</Text>
																)}
															</Flex>
															<Flex align="center" gap="1">
																<Button
																	size="1"
																	variant="ghost"
																	color="gray"
																	onClick={() =>
																		openWriterFlagSheet(
																			flag.writerName || flag.quotedText,
																			flag,
																		)
																	}
																>
																	{t("common.edit", "Edit")}
																</Button>
																<Button
																	size="1"
																	variant="ghost"
																	color="red"
																	onClick={() => handleDeleteFlag(flag.id)}
																>
																	{t("common.remove", "Remove")}
																</Button>
															</Flex>
														</Flex>
													</Card>
												))}
											</Flex>
										)}
									</Card>

									{reviewLines.map((line, lineIdx) => {
										const hasFlag = flaggedLineIndices.has(lineIdx);
										const isPlaying = activePlayingLineIndex === lineIdx;
										const isDuet = !!line.isDuet;
										const lineFlags = flags.filter(
											(f) => f.lineIndex === lineIdx,
										);

										const isThisLineSelected =
											selectedSection?.lineIndex === lineIdx;
										const selectedWordsList = isThisLineSelected
											? (line.words || [])
													.slice(
														selectedSection.startIndex,
														selectedSection.endIndex + 1,
													)
													.filter((w) => w.word.trim().length > 0)
											: [];
										const selectedWordCount = selectedWordsList.length;

										return (
											<Box
												key={line.id}
												ref={isPlaying ? activeLineRef : undefined}
												style={{
													fontFamily: "var(--editor-font-family, inherit)",
													position: "relative",
													padding: "10px 14px",
													borderRadius: "var(--global-radius, var(--radius-3))",
													backgroundColor: isPlaying
														? "var(--accent-a3)"
														: hasFlag
															? "var(--red-a2)"
															: "var(--color-panel, var(--gray-a2))",
													border: isPlaying
														? "1px solid var(--accent-a8)"
														: hasFlag
															? "1px solid var(--red-a6)"
															: "1px solid var(--gray-a4)",
													borderLeft:
														!isDuet && hasFlag
															? "4px solid var(--red-9)"
															: undefined,
													borderRight:
														isDuet && hasFlag
															? "4px solid var(--red-9)"
															: undefined,
													boxShadow: isPlaying
														? "0 0 8px var(--accent-a4)"
														: "var(--base-card-surface-box-shadow, 0 1px 3px rgba(0,0,0,0.1))",
													marginLeft:
														isDuet && hasAnyDuetLines ? "18%" : undefined,
													marginRight:
														!isDuet && hasAnyDuetLines ? "18%" : undefined,
													transition:
														"background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
												}}
											>
												{/* Line Header: Timing, Line #, Voice badges, Flag Line button */}
												<Flex justify="between" align="center" mb="2">
													<Flex align="center" gap="2">
														<Button
															size="1"
															variant="surface"
															color={isPlaying ? "accent" : "gray"}
															style={{
																fontVariantNumeric: "tabular-nums",
																fontSize: 11,
																padding: "2px 8px",
																borderRadius: "var(--radius-2)",
																cursor: "pointer",
															}}
															onClick={() => seekToLine(line)}
															title={t(
																"ttmlReview.playFromHere",
																"Seek & play from this line",
															)}
														>
															<Play12Filled />
															{formatTimestampClock(line.startTime)}
														</Button>

														<Badge
															size="1"
															variant="soft"
															color="gray"
															style={{
																cursor: "pointer",
																fontSize: 10,
																fontVariantNumeric: "tabular-nums",
															}}
															onClick={() => jumpToEditorLine(lineIdx)}
															title={t(
																"ttmlReview.editInEditor",
																"Jump to this line in Editor",
															)}
														>
															#{line.lineNumber}
														</Badge>

														{line.isBg && (
															<Badge size="1" color="gray" variant="surface">
																BG
															</Badge>
														)}
														{line.voice &&
															line.voice !== "v1" &&
															line.voice !== "v2" && (
																<Badge size="1" color="blue" variant="surface">
																	{line.voice}
																</Badge>
															)}
													</Flex>

													<Flex align="center" gap="1">
														{hasFlag && (
															<Badge size="1" color="red" variant="soft">
																<Warning16Filled style={{ width: 12, height: 12 }} />
																{lineFlags.length}{" "}
																{lineFlags.length === 1 ? "flag" : "flags"}
															</Badge>
														)}
														{isThisLineSelected && selectedWordCount > 0 && (
															<Tooltip
																content={t(
																	"ttmlReview.flagSelectionTooltip",
																	"Flag currently selected words",
																)}
															>
																<Button
																	size="1"
																	variant="solid"
																	color="red"
																	style={{ cursor: "pointer", fontSize: 11 }}
																	onClick={() => {
																		const matchingFlag = lineFlags.find(
																			(f) =>
																				(selectedSection.startIndex >=
																					f.startWordIndex &&
																					selectedSection.endIndex <=
																						f.endWordIndex) ||
																				(f.startWordIndex >=
																					selectedSection.startIndex &&
																					f.endWordIndex <=
																						selectedSection.endIndex),
																		);
																		openFlagSheet(
																			lineIdx,
																			selectedSection.startIndex,
																			selectedSection.endIndex,
																			matchingFlag,
																		);
																	}}
																>
																	<Flag20Regular
																		style={{ width: 13, height: 13 }}
																	/>
																	{selectedSection.startIndex ===
																	selectedSection.endIndex
																		? t(
																				"ttmlReview.flagSelectedWord",
																				"Flag Selected Word",
																			)
																		: t(
																				"ttmlReview.flagSelectedSection",
																				`Flag Selected (${selectedWordCount} words)`,
																			)}
																</Button>
															</Tooltip>
														)}
														<Tooltip
															content={t(
																"ttmlReview.flagLine",
																"Flag entire line",
															)}
														>
															<Button
																size="1"
																variant="ghost"
																color="gray"
																style={{ cursor: "pointer", fontSize: 11 }}
																onClick={() =>
																	openFlagSheet(
																		lineIdx,
																		0,
																		Math.max(
																			0,
																			(line.words?.length || 1) - 1,
																		),
																	)
																}
															>
																<Flag20Regular
																	style={{ width: 13, height: 13 }}
																/>
																{t("ttmlReview.flagLineShort", "Flag Line")}
															</Button>
														</Tooltip>
													</Flex>
												</Flex>

												{/* Words List with Chip Aesthetic */}
												<Flex
													wrap="wrap"
													align="center"
													justify={isDuet ? "end" : "start"}
													gap="1"
													onMouseMove={handleContainerMouseMove}
													style={{
														fontSize: `${15 * zoom}px`,
														lineHeight: 1.6,
														padding: "4px 0",
													}}
												>
													<LineWordsList
														line={line}
														lineIdx={lineIdx}
														lineFlags={lineFlags}
														isPlaying={isPlaying}
														isAudioPlaying={isAudioPlaying}
														selectedSection={selectedSection}
														handleWordMouseDown={handleWordMouseDown}
														handleWordMouseEnter={handleWordMouseEnter}
														openFlagSheet={openFlagSheet}
														t={t}
													/>
												</Flex>

												{/* Inline Diagnostic Flags Display */}
												{lineFlags.length > 0 && (
													<Flex
														direction="column"
														gap="1"
														mt="2"
														style={{ maxWidth: "100%" }}
													>
														{lineFlags.map((flag) => (
															<Card
																key={flag.id}
																size="1"
																style={{
																	backgroundColor: "var(--red-a2)",
																	border: "1px solid var(--red-a5)",
																	borderRadius: "var(--radius-2)",
																	padding: "6px 10px",
																	textAlign: "left",
																}}
															>
																<Flex
																	justify="between"
																	align="center"
																	gap="2"
																>
																	<Flex
																		align="center"
																		gap="2"
																		wrap="wrap"
																	>
																		<Badge
																			color="red"
																			size="1"
																			variant="solid"
																		>
																			{getFlagLabel(flag.tpl)}
																		</Badge>
																		<Text
																			size="1"
																			weight="bold"
																			style={{
																				color: "var(--red-11)",
																				fontFamily:
																					"var(--editor-font-family, inherit)",
																			}}
																		>
																			"{flag.quotedText}"
																		</Text>
																		{(flag.notes || flag.autoNote) && (
																			<Text
																				size="1"
																				color="gray"
																				style={{
																					fontStyle: "italic",
																				}}
																			>
																				({flag.notes || flag.autoNote})
																			</Text>
																		)}
																	</Flex>
																	<Flex align="center" gap="1">
																		<Button
																			size="1"
																			variant="ghost"
																			color="gray"
																			onClick={() =>
																				openFlagSheet(
																					lineIdx,
																					flag.startWordIndex,
																					flag.endWordIndex,
																					flag,
																				)
																			}
																		>
																			{t("common.edit", "Edit")}
																		</Button>
																		<Button
																			size="1"
																			variant="ghost"
																			color="red"
																			onClick={() =>
																				handleDeleteFlag(flag.id)
																			}
																		>
																			{t("common.remove", "Remove")}
																		</Button>
																	</Flex>
																</Flex>
															</Card>
														))}
													</Flex>
												)}

												{/* Optional Romaji line */}
												{showRomaji && line.roman && (
													<Text
														size="1"
														color="gray"
														style={{
															fontStyle: "italic",
															opacity: 0.75,
															display: "block",
															marginTop: 4,
															textAlign: isDuet ? "right" : "left",
															fontFamily:
																"var(--editor-font-family, inherit)",
														}}
													>
														{line.roman}
													</Text>
												)}
											</Box>
										);
									})}
								</Flex>
							)}
						</Box>
					</ScrollArea>
				</Box>

				{/* Right side: Live Preview */}
				{showPreview && (
					<ResizablePanel
						widthAtom={ttmlReviewPreviewWidthAtom}
						minWidth={300}
						maxWidth={900}
					>
						<div
							style={{
								width: "100%",
								height: "100%",
								position: "relative",
								overflow: "hidden",
								backgroundColor: "var(--color-panel-solid, #0b0b0d)",
							}}
						>
							<PreviewModeSwitcher
								isPanel
								lyricsOverride={activePreviewLyrics}
							/>
						</div>
					</ResizablePanel>
				)}
			</Flex>

			{/* Hidden File Inputs */}
			<input
				type="file"
				ref={fileInputRef}
				accept=".ttml,.xml,application/xml,text/xml"
				style={{ display: "none" }}
				onChange={handleFileSelect}
			/>

			{/* Flag Edit Sheet */}
			<FlagEditSheet
				isOpen={flagSheetOpen}
				onClose={() => setFlagSheetOpen(false)}
				onSave={handleSaveFlag}
				onDelete={handleDeleteFlag}
				initialFlag={editingFlag}
				quotedText={activeQuotedText}
				lineIndex={activeLineIndex}
				startWordIndex={activeStartWordIndex}
				endWordIndex={activeEndWordIndex}
				lineWords={reviewLines[activeLineIndex]?.words}
				targetType={activeTargetType}
				writerName={activeWriterName}
				availableWriters={trackInfo?.songwriters || []}
			/>
		</Box>
	);
};

export default TTMLReviewView;
