export const AUDIO_FORMATS = ["mp3", "m4a", "flac", "wav", "opus"] as const;
export const VIDEO_FORMATS = ["mp4", "mkv"] as const;
export type DownloadFormat =
	| (typeof AUDIO_FORMATS)[number]
	| (typeof VIDEO_FORMATS)[number];

export type DownloadEvent =
	| { kind: "preparing" }
	| { kind: "downloading"; percent: number | null }
	| { kind: "processing" };

export type SearchResult = {
	url: string;
	title: string;
	channel: string | null;
	duration: number | null;
};

type MetadataEntry = { key?: string; value?: readonly string[] };

/** "Artist Song" from the lyric metadata, for the search field. */
export function metadataQuery(metadata: readonly MetadataEntry[]): string {
	const first = (keys: readonly string[]) =>
		metadata
			.find((entry) => keys.includes((entry?.key ?? "").toLowerCase()))
			?.value?.[0]?.trim() ?? "";
	return [
		first(["artists", "artist", "author"]),
		first(["musicname", "title", "trackname"]),
	]
		.filter(Boolean)
		.join(" ");
}

/**
 * The search text to show when the downloader opens: the open song's
 * "Artist Song", unless the user has typed their own query since the last
 * automatic fill.
 */
export function nextSearchQuery(
	current: string,
	lastAuto: string,
	songQuery: string,
): string {
	const untouched = current === "" || current === lastAuto;
	return untouched && songQuery ? songQuery : current;
}

export function formatDuration(seconds: number | null): string {
	if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "";
	const total = Math.round(seconds);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = String(total % 60).padStart(2, "0");
	return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export function validDownloadUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return (
			value.length <= 8192 &&
			(url.protocol === "https:" || url.protocol === "http:") &&
			!!url.hostname &&
			!url.username &&
			!url.password
		);
	} catch {
		return false;
	}
}

export function downloadError(value: unknown): {
	code: string;
	detail: string;
} {
	if (value && typeof value === "object" && "code" in value) {
		return {
			code: String(value.code),
			detail: "detail" in value ? String(value.detail) : "",
		};
	}
	return { code: "failed", detail: String(value) };
}
