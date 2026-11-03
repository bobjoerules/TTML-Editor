import { describe, expect, it } from "vitest";
import {
	extractSpotifyTrackId,
	formatDuration,
	formatSpicyLyricsIds,
	getSpotMatchTxtFileName,
	normalize,
	scoreCandidate,
	similarity,
	stripParentheses,
	type SpotMatchSourceTrack,
} from "./engine";

describe("SpotMatch Engine", () => {
	describe("extractSpotifyTrackId", () => {
		it("extracts ID from full open.spotify.com URLs", () => {
			expect(
				extractSpotifyTrackId(
					"https://open.spotify.com/track/4H7WNRErSbONkM06blBoGc?si=abcd",
				),
			).toBe("4H7WNRErSbONkM06blBoGc");
		});

		it("extracts ID from spotify:track: URIs", () => {
			expect(
				extractSpotifyTrackId("spotify:track:4H7WNRErSbONkM06blBoGc"),
			).toBe("4H7WNRErSbONkM06blBoGc");
		});

		it("accepts bare 22-character track IDs", () => {
			expect(extractSpotifyTrackId("4H7WNRErSbONkM06blBoGc")).toBe(
				"4H7WNRErSbONkM06blBoGc",
			);
		});

		it("throws for invalid values", () => {
			expect(() => extractSpotifyTrackId("invalid-id")).toThrow();
			expect(() => extractSpotifyTrackId("")).toThrow();
		});
	});

	describe("normalize & similarity", () => {
		it("normalizes unicode accents and strips non-alphanumerics", () => {
			expect(normalize("Beyoncé - Déjà Vu & Co.")).toBe(
				"beyonce deja vu and co",
			);
		});

		it("computes 1.0 for identical normalized strings", () => {
			expect(similarity("Stay", "stay")).toBe(1.0);
			expect(similarity("Stay & Wait", "Stay and Wait")).toBe(1.0);
		});

		it("returns 0.0 when one string is empty", () => {
			expect(similarity("Hello", "")).toBe(0.0);
		});

		it("computes high ratio for minor variations", () => {
			const ratio = similarity("Stay (Deluxe)", "Stay");
			expect(ratio).toBeGreaterThan(0.5);
			expect(ratio).toBeLessThan(1.0);
		});
	});

	describe("stripParentheses", () => {
		it("strips parenthetical features from title", () => {
			expect(stripParentheses("Industry Baby (feat. Jack Harlow)")).toBe(
				"Industry Baby",
			);
		});

		it("strips bracketed features and info", () => {
			expect(stripParentheses("God's Plan [with Drake]")).toBe("God's Plan");
		});

		it("strips full-width CJK parentheses and brackets", () => {
			expect(stripParentheses("夜に駆ける（feat. Ayase）")).toBe("夜に駆ける");
			expect(stripParentheses("Song［with Artist］")).toBe("Song");
		});

		it("strips multiple parenthetical and bracketed segments", () => {
			expect(
				stripParentheses("Song Title (feat. Artist A) [Remix] (Deluxe)"),
			).toBe("Song Title");
		});

		it("preserves title when stripping would leave empty string", () => {
			expect(stripParentheses("(Intro)")).toBe("(Intro)");
			expect(stripParentheses("[Interlude]")).toBe("[Interlude]");
		});

		it("handles whitespace and empty strings gracefully", () => {
			expect(stripParentheses("")).toBe("");
			expect(stripParentheses("   ")).toBe("");
		});
	});

	describe("scoreCandidate", () => {
		const source: SpotMatchSourceTrack = {
			id: "source-id-123456789012",
			title: "Stay",
			artists: ["Post Malone"],
			primaryArtist: "Post Malone",
			album: "beerbongs & bentleys",
			durationMs: 204000,
		};

		it("awards ~100 score for identical title, artist, and duration", () => {
			const candidate = {
				id: "alt-id-1234567890123456",
				title: "Stay",
				artists: "Post Malone",
				album: "The Diamond Collection",
				durationMs: 204000,
			};

			const scored = scoreCandidate(source, candidate);
			expect(scored.score).toBe(100);
			expect(scored.durationDeltaMs).toBe(0);
			expect(scored.titleSimilarity).toBe(100);
			expect(scored.artistSimilarity).toBe(100);
		});

		it("penalizes duration differences over 15 seconds to 0 duration score", () => {
			const candidateWithDelta = {
				id: "alt-id-diff-duration1234",
				title: "Stay",
				artists: "Post Malone",
				durationMs: 204000 + 16000, // 16s delta -> duration score = 0
			};

			const scored = scoreCandidate(source, candidateWithDelta);
			// Title: 55, Artist: 30, Duration: 0 -> Total = 85
			expect(scored.score).toBe(85);
			expect(scored.durationDeltaMs).toBe(16000);
		});

		it("penalizes mismatched artist and title", () => {
			const candidateDifferent = {
				id: "alt-id-diff-artist-title",
				title: "Stay Piano Instrumental",
				artists: "Steve Siu",
				durationMs: 260000,
			};

			const scored = scoreCandidate(source, candidateDifferent);
			expect(scored.score).toBeLessThan(50);
		});

		it("matches candidate without feature in title when source has feature in title", () => {
			const featuredSource: SpotMatchSourceTrack = {
				id: "source-id-feat-123456",
				title: "Industry Baby (feat. Jack Harlow)",
				artists: ["Lil Nas X", "Jack Harlow"],
				primaryArtist: "Lil Nas X",
				album: "MONTERO",
				durationMs: 212000,
			};

			const candidateNoFeat = {
				id: "alt-id-no-feat-123456",
				title: "Industry Baby",
				artists: "Lil Nas X, Jack Harlow",
				album: "MONTERO",
				durationMs: 212000,
			};

			const scored = scoreCandidate(featuredSource, candidateNoFeat);
			expect(scored.titleSimilarity).toBe(100);
			expect(scored.score).toBe(100);
		});

		it("matches candidate with feature in title when source does not have feature in title", () => {
			const cleanSource: SpotMatchSourceTrack = {
				id: "source-id-clean-12345",
				title: "Industry Baby",
				artists: ["Lil Nas X", "Jack Harlow"],
				primaryArtist: "Lil Nas X",
				album: "MONTERO",
				durationMs: 212000,
			};

			const candidateWithFeat = {
				id: "alt-id-with-feat-12345",
				title: "Industry Baby (feat. Jack Harlow)",
				artists: "Lil Nas X, Jack Harlow",
				album: "MONTERO",
				durationMs: 212000,
			};

			const scored = scoreCandidate(cleanSource, candidateWithFeat);
			expect(scored.titleSimilarity).toBe(100);
			expect(scored.score).toBe(100);
		});
	});

	describe("formatSpicyLyricsIds", () => {
		it("formats track IDs as comma-separated with no spaces", () => {
			const matches = [
				{ trackId: "4H7WNRErSbONkM06blBoGc" },
				{ trackId: "5LG9XvX0mtdAVvjS2dpVji" },
				{ trackId: "4nvK5SOSQyxuhod097GXz7" },
			];
			expect(formatSpicyLyricsIds(matches)).toBe(
				"4H7WNRErSbONkM06blBoGc,5LG9XvX0mtdAVvjS2dpVji,4nvK5SOSQyxuhod097GXz7",
			);
		});

		it("handles single match and empty matches", () => {
			expect(formatSpicyLyricsIds([{ trackId: "abc" }])).toBe("abc");
			expect(formatSpicyLyricsIds([])).toBe("");
		});

		it("prepends source track ID when provided", () => {
			const matches = [
				{ trackId: "4H7WNRErSbONkM06blBoGc" },
				{ trackId: "5LG9XvX0mtdAVvjS2dpVji" },
			];
			expect(formatSpicyLyricsIds(matches, "sourceTrack1234567890")).toBe(
				"sourceTrack1234567890,4H7WNRErSbONkM06blBoGc,5LG9XvX0mtdAVvjS2dpVji",
			);
		});

		it("deduplicates source track ID if present in matches", () => {
			const matches = [
				{ trackId: "sourceTrack1234567890" },
				{ trackId: "5LG9XvX0mtdAVvjS2dpVji" },
			];
			expect(formatSpicyLyricsIds(matches, "sourceTrack1234567890")).toBe(
				"sourceTrack1234567890,5LG9XvX0mtdAVvjS2dpVji",
			);
		});

		it("returns only source track ID if matches array is empty", () => {
			expect(formatSpicyLyricsIds([], "sourceTrack1234567890")).toBe(
				"sourceTrack1234567890",
			);
		});
	});

	describe("formatDuration", () => {
		it("formats milliseconds into m:ss", () => {
			expect(formatDuration(204426)).toBe("3:24");
			expect(formatDuration(65000)).toBe("1:05");
			expect(formatDuration(0)).toBe("0:00");
			expect(formatDuration(null)).toBe("0:00");
		});
	});

	describe("getSpotMatchTxtFileName", () => {
		it("formats artist and title into a .txt filename", () => {
			const source = {
				id: "track1",
				title: "Bohemian Rhapsody",
				artists: ["Queen"],
				primaryArtist: "Queen",
				durationMs: 354000,
			};
			expect(getSpotMatchTxtFileName(source)).toBe(
				"Queen - Bohemian Rhapsody.txt",
			);
		});

		it("formats multiple artists", () => {
			const source = {
				id: "track2",
				title: "Stay",
				artists: ["The Kid LAROI", "Justin Bieber"],
				primaryArtist: "The Kid LAROI",
				durationMs: 141000,
			};
			expect(getSpotMatchTxtFileName(source)).toBe(
				"The Kid LAROI, Justin Bieber - Stay.txt",
			);
		});

		it("sanitizes invalid filesystem characters", () => {
			const source = {
				id: "track3",
				title: "What's My Age Again? / Rock Show: Live",
				artists: ["AC/DC"],
				primaryArtist: "AC/DC",
				durationMs: 200000,
			};
			expect(getSpotMatchTxtFileName(source)).toBe(
				"AC-DC - What's My Age Again- - Rock Show- Live.txt",
			);
		});

		it("handles missing artist or title gracefully", () => {
			expect(getSpotMatchTxtFileName({ title: "Solo Track" })).toBe(
				"Solo Track.txt",
			);
			expect(getSpotMatchTxtFileName({ primaryArtist: "Solo Artist" })).toBe(
				"Solo Artist.txt",
			);
			expect(getSpotMatchTxtFileName(null)).toBe("spotify-ids.txt");
			expect(getSpotMatchTxtFileName(undefined)).toBe("spotify-ids.txt");
		});
	});
});
