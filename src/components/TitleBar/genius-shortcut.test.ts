import { describe, expect, it, vi } from "vitest";
import {
	getIsSongLoaded,
	isGeniusSongPageUrl,
	resolveGeniusDirectTargetUrl,
	resolveGeniusTargetUrl,
} from "./genius-shortcut";
import type { TTMLMetadata } from "$/types/ttml";

describe("genius-shortcut helper", () => {
	describe("isGeniusSongPageUrl", () => {
		it("accepts valid Genius song and album page URLs", () => {
			expect(
				isGeniusSongPageUrl("https://genius.com/Coldplay-yellow-lyrics"),
			).toBe(true);
			expect(
				isGeniusSongPageUrl("http://genius.com/Coldplay-yellow-lyrics"),
			).toBe(true);
			expect(
				isGeniusSongPageUrl("https://genius.com/songs/5049949"),
			).toBe(true);
			expect(
				isGeniusSongPageUrl("genius://songs/5049949"),
			).toBe(true);
			expect(
				isGeniusSongPageUrl("genius.com/Coldplay-yellow-lyrics"),
			).toBe(true);
		});

		it("rejects artwork images and assets", () => {
			expect(
				isGeniusSongPageUrl(
					"https://images.genius.com/f0402b8d0358897d2e46b9df09968412.1000x1000x1.jpg",
				),
			).toBe(false);
			expect(
				isGeniusSongPageUrl("https://assets.genius.com/images/default_cover.png"),
			).toBe(false);
			expect(
				isGeniusSongPageUrl("https://genius.com/artwork.jpg?size=medium"),
			).toBe(false);
		});

		it("rejects developer portal, static, and tags URLs", () => {
			expect(isGeniusSongPageUrl("https://genius.com/api-clients")).toBe(false);
			expect(isGeniusSongPageUrl("https://genius.com/tags/pop")).toBe(false);
			expect(isGeniusSongPageUrl("https://genius.com/about")).toBe(false);
		});
	});

	describe("getIsSongLoaded", () => {
		it("returns false for empty project", () => {
			expect(
				getIsSongLoaded({
					metadata: [],
					lyricLinesCount: 0,
					loadedAudioFileName: null,
					saveFileName: "unnamed.ttml",
				}),
			).toBe(false);
			expect(
				getIsSongLoaded({
					metadata: [],
					lyricLinesCount: 0,
					loadedAudioFileName: null,
					saveFileName: "lyric.ttml",
				}),
			).toBe(false);
		});

		it("returns true when lyric lines exist", () => {
			expect(
				getIsSongLoaded({
					metadata: [],
					lyricLinesCount: 5,
					loadedAudioFileName: null,
					saveFileName: "lyric.ttml",
				}),
			).toBe(true);
		});

		it("returns true when audio file is loaded", () => {
			expect(
				getIsSongLoaded({
					metadata: [],
					lyricLinesCount: 0,
					loadedAudioFileName: "song.mp3",
					saveFileName: null,
				}),
			).toBe(true);
		});

		it("returns true when metadata has musicName or artists", () => {
			const metadata: TTMLMetadata[] = [
				{ key: "musicName", value: ["Blinding Lights"] },
				{ key: "artists", value: ["The Weeknd"] },
			];
			expect(
				getIsSongLoaded({
					metadata,
					lyricLinesCount: 0,
					loadedAudioFileName: null,
					saveFileName: null,
				}),
			).toBe(true);
		});

		it("returns true when saveFileName is custom", () => {
			expect(
				getIsSongLoaded({
					metadata: [],
					lyricLinesCount: 0,
					loadedAudioFileName: null,
					saveFileName: "Coldplay - Yellow.ttml",
				}),
			).toBe(true);
		});
	});

	describe("resolveGeniusTargetUrl", () => {
		it("does not open cover artwork image as the Genius page", () => {
			const metadata: TTMLMetadata[] = [
				{ key: "musicName", value: ["Yellow"] },
				{ key: "artists", value: ["Coldplay"] },
				{
					key: "cover_art",
					value: [
						"https://images.genius.com/f0402b8d0358897d2e46b9df09968412.1000x1000x1.jpg",
					],
				},
			];
			expect(resolveGeniusTargetUrl({ metadata })).toBe(
				"https://genius.com/search?q=Coldplay%20Yellow",
			);
		});

		it("ignores generic image URLs in metadata and builds search query", () => {
			const metadata: TTMLMetadata[] = [
				{ key: "musicName", value: ["After Hours"] },
				{ key: "artists", value: ["The Weeknd"] },
				{
					key: "url",
					value: [
						"https://images.genius.com/cover.webp",
					],
				},
			];
			expect(resolveGeniusTargetUrl({ metadata })).toBe(
				"https://genius.com/search?q=The%20Weeknd%20After%20Hours",
			);
		});

		it("resolves direct genius.com metadata link", () => {
			const metadata: TTMLMetadata[] = [
				{
					key: "genius",
					value: ["https://genius.com/Coldplay-yellow-lyrics"],
				},
			];
			expect(resolveGeniusTargetUrl({ metadata })).toBe(
				"https://genius.com/Coldplay-yellow-lyrics",
			);
		});

		it("normalizes direct genius.com metadata link without protocol", () => {
			const metadata: TTMLMetadata[] = [
				{
					key: "genius",
					value: ["genius.com/Coldplay-yellow-lyrics"],
				},
			];
			expect(resolveGeniusTargetUrl({ metadata })).toBe(
				"https://genius.com/Coldplay-yellow-lyrics",
			);
		});

		it("uses musicName and artists from metadata to build search query", () => {
			const metadata: TTMLMetadata[] = [
				{ key: "musicName", value: ["Yellow"] },
				{ key: "artists", value: ["Coldplay"] },
			];
			expect(resolveGeniusTargetUrl({ metadata })).toBe(
				"https://genius.com/search?q=Coldplay%20Yellow",
			);
		});

		it("falls back to title and artist keys", () => {
			const metadata: TTMLMetadata[] = [
				{ key: "title", value: ["After Hours"] },
				{ key: "artist", value: ["The Weeknd"] },
			];
			expect(resolveGeniusTargetUrl({ metadata })).toBe(
				"https://genius.com/search?q=The%20Weeknd%20After%20Hours",
			);
		});

		it("extracts artist and title from saveFileName if metadata is empty", () => {
			expect(
				resolveGeniusTargetUrl({
					metadata: [],
					saveFileName: "The Weeknd - Blinding Lights.ttml",
				}),
			).toBe("https://genius.com/search?q=The%20Weeknd%20Blinding%20Lights");
		});

		it("extracts artist and title from loadedAudioFileName if saveFileName is default", () => {
			expect(
				resolveGeniusTargetUrl({
					metadata: [],
					saveFileName: "lyric.ttml",
					loadedAudioFileName: "Taylor Swift - Blank Space.mp3",
				}),
			).toBe("https://genius.com/search?q=Taylor%20Swift%20Blank%20Space");
		});

		it("falls back to genius.com homepage if no details available", () => {
			expect(
				resolveGeniusTargetUrl({
					metadata: [],
					saveFileName: "lyric.ttml",
					loadedAudioFileName: null,
				}),
			).toBe("https://genius.com");
		});
	});

	describe("resolveGeniusDirectTargetUrl", () => {
		it("returns direct URL if present in metadata immediately", async () => {
			const metadata: TTMLMetadata[] = [
				{
					key: "genius",
					value: ["https://genius.com/Coldplay-yellow-lyrics"],
				},
			];
			const url = await resolveGeniusDirectTargetUrl({ metadata });
			expect(url).toBe("https://genius.com/Coldplay-yellow-lyrics");
		});

		it("falls back to search query URL if no direct page found", async () => {
			// Mock global fetch to return 404
			const originalFetch = globalThis.fetch;
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
			}) as any;

			try {
				const metadata: TTMLMetadata[] = [
					{ key: "musicName", value: ["Yellow"] },
					{ key: "artists", value: ["Coldplay"] },
				];
				const url = await resolveGeniusDirectTargetUrl({ metadata });
				expect(url).toBe("https://genius.com/search?q=Coldplay%20Yellow");
			} finally {
				globalThis.fetch = originalFetch;
			}
		});

		it("extracts and returns direct song page URL from song search hits", async () => {
			const originalFetch = globalThis.fetch;
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					response: {
						sections: [
							{
								hits: [
									{
										result: {
											url: "https://genius.com/Coldplay-yellow-lyrics",
										},
									},
								],
							},
						],
					},
				}),
			}) as any;

			try {
				const metadata: TTMLMetadata[] = [
					{ key: "musicName", value: ["Yellow"] },
					{ key: "artists", value: ["Coldplay"] },
				];
				const url = await resolveGeniusDirectTargetUrl({ metadata });
				expect(url).toBe("https://genius.com/Coldplay-yellow-lyrics");
			} finally {
				globalThis.fetch = originalFetch;
			}
		});
	});
});
