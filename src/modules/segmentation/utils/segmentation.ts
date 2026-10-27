/**
 * @description 分词引擎
 */

import { type LyricLine, type LyricWord, newLyricWord } from "$/types/ttml";
import { CharType, type SegmentationConfig } from "../types";
import {
	escapeRegExp,
	getCharType,
	getMergeDirection,
	MergeDirection,
	PUNCT_AMBIGUOUS_QUOTES,
} from "./charUtils";
import { applyLearnedRule } from "./learned-rules";
import {
	getSyllabificationEngine,
	getHyphenationLanguage,
	splitJapaneseText,
} from "./syllabification-engines";

export interface SegmentationContext {
	/**
	 * true 表示当前处于引号内部（下一个引号是闭引号）
	 */
	isQuoteOpen: boolean;
}

/**
 * @description 判断两个相邻字符是否应该合并
 */
function isMergeablePair(
	prev: CharType,
	curr: CharType,
	splitCJK: boolean,
): boolean {
	if (prev !== curr) {
		return false;
	}

	switch (prev) {
		case CharType.Latin:
		case CharType.Numeric:
		case CharType.Whitespace:
			return true;
		case CharType.Cjk:
			return !splitCJK;
		default:
			return false;
	}
}

/**
 * @description 自动将一个字符串拆分为 token
 */
function autoTokenize(text: string, config: SegmentationConfig): string[] {
	if (!text) {
		return [];
	}
	if (config.engine === "none") return [text];
	if (config.engine === "japanese") return splitJapaneseText(text);
	const tokens: string[] = [];
	let currentToken = "";
	let lastCharType: CharType | null = null;

	const pushCurrentToken = () => {
		if (!currentToken) return;

		if (
			lastCharType === CharType.Latin &&
			config.splitEnglish &&
			currentToken.length > 1
		) {
			if (
				/^(?:oh|ooh|ah|ahh|woah|whoa|yeah|eh|uh|um|ha)$/i.test(currentToken) ||
				isWordIgnored(currentToken, config.ignoreList)
			) {
				tokens.push(currentToken);
			} else {
				const syllables =
					getHyphenationLanguage(config.engine) && config.hyphenator
						? config.hyphenator(currentToken).split("\u00AD")
						: getSyllabificationEngine(config.engine).split(currentToken);
				tokens.push(...syllables);
			}
		} else {
			tokens.push(currentToken);
		}
		currentToken = "";
	};

	const graphemes = Array.from(text);

	for (const grapheme of graphemes) {
		const firstChar = grapheme.length > 0 ? Array.from(grapheme)[0] : " ";
		const currentCharType = getCharType(firstChar);

		if (lastCharType !== null) {
			let shouldBreak = false;

			if (currentCharType === CharType.Cjk && config.splitCJK) {
				shouldBreak = true;
			} else if (lastCharType === CharType.Cjk && config.splitCJK) {
				shouldBreak = true;
			} else if (currentCharType === CharType.Other) {
				shouldBreak = true;
			} else if (lastCharType === CharType.Other) {
				shouldBreak = true;
			}

			if (
				!shouldBreak &&
				!isMergeablePair(lastCharType, currentCharType, config.splitCJK)
			) {
				shouldBreak = true;
			}

			if (shouldBreak && currentToken) {
				pushCurrentToken();
			}
		}

		currentToken += grapheme;
		lastCharType = currentCharType;
	}

	pushCurrentToken();

	return tokens;
}

function calculateWeight(token: string, config: SegmentationConfig): number {
	if (!token) {
		return 0;
	}
	const firstChar = token.length > 0 ? Array.from(token)[0] : " ";
	const charType = getCharType(firstChar);

	switch (charType) {
		case CharType.Latin:
		case CharType.Numeric:
		case CharType.Cjk:
			return token.length;
		case CharType.Other:
			return config.punctuationWeight;
		case CharType.Whitespace:
			return 0.0;
		default:
			return 0.0;
	}
}

function calculateLearnedWeight(
	token: string,
	config: SegmentationConfig,
): number {
	return Array.from(token).reduce((weight, char) => {
		switch (getCharType(char)) {
			case CharType.Latin:
			case CharType.Numeric:
			case CharType.Cjk:
				return weight + 1;
			case CharType.Other:
				return weight + config.punctuationWeight;
			default:
				return weight;
		}
	}, 0);
}

/**
 * @description 后处理
 *
 * 处理标点粘连，过滤空字符，计算总权重
 * @returns 处理完的 Token 列表、对应的权重列表、总权重
 */
function postProcess(
	tokens: string[],
	config: SegmentationConfig,
	context?: SegmentationContext,
): { finalTokens: string[]; finalWeights: number[]; totalWeight: number } {
	const processedTokens: string[] = [];
	const tokenWeights: number[] = [];

	/**
	 * @description 用于存储等待向右合并的标点。例如 `(`
	 */
	let pendingPrefix = "";
	let pendingPrefixWeight = 0;

	for (const token of tokens) {
		const tokenWeight = calculateWeight(token, config);
		const firstChar = token.length > 0 ? Array.from(token)[0] : " ";
		const charType = getCharType(firstChar);

		if (charType === CharType.Whitespace) {
			if (processedTokens.length > 0) {
				processedTokens[processedTokens.length - 1] += token;
			} else {
				pendingPrefix += token;
			}
			continue;
		}

		if (config.punctuationMode === "merge" && charType === CharType.Other) {
			let direction = getMergeDirection(token);

			if (context && PUNCT_AMBIGUOUS_QUOTES.has(token)) {
				if (context.isQuoteOpen) {
					direction = MergeDirection.Left;
					context.isQuoteOpen = false;
				} else {
					direction = MergeDirection.Right;
					context.isQuoteOpen = true;
				}
			}

			if (direction === MergeDirection.Right) {
				// 向右合并
				pendingPrefix += token;
				pendingPrefixWeight += tokenWeight;
			} else {
				// 向左合并
				if (processedTokens.length > 0) {
					processedTokens[processedTokens.length - 1] += token;
					tokenWeights[tokenWeights.length - 1] += tokenWeight;
				} else {
					// 行首就是应该向左合并的标点符号，存起来然后合并到第一个音节中
					pendingPrefix += token;
					pendingPrefixWeight += tokenWeight;
				}
			}
		} else {
			// 实词，将缓冲区的标点拼接在词前
			const combinedToken = pendingPrefix + token;
			const combinedWeight = pendingPrefixWeight + tokenWeight;

			processedTokens.push(combinedToken);
			tokenWeights.push(combinedWeight);

			pendingPrefix = "";
			pendingPrefixWeight = 0;
		}
	}

	// 行尾缓冲区里还有应该向右合并的标点，拼接到上一个词中
	if (pendingPrefix) {
		if (processedTokens.length > 0) {
			processedTokens[processedTokens.length - 1] += pendingPrefix;
			tokenWeights[tokenWeights.length - 1] += pendingPrefixWeight;
		} else {
			// 整行都只有标点了
			processedTokens.push(pendingPrefix);
			tokenWeights.push(pendingPrefixWeight);
		}
	}

	// 权重计算
	const finalTokens: string[] = [];
	const finalWeights: number[] = [];
	let totalWeight = 0;

	for (let i = 0; i < processedTokens.length; i++) {
		const token = processedTokens[i];
		const weight = tokenWeights[i];

		if (token === "" && config.removeEmptySegments) {
			continue;
		}

		finalTokens.push(token);
		finalWeights.push(weight);
		totalWeight += weight;
	}

	return { finalTokens, finalWeights, totalWeight };
}

/**
 * @description 把原 `LyricWord` 的总时长按权重分给切分后的 `tokens`
 * @param originalWord 原始的大词对象
 * @param tokens 切分后的文本数组
 * @param weights 对应的权重数组
 * @param totalWeight 总权重
 */
function distributeTime(
	originalWord: LyricWord,
	tokens: string[],
	weights: number[],
	totalWeight: number,
): LyricWord[] {
	if (tokens.length === 0) {
		return [];
	}
	if (tokens.length === 1) {
		return [{ ...originalWord, word: tokens[0] }];
	}

	const totalDuration = originalWord.endTime - originalWord.startTime;
	if (totalDuration <= 0 || totalWeight <= 0) {
		return tokens.map((token) => ({
			...newLyricWord(),
			word: token,
			startTime: originalWord.startTime,
			endTime: originalWord.endTime,
		}));
	}

	const durationPerWeight = totalDuration / totalWeight;
	const newWords: LyricWord[] = [];
	let currentTokenStartMs = originalWord.startTime;

	let lastNonBlankIndex = -1;
	for (let i = tokens.length - 1; i >= 0; i--) {
		if (tokens[i].trim().length > 0) {
			lastNonBlankIndex = i;
			break;
		}
	}
	if (lastNonBlankIndex === -1) {
		lastNonBlankIndex = tokens.length - 1;
	}

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		const weight = weights[i];

		const tokenDuration = Math.round(weight * durationPerWeight);
		let tokenEndMs = currentTokenStartMs + tokenDuration;

		if (i === lastNonBlankIndex) {
			tokenEndMs = originalWord.endTime;
		} else if (i > lastNonBlankIndex) {
			tokenEndMs = originalWord.endTime;
			currentTokenStartMs = originalWord.endTime;
		}

		newWords.push({
			...newLyricWord(),
			word: token,
			startTime: i > lastNonBlankIndex ? originalWord.endTime : currentTokenStartMs,
			endTime: tokenEndMs,
		});

		if (tokenEndMs > currentTokenStartMs) {
			currentTokenStartMs = tokenEndMs;
		}
	}

	return newWords;
}
 
/**
 * @description 解析忽略列表文本，支持换行、半角逗号、全角逗号分隔，并去除首尾空白
 */
export function parseIgnoreList(text: string): Set<string> {
	if (!text) return new Set();
	const items = text
		.split(/[\n,，]/)
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
	return new Set(items);
}

/**
 * @description 判断某个词或 token 是否匹配用户配置的忽略切分列表（大小写不敏感，且忽略首尾标点）
 */
export function isWordIgnored(word: string, ignoreList?: Set<string>): boolean {
	if (!ignoreList || ignoreList.size === 0) return false;
	const trimmed = word.trim();
	if (!trimmed) return false;
	if (ignoreList.has(trimmed)) return true;

	const lower = trimmed.toLowerCase();
	for (const item of ignoreList) {
		const itemTrimmed = item.trim();
		if (!itemTrimmed) continue;
		if (itemTrimmed.toLowerCase() === lower) return true;
	}

	// 剥离首尾符号与标点（例如 "(Baby)" 或 "baby," 也能匹配到 "baby"）
	const stripped = trimmed
		.replace(/^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu, "")
		.toLowerCase();
	if (stripped) {
		for (const item of ignoreList) {
			const itemStripped = item
				.trim()
				.replace(/^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu, "")
				.toLowerCase();
			if (itemStripped && (itemStripped === stripped || itemStripped === lower)) {
				return true;
			}
		}
	}
	return false;
}

/**
 * @description 将单个 LyricWord 拆分为多个
 */
export function segmentWord(
	word: LyricWord,
	config: SegmentationConfig,
	context?: SegmentationContext,
): LyricWord[] {
	// 如果词处于全局不切分忽略列表中，无论是否有学习规则或音节规则，都保持不切分
	if (isWordIgnored(word.word, config.ignoreList)) {
		return [word];
	}

	const learnedSegments = applyLearnedRule(word.word, config.learnedRules);
	if (learnedSegments) {
		const weights = learnedSegments.map((token) =>
			calculateLearnedWeight(token, config),
		);
		return distributeTime(
			word,
			learnedSegments,
			weights,
			weights.reduce((sum, weight) => sum + weight, 0),
		);
	}

	const protectedWords = new Set([
		...config.ignoreList,
		...config.customRules.keys(),
	]);
	const ctx = context || { isQuoteOpen: false };

	if (protectedWords.size === 0) {
		const tokens = autoTokenize(word.word, config);
		if (tokens.length === 0) return [];
		const { finalTokens, finalWeights, totalWeight } = postProcess(
			tokens,
			config,
			ctx,
		);
		return distributeTime(word, finalTokens, finalWeights, totalWeight);
	}

	const sortedPatterns = Array.from(protectedWords)
		.filter((k) => k.trim() !== "")
		.sort((a, b) => b.length - a.length)
		.map(escapeRegExp);

	if (sortedPatterns.length === 0) {
		const tokens = autoTokenize(word.word, config);
		if (tokens.length === 0) return [];
		const { finalTokens, finalWeights, totalWeight } = postProcess(
			tokens,
			config,
			ctx,
		);
		return distributeTime(word, finalTokens, finalWeights, totalWeight);
	}

	const pattern = new RegExp(`(${sortedPatterns.join("|")})`, "gi");

	const parts = word.word.split(pattern);

	const allTokens: string[] = [];
	const allWeights: number[] = [];
	let grandTotalWeight = 0;

	for (const part of parts) {
		if (!part) continue;

		if (config.customRules.has(part)) {
			const ruleParts = config.customRules.get(part);
			if (!ruleParts) continue;
			for (const token of ruleParts) {
				const weight = calculateWeight(token, config);
				allTokens.push(token);
				allWeights.push(weight);
				grandTotalWeight += weight;
			}
		} else if (isWordIgnored(part, config.ignoreList)) {
			const weight = calculateWeight(part, config);
			allTokens.push(part);
			allWeights.push(weight);
			grandTotalWeight += weight;
		} else {
			const tokens = autoTokenize(part, config);
			const { finalTokens, finalWeights, totalWeight } = postProcess(
				tokens,
				config,
				ctx,
			);
			allTokens.push(...finalTokens);
			allWeights.push(...finalWeights);
			grandTotalWeight += totalWeight;
		}
	}

	return distributeTime(word, allTokens, allWeights, grandTotalWeight);
}

const CJK_REGEX =
	/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const LAST_WORD_CHAR = /[\p{L}\p{N}'’\-]$/u;
const FIRST_WORD_CHAR = /^[\p{L}\p{N}'’\-]/u;

/**
 * 判断前一个音节和后一个音节是否属于同一个被拆分的西文字词
 */
export function isContinuationOfWord(
	prev: LyricWord | undefined,
	next: LyricWord | undefined,
): boolean {
	if (!prev || !next) return false;
	if (/\s$/.test(prev.word)) return false;
	if (!LAST_WORD_CHAR.test(prev.word) || !FIRST_WORD_CHAR.test(next.word))
		return false;
	if (CJK_REGEX.test(prev.word) || CJK_REGEX.test(next.word)) return false;
	if (next.startTime - prev.endTime > 1000) return false;
	return true;
}

function mergeWordGroup(group: LyricWord[]): LyricWord {
	if (group.length === 1) return group[0];
	const first = group[0];
	const last = group[group.length - 1];
	const hasRoman = group.some((w) => w.romanWord);
	return {
		...first,
		word: group.map((w) => w.word).join(""),
		startTime: first.startTime,
		endTime: last.endTime,
		romanWord: hasRoman
			? group.map((w) => w.romanWord || "").join("")
			: undefined,
		obscene: group.some((w) => w.obscene),
	};
}

/**
 * 将被切分为音节的相邻西文字词重新合并为完整单词，以便使用新引擎重新分词
 */
export function recombineSplitWords(words: LyricWord[]): LyricWord[] {
	if (words.length <= 1) return [...words];
	const result: LyricWord[] = [];
	let currentGroup: LyricWord[] = [words[0]];

	for (let i = 1; i < words.length; i++) {
		const prev = currentGroup[currentGroup.length - 1];
		const curr = words[i];

		if (isContinuationOfWord(prev, curr)) {
			currentGroup.push(curr);
		} else {
			result.push(mergeWordGroup(currentGroup));
			currentGroup = [curr];
		}
	}

	if (currentGroup.length > 0) {
		result.push(mergeWordGroup(currentGroup));
	}

	return result;
}

/**
 * 批量处理歌词行，支持跨词的上下文状态（如引号合并方向）
 *
 * 一般推荐优先使用这个函数而不是 segmentWord，因为这个函数可以处理英文双引号的方向
 * @param lines 歌词行数组
 * @param config 分词配置
 * @param resetStatePerLine 是否每行重置上下文状态。默认 false 以支持跨行引号，设为 true 可以防止上一行未闭合的引号影响下一行
 */
export function segmentLyricLines(
	lines: LyricLine[],
	config: SegmentationConfig,
	resetStatePerLine = true,
): LyricLine[] {
	const context: SegmentationContext = { isQuoteOpen: false };
	const shouldResplit = config.resplitWords ?? true;

	return lines.map((line) => {
		if (resetStatePerLine) {
			context.isQuoteOpen = false;
		}

		const wordsToProcess = shouldResplit
			? recombineSplitWords(line.words)
			: line.words;

		const newWords: LyricWord[] = [];
		for (const word of wordsToProcess) {
			const segments = segmentWord(word, config, context);
			newWords.push(...segments);
		}

		return {
			...line,
			words: newWords,
		};
	});
}

/**
 * Splits segment strings so that any segment containing or ending with spaces
 * extracts those spaces into dedicated standalone space segments (e.g. " ").
 */
export function extractSpaceSegments(segments: string[]): string[] {
	const result: string[] = [];
	for (const segment of segments) {
		if (!segment) continue;
		if (!/\s/.test(segment)) {
			result.push(segment);
			continue;
		}

		const tokens = segment.match(/\S+|\s+/g);
		if (!tokens) continue;

		for (const token of tokens) {
			if (/^\s+$/.test(token)) {
				if (result.length > 0 && /^\s+$/.test(result[result.length - 1])) {
					result[result.length - 1] += token;
				} else {
					result.push(token);
				}
			} else {
				result.push(token);
			}
		}
	}
	return result;
}

/**
 * 手动分词的时间重计算
 *
 * 用于当已经有了手动指定的分词结果，需要重新计算时间戳时
 *
 * 一个典型应用是拆分单词对话框里的手动分词
 */
export function recalculateWordTime(
	originalWord: LyricWord,
	segments: string[],
	config: SegmentationConfig,
): LyricWord[] {
	const normalizedSegments = extractSpaceSegments(segments);
	const tokens =
		normalizedSegments.length > 0 ? normalizedSegments : segments;
	const weights = tokens.map((token) => calculateWeight(token, config));
	const totalWeight = weights.reduce((sum, w) => sum + w, 0);

	return distributeTime(originalWord, tokens, weights, totalWeight);
}
