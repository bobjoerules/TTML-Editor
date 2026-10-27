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
	Box,
	Button,
	Flex,
	Heading,
	Text,
	TextArea,
	Theme,
} from "@radix-ui/themes";
import SuspensePlaceHolder from "$/components/SuspensePlaceHolder";
import { TouchSyncPanel } from "$/modules/lyric-editor/components/TouchSyncPanel/index.tsx";
import { log, error as logError } from "$/utils/logging.ts";
import "@radix-ui/themes/styles.css";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow, type PhysicalSize } from "@tauri-apps/api/window";
import { platform, version } from "@tauri-apps/plugin-os";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import {
	Suspense,
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { lazy } from "$/utils/lazy.ts";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { Slide, ToastContainer, toast } from "react-toastify";
import saveFile from "save-file";
import { backgroundGradients } from "$/modules/settings/states/gradients";
import {
	accentColorAtom,
	backgroundModeAtom,
	boykisserModeAtom,
	boykisserUnlockedAtom,
	customAccentColorAtom,
	customGradientAngleAtom,
	customGradientCenterAtom,
	customGradientColorsAtom,
	customGradientOpacityAtom,
	customGradientSizeAtom,
	customGradientTypeAtom,
	selectedGradientAtom,
	useCustomAccentAtom,
	useCustomGradientAtom,
	appFontAtom,
	glassmorphismBlurAtom,
	advancedPrimaryTextColorAtom,
	advancedSecondaryTextColorAtom,
	advancedWaveformColorAtom,
	advancedWaveformProgressColorAtom,
	advTitlebarBgAtom,
	advSidebarBgAtom,
	advSidebarActiveAtom,
	advMenuHoverBgAtom,
	advEditorBgAtom,
	advActiveLineBgAtom,
	advLineHoverBgAtom,
	advChipBorderRadiusAtom,
	advChipGapAtom,
	advChipPaddingVerticalAtom,
	advChipPaddingHorizontalAtom,
	advRomanizationColorAtom,
	advTranslationColorAtom,
	advAudioBarBgAtom,
	advAudioBarTextAtom,
	advScrollbarColorAtom,
	advDialogBgAtom,
	advDialogBorderAtom,
	advGlobalBorderRadiusAtom,
	advGlobalBorderWidthAtom,
	advShadowIntensityAtom,
	advSelectionColorAtom,
	advBackdropBlurAtom,
	appFontWeightAtom,
	appFontStyleAtom,
	customFontDataAtom,
	customFontNameAtom,
	editorFontAtom,
	previewFontAtom,
	customEditorFontDataAtom,
	customEditorFontNameAtom,
	customPreviewFontDataAtom,
	customPreviewFontNameAtom,
	appLayoutOrderAtom,
	vRibbonPositionAtom,
	allowConsecutiveBackgroundLinesAtom,
	lyricTextNormalizationOptionsAtom,
	legacyDarkThemeAtom,
	DEFAULT_UI_SCALE,
	MAX_UI_SCALE,
	MIN_UI_SCALE,
	uiScaleAtom,
	spectrogramFullWidthAtom,
} from "$/modules/settings/states/index.ts";
import styles from "./App.module.css";
import DarkThemeDetector from "./components/DarkThemeDetector";
import RibbonBar from "./components/RibbonBar";
import { TitleBar } from "./components/TitleBar";
import { ResizablePanel } from "./components/ResizablePanel";
import { useFileOpener } from "./hooks/useFileOpener.ts";
import AudioControls from "./modules/audio/components/index.tsx";
import { useAudioFeedback } from "./modules/audio/hooks/useAudioFeedback.ts";
import { SyncKeyBinding } from "./modules/lyric-editor/components/sync-keybinding.tsx";
import { UrbanDictionaryKeybinding } from "./modules/lyric-editor/components/urban-dictionary-keybinding.tsx";
import { LinePropertiesKeybinding } from "./modules/lyric-editor/components/line-properties-keybinding.tsx";
import { AutosaveManager } from "./modules/project/autosave/AutosaveManager.tsx";
import { ProjectTimerManager } from "./modules/project/timer/ProjectTimerManager.tsx";
import exportTTMLText from "./modules/project/logic/ttml-writer.ts";
import { GlobalDragOverlay } from "./modules/project/modals/GlobalDragOverlay.tsx";
import {
	customBackgroundBlurAtom,
	customBackgroundBrightnessAtom,
	customBackgroundImageAtom,
	customBackgroundImageInitAtom,
	customBackgroundMaskAtom,
	customBackgroundOpacityAtom,
	hasCustomBackgroundAtom,
} from "./modules/settings/modals/customBackground";
import { showTouchSyncPanelAtom } from "./modules/settings/states/sync.ts";
import { previewFullscreenAtom } from "./modules/settings/states/preview.ts";
import { settingsDialogAtom, settingsTabAtom } from "./states/dialogs.ts";
import {
	isDarkThemeAtom,
	isDirtyAtom,
	isGlobalFileDraggingAtom,
	lyricLinesAtom,
	projectIdentityAtom,
	showPreviewPanelAtom,
	ToolMode,
	toolModeAtom,
} from "./states/main.ts";
import { generateGradient, generateRadixScale } from "./utils/colorScale.ts";
import { useAppUpdate } from "./utils/useAppUpdate.ts";
import { DiscordPresence } from "./modules/discord-presence/DiscordPresence";
import { BeginnerGuide } from "./modules/onboarding/BeginnerGuide";
import { MigrationNotice } from "./modules/domain-migration/MigrationNotice";
import { ChecklistBackgroundSync } from "./modules/ttml-checklist/cloudSync";

const LyricLinesView = lazy(() => import("./modules/lyric-editor/components"));
const PreviewModeSwitcher = lazy(
	() => import("./components/PreviewModeSwitcher"),
);
const SidePreviewPanel = lazy(() => import("./components/SidePreviewPanel"));
const Dialogs = lazy(() => import("./components/Dialogs"));

const AppErrorPage = ({
	error,
	resetErrorBoundary,
}: {
	error: unknown;
	resetErrorBoundary: () => void;
}) => {
	const store = useStore();
	const { t } = useTranslation();

	return (
		<Flex direction="column" align="center" justify="center" height="100vh">
			<Flex direction="column" align="start" justify="center" gap="2">
				<Heading>{t("app.error.title", "Oops, an error occurred!")}</Heading>
				<Text>
					{t(
						"app.error.description",
						"AMLL TTML Tools encountered an error while running",
					)}
				</Text>
				<Text>
					{t(
						"app.error.checkDevTools",
						"Detailed error information can be found in the developer tools",
					)}
				</Text>
				<Flex gap="2">
					<Button
						onClick={() => {
							try {
								const ttmlText = exportTTMLText(
									store.get(lyricLinesAtom),
									store.get(lyricTextNormalizationOptionsAtom),
									{
										allowConsecutiveBackgroundLines: store.get(
											allowConsecutiveBackgroundLinesAtom,
										),
									},
								);
								const b = new Blob([ttmlText], { type: "text/plain" });
								saveFile(b, "unnamed.ttml").catch(logError);
							} catch (e) {
								logError("Failed to save TTML file", e);
							}
						}}
					>
						{t("app.error.saveLyrics", "Try saving current lyrics")}
					</Button>
					<Button
						onClick={() => {
							resetErrorBoundary();
						}}
						variant="soft"
					>
						{t("app.error.tryRestart", "Try restarting application")}
					</Button>
				</Flex>
				<Text>{t("app.error.details", "Error details:")}</Text>
				<TextArea
					readOnly
					value={String(error)}
					style={{
						width: "100%",
						height: "8em",
					}}
				/>
			</Flex>
		</Flex>
	);
};

const RainEffect: FC<{ isRaining: boolean }> = memo(({ isRaining }) => {
	const [images, setImages] = useState<{ id: string; x: number }[]>([]);
	const counterRef = useRef(0);

	useEffect(() => {
		if (!isRaining) {
			counterRef.current = 0;
			return;
		}
		const columns = 8;
		const columnIndices = Array.from({ length: columns }, (_, i) => i);
		const shuffle = (array: number[]) => {
			for (let i = array.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[array[i], array[j]] = [array[j], array[i]];
			}
			return array;
		};
		let shuffled = shuffle([...columnIndices]);

		const interval = setInterval(() => {
			if (counterRef.current % columns === 0) {
				shuffled = shuffle([...columnIndices]);
			}
			const columnIndex = shuffled[counterRef.current % columns];
			const x =
				columnIndex * (100 / columns) + Math.random() * (100 / columns) * 0.8;
			setImages((prev) => [
				...prev,
				{ id: Math.random().toString(36).substring(7), x },
			]);
			counterRef.current++;
		}, 150);
		return () => clearInterval(interval);
	}, [isRaining]);

	return (
		<>
			{images.map((img) => (
				<motion.img
					key={img.id}
					src="https://images.weserv.nl/?url=https://files.catbox.moe/5n0ofa.gif&n=-1"
					alt=""
					referrerPolicy="no-referrer"
					initial={{ y: -120, x: `${img.x}vw`, opacity: 1 }}
					animate={{ y: "110vh" }}
					transition={{ duration: 2, ease: "linear" }}
					onAnimationComplete={() => {
						setImages((prev) => prev.filter((i) => i.id !== img.id));
					}}
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						width: "120px",
						height: "120px",
						zIndex: 2147483647,
						pointerEvents: "none",
						objectFit: "contain",
					}}
				/>
			))}
		</>
	);
});

function getLuminance(colorStr: string): number | null {
	if (!colorStr || colorStr === "transparent") return null;
	const s = colorStr.trim().toLowerCase();
	let r = 0,
		g = 0,
		b = 0;
	if (s.startsWith("#")) {
		let hex = s.slice(1);
		if (hex.length === 3)
			hex = hex
				.split("")
				.map((c) => c + c)
				.join("");
		if (hex.length >= 6) {
			r = parseInt(hex.slice(0, 2), 16) / 255;
			g = parseInt(hex.slice(2, 4), 16) / 255;
			b = parseInt(hex.slice(4, 6), 16) / 255;
		} else {
			return null;
		}
	} else if (s.startsWith("rgb")) {
		const match = s.match(/\(([^)]+)\)/);
		if (!match) return null;
		const parts = match[1].split(/[\s,]+/).map(Number);
		if (parts.length >= 3) {
			r = parts[0] / 255;
			g = parts[1] / 255;
			b = parts[2] / 255;
		} else {
			return null;
		}
	} else {
		return null;
	}
	const toLinear = (c: number) =>
		c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function App() {
	const isDarkTheme = useAtomValue(isDarkThemeAtom);
	const legacyDarkTheme = useAtomValue(legacyDarkThemeAtom);
	const toolMode = useAtomValue(toolModeAtom);
	const projectIdentity = useAtomValue(projectIdentityAtom);

	useEffect(() => {
		if (
			projectIdentity &&
			!projectIdentity.isUntitled &&
			projectIdentity.displayName
		) {
			document.title = `${projectIdentity.displayName} — TTML Editor`;
		} else {
			document.title = "TTML Editor";
		}
	}, [projectIdentity]);
	const [previewFullscreen, setPreviewFullscreen] = useAtom(
		previewFullscreenAtom,
	);
	const isPreviewFullscreen =
		previewFullscreen && toolMode === ToolMode.Preview;
	const savedPreFullscreenSize = useRef<PhysicalSize | null>(null);
	const wasMaximizedBeforeFullscreen = useRef<boolean>(false);
	const isCurrentlyFullscreen = useRef<boolean>(false);
	const showTouchSyncPanel = useAtomValue(showTouchSyncPanelAtom);
	const showPreviewPanel = useAtomValue(showPreviewPanelAtom);
	// Preview mode already owns the entire editor area. Keep the sync preview
	// pane's setting intact for when the user returns, but never render a second
	// preview beside it.
	const previewPanelVisible = showPreviewPanel && toolMode !== ToolMode.Preview;
	const customBackgroundImage = useAtomValue(customBackgroundImageAtom);
	const customBackgroundOpacity = useAtomValue(customBackgroundOpacityAtom);
	const customBackgroundMask = useAtomValue(customBackgroundMaskAtom);
	const customBackgroundBlur = useAtomValue(customBackgroundBlurAtom);
	const customBackgroundBrightness = useAtomValue(
		customBackgroundBrightnessAtom,
	);
	const [accentColor, setAccentColor] = useAtom(accentColorAtom);
	const useCustomAccent = useAtomValue(useCustomAccentAtom);
	const customAccentColor = useAtomValue(customAccentColorAtom);

	const useCustomGradient = useAtomValue(useCustomGradientAtom);
	const customGradientColors = useAtomValue(customGradientColorsAtom);
	const customGradientType = useAtomValue(customGradientTypeAtom);
	const customGradientOpacity = useAtomValue(customGradientOpacityAtom);
	const customGradientCenter = useAtomValue(customGradientCenterAtom);
	const customGradientAngle = useAtomValue(customGradientAngleAtom);
	const customGradientSize = useAtomValue(customGradientSizeAtom);
	const appFont = useAtomValue(appFontAtom);
	const editorFont = useAtomValue(editorFontAtom);
	const previewFont = useAtomValue(previewFontAtom);
	const appFontWeight = useAtomValue(appFontWeightAtom);
	const appFontStyle = useAtomValue(appFontStyleAtom);
	const customFontData = useAtomValue(customFontDataAtom);
	const customFontName = useAtomValue(customFontNameAtom);
	const customEditorFontData = useAtomValue(customEditorFontDataAtom);
	const customEditorFontName = useAtomValue(customEditorFontNameAtom);
	const customPreviewFontData = useAtomValue(customPreviewFontDataAtom);
	const customPreviewFontName = useAtomValue(customPreviewFontNameAtom);
	const glassmorphismBlur = useAtomValue(glassmorphismBlurAtom);
	const advPrimaryText = useAtomValue(advancedPrimaryTextColorAtom);
	const advSecondaryText = useAtomValue(advancedSecondaryTextColorAtom);
	const advWaveformColor = useAtomValue(advancedWaveformColorAtom);
	const advWaveformProgress = useAtomValue(advancedWaveformProgressColorAtom);

	const vTitlebarBg = useAtomValue(advTitlebarBgAtom);
	const vSidebarBg = useAtomValue(advSidebarBgAtom);
	const vSidebarActive = useAtomValue(advSidebarActiveAtom);
	const vMenuHover = useAtomValue(advMenuHoverBgAtom);
	const vEditorBg = useAtomValue(advEditorBgAtom);
	const [vActiveLine, setVActiveLine] = useAtom(advActiveLineBgAtom);
	const vLineHover = useAtomValue(advLineHoverBgAtom);
	const vChipRadius = useAtomValue(advChipBorderRadiusAtom);
	const vChipGap = useAtomValue(advChipGapAtom);
	const vChipPaddingV = useAtomValue(advChipPaddingVerticalAtom);
	const vChipPaddingH = useAtomValue(advChipPaddingHorizontalAtom);
	const vRomanColor = useAtomValue(advRomanizationColorAtom);
	const vTransColor = useAtomValue(advTranslationColorAtom);
	const vAudioBarBg = useAtomValue(advAudioBarBgAtom);
	const vAudioBarText = useAtomValue(advAudioBarTextAtom);
	const vScrollbar = useAtomValue(advScrollbarColorAtom);
	const vDialogBg = useAtomValue(advDialogBgAtom);
	const vDialogBorder = useAtomValue(advDialogBorderAtom);
	const vGlobalRadius = useAtomValue(advGlobalBorderRadiusAtom);
	const vGlobalBorderWidth = useAtomValue(advGlobalBorderWidthAtom);
	const vShadow = useAtomValue(advShadowIntensityAtom);
	const [vSelection, setVSelection] = useAtom(advSelectionColorAtom);
	const vBackdropBlur = useAtomValue(advBackdropBlurAtom);
	const appLayoutOrder = useAtomValue(appLayoutOrderAtom);
	const vRibbonPosition = useAtomValue(vRibbonPositionAtom);
	const spectrogramFullWidth = useAtomValue(spectrogramFullWidthAtom);

	useEffect(() => {
		if (vActiveLine === "rgba(56, 189, 248, 0.2)") {
			setVActiveLine("");
		}
		if (vSelection === "rgba(56, 189, 248, 0.3)") {
			setVSelection("");
		}
		const defaultThemeMigrated = localStorage.getItem(
			"amll-theme-grayscale-v1",
		);
		if (!defaultThemeMigrated) {
			localStorage.setItem("amll-theme-grayscale-v1", "true");
			if (accentColor === "red") {
				setAccentColor("gray");
			}
		}
	}, [
		vActiveLine,
		vSelection,
		setVActiveLine,
		setVSelection,
		accentColor,
		setAccentColor,
	]);

	const boykisserMode = useAtomValue(boykisserModeAtom);
	const [boykisserUnlocked, setBoykisserUnlocked] = useAtom(
		boykisserUnlockedAtom,
	);
	const [, setTypedSequence] = useState("");

	useEffect(() => {
		const isTauri =
			typeof window !== "undefined" &&
			(!!(window as any).__TAURI__ || !!import.meta.env.TAURI_ENV_PLATFORM);
		const isPwa =
			typeof window !== "undefined" &&
			(window.matchMedia("(display-mode: standalone)").matches ||
				(window.navigator as any).standalone);
		const isApp = isTauri || isPwa;

		if (!isApp) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't trigger if typing in text inputs or textareas
			const activeElement = document.activeElement;
			if (
				activeElement &&
				(activeElement.tagName === "INPUT" ||
					activeElement.tagName === "TEXTAREA" ||
					activeElement.getAttribute("contenteditable") === "true")
			) {
				return;
			}

			if (e.key.length === 1) {
				setTypedSequence((prev) => {
					const next = (prev + e.key.toLowerCase()).slice(-9);
					if (next === "boykisser") {
						setBoykisserUnlocked(true);
					}
					return next;
				});
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [setBoykisserUnlocked]);

	const isApp = useMemo(() => {
		const isTauri =
			typeof window !== "undefined" &&
			(!!(window as any).__TAURI__ || !!import.meta.env.TAURI_ENV_PLATFORM);
		const isPwa =
			typeof window !== "undefined" &&
			(window.matchMedia("(display-mode: standalone)").matches ||
				(window.navigator as any).standalone);
		return isTauri || isPwa;
	}, []);

	const isUnlocked = !isApp || boykisserUnlocked;

	const [isRaining, setIsRaining] = useState(false);

	const startRain = useCallback(() => {
		if (isRaining) return;
		setIsRaining(true);
		setTimeout(() => setIsRaining(false), 3000);
	}, [isRaining]);

	useEffect(() => {
		const fontsToCheck = [appFont];
		if (editorFont && editorFont !== "inherit") fontsToCheck.push(editorFont);
		if (previewFont && previewFont !== "default" && previewFont !== "inherit") {
			fontsToCheck.push(previewFont);
		}

		const customNames = [
			customFontName,
			customEditorFontName,
			customPreviewFontName,
		].filter(Boolean);

		for (const fontStr of fontsToCheck) {
			const match = fontStr.match(/"([^"]+)"/);
			if (match) {
				const fontName = match[1];
				const SYSTEM_NAMES = [
					"MiSans",
					"Inter",
					"system-ui",
					"SpicyLyrics",
					"Arial",
					"Helvetica",
					"Helvetica Neue",
					"Verdana",
					"Tahoma",
					"Trebuchet MS",
					"Impact",
					"Times New Roman",
					"Times",
					"Georgia",
					"Garamond",
					"Courier New",
					"Courier",
					"Comic Sans MS",
					"Palatino",
					"Palatino Linotype",
					"Bookman",
					"Bookman Old Style",
					"Apple System",
					"Segoe UI",
					"San Francisco",
					"SF Pro",
					"SF Pro Display",
					"Avenir",
					"Avenir Next",
					"Futura",
					"Optima",
					"Gill Sans",
					"Franklin Gothic",
					"Century Gothic",
					"Lucida Grande",
				];
				if (
					!customNames.includes(fontName) &&
					!SYSTEM_NAMES.includes(fontName)
				) {
					const fontId = `google-font-${fontName.replace(/\s+/g, "-")}`;
					if (!document.getElementById(fontId)) {
						const link = document.createElement("link");
						link.id = fontId;
						link.rel = "stylesheet";
						link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, "+")}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;
						link.onerror = () => {
							link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, "+")}&display=swap`;
						};
						document.head.appendChild(link);
					}
				}
			}
		}
	}, [
		appFont,
		editorFont,
		previewFont,
		customFontName,
		customEditorFontName,
		customPreviewFontName,
	]);

	const backgroundMode = useAtomValue(backgroundModeAtom);
	const selectedGradientId = useAtomValue(selectedGradientAtom);
	const selectedGradient = backgroundGradients.find(
		(g) => g.id === selectedGradientId,
	);
	const hasCustomBackground = useAtomValue(hasCustomBackgroundAtom);

	const customThemeStyles = useCustomAccent
		? generateRadixScale(customAccentColor, isDarkTheme)
		: null;

	const customStyleString = useMemo(() => {
		let vars = "";
		if (customThemeStyles) {
			vars += Object.entries(customThemeStyles)
				.map(([k, v]) => `${k}: ${v} !important;`)
				.join("\n\t\t");
		}

		let customFontFace = "";
		const customFonts = [
			{ name: customFontName, data: customFontData },
			{ name: customEditorFontName, data: customEditorFontData },
			{ name: customPreviewFontName, data: customPreviewFontData },
		];
		for (const cf of customFonts) {
			if (cf.name && cf.data) {
				customFontFace += `
				@font-face {
					font-family: "${cf.name}";
					src: url("${cf.data}");
					font-weight: normal;
					font-style: normal;
				}
				`;
			}
		}

		const resolvedEditorFont =
			editorFont === "inherit" || !editorFont ? appFont : editorFont;
		const resolvedPreviewFont =
			previewFont === "default" || !previewFont
				? '"SpicyLyrics", "Noto Sans Georgian", "VazirmatnRegular", sans-serif'
				: previewFont === "inherit"
					? appFont
					: previewFont;
		const resolvedToxiFont =
			previewFont === "default" || !previewFont
				? '"SF Pro Display", "SF Pro", "Inter", -apple-system, BlinkMacSystemFont, sans-serif'
				: previewFont === "inherit"
					? appFont
					: previewFont;

		const primaryLum = advPrimaryText ? getLuminance(advPrimaryText) : null;
		const secondaryLum = advSecondaryText
			? getLuminance(advSecondaryText)
			: null;
		const editorBgLum = vEditorBg ? getLuminance(vEditorBg) : null;
		const titlebarBgLum = vTitlebarBg ? getLuminance(vTitlebarBg) : null;
		const sidebarBgLum = vSidebarBg ? getLuminance(vSidebarBg) : null;
		const dialogBgLum = vDialogBg ? getLuminance(vDialogBg) : null;
		const audioBarBgLum = vAudioBarBg ? getLuminance(vAudioBarBg) : null;

		// Mode-safe overrides:
		// In light mode, text must be dark (lum < 0.55) and surfaces shouldn't be pitch dark (lum > 0.4 unless transparent)
		// In dark mode, text must be light (lum > 0.35) and surfaces shouldn't be bright white (lum < 0.65 unless transparent)
		const shouldApplyPrimaryText =
			!!advPrimaryText &&
			(isDarkTheme
				? primaryLum === null || primaryLum > 0.35
				: primaryLum === null || primaryLum < 0.55);

		const shouldApplySecondaryText =
			!!advSecondaryText &&
			(isDarkTheme
				? secondaryLum === null || secondaryLum > 0.35
				: secondaryLum === null || secondaryLum < 0.55);

		const shouldApplyEditorBg =
			!!vEditorBg &&
			(vEditorBg === "transparent" ||
				(isDarkTheme
					? editorBgLum === null || editorBgLum < 0.65
					: editorBgLum === null || editorBgLum > 0.4));

		const shouldApplyTitlebarBg =
			!!vTitlebarBg &&
			(vTitlebarBg === "transparent" ||
				(isDarkTheme
					? titlebarBgLum === null || titlebarBgLum < 0.65
					: titlebarBgLum === null || titlebarBgLum > 0.4));

		const shouldApplySidebarBg =
			!!vSidebarBg &&
			(vSidebarBg === "transparent" ||
				(isDarkTheme
					? sidebarBgLum === null || sidebarBgLum < 0.65
					: sidebarBgLum === null || sidebarBgLum > 0.4));

		const shouldApplyDialogBg =
			!!vDialogBg &&
			(isDarkTheme
				? dialogBgLum === null || dialogBgLum < 0.65
				: dialogBgLum === null || dialogBgLum > 0.4);

		const shouldApplyAudioBarBg =
			!!vAudioBarBg &&
			(vAudioBarBg === "transparent" ||
				(isDarkTheme
					? audioBarBgLum === null || audioBarBgLum < 0.65
					: audioBarBgLum === null || audioBarBgLum > 0.4));

		const rootBg = shouldApplyEditorBg
			? vEditorBg
			: isDarkTheme
				? "#0b0b0d"
				: "#fafafa";

		return `
		${customFontFace}
		:root {
			--default-font-family: ${appFont} !important;
			--editor-font-family: ${resolvedEditorFont} !important;
			--preview-font-family: ${resolvedPreviewFont} !important;
			--toxi-font-family: ${resolvedToxiFont} !important;
			${vEditorBg === "transparent" ? `--color-background: transparent !important; background-color: transparent !important;` : `--color-background: ${rootBg} !important; background-color: ${rootBg} !important;`}
		}
		body {
			${vEditorBg === "transparent" ? `background-color: transparent !important;` : `background-color: ${rootBg} !important;`}
		}
		${
			vEditorBg === "transparent"
				? `
		html, body, #root, .radix-themes {
			background-color: transparent !important;
			background: transparent !important;
		}
		`
				: ""
		}
		.radix-themes {
			--default-font-family: ${appFont} !important;
			--editor-font-family: ${resolvedEditorFont} !important;
			--preview-font-family: ${resolvedPreviewFont} !important;
			--toxi-font-family: ${resolvedToxiFont} !important;
			--glass-blur: ${glassmorphismBlur}px !important;
			--backdrop-blur: ${glassmorphismBlur}px !important;
			${shouldApplyPrimaryText ? `--gray-12: ${advPrimaryText} !important;` : ""}
			${shouldApplySecondaryText ? `--gray-11: ${advSecondaryText} !important;` : ""}
			${advWaveformColor ? `--adv-waveform-color: ${advWaveformColor} !important;` : ""}
			${advWaveformProgress ? `--adv-waveform-progress: ${advWaveformProgress} !important;` : ""}
			
			${shouldApplyTitlebarBg ? `--titlebar-bg: ${vTitlebarBg} !important;` : ""}
			${vTitlebarBg === "transparent" ? `--titlebar-backdrop-filter: none !important;` : ""}
			${shouldApplySidebarBg ? `--sidebar-bg: ${vSidebarBg} !important;` : ""}
			${vSidebarActive ? `--sidebar-active: ${vSidebarActive} !important;` : ""}
			${vMenuHover ? `--menu-hover: ${vMenuHover} !important;` : ""}
			${hasCustomBackground && !shouldApplyEditorBg ? `--editor-bg: transparent !important;` : shouldApplyEditorBg ? `--editor-bg: ${vEditorBg} !important;` : ""}
			${vActiveLine ? `--active-line-bg: ${vActiveLine} !important;` : ""}
			${vLineHover ? `--line-hover-bg: ${vLineHover} !important;` : ""}
			${vSelection ? `--selection-color: ${vSelection} !important;` : ""}
			
			--chip-radius: ${vChipRadius}px !important;
			--chip-gap: ${vChipGap}px !important;
			--chip-padding-v: ${vChipPaddingV}px !important;
			--chip-padding-h: ${vChipPaddingH}px !important;
			
			${vRomanColor ? `--romanization-color: ${vRomanColor} !important;` : ""}
			${vTransColor ? `--translation-color: ${vTransColor} !important;` : ""}
			
			${shouldApplyAudioBarBg ? `--audio-bar-bg: ${vAudioBarBg} !important;` : ""}
			${vAudioBarBg === "transparent" || (!vAudioBarBg && vTitlebarBg === "transparent") ? `--audio-bar-backdrop-filter: none !important;` : ""}
			${vAudioBarText ? `--audio-bar-text: ${vAudioBarText} !important;` : ""}
			
			${vScrollbar ? `--scrollbar-thumb-color: ${vScrollbar} !important;` : ""}
			${shouldApplyDialogBg ? `--dialog-bg: ${vDialogBg} !important;` : ""}
			${vDialogBorder ? `--dialog-border: ${vDialogBorder} !important;` : ""}
			
			--global-radius: ${vGlobalRadius}px !important;
			--global-border-width: ${vGlobalBorderWidth}px !important;
			--shadow-intensity: ${vShadow} !important;
			--custom-backdrop-blur: ${vBackdropBlur}px !important;

			--radius-factor: ${vGlobalRadius / 12} !important;

			/* Comprehensive Overrides */
			${shouldApplyTitlebarBg && vTitlebarBg !== "transparent" && (isDarkTheme || titlebarBgLum === null || titlebarBgLum > 0.4) ? `--color-panel-translucent: ${vTitlebarBg} !important;` : ""}
			${shouldApplyEditorBg ? `--color-background: ${vEditorBg} !important;` : ""}
			${vSelection ? `--accent-a5: ${vSelection} !important;` : ""}
			${shouldApplyDialogBg ? `--color-panel-solid: ${vDialogBg} !important;` : ""}
			
			/* Shadow Scaling */
			--shadow-intensity: ${vShadow};
			--rt-shadow-color: ${isDarkTheme ? `rgba(0, 0, 0, calc(0.1 * var(--shadow-intensity)))` : `rgba(0, 0, 0, calc(0.06 * var(--shadow-intensity)))`};
			--shadow-1: 0 1px 2px var(--rt-shadow-color);
			--shadow-2: 0 3px 6px var(--rt-shadow-color);
			--shadow-3: 0 10px 20px var(--rt-shadow-color);
			--shadow-4: 0 15px 30px var(--rt-shadow-color);
			--shadow-5: 0 20px 40px var(--rt-shadow-color);
			--shadow-6: 0 25px 50px var(--rt-shadow-color);

			/* Sidebar & Global Navigation */
			${shouldApplySidebarBg ? `--sidebar-bg: ${vSidebarBg} !important;` : ""}
			${vSidebarActive ? `--sidebar-active: ${vSidebarActive} !important;` : ""}
			${vMenuHover ? `--rt-menu-item-hover-bg: ${vMenuHover} !important;` : ""}
			${vMenuHover ? `--menu-hover: ${vMenuHover} !important;` : ""}

			font-family: var(--default-font-family);
			font-weight: ${appFontWeight} !important;
			font-style: ${appFontStyle} !important;
			${vars}
		}
		`;
	}, [
		isDarkTheme,
		hasCustomBackground,
		customThemeStyles,
		appFont,
		glassmorphismBlur,
		advPrimaryText,
		advSecondaryText,
		advWaveformColor,
		advWaveformProgress,
		vTitlebarBg,
		vSidebarBg,
		vSidebarActive,
		vMenuHover,
		vEditorBg,
		vActiveLine,
		vLineHover,
		vChipRadius,
		vChipGap,
		vChipPaddingV,
		vChipPaddingH,
		vRomanColor,
		vTransColor,
		vAudioBarBg,
		vAudioBarText,
		vScrollbar,
		vDialogBg,
		vDialogBorder,
		vGlobalRadius,
		vGlobalBorderWidth,
		vShadow,
		vSelection,
		vBackdropBlur,
		appFontWeight,
		appFontStyle,
		customFontData,
		customFontName,
		editorFont,
		previewFont,
		customEditorFontData,
		customEditorFontName,
		customPreviewFontData,
		customPreviewFontName,
	]);

	useLayoutEffect(() => {
		const root = document.documentElement;
		root.style.setProperty("--default-font-family", appFont);
		const resolvedEditorFont =
			editorFont === "inherit" || !editorFont ? appFont : editorFont;
		const resolvedPreviewFont =
			previewFont === "default" || !previewFont
				? '"SpicyLyrics", "Noto Sans Georgian", "VazirmatnRegular", sans-serif'
				: previewFont === "inherit"
					? appFont
					: previewFont;
		const resolvedToxiFont =
			previewFont === "default" || !previewFont
				? '"SF Pro Display", "SF Pro", "Inter", -apple-system, BlinkMacSystemFont, sans-serif'
				: previewFont === "inherit"
					? appFont
					: previewFont;
		root.style.setProperty("--editor-font-family", resolvedEditorFont);
		root.style.setProperty("--preview-font-family", resolvedPreviewFont);
		root.style.setProperty("--toxi-font-family", resolvedToxiFont);
	}, [appFont, editorFont, previewFont]);

	const effectiveTheme = isDarkTheme ? "dark" : "light";
	const { checkUpdate, status, update } = useAppUpdate();
	const hasNotifiedRef = useRef(false);
	const setSettingsOpen = useSetAtom(settingsDialogAtom);
	const setSettingsTab = useSetAtom(settingsTabAtom);
	const initCustomBackgroundImage = useSetAtom(customBackgroundImageInitAtom);
	const { t } = useTranslation();
	const store = useStore();

	useEffect(() => {
		initCustomBackgroundImage();
	}, [initCustomBackgroundImage]);

	useEffect(() => {
		if (import.meta.env.TAURI_ENV_PLATFORM) {
			checkUpdate(true);
		}
	}, [checkUpdate]);

	useEffect(() => {
		if (status === "available" && update && !hasNotifiedRef.current) {
			hasNotifiedRef.current = true;

			toast.info(
				<div>
					<div style={{ fontWeight: "bold" }}>
						{t(
							"app.update.updateAvailable",
							"New version available: {version}",
							{
								version: update.version,
							},
						)}
					</div>
				</div>,
				{
					autoClose: 5000,
					onClick: () => {
						setSettingsTab("about");
						setSettingsOpen(true);
					},
				},
			);
		}
	}, [status, update, t, setSettingsOpen, setSettingsTab]);

	const setIsGlobalDragging = useSetAtom(isGlobalFileDraggingAtom);
	const { openFile } = useFileOpener();
	useAudioFeedback();

	useEffect(() => {
		if (!import.meta.env.TAURI_ENV_PLATFORM) {
			return;
		}

		(async () => {
			const file: {
				filename: string;
				data: string;
				ext: string;
			} | null = await invoke("get_open_file_data");

			if (file) {
				log("File data from tauri args", file);

				const fileObj = new File([file.data], file.filename, {
					type: "text/plain",
				});

				openFile(fileObj);
			}
		})();
	}, [openFile]);

	useEffect(() => {
		if (!import.meta.env.TAURI_ENV_PLATFORM) {
			return;
		}

		(async () => {
			try {
				const win = getCurrentWindow();
				if (platform() === "windows") {
					const osVer = version();
					const match = osVer.match(/10\.0\.(\d+)/);
					const build = match ? parseInt(match[1], 10) : 0;
					// Windows builds below 22000 are Windows 10 or earlier (no Mica support)
					if (build > 0 && build < 22000) {
						setHasBackground(true);
						await win.clearEffects().catch(() => {});
					}
				}

				await new Promise((r) => setTimeout(r, 50));

				await win.show().catch(() => {});
			} catch (e) {
				console.error("Window init error:", e);
				try {
					const win = getCurrentWindow();
					await win.show().catch(() => {});
				} catch {}
			}
		})();
	}, []);

	useEffect(() => {
		const onBeforeClose = (evt: BeforeUnloadEvent) => {
			if (store.get(isDirtyAtom)) {
				evt.preventDefault();
				evt.returnValue = "";
			}
		};
		window.addEventListener("beforeunload", onBeforeClose);

		let unlistenClose: (() => void) | undefined;
		let cancelled = false;
		let isPrompting = false;

		const isTauri =
			typeof window !== "undefined" &&
			(!!(window as any).__TAURI__ || !!import.meta.env.TAURI_ENV_PLATFORM);

		if (isTauri) {
			(async () => {
				try {
					const { getCurrentWindow } = await import("@tauri-apps/api/window");
					const appWindow = getCurrentWindow();
					const unlisten = await appWindow.onCloseRequested(async (event) => {
						if (!store.get(isDirtyAtom)) {
							return;
						}

						event.preventDefault();

						if (isPrompting) {
							return;
						}
						isPrompting = true;

						try {
							const title = t(
								"confirmDialog.closeWindow.title",
								"Unsaved Changes",
							);
							const description = t(
								"confirmDialog.closeWindow.description",
								"You have unsaved changes. If you close the window now, these changes will be lost. Are you sure you want to close?",
							);

							let confirmed = false;
							try {
								const { ask } = await import("@tauri-apps/plugin-dialog");
								confirmed = await ask(description, {
									title,
									kind: "warning",
								});
							} catch (dialogErr) {
								logError(
									"Native dialog ask failed, falling back to confirm",
									dialogErr,
								);
								confirmed = window.confirm(`${title}\n\n${description}`);
							}

							if (confirmed) {
								if (unlistenClose) {
									unlistenClose();
									unlistenClose = undefined;
								}
								try {
									await appWindow.destroy();
								} catch {
									await appWindow.close();
								}
							}
						} catch (err) {
							logError("Failed to handle close confirmation", err);
						} finally {
							isPrompting = false;
						}
					});

					if (cancelled) {
						unlisten();
					} else {
						unlistenClose = unlisten;
					}
				} catch (err) {
					logError("Failed to register Tauri close handler", err);
				}
			})();
		}

		return () => {
			cancelled = true;
			window.removeEventListener("beforeunload", onBeforeClose);
			if (unlistenClose) {
				unlistenClose();
			}
		};
	}, [store, t]);

	useEffect(() => {
		const handleDragEnter = (e: DragEvent) => {
			if (e.dataTransfer?.types.includes("Files")) {
				setIsGlobalDragging(true);
			}
		};

		const handleDragOver = (e: DragEvent) => {
			e.preventDefault();
		};

		const handleDragLeave = (e: DragEvent) => {
			if (e.relatedTarget === null) {
				setIsGlobalDragging(false);
			}
		};

		const handleDrop = (e: DragEvent) => {
			e.preventDefault();
			setIsGlobalDragging(false);

			const files = e.dataTransfer?.files;
			if (files && files.length > 0) {
				openFile(files[0]);
			}
		};

		window.addEventListener("dragenter", handleDragEnter);
		window.addEventListener("dragover", handleDragOver);
		window.addEventListener("dragleave", handleDragLeave);
		window.addEventListener("drop", handleDrop);

		return () => {
			window.removeEventListener("dragenter", handleDragEnter);
			window.removeEventListener("dragover", handleDragOver);
			window.removeEventListener("dragleave", handleDragLeave);
			window.removeEventListener("drop", handleDrop);
		};
	}, [setIsGlobalDragging, openFile]);

	useEffect(() => {
		if (toolMode !== ToolMode.Preview && previewFullscreen) {
			setPreviewFullscreen(false);
		}
	}, [toolMode, previewFullscreen, setPreviewFullscreen]);

	useEffect(() => {
		const isTauri =
			typeof window !== "undefined" &&
			(!!(window as any).__TAURI__ || !!import.meta.env.TAURI_ENV_PLATFORM);

		if (isTauri) {
			let unlisten: (() => void) | undefined;
			try {
				const win = getCurrentWindow();
				Promise.all([
					win.isFullscreen().catch(() => false),
					win.isMaximized().catch(() => false),
					win.innerSize().catch(() => null),
				]).then(([fs, max, size]) => {
					isCurrentlyFullscreen.current = fs;
					wasMaximizedBeforeFullscreen.current = max;
					if (!fs && !max && size && size.width > 0 && size.height > 0) {
						savedPreFullscreenSize.current = size;
					}
				});

				win.onResized(async () => {
					try {
						const [fs, max, size] = await Promise.all([
							win.isFullscreen().catch(() => false),
							win.isMaximized().catch(() => false),
							win.innerSize().catch(() => null),
						]);

						if (fs) {
							isCurrentlyFullscreen.current = true;
						} else {
							if (isCurrentlyFullscreen.current) {
								isCurrentlyFullscreen.current = false;
								if (previewFullscreen) {
									setPreviewFullscreen(false);
								}
								const savedSize = savedPreFullscreenSize.current;
								const wasMax = wasMaximizedBeforeFullscreen.current;
								if (savedSize && !wasMax) {
									setTimeout(async () => {
										try {
											const currentFs = await win
												.isFullscreen()
												.catch(() => false);
											if (!currentFs && savedSize) {
												await win.setSize(savedSize);
											}
										} catch {}
									}, 350);
								}
							} else {
								wasMaximizedBeforeFullscreen.current = max;
								if (!max && size && size.width > 0 && size.height > 0) {
									savedPreFullscreenSize.current = size;
								}
							}
						}
					} catch {}
				}).then((fn) => {
					unlisten = fn;
				});
			} catch {}
			return () => {
				unlisten?.();
			};
		}

		const handleFullscreenChange = () => {
			if (!document.fullscreenElement && previewFullscreen) {
				setPreviewFullscreen(false);
			}
		};
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => {
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
		};
	}, [previewFullscreen, setPreviewFullscreen]);

	useEffect(() => {
		const isTauri =
			typeof window !== "undefined" &&
			(!!(window as any).__TAURI__ || !!import.meta.env.TAURI_ENV_PLATFORM);

		if (isPreviewFullscreen) {
			if (isTauri) {
				try {
					const win = getCurrentWindow();
					Promise.all([
						win.isMaximized().catch(() => false),
						win.isFullscreen().catch(() => false),
						win.innerSize().catch(() => null),
					]).then(([isMax, isFs, size]) => {
						if (!isFs) {
							wasMaximizedBeforeFullscreen.current = isMax;
							if (!isMax && size) {
								savedPreFullscreenSize.current = size;
							}
						}
						win.setFullscreen(true).catch(() => {});
					});
				} catch {}
			} else {
				if (
					!document.fullscreenElement &&
					document.documentElement.requestFullscreen
				) {
					document.documentElement.requestFullscreen().catch(() => {});
				}
			}
		} else {
			if (isTauri) {
				try {
					const win = getCurrentWindow();
					win.setFullscreen(false).catch(() => {});
					const savedSize = savedPreFullscreenSize.current;
					const wasMax = wasMaximizedBeforeFullscreen.current;
					if (savedSize && !wasMax) {
						setTimeout(async () => {
							try {
								const currentFs = await win.isFullscreen().catch(() => false);
								if (!currentFs && savedSize) {
									await win.setSize(savedSize);
								}
							} catch {}
						}, 350);
					}
				} catch {}
			} else {
				if (document.fullscreenElement && document.exitFullscreen) {
					document.exitFullscreen().catch(() => {});
				}
			}
		}
	}, [isPreviewFullscreen]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName))
				return;
			if (e.key === "Escape" && isPreviewFullscreen) {
				setPreviewFullscreen(false);
			} else if (
				(e.key === "f" || e.key === "F") &&
				toolMode === ToolMode.Preview &&
				!e.ctrlKey &&
				!e.metaKey &&
				!e.altKey
			) {
				setPreviewFullscreen((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isPreviewFullscreen, toolMode, setPreviewFullscreen]);

	const [uiScale, setUiScale] = useAtom(uiScaleAtom);

	const normalizedScale = useMemo(() => {
		return (
			Math.max(
				MIN_UI_SCALE,
				Math.min(MAX_UI_SCALE, uiScale || DEFAULT_UI_SCALE),
			) / 100
		);
	}, [uiScale]);

	useEffect(() => {
		// Clean up any lingering non-standard CSS zoom property
		document.documentElement.style.removeProperty("zoom");

		const isTauri =
			typeof window !== "undefined" &&
			(!!(window as any).__TAURI__ ||
				!!(window as any).__TAURI_INTERNALS__ ||
				!!import.meta.env.TAURI_ENV_PLATFORM);

		if (isTauri) {
			try {
				getCurrentWebview()
					.setZoom(normalizedScale)
					.catch((err) => {
						console.warn("Failed to set webview zoom:", err);
					});
			} catch (err) {
				console.warn("Failed to invoke getCurrentWebview().setZoom:", err);
			}
		} else {
			document.documentElement.style.fontSize = `${normalizedScale * 100}%`;
		}

		document.documentElement.style.setProperty(
			"--scaling",
			String(normalizedScale),
		);
		document.documentElement.style.setProperty(
			"--ui-scale",
			String(normalizedScale),
		);
	}, [normalizedScale]);

	useEffect(() => {
		const handleZoomKeys = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey) {
				if (e.key === "=" || e.key === "+") {
					e.preventDefault();
					setUiScale((prev) => {
						const next = Math.min(MAX_UI_SCALE, (prev || DEFAULT_UI_SCALE) + 5);
						toast.info(`UI Scale: ${next}%`, {
							autoClose: 1000,
							toastId: "ui-scale-toast",
						});
						return next;
					});
				} else if (e.key === "-" || e.key === "_") {
					e.preventDefault();
					setUiScale((prev) => {
						const next = Math.max(MIN_UI_SCALE, (prev || DEFAULT_UI_SCALE) - 5);
						toast.info(`UI Scale: ${next}%`, {
							autoClose: 1000,
							toastId: "ui-scale-toast",
						});
						return next;
					});
				} else if (e.key === "0") {
					e.preventDefault();
					setUiScale(() => {
						toast.info(`UI Scale: ${DEFAULT_UI_SCALE}%`, {
							autoClose: 1000,
							toastId: "ui-scale-toast",
						});
						return DEFAULT_UI_SCALE;
					});
				}
			}
		};
		window.addEventListener("keydown", handleZoomKeys, { capture: true });
		return () =>
			window.removeEventListener("keydown", handleZoomKeys, { capture: true });
	}, [setUiScale]);

	useEffect(() => {
		const isDark = effectiveTheme === "dark";
		const addClass = isDark ? "dark" : "light";
		const removeClass = isDark ? "light" : "dark";
		document.documentElement.classList.remove(removeClass);
		document.documentElement.classList.add(addClass, "radix-themes");
		document.body.classList.remove(removeClass);
		document.body.classList.add(addClass, "radix-themes");
	}, [effectiveTheme]);

	return (
		<Theme
			appearance={effectiveTheme}
			data-legacy-dark-theme={legacyDarkTheme || undefined}
			panelBackground="translucent"
			hasBackground={true}
			accentColor={accentColor}
			className={styles.radixTheme}
		>
			<ErrorBoundary
				FallbackComponent={AppErrorPage}
				onReset={(_details) => {
					// TODO
				}}
			>
				<MigrationNotice />
				<DiscordPresence />
				<BeginnerGuide />
				<ChecklistBackgroundSync />
				{customStyleString ? <style>{customStyleString}</style> : null}
				{hasCustomBackground && (
					<div className={styles.customBackgroundLayer} aria-hidden="true">
						<div
							className={styles.customBackgroundImage}
							style={{
								backgroundImage:
									backgroundMode === "image"
										? `url("${customBackgroundImage}")`
										: useCustomGradient
											? generateGradient(
													customGradientColors,
													customGradientType,
													customGradientCenter,
													customGradientAngle,
													customGradientSize,
												)
											: selectedGradient?.css,
								opacity:
									backgroundMode === "gradient"
										? customGradientOpacity
										: customBackgroundOpacity,
								filter: `blur(${customBackgroundBlur}px) brightness(${customBackgroundBrightness})`,
							}}
						/>
						<div
							className={styles.customBackgroundMask}
							style={{
								opacity: customBackgroundMask,
							}}
						/>
					</div>
				)}
				<div className={styles.appContent}>
					<AutosaveManager />
					<ProjectTimerManager />
					<GlobalDragOverlay />
					{toolMode === ToolMode.Sync && <SyncKeyBinding />}
					<UrbanDictionaryKeybinding />
					<LinePropertiesKeybinding />
					<DarkThemeDetector />
					<Flex direction="column" height="100vh">
						{!isPreviewFullscreen && <TitleBar key="titlebar" />}
						{(() => {
							const sidePreviewPanelElement = previewPanelVisible ? (
								<ResizablePanel>
									<SuspensePlaceHolder key="preview-panel">
										<motion.div
											layout="position"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											exit={{ opacity: 0 }}
											style={{ height: "100%", padding: "4px" }}
										>
											<SidePreviewPanel />
										</motion.div>
									</SuspensePlaceHolder>
								</ResizablePanel>
							) : null;

							const renderLayoutItem = (id: string) => {
								if (id === "titlebar") return null;
								if (
									id === "ribbonbar" &&
									!isPreviewFullscreen &&
									(vRibbonPosition === "top" || vRibbonPosition === "bottom")
								) {
									return (
										<RibbonBar key="ribbonbar" position={vRibbonPosition} />
									);
								}
								if (id === "editor") {
									const editorContent = (
										<Box
											flexGrow="1"
											minWidth="0"
											overflow="hidden"
											key="editor-content"
											style={{
												backgroundColor: hasCustomBackground
													? "transparent"
													: "var(--editor-bg, transparent)",
											}}
										>
											<Flex height="100%" overflow="hidden">
												<Box flexGrow="1" minWidth="0" overflow="hidden">
													<AnimatePresence mode="wait">
														{toolMode !== ToolMode.Preview && (
															<SuspensePlaceHolder key={toolMode}>
																<motion.div
																	layout="position"
																	style={{
																		height: "100%",
																		maxHeight: "100%",
																		overflowY: "hidden",
																	}}
																	initial={{ opacity: 0 }}
																	animate={{ opacity: 1 }}
																	exit={{ opacity: 0 }}
																>
																	<LyricLinesView key={toolMode} />
																</motion.div>
															</SuspensePlaceHolder>
														)}
														{toolMode === ToolMode.Preview && (
															<SuspensePlaceHolder key="preview-switcher">
																<Box
																	height="100%"
																	key="preview-switcher"
																	p="0"
																	asChild
																>
																	<motion.div
																		layout="position"
																		initial={{ opacity: 0 }}
																		animate={{ opacity: 1 }}
																		exit={{ opacity: 0 }}
																	>
																		<PreviewModeSwitcher />
																	</motion.div>
																</Box>
															</SuspensePlaceHolder>
														)}
													</AnimatePresence>
												</Box>
											</Flex>
										</Box>
									);

									const renderedEditor =
										!isPreviewFullscreen &&
										(vRibbonPosition === "left" ||
											vRibbonPosition === "right") ? (
											<Flex
												direction="row"
												flexGrow="1"
												minWidth="0"
												overflow="hidden"
												key="editor-row"
											>
												{vRibbonPosition === "left" && (
													<RibbonBar isSidebar position="left" />
												)}
												{editorContent}
												{vRibbonPosition === "right" && (
													<RibbonBar isSidebar position="right" />
												)}
											</Flex>
										) : (
											editorContent
										);

									return renderedEditor;
								}
								if (id === "audio-controls") {
									return (
										<Box
											flexShrink="0"
											key="audio-controls"
											style={{
												display: isPreviewFullscreen ? "none" : undefined,
											}}
										>
											<AudioControls />
										</Box>
									);
								}
								return null;
							};

							if (spectrogramFullWidth) {
								const isAudioTop =
									appLayoutOrder.indexOf("audio-controls") <
									appLayoutOrder.indexOf("editor");

								const middleRow = (
									<Flex
										direction="row"
										flexGrow="1"
										overflow="hidden"
										minHeight="0"
									>
										<Flex
											direction="column"
											flexGrow="1"
											minWidth="0"
											overflow="hidden"
											height="100%"
										>
											{appLayoutOrder
												.filter((id) => id !== "audio-controls")
												.map((id) => renderLayoutItem(id))}
											{showTouchSyncPanel && toolMode === ToolMode.Sync && (
												<TouchSyncPanel />
											)}
										</Flex>
										{sidePreviewPanelElement}
									</Flex>
								);

								return (
									<Flex
										direction="column"
										flexGrow="1"
										overflow="hidden"
										minHeight="0"
									>
										{isAudioTop && renderLayoutItem("audio-controls")}
										{middleRow}
										{!isAudioTop && renderLayoutItem("audio-controls")}
									</Flex>
								);
							}

							return (
								<Flex
									direction="row"
									flexGrow="1"
									overflow="hidden"
									minHeight="0"
								>
									<Flex
										direction="column"
										flexGrow="1"
										minWidth="0"
										overflow="hidden"
										height="100%"
									>
										{appLayoutOrder.map((id) => renderLayoutItem(id))}
										{showTouchSyncPanel && toolMode === ToolMode.Sync && (
											<TouchSyncPanel />
										)}
									</Flex>
									{sidePreviewPanelElement}
								</Flex>
							);
						})()}
					</Flex>
					<Suspense fallback={null}>
						<Dialogs />
					</Suspense>
					<ToastContainer
						theme={effectiveTheme}
						hideProgressBar={true}
						transition={Slide}
						autoClose={4000}
					/>
					{boykisserMode &&
						isUnlocked &&
						!window.location.href.includes("spicylyrics.org") && (
							<img
								src="https://images.weserv.nl/?url=https://files.catbox.moe/5n0ofa.gif&n=-1"
								alt=""
								referrerPolicy="no-referrer"
								onClick={startRain}
								style={{
									position: "fixed",
									top: "28px",
									right: "120px",
									width: "20px",
									height: "20px",
									pointerEvents: "auto",
									cursor: "pointer",
									zIndex: 9999,
									objectFit: "contain",
								}}
							/>
						)}
				</div>
				<RainEffect isRaining={isRaining} />
			</ErrorBoundary>
		</Theme>
	);
}

export default App;
