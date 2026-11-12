import {
	FullScreenMaximize20Regular,
	FullScreenMinimize20Regular,
	Image20Regular,
} from "@fluentui/react-icons";
import classNames from "classnames";
import { useAtom, useAtomValue } from "jotai";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import SuspensePlaceHolder from "$/components/SuspensePlaceHolder";
import {
	previewFullscreenAtom,
	previewShowAlbumArtworkAtom,
} from "$/modules/settings/states/preview";
import { keyPreviewFullscreenAtom } from "$/states/keybindings.ts";
import { ToolMode, toolModeAtom } from "$/states/main.ts";
import { useKeyBindingAtom } from "$/utils/keybindings.ts";
import { lazy } from "$/utils/lazy.ts";
import styles from "./index.module.css";

const SpicyLyrics = lazy(() => import("$/components/SpicyLyrics"));

export interface PreviewModeSwitcherProps {
	isPanel?: boolean;
}

export const PreviewModeSwitcher: React.FC<PreviewModeSwitcherProps> = ({
	isPanel = false,
}) => {
	const [isFullscreen, setIsFullscreen] = useAtom(previewFullscreenAtom);
	const [showArtwork, setShowArtwork] = useAtom(previewShowAlbumArtworkAtom);
	const [controlsVisible, setControlsVisible] = useState(false);
	const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
	const lastPosRef = useRef<{ x: number; y: number } | null>(null);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (isPanel) return;
			if (!isFullscreen) {
				setControlsVisible(true);
				return;
			}

			// Discard synthetic mousemove events dispatched by browsers when DOM elements
			// scroll/animate underneath a stationary cursor
			if (
				lastPosRef.current &&
				lastPosRef.current.x === e.clientX &&
				lastPosRef.current.y === e.clientY
			) {
				return;
			}
			lastPosRef.current = { x: e.clientX, y: e.clientY };

			// Only reveal when user moves up towards the top controls
			if (e.clientY <= 72) {
				setControlsVisible(true);
				if (hideTimerRef.current) {
					clearTimeout(hideTimerRef.current);
					hideTimerRef.current = null;
				}
			} else {
				// Hide when moving down away from top controls
				if (!hideTimerRef.current) {
					hideTimerRef.current = setTimeout(() => {
						setControlsVisible(false);
						hideTimerRef.current = null;
					}, 200);
				}
			}
		},
		[isFullscreen, isPanel],
	);

	useEffect(() => {
		if (isPanel) return;
		if (!isFullscreen) {
			setControlsVisible(true);
			if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
		} else {
			// Briefly show the exit button for 2.5s on entering fullscreen, then hide
			setControlsVisible(true);
			hideTimerRef.current = setTimeout(() => {
				setControlsVisible(false);
				hideTimerRef.current = null;
			}, 2500);
		}
		return () => {
			if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
		};
	}, [isFullscreen, isPanel]);

	const toolMode = useAtomValue(toolModeAtom);

	useKeyBindingAtom(keyPreviewFullscreenAtom, () => {
		if (!isPanel && toolMode === ToolMode.Preview) {
			setIsFullscreen((prev) => !prev);
		}
	}, [isPanel, toolMode, setIsFullscreen]);

	useEffect(() => {
		if (isPanel) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName))
				return;
			if (e.key === "Escape" && isFullscreen) {
				setIsFullscreen(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isPanel, isFullscreen, setIsFullscreen]);

	return (
		<div
			style={{
				position: "relative",
				width: "100%",
				height: "100%",
				userSelect: "none",
				WebkitUserSelect: "none",
			}}
			onMouseMove={handleMouseMove}
		>
			{!isPanel && (
				<div
					className={classNames(
						styles.floatingControls,
						isFullscreen && !controlsVisible && styles.autohideHidden,
					)}
					onMouseEnter={() => {
						if (hideTimerRef.current) {
							clearTimeout(hideTimerRef.current);
							hideTimerRef.current = null;
						}
						setControlsVisible(true);
					}}
					onMouseLeave={() => {
						if (isFullscreen) {
							setControlsVisible(false);
						}
					}}
				>
					<button
						type="button"
						className={styles.floatingBtn}
						onClick={() => setShowArtwork((prev) => !prev)}
						title={showArtwork ? "Hide Album Art" : "Show Album Art"}
						aria-label="Toggle Album Art"
					>
						<Image20Regular />
					</button>
					{isFullscreen ? (
						<button
							type="button"
							className={styles.exitFullscreenBtn}
							onClick={() => setIsFullscreen(false)}
							title="Exit Fullscreen (Esc)"
							aria-label="Exit Fullscreen"
						>
							<FullScreenMinimize20Regular />
							<span>Exit Fullscreen (Esc)</span>
						</button>
					) : (
						<button
							type="button"
							className={styles.floatingBtn}
							onClick={() => setIsFullscreen(true)}
							title="Fullscreen (F)"
							aria-label="Enter Fullscreen"
						>
							<FullScreenMaximize20Regular />
						</button>
					)}
				</div>
			)}
			<Suspense fallback={<SuspensePlaceHolder />}>
				<SpicyLyrics isPanel={isPanel} />
			</Suspense>
		</div>
	);
};

export default PreviewModeSwitcher;
