/*
 * Copyright 2023-2025 Steve Xiao (stevexmh@qq.com) and contributors.
 *
 * 本源代码文件是属于 AMLL TTML Tool 项目的一部分。
 * This source code file is a part of AMLL TTML Tool project.
 * 本项目的源代码的使用受到 GNU GENERAL PUBLIC LICENSE version 3 许可证的约束，具体可以参阅以下链接。
 * Use of this source code is governed by the GNU GPLv3 license that can be found through the following link.
 *
 * https://github.com/bobjoerules/AMLL-TTML-TOOL/blob/main/LICENSE
 */

import {
	ArrowDownload24Regular,
	BookOpen24Regular,
	Cloud24Regular,
	DocumentBulletList24Regular,
	FolderOpen24Regular,
	MyLocation24Regular,
} from "@fluentui/react-icons";
import {
	Box,
	Button,
	Card,
	ContextMenu,
	Flex,
	IconButton,
	Text,
} from "@radix-ui/themes";
import { atom, useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { splitAtom } from "jotai/utils";
import { useSetImmerAtom } from "jotai-immer";
import { focusAtom } from "jotai-optics";
import {
	type FC,
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { ViewportList, type ViewportListRef } from "react-viewport-list";
import { useFileOpener } from "$/hooks/useFileOpener";
import { audioPlayingAtom, currentTimeAtom } from "$/modules/audio/states";
import {
	cloudFileManagerInitialTabAtom,
	cloudFileManagerOpenAtom,
	currentUserAtom,
} from "$/modules/cloud/states";
import {
	guideExportedAtom,
	guidePanelOpenAtom,
	guideStepAtom,
	guideWelcomeOpenAtom,
} from "$/modules/onboarding/states";
import {
	geniusCategorizationEnabledAtom,
	geniusHeaderDetectionDialogOpenAtom,
	geniusHeaderDetectionDialogShownAtom,
	wrapLyricLinesAtom,
	keepPlayingWordInViewAtom,
} from "$/modules/settings/states/index.ts";
import {
	importLyricsChooserDialogAtom,
	openAccountSettingsAtom,
	ttmlChecklistDialogAtom,
} from "$/states/dialogs";
import { hasCustomBackgroundAtom } from "$/modules/settings/modals/customBackground";
import {
	collapsedSectionIdsAtom,
	lastVisibleLineIndexAtom,
	lyricLinesAtom,
	selectedLinesAtom,
	selectedWordsAtom,
	ToolMode,
	toolModeAtom,
} from "$/states/main.ts";
import type { LyricLine } from "$/types/ttml.ts";
import { repairSectionIntegrity } from "../utils/section-system.ts";
import {
	clampScrollTop,
	DRAG_SCROLL_SPEED,
	getDragScrollDirection,
	normalizeWheelDelta,
} from "./drag-scroll";
import styles from "./index.module.css";
import {
	type ContextMenuTarget,
	LyricEditorContextMenuContent,
} from "./lyric-editor-context-menu";
import { LyricLineView } from "./lyric-line-view";
import {
	draggingIdAtom,
	lastLineDragEndAtom,
	lineDragAtom,
	timeLineEditorAtom,
	timingCopyPlacementAtom,
} from "./lyric-line-view-states";
import { LyricWordSettingsProvider } from "./lyric-word-settings-context";
import {
	CategorizeSelectionDialog,
	SectionManagerDialog,
	SectionMetadataDialog,
} from "./SectionActions";
import {
	findCurrentLineIndex,
	getActiveLineIndex,
	isLineVisibleInViewport,
	shouldAutoCenterSelection,
} from "./selection-scroll";

const lyricLinesOnlyAtom = splitAtom(
	focusAtom(lyricLinesAtom, (o) => o.prop("lyricLines")),
);

export const LyricLinesView: FC = forwardRef<HTMLDivElement>((_props, ref) => {
	const editLyric = useAtomValue(lyricLinesOnlyAtom);
	const store = useStore();
	const viewRef = useRef<ViewportListRef>(null);
	const viewElRef = useRef<HTMLDivElement>(null);
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const toolMode = useAtomValue(toolModeAtom);
	const setTimeLineEditor = useSetAtom(timeLineEditorAtom);
	const wrapLyricLines = useAtomValue(wrapLyricLinesAtom);
	const { t } = useTranslation();
	const setGuideWelcome = useSetAtom(guideWelcomeOpenAtom);
	const setGuidePanel = useSetAtom(guidePanelOpenAtom);
	const setGuideStep = useSetAtom(guideStepAtom);
	const setGuideExported = useSetAtom(guideExportedAtom);
	const setImportChooser = useSetAtom(importLyricsChooserDialogAtom);
	const setTtmlChecklist = useSetAtom(ttmlChecklistDialogAtom);
	const { openFile } = useFileOpener();
	const user = useAtomValue(currentUserAtom);
	const setFileManagerOpen = useSetAtom(cloudFileManagerOpenAtom);
	const setFileManagerTab = useSetAtom(cloudFileManagerInitialTabAtom);
	const openAccountSettings = useSetAtom(openAccountSettingsAtom);

	const openCloudLyrics = useCallback(() => {
		if (user) {
			setFileManagerTab("open");
			setFileManagerOpen(true);
		} else {
			openAccountSettings();
		}
	}, [user, setFileManagerOpen, setFileManagerTab, openAccountSettings]);

	const openExistingTtml = useCallback(() => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".ttml,*/*";
		input.addEventListener(
			"change",
			() => {
				const file = input.files?.[0];
				if (file) openFile(file);
			},
			{ once: true },
		);
		input.click();
	}, [openFile]);

	const [timingCopyPlacement, setTimingCopyPlacement] = useAtom(
		timingCopyPlacementAtom,
	);

	useEffect(() => {
		if (!timingCopyPlacement) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setTimingCopyPlacement(null);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [timingCopyPlacement, setTimingCopyPlacement]);

	useEffect(() => {
		if (toolMode === ToolMode.Preview) {
			store.set(timingCopyPlacementAtom, null);
		}
	}, [store, toolMode]);

	useEffect(() => {
		if (toolMode !== ToolMode.Sync) setTimeLineEditor(null);
	}, [toolMode, setTimeLineEditor]);

	useEffect(() => {
		const viewEl = viewElRef.current;
		if (editLyric.length === 0 || !viewEl || toolMode !== ToolMode.Edit) return;

		let pointer: { x: number; y: number } | null = null;
		let animationFrame: number | null = null;
		let lastFrameTime: number | null = null;
		let dropTarget: { element: HTMLElement; insertAfter: boolean } | null =
			null;
		let dragPreview: HTMLElement | null = null;

		const updateDragPreview = () => {
			if (!dragPreview || !pointer) return;
			dragPreview.style.transform = `translate(${pointer.x + 16}px, ${pointer.y + 16}px)`;
		};

		const clearDragPreview = () => {
			dragPreview?.remove();
			dragPreview = null;
		};

		const showDragPreview = (dragId: string) => {
			const lines = store.get(lyricLinesAtom).lyricLines;
			const lineIndex = lines.findIndex((candidate) => candidate.id === dragId);
			const line = lines[lineIndex];
			if (!line || lineIndex < 0) return;
			dragPreview = document.createElement("div");
			dragPreview.className = styles.dragPreview;
			dragPreview.setAttribute("aria-hidden", "true");
			const lineNumber = document.createElement("span");
			lineNumber.className = styles.dragPreviewNumber;
			lineNumber.textContent = String(
				lines
					.slice(0, lineIndex + 1)
					.filter((candidate, index) => (index === 0 ? true : !candidate.isBG))
					.length,
			);
			const lyricText = document.createElement("span");
			lyricText.className = styles.dragPreviewText;
			lyricText.textContent =
				line.words.map((word) => word.word).join("") || "…";
			dragPreview.append(lineNumber, lyricText);
			const selectedCount = store.get(selectedLinesAtom).size;
			if (selectedCount > 1) {
				dragPreview.dataset.lineCount = String(selectedCount);
			}
			document.body.append(dragPreview);
			updateDragPreview();
		};

		const clearDropTarget = () => {
			if (!dropTarget) return;
			dropTarget.element.classList.remove(styles.dropTop, styles.dropBottom);
			dropTarget = null;
		};

		const stopScrolling = () => {
			pointer = null;
			lastFrameTime = null;
			if (animationFrame !== null) {
				cancelAnimationFrame(animationFrame);
				animationFrame = null;
			}
		};

		const updateDropTarget = () => {
			const drag = store.get(lineDragAtom);
			if (!drag?.isDragging || !pointer) {
				clearDropTarget();
				return;
			}
			const element = document
				.elementFromPoint(pointer.x, pointer.y)
				?.closest<HTMLElement>("[data-lyric-line-id]");
			const selectedLines = store.get(selectedLinesAtom);
			if (
				!element ||
				element.dataset.lyricLineId === drag.id ||
				selectedLines.has(element.dataset.lyricLineId ?? "")
			) {
				clearDropTarget();
				return;
			}
			const insertAfter =
				pointer.y >=
				element.getBoundingClientRect().top + element.clientHeight / 2;
			if (
				dropTarget?.element === element &&
				dropTarget.insertAfter === insertAfter
			)
				return;
			clearDropTarget();
			element.classList.toggle(styles.dropTop, !insertAfter);
			element.classList.toggle(styles.dropBottom, insertAfter);
			dropTarget = { element, insertAfter };
		};

		const scrollWhileDragging = (timestamp: number) => {
			animationFrame = null;
			const drag = store.get(lineDragAtom);
			if (!drag?.isDragging || !pointer) return;

			const direction = getDragScrollDirection(
				pointer.y,
				viewEl.getBoundingClientRect(),
			);
			if (direction !== 0 && lastFrameTime !== null) {
				const elapsedSeconds = (timestamp - lastFrameTime) / 1000;
				const maxScrollTop = viewEl.scrollHeight - viewEl.clientHeight;
				viewEl.scrollTop = clampScrollTop(
					viewEl.scrollTop,
					direction * DRAG_SCROLL_SPEED * elapsedSeconds,
					maxScrollTop,
				);
			}

			lastFrameTime = timestamp;
			updateDropTarget();
			if (direction !== 0) {
				animationFrame = requestAnimationFrame(scrollWhileDragging);
			}
		};

		const ensureScrolling = () => {
			if (animationFrame !== null) return;
			animationFrame = requestAnimationFrame(scrollWhileDragging);
		};

		const scrollWithWheel = (event: WheelEvent) => {
			if (!store.get(lineDragAtom)?.isDragging || event.deltaY === 0) return;
			const computedLineHeight = Number.parseFloat(
				getComputedStyle(viewEl).lineHeight,
			);
			const lineHeight = Number.isFinite(computedLineHeight)
				? computedLineHeight
				: 16;
			const delta = normalizeWheelDelta(
				event.deltaY,
				event.deltaMode,
				lineHeight,
				viewEl.clientHeight,
			);
			const maxScrollTop = viewEl.scrollHeight - viewEl.clientHeight;
			viewEl.scrollTop = clampScrollTop(viewEl.scrollTop, delta, maxScrollTop);
			event.preventDefault();
		};

		const cleanupActiveDragListeners = () => {
			window.removeEventListener("pointermove", updatePointer, true);
			window.removeEventListener("pointerup", finishDragging, true);
			window.removeEventListener("pointercancel", finishDragging, true);
			window.removeEventListener("wheel", scrollWithWheel, true);
			window.removeEventListener("blur", handleWindowBlur);
		};

		const updatePointer = (event: PointerEvent) => {
			const drag = store.get(lineDragAtom);
			if (!drag || drag.pointerId !== event.pointerId) return;
			if (!drag.isDragging) {
				if (
					Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) <
					5
				)
					return;
				store.set(lineDragAtom, { ...drag, isDragging: true });
				store.set(draggingIdAtom, drag.id);
				showDragPreview(drag.id);
			}
			event.preventDefault();
			pointer = { x: event.clientX, y: event.clientY };
			updateDragPreview();
			updateDropTarget();
			ensureScrolling();
		};

		const startPointerDrag = (event: PointerEvent) => {
			if (!event.isPrimary || event.button !== 0) return;
			const target = event.target;
			if (!(target instanceof Element)) return;
			const lineElement = target.closest<HTMLElement>("[data-lyric-line-id]");
			if (
				target.closest(
					"input, [data-lyric-word-interactive], [data-lyric-line-interactive]",
				)
			)
				return;
			const lineId = lineElement?.dataset.lyricLineId;
			if (!lineElement || !lineId || !viewEl.contains(lineElement)) return;
			lineElement.setPointerCapture(event.pointerId);
			store.set(lineDragAtom, {
				id: lineId,
				pointerId: event.pointerId,
				startX: event.clientX,
				startY: event.clientY,
				isDragging: false,
			});

			window.addEventListener("pointermove", updatePointer, true);
			window.addEventListener("pointerup", finishDragging, true);
			window.addEventListener("pointercancel", finishDragging, true);
			window.addEventListener("wheel", scrollWithWheel, {
				capture: true,
				passive: false,
			});
			window.addEventListener("blur", handleWindowBlur);
		};

		const finishDragging = (event?: PointerEvent) => {
			const drag = store.get(lineDragAtom);
			if (!drag || (event && drag.pointerId !== event.pointerId)) return;
			if (drag.isDragging && dropTarget) {
				const targetId = dropTarget.element.dataset.lyricLineId;
				const insertAfter = dropTarget.insertAfter;
				const selectedLines = store.get(selectedLinesAtom);
				const selectedLineIds = selectedLines.has(drag.id)
					? selectedLines
					: new Set([drag.id]);
				editLyricLines((state) => {
					const filteredLines = state.lyricLines.filter(
						(line) => !selectedLineIds.has(line.id),
					);
					const targetLines = state.lyricLines.filter((line) =>
						selectedLineIds.has(line.id),
					);
					const targetIndex = filteredLines.findIndex(
						(line) => line.id === targetId,
					);
					if (targetIndex < 0) return;
					const insertionIndex = targetIndex + Number(insertAfter);
					state.lyricLines = [
						...filteredLines.slice(0, insertionIndex),
						...targetLines,
						...filteredLines.slice(insertionIndex),
					];
					repairSectionIntegrity(state);
				});
			}
			clearDropTarget();
			clearDragPreview();
			if (drag.isDragging) store.set(lastLineDragEndAtom, Date.now());
			store.set(lineDragAtom, null);
			store.set(draggingIdAtom, "");
			stopScrolling();
			cleanupActiveDragListeners();
		};

		const handleWindowBlur = () => finishDragging();

		window.addEventListener("pointerdown", startPointerDrag, true);

		return () => {
			finishDragging();
			window.removeEventListener("pointerdown", startPointerDrag, true);
			cleanupActiveDragListeners();
		};
	}, [editLyric.length, editLyricLines, store, toolMode]);

	const lastScrolledIndexRef = useRef<number | undefined>(undefined);
	const lyricLines = useAtomValue(lyricLinesAtom).lyricLines;
	const collapsedSections = useAtomValue(collapsedSectionIdsAtom);
	const visibleItems = useMemo(
		() =>
			editLyric
				.map((lineAtom, sourceIndex) => ({
					lineAtom,
					sourceIndex,
					line: lyricLines[sourceIndex],
				}))
				.filter(
					({ line, sourceIndex }) =>
						!line?.sectionId ||
						!collapsedSections.has(line.sectionId) ||
						lyricLines.findIndex(
							(candidate) => candidate.sectionId === line.sectionId,
						) === sourceIndex,
				),
		[editLyric, lyricLines, collapsedSections],
	);

	const visibleItemsRef = useRef(visibleItems);
	visibleItemsRef.current = visibleItems;
	const lyricLinesRef = useRef(lyricLines);
	lyricLinesRef.current = lyricLines;

	const scrollToLineIndex = useCallback((index: number) => {
		const viewEl = viewElRef.current;
		if (!viewEl) return;
		const viewContainerEl = viewEl.parentElement;
		if (!viewContainerEl) return;
		const currentVisibleItems = visibleItemsRef.current;
		const currentLyricLines = lyricLinesRef.current;
		let visibleIndex = currentVisibleItems.findIndex(
			(item) => item.sourceIndex === index,
		);
		if (visibleIndex === -1) {
			const targetLine = currentLyricLines[index];
			if (targetLine?.sectionId) {
				visibleIndex = currentVisibleItems.findIndex(
					(item) => item.line?.sectionId === targetLine.sectionId,
				);
			}
		}
		if (visibleIndex === -1) return;
		viewRef.current?.scrollToIndex({
			index: visibleIndex,
			offset: viewContainerEl.clientHeight / -2 + 50,
		});
	}, []);

	const initialTargetIndex = useMemo(() => {
		const selectedLines = store.get(selectedLinesAtom);
		const selectedWords = store.get(selectedWordsAtom);
		const currentTime = store.get(currentTimeAtom);
		const fallback = store.get(lastVisibleLineIndexAtom);
		return getActiveLineIndex({
			lyricLines,
			selectedLines,
			selectedWords,
			currentTime,
			fallbackIndex: fallback,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const initialVisibleIndex = useMemo(() => {
		if (initialTargetIndex === -1) return undefined;
		let idx = visibleItems.findIndex(
			(item) => item.sourceIndex === initialTargetIndex,
		);
		if (idx === -1) {
			const targetLine = lyricLines[initialTargetIndex];
			if (targetLine?.sectionId) {
				idx = visibleItems.findIndex(
					(item) => item.line?.sectionId === targetLine.sectionId,
				);
			}
		}
		return idx >= 0 ? idx : undefined;
	}, [initialTargetIndex, visibleItems, lyricLines]);

	const viewportRangeRef = useRef<[number, number]>([-1, -1]);
	const setLastVisibleLineIndex = useSetAtom(lastVisibleLineIndexAtom);

	const handleViewportIndexesChange = useCallback(
		([start, end]: [number, number]) => {
			viewportRangeRef.current = [start, end];
			if (start >= 0 && start < visibleItems.length) {
				const item = visibleItems[start];
				if (item) {
					setLastVisibleLineIndex(item.sourceIndex);
				}
			}
		},
		[visibleItems, setLastVisibleLineIndex],
	);

	const hasInitialScrolledRef = useRef(false);
	useEffect(() => {
		if (!hasInitialScrolledRef.current && initialTargetIndex >= 0) {
			hasInitialScrolledRef.current = true;
			lastScrolledIndexRef.current = initialTargetIndex;
			scrollToLineIndex(initialTargetIndex);
			const timer = setTimeout(() => {
				scrollToLineIndex(initialTargetIndex);
			}, 50);
			return () => clearTimeout(timer);
		}
	}, [initialTargetIndex, scrollToLineIndex]);

	const prevToolModeRef = useRef(toolMode);
	useEffect(() => {
		if (prevToolModeRef.current !== toolMode) {
			prevToolModeRef.current = toolMode;
			lastScrolledIndexRef.current = undefined;
			const selectedLines = store.get(selectedLinesAtom);
			const selectedWords = store.get(selectedWordsAtom);
			const currentTime = store.get(currentTimeAtom);
			const fallback = store.get(lastVisibleLineIndexAtom);
			const targetIndex = getActiveLineIndex({
				lyricLines: lyricLinesRef.current,
				selectedLines,
				selectedWords,
				currentTime,
				fallbackIndex: fallback,
			});
			if (targetIndex >= 0) {
				lastScrolledIndexRef.current = targetIndex;
				scrollToLineIndex(targetIndex);
				const timer = setTimeout(() => {
					scrollToLineIndex(targetIndex);
				}, 50);
				return () => clearTimeout(timer);
			}
		}
	}, [toolMode, store, scrollToLineIndex]);

	const selectedLines = useAtomValue(selectedLinesAtom);
	const selectedLineIndex = useMemo(() => {
		if (selectedLines.size === 0) return -1;
		return lyricLines.findIndex((l) => selectedLines.has(l.id));
	}, [selectedLines, lyricLines]);

	const prevSelectedLineIndexRef = useRef<number>(-1);
	useEffect(() => {
		if (selectedLineIndex === -1) {
			prevSelectedLineIndexRef.current = -1;
			return;
		}
		if (selectedLineIndex === prevSelectedLineIndexRef.current) return;
		prevSelectedLineIndexRef.current = selectedLineIndex;

		if (shouldAutoCenterSelection(toolMode)) {
			if (selectedLineIndex === lastScrolledIndexRef.current) return;
			lastScrolledIndexRef.current = selectedLineIndex;
			scrollToLineIndex(selectedLineIndex);
		} else if (toolMode === ToolMode.Edit) {
			const isVisible = isLineVisibleInViewport(
				selectedLineIndex,
				viewportRangeRef.current,
			);
			if (!isVisible) {
				lastScrolledIndexRef.current = selectedLineIndex;
				scrollToLineIndex(selectedLineIndex);
			}
		}
	}, [selectedLineIndex, toolMode, scrollToLineIndex]);

	const geniusCategorizationEnabled = useAtomValue(
		geniusCategorizationEnabledAtom,
	);
	const dialogShown = useAtomValue(geniusHeaderDetectionDialogShownAtom);
	const [, setDetectionDialogOpen] = useAtom(
		geniusHeaderDetectionDialogOpenAtom,
	);
	const hasCustomBackground = useAtomValue(hasCustomBackgroundAtom);

	useEffect(() => {
		if (dialogShown || geniusCategorizationEnabled) return;
		const hasHeader = lyricLines.some((line) =>
			/^\[(Chorus|Verse|Bridge|Intro|Outro|Pre-Chorus|Hook|Strofa|Refren|Skit|Interlude|Instrumental|Pre-Refren|Partea|Slofa|Section|Part|S\d+|V\d+|C\d+|Strophe|Refrain|Pont|Couplet|Refrain|Break).*?\]$/i.test(
				line.words.map((w) => w.word).join(""),
			),
		);
		if (hasHeader) {
			setDetectionDialogOpen(true);
		}
	}, [
		lyricLines,
		dialogShown,
		geniusCategorizationEnabled,
		setDetectionDialogOpen,
	]);

	const keepPlayingWordInView = useAtomValue(keepPlayingWordInViewAtom);
	const audioPlaying = useAtomValue(audioPlayingAtom);
	const currentPlayingLineIndexRef = useRef<number>(-1);

	useEffect(() => {
		if (!keepPlayingWordInView || !audioPlaying) {
			currentPlayingLineIndexRef.current = -1;
			return;
		}

		const handleTimeUpdate = () => {
			const currentTime = store.get(currentTimeAtom);
			const lyrics = store.get(lyricLinesAtom).lyricLines;
			const index = findCurrentLineIndex(lyrics, currentTime);
			if (index !== -1 && index !== currentPlayingLineIndexRef.current) {
				currentPlayingLineIndexRef.current = index;
				scrollToLineIndex(index);
			}
		};

		handleTimeUpdate();
		return store.sub(currentTimeAtom, handleTimeUpdate);
	}, [keepPlayingWordInView, audioPlaying, store, scrollToLineIndex]);

	const handleLocate = useCallback(() => {
		const currentTime = store.get(currentTimeAtom);
		const lyricLines = store.get(lyricLinesAtom).lyricLines;
		const index = findCurrentLineIndex(lyricLines, currentTime);
		if (index === -1) return;
		scrollToLineIndex(index);
	}, [store, scrollToLineIndex]);

	useImperativeHandle(ref, () => viewElRef.current as HTMLDivElement, []);

	const [contextMenuTarget, setContextMenuTarget] =
		useState<ContextMenuTarget | null>(null);

	const handleContextMenu = useCallback(
		(evt: React.MouseEvent) => {
			const target = evt.target as HTMLElement | null;
			if (!target) return;

			if (target.closest("input, textarea")) {
				evt.stopPropagation();
				return;
			}

			const lineEl = target.closest<HTMLElement>("[data-lyric-line-id]");
			if (!lineEl) {
				setContextMenuTarget(null);
				return;
			}

			const lineId = lineEl.dataset.lyricLineId!;
			const lineIndex = Number(lineEl.dataset.lyricLineIndex);

			const spaceEl = target.closest<HTMLElement>(
				"[data-lyric-space-placeholder]",
			);
			const wordEl = target.closest<HTMLElement>("[data-lyric-word-id]");

			if (spaceEl) {
				const wordIndex = Number(spaceEl.dataset.lyricWordIndex);
				setContextMenuTarget({ type: "space", lineIndex, wordIndex, lineId });
			} else if (wordEl) {
				const wordId = wordEl.dataset.lyricWordId!;
				const wordIndex = Number(wordEl.dataset.lyricWordIndex);
				setContextMenuTarget({
					type: "word",
					lineIndex,
					wordIndex,
					wordId,
					lineId,
				});

				const selectedWords = store.get(selectedWordsAtom);
				if (!selectedWords.has(wordId)) {
					store.set(selectedWordsAtom, new Set([wordId]));
					store.set(selectedLinesAtom, new Set([lineId]));
				}
			} else {
				setContextMenuTarget({ type: "line", lineIndex, lineId });
				const selectedLines = store.get(selectedLinesAtom);
				if (!selectedLines.has(lineId)) {
					store.set(selectedLinesAtom, new Set([lineId]));
				}
			}
		},
		[store],
	);

	if (editLyric.length === 0)
		return (
			<Flex
				data-guide-target="editor"
				flexGrow="1"
				gap="2"
				align="center"
				justify="center"
				direction="column"
				height="100%"
				ref={ref}
				style={{
					backgroundColor: hasCustomBackground
						? "transparent"
						: "var(--editor-bg, transparent)",
				}}
			>
				<Box
					style={{
						maxWidth: "520px",
						textAlign: "center",
						padding: "32px 24px",
						borderRadius: "var(--radius-4, 16px)",
						backgroundColor:
							"var(--color-panel-translucent, rgba(0, 0, 0, 0.2))",
						backdropFilter: "blur(var(--glass-blur, 16px))",
						WebkitBackdropFilter: "blur(var(--glass-blur, 16px))",
						border: "1px solid var(--gray-a4)",
					}}
				>
					<Flex direction="column" gap="3" align="center">
						<Text size="6" weight="bold">
							{t("app.empty.title", "No lyric lines")}
						</Text>
						<Text
							color="gray"
							size="2"
							align="center"
							style={{ maxWidth: "440px", lineHeight: "1.5" }}
						>
							{t(
								"app.empty.description",
								"Add new lyric lines in the top panel or open/import existing lyrics from the menu or cloud",
							)}
						</Text>
						<Flex gap="2" wrap="wrap" justify="center" mt="3">
							<Button
								variant="soft"
								onClick={() => {
									setGuideWelcome(false);
									setGuideExported(false);
									setGuideStep(0);
									setGuidePanel(true);
								}}
							>
								<BookOpen24Regular style={{ width: 16, height: 16 }} />
								{t("beginnerGuide.empty.start", "Start Guide")}
							</Button>
							<Button variant="soft" onClick={() => setImportChooser(true)}>
								<ArrowDownload24Regular style={{ width: 16, height: 16 }} />
								{t("beginnerGuide.empty.import", "Import Lyrics")}
							</Button>
							<Button variant="soft" onClick={() => setTtmlChecklist(true)}>
								<DocumentBulletList24Regular
									style={{ width: 16, height: 16 }}
								/>
								{t("ttmlChecklist.title", "TTML Checklist")}
							</Button>
							<Button variant="soft" onClick={openExistingTtml}>
								<FolderOpen24Regular style={{ width: 16, height: 16 }} />
								{t("beginnerGuide.empty.open", "Open TTML")}
							</Button>
							<Button variant="soft" onClick={openCloudLyrics}>
								<Cloud24Regular style={{ width: 16, height: 16 }} />
								{t("beginnerGuide.empty.cloud", "Open from Cloud")}
							</Button>
						</Flex>
					</Flex>
				</Box>
			</Flex>
		);
	return (
		<Flex
			data-guide-target="editor"
			direction="column"
			flexGrow="1"
			className={styles.lyricLinesWrapper}
		>
			<SectionMetadataDialog />
			<SectionManagerDialog />
			<CategorizeSelectionDialog />
			{timingCopyPlacement && (
				<Flex
					align="center"
					justify="between"
					px="3"
					py="2"
					style={{
						background: "var(--accent-a3)",
						borderBottom: "1px solid var(--accent-a6)",
						flexShrink: 0,
						zIndex: 5,
					}}
				>
					<Text size="2" weight="medium" style={{ color: "var(--accent-11)" }}>
						{t("lyricLineView.copyTimingsBanner", {
							count: timingCopyPlacement.snapshots.length,
							defaultValue: `Copying ${timingCopyPlacement.snapshots.length} line timing(s). Click "Apply timings starting here" above target line.`,
						})}
					</Text>
					<Button
						size="1"
						variant="soft"
						color="gray"
						onClick={() => setTimingCopyPlacement(null)}
					>
						{t("common.cancel", "Cancel")} (Esc)
					</Button>
				</Flex>
			)}
			<LyricWordSettingsProvider>
				<ContextMenu.Root>
					<ContextMenu.Trigger
						disabled={toolMode === ToolMode.Preview}
						onContextMenu={handleContextMenu}
						style={{
							display: "flex",
							flexGrow: 1,
							flexDirection: "column",
							height: "100%",
							minHeight: 0,
						}}
					>
						<Box
							flexGrow="1"
							style={{
								padding: "4px 0",
								height: "100%",
								maxHeight: "100%",
								overflowY: "auto",
								overflowX: wrapLyricLines ? "hidden" : "auto",
								backgroundColor: hasCustomBackground
									? "transparent"
									: "var(--editor-bg, transparent)",
							}}
							ref={viewElRef}
						>
							<ViewportList
								overscan={4}
								items={visibleItems}
								ref={viewRef}
								viewportRef={viewElRef}
								initialIndex={initialVisibleIndex}
								onViewportIndexesChange={handleViewportIndexesChange}
							>
								{(item) => (
									<LyricLineView
										key={item.line?.id ?? item.sourceIndex}
										lineAtom={item.lineAtom}
										lineIndex={item.sourceIndex}
									/>
								)}
							</ViewportList>
						</Box>
					</ContextMenu.Trigger>
					{contextMenuTarget ? (
						<LyricEditorContextMenuContent target={contextMenuTarget} />
					) : (
						<ContextMenu.Content style={{ display: "none" }} />
					)}
				</ContextMenu.Root>
			</LyricWordSettingsProvider>
			<IconButton
				className={styles.locateButton}
				size="4"
				variant="surface"
				onClick={handleLocate}
				title={t("lyricEditor.locate", "Locate")}
				aria-label={t("lyricEditor.locate", "Locate")}
			>
				<MyLocation24Regular style={{ width: "26px", height: "26px" }} />
			</IconButton>
		</Flex>
	);
});

export default LyricLinesView;
