import { Channel, invoke, isTauri } from "@tauri-apps/api/core";
import type { DownloadEvent, DownloadFormat, SearchResult } from "./model";

export interface DownloadTrackWithYtDlpOptions {
	trackTitle: string;
	trackArtist: string;
	format?: DownloadFormat;
	onProgress?: (percent: number | null) => void;
	onProcessing?: () => void;
}

export interface DownloadTrackWithYtDlpResult {
	audioFile: File;
	filePath: string;
	title: string;
	artist: string;
}

export async function loadAudioFromPath(
	filePath: string,
	fallbackFormat = "mp3",
): Promise<File> {
	const { readFile } = await import("@tauri-apps/plugin-fs");
	const data = await readFile(filePath);

	const baseFileName =
		filePath.split(/[/\\]/).pop() || `audio.${fallbackFormat}`;

	const ext = baseFileName.split(".").pop()?.toLowerCase() || fallbackFormat;
	const mime =
		ext === "flac"
			? "audio/flac"
			: ext === "m4a"
				? "audio/mp4"
				: ext === "wav"
					? "audio/wav"
					: ext === "opus"
						? "audio/opus"
						: "audio/mpeg";

	const audioFile = new File([data], baseFileName, { type: mime });
	Object.assign(audioFile, { isAutoDownloaded: true });
	return audioFile;
}

export async function downloadTrackWithYtDlp(
	options: DownloadTrackWithYtDlpOptions,
): Promise<DownloadTrackWithYtDlpResult | null> {
	if (!isTauri()) {
		throw new Error("desktopOnly");
	}

	const available = await invoke<boolean>("downloader_available").catch(
		() => false,
	);
	if (!available) {
		throw new Error("unavailable");
	}

	const artist = options.trackArtist.trim();
	const title = options.trackTitle.trim();
	const query = [artist, title].filter(Boolean).join(" - ").trim() || title;

	const results = await invoke<SearchResult[]>("search_media", {
		query,
	}).catch((err) => {
		console.warn("yt-dlp search_media failed:", err);
		return [] as SearchResult[];
	});

	if (!results || results.length === 0) {
		return null;
	}

	const topHit = results[0];
	const format = options.format || "mp3";
	const id = crypto.randomUUID();

	let destinationDir: string | null = null;
	try {
		const { tempDir } = await import("@tauri-apps/api/path");
		destinationDir = await tempDir();
	} catch (e) {
		console.warn("Could not determine tempDir:", e);
	}

	const events = new Channel<DownloadEvent>();
	events.onmessage = (event) => {
		if (event.kind === "downloading") {
			options.onProgress?.(event.percent);
		} else if (event.kind === "processing") {
			options.onProcessing?.();
		}
	};

	const downloadedPath = await invoke<string | null>("download_media", {
		request: {
			url: topHit.url,
			format,
			maxHeight: null,
			destinationDir,
		},
		jobId: id,
		events,
	});

	if (!downloadedPath) {
		return null;
	}

	const audioFile = await loadAudioFromPath(downloadedPath, format);

	return {
		audioFile,
		filePath: downloadedPath,
		title,
		artist,
	};
}
