import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export enum SyncJudgeMode {
	FirstKeyDownTime = "first-keydown-time",
	FirstKeyDownTimeLegacy = "first-keydown-time-legacy",
	LastKeyUpTime = "last-keyup-time",
	MiddleKeyTime = "middle-key-time",
}

export enum LayoutMode {
	Simple = "simple",
	Advance = "advance",
}

export const geniusApiKeyAtom = atomWithStorage<string>("geniusApiKey", "");

export const jooxApiTokenAtom = atomWithStorage<string>(
	"jooxApiToken",
	"f84ao9lMF_q7husBWRfgUw",
);

export const downloadAudioOnLyricImportAtom = atomWithStorage<boolean>(
	"downloadAudioOnLyricImport",
	false,
);

export const autoLoadCloudAudioAtom = atomWithStorage<boolean>(
	"autoLoadCloudAudio",
	true,
);

export const autoSegmentOnLyricImportAtom = atomWithStorage<boolean>(
	"autoSegmentOnLyricImport",
	false,
);

export const autoDuetOnGeniusImportAtom = atomWithStorage<boolean>(
	"autoDuetOnGeniusImport",
	false,
);

export const splitBackgroundLyricsOnGeniusImportAtom = atomWithStorage<boolean>(
	"splitBackgroundLyricsOnGeniusImport",
	true,
);

export const jooxAudioQualityAtom = atomWithStorage<string>(
	"jooxAudioQuality",
	"320",
);

export const latencyTestBPMAtom = atomWithStorage("latencyTestBPM", 120);

export const syncJudgeModeAtom = atomWithStorage(
	"syncJudgeMode",
	SyncJudgeMode.FirstKeyDownTime,
);

export const layoutModeAtom = atomWithStorage("layoutMode", LayoutMode.Simple);

export const showWordRomanizationInputAtom = atomWithStorage(
	"showWordRomanizationInput",
	false,
);

export const displayRomanizationInSyncAtom = atomWithStorage(
	"displayRomanizationInSync",
	false,
);

export const showLineTranslationAtom = atomWithStorage(
	"showLineTranslation",
	true,
);

export const showLineRomanizationAtom = atomWithStorage(
	"showLineRomanization",
	true,
);

export const hideSubmitAMLLDBWarningAtom = atomWithStorage(
	"hideSubmitAMLLDBWarning",
	false,
);
export const generateNameFromMetadataAtom = atomWithStorage(
	"generateNameFromMetadata",
	true,
);
export const keepPlayingWordInViewAtom = atomWithStorage(
	"keepPlayingWordInView",
	false,
);

export const highlightUnsyncedWordsInEditorAtom = atomWithStorage(
	"highlightUnsyncedWordsInEditor",
	false,
);

export const autosaveEnabledAtom = atomWithStorage("autosaveEnabled", true);
export const autosaveIntervalAtom = atomWithStorage("autosaveInterval", 10);
export const autosaveLimitAtom = atomWithStorage("autosaveLimit", 10);

import {
	DEFAULT_DISCORD_BOTTOM_LINE_TEMPLATE,
	DEFAULT_DISCORD_DETAILS_TEMPLATE,
	DEFAULT_DISCORD_STATE_TEMPLATE,
} from "$/modules/discord-presence/presence";

export const discordRichPresenceEnabledAtom = atomWithStorage(
	"discordRichPresenceEnabled",
	false,
);
export const discordDetailsTemplateAtom = atomWithStorage(
	"discordDetailsTemplate",
	DEFAULT_DISCORD_DETAILS_TEMPLATE,
);
export const discordStateTemplateAtom = atomWithStorage(
	"discordStateTemplate",
	DEFAULT_DISCORD_STATE_TEMPLATE,
);
export const discordBottomLineTemplateAtom = atomWithStorage(
	"discordBottomLineTemplate",
	DEFAULT_DISCORD_BOTTOM_LINE_TEMPLATE,
);
export const discordPlaybackTimelineAtom = atomWithStorage(
	"discordPlaybackTimeline",
	true,
);
export const discordProjectElapsedAtom = atomWithStorage(
	"discordProjectElapsed",
	true,
);
export const discordRepositoryButtonAtom = atomWithStorage(
	"discordRepositoryButton",
	true,
);
export const discordStatusBadgeAtom = atomWithStorage(
	"discordStatusBadge",
	true,
);
export const discordIdleTimeoutEnabledAtom = atomWithStorage(
	"discordIdleTimeoutEnabled",
	false,
);
export const discordIdleTimeoutMinutesAtom = atomWithStorage(
	"discordIdleTimeoutMinutes",
	5,
);

export type DiscordActivityType = "playing" | "listening";
export const discordActivityTypeAtom = atomWithStorage<DiscordActivityType>(
	"discordActivityType",
	"listening",
);

export type DiscordImageMode =
	| "icon"
	| "artwork"
	| "state"
	| "tab"
	| "profile"
	| "none";
export type DiscordIdleImageMode = "icon" | "profile" | "tab" | "none";
export type DiscordPrivacyPreset = "rich" | "minimal" | "none";

export const discordLargeImageModeAtom = atomWithStorage<DiscordImageMode>(
	"discordLargeImageMode",
	"artwork",
);
export const discordSmallImageModeAtom = atomWithStorage<DiscordImageMode>(
	"discordSmallImageMode",
	"tab",
);
export const discordIdleLargeImageModeAtom =
	atomWithStorage<DiscordIdleImageMode>("discordIdleLargeImageMode", "icon");
export const discordIdleSmallImageModeAtom =
	atomWithStorage<DiscordIdleImageMode>("discordIdleSmallImageMode", "profile");
export const discordPrivacyPresetAtom = atomWithStorage<DiscordPrivacyPreset>(
	"discordPrivacyPreset",
	"rich",
);
export const discordShowProgressTimerAtom = atomWithStorage(
	"discordShowProgressTimer",
	true,
);
export const discordGeneralActivityTextAtom = atomWithStorage(
	"discordGeneralActivityText",
	"Working on lyrics",
);
export const discordIdleBottomTextAtom = atomWithStorage(
	"discordIdleBottomText",
	"{{username}}",
);

export const showTimestampsAtom = atomWithStorage("showTimestamps", true);
export const enableManualTimestampEditAtom = atomWithStorage(
	"enableManualTimestampEdit",
	false,
);

export const highlightActiveWordAtom = atomWithStorage(
	"highlightActiveWord",
	true,
);

export const enableSyncGlowAnimationAtom = atomWithStorage(
	"enableSyncGlowAnimation",
	false,
);

export const highlightErrorsAtom = atomWithStorage("highlightErrors", true);

export const smartFirstWordAtom = atomWithStorage("smartFirstWord", false);
export const smartWordAnywhereAtom = atomWithStorage(
	"smartWordAnywhere",
	false,
);
export const smartLastWordAtom = atomWithStorage("smartLastWord", false);
export const splitOccupiedWordAtPlayheadAtom = atomWithStorage(
	"splitOccupiedWordAtPlayhead",
	false,
);
export const autoSplitTrailingSpaceOnInputAtom = atomWithStorage(
	"autoSplitTrailingSpaceOnInput",
	true,
);
export const compactBGInSyncAtom = atomWithStorage("compactBGInSync", true);

export const accentColorAtom = atomWithStorage<
	| "gray"
	| "gold"
	| "bronze"
	| "brown"
	| "yellow"
	| "amber"
	| "orange"
	| "tomato"
	| "red"
	| "ruby"
	| "crimson"
	| "pink"
	| "plum"
	| "purple"
	| "violet"
	| "iris"
	| "indigo"
	| "blue"
	| "cyan"
	| "teal"
	| "jade"
	| "green"
	| "grass"
	| "lime"
	| "mint"
	| "sky"
>("accentColor", "gray");

export const backgroundModeAtom = atomWithStorage<
	"none" | "image" | "gradient"
>("backgroundMode", "none");

export const selectedGradientAtom = atomWithStorage<string>(
	"selectedGradient",
	"sunset",
);

export const useCustomAccentAtom = atomWithStorage<boolean>(
	"useCustomAccent",
	false,
);

export const customAccentColorAtom = atomWithStorage<string>(
	"customAccentColor",
	"#e5484d",
);

export const useCustomGradientAtom = atomWithStorage<boolean>(
	"useCustomGradient",
	false,
);

export const customGradientColorsAtom = atomWithStorage<string[]>(
	"customGradientColors",
	["#7028e4"],
);

export const customGradientTypeAtom = atomWithStorage<
	"linear" | "radial" | "conic"
>("customGradientType", "linear");

export const customGradientOpacityAtom = atomWithStorage<number>(
	"customGradientOpacity",
	1,
);

export const customGradientCenterAtom = atomWithStorage<[number, number]>(
	"customGradientCenter",
	[50, 50],
);

export const customGradientAngleAtom = atomWithStorage<number>(
	"customGradientAngle",
	45,
);

export const customGradientSizeAtom = atomWithStorage<number>(
	"customGradientSize",
	1,
);

export const syncGradientToAccentAtom = atomWithStorage<boolean>(
	"syncGradientToAccent",
	false,
);

export type FontSelectionTarget = "app" | "editor" | "preview";
export const fontSelectionTargetAtom = atom<FontSelectionTarget>("app");

export const appFontAtom = atomWithStorage<string>(
	"appFont",
	'"MiSans", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
);

export const editorFontAtom = atomWithStorage<string>("editorFont", "inherit");

export const previewFontAtom = atomWithStorage<string>(
	"previewFont",
	"default",
);

export const customFontDataAtom = atomWithStorage<string | null>(
	"customFontData",
	null,
);
export const customFontNameAtom = atomWithStorage<string | null>(
	"customFontName",
	null,
);

export const customEditorFontDataAtom = atomWithStorage<string | null>(
	"customEditorFontData",
	null,
);
export const customEditorFontNameAtom = atomWithStorage<string | null>(
	"customEditorFontName",
	null,
);

export const customPreviewFontDataAtom = atomWithStorage<string | null>(
	"customPreviewFontData",
	null,
);
export const customPreviewFontNameAtom = atomWithStorage<string | null>(
	"customPreviewFontName",
	null,
);

export const appFontWeightAtom = atomWithStorage<string>(
	"appFontWeight",
	"400",
);
export const appFontStyleAtom = atomWithStorage<string>(
	"appFontStyle",
	"normal",
);

export const importAddSpacesAtom = atomWithStorage<boolean>(
	"importAddSpaces",
	false,
);

export const importSplitHyphensAtom = atomWithStorage<boolean>(
	"importSplitHyphens",
	true,
);

export const aiSidebarEnabledAtom = atomWithStorage("aiSidebarEnabled", false);
export const aiSidebarBaseUrlAtom = atomWithStorage(
	"aiSidebarBaseUrl",
	"https://api.openai.com/v1",
);
export const aiSidebarModelAtom = atomWithStorage(
	"aiSidebarModel",
	"gpt-4o-mini",
);
export const aiSidebarPersistKeyAtom = atomWithStorage(
	"aiSidebarPersistKey",
	false,
);

export const normalizeApostrophesOnImportAtom = atomWithStorage<boolean>(
	"normalizeApostrophesOnImport",
	true,
);

export const normalizeCyrillicEsOnImportAtom = atomWithStorage<boolean>(
	"normalizeCyrillicEsOnImport",
	false,
);

export const allowConsecutiveBackgroundLinesAtom = atomWithStorage<boolean>(
	"allowConsecutiveBackgroundLines",
	false,
	undefined,
	{ getOnInit: true },
);

export const openSpotMatchAfterSaveAtom = atomWithStorage<boolean>(
	"openSpotMatchAfterSave",
	false,
	undefined,
	{ getOnInit: true },
);

export const lyricTextNormalizationOptionsAtom = atom((get) => ({
	normalizeApostrophes: get(normalizeApostrophesOnImportAtom),
	normalizeCyrillicEs: get(normalizeCyrillicEsOnImportAtom),
}));

export enum Mp3ConversionMode {
	Never = "never",
	Always = "always",
	Ask = "ask",
}

export const mp3ConversionModeAtom = atomWithStorage<Mp3ConversionMode>(
	"mp3ConversionMode",
	Mp3ConversionMode.Ask,
);

export const hideMp3ConversionWarningAtom = atomWithStorage<boolean>(
	"hideMp3ConversionWarning",
	false,
);

export const boykisserModeAtom = atomWithStorage<boolean>(
	"boykisserMode",
	false,
);

export const boykisserUnlockedAtom = atom<boolean>(false);

export const glassmorphismBlurAtom = atomWithStorage<number>(
	"glassmorphismBlur",
	20,
);

export enum AppearanceEditorMode {
	Basic = "basic",
	Advanced = "advanced",
}

export const appearanceEditorModeAtom = atomWithStorage<AppearanceEditorMode>(
	"appearanceEditorMode",
	AppearanceEditorMode.Basic,
);

export const legacyDarkThemeAtom = atomWithStorage<boolean>(
	"legacyDarkTheme",
	true,
);

export const advancedWaveformColorAtom = atomWithStorage<string>(
	"advancedWaveformColor",
	"",
);

export const advancedWaveformProgressColorAtom = atomWithStorage<string>(
	"advancedWaveformProgressColor",
	"",
);

export const advancedPrimaryTextColorAtom = atomWithStorage<string>(
	"advancedPrimaryTextColor",
	"#ffffff",
);

export const advancedSecondaryTextColorAtom = atomWithStorage<string>(
	"advancedSecondaryTextColor",
	"rgba(255, 255, 255, 0.6)",
);

// --- 20+ Advanced Workspace Customizations ---
export const advTitlebarBgAtom = atomWithStorage("advTitlebarBg", "#1f1f1f");
export const advSidebarBgAtom = atomWithStorage("advSidebarBg", "#1c1c1e");
export const advSidebarActiveAtom = atomWithStorage("advSidebarActive", "");
export const advMenuHoverBgAtom = atomWithStorage("advMenuHoverBg", "");

export const advEditorBgAtom = atomWithStorage("advEditorBg", "#121212");
export const advActiveLineBgAtom = atomWithStorage("advActiveLineBg", "");
export const advLineHoverBgAtom = atomWithStorage("advLineHoverBg", "");

export const advChipBorderRadiusAtom = atomWithStorage(
	"advChipBorderRadius",
	8,
);
export const advChipGapAtom = atomWithStorage("advChipGap", 8);
export const advChipPaddingVerticalAtom = atomWithStorage(
	"advChipPaddingVertical",
	2,
);
export const advChipPaddingHorizontalAtom = atomWithStorage(
	"advChipPaddingHorizontal",
	8,
);
export const legacySpaceLabelsAtom = atomWithStorage(
	"legacySpaceLabels",
	false,
);

export const advRomanizationColorAtom = atomWithStorage(
	"advRomanizationColor",
	"",
);
export const advTranslationColorAtom = atomWithStorage(
	"advTranslationColor",
	"",
);
export const advGeniusHeaderColorAtom = atomWithStorage(
	"advGeniusHeaderColor",
	"",
);

export const advAudioBarBgAtom = atomWithStorage("advAudioBarBg", "");
export const advAudioBarTextAtom = atomWithStorage("advAudioBarText", "");

export const advScrollbarColorAtom = atomWithStorage("advScrollbarColor", "");
export const advDialogBgAtom = atomWithStorage("advDialogBg", "");
export const advDialogBorderAtom = atomWithStorage("advDialogBorder", "");

export const advGlobalBorderRadiusAtom = atomWithStorage(
	"advGlobalBorderRadius",
	12,
);
export const advGlobalBorderWidthAtom = atomWithStorage(
	"advGlobalBorderWidth",
	1,
);
export const advShadowIntensityAtom = atomWithStorage("advShadowIntensity", 1);
export const advSelectionColorAtom = atomWithStorage("advSelectionColor", "");
export const advBackdropBlurAtom = atomWithStorage("advBackdropBlur", 16);

export const appLayoutOrderAtom = atomWithStorage<string[]>("appLayoutOrder", [
	"titlebar",
	"ribbonbar",
	"editor",
	"audio-controls",
]);

export const vRibbonPositionAtom = atomWithStorage<
	"top" | "bottom" | "left" | "right"
>("vRibbonPosition", "top");

export { spectrogramFullWidthAtom } from "$/modules/spectrogram/states";

export interface AppearancePreset {
	id: string;
	name: string;
	settings: Record<string, any>;
	lightSettings?: Record<string, any>;
}

export const activePresetIdAtom = atomWithStorage<string>("activePresetId", "");

export const appearancePresetsAtom = atomWithStorage<AppearancePreset[]>(
	"appearancePresets",
	[],
);

export const geniusCategorizationEnabledAtom = atomWithStorage<boolean>(
	"geniusCategorizationEnabled",
	true,
);

export const experimentalFeaturesDialogOpenAtom = atom(false);

export const geniusHeaderDetectionDialogShownAtom = atomWithStorage<boolean>(
	"geniusHeaderDetectionDialogShown",
	false,
);

export const geniusHeaderDetectionDialogOpenAtom = atom(false);

export const geniusHeaderRestorationTextAtom = atom<string | null>(null);

export const DEFAULT_UI_SCALE = 90;
export const MIN_UI_SCALE = 50;
export const MAX_UI_SCALE = 200;

// Automatically migrate users on the previous default (85%) to 90%
if (typeof window !== "undefined") {
	try {
		const stored = localStorage.getItem("uiScale");
		if (stored === "85") {
			localStorage.setItem("uiScale", "90");
		}
	} catch {}
}

export const uiScaleAtom = atomWithStorage<number>("uiScale", DEFAULT_UI_SCALE);

export const wrapLyricLinesAtom = atomWithStorage<boolean>(
	"wrapLyricLines",
	false,
);
