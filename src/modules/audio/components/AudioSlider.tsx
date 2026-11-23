import {
	Card,
	Flex,
	Popover,
	Text,
	TextField,
	TextArea,
	Box,
	IconButton,
} from "@radix-ui/themes";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import WaveSurfer from "wavesurfer.js";
import { msToTimestamp } from "$/utils/timestamp";
import { audioEngine } from "$/modules/audio/audio-engine";
import {
	audioBufferAtom,
	audioPlayingAtom,
	currentDurationAtom,
	currentTimeAtom,
} from "$/modules/audio/states";
import { SpectrogramVisibilityContext } from "./SpectrogramVisibilityContext";
import {
	isDarkThemeAtom,
	lyricLinesAtom,
	selectedLinesAtom,
} from "$/states/main";
import {
	accentColorAtom,
	useCustomAccentAtom,
	customAccentColorAtom,
	advancedWaveformColorAtom,
	advancedWaveformProgressColorAtom,
	activePresetIdAtom,
} from "$/modules/settings/states";
import {
	spectrogramContainerWidthAtom,
	spectrogramPlayheadTrackingModeAtom,
	spectrogramScrollLeftAtom,
	spectrogramZoomAtom,
} from "$/modules/spectrogram/states";
import { clampScroll, useHoverGuide } from "../hooks";
import { AudioRegion } from "./AudioRegion";
import styles from "./AudioSlider.module.css";
import { HoverGuide } from "./HoverGuide";
import { Add16Regular, Delete16Regular } from "@fluentui/react-icons";
import type { Mark } from "$/types/ttml";

const WaveformMarkers = memo(
	({
		markers,
		updateMark,
		toggleMark,
	}: {
		markers: (Mark & { left: number; timestamp: string })[];
		updateMark: (timeMs: number, data: Partial<Mark>) => void;
		toggleMark: (timeMs: number) => void;
	}) => {
		const { t } = useTranslation();
		return (
			<>
				{markers.map((marker) => (
					<MarkerItem
						key={marker.timeMs}
						marker={marker}
						updateMark={updateMark}
						toggleMark={toggleMark}
					/>
				))}
			</>
		);
	},
);

const InteractiveHoverOverlay = memo(
	({
		spectrogramVisible,
		onMouseDown,
		hoverState,
		title,
	}: {
		spectrogramVisible: boolean;
		onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
		hoverState: {
			x: number;
			timeStr: string;
			isNearRight: boolean;
			isVisible: boolean;
		};
		title?: string;
	}) => {
		return (
			<>
				<div
					className={`${styles.interactionOverlay} ${
						spectrogramVisible ? styles.interactionOverlayActive : ""
					}`}
					onMouseDown={spectrogramVisible ? onMouseDown : undefined}
					onContextMenu={(e) => e.preventDefault()}
					title={title}
				/>
				<HoverGuide hoverState={hoverState} />
			</>
		);
	},
);

const MarkerItem = memo(
	({
		marker,
		updateMark,
		toggleMark,
	}: {
		marker: Mark & { left: number; timestamp: string };
		updateMark: (timeMs: number, data: Partial<Mark>) => void;
		toggleMark: (timeMs: number) => void;
	}) => {
		const [localLabel, setLocalLabel] = useState(marker.label || "");
		const [localDescription, setLocalDescription] = useState(
			marker.description || "",
		);

		// Sync with external state changes
		useEffect(() => {
			setLocalLabel(marker.label || "");
		}, [marker.label]);

		useEffect(() => {
			setLocalDescription(marker.description || "");
		}, [marker.description]);

		const commitChanges = useCallback(() => {
			if (
				localLabel !== (marker.label || "") ||
				localDescription !== (marker.description || "")
			) {
				updateMark(marker.timeMs, {
					label: localLabel,
					description: localDescription,
				});
			}
		}, [localLabel, localDescription, marker, updateMark]);

		return (
			<Popover.Root onOpenChange={(open) => !open && commitChanges()}>
				<Popover.Trigger asChild>
					<div
						className={styles.markingLine}
						style={{ left: `${marker.left}px` }}
						onContextMenu={(e) => {
							e.preventDefault();
							if (e.shiftKey) toggleMark(marker.timeMs);
						}}
					>
						<div className={styles.markingLineTip}>
							{marker.label ? `${marker.label} ` : ""}
							{marker.timestamp}
						</div>
					</div>
				</Popover.Trigger>
				<Popover.Content
					size="1"
					style={{ width: 240, zIndex: 100 }}
					onOpenAutoFocus={(e) => e.preventDefault()}
				>
					<Flex direction="column" gap="2">
						<Box>
							<Text size="1" weight="bold" color="gray">
								{t("audio.marker", "Marker")} @ {marker.timestamp}
							</Text>
						</Box>
						<TextField.Root
							size="1"
							placeholder={t("audio.markerLabel", "Label (e.g. Verse 1 Start)")}
							value={localLabel}
							onChange={(e) => setLocalLabel(e.target.value)}
							onBlur={commitChanges}
						/>
						<TextArea
							size="1"
							placeholder={t("audio.markerDescription", "Description...")}
							value={localDescription}
							onChange={(e) => setLocalDescription(e.target.value)}
							onBlur={commitChanges}
							style={{ height: 60 }}
						/>
						<Flex justify="end" gap="2">
							<IconButton
								size="1"
								variant="ghost"
								color="red"
								onClick={() => toggleMark(marker.timeMs)}
								title={t("audio.deleteMarker", "Delete Marker")}
							>
								<Delete16Regular />
							</IconButton>
						</Flex>
					</Flex>
				</Popover.Content>
			</Popover.Root>
		);
	},
);

export const AudioSlider = memo(() => {
	const { t } = useTranslation();
	const setCurrentTime = useSetAtom(currentTimeAtom);
	const setCurrentDuration = useSetAtom(currentDurationAtom);
	const setAudioPlaying = useSetAtom(audioPlayingAtom);

	const currentDuration = useAtomValue(currentDurationAtom);
	const [lyricLines, setLyricLines] = useAtom(lyricLinesAtom);
	const selectedLines = useAtomValue(selectedLinesAtom);
	const audioBuffer = useAtomValue(audioBufferAtom);

	const isDarkTheme = useAtomValue(isDarkThemeAtom);
	const accentColor = useAtomValue(accentColorAtom);
	const useCustomAccent = useAtomValue(useCustomAccentAtom);
	const customAccentColor = useAtomValue(customAccentColorAtom);
	const advWaveformColor = useAtomValue(advancedWaveformColorAtom);
	const advWaveformProgress = useAtomValue(advancedWaveformProgressColorAtom);
	const activePresetId = useAtomValue(activePresetIdAtom);

	const spectrogramAtom = useContext(SpectrogramVisibilityContext);
	const spectrogramVisible = useAtomValue(spectrogramAtom);
	const playheadTrackingMode = useAtomValue(
		spectrogramPlayheadTrackingModeAtom,
	);
	const isTrackingOn = playheadTrackingMode !== "off";
	const [scrollLeft, setScrollLeft] = useAtom(spectrogramScrollLeftAtom);
	const zoom = useAtomValue(spectrogramZoomAtom);
	const containerWidth = useAtomValue(spectrogramContainerWidthAtom);
	const spectrogramVisibleRef = useRef(spectrogramVisible);

	const wsContainerRef = useRef<HTMLDivElement>(null);
	const waveSurferRef = useRef<WaveSurfer | null>(null);

	const [sliderWidthPx, setSliderWidthPx] = useState(0);
	const isDraggingRef = useRef(false);

	const { hoverState, handleContainerMouseMove, handleContainerMouseLeave } =
		useHoverGuide(sliderWidthPx, isDraggingRef);

	useEffect(() => {
		spectrogramVisibleRef.current = spectrogramVisible;
		if (waveSurferRef.current) {
			waveSurferRef.current.toggleInteraction(!spectrogramVisible);
		}
	}, [spectrogramVisible]);

	const toggleMark = useCallback(
		(timeMs: number) => {
			setLyricLines((prev) => {
				const marks = prev.marks || [];
				const existingIndex = marks.findIndex(
					(m) => Math.abs(m.timeMs - timeMs) < 150,
				);
				if (existingIndex !== -1) {
					return {
						...prev,
						marks: marks.filter((_, i) => i !== existingIndex),
					};
				}
				return {
					...prev,
					marks: [...marks, { timeMs }].sort((a, b) => a.timeMs - b.timeMs),
				};
			});
		},
		[setLyricLines],
	);

	const updateMark = useCallback(
		(timeMs: number, data: Partial<Mark>) => {
			setLyricLines((prev) => {
				const marks = (prev.marks || []).map((m) =>
					m.timeMs === timeMs ? { ...m, ...data } : m,
				);
				return { ...prev, marks };
			});
		},
		[setLyricLines],
	);

	const seekPlayheadFromClientX = useCallback(
		(clientX: number) => {
			if (!wsContainerRef.current || currentDuration <= 0) return;
			const rect = wsContainerRef.current.getBoundingClientRect();
			if (rect.width <= 0) return;
			const progress = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
			const timeMs = progress * currentDuration;
			const timeS = timeMs / 1000;
			audioEngine.seekMusic(timeS);
			setCurrentTime(Math.round(timeMs));
			if (waveSurferRef.current) {
				waveSurferRef.current.setTime(timeS);
			}
		},
		[currentDuration, setCurrentTime],
	);

	const scrollSpectrogramFromClientX = useCallback(
		(clientX: number) => {
			if (!wsContainerRef.current || currentDuration <= 0) return;
			const rect = wsContainerRef.current.getBoundingClientRect();
			if (rect.width <= 0) return;
			const progress = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
			const timeS = progress * (currentDuration / 1000);
			const targetScroll = clampScroll(
				timeS * zoom - containerWidth / 2,
				zoom,
				currentDuration,
				containerWidth,
			);
			setScrollLeft(targetScroll);
		},
		[containerWidth, currentDuration, setScrollLeft, zoom],
	);

	const startSeekPlayheadDrag = useCallback(
		(initialClientX: number) => {
			seekPlayheadFromClientX(initialClientX);
			isDraggingRef.current = true;
			const onMouseMove = (e: MouseEvent) => {
				seekPlayheadFromClientX(e.clientX);
			};
			const onMouseUp = () => {
				isDraggingRef.current = false;
				window.removeEventListener("mousemove", onMouseMove);
				window.removeEventListener("mouseup", onMouseUp);
			};
			window.addEventListener("mousemove", onMouseMove);
			window.addEventListener("mouseup", onMouseUp);
		},
		[seekPlayheadFromClientX],
	);

	const startSpectrogramScrollDrag = useCallback(
		(initialClientX: number) => {
			scrollSpectrogramFromClientX(initialClientX);
			isDraggingRef.current = true;
			const onMouseMove = (e: MouseEvent) => {
				scrollSpectrogramFromClientX(e.clientX);
			};
			const preventContextMenu = (e: MouseEvent) => {
				e.preventDefault();
			};
			const onMouseUp = () => {
				isDraggingRef.current = false;
				window.removeEventListener("mousemove", onMouseMove);
				window.removeEventListener("mouseup", onMouseUp);
				setTimeout(() => {
					window.removeEventListener("contextmenu", preventContextMenu);
				}, 50);
			};
			window.addEventListener("mousemove", onMouseMove);
			window.addEventListener("mouseup", onMouseUp);
			window.addEventListener("contextmenu", preventContextMenu, { capture: true, once: true });
		},
		[scrollSpectrogramFromClientX],
	);

	const handleAudioBarMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (!wsContainerRef.current || sliderWidthPx <= 0 || currentDuration <= 0) return;
			const rect = wsContainerRef.current.getBoundingClientRect();
			if (rect.width <= 0) return;
			const progress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
			const timeMs = progress * currentDuration;

			if (e.altKey && e.button === 0) {
				e.preventDefault();
				e.stopPropagation();
				toggleMark(timeMs);
				return;
			}

			// Right click (button === 2): Move spectrogram area
			if (e.button === 2) {
				e.preventDefault();
				e.stopPropagation();
				startSpectrogramScrollDrag(e.clientX);
				return;
			}

			// Left click (button === 0): Move playhead
			if (e.button === 0) {
				e.preventDefault();
				e.stopPropagation();
				startSeekPlayheadDrag(e.clientX);
				return;
			}
		},
		[
			currentDuration,
			sliderWidthPx,
			startSeekPlayheadDrag,
			startSpectrogramScrollDrag,
			toggleMark,
		],
	);

	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
	}, []);

	const destroyWaveSurfer = useCallback(() => {
		if (waveSurferRef.current) {
			waveSurferRef.current.destroy();
			waveSurferRef.current = null;
		}
	}, []);

	const createWaveSurfer = useCallback(() => {
		if (!wsContainerRef.current || !audioBuffer) {
			return null;
		}
		const height = wsContainerRef.current.clientHeight;
		const canvasStyles = getComputedStyle(wsContainerRef.current);
		const fontColor =
			canvasStyles.getPropertyValue("--adv-waveform-progress").trim() ||
			canvasStyles.getPropertyValue("--accent-a11").trim() ||
			(isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)");
		const primaryFillColor =
			canvasStyles.getPropertyValue("--adv-waveform-color").trim() ||
			canvasStyles.getPropertyValue("--accent-a4").trim() ||
			(isDarkTheme ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)");

		const peaks = [audioBuffer.getChannelData(0)];
		const duration = audioBuffer.duration;

		const ws = WaveSurfer.create({
			container: wsContainerRef.current,
			height,
			hideScrollbar: true,
			waveColor: primaryFillColor,
			progressColor: fontColor,
			cursorColor: fontColor,
			dragToSeek: true,
			cursorWidth: 0,
			barHeight: 0.8,
			peaks: peaks,
			duration: duration,
			interact: !spectrogramVisibleRef.current,
		});
		ws.on("dragstart", () => {
			if (spectrogramVisibleRef.current) return;
			isDraggingRef.current = true;
		});
		ws.on("dragend", () => {
			if (spectrogramVisibleRef.current) return;
			isDraggingRef.current = false;
			const time = audioEngine.musicCurrentTime;
			setCurrentTime(Math.round(time * 1000));
			if (waveSurferRef.current) {
				waveSurferRef.current.setTime(time);
			}
		});
		ws.on("interaction", (newTime: number) => {
			if (spectrogramVisibleRef.current) return;
			setCurrentTime(Math.round(newTime * 1000));
			audioEngine.seekMusic(newTime);
		});
		waveSurferRef.current = ws;
		return ws;
	}, [audioBuffer, isDarkTheme]);

	useEffect(() => {
		if (!waveSurferRef.current || !wsContainerRef.current) return;
		const raf = requestAnimationFrame(() => {
			if (!wsContainerRef.current || !waveSurferRef.current) return;
			const canvasStyles = getComputedStyle(wsContainerRef.current);
			const fontColor =
				canvasStyles.getPropertyValue("--adv-waveform-progress").trim() ||
				canvasStyles.getPropertyValue("--accent-a11").trim() ||
				(isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)");
			const primaryFillColor =
				canvasStyles.getPropertyValue("--adv-waveform-color").trim() ||
				canvasStyles.getPropertyValue("--accent-a4").trim() ||
				(isDarkTheme ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)");

			if (fontColor && primaryFillColor) {
				try {
					waveSurferRef.current.setOptions({
						waveColor: primaryFillColor,
						progressColor: fontColor,
						cursorColor: fontColor,
					});
				} catch (e) {
					console.error("Failed to update WaveSurfer options", e);
				}
			}
		});
		return () => cancelAnimationFrame(raf);
	}, [
		isDarkTheme,
		accentColor,
		useCustomAccent,
		customAccentColor,
		advWaveformColor,
		advWaveformProgress,
		activePresetId,
	]);

	useEffect(() => {
		const container = wsContainerRef.current;
		if (!container) return;

		const observer = new ResizeObserver((entries) => {
			if (entries[0]) {
				setSliderWidthPx(entries[0].contentRect.width);
			}
		});
		observer.observe(container);
		setSliderWidthPx(container.clientWidth);

		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (audioBuffer) {
			destroyWaveSurfer();
			setCurrentDuration((audioBuffer.duration * 1000) | 0);
			createWaveSurfer();
		}
	}, [audioBuffer, createWaveSurfer, destroyWaveSurfer, setCurrentDuration]);

	useEffect(() => {
		const handleMusicUnload = () => {
			destroyWaveSurfer();
			setCurrentDuration(0);
			setCurrentTime(0);
			setAudioPlaying(false);
		};

		let frameId: number | null = null;
		let isDestroyed = false;

		const syncClock = () => {
			if (isDraggingRef.current) return;
			const time = audioEngine.musicCurrentTime;
			setCurrentTime(Math.round(time * 1000));
			if (waveSurferRef.current) {
				waveSurferRef.current.setTime(time);
			}
		};

		const onFrame = () => {
			if (isDestroyed || !audioEngine.musicPlaying) {
				frameId = null;
				return;
			}

			if (!isDraggingRef.current) {
				const currentTime = audioEngine.musicCurrentTime;
				setCurrentTime(Math.round(currentTime * 1000));
				if (waveSurferRef.current) {
					waveSurferRef.current.setTime(currentTime);
				}
			}
			frameId = requestAnimationFrame(onFrame);
		};

		const handlePlay = () => {
			syncClock();
			if (frameId === null) onFrame();
			setAudioPlaying(true);
		};
		const handlePause = () => {
			syncClock();
			setAudioPlaying(false);
		};
		const handleSeek = syncClock;
		const handleTimeUpdate = syncClock;
		const handlePlaybackRateChange = syncClock;

		const handleWindowMouseUp = () => {
			if (isDraggingRef.current) {
				isDraggingRef.current = false;
				syncClock();
			}
		};
		window.addEventListener("mouseup", handleWindowMouseUp);

		audioEngine.addEventListener("music-unload", handleMusicUnload);
		audioEngine.addEventListener("music-resume", handlePlay);
		audioEngine.addEventListener("music-pause", handlePause);
		audioEngine.addEventListener("music-seeked", handleSeek);
		audioEngine.addEventListener("music-timeupdate", handleTimeUpdate);
		audioEngine.addEventListener(
			"music-playback-rate-change",
			handlePlaybackRateChange,
		);

		// Start loop if already playing
		if (audioEngine.musicPlaying) {
			handlePlay();
		}

		return () => {
			isDestroyed = true;
			if (frameId !== null) cancelAnimationFrame(frameId);
			destroyWaveSurfer();
			window.removeEventListener("mouseup", handleWindowMouseUp);
			audioEngine.removeEventListener("music-unload", handleMusicUnload);
			audioEngine.removeEventListener("music-resume", handlePlay);
			audioEngine.removeEventListener("music-pause", handlePause);
			audioEngine.removeEventListener("music-seeked", handleSeek);
			audioEngine.removeEventListener("music-timeupdate", handleTimeUpdate);
			audioEngine.removeEventListener(
				"music-playback-rate-change",
				handlePlaybackRateChange,
			);
		};
	}, [destroyWaveSurfer, setCurrentDuration, setCurrentTime, setAudioPlaying]);

	const selectedRegions = useMemo(() => {
		if (currentDuration <= 0 || sliderWidthPx <= 0) return [];

		const pixelsPerMs = sliderWidthPx / currentDuration;
		const regions: { id: string; left: number; width: number }[] = [];

		for (const line of lyricLines.lyricLines) {
			if (selectedLines.has(line.id)) {
				const left = line.startTime * pixelsPerMs;
				const width = (line.endTime - line.startTime) * pixelsPerMs;
				regions.push({ id: line.id, left, width });
			}
		}
		return regions;
	}, [lyricLines.lyricLines, selectedLines, currentDuration, sliderWidthPx]);

	const markers = useMemo(() => {
		if (currentDuration <= 0 || sliderWidthPx <= 0 || !lyricLines.marks)
			return [];
		return lyricLines.marks.map((mark) => ({
			...mark,
			left: (mark.timeMs / currentDuration) * sliderWidthPx,
			timestamp: msToTimestamp(mark.timeMs),
		}));
	}, [lyricLines.marks, currentDuration, sliderWidthPx]);

	return (
		<Box
			style={{
				alignSelf: "center",
				width: "100%",
				height: "2.5em",
				padding: "0",
				backgroundColor: "transparent",
			}}
		>
			<section
				className={styles.waveformContainer}
				aria-label={t("audio.waveform", "Audio Waveform")}
				ref={wsContainerRef}
				style={{ width: "100%", height: "100%", overflow: "hidden" }}
				onMouseDown={handleAudioBarMouseDown}
				onContextMenu={handleContextMenu}
				onMouseMove={handleContainerMouseMove}
				onMouseLeave={handleContainerMouseLeave}
			>
				<InteractiveHoverOverlay
					spectrogramVisible={spectrogramVisible}
					onMouseDown={handleAudioBarMouseDown}
					title={
						spectrogramVisible
							? t(
									"audio.spectrogramBarHint",
									"Left click to seek playhead. Right click to move spectrogram area.",
							  )
							: undefined
					}
					hoverState={hoverState}
				/>

				{selectedRegions.map((region) => (
					<div
						key={region.id}
						className={styles.selectedLyricRegion}
						style={{
							left: `${region.left}px`,
							width: `${region.width}px`,
						}}
					/>
				))}

				<WaveformMarkers
					markers={markers}
					updateMark={updateMark}
					toggleMark={toggleMark}
				/>

				<AudioRegion
					sliderWidthPx={sliderWidthPx}
					containerRef={wsContainerRef}
					isDraggingRef={isDraggingRef}
				/>
			</section>
		</Box>
	);
});
