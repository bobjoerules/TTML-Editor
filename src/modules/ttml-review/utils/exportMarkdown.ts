import type { ReviewFlag, ReviewLine } from "../types";
import { getFlagLabel } from "./templateDefaults";

export function formatTimestampClock(ms: number): string {
	const totalSec = Math.floor(Math.max(0, ms / 1000));
	const m = Math.floor(totalSec / 60)
		.toString()
		.padStart(2, "0");
	const s = (totalSec % 60).toString().padStart(2, "0");
	return `${m}:${s}`;
}

/**
 * Reconstructs natural line or phrase text from words, respecting
 * existing space tokens or trailing spaces without inserting double-spaces.
 */
export function getWordsText(words: { word: string }[]): string {
	if (!words || words.length === 0) return "";
	const hasWhitespaceTokens = words.some(
		(w) => w.word.length > 0 && w.word.trim().length === 0,
	);
	if (hasWhitespaceTokens) {
		return words.map((w) => w.word).join("");
	}
	const hasTrailingWhitespace = words.some((w) => /\s$/.test(w.word));
	if (hasTrailingWhitespace) {
		return words.map((w) => w.word).join("");
	}
	return words.map((w) => w.word).join(" ");
}

export interface BuildDiscordMarkdownOptions {
	flags: ReviewFlag[];
	lines: ReviewLine[];
	includeLineNumbers?: boolean;
	trackTitle?: string;
	trackArtist?: string;
}

export function buildDiscordReviewMarkdown({
	flags,
	lines,
	includeLineNumbers = true,
}: BuildDiscordMarkdownOptions): string {
	if (!flags || flags.length === 0) {
		return "";
	}

	const sortedFlags = [...flags].sort((a, b) => {
		const aIsWriter = a.targetType === "writer" || a.lineIndex < 0;
		const bIsWriter = b.targetType === "writer" || b.lineIndex < 0;
		if (aIsWriter && !bIsWriter) return -1;
		if (!aIsWriter && bIsWriter) return 1;
		if (a.lineIndex !== b.lineIndex) {
			return a.lineIndex - b.lineIndex;
		}
		return a.startWordIndex - b.startWordIndex;
	});

	const flagBlocks = sortedFlags.map((flag) => {
		const isWriter = flag.targetType === "writer" || flag.lineIndex < 0;
		if (isWriter) {
			const writerName = flag.writerName || flag.quotedText || "Songwriter";
			const header = `> -# Songwriter Credit\n`;
			const body = `> Written by __${writerName}__\n`;
			const label = getFlagLabel(flag);
			const noteSuffix = flag.notes ? `: ${flag.notes}` : "";
			const footer = `**${label}**${noteSuffix}`;
			return `${header}${body}${footer}`;
		}

		const line = lines[flag.lineIndex];
		if (!line) {
			const label = getFlagLabel(flag);
			return `**${label}**${flag.notes ? `: ${flag.notes}` : ""}`;
		}

		const timeClock = formatTimestampClock(line.startTime);
		const lineNumTag = includeLineNumbers ? ` · Line ${line.lineNumber}` : "";
		const header = `> -# [${timeClock}]${lineNumTag}\n`;

		// Format line with __ around flagged words
		let formattedLineText = "";
		if (line.words && line.words.length > 0) {
			const start = Math.max(0, Math.min(flag.startWordIndex, line.words.length - 1));
			const end = Math.max(start, Math.min(flag.endWordIndex, line.words.length - 1));

			const parts: string[] = [];
			for (let i = 0; i < line.words.length; i++) {
				const w = line.words[i].word;
				if (i === start && i === end) {
					parts.push(`__${w}__`);
				} else if (i === start) {
					parts.push(`__${w}`);
				} else if (i === end) {
					parts.push(`${w}__`);
				} else {
					parts.push(w);
				}
			}
			const hasWhitespaceTokens = line.words.some(
				(w) => w.word.length > 0 && w.word.trim().length === 0,
			);
			const hasTrailingWhitespace = line.words.some((w) => /\s$/.test(w.word));
			if (hasWhitespaceTokens || hasTrailingWhitespace) {
				formattedLineText = parts.join("");
			} else {
				formattedLineText = parts.join(" ");
			}
		} else {
			formattedLineText = `__${line.text}__`;
		}

		const body = `> ${formattedLineText}\n`;
		const label = getFlagLabel(flag);
		const noteSuffix = flag.notes ? `: ${flag.notes}` : "";
		const footer = `**${label}**${noteSuffix}`;

		return `${header}${body}${footer}`;
	});

	return `${flagBlocks.join("\n\n")}\n\n-# Made with TTML Editor`;
}
