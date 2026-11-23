import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { ToolMode, toolModeAtom } from "$/states/main";
import type { ReviewFlag, ReviewPreset, ReviewTrackInfo } from "./types";

export const ttmlReviewDialogAtom = atom(
	(get) => get(toolModeAtom) === ToolMode.Review,
	(_get, set, open: boolean) => {
		set(toolModeAtom, open ? ToolMode.Review : ToolMode.Edit);
	},
);

export const reviewSpectrogramVisibleAtom = atom(false);

export const showReviewInEmptyStateAtom = atomWithStorage<boolean>(
	"showReviewInEmptyState",
	false,
);

export const ttmlReviewIncludeLineNumbersAtom = atomWithStorage<boolean>(
	"tf:linenum",
	true,
);

export const ttmlReviewZoomAtom = atomWithStorage<number>("tf:zoom", 1.0);

export const ttmlReviewWideAtom = atomWithStorage<boolean>("tf:wide", false);

export const ttmlReviewShowPreviewAtom = atomWithStorage<boolean>(
	"tf:showPreview",
	true,
);

export const ttmlReviewPreviewWidthAtom = atomWithStorage<number>(
	"tf:previewWidth",
	460,
);

export const ttmlReviewRomajiAtom = atomWithStorage<boolean>(
	"tf:romaji",
	false,
);

export const ttmlReviewPresetsAtom = atomWithStorage<ReviewPreset[]>(
	"tf:presets",
	[],
);

export const ttmlReviewFlagsAtom = atom<ReviewFlag[]>([]);

export const ttmlReviewTrackAtom = atom<ReviewTrackInfo | null>(null);
