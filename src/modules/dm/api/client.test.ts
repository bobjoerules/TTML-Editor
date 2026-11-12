import { beforeEach, describe, expect, it, vi } from "vitest";
import { DmApi, formatDurationSeconds } from "./client";

describe("DmApi", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe("formatDurationSeconds", () => {
		it("formats seconds into mm:ss format", () => {
			expect(formatDurationSeconds(228)).toBe("03:48");
			expect(formatDurationSeconds(65)).toBe("01:05");
			expect(formatDurationSeconds("180")).toBe("03:00");
			expect(formatDurationSeconds(0)).toBe("");
			expect(formatDurationSeconds(-10)).toBe("");
		});
	});

	describe("getDownloadUrl", () => {
		it("builds the correct download URL given a track ID", () => {
			expect(DmApi.getDownloadUrl("1037179262")).toBe(
				"https://dm.rmmreviv.al/download?id=1037179262",
			);
			expect(DmApi.getDownloadUrl(12345)).toBe(
				"https://dm.rmmreviv.al/download?id=12345",
			);
		});

		it("preserves full URLs if already provided", () => {
			const fullUrl = "https://dm.rmmreviv.al/download?id=999&format=MP3_128";
			expect(DmApi.getDownloadUrl(fullUrl)).toBe(fullUrl);
		});
	});

	describe("search", () => {
		it("returns empty array for empty or whitespace query", async () => {
			expect(await DmApi.search("")).toEqual([]);
			expect(await DmApi.search("   ")).toEqual([]);
		});

		it("parses and maps search results correctly", async () => {
			const mockResponse = {
				query: "Taylor Swift Cardigan",
				type: "track",
				total: 1,
				data: [
					{
						id: 1037179262,
						title: "cardigan",
						artist: "Taylor Swift",
						artistId: 12246,
						album: "folklore",
						albumId: 162683632,
						duration: 239,
						rank: 853506,
						explicit: false,
						cover: "https://cdn-images.dzcdn.net/images/cover/sample.jpg",
						downloadUrl:
							"https://dm.rmmreviv.al/download?id=1037179262&format=MP3_128",
					},
				],
				source: "deezer",
			};

			vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			const results = await DmApi.search("Taylor Swift Cardigan");
			expect(results).toHaveLength(1);
			expect(results[0]).toEqual({
				id: "1037179262",
				index: 0,
				name: "cardigan",
				artist: "Taylor Swift",
				album: "folklore",
				duration: "03:59",
				cover: "https://cdn-images.dzcdn.net/images/cover/sample.jpg",
				source: "Deezer",
				downloadUrl:
					"https://dm.rmmreviv.al/download?id=1037179262&format=MP3_128",
				rank: 853506,
			});
		});

		it("handles errors or non-array data gracefully", async () => {
			vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
				ok: true,
				json: async () => ({ error: "Cannot read properties" }),
			} as Response);

			const results = await DmApi.search("Nonexistent");
			expect(results).toEqual([]);
		});
	});

	describe("downloadAudioBlob", () => {
		it("fetches audio blob directly from download endpoint", async () => {
			const fakeBlob = new Blob(["fake-audio"], { type: "audio/mpeg" });
			vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
				ok: true,
				blob: async () => fakeBlob,
			} as Response);

			const blob = await DmApi.downloadAudioBlob("1037179262");
			expect(blob).toBeDefined();
			expect(blob.type).toBe("audio/mpeg");
		});
	});

	describe("searchAndGetAudio", () => {
		it("returns null when title and artist are empty", async () => {
			expect(await DmApi.searchAndGetAudio("", "")).toBeNull();
			expect(await DmApi.searchAndGetAudio("  ", "  ")).toBeNull();
		});

		it("searches, scores, and downloads the best matching track", async () => {
			const mockTracks = [
				{
					id: "101",
					index: 0,
					name: "Cardigan (Cover)",
					artist: "Random Singer",
					album: "Tributes",
					source: "Deezer",
					rank: 1000,
				},
				{
					id: "102",
					index: 1,
					name: "cardigan",
					artist: "Taylor Swift",
					album: "folklore",
					source: "Deezer",
					rank: 850000,
				},
			];

			vi.spyOn(DmApi, "search").mockResolvedValue(mockTracks);
			const fakeBlob = new Blob(["audio-data"], { type: "audio/mpeg" });
			vi.spyOn(DmApi, "downloadAudioBlob").mockResolvedValue(fakeBlob);

			const result = await DmApi.searchAndGetAudio("cardigan", "Taylor Swift");
			expect(result).not.toBeNull();
			expect(result?.fileName).toBe("Taylor Swift - cardigan.mp3");
			expect(result?.qualityName).toBe("MP3 128k");
			expect(result?.audioBlob).toBe(fakeBlob);
		});
	});
});

