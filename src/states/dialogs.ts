import { atom } from "jotai";

export const importFromTextDialogAtom = atom(false);
export const importLyricsChooserDialogAtom = atom(false);
export const metadataEditorDialogAtom = atom(false);
export const settingsDialogAtom = atom(false);
export const settingsTabAtom = atom("common");
export const openAccountSettingsAtom = atom(null, (_get, set) => {
	set(settingsTabAtom, "account");
	set(settingsDialogAtom, true);
});
export const latencyTestDialogAtom = atom(false);
export const ttmlChecklistDialogAtom = atom(false);
export {
	ttmlReviewDialogAtom,
	showReviewInEmptyStateAtom,
} from "$/modules/ttml-review/states";
export const submitToAMLLDBDialogAtom = atom(false);
export const splitWordDialogAtom = atom(false);
export const replaceWordDialogAtom = atom(false);
export interface FindReplaceState {
	open: boolean;
	replaceMode: boolean;
	query: string;
	replaceText: string;
	matchCase: boolean;
	wholeWord: boolean;
	useRegex: boolean;
	scope: "all" | "lyrics" | "translations" | "romanizations";
	activeMatchIndex: number;
	focusTarget?: "find" | "replace";
	focusTrigger?: number;
}

export const findReplaceStateAtom = atom<FindReplaceState>({
	open: false,
	replaceMode: false,
	query: "",
	replaceText: "",
	matchCase: false,
	wholeWord: false,
	useRegex: false,
	scope: "all",
	activeMatchIndex: 0,
});
export const replaceRomanizationDialogAtom = atom({
	open: false,
	lineIndex: -1,
	wordIndex: -1,
});
export const combineWordsDialogAtom = atom<{
	open: boolean;
	lineIndex: number;
}>({ open: false, lineIndex: -1 });
export const advancedSegmentationDialogAtom = atom(false);
export const autoSegmentDialogAtom = atom(false);
export const learnedSplitsDialogAtom = atom(false);
export const timeShiftDialogAtom = atom(false);
export const timeStretchDialogAtom = atom(false);
export const censorWordsDialogAtom = atom(false);
export const lineSpectrogramDialogAtom = atom<{
	open: boolean;
	lineId?: string;
}>({ open: false });
export const confirmDialogAtom = atom<{
	open: boolean;
	title: string;
	description: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm?: () => void;
	onCancel?: () => void;
}>({
	open: false,
	title: "",
	description: "",
});
export const historyRestoreDialogAtom = atom(false);
export const importFromLRCLIBDialogAtom = atom(false);
export const geniusSearchDialogAtom = atom(false);
export const changelogDialogAtom = atom(false);
export const whatsNewDialogAtom = atom(false);
export const geniusImportLyricsDialogAtom = atom(false);
export const fontSelectionDialogAtom = atom(false);
export const lyricallyImportLyricsDialogAtom = atom(false);
export const appleTtmlImportDialogAtom = atom(false);
export const jooxImportLyricsDialogAtom = atom(false);
export interface JooxAudioSearchState {
	open: boolean;
	title?: string;
	artist?: string;
}
export const jooxAudioSearchDialogAtom = atom<JooxAudioSearchState>({
	open: false,
	title: "",
	artist: "",
});
export const timeShiftPreviewOffsetAtom = atom(0);
export const timeShiftPreviewActiveAtom = atom(false);
export const timeShiftPreviewScopeAtom = atom<
	"all" | "selected" | "selected-following" | "custom"
>("all");
export const timeShiftPreviewCustomRangeAtom = atom<[number, number]>([1, 1]);
export const mp3ConversionDialogAtom = atom<{
	open: boolean;
	fileName: string;
	onConvert: () => void;
	onSkip: () => void;
}>({
	open: false,
	fileName: "",
	onConvert: () => {},
	onSkip: () => {},
});
export const suggestedSplitsDialogAtom = atom<{
	open: boolean;
	lineId?: string;
	wordIndex?: number;
}>({ open: false });

export interface ImportLyricsPrefill {
	source: "genius" | "lyrically" | "lrclib" | "apple-ttml" | "spotify" | "joox";
	query?: string;
	track?: {
		id?: string | number;
		name: string;
		artist: string;
		album?: string;
		cover?: string;
		lyrics?: string;
	};
}

export const importLyricsPrefillAtom = atom<ImportLyricsPrefill | null>(null);

export {
	spotMatchDialogAtom,
	spotMatchInitialTrackIdAtom,
} from "$/modules/spotmatch/states";
