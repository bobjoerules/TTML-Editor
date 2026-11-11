import { afterEach, describe, expect, it, vi } from "vitest";
import {
	fetchGeniusSongwritersByQuery,
	fetchGeniusSongwritersBySongId,
	resolveArtistRealName,
} from "./fetchSongwriters";
import { GeniusApi } from "../api/client";

describe("fetchSongwriters", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("resolveArtistRealName", () => {
		it("returns artistName when no detail is provided", () => {
			expect(resolveArtistRealName("The Weeknd")).toBe("The Weeknd");
		});

		it("extracts legal name from 'born [Name]' in description", () => {
			const detail = {
				alternate_names: ["Abel", "The Weeknd"],
				description: {
					plain: "Abel Makkonen Tesfaye, known professionally as The Weeknd, born Abel Makkonen Tesfaye on February 16, 1990.",
				},
			};
			expect(resolveArtistRealName("The Weeknd", detail)).toBe(
				"Abel Makkonen Tesfaye",
			);
		});

		it("extracts legal name from 'real name is [Name]' in description", () => {
			const detail = {
				alternate_names: ["Drizzy", "Champagne Papi"],
				description: {
					plain: "His real name is Aubrey Drake Graham. He is a Canadian rapper.",
				},
			};
			expect(resolveArtistRealName("Drake", detail)).toBe("Aubrey Drake Graham");
		});

		it("falls back to alternate_names filtering forbidden prefixes and stage names", () => {
			const detail = {
				alternate_names: [
					"DJ Metro",
					"Metro Boomin Want Some More",
					"Leland Tyler Wayne",
					"The Producer",
				],
				description: {
					plain: "American record producer and DJ.",
				},
			};
			expect(resolveArtistRealName("Metro Boomin", detail)).toBe(
				"Leland Tyler Wayne",
			);
		});

		it("falls back to artistName if alternate names do not match criteria", () => {
			const detail = {
				alternate_names: ["DJ Snake"],
				description: {
					plain: "French DJ and record producer.",
				},
			};
			expect(resolveArtistRealName("DJ Snake", detail)).toBe("DJ Snake");
		});
	});

	describe("fetchGeniusSongwritersBySongId", () => {
		it("fetches writers and resolves real names", async () => {
			vi.spyOn(GeniusApi, "getSongById").mockResolvedValueOnce({
				meta: { status: 200 },
				response: {
					song: {
						id: 1234,
						title: "Blinding Lights",
						artist_names: "The Weeknd",
						writer_artists: [
							{ id: 101, name: "The Weeknd" } as any,
							{ id: 102, name: "Max Martin" } as any,
						],
					} as any,
				},
			});

			vi.spyOn(GeniusApi, "getArtistById")
				.mockResolvedValueOnce({
					meta: { status: 200 },
					response: {
						artist: {
							id: 101,
							name: "The Weeknd",
							alternate_names: ["Abel Makkonen Tesfaye"],
							description: {
								plain: "born Abel Makkonen Tesfaye in Toronto.",
							},
						} as any,
					},
				})
				.mockResolvedValueOnce({
					meta: { status: 200 },
					response: {
						artist: {
							id: 102,
							name: "Max Martin",
							alternate_names: ["Martin Karl Sandberg"],
							description: {
								plain: "born Martin Karl Sandberg.",
							},
						} as any,
					},
				});

			const writers = await fetchGeniusSongwritersBySongId(1234, {
				geniusApiKey: "fake-key",
				findRealNames: true,
			});

			expect(writers).toEqual(["Abel Makkonen Tesfaye", "Martin Karl Sandberg"]);
		});

		it("falls back to custom_performances when writer_artists is empty", async () => {
			vi.spyOn(GeniusApi, "getSongById").mockResolvedValueOnce({
				meta: { status: 200 },
				response: {
					song: {
						id: 5678,
						title: "Some Track",
						artist_names: "Indie Artist",
						writer_artists: [],
						custom_performances: [
							{
								label: "Written By",
								artists: [{ id: 201, name: "Jane Doe" } as any],
							},
						],
					} as any,
				},
			});

			vi.spyOn(GeniusApi, "getArtistById").mockResolvedValueOnce({
				meta: { status: 200 },
				response: {
					artist: {
						id: 201,
						name: "Jane Doe",
						alternate_names: [],
						description: { plain: "" },
					} as any,
				},
			});

			const writers = await fetchGeniusSongwritersBySongId(5678, {
				geniusApiKey: "fake-key",
				findRealNames: true,
			});

			expect(writers).toEqual(["Jane Doe"]);
		});

		it("returns empty array when no writers are found", async () => {
			vi.spyOn(GeniusApi, "getSongById").mockResolvedValueOnce({
				meta: { status: 200 },
				response: {
					song: {
						id: 9999,
						title: "Instrumental",
						artist_names: "Musician",
						writer_artists: [],
					} as any,
				},
			});

			const writers = await fetchGeniusSongwritersBySongId(9999, {
				geniusApiKey: "fake-key",
			});

			expect(writers).toEqual([]);
		});
	});

	describe("fetchGeniusSongwritersByQuery", () => {
		it("searches and returns writers on direct match", async () => {
			vi.spyOn(GeniusApi, "search").mockResolvedValueOnce({
				meta: { status: 200 },
				response: {
					hits: [
						{
							type: "song",
							result: { id: 777 } as any,
							highlights: [],
							index: "song",
						},
					],
				},
			});

			vi.spyOn(GeniusApi, "getSongById").mockResolvedValueOnce({
				meta: { status: 200 },
				response: {
					song: {
						id: 777,
						title: "Hello",
						artist_names: "Adele",
						writer_artists: [{ id: 301, name: "Adele Adkins" } as any],
					} as any,
				},
			});

			vi.spyOn(GeniusApi, "getArtistById").mockResolvedValueOnce({
				meta: { status: 200 },
				response: {
					artist: {
						id: 301,
						name: "Adele Adkins",
						alternate_names: [],
						description: { plain: "born Adele Laurie Blue Adkins." },
					} as any,
				},
			});

			const writers = await fetchGeniusSongwritersByQuery("Adele Hello", {
				geniusApiKey: "fake-key",
			});

			expect(writers).toEqual(["Adele Laurie Blue Adkins"]);
		});

		it("performs secondary search with stripped parentheses if primary query returns no hits", async () => {
			const searchSpy = vi
				.spyOn(GeniusApi, "search")
				// 1st search fails
				.mockResolvedValueOnce({
					meta: { status: 200 },
					response: { hits: [] },
				})
				// 2nd search with stripped parentheses succeeds
				.mockResolvedValueOnce({
					meta: { status: 200 },
					response: {
						hits: [
							{
								type: "song",
								result: { id: 888 } as any,
								highlights: [],
								index: "song",
							},
						],
					},
				});

			vi.spyOn(GeniusApi, "getSongById").mockResolvedValueOnce({
				meta: { status: 200 },
				response: {
					song: {
						id: 888,
						title: "Industry Baby",
						artist_names: "Lil Nas X",
						writer_artists: [{ id: 401, name: "Montero Hill" } as any],
					} as any,
				},
			});

			vi.spyOn(GeniusApi, "getArtistById").mockResolvedValueOnce({
				meta: { status: 200 },
				response: {
					artist: {
						id: 401,
						name: "Montero Hill",
						alternate_names: [],
						description: { plain: "born Montero Lamar Hill." },
					} as any,
				},
			});

			const writers = await fetchGeniusSongwritersByQuery(
				"Lil Nas X Industry Baby (feat. Jack Harlow)",
				{ geniusApiKey: "fake-key" },
			);

			expect(searchSpy).toHaveBeenCalledTimes(2);
			expect(searchSpy).toHaveBeenNthCalledWith(
				2,
				"Lil Nas X Industry Baby",
				"fake-key",
			);
			expect(writers).toEqual(["Montero Lamar Hill"]);
		});
	});
});

