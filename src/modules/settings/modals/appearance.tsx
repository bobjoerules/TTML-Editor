import {
	ContentView24Regular,
	History24Regular,
	PaddingLeft24Regular,
	Save24Regular,
	Speaker224Regular,
	Stack24Regular,
	Timer24Regular,
	VideoBackgroundEffect24Regular,
	Sparkle24Regular,
	TimeAndWeather24Regular,
	TextT24Regular,
	Color24Regular,
	Eye24Regular,
	Checkmark16Regular,
	Checkmark24Regular,
	ZoomIn24Regular,
} from "@fluentui/react-icons";
import {
	Badge,
	Box,
	Button,
	Card,
	Flex,
	Grid,
	Heading,
	IconButton,
	Popover,
	SegmentedControl,
	Slider,
	Switch,
	Text,
	TextField,
	Tooltip,
} from "@radix-ui/themes";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Reorder } from "framer-motion";
import { backgroundGradients } from "$/modules/settings/states/gradients";
import {
	accentColorAtom,
	appFontAtom,
	editorFontAtom,
	previewFontAtom,
	fontSelectionTargetAtom,
	backgroundModeAtom,
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
	glassmorphismBlurAtom,
	AppearanceEditorMode,
	appearanceEditorModeAtom,
	advancedWaveformColorAtom,
	advancedWaveformProgressColorAtom,
	advancedPrimaryTextColorAtom,
	advancedSecondaryTextColorAtom,
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
	legacySpaceLabelsAtom,
	advRomanizationColorAtom,
	advTranslationColorAtom,
	advGeniusHeaderColorAtom,
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
	activePresetIdAtom,
	appearancePresetsAtom,
	type AppearancePreset,
	appLayoutOrderAtom,
	vRibbonPositionAtom,
	spectrogramFullWidthAtom,
	legacyDarkThemeAtom,
	highlightActiveWordAtom,
	enableSyncGlowAnimationAtom,
	highlightErrorsAtom,
} from "$/modules/settings/states/index.ts";
import { instantHighlightFadeAtom } from "$/modules/settings/states/preview.ts";
import { fontSelectionDialogAtom } from "$/states/dialogs.ts";
import {
	isDarkThemeAtom,
	darkModeAtom,
	autoDarkModeAtom,
	DarkMode,
} from "$/states/main.ts";
import { generateGradient, generateRadixScale } from "$/utils/colorScale";
import {
	SettingsCustomBackgroundCard,
	SettingsCustomBackgroundSettings,
} from "./customBackground";
import { UIScaleSetting } from "./UIScaleSetting";

const BUILTIN_PRESETS: AppearancePreset[] = [
	{
		id: "builtin-apple",
		name: "Apple",
		settings: {
			accentColor: "gray",
			useCustomAccent: false,
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: true,
			glassBlur: 20,
			vTitlebarBg: "#161616",
			vSidebarBg: "#161616",
			vSidebarActive: "rgba(255, 255, 255, 0.08)",
			vMenuHover: "rgba(255, 255, 255, 0.06)",
			vEditorBg: "#101010",
			vAudioBarBg: "#161616",
			vDialogBg: "#1c1c1c",
			vDialogBorder: "rgba(255, 255, 255, 0.1)",
			vActiveLine: "rgba(255, 255, 255, 0.08)",
			vLineHover: "rgba(255, 255, 255, 0.04)",
			vSelection: "rgba(255, 255, 255, 0.16)",
			advPrimaryText: "#ffffff",
			advSecondaryText: "rgba(255, 255, 255, 0.65)",
			advWaveformColor: "#333333",
			advWaveformProgress: "#e5e5e5",
			vGlobalRadius: 12,
			darkMode: DarkMode.Dark,
		},
		lightSettings: {
			accentColor: "gray",
			useCustomAccent: false,
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: false,
			glassBlur: 16,
			vTitlebarBg: "#f5f5f7",
			vSidebarBg: "#ffffff",
			vSidebarActive: "rgba(0, 0, 0, 0.06)",
			vMenuHover: "rgba(0, 0, 0, 0.04)",
			vEditorBg: "#fafafa",
			vAudioBarBg: "#f5f5f7",
			vDialogBg: "#ffffff",
			vDialogBorder: "rgba(0, 0, 0, 0.1)",
			vActiveLine: "rgba(0, 0, 0, 0.05)",
			vLineHover: "rgba(0, 0, 0, 0.025)",
			vSelection: "rgba(0, 0, 0, 0.08)",
			advPrimaryText: "#1d1d1f",
			advSecondaryText: "#6e6e73",
			advWaveformColor: "#d1d1d6",
			advWaveformProgress: "#1d1d1f",
			vGlobalRadius: 12,
			darkMode: DarkMode.Light,
		},
	},
	{
		id: "builtin-clear",
		name: "Clear",
		settings: {
			accentColor: "sky",
			useCustomAccent: false,
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: true,
			glassBlur: 24,
			vTitlebarBg: "transparent",
			vSidebarBg: "transparent",
			vSidebarActive: "rgba(255, 255, 255, 0.1)",
			vMenuHover: "rgba(255, 255, 255, 0.08)",
			vEditorBg: "transparent",
			vAudioBarBg: "transparent",
			vDialogBg: "rgba(20, 20, 26, 0.72)",
			vDialogBorder: "rgba(255, 255, 255, 0.12)",
			vActiveLine: "rgba(56, 189, 248, 0.16)",
			vLineHover: "rgba(255, 255, 255, 0.06)",
			vSelection: "rgba(56, 189, 248, 0.25)",
			advPrimaryText: "#ffffff",
			advSecondaryText: "rgba(255, 255, 255, 0.7)",
			advWaveformColor: "rgba(255, 255, 255, 0.2)",
			advWaveformProgress: "#38bdf8",
			vGlobalRadius: 16,
			darkMode: DarkMode.Dark,
		},
		lightSettings: {
			accentColor: "sky",
			useCustomAccent: false,
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: false,
			glassBlur: 24,
			vTitlebarBg: "transparent",
			vSidebarBg: "transparent",
			vSidebarActive: "rgba(0, 0, 0, 0.08)",
			vMenuHover: "rgba(0, 0, 0, 0.05)",
			vEditorBg: "transparent",
			vAudioBarBg: "transparent",
			vDialogBg: "rgba(255, 255, 255, 0.78)",
			vDialogBorder: "rgba(0, 0, 0, 0.08)",
			vActiveLine: "rgba(14, 165, 233, 0.12)",
			vLineHover: "rgba(0, 0, 0, 0.05)",
			vSelection: "rgba(14, 165, 233, 0.18)",
			advPrimaryText: "#0f172a",
			advSecondaryText: "#475569",
			advWaveformColor: "rgba(0, 0, 0, 0.15)",
			advWaveformProgress: "#0284c7",
			vGlobalRadius: 16,
			darkMode: DarkMode.Light,
		},
	},
	{
		id: "builtin-sunset-dark",
		name: "Sunset Vibes",
		settings: {
			accentColor: "ruby",
			useCustomAccent: true,
			customAccentColor: "#f43f5e",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: true,
			glassBlur: 18,
			vTitlebarBg: "#1c0e18",
			vSidebarBg: "#251220",
			vSidebarActive: "rgba(244, 63, 94, 0.15)",
			vMenuHover: "rgba(244, 63, 94, 0.1)",
			vEditorBg: "#130911",
			vAudioBarBg: "#1c0e18",
			vDialogBg: "#261322",
			vDialogBorder: "rgba(244, 63, 94, 0.2)",
			vActiveLine: "rgba(244, 63, 94, 0.18)",
			vLineHover: "rgba(244, 63, 94, 0.08)",
			vSelection: "rgba(244, 63, 94, 0.3)",
			advPrimaryText: "#fff1f2",
			advSecondaryText: "#fda4af",
			advWaveformColor: "#4c1d30",
			advWaveformProgress: "#fb7185",
			vRomanColor: "#f472b6",
			vTransColor: "#fca5a5",
			vGeniusHeaderColor: "#fb923c",
			vGlobalRadius: 14,
			darkMode: DarkMode.Dark,
		},
		lightSettings: {
			accentColor: "ruby",
			useCustomAccent: true,
			customAccentColor: "#e11d48",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: false,
			glassBlur: 18,
			vTitlebarBg: "#fff0f3",
			vSidebarBg: "#ffe4e9",
			vSidebarActive: "rgba(225, 29, 72, 0.12)",
			vMenuHover: "rgba(225, 29, 72, 0.08)",
			vEditorBg: "#fffbfb",
			vAudioBarBg: "#fff0f3",
			vDialogBg: "#ffffff",
			vDialogBorder: "rgba(225, 29, 72, 0.15)",
			vActiveLine: "rgba(225, 29, 72, 0.1)",
			vLineHover: "rgba(225, 29, 72, 0.04)",
			vSelection: "rgba(225, 29, 72, 0.2)",
			advPrimaryText: "#380b18",
			advSecondaryText: "#9f1239",
			advWaveformColor: "#fecdd3",
			advWaveformProgress: "#e11d48",
			vGlobalRadius: 14,
			darkMode: DarkMode.Light,
		},
	},
	{
		id: "builtin-nord",
		name: "Nord Frost",
		settings: {
			accentColor: "cyan",
			useCustomAccent: true,
			customAccentColor: "#88c0d0",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: true,
			glassBlur: 16,
			vTitlebarBg: "#242933",
			vSidebarBg: "#2e3440",
			vSidebarActive: "rgba(136, 192, 208, 0.16)",
			vMenuHover: "rgba(136, 192, 208, 0.1)",
			vEditorBg: "#1f232a",
			vAudioBarBg: "#242933",
			vDialogBg: "#2e3440",
			vDialogBorder: "rgba(136, 192, 208, 0.2)",
			vActiveLine: "rgba(136, 192, 208, 0.16)",
			vLineHover: "rgba(136, 192, 208, 0.07)",
			vSelection: "rgba(136, 192, 208, 0.28)",
			advPrimaryText: "#eceff4",
			advSecondaryText: "#d8dee9",
			advWaveformColor: "#3b4252",
			advWaveformProgress: "#88c0d0",
			vRomanColor: "#81a1c1",
			vTransColor: "#a3be8c",
			vGeniusHeaderColor: "#ebcb8b",
			vGlobalRadius: 10,
			darkMode: DarkMode.Dark,
		},
		lightSettings: {
			accentColor: "cyan",
			useCustomAccent: true,
			customAccentColor: "#5e81ac",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: false,
			glassBlur: 16,
			vTitlebarBg: "#e5e9f0",
			vSidebarBg: "#d8dee9",
			vSidebarActive: "rgba(94, 129, 172, 0.14)",
			vMenuHover: "rgba(94, 129, 172, 0.08)",
			vEditorBg: "#eceff4",
			vAudioBarBg: "#e5e9f0",
			vDialogBg: "#ffffff",
			vDialogBorder: "rgba(94, 129, 172, 0.15)",
			vActiveLine: "rgba(94, 129, 172, 0.12)",
			vLineHover: "rgba(94, 129, 172, 0.05)",
			vSelection: "rgba(94, 129, 172, 0.2)",
			advPrimaryText: "#2e3440",
			advSecondaryText: "#4c566a",
			advWaveformColor: "#d8dee9",
			advWaveformProgress: "#5e81ac",
			vGlobalRadius: 10,
			darkMode: DarkMode.Light,
		},
	},
	{
		id: "builtin-catppuccin",
		name: "Catppuccin Mocha",
		settings: {
			accentColor: "violet",
			useCustomAccent: true,
			customAccentColor: "#cba6f7",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: true,
			glassBlur: 16,
			vTitlebarBg: "#181825",
			vSidebarBg: "#11111b",
			vSidebarActive: "rgba(203, 166, 247, 0.16)",
			vMenuHover: "rgba(203, 166, 247, 0.1)",
			vEditorBg: "#1e1e2e",
			vAudioBarBg: "#181825",
			vDialogBg: "#252538",
			vDialogBorder: "rgba(203, 166, 247, 0.2)",
			vActiveLine: "rgba(203, 166, 247, 0.16)",
			vLineHover: "rgba(203, 166, 247, 0.07)",
			vSelection: "rgba(203, 166, 247, 0.28)",
			advPrimaryText: "#cdd6f4",
			advSecondaryText: "#a6adc8",
			advWaveformColor: "#313244",
			advWaveformProgress: "#cba6f7",
			vRomanColor: "#b4befe",
			vTransColor: "#89dceb",
			vGeniusHeaderColor: "#f9e2af",
			vGlobalRadius: 12,
			darkMode: DarkMode.Dark,
		},
		lightSettings: {
			accentColor: "violet",
			useCustomAccent: true,
			customAccentColor: "#8839ef",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: false,
			glassBlur: 16,
			vTitlebarBg: "#e6e9ef",
			vSidebarBg: "#dce0e8",
			vSidebarActive: "rgba(136, 57, 239, 0.14)",
			vMenuHover: "rgba(136, 57, 239, 0.08)",
			vEditorBg: "#eff1f5",
			vAudioBarBg: "#e6e9ef",
			vDialogBg: "#ffffff",
			vDialogBorder: "rgba(136, 57, 239, 0.15)",
			vActiveLine: "rgba(136, 57, 239, 0.12)",
			vLineHover: "rgba(136, 57, 239, 0.05)",
			vSelection: "rgba(136, 57, 239, 0.2)",
			advPrimaryText: "#4c4f69",
			advSecondaryText: "#6c6f85",
			advWaveformColor: "#ccd0da",
			advWaveformProgress: "#8839ef",
			vGlobalRadius: 12,
			darkMode: DarkMode.Light,
		},
	},
	{
		id: "builtin-dracula",
		name: "Dracula",
		settings: {
			accentColor: "purple",
			useCustomAccent: true,
			customAccentColor: "#bd93f9",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: true,
			glassBlur: 18,
			vTitlebarBg: "#21222c",
			vSidebarBg: "#1e1f29",
			vSidebarActive: "rgba(189, 147, 249, 0.16)",
			vMenuHover: "rgba(189, 147, 249, 0.1)",
			vEditorBg: "#282a36",
			vAudioBarBg: "#21222c",
			vDialogBg: "#343746",
			vDialogBorder: "rgba(189, 147, 249, 0.22)",
			vActiveLine: "rgba(68, 71, 90, 0.55)",
			vLineHover: "rgba(68, 71, 90, 0.25)",
			vSelection: "rgba(68, 71, 90, 0.75)",
			advPrimaryText: "#f8f8f2",
			advSecondaryText: "#6272a4",
			advWaveformColor: "#44475a",
			advWaveformProgress: "#ff79c6",
			vRomanColor: "#8be9fd",
			vTransColor: "#50fa7b",
			vGeniusHeaderColor: "#f1fa8c",
			vGlobalRadius: 10,
			darkMode: DarkMode.Dark,
		},
		lightSettings: {
			accentColor: "purple",
			useCustomAccent: true,
			customAccentColor: "#805ad5",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: false,
			glassBlur: 16,
			vTitlebarBg: "#f3f0fa",
			vSidebarBg: "#ebe6f5",
			vSidebarActive: "rgba(128, 90, 213, 0.14)",
			vMenuHover: "rgba(128, 90, 213, 0.08)",
			vEditorBg: "#faf8ff",
			vAudioBarBg: "#f3f0fa",
			vDialogBg: "#ffffff",
			vDialogBorder: "rgba(128, 90, 213, 0.18)",
			vActiveLine: "rgba(128, 90, 213, 0.12)",
			vLineHover: "rgba(128, 90, 213, 0.05)",
			vSelection: "rgba(128, 90, 213, 0.2)",
			advPrimaryText: "#282a36",
			advSecondaryText: "#6272a4",
			advWaveformColor: "#e2d9f3",
			advWaveformProgress: "#805ad5",
			vGlobalRadius: 10,
			darkMode: DarkMode.Light,
		},
	},
	{
		id: "builtin-mystic",
		name: "Mystic Purple",
		settings: {
			accentColor: "purple",
			useCustomAccent: true,
			customAccentColor: "#a855f7",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: true,
			glassBlur: 18,
			vTitlebarBg: "#160e24",
			vSidebarBg: "#1f1333",
			vSidebarActive: "rgba(168, 85, 247, 0.16)",
			vMenuHover: "rgba(168, 85, 247, 0.1)",
			vEditorBg: "#100a1c",
			vAudioBarBg: "#160e24",
			vDialogBg: "#23163a",
			vDialogBorder: "rgba(168, 85, 247, 0.22)",
			vActiveLine: "rgba(168, 85, 247, 0.18)",
			vLineHover: "rgba(168, 85, 247, 0.08)",
			vSelection: "rgba(168, 85, 247, 0.28)",
			advPrimaryText: "#f5f3ff",
			advSecondaryText: "#c4b5fd",
			advWaveformColor: "#3b2361",
			advWaveformProgress: "#c084fc",
			vRomanColor: "#e9d5ff",
			vTransColor: "#d8b4fe",
			vGeniusHeaderColor: "#f472b6",
			vGlobalRadius: 14,
			darkMode: DarkMode.Dark,
		},
		lightSettings: {
			accentColor: "purple",
			useCustomAccent: true,
			customAccentColor: "#9333ea",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: false,
			glassBlur: 18,
			vTitlebarBg: "#f5f0ff",
			vSidebarBg: "#ece2fe",
			vSidebarActive: "rgba(147, 51, 234, 0.12)",
			vMenuHover: "rgba(147, 51, 234, 0.08)",
			vEditorBg: "#faf7ff",
			vAudioBarBg: "#f5f0ff",
			vDialogBg: "#ffffff",
			vDialogBorder: "rgba(147, 51, 234, 0.16)",
			vActiveLine: "rgba(147, 51, 234, 0.1)",
			vLineHover: "rgba(147, 51, 234, 0.04)",
			vSelection: "rgba(147, 51, 234, 0.18)",
			advPrimaryText: "#2e1065",
			advSecondaryText: "#6b21a8",
			advWaveformColor: "#e9d5ff",
			advWaveformProgress: "#9333ea",
			vGlobalRadius: 14,
			darkMode: DarkMode.Light,
		},
	},
	{
		id: "builtin-aurora",
		name: "Emerald Aurora",
		settings: {
			accentColor: "jade",
			useCustomAccent: true,
			customAccentColor: "#10b981",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: true,
			glassBlur: 16,
			vTitlebarBg: "#071a14",
			vSidebarBg: "#0c271e",
			vSidebarActive: "rgba(16, 185, 129, 0.16)",
			vMenuHover: "rgba(16, 185, 129, 0.1)",
			vEditorBg: "#05130f",
			vAudioBarBg: "#071a14",
			vDialogBg: "#0f3126",
			vDialogBorder: "rgba(16, 185, 129, 0.22)",
			vActiveLine: "rgba(16, 185, 129, 0.18)",
			vLineHover: "rgba(16, 185, 129, 0.08)",
			vSelection: "rgba(16, 185, 129, 0.28)",
			advPrimaryText: "#ecfdf5",
			advSecondaryText: "#6ee7b7",
			advWaveformColor: "#134e3a",
			advWaveformProgress: "#34d399",
			vRomanColor: "#a7f3d0",
			vTransColor: "#6ee7b7",
			vGeniusHeaderColor: "#fde047",
			vGlobalRadius: 12,
			darkMode: DarkMode.Dark,
		},
		lightSettings: {
			accentColor: "jade",
			useCustomAccent: true,
			customAccentColor: "#059669",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: false,
			glassBlur: 16,
			vTitlebarBg: "#eaf8f3",
			vSidebarBg: "#def3eb",
			vSidebarActive: "rgba(5, 150, 105, 0.12)",
			vMenuHover: "rgba(5, 150, 105, 0.08)",
			vEditorBg: "#f4fbf8",
			vAudioBarBg: "#eaf8f3",
			vDialogBg: "#ffffff",
			vDialogBorder: "rgba(5, 150, 105, 0.16)",
			vActiveLine: "rgba(5, 150, 105, 0.1)",
			vLineHover: "rgba(5, 150, 105, 0.04)",
			vSelection: "rgba(5, 150, 105, 0.18)",
			advPrimaryText: "#064e3b",
			advSecondaryText: "#047857",
			advWaveformColor: "#a7f3d0",
			advWaveformProgress: "#059669",
			vGlobalRadius: 12,
			darkMode: DarkMode.Light,
		},
	},
	{
		id: "builtin-cyberpunk",
		name: "Cyberpunk Neon",
		settings: {
			accentColor: "pink",
			useCustomAccent: true,
			customAccentColor: "#ff007f",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: true,
			glassBlur: 20,
			vTitlebarBg: "#14081c",
			vSidebarBg: "#1c0b26",
			vSidebarActive: "rgba(255, 0, 127, 0.22)",
			vMenuHover: "rgba(0, 240, 255, 0.12)",
			vEditorBg: "#0d0513",
			vAudioBarBg: "#14081c",
			vDialogBg: "#220d2f",
			vDialogBorder: "rgba(0, 240, 255, 0.3)",
			vActiveLine: "rgba(255, 0, 127, 0.22)",
			vLineHover: "rgba(0, 240, 255, 0.1)",
			vSelection: "rgba(255, 0, 127, 0.35)",
			advPrimaryText: "#fdf4ff",
			advSecondaryText: "#00f0ff",
			advWaveformColor: "#3b114d",
			advWaveformProgress: "#00f0ff",
			vRomanColor: "#ff71ce",
			vTransColor: "#01cdfe",
			vGeniusHeaderColor: "#ffe600",
			vGlobalRadius: 8,
			darkMode: DarkMode.Dark,
		},
		lightSettings: {
			accentColor: "pink",
			useCustomAccent: true,
			customAccentColor: "#e11d48",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: false,
			glassBlur: 16,
			vTitlebarBg: "#fdf2f8",
			vSidebarBg: "#fce7f3",
			vSidebarActive: "rgba(225, 29, 72, 0.14)",
			vMenuHover: "rgba(225, 29, 72, 0.08)",
			vEditorBg: "#ffffff",
			vAudioBarBg: "#fdf2f8",
			vDialogBg: "#ffffff",
			vDialogBorder: "rgba(225, 29, 72, 0.18)",
			vActiveLine: "rgba(225, 29, 72, 0.12)",
			vLineHover: "rgba(225, 29, 72, 0.05)",
			vSelection: "rgba(225, 29, 72, 0.2)",
			advPrimaryText: "#3b0720",
			advSecondaryText: "#9d174d",
			advWaveformColor: "#fbcfe8",
			advWaveformProgress: "#e11d48",
			vGlobalRadius: 8,
			darkMode: DarkMode.Light,
		},
	},
	{
		id: "builtin-obsidian",
		name: "Obsidian Gold",
		settings: {
			accentColor: "amber",
			useCustomAccent: true,
			customAccentColor: "#f59e0b",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: true,
			glassBlur: 18,
			vTitlebarBg: "#14120e",
			vSidebarBg: "#1a1813",
			vSidebarActive: "rgba(245, 158, 11, 0.16)",
			vMenuHover: "rgba(245, 158, 11, 0.1)",
			vEditorBg: "#0d0b09",
			vAudioBarBg: "#14120e",
			vDialogBg: "#221e17",
			vDialogBorder: "rgba(245, 158, 11, 0.22)",
			vActiveLine: "rgba(245, 158, 11, 0.18)",
			vLineHover: "rgba(245, 158, 11, 0.08)",
			vSelection: "rgba(245, 158, 11, 0.28)",
			advPrimaryText: "#fffbeb",
			advSecondaryText: "#fcd34d",
			advWaveformColor: "#3d2d0c",
			advWaveformProgress: "#fbbf24",
			vRomanColor: "#fde68a",
			vTransColor: "#fef08a",
			vGeniusHeaderColor: "#fb923c",
			vGlobalRadius: 12,
			darkMode: DarkMode.Dark,
		},
		lightSettings: {
			accentColor: "amber",
			useCustomAccent: true,
			customAccentColor: "#d97706",
			backgroundMode: "none",
			selectedGradient: "none",
			useCustomGradient: false,
			legacyDarkTheme: false,
			glassBlur: 18,
			vTitlebarBg: "#fef9ee",
			vSidebarBg: "#fcf0d9",
			vSidebarActive: "rgba(217, 119, 6, 0.14)",
			vMenuHover: "rgba(217, 119, 6, 0.08)",
			vEditorBg: "#fffdf8",
			vAudioBarBg: "#fef9ee",
			vDialogBg: "#ffffff",
			vDialogBorder: "rgba(217, 119, 6, 0.16)",
			vActiveLine: "rgba(217, 119, 6, 0.12)",
			vLineHover: "rgba(217, 119, 6, 0.05)",
			vSelection: "rgba(217, 119, 6, 0.2)",
			advPrimaryText: "#451a03",
			advSecondaryText: "#92400e",
			advWaveformColor: "#fde68a",
			advWaveformProgress: "#d97706",
			vGlobalRadius: 12,
			darkMode: DarkMode.Light,
		},
	},
];

const SURFACE_TINTS = [
	{
		id: "clear",
		name: "Clear",
		titlebar: "transparent",
		sidebar: "transparent",
		editor: "transparent",
		dot: "transparent",
	},
	{
		id: "pure-black",
		name: "Pure Dark",
		titlebar: "#0d0d0d",
		sidebar: "#141414",
		editor: "#080808",
		dot: "#0d0d0d",
	},
	{
		id: "charcoal",
		name: "Charcoal Slate",
		titlebar: "#16181d",
		sidebar: "#1e2127",
		editor: "#121316",
		dot: "#1e2127",
	},
	{
		id: "deep-navy",
		name: "Midnight Navy",
		titlebar: "#0b1329",
		sidebar: "#101d3f",
		editor: "#070c1b",
		dot: "#101d3f",
	},
	{
		id: "emerald",
		name: "Pine Emerald",
		titlebar: "#051f18",
		sidebar: "#0c2e24",
		editor: "#061a14",
		dot: "#0c2e24",
	},
	{
		id: "amethyst",
		name: "Deep Amethyst",
		titlebar: "#160d24",
		sidebar: "#211438",
		editor: "#120a1e",
		dot: "#211438",
	},
	{
		id: "espresso",
		name: "Warm Espresso",
		titlebar: "#14100c",
		sidebar: "#1f1812",
		editor: "#0c0a08",
		dot: "#1f1812",
	},
];

const accentColors = [
	"gray",
	"gold",
	"bronze",
	"brown",
	"yellow",
	"amber",
	"orange",
	"tomato",
	"red",
	"ruby",
	"crimson",
	"pink",
	"plum",
	"purple",
	"violet",
	"iris",
	"indigo",
	"blue",
	"cyan",
	"teal",
	"jade",
	"green",
	"grass",
	"lime",
	"mint",
	"sky",
] as const;

export const SettingsAppearanceTab = () => {
	const [accentColor, setAccentColor] = useAtom(accentColorAtom);
	const [useCustomAccent, setUseCustomAccent] = useAtom(useCustomAccentAtom);
	const [customAccentColor, setCustomAccentColor] = useAtom(
		customAccentColorAtom,
	);
	const isDarkTheme = useAtomValue(isDarkThemeAtom);
	const customScale = useMemo(
		() => generateRadixScale(customAccentColor, isDarkTheme),
		[customAccentColor, isDarkTheme],
	);

	const [backgroundMode, setBackgroundMode] = useAtom(backgroundModeAtom);
	const [selectedGradient, setSelectedGradient] = useAtom(selectedGradientAtom);
	const [useCustomGradient, setUseCustomGradient] = useAtom(
		useCustomGradientAtom,
	);
	const [customGradientColors, setCustomGradientColors] = useAtom(
		customGradientColorsAtom,
	);
	const [customGradientType, setCustomGradientType] = useAtom(
		customGradientTypeAtom,
	);
	const [customGradientOpacity, setCustomGradientOpacity] = useAtom(
		customGradientOpacityAtom,
	);
	const [customGradientCenter, setCustomGradientCenter] = useAtom(
		customGradientCenterAtom,
	);
	const [customGradientAngle, setCustomGradientAngle] = useAtom(
		customGradientAngleAtom,
	);
	const [customGradientSize, setCustomGradientSize] = useAtom(
		customGradientSizeAtom,
	);
	const [editorMode, setEditorMode] = useAtom(appearanceEditorModeAtom);
	const [legacyDarkTheme, setLegacyDarkTheme] = useAtom(legacyDarkThemeAtom);
	const [advWaveformColor, setAdvWaveformColor] = useAtom(
		advancedWaveformColorAtom,
	);
	const [advWaveformProgress, setAdvWaveformProgress] = useAtom(
		advancedWaveformProgressColorAtom,
	);
	const [advPrimaryText, setAdvPrimaryText] = useAtom(
		advancedPrimaryTextColorAtom,
	);
	const [advSecondaryText, setAdvSecondaryText] = useAtom(
		advancedSecondaryTextColorAtom,
	);

	const [vTitlebarBg, setVTitlebarBg] = useAtom(advTitlebarBgAtom);
	const [vSidebarBg, setVSidebarBg] = useAtom(advSidebarBgAtom);
	const [vSidebarActive, setVSidebarActive] = useAtom(advSidebarActiveAtom);
	const [vMenuHover, setVMenuHover] = useAtom(advMenuHoverBgAtom);
	const [vEditorBg, setVEditorBg] = useAtom(advEditorBgAtom);
	const [vActiveLine, setVActiveLine] = useAtom(advActiveLineBgAtom);
	const [vLineHover, setVLineHover] = useAtom(advLineHoverBgAtom);
	const [vChipRadius, setVChipRadius] = useAtom(advChipBorderRadiusAtom);
	const [vChipGap, setVChipGap] = useAtom(advChipGapAtom);
	const [vChipPaddingV, setVChipPaddingV] = useAtom(advChipPaddingVerticalAtom);
	const [vChipPaddingH, setVChipPaddingH] = useAtom(
		advChipPaddingHorizontalAtom,
	);
	const [legacySpaceLabels, setLegacySpaceLabels] = useAtom(
		legacySpaceLabelsAtom,
	);
	const [vRomanColor, setVRomanColor] = useAtom(advRomanizationColorAtom);
	const [vTransColor, setVTransColor] = useAtom(advTranslationColorAtom);
	const [vGeniusHeaderColor, setVGeniusHeaderColor] = useAtom(
		advGeniusHeaderColorAtom,
	);
	const [vAudioBarBg, setVAudioBarBg] = useAtom(advAudioBarBgAtom);
	const [vAudioBarText, setVAudioBarText] = useAtom(advAudioBarTextAtom);
	const [vScrollbar, setVScrollbar] = useAtom(advScrollbarColorAtom);
	const [vDialogBg, setVDialogBg] = useAtom(advDialogBgAtom);
	const [vDialogBorder, setVDialogBorder] = useAtom(advDialogBorderAtom);
	const [vGlobalRadius, setVGlobalRadius] = useAtom(advGlobalBorderRadiusAtom);
	const [vGlobalBorderWidth, setVGlobalBorderWidth] = useAtom(
		advGlobalBorderWidthAtom,
	);
	const [vShadow, setVShadow] = useAtom(advShadowIntensityAtom);
	const [vSelection, setVSelection] = useAtom(advSelectionColorAtom);
	const [vBackdrop, setVBackdrop] = useAtom(advBackdropBlurAtom);
	const [presets, setPresets] = useAtom(appearancePresetsAtom);
	const [layoutOrder, setLayoutOrder] = useAtom(appLayoutOrderAtom);
	const [vRibbonPos, setVRibbonPos] = useAtom(vRibbonPositionAtom);
	const [spectrogramFullWidth, setSpectrogramFullWidth] = useAtom(
		spectrogramFullWidthAtom,
	);
	const [darkMode, setDarkMode] = useAtom(darkModeAtom);
	const [highlightActiveWord, setHighlightActiveWord] = useAtom(
		highlightActiveWordAtom,
	);
	const [enableSyncGlowAnimation, setEnableSyncGlowAnimation] = useAtom(
		enableSyncGlowAnimationAtom,
	);
	const [highlightErrors, setHighlightErrors] = useAtom(highlightErrorsAtom);
	const [instantHighlightFade, setInstantHighlightFade] = useAtom(
		instantHighlightFadeAtom,
	);
	const [newPresetName, setNewPresetName] = useState("");

	const appFont = useAtomValue(appFontAtom);
	const [glassBlur, setGlassBlur] = useAtom(glassmorphismBlurAtom);

	const [lastLoaded, setLastLoaded] = useState<string | null>(null);
	const [activePresetId, setActivePresetId] = useAtom(activePresetIdAtom);
	const autoDarkMode = useAtomValue(autoDarkModeAtom);

	const handleSavePreset = () => {
		if (!newPresetName.trim()) return;
		const newPreset: AppearancePreset = {
			id: Date.now().toString(),
			name: newPresetName,
			settings: {
				// Basic & General
				accentColor,
				useCustomAccent,
				customAccentColor,
				glassBlur,
				// Backgrounds
				backgroundMode,
				selectedGradient,
				useCustomGradient,
				customGradientColors,
				customGradientType,
				customGradientOpacity,
				customGradientCenter,
				customGradientAngle,
				customGradientSize,
				// Advanced
				advWaveformColor,
				advWaveformProgress,
				advPrimaryText,
				advSecondaryText,
				vTitlebarBg,
				vSidebarBg,
				vSidebarActive,
				vMenuHover,
				vEditorBg,
				vActiveLine,
				vLineHover,
				vSelection,
				vChipRadius,
				vChipGap,
				vChipPaddingV,
				vChipPaddingH,
				vRomanColor,
				vTransColor,
				vGeniusHeaderColor,
				vAudioBarBg,
				vAudioBarText,
				vScrollbar,
				vDialogBg,
				vDialogBorder,
				vGlobalRadius,
				vGlobalBorderWidth,
				vShadow,
				vBackdrop,
				layoutOrder,
				vRibbonPos,
				spectrogramFullWidth,
				legacyDarkTheme,
				darkMode,
			},
		};
		setPresets([...presets, newPreset]);
		setNewPresetName("");
	};

	const applyPresetSettings = (s: Record<string, any>) => {
		// Basic & General
		if (s.accentColor !== undefined) setAccentColor(s.accentColor);
		setUseCustomAccent(!!s.useCustomAccent);
		if (s.customAccentColor !== undefined)
			setCustomAccentColor(s.customAccentColor);
		if (s.glassBlur !== undefined) setGlassBlur(Number(s.glassBlur));

		// Backgrounds
		if (s.backgroundMode !== undefined) setBackgroundMode(s.backgroundMode);
		if (s.selectedGradient !== undefined)
			setSelectedGradient(s.selectedGradient);
		setUseCustomGradient(!!s.useCustomGradient);
		if (s.customGradientColors !== undefined)
			setCustomGradientColors(s.customGradientColors);
		if (s.customGradientType !== undefined)
			setCustomGradientType(s.customGradientType);
		if (s.customGradientOpacity !== undefined)
			setCustomGradientOpacity(Number(s.customGradientOpacity));
		if (s.customGradientCenter !== undefined)
			setCustomGradientCenter(s.customGradientCenter);
		if (s.customGradientAngle !== undefined)
			setCustomGradientAngle(Number(s.customGradientAngle));
		if (s.customGradientSize !== undefined)
			setCustomGradientSize(Number(s.customGradientSize));
		if (s.legacyDarkTheme !== undefined)
			setLegacyDarkTheme(!!s.legacyDarkTheme);
		if (s.darkMode !== undefined) setDarkMode(s.darkMode);

		// Advanced
		setAdvWaveformColor(s.advWaveformColor ?? "");
		setAdvWaveformProgress(s.advWaveformProgress ?? "");
		if (s.advPrimaryText !== undefined) setAdvPrimaryText(s.advPrimaryText);
		if (s.advSecondaryText !== undefined)
			setAdvSecondaryText(s.advSecondaryText);
		if (s.vTitlebarBg !== undefined) setVTitlebarBg(s.vTitlebarBg);
		if (s.vSidebarBg !== undefined) setVSidebarBg(s.vSidebarBg);
		setVSidebarActive(s.vSidebarActive ?? "");
		setVMenuHover(s.vMenuHover ?? "");
		if (s.vEditorBg !== undefined) setVEditorBg(s.vEditorBg);
		setVActiveLine(s.vActiveLine ?? "");
		setVLineHover(s.vLineHover ?? "");
		setVSelection(s.vSelection ?? "");
		if (s.vChipRadius !== undefined) setVChipRadius(Number(s.vChipRadius));
		if (s.vChipGap !== undefined) setVChipGap(Number(s.vChipGap));
		if (s.vChipPaddingV !== undefined)
			setVChipPaddingV(Number(s.vChipPaddingV));
		if (s.vChipPaddingH !== undefined)
			setVChipPaddingH(Number(s.vChipPaddingH));
		setVRomanColor(s.vRomanColor ?? "");
		setVTransColor(s.vTransColor ?? "");
		setVGeniusHeaderColor(s.vGeniusHeaderColor ?? "");
		setVAudioBarBg(s.vAudioBarBg ?? s.vTitlebarBg ?? "");
		if (s.vAudioBarText !== undefined) setVAudioBarText(s.vAudioBarText);
		setVScrollbar(s.vScrollbar ?? "");
		setVDialogBg(s.vDialogBg ?? "");
		setVDialogBorder(s.vDialogBorder ?? "");
		if (s.vGlobalRadius !== undefined)
			setVGlobalRadius(Number(s.vGlobalRadius));
		if (s.vGlobalBorderWidth !== undefined)
			setVGlobalBorderWidth(Number(s.vGlobalBorderWidth));
		if (s.vShadow !== undefined) setVShadow(Number(s.vShadow));
		if (s.vBackdrop !== undefined) setVBackdrop(Number(s.vBackdrop));
		if (s.layoutOrder !== undefined && Array.isArray(s.layoutOrder))
			setLayoutOrder(s.layoutOrder);
		if (s.vRibbonPos !== undefined) setVRibbonPos(s.vRibbonPos);
		if (s.spectrogramFullWidth !== undefined)
			setSpectrogramFullWidth(!!s.spectrogramFullWidth);
	};

	const handleLoadPreset = (p: AppearancePreset, overrideMode?: DarkMode) => {
		setActivePresetId(p.id);
		setLastLoaded(p.name);

		const effectiveMode = overrideMode ?? darkMode;
		const willBeDark =
			effectiveMode === DarkMode.Dark ||
			(effectiveMode === DarkMode.Auto && autoDarkMode);

		const s = !willBeDark && p.lightSettings ? p.lightSettings : p.settings;
		applyPresetSettings(s);
	};

	const handleThemeModeChange = (newMode: DarkMode) => {
		setDarkMode(newMode);
		const willBeDark =
			newMode === DarkMode.Dark || (newMode === DarkMode.Auto && autoDarkMode);

		const activePreset = BUILTIN_PRESETS.find(
			(p) => p.id === activePresetId || p.name === lastLoaded,
		);
		if (activePreset) {
			const s =
				!willBeDark && activePreset.lightSettings
					? activePreset.lightSettings
					: activePreset.settings;
			applyPresetSettings(s);
		}
	};
	const setIsFontSelectionOpen = useSetAtom(fontSelectionDialogAtom);
	const setFontSelectionTarget = useSetAtom(fontSelectionTargetAtom);
	const editorFont = useAtomValue(editorFontAtom);
	const previewFont = useAtomValue(previewFontAtom);

	const [showBackgroundSettings, setShowBackgroundSettings] = useState(false);
	const { t } = useTranslation();

	if (showBackgroundSettings) {
		return (
			<SettingsCustomBackgroundSettings
				onClose={() => setShowBackgroundSettings(false)}
			/>
		);
	}

	return (
		<Flex direction="column" gap="4">
			<Flex direction="column" gap="2">
				<SegmentedControl.Root
					value={editorMode}
					onValueChange={(v) => setEditorMode(v as AppearanceEditorMode)}
				>
					<SegmentedControl.Item value={AppearanceEditorMode.Basic}>
						{t("settings.appearance.mode.basic", "Basic Editor")}
					</SegmentedControl.Item>
					<SegmentedControl.Item value={AppearanceEditorMode.Advanced}>
						{t("settings.appearance.mode.advanced", "Advanced Editor")}
					</SegmentedControl.Item>
				</SegmentedControl.Root>
			</Flex>

			<Flex direction="column" gap="3">
				<Flex align="center" gap="2">
					<Flex
						align="center"
						justify="center"
						style={{
							width: 24,
							height: 24,
							flexShrink: 0,
							display: "inline-flex",
							lineHeight: 1,
						}}
					>
						<Save24Regular style={{ width: 24, height: 24 }} />
					</Flex>
					<Heading
						size="4"
						style={{ margin: 0, display: "flex", alignItems: "center" }}
					>
						{t("settings.appearance.presets.title", "Appearance Presets")}
					</Heading>
				</Flex>
				<Card>
					<Flex direction="column" gap="3">
						<Text
							size="1"
							weight="bold"
							color="gray"
							style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
						>
							{t("settings.appearance.presets.builtin", "Built-in Themes")}
						</Text>
						<Grid columns="3" gap="2">
							{BUILTIN_PRESETS.map((p) => {
								const isActive =
									activePresetId === p.id ||
									lastLoaded === p.name ||
									(p.id === "builtin-apple" &&
										(activePresetId === "builtin-apple-dark" ||
											activePresetId === "builtin-apple-light" ||
											lastLoaded === "Apple Dark" ||
											lastLoaded === "Apple Light"));
								const s =
									!isDarkTheme && p.lightSettings
										? p.lightSettings
										: p.settings;
								return (
									<Card
										key={p.id}
										size="1"
										style={{
											cursor: "pointer",
											border: isActive
												? "2px solid var(--accent-9)"
												: "1px solid var(--gray-a4)",
											backgroundColor: isActive
												? "var(--accent-2)"
												: "var(--gray-a2)",
											transition: "all 0.15s ease",
											padding: "8px 10px",
										}}
										onClick={() => handleLoadPreset(p)}
									>
										<Flex direction="column" gap="2">
											<Flex align="center" justify="between">
												<Text
													size="2"
													weight="bold"
													style={{
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
													}}
												>
													{p.name}
												</Text>
												{isActive && (
													<Badge size="1" color="green" variant="solid">
														Active
													</Badge>
												)}
											</Flex>
											{/* Theme Color Palette Preview */}
											<Flex align="center" gap="1">
												<Box
													style={{
														width: "14px",
														height: "14px",
														borderRadius: "50%",
														backgroundColor: s.vTitlebarBg || "#1f1f1f",
														backgroundImage:
															s.vTitlebarBg === "transparent"
																? "linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.2) 75%), linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.2) 75%)"
																: undefined,
														backgroundSize: "6px 6px",
														backgroundPosition: "0 0, 3px 3px",
														border: "1px solid rgba(255,255,255,0.2)",
													}}
													title="Titlebar"
												/>
												<Box
													style={{
														width: "14px",
														height: "14px",
														borderRadius: "50%",
														backgroundColor: s.vEditorBg || "#121212",
														backgroundImage:
															s.vEditorBg === "transparent"
																? "linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.2) 75%), linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.2) 75%)"
																: undefined,
														backgroundSize: "6px 6px",
														backgroundPosition: "0 0, 3px 3px",
														border: "1px solid rgba(255,255,255,0.2)",
													}}
													title="Editor"
												/>
												<Box
													style={{
														width: "14px",
														height: "14px",
														borderRadius: "50%",
														backgroundColor: s.advPrimaryText || "#fff",
														border: "1px solid rgba(255,255,255,0.2)",
													}}
													title="Text"
												/>
												<Box
													style={{
														width: "14px",
														height: "14px",
														borderRadius: "50%",
														backgroundColor: s.useCustomAccent
															? s.customAccentColor || "#e5484d"
															: s.accentColor
																? `var(--${s.accentColor}-9, #e5484d)`
																: "var(--accent-9)",
														border: "1px solid rgba(255,255,255,0.2)",
														marginLeft: "auto",
													}}
													title="Accent"
												/>
											</Flex>
										</Flex>
									</Card>
								);
							})}
						</Grid>

						<div
							style={{
								borderBottom: "1px solid var(--gray-a5)",
								margin: "8px 0",
							}}
						/>

						<Text
							size="1"
							weight="bold"
							color="gray"
							style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
						>
							{t("settings.appearance.presets.custom", "My Custom Themes")}
						</Text>
						<Flex gap="3" align="center">
							<TextField.Root
								placeholder={t(
									"settings.appearance.presets.namePlaceholder",
									"Theme Name...",
								)}
								value={newPresetName}
								onChange={(e) => setNewPresetName(e.target.value)}
								style={{ flexGrow: 1 }}
							>
								<TextField.Slot>
									<Save24Regular />
								</TextField.Slot>
							</TextField.Root>
							<Button
								onClick={handleSavePreset}
								disabled={!newPresetName.trim()}
							>
								{t("settings.appearance.presets.save", "Save Current")}
							</Button>
						</Flex>

						{presets.length > 0 ? (
							<Grid columns="2" gap="2">
								{presets.map((p) => (
									<Card
										key={p.id}
										size="1"
										style={{
											border:
												lastLoaded === p.name
													? "1px solid var(--accent-9)"
													: undefined,
											backgroundColor:
												lastLoaded === p.name ? "var(--accent-2)" : undefined,
										}}
									>
										<Flex align="center" justify="between">
											<Box flexGrow="1" overflow="hidden">
												<Text
													size="2"
													weight="bold"
													style={{
														display: "block",
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
													}}
												>
													{p.name}
												</Text>
												{lastLoaded === p.name && (
													<Text
														size="1"
														color="accent"
														style={{ display: "block" }}
													>
														Active
													</Text>
												)}
											</Box>
											<Flex gap="1">
												<IconButton
													size="1"
													variant="soft"
													onClick={() => handleLoadPreset(p)}
													title="Load Preset"
												>
													<Timer24Regular />
												</IconButton>
												<IconButton
													size="1"
													variant="ghost"
													color="red"
													onClick={() =>
														setPresets(presets.filter((pr) => pr.id !== p.id))
													}
													title="Delete Preset"
												>
													<History24Regular />
												</IconButton>
											</Flex>
										</Flex>
									</Card>
								))}
							</Grid>
						) : (
							<Text size="2" color="gray" align="center">
								{t(
									"settings.appearance.presets.empty",
									"No saved presets yet.",
								)}
							</Text>
						)}
					</Flex>
				</Card>
			</Flex>

			{editorMode === AppearanceEditorMode.Basic ? (
				<>
					<Flex direction="column" gap="2">
						<Heading size="4">
							{t("settings.appearance.theme", "Theme")}
						</Heading>

						<Card>
							<Flex direction="column" gap="4">
								<Flex gap="3" align="start">
									<TimeAndWeather24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="3">
											<Flex align="center" justify="between">
												<Flex direction="column" gap="1">
													<Text>
														{t("settings.appearance.themeMode", "Theme Mode")}
													</Text>
													<Text size="1" color="gray">
														{t(
															"settings.appearance.themeModeDesc",
															"Choose light, dark, or system default appearance",
														)}
													</Text>
												</Flex>
												<SegmentedControl.Root
													value={darkMode}
													onValueChange={(v) =>
														handleThemeModeChange(v as DarkMode)
													}
												>
													<SegmentedControl.Item value={DarkMode.Auto}>
														{t("settings.appearance.theme.auto", "Auto")}
													</SegmentedControl.Item>
													<SegmentedControl.Item value={DarkMode.Light}>
														{t("settings.appearance.theme.light", "Light")}
													</SegmentedControl.Item>
													<SegmentedControl.Item value={DarkMode.Dark}>
														{t("settings.appearance.theme.dark", "Dark")}
													</SegmentedControl.Item>
												</SegmentedControl.Root>
											</Flex>
										</Flex>
									</Box>
								</Flex>

								<div
									style={{
										borderBottom: "1px solid var(--gray-a4)",
										margin: "4px 0",
									}}
								/>

								{/* Quick Workspace Surface Tint */}
								<Flex gap="3" align="start">
									<ContentView24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="3">
											<Flex align="center" justify="between">
												<Flex direction="column" gap="1">
													<Text weight="bold">
														{t(
															"settings.appearance.surfaceTint",
															"Workspace Surface Tint",
														)}
													</Text>
													<Text size="1" color="gray">
														{t(
															"settings.appearance.surfaceTintDesc",
															"Quickly set the dark background shade of the editor, sidebar, and panels.",
														)}
													</Text>
												</Flex>
											</Flex>

											<Grid columns="3" gap="2">
												{SURFACE_TINTS.map((tint) => {
													const isCurrent = vEditorBg === tint.editor;
													return (
														<Card
															key={tint.id}
															size="1"
															style={{
																cursor: "pointer",
																border: isCurrent
																	? "2px solid var(--accent-9)"
																	: "1px solid var(--gray-a4)",
																backgroundColor: isCurrent
																	? "var(--accent-2)"
																	: "var(--gray-a2)",
																padding: "6px 8px",
																transition: "all 0.15s ease",
															}}
															onClick={() => {
																setVTitlebarBg(tint.titlebar);
																setVSidebarBg(tint.sidebar);
																setVEditorBg(tint.editor);
																setVAudioBarBg(tint.titlebar);
															}}
														>
															<Flex align="center" gap="2">
																<Box
																	style={{
																		width: "16px",
																		height: "16px",
																		borderRadius: "4px",
																		backgroundColor: tint.dot,
																		backgroundImage:
																			tint.dot === "transparent"
																				? "linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.2) 75%), linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.2) 75%)"
																				: undefined,
																		backgroundSize: "8px 8px",
																		backgroundPosition: "0 0, 4px 4px",
																		border: "1px solid rgba(255,255,255,0.2)",
																		flexShrink: 0,
																	}}
																/>
																<Text
																	size="1"
																	weight={isCurrent ? "bold" : "regular"}
																	style={{
																		overflow: "hidden",
																		textOverflow: "ellipsis",
																		whiteSpace: "nowrap",
																	}}
																>
																	{tint.name}
																</Text>
															</Flex>
														</Card>
													);
												})}
											</Grid>
										</Flex>
									</Box>
								</Flex>

								<div
									style={{
										borderBottom: "1px solid var(--gray-a4)",
										margin: "4px 0",
									}}
								/>

								<Flex gap="3" align="start">
									<Color24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="3">
											<Flex align="center" justify="between">
												<Flex direction="column" gap="1">
													<Text weight="bold">
														{t(
															"settings.appearance.accentAndHighlight",
															"Highlight & Accent Color",
														)}
													</Text>
													<Text size="1" color="gray">
														{t(
															"settings.appearance.accentAndHighlightDesc",
															"Controls active lyric highlights, word glows, playback markers, badges, and button accents throughout the app.",
														)}
													</Text>
												</Flex>
												<Flex align="center" gap="2">
													<Text size="1" color="gray">
														{useCustomAccent ? "Custom Hex" : "Preset Palette"}
													</Text>
													<Switch
														checked={useCustomAccent}
														onCheckedChange={setUseCustomAccent}
													/>
												</Flex>
											</Flex>

											{useCustomAccent ? (
												<Flex direction="column" gap="3">
													<Flex align="center" gap="3">
														<input
															type="color"
															value={customAccentColor}
															onChange={(e) => {
																const newColor = e.target.value;
																setCustomAccentColor(newColor);
															}}
															style={{
																width: "44px",
																height: "44px",
																padding: 0,
																border: "1px solid var(--gray-a6)",
																borderRadius: "var(--radius-3)",
																cursor: "pointer",
																backgroundColor: "transparent",
															}}
														/>
														<Flex direction="column" gap="1">
															<Text size="2" weight="bold">
																{customAccentColor.toUpperCase()}
															</Text>
															<Text size="1" color="gray">
																{t(
																	"settings.appearance.customHexHelp",
																	"Pick any custom color for active lyric highlights and theme accents.",
																)}
															</Text>
														</Flex>
													</Flex>
													<Grid columns="12" gap="1">
														{Array.from({ length: 12 }).map((_, i) => (
															<Box
																key={`shade-${i + 1}`}
																style={{
																	height: "22px",
																	borderRadius: "var(--radius-1)",
																	backgroundColor:
																		customScale[`--accent-${i + 1}`],
																}}
															/>
														))}
													</Grid>
												</Flex>
											) : (
												<Flex direction="column" gap="2">
													<Grid columns="7" gap="2">
														{accentColors.map((color) => {
															const isSelected = accentColor === color;
															return (
																<Tooltip
																	key={color}
																	content={
																		color.charAt(0).toUpperCase() +
																		color.slice(1)
																	}
																>
																	<IconButton
																		size="2"
																		variant={isSelected ? "solid" : "soft"}
																		color={color}
																		style={{
																			borderRadius: "var(--radius-2)",
																			cursor: "pointer",
																			position: "relative",
																			transition: "transform 0.15s ease",
																			transform: isSelected
																				? "scale(1.08)"
																				: undefined,
																			boxShadow: isSelected
																				? "0 2px 8px rgba(0,0,0,0.3)"
																				: undefined,
																		}}
																		onClick={() => setAccentColor(color)}
																	>
																		{isSelected ? (
																			<Checkmark16Regular
																				style={{ width: 14, height: 14 }}
																			/>
																		) : (
																			<Box
																				style={{
																					width: "12px",
																					height: "12px",
																					borderRadius: "50%",
																					backgroundColor: "currentColor",
																				}}
																			/>
																		)}
																	</IconButton>
																</Tooltip>
															);
														})}
													</Grid>
												</Flex>
											)}

											{/* Interactive Live Highlight Preview Widget */}
											<Card
												variant="surface"
												style={{
													background: "var(--gray-a2)",
													border: "1px solid var(--accent-a5, var(--gray-a4))",
													borderRadius: "var(--radius-3)",
													padding: "12px 14px",
													marginTop: "4px",
												}}
											>
												<Flex direction="column" gap="2">
													<Flex justify="between" align="center">
														<Text
															size="1"
															weight="bold"
															color="gray"
															style={{
																textTransform: "uppercase",
																letterSpacing: "0.5px",
															}}
														>
															👁️{" "}
															{t(
																"settings.appearance.liveHighlightPreview",
																"Live Highlight & Glow Preview",
															)}
														</Text>
														<Badge
															color={useCustomAccent ? undefined : accentColor}
															size="1"
															style={
																useCustomAccent
																	? {
																			backgroundColor: customAccentColor,
																			color: "#fff",
																		}
																	: undefined
															}
														>
															{useCustomAccent
																? customAccentColor.toUpperCase()
																: accentColor}
														</Badge>
													</Flex>

													<Box
														p="2"
														style={{
															background: "var(--gray-a3)",
															borderRadius: "var(--radius-2)",
															border: "1px solid var(--accent-a4)",
														}}
													>
														<Flex align="center" gap="2" wrap="wrap">
															<Badge
																size="1"
																variant="soft"
																color={
																	useCustomAccent ? undefined : accentColor
																}
															>
																00:02.336
															</Badge>
															<span
																style={{
																	fontSize: "14px",
																	fontWeight: 700,
																	color: "var(--accent-11, #fff)",
																	textShadow: enableSyncGlowAnimation
																		? `0 0 12px ${useCustomAccent ? customAccentColor : "var(--accent-9)"}`
																		: undefined,
																	background: "var(--accent-a3)",
																	padding: "2px 6px",
																	borderRadius: "4px",
																	border: "1px solid var(--accent-a5)",
																}}
															>
																2003,
															</span>
															<span
																style={{
																	fontSize: "14px",
																	fontWeight: 600,
																	color: "var(--gray-12)",
																}}
															>
																Arizona
															</span>
															<span
																style={{
																	fontSize: "14px",
																	fontWeight: 600,
																	color: "var(--gray-12)",
																}}
															>
																Iced
															</span>
															<span
																style={{
																	fontSize: "14px",
																	fontWeight: 600,
																	color: "var(--gray-12)",
																}}
															>
																Out
															</span>
															<span
																style={{
																	fontSize: "14px",
																	fontWeight: 600,
																	color: "var(--gray-12)",
																}}
															>
																Boys
															</span>
															<Badge size="1" variant="soft" color="gray">
																00:06.446
															</Badge>
														</Flex>
													</Box>

													{/* Quick Highlight Toggles */}
													<Grid columns="2" gap="2" mt="1">
														<Flex
															align="center"
															justify="between"
															p="2"
															style={{
																background: "var(--gray-a2)",
																borderRadius: "var(--radius-2)",
															}}
														>
															<Text size="1">
																{t(
																	"ribbonBar.syncMode.highlightActiveWord",
																	"Highlight Active Word",
																)}
															</Text>
															<Switch
																size="1"
																checked={highlightActiveWord}
																onCheckedChange={setHighlightActiveWord}
															/>
														</Flex>
														<Flex
															align="center"
															justify="between"
															p="2"
															style={{
																background: "var(--gray-a2)",
																borderRadius: "var(--radius-2)",
															}}
														>
															<Text size="1">
																{t(
																	"ribbonBar.syncMode.enableGlowAnimation",
																	"Sync Glow Animation",
																)}
															</Text>
															<Switch
																size="1"
																checked={enableSyncGlowAnimation}
																onCheckedChange={setEnableSyncGlowAnimation}
															/>
														</Flex>
														<Flex
															align="center"
															justify="between"
															p="2"
															style={{
																background: "var(--gray-a2)",
																borderRadius: "var(--radius-2)",
															}}
														>
															<Text size="1">
																{t(
																	"ribbonBar.syncMode.highlightErrors",
																	"Highlight Timing Errors",
																)}
															</Text>
															<Switch
																size="1"
																checked={highlightErrors}
																onCheckedChange={setHighlightErrors}
															/>
														</Flex>
														<Flex
															align="center"
															justify="between"
															p="2"
															style={{
																background: "var(--gray-a2)",
																borderRadius: "var(--radius-2)",
															}}
														>
															<Text size="1">
																{t(
																	"ribbonBar.previewMode.instantHighlightFade",
																	"Instant Fadeout",
																)}
															</Text>
															<Switch
																size="1"
																checked={instantHighlightFade}
																onCheckedChange={setInstantHighlightFade}
															/>
														</Flex>
													</Grid>
												</Flex>
											</Card>
										</Flex>
									</Box>
								</Flex>
							</Flex>
						</Card>

						<UIScaleSetting />

						<Heading size="4" mt="4">
							{t("settings.appearance.glass", "Glassmorphism")}
						</Heading>
						<Card>
							<Flex direction="column" gap="4">
								<Flex gap="3" align="start">
									<Sparkle24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="3">
											<Flex align="center" justify="between">
												<Flex direction="column" gap="1">
													<Text>
														{t(
															"settings.appearance.glassBlur",
															"Glass Intensity",
														)}
													</Text>
													<Text size="1" color="gray">
														{t(
															"settings.appearance.glassBlurDesc",
															"Adjust the background blur effect for glassmorphic elements.",
														)}
													</Text>
												</Flex>
												<Text size="1" weight="bold" color="accent">
													{glassBlur}px
												</Text>
											</Flex>
											<Slider
												min={0}
												max={64}
												step={1}
												value={[glassBlur]}
												onValueChange={(v) => setGlassBlur(v[0])}
											/>
										</Flex>
									</Box>
								</Flex>
							</Flex>
						</Card>
					</Flex>

					<Flex direction="column" gap="3">
						<Heading size="4">
							{t("settings.appearance.background", "Background")}
						</Heading>

						<SegmentedControl.Root
							value={backgroundMode}
							onValueChange={(v) =>
								setBackgroundMode(v as "none" | "image" | "gradient")
							}
						>
							<SegmentedControl.Item value="none">
								{t("settings.appearance.mode.none", "None")}
							</SegmentedControl.Item>
							<SegmentedControl.Item value="image">
								{t("settings.appearance.mode.image", "Image")}
							</SegmentedControl.Item>
							<SegmentedControl.Item value="gradient">
								{t("settings.appearance.mode.gradient", "Gradient")}
							</SegmentedControl.Item>
						</SegmentedControl.Root>

						{backgroundMode === "image" && (
							<SettingsCustomBackgroundCard
								onOpen={() => setShowBackgroundSettings(true)}
							/>
						)}

						{backgroundMode === "gradient" && (
							<Card>
								<Flex direction="column" gap="4">
									<Flex gap="3" align="start">
										<Sparkle24Regular />
										<Box flexGrow="1">
											<Flex direction="column" gap="3">
												<Flex align="center" justify="between">
													<Flex direction="column" gap="1">
														<Text>
															{t(
																"settings.appearance.useCustomGradient",
																"Custom Gradient Color",
															)}
														</Text>
														<Text size="1" color="gray">
															{t(
																"settings.appearance.useCustomGradientDesc",
																"Generate a gradient from a single color.",
															)}
														</Text>
													</Flex>
													<Switch
														checked={useCustomGradient}
														onCheckedChange={setUseCustomGradient}
													/>
												</Flex>

												{useCustomGradient ? (
													<Flex direction="column" gap="4">
														<Flex align="center" justify="between">
															<Text>
																{t(
																	"settings.appearance.syncGradientToAccent",
																	"Sync first color with Accent",
																)}
															</Text>
															<Button
																variant="soft"
																onClick={() => {
																	const newGradientColors = [
																		...customGradientColors,
																	];
																	newGradientColors[0] = customAccentColor;
																	setCustomGradientColors(newGradientColors);
																}}
															>
																{t("common.sync", "Sync")}
															</Button>
														</Flex>
														<Flex align="center" gap="3" wrap="wrap">
															{customGradientColors.map((color, idx) => (
																// biome-ignore lint/suspicious/noArrayIndexKey: primitive array without unique IDs
																<Flex key={idx} align="center" gap="2">
																	<input
																		type="color"
																		value={color}
																		onChange={(e) => {
																			const newColor = e.target.value;
																			const newColors = [
																				...customGradientColors,
																			];
																			newColors[idx] = newColor;
																			setCustomGradientColors(newColors);
																		}}
																		style={{
																			width: "40px",
																			height: "40px",
																			padding: 0,
																			border: "none",
																			borderRadius: "var(--radius-3)",
																			cursor: "pointer",
																			backgroundColor: "transparent",
																		}}
																	/>
																	{customGradientColors.length > 1 && (
																		<Button
																			variant="soft"
																			color="red"
																			size="1"
																			onClick={() => {
																				setCustomGradientColors(
																					customGradientColors.filter(
																						(_, i) => i !== idx,
																					),
																				);
																			}}
																		>
																			{t("common.remove", "Remove")}
																		</Button>
																	)}
																</Flex>
															))}
															{customGradientColors.length < 4 && (
																<Button
																	variant="outline"
																	onClick={() => {
																		setCustomGradientColors([
																			...customGradientColors,
																			"#ffffff",
																		]);
																	}}
																>
																	{t(
																		"settings.appearance.addGradientColor",
																		"Add Color",
																	)}
																</Button>
															)}
														</Flex>
														<Flex align="center" justify="between">
															<Text>
																{t(
																	"settings.appearance.gradientType",
																	"Gradient Type",
																)}
															</Text>
															<SegmentedControl.Root
																value={customGradientType}
																onValueChange={(v) =>
																	setCustomGradientType(
																		v as "linear" | "radial" | "conic",
																	)
																}
															>
																<SegmentedControl.Item value="linear">
																	{t(
																		"settings.appearance.type.linear",
																		"Linear",
																	)}
																</SegmentedControl.Item>
																<SegmentedControl.Item value="radial">
																	{t(
																		"settings.appearance.type.radial",
																		"Radial",
																	)}
																</SegmentedControl.Item>
																<SegmentedControl.Item value="conic">
																	{t("settings.appearance.type.conic", "Conic")}
																</SegmentedControl.Item>
															</SegmentedControl.Root>
														</Flex>
														<Flex direction="column" gap="2">
															<Flex align="center" justify="between">
																<Text>
																	{t(
																		"settings.appearance.gradientOpacity",
																		"Gradient Opacity",
																	)}
																</Text>
																<Text wrap="nowrap" color="gray" size="1">
																	{Math.round(customGradientOpacity * 100)}%
																</Text>
															</Flex>
															<Slider
																min={0}
																max={1}
																step={0.01}
																value={[customGradientOpacity]}
																onValueChange={(v) =>
																	setCustomGradientOpacity(v[0])
																}
															/>
														</Flex>
														<Flex direction="column" gap="2">
															<Flex align="center" justify="between">
																<Text>
																	{t(
																		"settings.appearance.gradientSize",
																		"Gradient Scale",
																	)}
																</Text>
																<Text wrap="nowrap" color="gray" size="1">
																	{Math.round(customGradientSize * 100)}%
																</Text>
															</Flex>
															<Slider
																min={0.1}
																max={3}
																step={0.1}
																value={[customGradientSize]}
																onValueChange={(v) =>
																	setCustomGradientSize(v[0])
																}
															/>
														</Flex>
														<Flex align="center" gap="2">
															<Popover.Root>
																<Popover.Trigger>
																	<Button
																		variant="soft"
																		style={{ flexGrow: 1 }}
																	>
																		<Timer24Regular />
																		{t(
																			"settings.appearance.gradientPositionSettings",
																			"Adjust Center & Angle",
																		)}
																	</Button>
																</Popover.Trigger>
																<Popover.Content
																	size="2"
																	style={{ width: 300 }}
																>
																	<Flex direction="column" gap="3">
																		<Text weight="bold" size="2">
																			{t(
																				"settings.appearance.gradientPositionSettings",
																				"Center & Angle",
																			)}
																		</Text>

																		{customGradientType !== "linear" && (
																			<>
																				<Text size="1" color="gray">
																					{t(
																						"settings.appearance.gradientCenterX",
																						"Center X (Horizontal)",
																					)}
																					: {customGradientCenter[0]}%
																				</Text>
																				<Slider
																					min={0}
																					max={100}
																					step={1}
																					value={[customGradientCenter[0]]}
																					onValueChange={(v) =>
																						setCustomGradientCenter([
																							v[0],
																							customGradientCenter[1],
																						])
																					}
																				/>

																				<Text size="1" color="gray">
																					{t(
																						"settings.appearance.gradientCenterY",
																						"Center Y (Vertical)",
																					)}
																					: {customGradientCenter[1]}%
																				</Text>
																				<Slider
																					min={0}
																					max={100}
																					step={1}
																					value={[customGradientCenter[1]]}
																					onValueChange={(v) =>
																						setCustomGradientCenter([
																							customGradientCenter[0],
																							v[0],
																						])
																					}
																				/>
																			</>
																		)}

																		{customGradientType !== "radial" && (
																			<>
																				<Text size="1" color="gray">
																					{t(
																						"settings.appearance.gradientAngle",
																						"Angle",
																					)}
																					: {customGradientAngle}°
																				</Text>
																				<Slider
																					min={0}
																					max={360}
																					step={1}
																					value={[customGradientAngle]}
																					onValueChange={(v) =>
																						setCustomGradientAngle(v[0])
																					}
																				/>
																			</>
																		)}
																	</Flex>
																</Popover.Content>
															</Popover.Root>
															<IconButton
																variant="outline"
																onClick={() => {
																	setCustomGradientCenter([50, 50]);
																	setCustomGradientAngle(45);
																}}
															>
																<History24Regular />
															</IconButton>
														</Flex>
														<Box
															style={{
																height: "40px",
																borderRadius: "var(--radius-2)",
																background: generateGradient(
																	customGradientColors,
																	customGradientType,
																	customGradientCenter,
																	customGradientAngle,
																	customGradientSize,
																),
																marginTop: "var(--space-2)",
															}}
														/>
													</Flex>
												) : (
													<Grid columns="4" gap="2">
														{backgroundGradients.map((gradient) => {
															const isSelected =
																selectedGradient === gradient.id;
															return (
																<Box
																	key={gradient.id}
																	style={{
																		height: "56px",
																		borderRadius: "var(--radius-3)",
																		background: gradient.css,
																		cursor: "pointer",
																		position: "relative",
																		display: "flex",
																		alignItems: "flex-end",
																		padding: "4px 6px",
																		boxShadow: isSelected
																			? "0 0 0 2px var(--accent-9), 0 4px 12px rgba(0,0,0,0.3)"
																			: "0 2px 4px rgba(0,0,0,0.15)",
																		transition:
																			"transform 0.15s ease, box-shadow 0.15s ease",
																		overflow: "hidden",
																	}}
																	onClick={() =>
																		setSelectedGradient(gradient.id)
																	}
																>
																	<Box
																		style={{
																			backgroundColor: "rgba(0, 0, 0, 0.55)",
																			backdropFilter: "blur(4px)",
																			borderRadius: "var(--radius-1)",
																			padding: "1px 5px",
																			display: "flex",
																			alignItems: "center",
																			justifyContent: "space-between",
																			width: "100%",
																		}}
																	>
																		<Text
																			size="1"
																			weight="bold"
																			style={{
																				color: "#ffffff",
																				fontSize: "10px",
																			}}
																		>
																			{gradient.name}
																		</Text>
																		{isSelected && (
																			<Checkmark24Regular
																				style={{
																					width: 12,
																					height: 12,
																					color: "#22c55e",
																				}}
																			/>
																		)}
																	</Box>
																</Box>
															);
														})}
													</Grid>
												)}
											</Flex>
										</Box>
									</Flex>
								</Flex>
							</Card>
						)}
					</Flex>
					<Flex direction="column" gap="3">
						<Heading size="4">
							{t("settings.appearance.font", "Fonts & Typography")}
						</Heading>
						<Grid columns="3" gap="3">
							<Card>
								<Flex
									direction="column"
									gap="3"
									justify="between"
									style={{ height: "100%" }}
								>
									<Flex direction="column" gap="1">
										<Text size="2" weight="bold">
											{t("settings.appearance.fontScopeApp", "Application UI")}
										</Text>
										<Text size="1" color="gray" style={{ fontFamily: appFont }}>
											{appFont.split(",")[0].replace(/"/g, "")}
										</Text>
									</Flex>
									<Button
										variant="soft"
										style={{ cursor: "pointer" }}
										onClick={() => {
											setFontSelectionTarget("app");
											setIsFontSelectionOpen(true);
										}}
									>
										<TextT24Regular />
										{t("settings.appearance.changeFont", "Change Font...")}
									</Button>
								</Flex>
							</Card>

							<Card>
								<Flex
									direction="column"
									gap="3"
									justify="between"
									style={{ height: "100%" }}
								>
									<Flex direction="column" gap="1">
										<Text size="2" weight="bold">
											{t("settings.appearance.fontScopeEditor", "Lyric Editor")}
										</Text>
										<Text
											size="1"
											color="gray"
											style={{
												fontFamily:
													editorFont === "inherit" ? appFont : editorFont,
											}}
										>
											{editorFont === "inherit"
												? t(
														"settings.appearance.inheritAppFont",
														"Inherit Application Font",
													)
												: editorFont.split(",")[0].replace(/"/g, "")}
										</Text>
									</Flex>
									<Button
										variant="soft"
										style={{ cursor: "pointer" }}
										onClick={() => {
											setFontSelectionTarget("editor");
											setIsFontSelectionOpen(true);
										}}
									>
										<TextT24Regular />
										{t("settings.appearance.changeFont", "Change Font...")}
									</Button>
								</Flex>
							</Card>

							<Card>
								<Flex
									direction="column"
									gap="3"
									justify="between"
									style={{ height: "100%" }}
								>
									<Flex direction="column" gap="1">
										<Text size="2" weight="bold">
											{t(
												"settings.appearance.fontScopePreview",
												"Lyrics Preview",
											)}
										</Text>
										<Text
											size="1"
											color="gray"
											style={{
												fontFamily:
													previewFont === "default"
														? '"SpicyLyrics", sans-serif'
														: previewFont === "inherit"
															? appFont
															: previewFont,
											}}
										>
											{previewFont === "default"
												? t(
														"settings.appearance.defaultPreviewFont",
														"Default (SpicyLyrics / Toxi)",
													)
												: previewFont === "inherit"
													? t(
															"settings.appearance.inheritAppFont",
															"Inherit Application Font",
														)
													: previewFont.split(",")[0].replace(/"/g, "")}
										</Text>
									</Flex>
									<Button
										variant="soft"
										style={{ cursor: "pointer" }}
										onClick={() => {
											setFontSelectionTarget("preview");
											setIsFontSelectionOpen(true);
										}}
									>
										<TextT24Regular />
										{t("settings.appearance.changeFont", "Change Font...")}
									</Button>
								</Flex>
							</Card>
						</Grid>
					</Flex>

					<Flex direction="column" gap="3">
						<Heading size="4">
							{t("settings.appearance.resetTitle", "Reset Theme")}
						</Heading>
						<Card>
							<Flex direction="column" gap="2">
								<Flex align="center" gap="2" color="gray">
									<History24Regular />
									<Text size="2">
										{t(
											"settings.appearance.resetDesc",
											"Reset all colors, backgrounds, gradients, and custom overrides back to the default theme.",
										)}
									</Text>
								</Flex>
								<Button
									variant="soft"
									color="red"
									onClick={() => {
										setAccentColor("red");
										setUseCustomAccent(false);
										setCustomAccentColor("#e5484d");
										setBackgroundMode("none");
										setSelectedGradient("sunset");
										setUseCustomGradient(false);
										setCustomGradientColors(["#7028e4"]);
										setCustomGradientType("linear");
										setCustomGradientOpacity(1);
										setCustomGradientCenter([50, 50]);
										setCustomGradientAngle(45);
										setCustomGradientSize(1);
										setGlassBlur(24);
										setLegacyDarkTheme(false);

										setAdvWaveformColor("");
										setAdvWaveformProgress("");
										setAdvPrimaryText("");
										setAdvSecondaryText("");
										setVTitlebarBg("");
										setVSidebarBg("");
										setVSidebarActive("");
										setVMenuHover("");
										setVEditorBg("");
										setVActiveLine("");
										setVLineHover("");
										setVSelection("");
										setVChipRadius(8);
										setVChipGap(8);
										setVChipPaddingV(4);
										setVChipPaddingH(12);
										setVRomanColor("");
										setVTransColor("");
										setVAudioBarBg("");
										setVAudioBarText("");
										setVScrollbar("");
										setVDialogBg("");
										setVDialogBorder("");
										setVGlobalRadius(12);
										setVGlobalBorderWidth(1);
										setVShadow(1);
										setVBackdrop(16);
										setLayoutOrder([
											"titlebar",
											"ribbonbar",
											"editor",
											"audio-controls",
										]);
										setVRibbonPos("top");
									}}
								>
									<History24Regular />
									{t(
										"settings.appearance.resetTheme",
										"Reset Theme to Default",
									)}
								</Button>
							</Flex>
						</Card>
					</Flex>
				</>
			) : (
				<Flex direction="column" gap="4">
					<Flex direction="column" gap="3">
						<Heading size="4">
							{t(
								"settings.appearance.advanced.projectColors",
								"Project Colors",
							)}
						</Heading>
						<Card>
							<Flex direction="column" gap="4">
								<Flex gap="3" align="start">
									<TextT24Regular />
									<Box flexGrow="1">
										<Flex direction="column" gap="3">
											<Flex align="center" justify="between">
												<Flex direction="column" gap="1">
													<Text>
														{t(
															"settings.appearance.advanced.primaryText",
															"Primary Text Color",
														)}
													</Text>
													<Text size="1" color="gray">
														{t(
															"settings.appearance.advanced.primaryTextDesc",
															"Global primary text override.",
														)}
													</Text>
												</Flex>
												<input
													type="color"
													value={advPrimaryText || "#ffffff"}
													onChange={(e) => setAdvPrimaryText(e.target.value)}
													style={{ width: "32px", height: "32px" }}
												/>
											</Flex>

											<Flex align="center" justify="between">
												<Flex direction="column" gap="1">
													<Text>
														{t(
															"settings.appearance.advanced.secondaryText",
															"Secondary Text Color",
														)}
													</Text>
													<Text size="1" color="gray">
														{t(
															"settings.appearance.secondaryDesc",
															"Translations & Metadata.",
														)}
													</Text>
												</Flex>
												<input
													type="color"
													value={advSecondaryText || "#888888"}
													onChange={(e) => setAdvSecondaryText(e.target.value)}
													style={{ width: "32px", height: "32px" }}
												/>
											</Flex>
										</Flex>
									</Box>
								</Flex>
							</Flex>
						</Card>
					</Flex>

					<Flex direction="column" gap="3">
						<Heading size="4">
							<ContentView24Regular />{" "}
							{t("settings.appearance.advanced.workspace", "Workspace Theme")}
						</Heading>
						<Card>
							<Grid columns="2" gap="3">
								<AdvancedColorItem
									label={t(
										"settings.appearance.advanced.titlebarBackground",
										"Titlebar Background",
									)}
									value={vTitlebarBg}
									onChange={setVTitlebarBg}
								/>
								<AdvancedColorItem
									label={t(
										"settings.appearance.advanced.sidebarBackground",
										"Sidebar Background",
									)}
									value={vSidebarBg}
									onChange={setVSidebarBg}
								/>
								<AdvancedColorItem
									label={t(
										"settings.appearance.advanced.activeItemHighlight",
										"Active Item Highlight",
									)}
									value={vSidebarActive}
									onChange={setVSidebarActive}
								/>
								<AdvancedColorItem
									label={t(
										"settings.appearance.advanced.menuHoverColor",
										"Menu Hover Color",
									)}
									value={vMenuHover}
									onChange={setVMenuHover}
								/>
							</Grid>
						</Card>
					</Flex>

					<Flex direction="column" gap="3">
						<Heading size="4">
							<Stack24Regular />{" "}
							{t("settings.appearance.advanced.editor", "Editor Layout")}
						</Heading>
						<Card>
							<Flex direction="column" gap="4">
								<Grid columns="2" gap="3">
									<AdvancedColorItem
										label={t(
											"settings.appearance.advanced.editorCanvas",
											"Editor Canvas",
										)}
										value={vEditorBg}
										onChange={setVEditorBg}
									/>
									<AdvancedColorItem
										label={t(
											"settings.appearance.advanced.activeLineHighlight",
											"Active Line Highlight",
										)}
										value={vActiveLine}
										onChange={setVActiveLine}
									/>
									<AdvancedColorItem
										label={t(
											"settings.appearance.advanced.lineHoverEffect",
											"Line Hover Effect",
										)}
										value={vLineHover}
										onChange={setVLineHover}
									/>
									<AdvancedColorItem
										label={t(
											"settings.appearance.advanced.selectionHighlight",
											"Selection Highlight",
										)}
										value={vSelection}
										onChange={setVSelection}
									/>
								</Grid>
								<AdvancedSliderItem
									label={t(
										"settings.appearance.advanced.chipBorderRadius",
										"Chip Border Radius",
									)}
									icon={<Stack24Regular />}
									value={vChipRadius}
									min={0}
									max={32}
									onChange={setVChipRadius}
									unit="px"
								/>
								<AdvancedSliderItem
									label={t(
										"settings.appearance.advanced.chipSpacing",
										"Chip Spacing (Gap)",
									)}
									icon={<Stack24Regular />}
									value={vChipGap}
									min={0}
									max={32}
									onChange={setVChipGap}
									unit="px"
								/>
								<AdvancedSliderItem
									label={t(
										"settings.appearance.advanced.chipPaddingVertical",
										"Chip Padding (V)",
									)}
									icon={<PaddingLeft24Regular />}
									value={vChipPaddingV}
									min={0}
									max={32}
									onChange={setVChipPaddingV}
									unit="px"
								/>
								<AdvancedSliderItem
									label={t(
										"settings.appearance.advanced.chipPaddingHorizontal",
										"Chip Padding (H)",
									)}
									icon={<PaddingLeft24Regular />}
									value={vChipPaddingH}
									min={0}
									max={32}
									onChange={setVChipPaddingH}
									unit="px"
								/>
								<Flex align="center" justify="between" gap="3">
									<Flex direction="column" gap="1">
										<Text>
											{t(
												"settings.appearance.advanced.legacySpaceLabels",
												"Legacy Space Labels",
											)}
										</Text>
										<Text size="1" color="gray">
											{t(
												"settings.appearance.advanced.legacySpaceLabelsDesc",
												"Show Space xN instead of compact empty space cells.",
											)}
										</Text>
									</Flex>
									<Switch
										checked={legacySpaceLabels}
										onCheckedChange={setLegacySpaceLabels}
									/>
								</Flex>
							</Flex>
						</Card>
					</Flex>

					<Flex direction="column" gap="3">
						<Heading size="4">
							<VideoBackgroundEffect24Regular />{" "}
							{t(
								"settings.appearance.advanced.audioVisuals",
								"Playback & Visuals",
							)}
						</Heading>
						<Card>
							<Flex direction="column" gap="4">
								<Grid columns="2" gap="3">
									<AdvancedColorItem
										label={t(
											"settings.appearance.advanced.audioBarColor",
											"Audio Bar Color",
										)}
										value={vAudioBarBg}
										onChange={setVAudioBarBg}
									/>
									<AdvancedColorItem
										label={t(
											"settings.appearance.advanced.audioBarText",
											"Audio Bar Text",
										)}
										value={vAudioBarText}
										onChange={setVAudioBarText}
									/>
									<AdvancedColorItem
										label={t(
											"settings.appearance.advanced.waveformInactive",
											"Waveform Inactive",
										)}
										value={advWaveformColor}
										onChange={setAdvWaveformColor}
									/>
									<AdvancedColorItem
										label={t(
											"settings.appearance.advanced.waveformProgress",
											"Waveform Progress",
										)}
										value={advWaveformProgress}
										onChange={setAdvWaveformProgress}
									/>
								</Grid>
								<AdvancedColorItem
									label="Romanization Text"
									value={vRomanColor}
									onChange={setVRomanColor}
								/>
								<AdvancedColorItem
									label="Translation Text"
									value={vTransColor}
									onChange={setVTransColor}
								/>
								<AdvancedColorItem
									label="Genius Header Color"
									value={vGeniusHeaderColor}
									onChange={setVGeniusHeaderColor}
								/>
							</Flex>
						</Card>
					</Flex>

					<Flex direction="column" gap="3">
						<Heading size="4">
							<Sparkle24Regular />{" "}
							{t("settings.appearance.advanced.global", "Global Design System")}
						</Heading>
						<Card>
							<Flex direction="column" gap="4">
								<Grid columns="2" gap="3">
									<AdvancedColorItem
										label="Scrollbar Thumb"
										value={vScrollbar}
										onChange={setVScrollbar}
									/>
									<AdvancedColorItem
										label="Dialog Background"
										value={vDialogBg}
										onChange={setVDialogBg}
									/>
									<AdvancedColorItem
										label="Dialog Border"
										value={vDialogBorder}
										onChange={setVDialogBorder}
									/>
								</Grid>
								<AdvancedSliderItem
									label="Global Border Radius"
									icon={<Stack24Regular />}
									value={vGlobalRadius}
									min={0}
									max={40}
									onChange={setVGlobalRadius}
									unit="px"
								/>
								<AdvancedSliderItem
									label="Global Border Width"
									icon={<Timer24Regular />}
									value={vGlobalBorderWidth}
									min={0}
									max={8}
									onChange={setVGlobalBorderWidth}
									unit="px"
								/>
								<AdvancedSliderItem
									label="Shadow Intensity"
									icon={<VideoBackgroundEffect24Regular />}
									value={vShadow}
									min={0}
									max={10}
									step={0.1}
									onChange={setVShadow}
									unit=""
								/>
								<AdvancedSliderItem
									label="Backdrop Blur"
									icon={<Sparkle24Regular />}
									value={vBackdrop}
									min={0}
									max={100}
									onChange={setVBackdrop}
									unit="px"
								/>
							</Flex>
						</Card>
					</Flex>

					<Flex direction="column" gap="3">
						<Heading size="4">
							<Stack24Regular />{" "}
							{t("settings.appearance.layout.title", "Application Layout")}
						</Heading>
						<Card>
							<Flex direction="column" gap="4">
								<Flex direction="column" gap="1">
									<Text weight="bold">
										{t("settings.appearance.layout.order", "Element Order")}
									</Text>
									<Text size="1" color="gray">
										{t(
											"settings.appearance.layout.orderDesc",
											"Drag to reorder elements. Some positions may be limited by constraints.",
										)}
									</Text>
								</Flex>

								<Reorder.Group
									axis="y"
									values={layoutOrder}
									onReorder={setLayoutOrder}
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "8px",
										listStyle: "none",
										padding: 0,
									}}
								>
									{layoutOrder.map((item) => (
										<Reorder.Item
											key={item}
											value={item}
											style={{ cursor: "grab" }}
										>
											<Card size="1">
												<Flex align="center" gap="3">
													<Stack24Regular style={{ color: "var(--gray-8)" }} />
													<Box flexGrow="1">
														<Text size="2" weight="bold">
															{item === "titlebar" && (
																<>
																	<ContentView24Regular />{" "}
																	{t(
																		"settings.appearance.layout.titlebar",
																		"Title Bar",
																	)}
																</>
															)}
															{item === "ribbonbar" && (
																<>
																	<Stack24Regular
																		style={{ transform: "rotate(180deg)" }}
																	/>{" "}
																	{t(
																		"settings.appearance.layout.ribbonbar",
																		"Toolbar (Ribbon)",
																	)}
																</>
															)}
															{item === "editor" && (
																<>
																	<TextT24Regular />{" "}
																	{t(
																		"settings.appearance.layout.editor",
																		"Main Editor Area",
																	)}
																</>
															)}
															{item === "audio-controls" && (
																<>
																	<Speaker224Regular />{" "}
																	{t(
																		"settings.appearance.layout.audio",
																		"Audio Controls",
																	)}
																</>
															)}
														</Text>
													</Box>
												</Flex>
											</Card>
										</Reorder.Item>
									))}
								</Reorder.Group>

								<Flex direction="column" gap="2" mt="2">
									<Text size="2" weight="bold">
										{t(
											"settings.appearance.layout.ribbonPos",
											"Toolbar Orientation",
										)}
									</Text>
									<SegmentedControl.Root
										value={vRibbonPos}
										onValueChange={(v) => setVRibbonPos(v as any)}
									>
										<SegmentedControl.Item value="top">
											{t("settings.appearance.layout.pos.top", "Top")}
										</SegmentedControl.Item>
										<SegmentedControl.Item value="bottom">
											{t("settings.appearance.layout.pos.bottom", "Bottom")}
										</SegmentedControl.Item>
										<SegmentedControl.Item value="left">
											{t("settings.appearance.layout.pos.left", "Left")}
										</SegmentedControl.Item>
										<SegmentedControl.Item value="right">
											{t("settings.appearance.layout.pos.right", "Right")}
										</SegmentedControl.Item>
									</SegmentedControl.Root>
									{(vRibbonPos === "left" || vRibbonPos === "right") && (
										<Text size="1" color="amber">
											{t(
												"settings.appearance.layout.sidebarWarning",
												"Note: Sidebar mode is experimental and may look different.",
											)}
										</Text>
									)}
								</Flex>

								<Flex align="center" justify="between" mt="3">
									<Flex direction="column" gap="1">
										<Text size="2" weight="bold">
											{t(
												"settings.appearance.layout.fullWidthSpectrogram",
												"Full Width Spectrogram",
											)}
										</Text>
										<Text size="1" color="gray">
											{t(
												"settings.appearance.layout.fullWidthSpectrogramDesc",
												"Spectrogram spans the full bottom width, docking the preview panel above it.",
											)}
										</Text>
									</Flex>
									<Switch
										checked={spectrogramFullWidth}
										onCheckedChange={setSpectrogramFullWidth}
									/>
								</Flex>
							</Flex>
						</Card>
					</Flex>

					<Card size="2">
						<Flex direction="column" gap="2">
							<Flex align="center" gap="2" color="gray">
								<Sparkle24Regular />
								<Text size="2">
									{t(
										"settings.appearance.advanced.masterResetNote",
										"This will reset all 20+ granular overrides.",
									)}
								</Text>
							</Flex>
							<Button
								variant="soft"
								color="red"
								onClick={() => {
									setAdvWaveformColor("");
									setAdvWaveformProgress("");
									setAdvPrimaryText("");
									setAdvSecondaryText("");
									setVTitlebarBg("");
									setVSidebarBg("");
									setVSidebarActive("");
									setVMenuHover("");
									setVEditorBg("");
									setVActiveLine("");
									setVLineHover("");
									setVSelection("");
									setVChipRadius(8);
									setVChipGap(8);
									setVChipPaddingV(4);
									setVChipPaddingH(12);
									setVRomanColor("");
									setVTransColor("");
									setVAudioBarBg("");
									setVAudioBarText("");
									setVScrollbar("");
									setVDialogBg("");
									setVDialogBorder("");
									setVGlobalRadius(12);
									setVGlobalBorderWidth(1);
									setVShadow(1);
									setVBackdrop(16);
									setLegacyDarkTheme(false);
									setLayoutOrder([
										"titlebar",
										"ribbonbar",
										"editor",
										"audio-controls",
									]);
									setVRibbonPos("top");
								}}
							>
								<History24Regular />
								{t(
									"settings.appearance.advanced.resetMaster",
									"Master Reset Advanced Config",
								)}
							</Button>
						</Flex>
					</Card>
				</Flex>
			)}
		</Flex>
	);
};

// --- Helper Components for Advanced Editor ---

const AdvancedColorItem = ({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
}) => (
	<Flex direction="column" gap="1">
		<Flex align="center" justify="between">
			<Text size="1" color="gray" weight="bold">
				{label}
			</Text>
			{value && (
				<IconButton size="1" variant="ghost" onClick={() => onChange("")}>
					<History24Regular />
				</IconButton>
			)}
		</Flex>
		<input
			type="color"
			value={value || "#000000"}
			onChange={(e) => onChange(e.target.value)}
			style={{
				width: "100%",
				height: "24px",
				border: "1px solid var(--gray-5)",
				borderRadius: "4px",
				cursor: "pointer",
				padding: 0,
			}}
		/>
	</Flex>
);

const AdvancedSliderItem = ({
	label,
	icon,
	value,
	min,
	max,
	step = 1,
	onChange,
	unit,
}: {
	label: string;
	icon: React.ReactNode;
	value: number;
	min: number;
	max: number;
	step?: number;
	onChange: (v: number) => void;
	unit: string;
}) => (
	<Box>
		<Flex align="center" justify="between" mb="1">
			<Flex align="center" gap="2">
				<Box color="accent">{icon}</Box>
				<Text size="1" weight="bold">
					{label}
				</Text>
			</Flex>
			<Text size="1" color="gray">
				{value}
				{unit}
			</Text>
		</Flex>
		<Slider
			min={min}
			max={max}
			step={step}
			value={[value]}
			onValueChange={(v) => onChange(v[0])}
		/>
	</Box>
);
