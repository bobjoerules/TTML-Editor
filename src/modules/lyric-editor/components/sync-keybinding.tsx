import { useStore } from "jotai";
import { type FC, useCallback, useEffect } from "react";
import { audioEngine } from "$/modules/audio/audio-engine";
import {
	buildRubySelectionId,
	findNextWord,
	findOccupiedUnit,
	getCurrentLineLocation,
	getCurrentLocation,
	getFirstSynchronizableUnit,
	getLastSynchronizableUnit,
	getSynchronizableUnits,
	isSynchronizableLine,
} from "$/modules/lyric-editor/utils/lyric-states";
import {
	segmentationCustomRulesAtom,
	segmentationEngineAtom,
	segmentationIgnoreListTextAtom,
	segmentationLearnedRulesAtom,
	segmentationPunctuationModeAtom,
	segmentationPunctuationWeightAtom,
	segmentationRemoveEmptySegmentsAtom,
	segmentationSplitCJKAtom,
} from "$/modules/segmentation/states";
import { parseIgnoreList } from "$/modules/segmentation/utils/segmentation";
import {
	highlightActiveWordAtom,
	smartFirstWordAtom,
	smartLastWordAtom,
	smartWordAnywhereAtom,
	splitOccupiedWordAtPlayheadAtom,
	syncJudgeModeAtom,
} from "$/modules/settings/states";
import {
	autoSegmentOnLineSyncAtom,
	autoSegmentSyncModeAtom,
	smartFirstWordActiveIdAtom,
	smartWordActiveIdAtom,
	syncCommitOffsetAtom,
	syncLevelModeAtom,
	syncTimeOffsetAtom,
} from "$/modules/settings/states/sync";
import {
	keyMoveFirstWordAndPlayAtom,
	keyMoveLastWordAndPlayAtom,
	keyMoveNextLineAtom,
	keyMoveNextWordAndPlayAtom,
	keyMoveNextWordAtom,
	keyMovePrevLineAtom,
	keyMovePrevWordAndPlayAtom,
	keyMovePrevWordAtom,
	keySyncEndAtom,
	keySyncNextAtom,
	keySyncStartAtom,
	keyToggleTimeLineEditAtom,
	keyToggleWordHighlightAtom,
} from "$/states/keybindings.ts";
import {
	lyricLinesAtom,
	selectedLinesAtom,
	selectedWordsAtom,
} from "$/states/main.ts";
import type {
	LyricLine,
	LyricWord,
	LyricWordBase,
	TTMLLyric,
} from "$/types/ttml";
import {
	type KeyBindingEvent,
	useKeyBindingAtom,
} from "$/utils/keybindings.ts";
import { maybeAutoSegmentLine } from "../utils/auto-segment-sync";
import { calculateJudgeTime } from "../utils/judge-time";
import { normalizeLineTime } from "../utils/normalize-line-time";
import { timeLineEditorAtom } from "./lyric-line-view-states";

const getUnitStartTime = (unit: {
	word: LyricWord;
	rubyWord?: LyricWordBase;
}) => unit.rubyWord?.startTime ?? unit.word.startTime;

const getUnitEndTime = (unit: { word: LyricWord; rubyWord?: LyricWordBase }) =>
	unit.rubyWord?.endTime ?? unit.word.endTime;

const updateRubyParentTime = (word: LyricWord) => {
	const ruby = word.ruby;
	if (!ruby || ruby.length === 0) return;
	let minStart = Number.POSITIVE_INFINITY;
	let maxEnd = Number.NEGATIVE_INFINITY;
	for (const r of ruby) {
		if (r.startTime < minStart) minStart = r.startTime;
		if (r.endTime > maxEnd) maxEnd = r.endTime;
	}
	if (Number.isFinite(minStart)) word.startTime = minStart;
	if (Number.isFinite(maxEnd)) word.endTime = maxEnd;
};

type LyricsState = TTMLLyric;

function cloneLineWithWords(line: LyricLine): LyricLine {
	return { ...line, words: line.words.slice() };
}

function cloneWordWithRuby(word: LyricWord): LyricWord {
	return {
		...word,
		ruby: word.ruby ? word.ruby.slice() : undefined,
	};
}

function setUnitStartTimeCloned(
	line: LyricLine,
	wordIndex: number,
	rubyIndex: number | undefined,
	time: number,
) {
	const prevWord = line.words[wordIndex];
	if (!prevWord) return;
	const nextWord = cloneWordWithRuby(prevWord);

	if (rubyIndex !== undefined && nextWord.ruby?.[rubyIndex]) {
		const prevRuby = nextWord.ruby[rubyIndex];
		nextWord.ruby[rubyIndex] = { ...prevRuby, startTime: time };
		updateRubyParentTime(nextWord);
	} else {
		nextWord.startTime = time;
	}

	line.words[wordIndex] = nextWord;
}

function setUnitEndTimeCloned(
	line: LyricLine,
	wordIndex: number,
	rubyIndex: number | undefined,
	time: number,
) {
	const prevWord = line.words[wordIndex];
	if (!prevWord) return;
	const nextWord = cloneWordWithRuby(prevWord);

	if (rubyIndex !== undefined && nextWord.ruby?.[rubyIndex]) {
		const prevRuby = nextWord.ruby[rubyIndex];
		nextWord.ruby[rubyIndex] = { ...prevRuby, endTime: time };
		updateRubyParentTime(nextWord);
	} else {
		nextWord.endTime = time;
	}

	line.words[wordIndex] = nextWord;
}

const getAutoSegmentOptions = (store: ReturnType<typeof useStore>) => {
	const enabled = store.get(autoSegmentOnLineSyncAtom);
	const mode = store.get(autoSegmentSyncModeAtom);
	if (!enabled) return { enabled: false, mode };

	const engine = store.get(segmentationEngineAtom);
	const splitCJK = store.get(segmentationSplitCJKAtom);
	const punctuationMode = store.get(segmentationPunctuationModeAtom);
	const punctuationWeightStr = store.get(segmentationPunctuationWeightAtom);
	const removeEmptySegments = store.get(segmentationRemoveEmptySegmentsAtom);
	const ignoreListText = store.get(segmentationIgnoreListTextAtom);
	const customRules = store.get(segmentationCustomRulesAtom);
	const learnedRules = store.get(segmentationLearnedRulesAtom);

	const weight = parseFloat(punctuationWeightStr);
	const punctuationWeight = Number.isNaN(weight) ? 0.2 : weight;
	const ignoreList = parseIgnoreList(ignoreListText);

	return {
		enabled: true,
		mode,
		segmentationConfig: {
			engine,
			splitCJK,
			punctuationMode,
			punctuationWeight,
			removeEmptySegments,
			ignoreList,
			customRules,
			learnedRules,
		},
	};
};

export const SyncKeyBinding: FC = () => {
	const store = useStore();

	const calcJudgeTime = useCallback(
		(evt: KeyBindingEvent) => {
			return calculateJudgeTime({
				playheadSeconds: audioEngine.interpolatedCurrentTime,
				playing: audioEngine.musicPlaying,
				rate: audioEngine.musicPlayBackRate,
				processingDelay: performance.now() - evt.triggerTime,
				downTimeOffset: evt.downTimeOffset,
				syncOffset: store.get(syncTimeOffsetAtom),
				mode: store.get(syncJudgeModeAtom),
			});
		},
		[store],
	);

	const moveToNextWordBase = useCallback(
		(play: boolean): boolean => {
			const location = getCurrentLocation(store);
			if (!location) return false;
			const nextWord = findNextWord(
				location.lines,
				location.lineIndex,
				location.syncIndex,
			);
			if (!nextWord) return false;
			store.set(selectedWordsAtom, new Set([nextWord.unit.id]));
			store.set(selectedLinesAtom, new Set([nextWord.line.id]));
			if (play) audioEngine.seekMusic(getUnitStartTime(nextWord.unit) / 1000);
			return true;
		},
		[store],
	);

	const moveToNextWord = useCallback(
		() => moveToNextWordBase(false),
		[moveToNextWordBase],
	);
	const moveToNextWordAndPlay = useCallback(
		() => moveToNextWordBase(true),
		[moveToNextWordBase],
	);

	const moveToPrevWordBase = useCallback(
		(play: boolean): boolean => {
			const location = getCurrentLocation(store);
			if (!location) return false;
			if (location.syncIndex === 0) {
				if (location.lineIndex === 0) return false;
				const lastLineIndex = Math.max(0, location.lineIndex);
				const lastLine = location.lines
					.slice(0, lastLineIndex)
					.reverse()
					.find(
						(line) =>
							isSynchronizableLine(line) &&
							getSynchronizableUnits(line).length > 0,
					);
				if (!lastLine) return false;
				store.set(selectedLinesAtom, new Set([lastLine.id]));
				const lastUnit = getLastSynchronizableUnit(lastLine);
				if (!lastUnit) {
					store.set(selectedWordsAtom, new Set());
				} else {
					store.set(selectedWordsAtom, new Set([lastUnit.id]));
					if (play) audioEngine.seekMusic(getUnitStartTime(lastUnit) / 1000);
				}
			} else {
				const lineUnits = getSynchronizableUnits(location.line);
				const prevUnit = lineUnits[location.syncIndex - 1];
				if (!prevUnit) return false;
				store.set(selectedWordsAtom, new Set([prevUnit.id]));
				if (play) audioEngine.seekMusic(getUnitStartTime(prevUnit) / 1000);
			}
			return true;
		},
		[store],
	);
	const moveToPrevWord = useCallback(
		() => moveToPrevWordBase(false),
		[moveToPrevWordBase],
	);
	const moveToPrevWordAndPlay = useCallback(
		() => moveToPrevWordBase(true),
		[moveToPrevWordBase],
	);

	// 移动打轴光标

	useKeyBindingAtom(keyMoveNextLineAtom, () => {
		const location = getCurrentLineLocation(store);
		if (!location) return;
		const lastLineIndex = Math.min(
			location.lines.length,
			location.lineIndex + 1,
		);
		const lastLine = location.lines[lastLineIndex];
		if (!lastLine) return;
		store.set(selectedLinesAtom, new Set([lastLine.id]));
		const firstUnit = getFirstSynchronizableUnit(lastLine);
		if (!firstUnit) {
			store.set(selectedWordsAtom, new Set());
		} else {
			store.set(selectedWordsAtom, new Set([firstUnit.id]));
		}
	}, [store]);

	useKeyBindingAtom(keyMovePrevLineAtom, () => {
		const location = getCurrentLineLocation(store);
		if (!location) return;
		const lastLineIndex = Math.max(0, location.lineIndex - 1);
		const lastLine = location.lines[lastLineIndex];
		if (!lastLine) return;
		store.set(selectedLinesAtom, new Set([lastLine.id]));
		const firstUnit = getFirstSynchronizableUnit(lastLine);
		if (!firstUnit) {
			store.set(selectedWordsAtom, new Set());
		} else {
			store.set(selectedWordsAtom, new Set([firstUnit.id]));
		}
	}, [store]);

	useKeyBindingAtom(keyMoveNextWordAtom, moveToNextWord, [store]);
	useKeyBindingAtom(keyMoveNextWordAndPlayAtom, moveToNextWordAndPlay, [store]);
	useKeyBindingAtom(keyMovePrevWordAtom, moveToPrevWord, [store]);
	useKeyBindingAtom(keyMovePrevWordAndPlayAtom, moveToPrevWordAndPlay, [store]);

	useKeyBindingAtom(keyMoveLastWordAndPlayAtom, () => {
		const location = getCurrentLineLocation(store);
		if (!location) return;
		const lastUnit = getLastSynchronizableUnit(location.line);
		if (!lastUnit) return;
		store.set(selectedWordsAtom, new Set([lastUnit.id]));
		store.set(selectedLinesAtom, new Set([location.line.id]));
		audioEngine.seekMusic(getUnitStartTime(lastUnit) / 1000);
	}, [store]);

	useKeyBindingAtom(keyMoveFirstWordAndPlayAtom, () => {
		const location = getCurrentLineLocation(store);
		if (!location) return;
		const firstUnit = getFirstSynchronizableUnit(location.line);
		if (!firstUnit) return;
		store.set(selectedWordsAtom, new Set([firstUnit.id]));
		store.set(selectedLinesAtom, new Set([location.line.id]));
		audioEngine.seekMusic(getUnitStartTime(firstUnit) / 1000);
	}, [store]);

	// 记录时间戳（主要打轴按键）

	useKeyBindingAtom(
		keySyncStartAtom,
		(evt) => {
			const location = getCurrentLocation(store);
			if (!location) return;
			const currentTime = calcJudgeTime(evt);

			const smartFirstWord = store.get(smartFirstWordAtom);
			if (smartFirstWord && location.isFirstWord) {
				store.set(smartFirstWordActiveIdAtom, location.word.id);
			}
			const smartWordAnywhere = store.get(smartWordAnywhereAtom);
			if (smartWordAnywhere) {
				store.set(smartWordActiveIdAtom, location.syncId);
			}

			store.set(lyricLinesAtom, (prev) => {
				const state: LyricsState = prev;
				const prevLine = state.lyricLines[location.lineIndex];
				if (!prevLine) return prev;

				const nextLines = state.lyricLines.slice();
				const nextLine = cloneLineWithWords(prevLine);
				if (location.isFirstWord) nextLine.startTime = currentTime;
				setUnitStartTimeCloned(
					nextLine,
					location.wordIndex,
					location.rubyIndex,
					currentTime,
				);
				nextLines[location.lineIndex] = nextLine;

				return { ...state, lyricLines: nextLines };
			});
		},
		[store],
	);
	useKeyBindingAtom(
		keySyncNextAtom,
		(evt) => {
			const _t0 = performance.now();
			const location = getCurrentLocation(store);
			if (!location) return;
			const commitOffset = audioEngine.musicPlaying
				? store.get(syncCommitOffsetAtom)
				: 0;
			const currentTime = calcJudgeTime(evt) + commitOffset;
			const _t1 = performance.now();

			const syncLevelMode = store.get(syncLevelModeAtom);
			if (syncLevelMode === "line") {
				store.set(lyricLinesAtom, (prev) => {
					const state: LyricsState = prev;
					const prevCurLine = state.lyricLines[location.lineIndex];
					if (!prevCurLine) return prev;

					const nextLines = state.lyricLines.slice();
					const curLine = cloneLineWithWords(prevCurLine);
					curLine.endTime = currentTime;

					const units = getSynchronizableUnits(curLine);
					if (units.length > 0) {
						let startTime = getUnitStartTime(units[0]);
						if (
							startTime === undefined ||
							startTime >= currentTime ||
							startTime === 0
						) {
							startTime = Math.max(0, currentTime - 1000);
						}
						const totalDuration = currentTime - startTime;
						const lengths = units.map((u) =>
							Math.max(1, (u.rubyWord?.word || u.word.word).trim().length),
						);
						const totalLength = lengths.reduce((a, b) => a + b, 0);

						let currentStart = startTime;
						for (let i = 0; i < units.length; i++) {
							const duration = Math.round(
								(lengths[i] / totalLength) * totalDuration,
							);
							const currentEnd =
								i === units.length - 1 ? currentTime : currentStart + duration;
							setUnitStartTimeCloned(
								curLine,
								units[i].wordIndex,
								units[i].rubyIndex,
								currentStart,
							);
							setUnitEndTimeCloned(
								curLine,
								units[i].wordIndex,
								units[i].rubyIndex,
								currentEnd,
							);
							currentStart = currentEnd;
						}
					}

					const nextLineIndex = state.lyricLines
						.slice(location.lineIndex + 1)
						.findIndex(
							(nextLine) =>
								isSynchronizableLine(nextLine) &&
								getSynchronizableUnits(nextLine).length > 0,
						);

					if (nextLineIndex !== -1) {
						const absoluteNextLineIndex =
							location.lineIndex + 1 + nextLineIndex;
						const prevNextLine = state.lyricLines[absoluteNextLineIndex];
						const nextLine = cloneLineWithWords(prevNextLine);
						nextLine.startTime = currentTime;
						const nextLineUnits = getSynchronizableUnits(nextLine);
						if (nextLineUnits.length > 0) {
							setUnitStartTimeCloned(
								nextLine,
								nextLineUnits[0].wordIndex,
								nextLineUnits[0].rubyIndex,
								currentTime,
							);
						}
						nextLines[absoluteNextLineIndex] = nextLine;
					}

					nextLines[location.lineIndex] = maybeAutoSegmentLine(
						curLine,
						getAutoSegmentOptions(store),
					);
					return { ...state, lyricLines: nextLines };
				});

				const state = store.get(lyricLinesAtom);
				const nextLineIndex = state.lyricLines
					.slice(location.lineIndex + 1)
					.findIndex(
						(nextLine) =>
							isSynchronizableLine(nextLine) &&
							getSynchronizableUnits(nextLine).length > 0,
					);
				if (nextLineIndex !== -1) {
					const absoluteNextLineIndex = location.lineIndex + 1 + nextLineIndex;
					const nextLine = state.lyricLines[absoluteNextLineIndex];
					store.set(selectedLinesAtom, new Set([nextLine.id]));
					const nextLineUnits = getSynchronizableUnits(nextLine);
					if (nextLineUnits.length > 0) {
						store.set(selectedWordsAtom, new Set([nextLineUnits[0].id]));
					}
				}
				return;
			}

			const splitOccupiedWord = store.get(splitOccupiedWordAtPlayheadAtom);
			const occupied = splitOccupiedWord
				? findOccupiedUnit(
						store.get(lyricLinesAtom).lyricLines,
						location.lineIndex,
						currentTime,
					)
				: undefined;

			// 智能单词（任何无开始时间的单词，按 G 作用于前一个单词）
			let targetPriorWord: {
				lineIndex: number;
				wordIndex: number;
				rubyIndex?: number;
				syncIndex: number;
			} | null = null;

			const smartWordAnywhere = store.get(smartWordAnywhereAtom);
			if (!occupied && smartWordAnywhere) {
				const activeSmartWordId = store.get(smartWordActiveIdAtom);
				const isAlreadyActive =
					activeSmartWordId === location.syncId ||
					activeSmartWordId === location.word.id;

				const unitStartTime = getUnitStartTime(location);
				const unitEndTime = getUnitEndTime(location);

				const hasNoStartTime =
					!isAlreadyActive &&
					(unitStartTime === undefined ||
						unitStartTime === null ||
						Number.isNaN(unitStartTime) ||
						(unitStartTime <= 0 && (unitEndTime <= 0 || currentTime > 0)));

				if (hasNoStartTime) {
					const lineUnits = getSynchronizableUnits(location.line);
					if (location.syncIndex > 0) {
						const prevUnit = lineUnits[location.syncIndex - 1];
						targetPriorWord = {
							lineIndex: location.lineIndex,
							wordIndex: prevUnit.wordIndex,
							rubyIndex: prevUnit.rubyIndex,
							syncIndex: location.syncIndex - 1,
						};
					} else {
						// First word of the line: check if previous line has an unended word
						const state = store.get(lyricLinesAtom);
						let prevLineIndex = -1;
						for (let i = location.lineIndex - 1; i >= 0; i--) {
							const prevLine = state.lyricLines[i];
							if (
								isSynchronizableLine(prevLine) &&
								getSynchronizableUnits(prevLine).length > 0
							) {
								prevLineIndex = i;
								break;
							}
						}

						if (prevLineIndex !== -1) {
							const prevLine = state.lyricLines[prevLineIndex];
							const prevLineUnits = getSynchronizableUnits(prevLine);
							const lastUnit = prevLineUnits[prevLineUnits.length - 1];
							if (lastUnit && getUnitEndTime(lastUnit) <= 0) {
								targetPriorWord = {
									lineIndex: prevLineIndex,
									wordIndex: lastUnit.wordIndex,
									rubyIndex: lastUnit.rubyIndex,
									syncIndex: prevLineUnits.length - 1,
								};
							}
						}

						if (!targetPriorWord) {
							// No prior word to act on: set start time on current line & word (acts as start)
							store.set(lyricLinesAtom, (prev) => {
								const state: LyricsState = prev;
								const prevLine = state.lyricLines[location.lineIndex];
								if (!prevLine) return prev;

								const nextLines = state.lyricLines.slice();
								const nextLine = cloneLineWithWords(prevLine);
								if (location.isFirstWord) nextLine.startTime = currentTime;
								setUnitStartTimeCloned(
									nextLine,
									location.wordIndex,
									location.rubyIndex,
									currentTime,
								);
								nextLines[location.lineIndex] = nextLine;

								return { ...state, lyricLines: nextLines };
							});
							store.set(smartWordActiveIdAtom, location.syncId);
							if (location.isFirstWord) {
								store.set(smartFirstWordActiveIdAtom, location.word.id);
							}
							return;
						}
					}
				}
			}
			if (!targetPriorWord) {
				store.set(smartWordActiveIdAtom, null);
			}

			// 智能首字
			const smartFirstWord = store.get(smartFirstWordAtom);
			if (
				!occupied &&
				!targetPriorWord &&
				smartFirstWord &&
				location.isFirstWord
			) {
				const activeId = store.get(smartFirstWordActiveIdAtom);
				if (activeId !== location.word.id) {
					store.set(lyricLinesAtom, (prev) => {
						const state: LyricsState = prev;
						const prevLine = state.lyricLines[location.lineIndex];
						if (!prevLine) return prev;

						const nextLines = state.lyricLines.slice();
						const nextLine = cloneLineWithWords(prevLine);
						nextLine.startTime = currentTime;
						setUnitStartTimeCloned(
							nextLine,
							location.wordIndex,
							location.rubyIndex,
							currentTime,
						);
						nextLines[location.lineIndex] = nextLine;

						return { ...state, lyricLines: nextLines };
					});
					store.set(smartFirstWordActiveIdAtom, location.word.id);
					return;
				}
			}
			store.set(smartFirstWordActiveIdAtom, null);

			// 智能尾字
			const smartLastWord = store.get(smartLastWordAtom);
			if (
				!occupied &&
				!targetPriorWord &&
				smartLastWord &&
				location.isLastWord
			) {
				store.set(lyricLinesAtom, (prev) => {
					const state: LyricsState = prev;
					const prevLine = state.lyricLines[location.lineIndex];
					if (!prevLine) return prev;

					const nextLines = state.lyricLines.slice();
					const nextLine = cloneLineWithWords(prevLine);
					setUnitEndTimeCloned(
						nextLine,
						location.wordIndex,
						location.rubyIndex,
						currentTime,
					);
					nextLine.endTime = currentTime;
					normalizeLineTime(nextLine);
					nextLines[location.lineIndex] = maybeAutoSegmentLine(
						nextLine,
						getAutoSegmentOptions(store),
					);

					return { ...state, lyricLines: nextLines };
				});
				moveToNextWord();
				return;
			}

			// ── Main word-mode commit path ──
			// Collect selection result from updater, then set it after — avoids
			// nested store.set calls inside an atom updater (causes double propagation).
			let targetSelection: { id: string; lineId: string } | null = null;

			const _t2 = performance.now();
			store.set(lyricLinesAtom, (prev) => {
				const state: LyricsState = prev;
				const nextLines = state.lyricLines.slice();

				let curLineIndex = location.lineIndex;
				let curWordIndex = location.wordIndex;
				let curRubyIndex = location.rubyIndex;
				let curSyncIndex = location.syncIndex;

				if (occupied) {
					curLineIndex = occupied.lineIndex;
					curWordIndex = occupied.wordIndex;
					curRubyIndex = occupied.rubyIndex;
					curSyncIndex = occupied.syncIndex;
				} else if (targetPriorWord) {
					curLineIndex = targetPriorWord.lineIndex;
					curWordIndex = targetPriorWord.wordIndex;
					curRubyIndex = targetPriorWord.rubyIndex;
					curSyncIndex = targetPriorWord.syncIndex;
				}

				const getLineToEdit = (idx: number) => {
					nextLines[idx] = cloneLineWithWords(nextLines[idx]);
					return nextLines[idx];
				};

				// 1. Commit current or occupied word end time
				const lineToEdit = getLineToEdit(curLineIndex);
				if (splitOccupiedWord) {
					const currentUnitStart = getUnitStartTime({
						word: lineToEdit.words[curWordIndex],
						rubyWord:
							curRubyIndex !== undefined && lineToEdit.words[curWordIndex]?.ruby
								? lineToEdit.words[curWordIndex].ruby[curRubyIndex]
								: undefined,
					});
					if (currentUnitStart > currentTime) {
						setUnitStartTimeCloned(
							lineToEdit,
							curWordIndex,
							curRubyIndex,
							currentTime,
						);
					}
				}

				setUnitEndTimeCloned(
					lineToEdit,
					curWordIndex,
					curRubyIndex,
					currentTime,
				);

				const curEditLine = getLineToEdit(curLineIndex);
				normalizeLineTime(curEditLine);
				nextLines[curLineIndex] = maybeAutoSegmentLine(
					curEditLine,
					getAutoSegmentOptions(store),
				);

				// 2. Scan forward for next selection
				targetSelection = null;

				let iterLineIndex = curLineIndex;
				let iterSyncIndex = curSyncIndex;

				while (true) {
					const next = findNextWord(nextLines, iterLineIndex, iterSyncIndex);
					if (!next) break;

					const text = (next.unit.rubyWord?.word ?? next.unit.word.word).trim();
					if (text.length === 0) {
						// Whitespace — auto-commit both start and end
						const targetLine = getLineToEdit(next.lineIndex);
						if (next.lineIndex !== iterLineIndex) {
							nextLines[iterLineIndex].endTime = currentTime;
							normalizeLineTime(nextLines[iterLineIndex]);
							targetLine.startTime = currentTime;
						}
						setUnitStartTimeCloned(
							targetLine,
							next.unit.wordIndex,
							next.unit.rubyIndex,
							currentTime,
						);
						setUnitEndTimeCloned(
							targetLine,
							next.unit.wordIndex,
							next.unit.rubyIndex,
							currentTime,
						);
						normalizeLineTime(targetLine);
						iterLineIndex = next.lineIndex;
						iterSyncIndex = next.syncIndex;
					} else {
						// Found the next real word
						const targetLine = getLineToEdit(next.lineIndex);
						if (next.lineIndex !== iterLineIndex) {
							nextLines[iterLineIndex].endTime = currentTime;
							normalizeLineTime(nextLines[iterLineIndex]);
							targetLine.startTime = currentTime;
						}
						setUnitStartTimeCloned(
							targetLine,
							next.unit.wordIndex,
							next.unit.rubyIndex,
							currentTime,
						);
						if (splitOccupiedWord) {
							const nextEnd = getUnitEndTime(next.unit);
							if (nextEnd > 0 && nextEnd <= currentTime) {
								setUnitEndTimeCloned(
									targetLine,
									next.unit.wordIndex,
									next.unit.rubyIndex,
									0,
								);
							}
						}
						normalizeLineTime(targetLine);
						targetSelection = { id: next.unit.id, lineId: next.line.id };
						break;
					}
				}

				return { ...state, lyricLines: nextLines };
			});
			const _t3 = performance.now();

			// Apply selection AFTER lyricLinesAtom is set (avoids nested propagation)
			if (targetSelection) {
				store.set(
					selectedWordsAtom,
					new Set([(targetSelection as { id: string; lineId: string }).id]),
				);
				store.set(
					selectedLinesAtom,
					new Set([(targetSelection as { id: string; lineId: string }).lineId]),
				);
			}

			// 开了智能首字后，连轴打到下一行时跳过智能首字
			if (smartFirstWord) {
				const newLocation = getCurrentLocation(store);
				if (newLocation?.isFirstWord) {
					store.set(smartFirstWordActiveIdAtom, newLocation.word.id);
				}
			}
			if (smartWordAnywhere) {
				const newLocation = getCurrentLocation(store);
				if (newLocation) {
					store.set(smartWordActiveIdAtom, newLocation.syncId);
				}
			}

			const _t4 = performance.now();
			console.debug(
				`[commit] setup=${(_t1 - _t0).toFixed(2)}ms | lyricLinesAtom.set=${(_t3 - _t2).toFixed(2)}ms | post-set=${(_t4 - _t3).toFixed(2)}ms | TOTAL=${(_t4 - _t0).toFixed(2)}ms`,
			);
		},
		[store, moveToNextWord],
	);
	useKeyBindingAtom(
		keySyncEndAtom,
		(evt) => {
			const location = getCurrentLocation(store);
			if (!location) return;
			const currentTime = calcJudgeTime(evt);

			const syncLevelMode = store.get(syncLevelModeAtom);
			if (syncLevelMode === "line") {
				store.set(lyricLinesAtom, (prev) => {
					const state: LyricsState = prev;
					const prevCurLine = state.lyricLines[location.lineIndex];
					if (!prevCurLine) return prev;

					const nextLines = state.lyricLines.slice();
					const curLine = cloneLineWithWords(prevCurLine);
					curLine.endTime = currentTime;

					const units = getSynchronizableUnits(curLine);
					if (units.length > 0) {
						let startTime = getUnitStartTime(units[0]);
						if (
							startTime === undefined ||
							startTime >= currentTime ||
							startTime === 0
						) {
							startTime = Math.max(0, currentTime - 1000);
						}
						const totalDuration = currentTime - startTime;
						const lengths = units.map((u) =>
							Math.max(1, (u.rubyWord?.word || u.word.word).trim().length),
						);
						const totalLength = lengths.reduce((a, b) => a + b, 0);

						let currentStart = startTime;
						for (let i = 0; i < units.length; i++) {
							const duration = Math.round(
								(lengths[i] / totalLength) * totalDuration,
							);
							const currentEnd =
								i === units.length - 1 ? currentTime : currentStart + duration;
							setUnitStartTimeCloned(
								curLine,
								units[i].wordIndex,
								units[i].rubyIndex,
								currentStart,
							);
							setUnitEndTimeCloned(
								curLine,
								units[i].wordIndex,
								units[i].rubyIndex,
								currentEnd,
							);
							currentStart = currentEnd;
						}
					}

					nextLines[location.lineIndex] = maybeAutoSegmentLine(
						curLine,
						getAutoSegmentOptions(store),
					);
					return { ...state, lyricLines: nextLines };
				});

				const state = store.get(lyricLinesAtom);
				const nextLineIndex = state.lyricLines
					.slice(location.lineIndex + 1)
					.findIndex(
						(nextLine) =>
							isSynchronizableLine(nextLine) &&
							getSynchronizableUnits(nextLine).length > 0,
					);
				if (nextLineIndex !== -1) {
					const absoluteNextLineIndex = location.lineIndex + 1 + nextLineIndex;
					const nextLine = state.lyricLines[absoluteNextLineIndex];
					store.set(selectedLinesAtom, new Set([nextLine.id]));
					const nextLineUnits = getSynchronizableUnits(nextLine);
					if (nextLineUnits.length > 0) {
						store.set(selectedWordsAtom, new Set([nextLineUnits[0].id]));
					}
				}
				return;
			}

			store.set(lyricLinesAtom, (prev) => {
				const state: LyricsState = prev;
				const prevLine = state.lyricLines[location.lineIndex];
				if (!prevLine) return prev;

				const nextLines = state.lyricLines.slice();
				const nextLine = cloneLineWithWords(prevLine);
				setUnitEndTimeCloned(
					nextLine,
					location.wordIndex,
					location.rubyIndex,
					currentTime,
				);
				normalizeLineTime(nextLine);
				nextLines[location.lineIndex] = maybeAutoSegmentLine(
					nextLine,
					getAutoSegmentOptions(store),
				);

				return { ...state, lyricLines: nextLines };
			});
			moveToNextWord();
		},
		[store, moveToNextWord],
	);

	useKeyBindingAtom(keyToggleWordHighlightAtom, () => {
		store.set(highlightActiveWordAtom, (v) => !v);
	}, [store]);

	useKeyBindingAtom(keyToggleTimeLineEditAtom, () => {
		const current = store.get(timeLineEditorAtom);

		let targetLineId: string | undefined;
		const selectedLines = store.get(selectedLinesAtom);
		if (selectedLines.size > 0) {
			targetLineId = Array.from(selectedLines)[0];
		} else {
			const selectedWords = store.get(selectedWordsAtom);
			if (selectedWords.size > 0) {
				const wordId = Array.from(selectedWords)[0];
				const lyricLines = store.get(lyricLinesAtom).lyricLines;
				const found = lyricLines.find((l) =>
					l.words.some(
						(w) =>
							w.id === wordId ||
							(w.ruby &&
								w.ruby.some(
									(_, ri) => buildRubySelectionId(w.id, ri) === wordId,
								)),
					),
				);
				if (found) targetLineId = found.id;
			}
		}

		if (current) {
			if (!targetLineId || current.lineId === targetLineId) {
				store.set(timeLineEditorAtom, null);
				return;
			}
			store.set(timeLineEditorAtom, { lineId: targetLineId });
			return;
		}

		if (targetLineId) {
			store.set(selectedLinesAtom, new Set([targetLineId]));
			store.set(timeLineEditorAtom, { lineId: targetLineId });
			return;
		}

		const loc = getCurrentLocation(store);
		if (loc) {
			store.set(selectedLinesAtom, new Set([loc.line.id]));
			store.set(timeLineEditorAtom, { lineId: loc.line.id });
		}
	}, [store]);

	useEffect(() => {
		const onKeyDown = (evt: KeyboardEvent) => {
			if (evt.key === "Escape" && store.get(timeLineEditorAtom)) {
				store.set(timeLineEditorAtom, null);
				evt.preventDefault();
			}
		};
		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [store]);

	return null;
};
