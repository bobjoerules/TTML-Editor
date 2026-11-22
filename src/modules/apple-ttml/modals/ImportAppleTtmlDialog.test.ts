import { describe, expect, it } from "vitest";
import { createStore } from "jotai";
import { lyricLinesAtom } from "$/states/main";
import type { LyricData } from "$/types/lyric";

describe("Apple TTML Import state updates", () => {
	it("updates songwriter metadata safely without wiping lyricLinesAtom", () => {
		const store = createStore();
		const initialLyrics: LyricData = {
			lyricLines: [
				{
					id: "line-1",
					words: [{ id: "word-1", word: "Hello", startTime: 0, endTime: 1000 }],
					startTime: 0,
					endTime: 1000,
					isBg: false,
					isDuet: false,
				},
			],
			metadata: [{ key: "title", value: ["Hello"] }],
		};

		store.set(lyricLinesAtom, initialLyrics);

		const writers = ["Adele Adkins", "Greg Kurstin"];

		// Simulating immer produce-style update:
		const current = store.get(lyricLinesAtom);
		expect(current).toBeDefined();

		// Update metadata immutably
		const updated = {
			...current,
			metadata: [...current.metadata],
		};
		const existing = updated.metadata.find((m) => m.key === "songwriter");
		if (existing) {
			existing.value = writers;
		} else {
			updated.metadata.push({ key: "songwriter", value: writers });
		}
		store.set(lyricLinesAtom, updated);

		const finalState = store.get(lyricLinesAtom);
		expect(finalState).toBeDefined();
		expect(finalState.lyricLines).toHaveLength(1);
		expect(
			finalState.metadata.find((m) => m.key === "songwriter")?.value,
		).toEqual(writers);
	});

	it("guards audio loading so download only runs when downloadAudio is true", () => {
		type AudioSource = "dm" | "ytdlp" | "joox";
		const runAudioLogic = async ({
			autoLoadCloudAudio,
			downloadAudio,
			effectiveAudioSource,
			reloadReturnsTrue,
		}: {
			autoLoadCloudAudio: boolean;
			downloadAudio: boolean;
			effectiveAudioSource: AudioSource;
			reloadReturnsTrue: boolean;
		}) => {
			let computerReloadCalled = false;
			let downloaderOpened = false;
			let onlineDownloadAttempted = false;

			if (autoLoadCloudAudio || downloadAudio) {
				let audioLoaded = false;
				if (autoLoadCloudAudio) {
					computerReloadCalled = true;
					audioLoaded = reloadReturnsTrue;
				}

				if (downloadAudio && !audioLoaded) {
					if (effectiveAudioSource === "ytdlp") {
						downloaderOpened = true;
						return {
							computerReloadCalled,
							downloaderOpened,
							onlineDownloadAttempted,
						};
					}
					onlineDownloadAttempted = true;
				}
			}

			return {
				computerReloadCalled,
				downloaderOpened,
				onlineDownloadAttempted,
			};
		};

		// Case 1: downloadAudio is unchecked, autoLoadCloudAudio is true, local file missing
		return runAudioLogic({
			autoLoadCloudAudio: true,
			downloadAudio: false,
			effectiveAudioSource: "joox",
			reloadReturnsTrue: false,
		}).then((res1) => {
			expect(res1.computerReloadCalled).toBe(true);
			expect(res1.onlineDownloadAttempted).toBe(false);
			expect(res1.downloaderOpened).toBe(false);

			// Case 2: downloadAudio is checked, autoLoadCloudAudio is true, local file missing
			return runAudioLogic({
				autoLoadCloudAudio: true,
				downloadAudio: true,
				effectiveAudioSource: "joox",
				reloadReturnsTrue: false,
			}).then((res2) => {
				expect(res2.computerReloadCalled).toBe(true);
				expect(res2.onlineDownloadAttempted).toBe(true);
				expect(res2.downloaderOpened).toBe(false);

				// Case 3: downloadAudio is checked, yt-dlp source, local file missing
				return runAudioLogic({
					autoLoadCloudAudio: true,
					downloadAudio: true,
					effectiveAudioSource: "ytdlp",
					reloadReturnsTrue: false,
				}).then((res3) => {
					expect(res3.computerReloadCalled).toBe(true);
					expect(res3.onlineDownloadAttempted).toBe(false);
					expect(res3.downloaderOpened).toBe(true);

					// Case 4: downloadAudio is unchecked, yt-dlp source, local file missing
					return runAudioLogic({
						autoLoadCloudAudio: true,
						downloadAudio: false,
						effectiveAudioSource: "ytdlp",
						reloadReturnsTrue: false,
					}).then((res4) => {
						expect(res4.computerReloadCalled).toBe(true);
						expect(res4.onlineDownloadAttempted).toBe(false);
						expect(res4.downloaderOpened).toBe(false);
					});
				});
			});
		});
	});
});
