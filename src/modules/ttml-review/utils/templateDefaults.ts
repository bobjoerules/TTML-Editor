import type {
	ReviewFlagCategory,
	ReviewPreset,
	TimingWhen,
	TimingWhere,
} from "../types";

export const BUILTIN_CATEGORIES: ReviewFlagCategory[] = [
	"Timing",
	"Suggest syllable split",
	"Spelling",
	"Line break",
	"Background vocals",
	"Punctuation",
	"Other",
];

export const WRITER_CATEGORIES: ReviewFlagCategory[] = [
	"Incorrect writer",
	"Spelling",
	"Missing writer",
	"Extra writer",
	"Writer formatting",
	"Other",
];

export const TIMING_WHERE_LABELS: Record<TimingWhere, string> = {
	sync: "Whole sync",
	start: "Start",
	end: "End",
};

export const TIMING_WHEN_LABELS: Record<TimingWhen, string> = {
	early: "Too early",
	late: "Too late",
};

export function getFlagLabel(flag: {
	tpl: ReviewFlagCategory;
	where?: TimingWhere;
	when?: TimingWhen;
}): string {
	if (flag.tpl === "Timing") {
		const whereMap: Record<TimingWhere, string> = {
			sync: "Sync",
			start: "Starts",
			end: "Ends",
		};
		const where = flag.where ? whereMap[flag.where] : "Sync";
		const when = flag.when || "early";
		return `${where} too ${when}`;
	}
	return flag.tpl || "Flag";
}

export function getDefaultFlagNote(
	tpl: ReviewFlagCategory,
	quotedText: string,
	where?: TimingWhere,
	when?: TimingWhen,
	presets: ReviewPreset[] = [],
): string {
	if (tpl === "Timing") {
		const dir = when || "early";
		if (where === "sync" || !where) {
			return `The sync for this section is too ${dir} for the audio provided, please resync.`;
		}
		if (where === "start") {
			return `This section starts too ${dir} for the audio provided, please adjust its start time.`;
		}
		if (where === "end") {
			return `This section ends too ${dir} for the audio provided, please adjust its end time.`;
		}
	}

	if (tpl === "Suggest syllable split") {
		return `The word "${quotedText.trim()}" should be split into "".`;
	}

	if (tpl === "Spelling") {
		return `Fix spelling on "${quotedText.trim()}".`;
	}

	if (tpl === "Line break") {
		return "Adjust line break around this section.";
	}

	if (tpl === "Background vocals") {
		return "Should be marked as background vocal (x-bg).";
	}

	if (tpl === "Punctuation") {
		return "Check punctuation / apostrophes.";
	}

	if (tpl === "Incorrect writer") {
		const target = quotedText.trim() || "this writer";
		return `Incorrect songwriter credit for "${target}".`;
	}

	if (tpl === "Missing writer") {
		const target = quotedText.trim() || "writer";
		return `Missing songwriter "${target}" from credits.`;
	}

	if (tpl === "Extra writer") {
		const target = quotedText.trim() || "this writer";
		return `Remove "${target}" from songwriter credits.`;
	}

	if (tpl === "Writer formatting") {
		const target = quotedText.trim() || "writer";
		return `Fix formatting or romanization for songwriter "${target}".`;
	}

	const matchedPreset = presets.find((p) => p.name === tpl);
	if (matchedPreset) {
		return matchedPreset.detail;
	}

	return "";
}
