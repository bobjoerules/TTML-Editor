/*
 * Copyright 2023-2025 Steve Xiao (stevexmh@qq.com) and contributors.
 *
 * 本源代码文件是属于 AMLL TTML Tool 项目的一部分。
 * This source code file is a part of AMLL TTML Tool project.
 * 本项目的源代码的使用受到 GNU GENERAL PUBLIC LICENSE version 3 许可证的约束，具体可以参阅以下链接。
 * Use of this source code is governed by the GNU GPLv3 license that can be found through the following link.
 *
 * https://github.com/bobjoerules/AMLL-TTML-TOOL/blob/main/LICENSE
 */

import React, {
	forwardRef,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type FC,
} from "react";
import {
	Button,
	Checkbox,
	Flex,
	Grid,
	IconButton,
	Popover,
	Select,
	Spinner,
	Switch,
	Text,
	TextField,
	Tooltip,
} from "@radix-ui/themes";
import {
	QuestionCircle16Regular,
	LocalLanguage24Regular,
	Add24Regular,
	Timer24Regular,
	Info24Regular,
	TextT24Regular,
	LayoutColumnThree24Regular,
	Settings24Regular,
	DocumentAdd16Regular,
	DocumentAdd20Regular,
	Sparkle16Regular,
	TextT16Regular,
	LocalLanguage16Regular,
	Warning16Regular,
	MusicNote216Regular,
	MusicNote220Regular,
	People16Regular,
	People20Regular,
	DismissCircle16Regular,
	DismissCircle20Regular,
} from "@fluentui/react-icons";
import { atom, useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useSetImmerAtom } from "jotai-immer";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import {
	displayRomanizationInSyncAtom,
	showLineRomanizationAtom,
	showLineTranslationAtom,
	showWordRomanizationInputAtom,
} from "$/modules/settings/states/index.ts";
import {
	editingTimeFieldAtom,
	lyricLinesAtom,
	requestFocusAtom,
	selectedLinesAtom,
	selectedWordsAtom,
	showEndTimeAsDurationAtom,
} from "$/states/main.ts";
import {
	type LyricLine,
	type LyricWord,
	type LyricSection,
	type LyricSectionCategory,
	newLyricLine,
	LYRIC_SECTION_CATEGORIES,
	formatVoiceLabel,
	getLineVoice,
	getVoiceColor,
	normalizeVoice,
} from "$/types/ttml";
import {
	createSectionsFromSelectedLines,
	repairSectionIntegrity,
	sectionCategoryLabel,
} from "$/modules/lyric-editor/utils/section-system";
import { getLineSinger } from "$/modules/lyric-editor/utils/auto-duet.ts";
import { buildLineRomanization, getPhoneticSyllables } from "$/utils/phonetic";
import { RibbonFrame, RibbonSection } from "./common";
import { advancedRibbonControlsAtom } from "$/modules/onboarding/states";
import { RibbonSyncProgressWidget } from "./sync-mode.tsx";

const MULTIPLE_VALUES = Symbol("multiple-values");

function EditField<
	L extends Word extends true ? LyricWord : LyricLine,
	F extends keyof L,
	Word extends boolean | undefined = undefined,
>({
	label,
	isWordField,
	fieldName,
	formatter,
	parser,
	textFieldStyle,
}: {
	label: React.ReactNode;
	isWordField?: Word;
	fieldName: F;
	formatter: (v: L[F]) => string;
	parser: (v: string) => L[F];
	textFieldStyle?: React.CSSProperties;
}) {
	const [fieldInput, setFieldInput] = useState<string | undefined>(undefined);
	const [fieldPlaceholder, setFieldPlaceholder] = useState<string>("");
	const [showDurationInput, setShowDurationInput] = useAtom(
		showEndTimeAsDurationAtom,
	);
	const itemAtom = useMemo(
		() => (isWordField ? selectedWordsAtom : selectedLinesAtom),
		[isWordField],
	);

	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const { t } = useTranslation();
	const setEditingTimeField = useSetAtom(editingTimeFieldAtom);

	const [requestFocus, setRequestFocus] = useAtom(requestFocusAtom);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (requestFocus === fieldName && !isWordField && inputRef.current) {
			inputRef.current.focus();
			setRequestFocus(null);
		}
	}, [requestFocus, fieldName, isWordField, setRequestFocus]);

	const hasErrorAtom = useMemo(
		() =>
			atom((get) => {
				if (fieldName !== "startTime" && fieldName !== "endTime") {
					return false;
				}

				const selectedItems = get(itemAtom);
				if (selectedItems.size === 0) return false;

				const lyricLines = get(lyricLinesAtom);

				if (isWordField) {
					const selectedWords = selectedItems;
					for (const line of lyricLines.lyricLines) {
						for (const word of line.words) {
							if (selectedWords.has(word.id)) {
								if (word.startTime > word.endTime) {
									return true;
								}
							}
						}
					}
				} else {
					const selectedLines = selectedItems;
					for (const line of lyricLines.lyricLines) {
						if (selectedLines.has(line.id)) {
							if (line.startTime > line.endTime) {
								return true;
							}
						}
					}
				}
				return false;
			}),
		[fieldName, isWordField, itemAtom],
	);
	const hasError = useAtomValue(hasErrorAtom);

	const currentValueAtom = useMemo(
		() =>
			atom((get) => {
				const selectedItems = get(itemAtom);
				const lyricLines = get(lyricLinesAtom);
				if (selectedItems.size === 0) return undefined;

				if (isWordField) {
					const selectedWords = selectedItems as Set<string>;
					const values = new Set();
					for (const line of lyricLines.lyricLines) {
						for (const word of line.words) {
							if (selectedWords.has(word.id)) {
								values.add(word[fieldName as keyof LyricWord]);
							}
						}
					}
					if (values.size === 1)
						return formatter(values.values().next().value as L[F]);
					return MULTIPLE_VALUES;
				}
				const selectedLines = selectedItems as Set<string>;
				const values = new Set();
				for (const line of lyricLines.lyricLines) {
					if (selectedLines.has(line.id)) {
						values.add(line[fieldName as keyof LyricLine]);
					}
				}
				if (values.size === 1)
					return formatter(values.values().next().value as L[F]);
				return MULTIPLE_VALUES;
			}),
		[fieldName, formatter, isWordField, itemAtom],
	);
	const currentValue = useAtomValue(currentValueAtom);
	const store = useStore();
	const durationValueAtom = useMemo(
		() =>
			atom((get) => {
				if (fieldName !== "endTime") return undefined;
				const selectedItems = get(itemAtom);
				const lyricLines = get(lyricLinesAtom);
				if (selectedItems.size === 0) return undefined;
				const durations = new Set<number>();
				if (isWordField) {
					const selectedWords = selectedItems as Set<string>;
					for (const line of lyricLines.lyricLines) {
						for (const word of line.words) {
							if (selectedWords.has(word.id)) {
								durations.add(word.endTime - word.startTime);
							}
						}
					}
				} else {
					const selectedLines = selectedItems as Set<string>;
					for (const line of lyricLines.lyricLines) {
						if (selectedLines.has(line.id)) {
							durations.add(line.endTime - line.startTime);
						}
					}
				}
				if (durations.size === 1) return durations.values().next().value;
				return MULTIPLE_VALUES;
			}),
		[fieldName, isWordField, itemAtom],
	);
	const durationValue = useAtomValue(durationValueAtom);
	const compareValue = useMemo(() => {
		if (fieldName === "endTime" && showDurationInput) {
			if (durationValue === MULTIPLE_VALUES) return "";
			if (typeof durationValue === "number") return String(durationValue);
			return "";
		}
		if (typeof currentValue === "string") return currentValue;
		return "";
	}, [currentValue, durationValue, fieldName, showDurationInput]);

	const onInputFinished = useCallback(
		(rawValue: string) => {
			try {
				const selectedItems = store.get(itemAtom);
				if (fieldName === "endTime" && showDurationInput) {
					const trimmedValue = rawValue.trim();
					const isDelta =
						trimmedValue.startsWith("+") || trimmedValue.startsWith("-");
					const parsedValue = Number(trimmedValue);
					if (!Number.isFinite(parsedValue)) return;
					if (!isDelta && parsedValue <= 0) return;
					editLyricLines((state) => {
						for (const line of state.lyricLines) {
							if (isWordField) {
								const updates = new Map<
									string,
									{ startTime?: number; endTime?: number }
								>();

								// First pass: Calculate all new end times for selected words
								for (
									let wordIndex = 0;
									wordIndex < line.words.length;
									wordIndex++
								) {
									const word = line.words[wordIndex];
									if (!selectedItems.has(word.id)) continue;

									const nextWord = line.words[wordIndex + 1];
									const nextStartTime = nextWord?.startTime;
									const originalEndTime = word.endTime;

									// Calculate new end time
									const newEndTimeRaw = isDelta
										? word.endTime + parsedValue
										: word.startTime + parsedValue;
									const newEndTime = Math.max(word.startTime, newEndTimeRaw);

									// Store the update for the current word
									const wordUpdate = updates.get(word.id) || {};
									wordUpdate.endTime = newEndTime;
									updates.set(word.id, wordUpdate);

									// If it was synchronized, store the start time update for the next word
									if (
										isDelta &&
										nextWord &&
										originalEndTime === nextStartTime
									) {
										// We only move nextWord's startTime if the new end time doesn't exceed its original end time
										// to avoid inverting its duration (unless it's also selected, handled below)
										const nextWordOriginalEndTime = nextWord.endTime;
										if (
											newEndTime <= nextWordOriginalEndTime ||
											selectedItems.has(nextWord.id)
										) {
											const nextUpdate = updates.get(nextWord.id) || {};
											nextUpdate.startTime = newEndTime;
											// Don't auto-fix nextWord.endTime here, let the second pass or its own delta fix it
											updates.set(nextWord.id, nextUpdate);
										}
									}
								}

								// Second pass: Apply updates and ensure durations are valid
								for (
									let wordIndex = 0;
									wordIndex < line.words.length;
									wordIndex++
								) {
									const word = line.words[wordIndex];
									const update = updates.get(word.id);

									if (update) {
										if (update.startTime !== undefined) {
											word.startTime = update.startTime;
										}
										if (update.endTime !== undefined) {
											word.endTime = update.endTime;
										}
										// Ensure valid duration after applying updates
										if (word.endTime < word.startTime) {
											word.endTime = word.startTime;
										}
									}
								}
							} else if (selectedItems.has(line.id)) {
								const newEndTimeRaw = isDelta
									? line.endTime + parsedValue
									: line.startTime + parsedValue;
								line.endTime = Math.max(line.startTime, newEndTimeRaw);
							}
						}
						return state;
					});
					return;
				}
				const value = parser(rawValue);
				editLyricLines((state) => {
					for (const line of state.lyricLines) {
						if (isWordField) {
							for (const word of line.words) {
								if (selectedItems.has(word.id)) {
									(word as L)[fieldName] = value;
								}
							}
						} else {
							if (selectedItems.has(line.id)) {
								(line as L)[fieldName] = value;
							}
						}
					}
					return state;
				});
			} catch {
				if (compareValue) setFieldInput(compareValue);
			}
		},
		[
			itemAtom,
			store,
			editLyricLines,
			compareValue,
			fieldName,
			isWordField,
			parser,
			showDurationInput,
		],
	);

	useLayoutEffect(() => {
		if (fieldName === "endTime" && showDurationInput) {
			if (durationValue === MULTIPLE_VALUES) {
				setFieldInput("");
				setFieldPlaceholder(
					t("ribbonBar.editMode.multipleValues", "Multiple values…"),
				);
				return;
			}
			if (typeof durationValue === "number") {
				setFieldInput(String(durationValue));
				setFieldPlaceholder("");
				return;
			}
			setFieldInput(undefined);
			setFieldPlaceholder("");
			return;
		}
		if (currentValue === MULTIPLE_VALUES) {
			setFieldInput("");
			setFieldPlaceholder(
				t("ribbonBar.editMode.multipleValues", "Multiple values…"),
			);
			return;
		}
		setFieldInput(currentValue);
		setFieldPlaceholder("");
	}, [currentValue, durationValue, fieldName, showDurationInput, t]);

	return (
		<>
			{fieldName === "endTime" ? (
				<Button
					size="1"
					variant="ghost"
					style={{
						justifyContent: "flex-start",
						paddingLeft: "0px",
						marginLeft: 0,
					}}
					onClick={() => setShowDurationInput((v) => !v)}
				>
					{showDurationInput
						? t("ribbonBar.editMode.duration", "Duration")
						: label}
				</Button>
			) : (
				<Text wrap="nowrap" size="1" style={{ color: "var(--accent-11)" }}>
					{label}
				</Text>
			)}
			<TextField.Root
				ref={inputRef}
				size="1"
				color={hasError ? "red" : undefined}
				variant={hasError ? "soft" : undefined}
				style={{ width: "8em", ...textFieldStyle }}
				value={fieldInput ?? ""}
				placeholder={fieldPlaceholder}
				disabled={fieldInput === undefined}
				onChange={(evt) => setFieldInput(evt.currentTarget.value)}
				onKeyDown={(evt) => {
					if (evt.key !== "Enter") return;
					onInputFinished(evt.currentTarget.value);
				}}
				onFocus={() => {
					if (
						!isWordField &&
						(fieldName === "startTime" || fieldName === "endTime")
					) {
						setEditingTimeField({
							isWord: false,
							field: fieldName as "startTime" | "endTime",
						});
					}
				}}
				onBlur={(evt) => {
					setEditingTimeField(null);

					if (evt.currentTarget.value === compareValue) return;
					onInputFinished(evt.currentTarget.value);
				}}
			/>
		</>
	);
}

function CheckboxField<
	L extends Word extends true ? LyricWord : LyricLine,
	F extends keyof L,
	V extends L[F] extends boolean ? boolean : never,
	Word extends boolean | undefined = undefined,
>({
	label,
	isWordField,
	fieldName,
	defaultValue,
}: {
	label: React.ReactNode;
	isWordField: Word;
	fieldName: F;
	defaultValue: V;
}) {
	const itemAtom = useMemo(
		() => (isWordField ? selectedWordsAtom : selectedLinesAtom),
		[isWordField],
	);

	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const store = useStore();

	const currentValueAtom = useMemo(
		() =>
			atom((get) => {
				const selectedItems = get(itemAtom);
				const lyricLines = get(lyricLinesAtom);
				if (selectedItems.size) {
					if (isWordField) {
						const selectedWords = selectedItems as Set<string>;
						const values = new Set();
						for (const line of lyricLines.lyricLines) {
							for (const word of line.words) {
								if (selectedWords.has(word.id)) {
									values.add(word[fieldName as keyof LyricWord]);
								}
							}
						}
						if (values.size === 1) return values.values().next().value as L[F];
						return MULTIPLE_VALUES;
					}
					const selectedLines = selectedItems as Set<string>;
					const values = new Set();
					for (const line of lyricLines.lyricLines) {
						if (selectedLines.has(line.id)) {
							values.add(line[fieldName as keyof LyricLine]);
						}
					}
					if (values.size === 1) return values.values().next().value as L[F];
					return MULTIPLE_VALUES;
				}
				return undefined;
			}),
		[itemAtom, fieldName, isWordField],
	);
	const currentValue = useAtomValue(currentValueAtom);
	const isDisabledAtom = useMemo(
		() => atom((get) => get(itemAtom).size === 0),
		[itemAtom],
	);
	const isDisabled = useAtomValue(isDisabledAtom);
	const checkboxId = useId();

	return (
		<>
			<Text wrap="nowrap" size="1" style={{ color: "var(--accent-11)" }}>
				<label htmlFor={checkboxId}>{label}</label>
			</Text>
			<Checkbox
				disabled={isDisabled}
				id={checkboxId}
				checked={
					currentValue
						? currentValue === MULTIPLE_VALUES
							? "indeterminate"
							: (currentValue as boolean)
						: defaultValue
				}
				onCheckedChange={(value) => {
					if (value === "indeterminate") return;
					editLyricLines((state) => {
						const selectedItems = store.get(itemAtom);
						for (const line of state.lyricLines) {
							if (isWordField) {
								for (const word of line.words) {
									if (selectedItems.has(word.id)) {
										(word as L)[fieldName] = value as L[F];
									}
								}
							} else {
								if (selectedItems.has(line.id)) {
									(line as L)[fieldName] = value as L[F];
								}
							}
						}
						return state;
					});
				}}
			/>
		</>
	);
}

function ToggleButtonField<
	L extends Word extends true ? LyricWord : LyricLine,
	F extends keyof L,
	Word extends boolean | undefined = undefined,
>({
	label,
	icon,
	isWordField,
	fieldName,
	activeColor,
	iconOnly,
}: {
	label: React.ReactNode;
	icon?: React.ReactNode;
	isWordField?: Word;
	fieldName: F;
	activeColor?:
		| "indigo"
		| "amber"
		| "crimson"
		| "ruby"
		| "purple"
		| "violet"
		| "blue"
		| "green"
		| "teal"
		| "cyan";
	iconOnly?: boolean;
}) {
	const itemAtom = useMemo(
		() => (isWordField ? selectedWordsAtom : selectedLinesAtom),
		[isWordField],
	);

	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const store = useStore();

	const currentValueAtom = useMemo(
		() =>
			atom((get) => {
				const selectedItems = get(itemAtom);
				const lyricLines = get(lyricLinesAtom);
				if (selectedItems.size) {
					if (isWordField) {
						const selectedWords = selectedItems as Set<string>;
						const values = new Set();
						for (const line of lyricLines.lyricLines) {
							for (const word of line.words) {
								if (selectedWords.has(word.id)) {
									values.add(!!word[fieldName as keyof LyricWord]);
								}
							}
						}
						if (values.size === 1)
							return values.values().next().value as boolean;
						return MULTIPLE_VALUES;
					}
					const selectedLines = selectedItems as Set<string>;
					const values = new Set();
					for (const line of lyricLines.lyricLines) {
						if (selectedLines.has(line.id)) {
							values.add(!!line[fieldName as keyof LyricLine]);
						}
					}
					if (values.size === 1) return values.values().next().value as boolean;
					return MULTIPLE_VALUES;
				}
				return undefined;
			}),
		[itemAtom, fieldName, isWordField],
	);
	const currentValue = useAtomValue(currentValueAtom);
	const isDisabledAtom = useMemo(
		() => atom((get) => get(itemAtom).size === 0),
		[itemAtom],
	);
	const isDisabled = useAtomValue(isDisabledAtom);

	const isChecked = currentValue === true;
	const isIndeterminate = currentValue === MULTIPLE_VALUES;

	const handleToggle = () => {
		const targetValue = isChecked ? false : true;
		editLyricLines((state) => {
			const selectedItems = store.get(itemAtom);
			for (const line of state.lyricLines) {
				if (isWordField) {
					for (const word of line.words) {
						if (selectedItems.has(word.id)) {
							(word as unknown as Record<string, unknown>)[
								fieldName as string
							] = targetValue;
						}
					}
				} else {
					if (selectedItems.has(line.id)) {
						(line as unknown as Record<string, unknown>)[fieldName as string] =
							targetValue;
						if (fieldName === "isDuet") {
							line.agent = targetValue
								? line.agent && line.agent !== "v1"
									? line.agent
									: "v2"
								: "v1";
						}
					}
				}
			}
			return state;
		});
	};

	if (iconOnly) {
		const button = (
			<IconButton
				size="2"
				variant={isChecked ? "solid" : isIndeterminate ? "outline" : "soft"}
				color={isChecked ? activeColor : "gray"}
				disabled={isDisabled}
				onClick={handleToggle}
				aria-label={typeof label === "string" ? label : undefined}
				style={{
					cursor: isDisabled ? "not-allowed" : "pointer",
					borderRadius: "6px",
				}}
			>
				{icon}
			</IconButton>
		);

		return (
			<Tooltip content={typeof label === "string" ? label : ""}>
				<span style={{ display: "inline-flex" }}>{button}</span>
			</Tooltip>
		);
	}

	return (
		<Button
			size="1"
			variant={isChecked ? "solid" : isIndeterminate ? "outline" : "soft"}
			color={isChecked ? activeColor : "gray"}
			disabled={isDisabled}
			onClick={handleToggle}
		>
			<Flex gap="1" align="center">
				{icon}
				<span>{label}</span>
				{isIndeterminate && <span style={{ opacity: 0.7 }}>(–)</span>}
			</Flex>
		</Button>
	);
}

// function DropdownField<
// 	L extends Word extends true ? LyricWord : LyricLine,
// 	F extends keyof L,
// 	Word extends boolean | undefined = undefined,
// >({
// 	label,
// 	isWordField,
// 	fieldName,
// 	children,
// 	defaultValue,
// }: {
// 	label: string;
// 	isWordField: Word;
// 	fieldName: F;
// 	defaultValue: L[F];
// 	children?: ReactNode | undefined;
// }) {
// 	const itemAtom = useMemo(
// 		() => (isWordField ? selectedWordsAtom : selectedLinesAtom),
// 		[isWordField],
// 	);
// 	const selectedItems = useAtomValue(itemAtom);

// 	const [lyricLines, editLyricLines] = useAtom(currentLyricLinesAtom);

// 	const currentValue = useMemo(() => {
// 		if (selectedItems.size) {
// 			if (isWordField) {
// 				const selectedWords = selectedItems as Set<string>;
// 				const values = new Set();
// 				for (const line of lyricLines.lyricLines) {
// 					for (const word of line.words) {
// 						if (selectedWords.has(word.id)) {
// 							values.add(word[fieldName as keyof LyricWord]);
// 						}
// 					}
// 				}
// 				if (values.size === 1)
// 					return {
// 						multiplieValues: false,
// 						value: values.values().next().value as L[F],
// 					} as const;
// 				return {
// 					multiplieValues: true,
// 					value: "",
// 				} as const;
// 			}
// 			const selectedLines = selectedItems as Set<string>;
// 			const values = new Set();
// 			for (const line of lyricLines.lyricLines) {
// 				if (selectedLines.has(line.id)) {
// 					values.add(line[fieldName as keyof LyricLine]);
// 				}
// 			}
// 			if (values.size === 1)
// 				return {
// 					multiplieValues: false,
// 					value: values.values().next().value as L[F],
// 				} as const;
// 			return {
// 				multiplieValues: true,
// 				value: "",
// 			} as const;
// 		}
// 		return undefined;
// 	}, [selectedItems, fieldName, isWordField, lyricLines]);

// 	return (
// 		<>
// 			<Text wrap="nowrap" size="1">
// 				{label}
// 			</Text>
// 			<Select.Root
// 				size="1"
// 				disabled={selectedItems.size === 0}
// 				defaultValue={defaultValue as string}
// 				value={(currentValue?.value as string) ?? ""}
// 				onValueChange={(value) => {
// 					editLyricLines((state) => {
// 						for (const line of state.lyricLines) {
// 							if (isWordField) {
// 								for (const word of line.words) {
// 									if (selectedItems.has(word.id)) {
// 										(word as L)[fieldName] = value as L[F];
// 									}
// 								}
// 							} else {
// 								if (selectedItems.has(line.id)) {
// 									(line as L)[fieldName] = value as L[F];
// 								}
// 							}
// 						}
// 						return state;
// 					});
// 				}}
// 			>
// 				<Select.Trigger
// 					placeholder={selectedItems.size > 0 ? "多个值..." : undefined}
// 				/>
// 				<Select.Content>{children}</Select.Content>
// 			</Select.Root>
// 		</>
// 	);
// }

const AuxiliaryDisplayField: FC = () => {
	const [showTranslation, setShowTranslation] = useAtom(
		showLineTranslationAtom,
	);
	const [showRomanization, setShowRomanization] = useAtom(
		showLineRomanizationAtom,
	);
	const [showWordRomanizationInput, setShowWordRomanizationInput] = useAtom(
		showWordRomanizationInputAtom,
	);
	const { t } = useTranslation();

	const idTranslation = useId();
	const idRomanization = useId();
	const idPerWord = useId();

	return (
		<Grid columns="1fr auto" gapX="4" gapY="1" flexGrow="1" align="center">
			<Text size="1" asChild style={{ color: "var(--accent-11)" }}>
				<label htmlFor={idTranslation}>
					{t("ribbonBar.editMode.showTranslation", "Show Translation Line")}
				</label>
			</Text>
			<Checkbox
				id={idTranslation}
				checked={showTranslation}
				onCheckedChange={(c) => setShowTranslation(Boolean(c))}
			/>
			<Text size="1" asChild style={{ color: "var(--accent-11)" }}>
				<label htmlFor={idRomanization}>
					{t("ribbonBar.editMode.showRomanization", "Show Romanization Line")}
				</label>
			</Text>
			<Checkbox
				id={idRomanization}
				checked={showRomanization}
				onCheckedChange={(c) => setShowRomanization(Boolean(c))}
			/>
			<Text size="1" asChild style={{ color: "var(--accent-11)" }}>
				<label htmlFor={idPerWord}>
					{t(
						"ribbonBar.editMode.showWordRomanizationInput",
						"Show Per-Word Romanization",
					)}
				</label>
			</Text>
			<Checkbox
				id={idPerWord}
				checked={showWordRomanizationInput}
				onCheckedChange={(c) => setShowWordRomanizationInput(Boolean(c))}
			/>
		</Grid>
	);
};

const PhoneticSection = () => {
	const { t } = useTranslation();
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const selectedLines = useAtomValue(selectedLinesAtom);
	const selectedWords = useAtomValue(selectedWordsAtom);
	const store = useStore();
	const [loading, setLoading] = useState(false);
	const [lang, setLang] = useState<"auto" | "ja" | "zh" | "ko">("auto");

	const handleAutoFetch = useCallback(async () => {
		setLoading(true);
		try {
			const { lyricLines: originalLines } = store.get(lyricLinesAtom);

			if (selectedLines.size === 0 && selectedWords.size === 0) {
				toast.info(
					t(
						"ribbonBar.editMode.phonetic.noSelection",
						"Please select lines or words first",
					),
				);
				return;
			}

			const lineUpdates: Record<string, string> = {};
			const wordUpdates: Record<string, string> = {};

			if (selectedWords.size > 0) {
				const targetLines = originalLines.filter((line) =>
					line.words.some((word) => selectedWords.has(word.id)),
				);
				for (const line of targetLines) {
					// Pass word arrays directly to ensure capsule-aware mapping
					const capsuleTexts = line.words.map((w) => w.word);
					if (capsuleTexts.join("").trim().length === 0) continue;

					// Get line-level phonetic data
					const lineSyllables = await getPhoneticSyllables(capsuleTexts, lang);

					for (let i = 0; i < line.words.length; i++) {
						const word = line.words[i];
						if (selectedWords.has(word.id)) {
							wordUpdates[word.id] = lineSyllables[i] ?? "";
						}
					}
				}
			} else {
				const targetLines = originalLines.filter((l) =>
					selectedLines.has(l.id),
				);
				for (const line of targetLines) {
					// Join for the line summary, but process capsules for word updates
					const capsuleTexts = line.words.map((w) => w.word);
					if (line.words.length > 0) {
						// Distribute using capsule-aware mapping
						const syllables = await getPhoneticSyllables(capsuleTexts, lang);
						lineUpdates[line.id] = buildLineRomanization(
							capsuleTexts,
							syllables,
						);
						for (let i = 0; i < line.words.length; i++) {
							wordUpdates[line.words[i].id] = syllables[i] ?? "";
						}
					}
				}
			}

			editLyricLines((draft) => {
				for (const line of draft.lyricLines) {
					if (lineUpdates[line.id] !== undefined) {
						line.romanLyric = lineUpdates[line.id];
					}
					for (const word of line.words) {
						if (wordUpdates[word.id] !== undefined) {
							word.romanWord = wordUpdates[word.id];
						}
					}
				}
			});
			toast.success(
				t(
					"ribbonBar.editMode.phonetic.success",
					"Phonetics fetched successfully",
				),
			);
		} catch (e) {
			console.error(e);
			toast.error(
				t("ribbonBar.editMode.phonetic.error", "Failed to fetch phonetics"),
			);
		} finally {
			setLoading(false);
		}
	}, [editLyricLines, selectedLines, selectedWords, store, t, lang]);

	const displayRomanization = useAtomValue(displayRomanizationInSyncAtom);

	return (
		<RibbonSection
			label={
				<Flex gap="1" align="center">
					<LocalLanguage24Regular />
					{t("ribbonBar.editMode.romanization.section", "Romanization")}
					<Popover.Root>
						<Popover.Trigger>
							<IconButton
								size="1"
								variant="ghost"
								style={{ cursor: "pointer" }}
							>
								<QuestionCircle16Regular />
							</IconButton>
						</Popover.Trigger>
						<Popover.Content size="1" style={{ width: 300 }}>
							<Flex direction="column" gap="2">
								<Text size="2" weight="bold">
									{t(
										"ribbonBar.editMode.romanization.info.title",
										"About Romanization",
									)}
								</Text>
								<Text size="1">
									{t(
										"ribbonBar.editMode.romanization.info.canDo",
										"✓ Can do: Auto-generate Romaji (JA), Pinyin (ZH), and Romaji (KO). Supports Kanji!",
									)}
								</Text>
								<Text size="1">
									{t(
										"ribbonBar.editMode.romanization.info.cannotDo",
										"✗ Cannot do: 100% accuracy for rare Kanji or proper names. CJK only. Minor errors may occur.",
									)}
								</Text>
							</Flex>
						</Popover.Content>
					</Popover.Root>
				</Flex>
			}
		>
			<Grid columns="2" gap="2" align="center">
				<Select.Root
					value={lang}
					onValueChange={(v) =>
						setLang(v as "auto" | "ja" | "zh" | "ko" | "yue")
					}
					size="1"
				>
					<Select.Trigger />
					<Select.Content>
						<Select.Item value="auto">
							{t("common.autoDetect", "Auto Detect")}
						</Select.Item>
						<Select.Item value="ja">
							{t("ribbonBar.editMode.romanization.ja", "Japanese (Romaji)")}
						</Select.Item>
						<Select.Item value="zh">
							{t("ribbonBar.editMode.romanization.zh", "Chinese (Pinyin)")}
						</Select.Item>
						<Select.Item value="yue">
							{t("ribbonBar.editMode.romanization.yue", "Cantonese (Jyutping)")}
						</Select.Item>
						<Select.Item value="ko">
							{t("ribbonBar.editMode.romanization.ko", "Korean (Romaji)")}
						</Select.Item>
					</Select.Content>
				</Select.Root>
				<Button
					size="1"
					variant="soft"
					onClick={handleAutoFetch}
					disabled={loading}
				>
					{loading ? (
						<Spinner size="1" />
					) : (
						<Flex gap="1" align="center">
							<Sparkle16Regular />
							{t("ribbonBar.editMode.romanization.autoFetch", "Romanize")}
						</Flex>
					)}
				</Button>
				<Flex
					gap="2"
					align="center"
					style={{ gridColumn: "span 2", justifyContent: "center" }}
				>
					<Text size="1" color="gray">
						{t("settings.common.enabled", "Enabled")}
					</Text>
					<Switch
						size="1"
						checked={displayRomanization}
						onCheckedChange={(checked) =>
							store.set(displayRomanizationInSyncAtom, checked)
						}
					/>
				</Flex>
			</Grid>
		</RibbonSection>
	);
};

const LineVoiceSelect: FC = () => {
	const { t } = useTranslation();
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const selectedLines = useAtomValue(selectedLinesAtom);
	const lyrics = useAtomValue(lyricLinesAtom);
	const lyricLines = lyrics.lyricLines;

	const selectedLineObjs = useMemo(
		() => lyricLines.filter((l) => selectedLines.has(l.id)),
		[lyricLines, selectedLines],
	);

	const currentVoice = useMemo(() => {
		if (selectedLineObjs.length === 0) return "v1";
		const firstVoice = getLineVoice(selectedLineObjs[0]);
		if (selectedLineObjs.every((l) => getLineVoice(l) === firstVoice)) {
			return firstVoice;
		}
		return "mixed";
	}, [selectedLineObjs]);

	const availableVoices = useMemo(() => {
		const voiceSet = new Set<string>(["v1", "v2", "v3", "v4"]);
		for (const l of lyricLines) {
			voiceSet.add(getLineVoice(l));
		}
		return Array.from(voiceSet).sort((a, b) => {
			const numA = parseInt(a.replace(/\D/g, "") || "1", 10);
			const numB = parseInt(b.replace(/\D/g, "") || "1", 10);
			return numA - numB;
		});
	}, [lyricLines]);

	const voiceSingers = useMemo(() => {
		const map: Record<string, string> = {};
		const sectionMap = new Map<string, LyricSection>();
		for (const s of lyrics.sections || []) {
			sectionMap.set(s.id, s);
		}
		for (const l of lyricLines) {
			const v = getLineVoice(l);
			if (!map[v]) {
				const singer = getLineSinger(l, sectionMap);
				if (singer) map[v] = singer;
			}
		}
		return map;
	}, [lyricLines, lyrics.sections]);

	const handleVoiceChange = (val: string) => {
		if (val === "custom") {
			const input = window.prompt(
				t("contextMenu.enterVoicePrompt", "Enter voice ID (v1 to v1000):"),
				currentVoice !== "mixed" ? currentVoice : "v3",
			);
			if (!input) return;
			val = input;
		}
		const norm = normalizeVoice(val);
		const isDuet = norm !== "v1";
		editLyricLines((state) => {
			for (const line of state.lyricLines) {
				if (selectedLines.has(line.id)) {
					line.agent = norm;
					line.isDuet = isDuet;
				}
			}
		});
	};

	return (
		<Select.Root
			size="1"
			value={currentVoice}
			onValueChange={handleVoiceChange}
			disabled={selectedLines.size === 0}
		>
			<Select.Trigger placeholder={t("ribbonBar.editMode.voice", "Voice")} />
			<Select.Content>
				{currentVoice === "mixed" && (
					<Select.Item value="mixed" disabled>
						{t("sectionActions.multiple", "(Multiple)")}
					</Select.Item>
				)}
				{availableVoices.map((v) => (
					<Select.Item key={v} value={v}>
						<Flex align="center" gap="2">
							<span
								style={{
									width: 8,
									height: 8,
									borderRadius: "50%",
									backgroundColor: getVoiceColor(v),
									display: "inline-block",
								}}
							/>
							{formatVoiceLabel(v, voiceSingers[v])}
						</Flex>
					</Select.Item>
				))}
				<Select.Separator />
				<Select.Item value="custom">
					{t("contextMenu.customVoice", "Custom Voice (v#)...")}
				</Select.Item>
			</Select.Content>
		</Select.Root>
	);
};

const RibbonSectionControls: FC<{ isSidebar?: boolean }> = ({ isSidebar }) => {
	const { t } = useTranslation();
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const selectedLines = useAtomValue(selectedLinesAtom);
	const lyrics = useAtomValue(lyricLinesAtom);

	const selectedLineSections = useMemo(() => {
		const sectionMap = new Map((lyrics.sections ?? []).map((s) => [s.id, s]));
		const sections: LyricSection[] = [];
		const seen = new Set<string>();
		for (const line of lyrics.lyricLines) {
			if (selectedLines.has(line.id) && line.sectionId) {
				if (!seen.has(line.sectionId) && sectionMap.has(line.sectionId)) {
					seen.add(line.sectionId);
					sections.push(sectionMap.get(line.sectionId)!);
				}
			}
		}
		return sections;
	}, [lyrics.lyricLines, lyrics.sections, selectedLines]);

	const currentCategory = useMemo(() => {
		if (selectedLineSections.length === 0) return "none";
		const first = selectedLineSections[0].category;
		for (let i = 1; i < selectedLineSections.length; i++) {
			if (selectedLineSections[i].category !== first) return "multiple";
		}
		return first;
	}, [selectedLineSections]);

	const currentVocalist = useMemo(() => {
		if (selectedLineSections.length === 0) return "";
		const first = selectedLineSections[0].vocalist ?? "";
		for (let i = 1; i < selectedLineSections.length; i++) {
			if ((selectedLineSections[i].vocalist ?? "") !== first) return "";
		}
		return first;
	}, [selectedLineSections]);

	const [vocalistInput, setVocalistInput] = useState(currentVocalist);

	useEffect(() => {
		setVocalistInput(currentVocalist);
	}, [currentVocalist]);

	const handleCategoryChange = (newCategory: string) => {
		if (newCategory === "none" || newCategory === "multiple") return;
		const cat = newCategory as LyricSectionCategory;
		editLyricLines((draft) => {
			const targetSectionIds = new Set<string>();
			let hasLinesWithoutSection = false;
			for (const line of draft.lyricLines) {
				if (selectedLines.has(line.id)) {
					if (line.sectionId) {
						targetSectionIds.add(line.sectionId);
					} else {
						hasLinesWithoutSection = true;
					}
				}
			}

			if (targetSectionIds.size === 0 || hasLinesWithoutSection) {
				const created = createSectionsFromSelectedLines(
					draft,
					selectedLines,
					cat,
				);
				for (const s of created) {
					s.category = cat;
					const catLabel = sectionCategoryLabel(cat);
					const numStr = s.ordinal ? ` ${s.ordinal}` : "";
					const vocStr = s.vocalist ? `: ${s.vocalist}` : "";
					s.label = `${catLabel}${numStr}${vocStr}`;
				}
			}

			if (targetSectionIds.size > 0 && draft.sections) {
				for (const section of draft.sections) {
					if (targetSectionIds.has(section.id)) {
						section.category = cat;
						const catLabel = sectionCategoryLabel(cat);
						const numStr = section.ordinal ? ` ${section.ordinal}` : "";
						const vocStr = section.vocalist ? `: ${section.vocalist}` : "";
						section.label = `${catLabel}${numStr}${vocStr}`;
						for (const line of draft.lyricLines) {
							if (line.sectionId === section.id) {
								line.geniusHeader = section.label;
							}
						}
					}
				}
			}
		});
	};

	const handleVocalistCommit = (singer: string) => {
		const trimmed = singer.trim();
		editLyricLines((draft) => {
			const targetSectionIds = new Set<string>();
			let hasLinesWithoutSection = false;
			for (const line of draft.lyricLines) {
				if (selectedLines.has(line.id)) {
					if (line.sectionId) {
						targetSectionIds.add(line.sectionId);
					} else {
						hasLinesWithoutSection = true;
					}
				}
			}

			if (targetSectionIds.size === 0 || hasLinesWithoutSection) {
				const created = createSectionsFromSelectedLines(
					draft,
					selectedLines,
					currentCategory !== "none" && currentCategory !== "multiple"
						? (currentCategory as LyricSectionCategory)
						: "verse",
				);
				for (const s of created) {
					s.vocalist = trimmed || undefined;
					const catLabel = sectionCategoryLabel(s.category);
					const numStr = s.ordinal ? ` ${s.ordinal}` : "";
					const vocStr = s.vocalist ? `: ${s.vocalist}` : "";
					s.label = `[${catLabel}${numStr}${vocStr}]`;
				}
			}

			if (targetSectionIds.size > 0 && draft.sections) {
				for (const section of draft.sections) {
					if (targetSectionIds.has(section.id)) {
						section.vocalist = trimmed || undefined;
						const catLabel = sectionCategoryLabel(section.category);
						const numStr = section.ordinal ? ` ${section.ordinal}` : "";
						const vocStr = section.vocalist ? `: ${section.vocalist}` : "";
						section.label = `[${catLabel}${numStr}${vocStr}]`;
						for (const line of draft.lyricLines) {
							if (line.sectionId === section.id) {
								line.geniusHeader = section.label;
							}
						}
					}
				}
			}
		});
	};

	return (
		<RibbonSection
			isSidebar={isSidebar}
			label={
				<Flex gap="1" align="center">
					<People16Regular />
					{t("ribbonBar.editMode.sectionProperties", "Section")}
				</Flex>
			}
		>
			<Grid columns="1" gap="1" gapY="1" flexGrow="1" align="center">
				<Select.Root
					size="1"
					value={currentCategory}
					onValueChange={handleCategoryChange}
				>
					<Select.Trigger
						placeholder={t("sectionActions.type", "Section Type")}
					/>
					<Select.Content>
						{currentCategory === "none" && (
							<Select.Item value="none" disabled>
								{t("sectionActions.noSection", "(No Section)")}
							</Select.Item>
						)}
						{currentCategory === "multiple" && (
							<Select.Item value="multiple" disabled>
								{t("sectionActions.multiple", "(Multiple)")}
							</Select.Item>
						)}
						{LYRIC_SECTION_CATEGORIES.map((category) => (
							<Select.Item key={category} value={category}>
								{sectionCategoryLabel(category)}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
				<TextField.Root
					size="1"
					placeholder={t(
						"sectionActions.vocalistPlaceholder",
						"Singer / Vocalist",
					)}
					value={vocalistInput}
					onChange={(e) => setVocalistInput(e.target.value)}
					onBlur={(e) => handleVocalistCommit(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							handleVocalistCommit(e.currentTarget.value);
						}
					}}
				>
					<TextField.Slot>
						<People16Regular />
					</TextField.Slot>
				</TextField.Root>
				<LineVoiceSelect />
			</Grid>
		</RibbonSection>
	);
};

export const EditModeRibbonBar: FC<{ isSidebar?: boolean }> = forwardRef<
	HTMLDivElement,
	{ isSidebar?: boolean }
>(({ isSidebar }, ref) => {
	const editLyricLines = useSetImmerAtom(lyricLinesAtom);
	const { t } = useTranslation();
	const [selectedLines, setSelectedLines] = useAtom(selectedLinesAtom);
	const selectedWords = useAtomValue(selectedWordsAtom);
	const [showAdvanced, setShowAdvanced] = useAtom(advancedRibbonControlsAtom);

	return (
		<RibbonFrame ref={ref} isSidebar={isSidebar} reserveControlRows={3}>
			<RibbonSection
				isSidebar={isSidebar}
				label={
					<Flex align="center" gap="1" style={{ display: "inline-flex" }}>
						<Timer24Regular style={{ width: "12px", height: "12px" }} />
						<span>{t("ribbonBar.syncMode.syncProgress", "Sync Progress")}</span>
					</Flex>
				}
			>
				<RibbonSyncProgressWidget />
			</RibbonSection>
			<RibbonSection
				label={
					<Flex gap="1" align="center">
						<Info24Regular />
						{t("ribbonBar.editMode.lineProperties", "Line Properties")}
					</Flex>
				}
				isSidebar={isSidebar}
			>
				<Flex
					gap="1"
					align="center"
					justify="center"
					direction={isSidebar ? "column" : "row"}
					style={{ height: "100%" }}
				>
					<Tooltip content={t("ribbonBar.editMode.newLine", "New Line")}>
						<span style={{ display: "inline-flex" }}>
							<IconButton
								size="2"
								variant="soft"
								onClick={() =>
									editLyricLines((draft) => {
										let targetIndex = -1;
										if (selectedLines.size > 0) {
											for (let i = draft.lyricLines.length - 1; i >= 0; i--) {
												if (selectedLines.has(draft.lyricLines[i].id)) {
													targetIndex = i;
													break;
												}
											}
										}
										const newLine = newLyricLine();
										if (targetIndex >= 0) {
											const prevLine = draft.lyricLines[targetIndex];
											if (prevLine.sectionId) {
												newLine.sectionId = prevLine.sectionId;
											}
											if (prevLine.geniusHeader) {
												newLine.geniusHeader = prevLine.geniusHeader;
											}
											draft.lyricLines.splice(targetIndex + 1, 0, newLine);
											repairSectionIntegrity(draft);
										} else {
											draft.lyricLines.push(newLine);
										}
										setSelectedLines(new Set([newLine.id]));
									})
								}
								aria-label={t("ribbonBar.editMode.newLine", "New Line")}
								style={{ cursor: "pointer", borderRadius: "6px" }}
							>
								<DocumentAdd20Regular />
							</IconButton>
						</span>
					</Tooltip>
					<ToggleButtonField
						icon={<MusicNote220Regular />}
						label={t("ribbonBar.editMode.bgLyric", "Background Vocal")}
						fieldName="isBG"
						iconOnly
					/>
					<ToggleButtonField
						icon={<People20Regular />}
						label={t("ribbonBar.editMode.duetLyric", "Duet Vocal")}
						fieldName="isDuet"
						iconOnly
					/>
					<ToggleButtonField
						icon={<DismissCircle20Regular />}
						label={t("ribbonBar.editMode.ignoreSync", "Ignore Sync")}
						fieldName="ignoreSync"
						iconOnly
					/>
				</Flex>
			</RibbonSection>
			{selectedLines.size > 0 && (
				<RibbonSectionControls isSidebar={isSidebar} />
			)}
			{showAdvanced && (selectedLines.size > 0 || selectedWords.size > 0) && (
				<PhoneticSection isSidebar={isSidebar} />
			)}
			{selectedWords.size > 0 && (
				<RibbonSection
					isSidebar={isSidebar}
					label={
						<Flex gap="1" align="center">
							<TextT24Regular />
							{t("ribbonBar.editMode.wordProperties", "Word Properties")}
						</Flex>
					}
				>
					<Grid
						columns="max-content 1fr"
						gap="2"
						gapY="1"
						flexGrow="1"
						align="center"
					>
						<EditField
							label={
								<Flex gap="1" align="center">
									<TextT16Regular />
									{t("ribbonBar.editMode.wordContent", "Word Content")}
								</Flex>
							}
							fieldName="word"
							isWordField
							parser={(v) => v}
							formatter={(v) => v}
						/>
						<EditField
							label={
								<Flex gap="1" align="center">
									<LocalLanguage16Regular />
									{t("ribbonBar.editMode.romanWord", "Word Romanization")}
								</Flex>
							}
							fieldName="romanWord"
							isWordField
							parser={(v) => v}
							formatter={(v) => v || ""}
						/>
						<CheckboxField
							label={
								<Flex gap="1" align="center">
									<Warning16Regular />
									{t("ribbonBar.editMode.obscene", "Obscene")}
								</Flex>
							}
							isWordField
							fieldName="obscene"
							defaultValue={false}
						/>
					</Grid>
				</RibbonSection>
			)}
			{showAdvanced && (
				<RibbonSection
					label={
						<Flex gap="1" align="center">
							<LayoutColumnThree24Regular />
							{t(
								"ribbonBar.editMode.auxiliaryLineDisplay",
								"Auxiliary Line Display",
							)}
						</Flex>
					}
					isSidebar={isSidebar}
				>
					<AuxiliaryDisplayField />
				</RibbonSection>
			)}

			<RibbonSection
				label={
					<Flex gap="1" align="center">
						<Settings24Regular />
						{t("ribbonBar.advanced", "Advanced")}
					</Flex>
				}
				isSidebar={isSidebar}
			>
				<Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
			</RibbonSection>
		</RibbonFrame>
	);
});

export default EditModeRibbonBar;
