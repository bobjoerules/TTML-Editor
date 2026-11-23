export interface ReviewWord {
	id: string;
	word: string;
	startTime: number;
	endTime: number;
	romanWord?: string;
}

export interface ReviewLine {
	id: string;
	lineNumber: number;
	startTime: number;
	endTime: number;
	isBg: boolean;
	isBG?: boolean;
	isDuet?: boolean;
	voice?: string;
	agent?: string;
	isLineSynced?: boolean;
	words: ReviewWord[];
	text: string;
	roman?: string;
	romanLyric?: string;
}

export type TimingWhere = "sync" | "start" | "end";
export type TimingWhen = "early" | "late";
export type FlagTargetType = "line" | "writer";

export type ReviewFlagCategory =
	| "Timing"
	| "Suggest syllable split"
	| "Spelling"
	| "Line break"
	| "Background vocals"
	| "Punctuation"
	| "Incorrect writer"
	| "Missing writer"
	| "Extra writer"
	| "Writer formatting"
	| "Other"
	| string;

export interface ReviewFlag {
	id: number;
	targetType?: FlagTargetType;
	lineIndex: number;
	startWordIndex: number;
	endWordIndex: number;
	writerName?: string;
	tpl: ReviewFlagCategory;
	where?: TimingWhere;
	when?: TimingWhen;
	notes: string;
	autoNote?: string;
	quotedText: string;
}

export interface ReviewPreset {
	name: string;
	detail: string;
}

export interface ReviewTrackInfo {
	title: string;
	artist: string;
	album?: string;
	songwriters?: string[];
	sourceType: "current-project" | "file" | "url";
	fileName?: string;
	rawXml?: string;
}
