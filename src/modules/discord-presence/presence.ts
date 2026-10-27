import { ToolMode } from "$/states/main";
import type { TTMLLyric } from "$/types/ttml";

export const PRESENCE_BRIDGE_VERSION = 1;
export const PRESENCE_META_NAME = "amll-discord-presence";
export const DISCORD_LOGO_URL =
	"https://raw.githubusercontent.com/bobjoerules/TTML-Editor/main/public/logo.png";
export const DISCORD_PLAY_URL = "https://cdn.rcd.gg/PreMiD/resources/play.png";
export const DISCORD_PAUSE_URL =
	"https://cdn.rcd.gg/PreMiD/resources/pause.png";
export const DISCORD_EDIT_URL = "https://i.imgur.com/vXBNVsw.png";
export const DISCORD_SYNC_URL = "https://i.imgur.com/cRaE75x.png";
export const DISCORD_PREVIEW_URL = "https://i.imgur.com/x7xDsb5.png";
export const REPOSITORY_URL = "https://github.com/bobjoerules/TTML-Editor";
export const DEFAULT_DISCORD_DETAILS_TEMPLATE = "{{title}}";
export const DEFAULT_DISCORD_STATE_TEMPLATE = "[[{{artist}}]]";

export const DISCORD_TEMPLATE_VARIABLES = [
	"title",
	"fileName",
	"artist",
	"album",
	"songwriters",
	"mode",
	"lineProgress",
	"currentLine",
	"totalLines",
	"currentLineText",
	"syncPercentage",
	"syncProgress",
	"timedLines",
	"timedWords",
	"timedWordsPercentage",
	"selectedLines",
	"selectedWords",
	"totalWords",
	"sectionCount",
	"playbackStatus",
	"position",
	"duration",
	"remaining",
	"playbackRate",
	"projectElapsed",
	"appName",
	"username",
	"checklistCompleted",
	"checklistTotal",
	"checklistPercentage",
	"checklistProgress",
] as const;

export type DiscordTemplateVariable =
	(typeof DISCORD_TEMPLATE_VARIABLES)[number];
export type DiscordTemplateContext = Record<DiscordTemplateVariable, string>;

export interface PresenceSnapshot {
	version: typeof PRESENCE_BRIDGE_VERSION;
	mode: ToolMode;
	title: string;
	artist: string;
	currentLine: number | null;
	totalLines: number;
	playing: boolean;
	positionSeconds: number;
	durationSeconds: number;
	playbackRate: number;
	projectElapsedSeconds?: number;
	coverUrl?: string | null;
	userProfilePhoto?: string | null;
	userDisplayName?: string | null;
	hasFile?: boolean;
	checklistTotal?: number;
	checklistCompleted?: number;
}

export interface DiscordActivityPayload {
	details?: string;
	state?: string;
	playing: boolean;
	activityType?: string;
	showRepositoryButton: boolean;
	startTimestamp?: number;
	endTimestamp?: number;
	largeImage?: string;
	largeImageText?: string;
	smallImage?: string;
	smallImageText?: string;
}

export const DEFAULT_DISCORD_BOTTOM_LINE_TEMPLATE =
	"{{syncPercentage}} Synced ({{timedLines}}/{{totalLines}} lines)";

export interface DiscordActivityOptions {
	detailsTemplate: string;
	stateTemplate: string;
	bottomLineTemplate?: string;
	showPlaybackTimeline: boolean;
	showProjectElapsed: boolean;
	showRepositoryButton: boolean;
	activityType?: string;
	showStatusBadge: boolean;
	privacyPreset: "rich" | "minimal" | "none";
	largeImageMode: "icon" | "artwork" | "state" | "tab" | "profile" | "none";
	smallImageMode: "icon" | "artwork" | "state" | "tab" | "profile" | "none";
	idleLargeImageMode?: "icon" | "profile" | "tab" | "none";
	idleSmallImageMode?: "icon" | "profile" | "tab" | "none";
	idleBottomTextTemplate?: string;
	generalActivityText?: string;
	showProgressTimer: boolean;
}

const metadataValues = (lyrics: TTMLLyric, key: string) =>
	lyrics.metadata
		.find((entry) => entry.key.toLowerCase() === key.toLowerCase())
		?.value.map((value) => value.trim())
		.filter(Boolean) ?? [];

const firstMetadataValue = (lyrics: TTMLLyric, key: string) =>
	metadataValues(lyrics, key)[0] ?? "";

export function createPresenceSnapshot({
	lyrics,
	fileName,
	mode,
	selectedLineIds,
	playing,
	positionSeconds,
	durationSeconds,
	playbackRate,
	projectElapsedSeconds,
	userProfilePhoto,
	userDisplayName,
	checklistTotal,
	checklistCompleted,
	audioCoverArt,
}: {
	lyrics: TTMLLyric;
	fileName: string;
	mode: ToolMode;
	selectedLineIds: Set<string>;
	playing: boolean;
	positionSeconds: number;
	durationSeconds: number;
	playbackRate: number;
	projectElapsedSeconds?: number;
	userProfilePhoto?: string | null;
	userDisplayName?: string | null;
	checklistTotal?: number;
	checklistCompleted?: number;
	audioCoverArt?: string | null;
}): PresenceSnapshot {
	const primaryLines = lyrics.lyricLines.filter((line) => !line.isBG);
	let currentIndex = -1;

	if (mode === ToolMode.Preview) {
		const positionMs = positionSeconds * 1000;
		currentIndex = primaryLines.findIndex(
			(line) => positionMs >= line.startTime && positionMs <= line.endTime,
		);
	} else {
		currentIndex = primaryLines.findIndex((line) =>
			selectedLineIds.has(line.id),
		);
	}

	const metadataCover =
		lyrics.metadata
			.find((entry) => entry.key.toLowerCase() === "cover_art")
			?.value.find((value) => value.trim().length > 0) ?? null;
	const coverUrl = metadataCover || audioCoverArt || null;

	const musicName = (
		firstMetadataValue(lyrics, "musicName") ||
		firstMetadataValue(lyrics, "title")
	).trim();
	const artistName = (
		firstMetadataValue(lyrics, "artists") ||
		firstMetadataValue(lyrics, "artist")
	).trim();
	const hasMeaningfulLines = lyrics.lyricLines.some(
		(line) =>
			(line.words &&
				line.words.some((w) => Boolean(w.word && w.word.trim().length > 0))) ||
			(typeof (line as any).main === "string" &&
				(line as any).main.trim().length > 0),
	);
	const hasCustomFileName =
		Boolean(fileName) &&
		fileName !== "lyric.ttml" &&
		fileName !== "lyric" &&
		fileName !== "untitled.ttml" &&
		fileName !== "untitled";

	const hasFile =
		hasMeaningfulLines ||
		durationSeconds > 0 ||
		Boolean(musicName) ||
		Boolean(artistName) ||
		hasCustomFileName;

	const title = hasFile
		? musicName || fileName.replace(/\.(?:ttml|lrc|txt)$/i, "").trim()
		: "";

	return {
		version: PRESENCE_BRIDGE_VERSION,
		mode,
		title,
		artist: hasFile ? artistName : "",
		currentLine: currentIndex >= 0 ? currentIndex + 1 : null,
		totalLines: primaryLines.length,
		playing,
		positionSeconds: Math.max(0, positionSeconds),
		durationSeconds: Math.max(0, durationSeconds),
		playbackRate: Math.max(0.01, playbackRate),
		projectElapsedSeconds: Math.max(0, projectElapsedSeconds ?? 0),
		coverUrl,
		userProfilePhoto,
		userDisplayName,
		hasFile,
		checklistTotal: Math.max(0, checklistTotal ?? 0),
		checklistCompleted: Math.max(0, checklistCompleted ?? 0),
	};
}

export const modeLabels: Record<ToolMode, string> = {
	[ToolMode.Edit]: "Editing",
	[ToolMode.Sync]: "Syncing",
	[ToolMode.Preview]: "Previewing",
};

export const getTabImageUrl = (mode: ToolMode): string => {
	switch (mode) {
		case ToolMode.Edit:
			return DISCORD_EDIT_URL;
		case ToolMode.Sync:
			return DISCORD_SYNC_URL;
		case ToolMode.Preview:
			return DISCORD_PREVIEW_URL;
	}
};

export const getTabImageText = (mode: ToolMode): string => {
	return modeLabels[mode] || "TTML Editor";
};

const truncateDiscordText = (value: string) =>
	Array.from(value).slice(0, 128).join("");

const formatClock = (seconds: number) => {
	const safeSeconds = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(safeSeconds / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	const remainder = safeSeconds % 60;
	return hours > 0
		? `${hours}:${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`
		: `${minutes}:${remainder.toString().padStart(2, "0")}`;
};

const formatElapsed = (seconds: number) => {
	const safeSeconds = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(safeSeconds / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
	if (minutes > 0) return `${minutes}m`;
	return `${safeSeconds}s`;
};

const templateVariableSet = new Set<string>(DISCORD_TEMPLATE_VARIABLES);
const placeholderPattern = /\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g;

export function validateDiscordTemplate(template: string): string | null {
	let optionalDepth = 0;
	for (let index = 0; index < template.length; index++) {
		const pair = template.slice(index, index + 2);
		if (pair === "[[") {
			if (optionalDepth > 0) return "Optional segments cannot be nested.";
			optionalDepth++;
			index++;
		} else if (pair === "]]") {
			if (optionalDepth === 0) return "Unexpected optional segment ending.";
			optionalDepth--;
			index++;
		}
	}
	if (optionalDepth > 0) return "Optional segment is not closed.";

	let unknownVariable = "";
	const withoutPlaceholders = template.replace(
		placeholderPattern,
		(_match, variable: string) => {
			if (!templateVariableSet.has(variable)) unknownVariable = variable;
			return "";
		},
	);
	if (unknownVariable) return `Unknown variable: ${unknownVariable}`;
	if (withoutPlaceholders.includes("{{") || withoutPlaceholders.includes("}}"))
		return "Malformed template variable.";
	return null;
}

export function renderDiscordTemplate(
	template: string,
	context: DiscordTemplateContext,
): string {
	const validationError = validateDiscordTemplate(template);
	if (validationError) throw new Error(validationError);

	const renderVariables = (value: string) =>
		value.replace(
			placeholderPattern,
			(_match, variable: DiscordTemplateVariable) => context[variable],
		);
	const withOptionalSegments = template.replace(
		/\[\[([^[\]]*)\]\]/g,
		(_match, segment: string) => {
			const variables = Array.from(segment.matchAll(placeholderPattern));
			return variables.some(
				(match) => !context[match[1] as DiscordTemplateVariable],
			)
				? ""
				: renderVariables(segment);
		},
	);
	return renderVariables(withOptionalSegments).trim();
}

export function createDiscordTemplateContext({
	snapshot,
	lyrics,
	fileName,
	selectedLineIds,
	selectedWordIds,
}: {
	snapshot: PresenceSnapshot;
	lyrics: TTMLLyric;
	fileName: string;
	selectedLineIds: ReadonlySet<string>;
	selectedWordIds: ReadonlySet<string>;
}): DiscordTemplateContext {
	const hasFile = snapshot.hasFile ?? true;
	const primaryLines = lyrics.lyricLines.filter((line) => !line.isBG);
	const currentLine = snapshot.currentLine
		? primaryLines[snapshot.currentLine - 1]
		: undefined;
	const lineProgress = !hasFile
		? "No file open"
		: snapshot.currentLine
			? `Line ${snapshot.currentLine} of ${snapshot.totalLines}`
			: snapshot.totalLines > 0
				? `${snapshot.totalLines} lines`
				: "No lyrics yet";
	const timedLinesCount = primaryLines.filter((line) => {
		const hasLineTime = line.startTime > 0 || line.endTime > 0;
		const hasWordTime = Boolean(
			line.words && line.words.some((w) => w.startTime > 0 || w.endTime > 0),
		);
		return hasLineTime || hasWordTime;
	}).length;
	const syncPercentageNum =
		primaryLines.length > 0
			? Math.round((timedLinesCount / primaryLines.length) * 100)
			: 0;
	const syncPercentage = hasFile ? `${syncPercentageNum}%` : "0%";
	const syncProgress = hasFile
		? primaryLines.length > 0
			? `${syncPercentageNum}% Synced (${timedLinesCount}/${primaryLines.length})`
			: "No lyrics yet"
		: "No file open";

	const meaningfulWords = lyrics.lyricLines.flatMap((l) =>
		(l.words || []).filter((w) => Boolean(w.word && w.word.trim().length > 0)),
	);
	const timedWordsCount = meaningfulWords.filter(
		(w) => (w.startTime ?? 0) > 0 || (w.endTime ?? 0) > 0,
	).length;
	const totalWordsCount = meaningfulWords.length;
	const timedWordsPercentageNum =
		totalWordsCount > 0
			? Math.round((timedWordsCount / totalWordsCount) * 100)
			: 0;
	const playbackStatus = snapshot.playing
		? "Playing"
		: snapshot.durationSeconds > 0
			? "Paused"
			: "No audio loaded";

	return {
		title: hasFile ? snapshot.title || "Untitled lyrics" : "No file open",
		fileName: hasFile ? fileName : "",
		artist: hasFile ? snapshot.artist : "",
		album: hasFile ? firstMetadataValue(lyrics, "album") : "",
		songwriters: hasFile ? metadataValues(lyrics, "songwriter").join(", ") : "",
		mode: modeLabels[snapshot.mode],
		lineProgress,
		currentLine: snapshot.currentLine?.toString() ?? "",
		totalLines: snapshot.totalLines.toString(),
		currentLineText:
			currentLine?.words?.map((word) => word.word).join("") ?? "",
		syncPercentage,
		syncProgress,
		timedLines: timedLinesCount.toString(),
		timedWords: timedWordsCount.toString(),
		timedWordsPercentage: `${timedWordsPercentageNum}%`,
		selectedLines: selectedLineIds.size.toString(),
		selectedWords: selectedWordIds.size.toString(),
		totalWords: totalWordsCount.toString(),
		sectionCount: (lyrics.sections?.length ?? 0).toString(),
		playbackStatus,
		position: formatClock(snapshot.positionSeconds),
		duration:
			snapshot.durationSeconds > 0 ? formatClock(snapshot.durationSeconds) : "",
		remaining:
			snapshot.durationSeconds > 0
				? formatClock(snapshot.durationSeconds - snapshot.positionSeconds)
				: "",
		playbackRate: `${Number(snapshot.playbackRate.toFixed(2))}×`,
		projectElapsed: hasFile
			? formatElapsed(snapshot.projectElapsedSeconds ?? 0)
			: "",
		appName: "TTML Editor",
		username: snapshot.userDisplayName || "AMLL User",
		checklistCompleted: (snapshot.checklistCompleted ?? 0).toString(),
		checklistTotal: (snapshot.checklistTotal ?? 0).toString(),
		checklistPercentage:
			(snapshot.checklistTotal ?? 0) > 0
				? `${Math.round(((snapshot.checklistCompleted ?? 0) / (snapshot.checklistTotal ?? 0)) * 100)}%`
				: "0%",
		checklistProgress: `${snapshot.checklistCompleted ?? 0}/${snapshot.checklistTotal ?? 0}`,
	};
}

export function formatNativeDiscordActivity(
	snapshot: PresenceSnapshot,
	context: DiscordTemplateContext,
	options: DiscordActivityOptions,
	nowSeconds = Math.floor(Date.now() / 1000),
): DiscordActivityPayload {
	if (snapshot.hasFile === false) {
		if (options.privacyPreset === "none") {
			return {
				playing: false,
				...(options.activityType ? { activityType: options.activityType } : {}),
				showRepositoryButton: false,
			};
		}

		const getIdleImageUrl = (
			mode: "icon" | "profile" | "tab" | "none",
		): string | undefined => {
			if (mode === "icon") return DISCORD_LOGO_URL;
			if (mode === "profile")
				return snapshot.userProfilePhoto || DISCORD_LOGO_URL;
			if (mode === "tab") return getTabImageUrl(snapshot.mode);
			return undefined;
		};

		const getIdleImageText = (
			mode: "icon" | "profile" | "tab" | "none",
		): string | undefined => {
			if (mode === "icon") return "TTML Editor";
			if (mode === "profile")
				return snapshot.userDisplayName || "TTML Editor";
			if (mode === "tab") return getTabImageText(snapshot.mode);
			return undefined;
		};

		const idleLargeMode = options.idleLargeImageMode || "icon";
		const idleSmallMode = options.idleSmallImageMode || "profile";

		const largeImage = getIdleImageUrl(idleLargeMode);
		let largeImageText = getIdleImageText(idleLargeMode);
		if (options.idleBottomTextTemplate && options.privacyPreset !== "none") {
			try {
				const rendered = renderDiscordTemplate(
					options.idleBottomTextTemplate,
					context,
				);
				if (rendered) {
					largeImageText = truncateDiscordText(rendered);
				}
			} catch {
				// use default fallback
			}
		}
		const smallImage = getIdleImageUrl(idleSmallMode);
		const smallImageText = getIdleImageText(idleSmallMode);

		const payload: DiscordActivityPayload = {
			details: "TTML Editor",
			state: "No file open",
			playing: false,
			...(options.activityType ? { activityType: options.activityType } : {}),
			showRepositoryButton: options.showRepositoryButton,
			...(largeImage ? { largeImage, largeImageText } : {}),
			...(smallImage ? { smallImage, smallImageText } : {}),
		};

		if (
			options.showProgressTimer &&
			options.privacyPreset !== "none" &&
			(snapshot.projectElapsedSeconds ?? 0) > 0
		) {
			payload.startTimestamp = Math.floor(
				nowSeconds - (snapshot.projectElapsedSeconds ?? 0),
			);
		}

		return payload;
	}

	let details: string | undefined = undefined;
	let state: string | undefined = undefined;
	let showRepositoryButton = options.showRepositoryButton;
	let showPlaybackTimeline =
		options.showPlaybackTimeline && options.showProgressTimer;

	if (options.privacyPreset === "rich") {
		details = truncateDiscordText(
			renderDiscordTemplate(options.detailsTemplate, context),
		);
		state = truncateDiscordText(
			renderDiscordTemplate(options.stateTemplate, context),
		);
	} else if (options.privacyPreset === "minimal") {
		details = "TTML Editor";
		state = options.generalActivityText || "Working on lyrics";
		showRepositoryButton = false;
	} else if (options.privacyPreset === "none") {
		details = undefined;
		state = undefined;
		showRepositoryButton = false;
		showPlaybackTimeline = false;
	}

	const getImageUrl = (
		mode: "icon" | "artwork" | "state" | "tab" | "profile" | "none",
	): string | undefined => {
		if (mode === "icon") return DISCORD_LOGO_URL;
		if (mode === "artwork") return snapshot.coverUrl || DISCORD_LOGO_URL;
		if (mode === "state")
			return snapshot.playing ? DISCORD_PLAY_URL : DISCORD_PAUSE_URL;
		if (mode === "tab") return getTabImageUrl(snapshot.mode);
		if (mode === "profile")
			return snapshot.userProfilePhoto || DISCORD_LOGO_URL;
		return undefined;
	};

	const getImageText = (
		mode: "icon" | "artwork" | "state" | "tab" | "profile" | "none",
	): string | undefined => {
		if (mode === "icon") return "TTML Editor";
		if (mode === "artwork")
			return snapshot.title
				? `${snapshot.title} - ${snapshot.artist}`
				: "TTML Editor";
		if (mode === "state") return snapshot.playing ? "Playing" : "Paused";
		if (mode === "tab") return getTabImageText(snapshot.mode);
		if (mode === "profile") return snapshot.userDisplayName || "Profile";
		return undefined;
	};

	let largeImage: string | undefined = undefined;
	let largeImageText: string | undefined = undefined;
	let smallImage: string | undefined = undefined;
	let smallImageText: string | undefined = undefined;

	if (options.privacyPreset !== "none") {
		largeImage = getImageUrl(options.largeImageMode);
		const customBottom = options.bottomLineTemplate
			? truncateDiscordText(
					renderDiscordTemplate(options.bottomLineTemplate, context),
				)
			: undefined;
		largeImageText = customBottom || getImageText(options.largeImageMode);
		smallImage = getImageUrl(options.smallImageMode);
		smallImageText = getImageText(options.smallImageMode);
	}

	const payload: DiscordActivityPayload = {
		...(details ? { details } : {}),
		...(state ? { state } : {}),
		playing: snapshot.playing,
		...(options.activityType ? { activityType: options.activityType } : {}),
		showRepositoryButton,
		largeImage,
		largeImageText,
		smallImage,
		smallImageText,
	};

	if (
		showPlaybackTimeline &&
		snapshot.playing &&
		snapshot.durationSeconds > snapshot.positionSeconds
	) {
		const elapsed = snapshot.positionSeconds / snapshot.playbackRate;
		const remaining =
			(snapshot.durationSeconds - snapshot.positionSeconds) /
			snapshot.playbackRate;
		payload.startTimestamp = Math.floor(nowSeconds - elapsed);
		payload.endTimestamp = Math.ceil(nowSeconds + remaining);
	} else if (
		options.showProjectElapsed &&
		options.privacyPreset === "rich" &&
		(snapshot.projectElapsedSeconds ?? 0) > 0
	) {
		payload.startTimestamp = Math.floor(
			nowSeconds - (snapshot.projectElapsedSeconds ?? 0),
		);
	}

	return payload;
}

export function createInactiveDiscordActivity(
	generalActivityText = "Working on lyrics",
	activityType?: string,
	options?: {
		idleLargeImageMode?: "icon" | "profile" | "tab" | "none";
		idleSmallImageMode?: "icon" | "profile" | "tab" | "none";
		userProfilePhoto?: string | null;
		userDisplayName?: string | null;
		mode?: ToolMode;
	},
): DiscordActivityPayload {
	const idleLargeMode = options?.idleLargeImageMode;
	const idleSmallMode = options?.idleSmallImageMode;

	const getIdleImageUrl = (
		mode: "icon" | "profile" | "tab" | "none",
	): string | undefined => {
		if (mode === "icon") return DISCORD_LOGO_URL;
		if (mode === "profile")
			return options?.userProfilePhoto || DISCORD_LOGO_URL;
		if (mode === "tab") return getTabImageUrl(options?.mode || ToolMode.Edit);
		return undefined;
	};

	const getIdleImageText = (
		mode: "icon" | "profile" | "tab" | "none",
	): string | undefined => {
		if (mode === "icon") return "TTML Editor";
		if (mode === "profile") return options?.userDisplayName || "TTML Editor";
		if (mode === "tab") return getTabImageText(options?.mode || ToolMode.Edit);
		return undefined;
	};

	const largeImage = idleLargeMode ? getIdleImageUrl(idleLargeMode) : undefined;
	const largeImageText = idleLargeMode
		? getIdleImageText(idleLargeMode)
		: undefined;
	const smallImage = idleSmallMode ? getIdleImageUrl(idleSmallMode) : undefined;
	const smallImageText = idleSmallMode
		? getIdleImageText(idleSmallMode)
		: undefined;

	return {
		details: "TTML Editor",
		state: generalActivityText,
		playing: false,
		...(activityType ? { activityType } : {}),
		showRepositoryButton: false,
		...(largeImage ? { largeImage, largeImageText } : {}),
		...(smallImage ? { smallImage, smallImageText } : {}),
	};
}

export function formatDiscordActivity(
	snapshot: PresenceSnapshot,
	nowSeconds = Math.floor(Date.now() / 1000),
): DiscordActivityPayload {
	if (snapshot.hasFile === false) {
		return {
			details: "TTML Editor",
			state: "No file open",
			playing: false,
			showRepositoryButton: true,
			showStatusBadge: true,
			largeImage: undefined,
		};
	}

	const subject = snapshot.title || "Untitled lyrics";
	const progress = snapshot.currentLine
		? `Line ${snapshot.currentLine} of ${snapshot.totalLines}`
		: snapshot.totalLines > 0
			? `${snapshot.totalLines} lines`
			: "No lyrics yet";
	const playbackStatus = snapshot.playing
		? "Playing"
		: snapshot.durationSeconds > 0
			? "Paused"
			: "No audio loaded";
	const stateBase = snapshot.artist
		? `${snapshot.artist} • ${progress}`
		: progress;
	const state = `${stateBase} • ${playbackStatus}`;
	const payload: DiscordActivityPayload = {
		details: truncateDiscordText(`${modeLabels[snapshot.mode]} ${subject}`),
		state: truncateDiscordText(state),
		playing: snapshot.playing,
		showRepositoryButton: true,
		showStatusBadge: true,
		largeImage: snapshot.coverUrl || undefined,
	};

	if (snapshot.playing && snapshot.durationSeconds > snapshot.positionSeconds) {
		const elapsed = snapshot.positionSeconds / snapshot.playbackRate;
		const remaining =
			(snapshot.durationSeconds - snapshot.positionSeconds) /
			snapshot.playbackRate;
		payload.startTimestamp = Math.floor(nowSeconds - elapsed);
		payload.endTimestamp = Math.ceil(nowSeconds + remaining);
	} else if ((snapshot.projectElapsedSeconds ?? 0) > 0) {
		payload.startTimestamp = Math.floor(
			nowSeconds - (snapshot.projectElapsedSeconds ?? 0),
		);
	}

	return payload;
}
