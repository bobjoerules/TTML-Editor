import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadTrackWithYtDlp, loadAudioFromPath } from "./download-helper";

vi.mock("@tauri-apps/api/core", () => ({
	isTauri: vi.fn(),
	invoke: vi.fn(),
	Channel: class {
		onmessage?: (data: unknown) => void;
	},
}));

vi.mock("@tauri-apps/api/path", () => ({
	tempDir: vi.fn().mockResolvedValue("/tmp/test"),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
	readFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}));

describe("downloadTrackWithYtDlp", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("throws desktopOnly when not running in Tauri", async () => {
		const { isTauri } = await import("@tauri-apps/api/core");
		vi.mocked(isTauri).mockReturnValue(false);

		await expect(
			downloadTrackWithYtDlp({
				trackTitle: "Song",
				trackArtist: "Artist",
			}),
		).rejects.toThrow("desktopOnly");
	});

	it("throws unavailable when downloader tools are missing", async () => {
		const { isTauri, invoke } = await import("@tauri-apps/api/core");
		vi.mocked(isTauri).mockReturnValue(true);
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === "downloader_available") return false;
			return null;
		});

		await expect(
			downloadTrackWithYtDlp({
				trackTitle: "Song",
				trackArtist: "Artist",
			}),
		).rejects.toThrow("unavailable");
	});

	it("returns null when search yields no results", async () => {
		const { isTauri, invoke } = await import("@tauri-apps/api/core");
		vi.mocked(isTauri).mockReturnValue(true);
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === "downloader_available") return true;
			if (cmd === "search_media") return [];
			return null;
		});

		const result = await downloadTrackWithYtDlp({
			trackTitle: "Song",
			trackArtist: "Artist",
		});

		expect(result).toBeNull();
	});

	it("downloads and constructs audio File when match is found", async () => {
		const { isTauri, invoke } = await import("@tauri-apps/api/core");
		vi.mocked(isTauri).mockReturnValue(true);

		let progressRecorded: number | null = null;
		let processingCalled = false;

		vi.mocked(invoke).mockImplementation(
			async (
				cmd: string,
				args?: Record<string, unknown> & {
					query?: string;
					request?: { destinationDir?: string; format?: string };
					events?: { onmessage?: (data: unknown) => void };
				},
			) => {
				if (cmd === "downloader_available") return true;
				if (cmd === "search_media") {
					expect(args?.query).toBe("Artist - Song");
					return [
						{
							url: "https://www.youtube.com/watch?v=123",
							title: "Artist - Song (Official Audio)",
							channel: "ArtistVEVO",
							duration: 200,
						},
					];
				}
				if (cmd === "download_media") {
					expect(args?.request?.destinationDir).toBe("/tmp/test");
					expect(args?.request?.format).toBe("mp3");
					// Trigger events channel
					args?.events?.onmessage?.({ kind: "downloading", percent: 55.5 });
					args?.events?.onmessage?.({ kind: "processing" });
					return "/tmp/test/download-1/Artist - Song.mp3";
				}
				return null;
			},
		);

		const result = await downloadTrackWithYtDlp({
			trackTitle: "Song",
			trackArtist: "Artist",
			format: "mp3",
			onProgress: (p) => {
				progressRecorded = p;
			},
			onProcessing: () => {
				processingCalled = true;
			},
		});

		expect(result).not.toBeNull();
		expect(result?.title).toBe("Song");
		expect(result?.artist).toBe("Artist");
		expect(result?.filePath).toBe("/tmp/test/download-1/Artist - Song.mp3");
		expect(result?.audioFile.name).toBe("Artist - Song.mp3");
		expect(result?.audioFile.type).toBe("audio/mpeg");
		expect(
			(result?.audioFile as unknown as { isAutoDownloaded?: boolean })
				.isAutoDownloaded,
		).toBe(true);
		expect(progressRecorded).toBe(55.5);
		expect(processingCalled).toBe(true);
	});
});

describe("loadAudioFromPath", () => {
	it("reads file and resolves mime types properly", async () => {
		const flacFile = await loadAudioFromPath("/path/to/song.flac");
		expect(flacFile.name).toBe("song.flac");
		expect(flacFile.type).toBe("audio/flac");
		expect(
			(flacFile as unknown as { isAutoDownloaded?: boolean }).isAutoDownloaded,
		).toBe(true);

		const m4aFile = await loadAudioFromPath("C:\\Music\\track.m4a");
		expect(m4aFile.name).toBe("track.m4a");
		expect(m4aFile.type).toBe("audio/mp4");

		const opusFile = await loadAudioFromPath("/music/tune.opus");
		expect(opusFile.type).toBe("audio/opus");

		const wavFile = await loadAudioFromPath("/music/sound.wav");
		expect(wavFile.type).toBe("audio/wav");

		const mp3File = await loadAudioFromPath("/music/audio.mp3");
		expect(mp3File.type).toBe("audio/mpeg");
	});
});
