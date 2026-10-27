import {
	CenterHorizontal24Regular,
	EyeTrackingOff24Regular,
	LayoutRowTwo24Regular,
	MusicNote2Filled,
	NextFrame24Regular,
	Target24Regular,
} from "@fluentui/react-icons";
import {
	Button,
	Flex,
	IconButton,
	Slider,
	Switch,
	Text,
	Theme,
	Tooltip,
} from "@radix-ui/themes";
import { produce } from "immer";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import {
	type FC,
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useFileOpener } from "$/hooks/useFileOpener.ts";
import { audioEngine } from "$/modules/audio/audio-engine.ts";
import {
	audioBufferAtom,
	auditionTimeAtom,
	currentTimeAtom,
	playbackRateAtom,
} from "$/modules/audio/states/index.ts";
import { cmdDuplicatePaste } from "$/modules/keyboard/commands.ts";
import { useCommand } from "$/modules/keyboard/hooks.ts";
import {
	draggingIdAtom,
	globalEnableInsertAtom,
} from "$/modules/lyric-editor/components/lyric-line-view-states.ts";
import { useScrubbing } from "$/modules/spectrogram/hooks/useScrubbing";
import { useSpectrogramInteraction } from "$/modules/spectrogram/hooks/useSpectrogramInteraction.ts";
import { useSpectrogramResize } from "$/modules/spectrogram/hooks/useSpectrogramResize.ts";
import { useSpectrogramSelection } from "$/modules/spectrogram/hooks/useSpectrogramSelection.ts";
import { useSpectrogramWorker } from "$/modules/spectrogram/hooks/useSpectrogramWorker.ts";
import { repairSectionIntegrity } from "$/modules/lyric-editor/utils/section-system.ts";
import { useTimelineEditing } from "$/modules/spectrogram/hooks/useTimelineEditing.ts";
import {
	currentPaletteAtom,
	spectrogramContainerWidthAtom,
	spectrogramFftSizeAtom,
	spectrogramGainAtom,
	spectrogramHeightAtom,
	spectrogramHoverFrequencyAtom,
	spectrogramHoverPxAtom,
	spectrogramHoverPyAtom,
	spectrogramHoverTimeMsAtom,
	spectrogramOnlyShowSyncLineAtom,
	spectrogramPlayheadTrackingModeAtom,
	spectrogramSelectionAtom,
	spectrogramSplitBgMainAtom,
} from "$/modules/spectrogram/states";
import { isDraggingAtom } from "$/modules/spectrogram/states/dnd.ts";
import {
	timeShiftDialogAtom,
	timeShiftPreviewActiveAtom,
} from "$/states/dialogs.ts";
import {
	editingTimeFieldAtom,
	lyricLinesAtom,
	selectedLinesAtom,
} from "$/states/main.ts";
import { newLyricLine, newLyricWord } from "$/types/ttml.ts";
import { openFileWithDialog } from "$/utils/fileDialog.ts";
import { msToTimestamp } from "$/utils/timestamp.ts";
import styles from "./AudioSpectrogram.module.css";
import { FrequencyRuler } from "./FrequencyRuler.tsx";
import { LyricTimelineOverlay } from "./LyricTimelineOverlay.tsx";
import {
	type ISpectrogramContext,
	SpectrogramContext,
} from "./SpectrogramContext.ts";
import { TileComponent, type TileComponentProps } from "./TileComponent.tsx";
import {
	RULER_HEIGHT,
	TimelineRuler,
	type TimelineRulerHandle,
} from "./TimelineRuler.tsx";
import { TimeShiftToolbar } from "./TimeShiftToolbar.tsx";

const TILE_DURATION_S = 5;
const LOD_WIDTHS = [512, 1024, 2048, 4096, 8192];

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const getNoteFromFreq = (freq: number) => {
	if (freq <= 20) return ""; // Human hearing floor
	const n = Math.round(69 + 12 * Math.log2(freq / 440));
	const octave = Math.floor(n / 12) - 1;
	const noteName = NOTES[((n % 12) + 12) % 12];
	return `${noteName}${octave}`;
};

const SPEED_PRESETS = [0.5, 0.75, 0.8, 1] as const;

export const AudioSpectrogram: FC = memo(() => {
	const audioBuffer = useAtomValue(audioBufferAtom);
	const setCurrentTime = useSetAtom(currentTimeAtom);
	const auditionTime = useAtomValue(auditionTimeAtom);
	const selectedLines = useAtomValue(selectedLinesAtom);
	const store = useStore();

	const [gain, setGain] = useAtom(spectrogramGainAtom);
	const [dataHeight, setDataHeight] = useAtom(spectrogramHeightAtom);
	const fftSize = useAtomValue(spectrogramFftSizeAtom);
	const [playbackRate, setPlaybackRate] = useAtom(playbackRateAtom);
	const [onlyShowSyncLine, setOnlyShowSyncLine] = useAtom(
		spectrogramOnlyShowSyncLineAtom,
	);
	const [playheadTrackingMode, setPlayheadTrackingMode] = useAtom(
		spectrogramPlayheadTrackingModeAtom,
	);
	const [splitBgMain, setSplitBgMain] = useAtom(spectrogramSplitBgMainAtom);
	const globalEnableInsert = useAtomValue(globalEnableInsertAtom);

	useCommand(cmdDuplicatePaste, () => {
		if (!globalEnableInsert) return;

		const currentSelectedLines = store.get(selectedLinesAtom);
		if (currentSelectedLines.size === 0) return;

		const state = store.get(lyricLinesAtom);
		const linesToCopy = state.lyricLines.filter((l) =>
			currentSelectedLines.has(l.id),
		);
		if (linesToCopy.length === 0) return;

		const selection = store.get(spectrogramSelectionAtom);
		const currentTimeMs = store.get(currentTimeAtom);

		let newLines: any[] = [];

		if (selection) {
			const totalDuration = selection.end - selection.start;
			const lineCount = linesToCopy.length;
			const lineDuration = totalDuration / lineCount;

			newLines = linesToCopy.map((l, i) => {
				const lineStart = Math.round(selection.start + i * lineDuration);
				const lineEnd = Math.round(selection.start + (i + 1) * lineDuration);
				const duration = lineEnd - lineStart;

				const nl = {
					...l,
					id: newLyricLine().id,
					startTime: lineStart,
					endTime: lineEnd,
					words: l.words.map((w) => ({
						...w,
						id: newLyricWord().id,
						startTime: 0,
						endTime: 0,
					})),
				};

				// Distribute words
				const nonEmptyWords = nl.words.filter((w) => w.word.trim() !== "");
				if (nonEmptyWords.length > 0) {
					const perWordDur = duration / nonEmptyWords.length;
					let wordIdx = 0;
					for (const w of nl.words) {
						if (w.word.trim() !== "") {
							w.startTime = Math.round(lineStart + wordIdx * perWordDur);
							w.endTime = Math.round(lineStart + (wordIdx + 1) * perWordDur);
							wordIdx++;
						} else {
							w.startTime = lineStart;
							w.endTime = lineStart;
						}
					}
					// Fix rounding issues for the last word
					const lastNonEmpty = nl.words
						.slice()
						.reverse()
						.find((w) => w.word.trim() !== "");
					if (lastNonEmpty) lastNonEmpty.endTime = lineEnd;
				} else {
					// No words, just set line timing
					nl.startTime = lineStart;
					nl.endTime = lineEnd;
				}

				return nl;
			});
		} else {
			// Fallback to playhead offset
			const minStart = Math.min(...linesToCopy.map((l) => l.startTime));
			const offset = currentTimeMs - minStart;

			newLines = linesToCopy.map((l) => ({
				...l,
				id: newLyricLine().id,
				startTime: l.startTime + offset,
				endTime: l.endTime + offset,
				words: l.words.map((w) => ({
					...w,
					id: newLyricWord().id,
					startTime: w.startTime + offset,
					endTime: w.endTime + offset,
					ruby: w.ruby?.map((r) => ({
						...r,
						startTime: r.startTime + offset,
						endTime: r.endTime + offset,
					})),
				})),
			}));
		}

		store.set(
			lyricLinesAtom,
			produce((draft) => {
				const anchorTime = selection ? selection.start : currentTimeMs;
				// Find insertion point to keep sorted
				let insertIndex = draft.lyricLines.findIndex(
					(l: any) => l.startTime > anchorTime,
				);
				if (insertIndex === -1) insertIndex = draft.lyricLines.length;

				const prevLine =
					insertIndex > 0 ? draft.lyricLines[insertIndex - 1] : undefined;
				const targetSectionId = prevLine?.sectionId;
				const targetSection = targetSectionId
					? (draft.sections as any[])?.find(
							(s: any) => s.id === targetSectionId,
						)
					: undefined;
				const targetHeader =
					targetSection?.label ?? prevLine?.geniusHeader;

				for (const nl of newLines) {
					if (targetSectionId) {
						nl.sectionId = targetSectionId;
						nl.geniusHeader = targetHeader;
					} else {
						delete nl.sectionId;
						delete nl.geniusHeader;
					}
				}

				draft.lyricLines.splice(insertIndex, 0, ...newLines);
				repairSectionIntegrity(draft);
			}),
		);

		// Clear selection after applying timestamps to make it "apply" and finish
		if (selection) {
			store.set(spectrogramSelectionAtom, null);
		}
	}, [globalEnableInsert, store]);

	const RulerHoverOverlay: FC<{
		isHovering: boolean;
	}> = memo(({ isHovering }) => {
		const { t } = useTranslation();
		const isDragging = useAtomValue(isDraggingAtom);
		const hoverPx = useAtomValue(spectrogramHoverPxAtom);
		const hoverTimeMs = useAtomValue(spectrogramHoverTimeMsAtom);
		const hoverFrequency = useAtomValue(spectrogramHoverFrequencyAtom);
		const editingTimeField = useAtomValue(editingTimeFieldAtom);

		if (isDragging || !isHovering) return null;

		let hoverTimeFormatted = msToTimestamp(hoverTimeMs);
		if (hoverFrequency > 0) {
			const freqFormatted =
				hoverFrequency >= 1000
					? `${(hoverFrequency / 1000).toFixed(2)} kHz`
					: `${Math.round(hoverFrequency)} Hz`;
			const noteFormatted = getNoteFromFreq(hoverFrequency);
			hoverTimeFormatted = `${hoverTimeFormatted} (${freqFormatted}${noteFormatted ? ` / ${noteFormatted}` : ""})`;
		}
		let tooltipBgColor: string | undefined;

		const isInvalidEndTime =
			editingTimeField?.field === "endTime" &&
			hoverTimeMs <= (editingTimeField.lineStartTime ?? 0);

		if (isInvalidEndTime) {
			hoverTimeFormatted = t(
				"spectrogram.invalidEndTime",
				"Cannot select this end time",
			);
			tooltipBgColor = "var(--red-9)";
		} else if (editingTimeField && !editingTimeField.isWord) {
			const fieldName =
				editingTimeField.field === "startTime"
					? t("ribbonBar.editMode.startTime", "Start Time")
					: t("ribbonBar.editMode.endTime", "End Time");
			hoverTimeFormatted = `${t("common.clickToSet", "Click to set ")}${fieldName}: ${hoverTimeFormatted}`;
			tooltipBgColor = "var(--accent-9)";
		}

		return (
			<>
				<div
					className={styles.hoverTimeTooltip}
					style={{
						left: `${hoverPx}px`,
						opacity: isHovering ? 1 : 0,
						backgroundColor: tooltipBgColor,
					}}
				>
					{hoverTimeFormatted}
				</div>

				<div
					className={`${styles.rulerHoverFade} ${styles.rulerHoverFadeLeft}`}
					style={{
						width: `${hoverPx}px`,
						height: `${RULER_HEIGHT}px`,
						opacity: isHovering ? 1 : 0,
					}}
				/>

				<div
					className={`${styles.rulerHoverFade} ${styles.rulerHoverFadeRight}`}
					style={{
						left: `${hoverPx}px`,
						height: `${RULER_HEIGHT}px`,
						opacity: isHovering ? 1 : 0,
					}}
				/>
			</>
		);
	});

	const SpectrogramHoverCursor: FC<{
		isHovering: boolean;
		scrollLeft: number;
	}> = memo(({ isHovering, scrollLeft }) => {
		const isDragging = useAtomValue(isDraggingAtom);
		const hoverPx = useAtomValue(spectrogramHoverPxAtom);
		const hoverTimeMs = useAtomValue(spectrogramHoverTimeMsAtom);
		const editingTimeField = useAtomValue(editingTimeFieldAtom);

		if (isDragging || !isHovering) return null;

		const isInvalidEndTime =
			editingTimeField?.field === "endTime" &&
			hoverTimeMs <= (editingTimeField.lineStartTime ?? 0);
		const hoverLineColor = isInvalidEndTime ? "var(--red-9)" : undefined;
		const hoverX = scrollLeft + hoverPx;

		return (
			<div
				className={styles.hoverCursorContainer}
				style={{
					left: `${hoverX}px`,
					opacity: isHovering ? 1 : 0,
				}}
			>
				<div
					className={styles.hoverCursorLine}
					style={{ backgroundColor: hoverLineColor }}
				/>
			</div>
		);
	});

	const { height: uiHeight, resizeHandleProps } = useSpectrogramResize({
		initialHeight: dataHeight,
		onCommit: setDataHeight,
	});
	const palette = useAtomValue(currentPaletteAtom);
	const [visibleTiles, setVisibleTiles] = useState<TileComponentProps[]>([]);

	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const [containerWidth, setContainerWidth] = useAtom(
		spectrogramContainerWidthAtom,
	);

	const { zoom, scrollLeft, isZooming } = useSpectrogramInteraction(
		scrollContainerRef,
		containerWidth,
	);

	const [isHovering, setIsHovering] = useState(false);
	const setHoverPx = useSetAtom(spectrogramHoverPxAtom);
	const setHoverPy = useSetAtom(spectrogramHoverPyAtom);

	const rulerRef = useRef<TimelineRulerHandle>(null);

	const { openFile } = useFileOpener();
	const handleLoadMusic = useCallback(async () => {
		const file = await openFileWithDialog({
			multiple: false,
			filters: [
				{
					name: "Audio",
					extensions: ["mp3", "flac", "wav", "ogg", "m4a", "opus", "webm"],
				},
			],
		});
		if (!file || Array.isArray(file)) return;
		openFile(file);
	}, [openFile]);

	const { t } = useTranslation();

	const { tileCache, requestTileIfNeeded, lastTileTimestamp } =
		useSpectrogramWorker(audioBuffer, palette.data);

	const {
		handleContainerMouseDown: handleTimelineMouseDown,
		pendingCursorPosition,
		showRangePreview,
		previewStyle,
	} = useTimelineEditing(scrollLeft, zoom);

	const { handleSelectionMouseDown, selectionStyle } = useSpectrogramSelection(
		scrollLeft,
		zoom,
	);

	const handleCompositeMouseDown = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (e.button !== 0) return;
			handleTimelineMouseDown(e);
			handleSelectionMouseDown(e);
		},
		[handleTimelineMouseDown, handleSelectionMouseDown],
	);

	useScrubbing(scrollContainerRef, scrollLeft, zoom);

	const contextValue = useMemo<ISpectrogramContext>(
		() => ({
			scrollContainerRef,
			zoom,
		}),
		[zoom],
	);

	const updateVisibleTiles = useCallback(() => {
		if (!audioBuffer || !scrollContainerRef.current) return;

		const pixelsPerSecond = zoom;
		const tileDisplayWidthPx = TILE_DURATION_S * pixelsPerSecond;
		const totalTiles = Math.ceil(audioBuffer.duration / TILE_DURATION_S);

		const viewStart = scrollLeft;
		const viewEnd = viewStart + containerWidth;

		const firstVisibleIndex = Math.floor(viewStart / tileDisplayWidthPx);
		const lastVisibleIndex = Math.ceil(viewEnd / tileDisplayWidthPx);

		const newVisibleTiles: TileComponentProps[] = [];

		const currentPaletteId = palette.id;

		for (let i = firstVisibleIndex - 2; i <= lastVisibleIndex + 2; i++) {
			if (i < 0 || i >= totalTiles) continue;

			const cacheId = `tile-${i}`;
			const targetLodWidth =
				LOD_WIDTHS.find((w) => w >= tileDisplayWidthPx) ||
				LOD_WIDTHS[LOD_WIDTHS.length - 1];

			requestTileIfNeeded({
				tileIndex: i,
				startTime: i * TILE_DURATION_S,
				endTime: i * TILE_DURATION_S + TILE_DURATION_S,
				gain: gain,
				height: dataHeight,
				tileWidthPx: targetLodWidth,
				paletteId: currentPaletteId,
				fftSize: fftSize,
			});

			const cacheEntry = tileCache.current.get(cacheId);
			const currentBitmap = cacheEntry?.bitmap;

			newVisibleTiles.push({
				tileId: cacheId,
				left: i * tileDisplayWidthPx,
				width: tileDisplayWidthPx,
				height: dataHeight,
				canvasWidth: currentBitmap?.width || targetLodWidth,
				bitmap: currentBitmap,
			});
		}
		setVisibleTiles(newVisibleTiles);
	}, [
		audioBuffer,
		containerWidth,
		gain,
		dataHeight,
		requestTileIfNeeded,
		tileCache,
		palette.id,
		zoom,
		scrollLeft,
		fftSize,
	]);

	const updateVisibleTilesRef = useRef(updateVisibleTiles);
	useLayoutEffect(() => {
		updateVisibleTilesRef.current = updateVisibleTiles;
	}, [updateVisibleTiles]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: lastTileTimestamp 用来重运行这个 effect
	useEffect(() => {
		updateVisibleTiles();
	}, [updateVisibleTiles, lastTileTimestamp]);

	const handleRulerSeek = (timeInSeconds: number) => {
		audioEngine.seekMusic(timeInSeconds);
		setCurrentTime(Math.round(timeInSeconds * 1000));
	};

	useLayoutEffect(() => {
		rulerRef.current?.draw(scrollLeft);
	}, [scrollLeft]);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!audioBuffer || !container) return;

		const observer = new ResizeObserver((entries) => {
			if (entries[0]) {
				setContainerWidth(entries[0].contentRect.width);
			}
		});

		observer.observe(container);
		setContainerWidth(container.clientWidth);

		return () => observer.disconnect();
	}, [setContainerWidth, audioBuffer]);

	const handleMouseEnter = () => setIsHovering(true);
	const handleMouseLeave = () => setIsHovering(false);
	const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
		const rect = event.currentTarget.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		setHoverPx(x);
		setHoverPy(y);
	};

	const totalWidth = audioBuffer ? audioBuffer.duration * zoom : 0;
	const auditionCursorPosition = auditionTime ? auditionTime * zoom : null;

	const transformX = isZooming ? scrollLeft : Math.round(scrollLeft);

	const minGain = 0.5;
	const maxGain = 8;
	const gainPercent = ((gain - minGain) / (maxGain - minGain)) * 100;
	const THUMB_HEIGHT_PX = 13;
	const thumbOffsetPx = (0.5 - gainPercent / 100) * THUMB_HEIGHT_PX;

	return (
		<div
			className={styles.spectrogramContainer}
			style={{ height: `${uiHeight}px` }}
		>
			<div className={styles.resizeHandle} {...resizeHandleProps} />

			<div className={styles.innerContainer}>
				<div className={`${styles.sidebar} ${styles.leftSidebar}`}>
					<Flex
						direction="column"
						align="center"
						gap="2"
						style={{ height: "100%", width: "100%" }}
					>
						<Flex
							direction="column"
							align="center"
							justify="end"
							style={{
								flex: 1,
								width: "100%",
								padding: "4px 0",
								position: "relative",
							}}
						>
							<FrequencyRuler />
							<div
								className={styles.gainSliderContainer}
								style={{ height: "95%", zIndex: 10 }}
							>
								<Slider
									orientation="vertical"
									size="1"
									min={minGain}
									max={maxGain}
									step={0.5}
									value={[gain]}
									onValueChange={(v) => setGain(v[0])}
									style={{ flex: 1, width: "18px", zIndex: 10 }}
								/>
								<div
									className={styles.gainTooltip}
									style={{
										bottom: `calc(${gainPercent}% + ${thumbOffsetPx}px)`,
									}}
								>
									{gain}x
								</div>
							</div>
						</Flex>
					</Flex>
				</div>

				<div className={styles.mainContent}>
					{!audioBuffer ? (
						<div className={styles.emptyState}>
							<Flex direction="column" align="center" gap="3">
								<MusicNote2Filled
									fontSize={48}
									color="var(--gray-8)"
									style={{ opacity: 0.5 }}
								/>
								<Text color="gray" size="3">
									{t(
										"spectrogram.noAudioLoaded",
										"Please load an audio file first to render the spectrogram",
									)}
								</Text>
								<Button variant="soft" onClick={handleLoadMusic}>
									{t("spectrogram.loadAudio", "Load Audio File")}
								</Button>
							</Flex>
						</div>
					) : (
						<>
							<TimelineRuler
								ref={rulerRef}
								zoom={zoom}
								duration={audioBuffer?.duration || 0}
								containerWidth={containerWidth}
								onSeek={handleRulerSeek}
							/>

							<RulerHoverOverlay isHovering={isHovering} />

							<ScrubHandle
								scrollContainerRef={scrollContainerRef}
								scrollLeft={scrollLeft}
								zoom={zoom}
								containerWidth={containerWidth}
							/>

							<div
								ref={scrollContainerRef}
								className={styles.virtualScrollContainer}
								onMouseEnter={handleMouseEnter}
								onMouseLeave={handleMouseLeave}
								onMouseMove={handleMouseMove}
								onMouseDown={handleCompositeMouseDown}
								onContextMenu={(e) => e.preventDefault()}
								onDragOver={(e) => {
									const draggingId = store.get(draggingIdAtom);
									if (draggingId && store.get(spectrogramSelectionAtom)) {
										e.preventDefault();
										e.dataTransfer.dropEffect = "move";
									}
								}}
								onDrop={(e) => {
									const draggingId = store.get(draggingIdAtom);
									const selection = store.get(spectrogramSelectionAtom);
									if (draggingId && selection) {
										e.preventDefault();
										store.set(
											lyricLinesAtom,
											produce((draft) => {
												const line = draft.lyricLines.find(
													(l: any) => l.id === draggingId,
												);
												if (!line) return;
												line.startTime = Math.round(selection.start);
												line.endTime = Math.round(selection.end);
												let totalChars = 0;
												for (const word of line.words) {
													totalChars += word.word.length;
												}
												if (totalChars > 0) {
													const durationMs = line.endTime - line.startTime;
													let currentWordTime = line.startTime;
													for (const word of line.words) {
														const wordDuration = Math.round(
															(word.word.length / totalChars) * durationMs,
														);
														word.startTime = currentWordTime;
														word.endTime = currentWordTime + wordDuration;
														currentWordTime += wordDuration;
														if (word.ruby && word.ruby.length > 0) {
															let totalRubyChars = 0;
															for (const ruby of word.ruby)
																totalRubyChars += ruby.word.length;
															let currentRubyTime = word.startTime;
															for (const ruby of word.ruby) {
																const rubyDur =
																	totalRubyChars > 0
																		? Math.round(
																				(ruby.word.length / totalRubyChars) *
																					wordDuration,
																			)
																		: 0;
																ruby.startTime = currentRubyTime;
																ruby.endTime = currentRubyTime + rubyDur;
																currentRubyTime += rubyDur;
															}
														}
													}
													if (line.words.length > 0) {
														const lastWord = line.words[line.words.length - 1];
														lastWord.endTime = line.endTime;
														if (lastWord.ruby && lastWord.ruby.length > 0) {
															lastWord.ruby[lastWord.ruby.length - 1].endTime =
																line.endTime;
														}
													}
												}
											}),
										);
										store.set(spectrogramSelectionAtom, null);
									}
								}}
								role="group"
							>
								<div
									className={styles.virtualScrollContent}
									style={{
										width: `${Math.ceil(totalWidth)}px`,
										transform: `translate3d(${-transformX}px, 0, 0)`,
									}}
								>
									{visibleTiles.map((tile) => (
										<TileComponent key={tile.tileId} {...tile} />
									))}
									<PlayheadCursor zoom={zoom} />

									{pendingCursorPosition !== null && (
										<div
											className={styles.pendingCursor}
											style={{
												left: `${pendingCursorPosition}px`,
											}}
										/>
									)}
									{auditionCursorPosition !== null && (
										<div
											className={styles.auditionCursor}
											style={{
												left: `${auditionCursorPosition}px`,
											}}
										/>
									)}
									{showRangePreview && previewStyle && (
										<div
											className={styles.rangePreviewRegion}
											style={previewStyle}
										/>
									)}
									{selectionStyle && (
										<div
											className={styles.rangePreviewRegion}
											style={selectionStyle}
										/>
									)}
									<SpectrogramContext.Provider value={contextValue}>
										<Theme appearance="dark">
											<LyricTimelineOverlay
												clientWidth={containerWidth}
												hiddenLineIds={showRangePreview ? selectedLines : null}
											/>
											<SpectrogramHoverCursor
												isHovering={isHovering}
												scrollLeft={scrollLeft}
											/>
										</Theme>
									</SpectrogramContext.Provider>
								</div>
							</div>
							<TimeShiftToolbar />
						</>
					)}
				</div>

				<div className={`${styles.sidebar} ${styles.rightSidebar}`}>
					<div className={styles.speedPresetGroup}>
						{SPEED_PRESETS.map((preset) => (
							<Tooltip
								key={preset}
								content={`${preset}x ${t("spectrogram.speed", "Speed")}`}
								side="left"
							>
								<Button
									size="1"
									variant={playbackRate === preset ? "solid" : "soft"}
									color={playbackRate === preset ? undefined : "gray"}
									className={styles.speedPresetButton}
									onClick={() => setPlaybackRate(preset)}
								>
									{preset === 0.75 ? ".75x" : `${preset}x`}
								</Button>
							</Tooltip>
						))}
					</div>

					<Tooltip
						content={t(
							"spectrogram.onlyShowSyncLine",
							"Only show line being time synced",
						)}
						side="left"
					>
						<IconButton
							variant={onlyShowSyncLine ? "solid" : "outline"}
							onClick={() => setOnlyShowSyncLine((prev) => !prev)}
						>
							<Target24Regular />
						</IconButton>
					</Tooltip>

					<Tooltip
						content={t(
							"spectrogram.splitBgMain",
							"Split background and main vocals",
						)}
						side="left"
					>
						<IconButton
							variant={splitBgMain ? "solid" : "outline"}
							onClick={() => setSplitBgMain((prev) => !prev)}
						>
							<LayoutRowTwo24Regular />
						</IconButton>
					</Tooltip>

					<Tooltip
						content={
							playheadTrackingMode === "follow"
								? `${t("spectrogram.playheadTrackingMode", "Playhead Tracking")}: ${t("spectrogram.playheadTrackingFollow", "Follow")}`
								: playheadTrackingMode === "snap"
									? `${t("spectrogram.playheadTrackingMode", "Playhead Tracking")}: ${t("spectrogram.playheadTrackingSnap", "Snap")}`
									: `${t("spectrogram.playheadTrackingMode", "Playhead Tracking")}: ${t("spectrogram.playheadTrackingOff", "Off")}`
						}
						side="left"
					>
						<IconButton
							variant={playheadTrackingMode === "off" ? "outline" : "solid"}
							onClick={() => {
								setPlayheadTrackingMode((prev) => {
									if (prev === "off") return "snap";
									if (prev === "snap") return "follow";
									return "off";
								});
							}}
						>
							{playheadTrackingMode === "follow" ? (
								<CenterHorizontal24Regular />
							) : playheadTrackingMode === "snap" ? (
								<NextFrame24Regular />
							) : (
								<EyeTrackingOff24Regular />
							)}
						</IconButton>
					</Tooltip>
				</div>
			</div>
		</div>
	);
});

const PlayheadCursor: FC<{ zoom: number }> = memo(({ zoom }) => {
	const currentTimeInMs = useAtomValue(currentTimeAtom);
	const cursorPosition = (currentTimeInMs / 1000) * zoom;

	return (
		<div
			className={styles.playheadCursor}
			style={{
				transform: `translate3d(${cursorPosition}px, 0, 0)`,
			}}
		/>
	);
});

const ScrubHandle: FC<{
	scrollContainerRef: React.RefObject<HTMLDivElement | null>;
	scrollLeft: number;
	zoom: number;
	containerWidth: number;
}> = memo(({ scrollContainerRef, scrollLeft, zoom, containerWidth }) => {
	const currentTimeInMs = useAtomValue(currentTimeAtom);
	const { handleScrubStart } = useScrubbing(
		scrollContainerRef,
		scrollLeft,
		zoom,
	);
	const handleLeftPosition = (currentTimeInMs / 1000) * zoom - scrollLeft;
	const isVisible =
		handleLeftPosition >= 0 && handleLeftPosition <= containerWidth;

	return (
		<div
			className={styles.playheadScrubHandle}
			style={{
				transform: `translate3d(${handleLeftPosition}px, 0, 0) translateX(-50%)`,
				display: isVisible ? "block" : "none",
			}}
			onMouseDown={handleScrubStart}
		/>
	);
});

export default AudioSpectrogram;
