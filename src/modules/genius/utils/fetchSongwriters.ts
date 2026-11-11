import { GeniusApi } from "../api/client";
import { stripParentheses } from "$/modules/spotmatch/engine";

export interface FetchSongwritersOptions {
	geniusApiKey?: string;
	findRealNames?: boolean;
	onProgress?: (message: string, current: number, total: number) => void;
}

/**
 * Resolves an artist's legal/real name from their Genius artist details,
 * looking for 'born ...' or 'real name is ...' in their bio description,
 * or extracting from their alternate_names while filtering out stage names.
 */
export function resolveArtistRealName(
	artistName: string,
	artistDetail?: {
		alternate_names?: string[];
		description?: { plain?: string };
	},
): string {
	if (!artistDetail) return artistName;

	const description = artistDetail.description?.plain || "";
	const altNames = artistDetail.alternate_names || [];

	const cleanExtractedName = (raw: string | undefined): string | null => {
		if (!raw) return null;
		// If there is a dot followed by space and another word, that's likely the end of a sentence
		// e.g. "Aubrey Drake Graham. He is" -> "Aubrey Drake Graham"
		const sentenceSplit = raw.split(/\.\s+/)[0];
		const trimmed = sentenceSplit.replace(/[.,;:!?]+$/, "").trim();
		const words = trimmed.split(/\s+/);
		if (
			words.length >= 2 &&
			words.length <= 5 &&
			words.every((w) => /^[A-Z]/.test(w))
		) {
			return trimmed;
		}
		return null;
	};

	// 1. Try to extract from description using regex
	const bornMatch = description.match(
		/born\s+([A-Z][a-zA-Z.]+(?:\s[A-Z][a-zA-Z.]+){1,4})/,
	);
	const realNameMatch = description.match(
		/real\s+name\s+(?:is\s+)?([A-Z][a-zA-Z.]+(?:\s[A-Z][a-zA-Z.]+){1,4})/i,
	);

	const cleanedBorn = cleanExtractedName(bornMatch?.[1]);
	if (cleanedBorn) {
		return cleanedBorn;
	}
	const cleanedReal = cleanExtractedName(realNameMatch?.[1]);
	if (cleanedReal) {
		return cleanedReal;
	}

	// 2. Fallback to alternate_names with strict filtering
	const forbiddenPrefixes = [
		"King ",
		"The ",
		"Mr. ",
		"aka ",
		"alias ",
		"DJ ",
	];
	const potentialNames = altNames.filter((name) => {
		const isNotStageName =
			!name.toLowerCase().includes(artistName.toLowerCase()) &&
			!artistName.toLowerCase().includes(name.toLowerCase());
		const hasGoodWordCount =
			name.split(" ").length >= 2 && name.split(" ").length <= 4;
		const noForbiddenPrefix = !forbiddenPrefixes.some((p) =>
			name.startsWith(p),
		);
		const isCapitalized = name
			.split(" ")
			.every((word) => /^[A-Z]/.test(word));
		const noUrls = !name.includes("http") && !name.includes("www.");

		return (
			isNotStageName &&
			hasGoodWordCount &&
			noForbiddenPrefix &&
			isCapitalized &&
			noUrls
		);
	});

	if (potentialNames.length > 0) {
		// Prioritize the shortest multi-word name as it's often the cleanest "Real Name"
		return potentialNames.sort((a, b) => a.length - b.length)[0];
	}

	return artistName;
}

/**
 * Fetches songwriter credits for a specific Genius song ID.
 * Returns deduplicated array of songwriter names.
 */
export async function fetchGeniusSongwritersBySongId(
	songId: number,
	options: FetchSongwritersOptions = {},
): Promise<string[]> {
	const { geniusApiKey = "", findRealNames = true, onProgress } = options;

	try {
		const songDetailsRes = await GeniusApi.getSongById(songId, geniusApiKey);
		const song = songDetailsRes?.response?.song;
		if (!song) return [];

		// Collect writer artists
		const artists: { id: number; name: string }[] = [];

		if (Array.isArray(song.writer_artists)) {
			for (const a of song.writer_artists) {
				if (
					a &&
					a.name &&
					!artists.some(
						(existing) => existing.id === a.id || existing.name === a.name,
					)
				) {
					artists.push({ id: a.id, name: a.name });
				}
			}
		}

		// Also check custom_performances for written by / composer / songwriter credits
		if (Array.isArray(song.custom_performances)) {
			for (const perf of song.custom_performances) {
				const label = (perf?.label || "").toLowerCase();
				if (
					label.includes("writer") ||
					label.includes("written") ||
					label.includes("composer") ||
					label.includes("lyricist") ||
					label.includes("author")
				) {
					for (const a of perf?.artists || []) {
						if (
							a &&
							a.name &&
							!artists.some(
								(existing) =>
									existing.id === a.id || existing.name === a.name,
							)
						) {
							artists.push({ id: a.id, name: a.name });
						}
					}
				}
			}
		}

		if (artists.length === 0) {
			return [];
		}

		if (!findRealNames) {
			return Array.from(new Set(artists.map((a) => a.name.trim()))).filter(
				Boolean,
			);
		}

		const realNames: string[] = [];
		for (let i = 0; i < artists.length; i++) {
			const artist = artists[i];
			onProgress?.(
				`Finding real name for ${artist.name} (${i + 1}/${artists.length})...`,
				i + 1,
				artists.length,
			);

			try {
				const detailRes = await GeniusApi.getArtistById(
					artist.id,
					geniusApiKey,
				);
				const realName = resolveArtistRealName(
					artist.name,
					detailRes?.response?.artist,
				);
				realNames.push(realName);
			} catch (e) {
				console.warn(
					`Failed to resolve real name for artist ${artist.name}:`,
					e,
				);
				realNames.push(artist.name);
			}
		}

		return Array.from(new Set(realNames.map((n) => n.trim()))).filter(Boolean);
	} catch (error) {
		console.warn("fetchGeniusSongwritersBySongId error:", error);
		return [];
	}
}

/**
 * Searches Genius for a track by query and retrieves its songwriters.
 * Strips parenthetical/bracketed features for fallback search if needed.
 */
export async function fetchGeniusSongwritersByQuery(
	query: string,
	options: FetchSongwritersOptions = {},
): Promise<string[]> {
	const rawQuery = query?.trim();
	if (!rawQuery) return [];

	const searchAndFetch = async (q: string): Promise<string[]> => {
		try {
			const res = await GeniusApi.search(q, options.geniusApiKey || "");
			const hits = res?.response?.hits;
			if (hits && hits.length > 0) {
				for (const hit of hits) {
					const songId = hit?.result?.id;
					if (songId) {
						const writers = await fetchGeniusSongwritersBySongId(
							songId,
							options,
						);
						if (writers.length > 0) {
							return writers;
						}
					}
				}
			}
		} catch (err) {
			console.warn(`Genius search failed for query "${q}":`, err);
		}
		return [];
	};

	// 1. Primary search with original query
	const primaryResult = await searchAndFetch(rawQuery);
	if (primaryResult.length > 0) {
		return primaryResult;
	}

	// 2. Secondary search stripping parenthetical feature expressions
	const stripped = stripParentheses(rawQuery);
	if (stripped && stripped !== rawQuery) {
		const secondaryResult = await searchAndFetch(stripped);
		if (secondaryResult.length > 0) {
			return secondaryResult;
		}
	}

	return [];
}
