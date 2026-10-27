import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
	if (typeof globalThis.Worker === "undefined") {
		class MockWorker {
			onmessage = null;
			postMessage() {}
			terminate() {}
			addEventListener() {}
			removeEventListener() {}
		}
		globalThis.Worker = MockWorker as any;
	}
});

import { formatProjectFileName } from "$/modules/project/logic/metadata-filename";
import * as autosave from "./autosave";
import { tryReloadAudioFromComputer } from "$/modules/audio/utils/autoReloadAudio";
import { audioEngine } from "$/modules/audio/audio-engine";

describe("Autosave filename and audio reload tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("correctly sanitizes and formats project file names", () => {
		expect(formatProjectFileName("Artist - Song")).toBe("Artist - Song.ttml");
		expect(formatProjectFileName("Song: Subtitle / Part 1?")).toBe(
			"Song- Subtitle - Part 1-.ttml",
		);
		expect(formatProjectFileName("Already.ttml")).toBe("Already.ttml");
		expect(formatProjectFileName("")).toBe("unnamed.ttml");
	});

	it("automatically reloads audio from IndexedDB cache via tryReloadAudioFromComputer", async () => {
		const blob = new Blob(["test-audio-content"], { type: "audio/mpeg" });
		const mockCacheEntry = {
			id: "reload-test-proj",
			projectId: "reload-test-proj",
			fileName: "song.mp3",
			blob,
			timestamp: Date.now(),
		};

		vi.spyOn(autosave, "getAudioFromCache").mockResolvedValue(mockCacheEntry);

		const loadSpy = vi
			.spyOn(audioEngine, "loadMusic")
			.mockImplementation(async () => {
				return {} as any;
			});

		const result = await tryReloadAudioFromComputer({
			projectId: "reload-test-proj",
			audioFileName: "song.mp3",
			silent: true,
		});

		expect(result).toBe(true);
		expect(loadSpy).toHaveBeenCalled();
		const loadedFile = loadSpy.mock.calls[0][0] as File;
		expect(loadedFile.name).toBe("song.mp3");
	});

	it("returns false if audio is not found in cache or disk", async () => {
		vi.spyOn(autosave, "getAudioFromCache").mockResolvedValue(null);

		const result = await tryReloadAudioFromComputer({
			projectId: "non-existent-proj",
			audioFileName: "non-existent.mp3",
			silent: true,
		});

		expect(result).toBe(false);
	});

	it("has autoLoadCloudAudioAtom defaulting to true", async () => {
		const { getDefaultStore } = await import("jotai");
		const { autoLoadCloudAudioAtom } = await import(
			"$/modules/settings/states"
		);
		const store = getDefaultStore();
		expect(store.get(autoLoadCloudAudioAtom)).toBe(true);
	});
});

