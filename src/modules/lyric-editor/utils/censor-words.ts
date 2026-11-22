import type { LyricLine, LyricWord, TTMLLyric } from "$/types/ttml";

/**
 * Standard list of commonly censored words in music radio edits and clean lyric releases
 * (Apple Music, Spotify, radio broadcasts).
 */
export const DEFAULT_BAD_WORDS = [
	// F-words & compounds
	"motherfucker",
	"motherfuckers",
	"motherfucking",
	"motherfuckin'",
	"motherfuckin",
	"motherfuck",
	"fucking",
	"fuckin'",
	"fuckin",
	"fuckers",
	"fucker",
	"fucked",
	"fucks",
	"fucka",
	"fuck",
	"mfs",
	"mf",

	// S-words & compounds
	"bullshit",
	"horseshit",
	"dipshit",
	"shitting",
	"shitted",
	"shitty",
	"shits",
	"shit",

	// B-words & compounds
	"sonofabitch",
	"bitching",
	"bitchin'",
	"bitchin",
	"bitches",
	"bitchy",
	"bitch",

	// N-words / racial slurs
	"niggers",
	"nigger",
	"niggaz",
	"niggas",
	"nigga",

	// P-words
	"pussies",
	"pussy",
	"pricks",
	"prick",

	// D-words
	"dickhead",
	"dickheads",
	"dildos",
	"dildo",
	"dicks",
	"dick",

	// C-words
	"cocksucker",
	"cocksuckers",
	"cocks",
	"cock",
	"cunts",
	"cunt",

	// A-words (explicit forms & compounds only; strict token matching prevents matching pass, class, bass, grass, etc.)
	"assholes",
	"asshole",
	"badass",
	"dumbass",
	"jackass",
	"fatass",
	"dipass",
	"asses",
	"ass",

	// W/S-words / sex work slurs
	"whores",
	"whore",
	"sluts",
	"slut",
	"hoes",
	"hoe",

	// Sexuality slurs
	"faggots",
	"faggot",
	"fags",
	"fag",
	"dykes",
	"dyke",

	// Other explicit words / slurs
	"bastards",
	"bastard",
	"twats",
	"twat",
	"blowjobs",
	"blowjob",
	"handjobs",
	"handjob",
	"cumming",
	"cum",
	"jizz",
	"titties",
	"tits",
	"tit",
	"retarded",
	"retard",

	// Already partially starred forms in raw lyric imports (e.g. from Spotify or Genius)
	"f***ing",
	"f**king",
	"f***er",
	"f**ker",
	"f*cking",
	"f***",
	"f**k",
	"f*ck",
	"b*tch",
	"b****",
	"sh*t",
	"s***",
	"n*gga",
	"n***a",
	"p*ssy",
	"a**hole",
	"a**",
];

export interface BadWordOccurrence {
	id: string;
	lineId: string;
	lineIndex: number;
	displayLineNumber: number;
	isBackground: boolean;
	wordId?: string;
	wordIndex?: number;
	startTime: number;
	endTime: number;
	rawText: string;
	matchedWord: string;
	lineContext: string;
	isObsceneMarked: boolean;
}

/**
 * Normalizes a word token for dictionary checking by stripping outer punctuation and converting to lowercase.
 */
export function cleanWordToken(text: string): string {
	if (!text) return "";
	return text
		.trim()
		.replace(/^[^\p{L}\p{N}*']+|[^\p{L}\p{N}*']+$/gu, "")
		.toLowerCase();
}

/**
 * Replaces the core word text with replacement stars (default: ****) while preserving
 * any surrounding punctuation, quotes, or brackets.
 *
 * e.g. "fuck," -> "****,"
 * e.g. "(bitch)" -> "(****)"
 * e.g. "\"shit!\"" -> "\"****!\""
 */
export function maskWordKeepPunctuation(
	text: string,
	replacement = "****",
): string {
	if (!text) return text;
	const match = text.match(
		/^([^\p{L}\p{N}*']*)([\p{L}\p{N}*'].*?)([^\p{L}\p{N}*']*)$/u,
	);
	if (match) {
		return `${match[1]}${replacement}${match[3]}`;
	}
	return replacement;
}

/**
 * Builds a compiled RegExp that matches all bad words on word/token boundaries.
 */
export function createBadWordsRegex(
	customBadWords: Iterable<string> = [],
	ignoredWords: Iterable<string> = [],
): RegExp | null {
	const ignoredSet = new Set(
		Array.from(ignoredWords)
			.map((w) => cleanWordToken(w))
			.filter(Boolean),
	);
	const allWords = new Set<string>();

	for (const w of DEFAULT_BAD_WORDS) {
		const norm = cleanWordToken(w);
		if (norm && !ignoredSet.has(norm)) {
			allWords.add(norm);
		}
	}
	for (const w of customBadWords) {
		const norm = cleanWordToken(w);
		if (norm && !ignoredSet.has(norm)) {
			allWords.add(norm);
		}
	}

	if (allWords.size === 0) return null;

	// Sort longer phrases first so compound words match before sub-words
	const sorted = Array.from(allWords).sort((a, b) => b.length - a.length);
	const escaped = sorted
		.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join("|");

	return new RegExp(`(?<=^|[^\\w'*])(${escaped})(?=[^\\w'*]|$)`, "gi");
}

/**
 * Tests if a given word or text is considered a bad word.
 */
export function isBadWord(
	text: string,
	customBadWords: Iterable<string> = [],
	ignoredWords: Iterable<string> = [],
): boolean {
	if (!text) return false;
	const token = cleanWordToken(text);
	if (!token) return false;

	const ignoredSet = new Set(
		Array.from(ignoredWords)
			.map((w) => cleanWordToken(w))
			.filter(Boolean),
	);
	if (ignoredSet.has(token)) return false;

	const customSet = new Set(
		Array.from(customBadWords)
			.map((w) => cleanWordToken(w))
			.filter(Boolean),
	);
	if (customSet.has(token)) return true;

	const regex = createBadWordsRegex(customBadWords, ignoredWords);
	if (!regex) return false;
	regex.lastIndex = 0;
	return regex.test(text);
}

/**
 * Replaces any bad words within a string with the replacement text (default: ****).
 */
export function censorText(
	text: string,
	customBadWords: Iterable<string> = [],
	ignoredWords: Iterable<string> = [],
	replacement = "****",
): string {
	if (!text) return text;
	const regex = createBadWordsRegex(customBadWords, ignoredWords);
	if (!regex) return text;
	regex.lastIndex = 0;
	return text.replace(regex, replacement);
}

/**
 * Scans all lyric lines and words to locate every bad word occurrence.
 */
export function findBadWordOccurrences(
	lyricLines: LyricLine[],
	customBadWords: Iterable<string> = [],
	ignoredWords: Iterable<string> = [],
): BadWordOccurrence[] {
	const occurrences: BadWordOccurrence[] = [];
	if (!lyricLines || lyricLines.length === 0) return occurrences;

	const regex = createBadWordsRegex(customBadWords, ignoredWords);
	const ignoredSet = new Set(
		Array.from(ignoredWords)
			.map((w) => cleanWordToken(w))
			.filter(Boolean),
	);

	let displayLineNumber = 0;

	lyricLines.forEach((line, lineIndex) => {
		if (!line.isBG) {
			displayLineNumber++;
		}

		const fullLineText = line.words?.map((w) => w.word).join(" ") || "";

		// 1. Check individual words if word-synced
		if (line.words && line.words.length > 0) {
			line.words.forEach((word, wordIndex) => {
				const token = cleanWordToken(word.word);
				if (token && ignoredSet.has(token)) return;

				let isMatch = false;
				let matchedWord = word.word;

				if (regex) {
					regex.lastIndex = 0;
					const match = regex.exec(word.word);
					if (match) {
						isMatch = true;
						matchedWord = match[0];
					}
				}

				// Also capture words author explicitly flagged as obscene
				if (!isMatch && word.obscene) {
					isMatch = true;
					matchedWord = word.word;
				}

				if (isMatch) {
					occurrences.push({
						id: `${line.id}-${word.id}-${wordIndex}`,
						lineId: line.id,
						lineIndex,
						displayLineNumber: line.isBG ? displayLineNumber : displayLineNumber,
						isBackground: !!line.isBG,
						wordId: word.id,
						wordIndex,
						startTime: word.startTime || line.startTime,
						endTime: word.endTime || line.endTime,
						rawText: word.word,
						matchedWord,
						lineContext: fullLineText || word.word,
						isObsceneMarked: !!word.obscene,
					});
				}
			});
		} else if (regex && fullLineText) {
			// Line-synced or text without separate words
			regex.lastIndex = 0;
			let match: RegExpExecArray | null;
			let matchIdx = 0;
			while ((match = regex.exec(fullLineText)) !== null) {
				const token = cleanWordToken(match[0]);
				if (!ignoredSet.has(token)) {
					occurrences.push({
						id: `${line.id}-line-${matchIdx++}`,
						lineId: line.id,
						lineIndex,
						displayLineNumber,
						isBackground: !!line.isBG,
						startTime: line.startTime,
						endTime: line.endTime,
						rawText: match[0],
						matchedWord: match[0],
						lineContext: fullLineText,
						isObsceneMarked: false,
					});
				}
			}
		}
	});

	return occurrences;
}

/**
 * Creates a clean version of an entire TTMLLyric document, replacing all bad words with ****.
 * Preserves all timing, line structure, IDs, and metadata.
 */
export function censorTTMLLyric(
	ttmlLyric: TTMLLyric,
	customBadWords: Iterable<string> = [],
	ignoredWords: Iterable<string> = [],
	replacement = "****",
	excludedWordIds?: Set<string>,
): TTMLLyric {
	const regex = createBadWordsRegex(customBadWords, ignoredWords);

	const cleanLines: LyricLine[] = (ttmlLyric.lyricLines || []).map((line) => {
		const newWords: LyricWord[] = (line.words || []).map((w) => {
			if (excludedWordIds && excludedWordIds.has(w.id)) {
				return { ...w };
			}

			let newText = w.word;
			let wasCensored = false;

			if (regex) {
				regex.lastIndex = 0;
				if (regex.test(newText)) {
					regex.lastIndex = 0;
					newText = newText.replace(regex, replacement);
					wasCensored = true;
				}
			}

			if (!wasCensored && w.obscene) {
				newText = maskWordKeepPunctuation(newText, replacement);
				wasCensored = true;
			}

			let newRoman = w.romanWord;
			if (newRoman && regex) {
				regex.lastIndex = 0;
				if (regex.test(newRoman)) {
					regex.lastIndex = 0;
					newRoman = newRoman.replace(regex, replacement);
				}
			}

			return {
				...w,
				word: newText,
				romanWord: newRoman,
				obscene: false, // In clean version, word is now censored
			};
		});

		let cleanTranslated = line.translatedLyric;
		let cleanRoman = line.romanLyric;
		if (regex) {
			if (cleanTranslated) {
				regex.lastIndex = 0;
				cleanTranslated = cleanTranslated.replace(regex, replacement);
			}
			if (cleanRoman) {
				regex.lastIndex = 0;
				cleanRoman = cleanRoman.replace(regex, replacement);
			}
		}

		return {
			...line,
			words: newWords,
			translatedLyric: cleanTranslated,
			romanLyric: cleanRoman,
		};
	});

	return {
		...ttmlLyric,
		lyricLines: cleanLines,
	};
}
