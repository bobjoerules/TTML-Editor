/**
 * SpotMatch Engine
 * Find alternate Spotify IDs for the same recording without requiring user login or developer API keys.
 * Adapted from SpotMatch by TheX24 for the Spicy Lyrics community.
 */

import { checkIsTauri } from "$/modules/spotify/client";

export const TRACK_ID_RE =
	/(?:spotify:track:|open\.spotify\.com\/track\/)?([A-Za-z0-9]{22})/;

export interface SpotMatchSourceTrack {
	id: string;
	title: string;
	artists: string[];
	primaryArtist: string;
	album?: string;
	cover?: string;
	durationMs: number;
}

export interface SpotMatchCandidate {
	trackId: string;
	title: string;
	artists: string;
	album: string;
	cover?: string;
	durationMs: number;
	durationDeltaMs: number;
	titleSimilarity: number;
	artistSimilarity: number;
	score: number;
	spotifyUrl: string;
}

export type SpotMatchPreset = "Quick" | "Balanced" | "Deep";

export interface SpotMatchOptions {
	preset: SpotMatchPreset;
	minimumScore: number; // 0 - 100, default 60
	maxDurationSeconds: number; // default 10
	exactTitle: boolean; // default false
	stripParentheses?: boolean; // default true
}

export const DEFAULT_OPTIONS: SpotMatchOptions = {
	preset: "Balanced",
	minimumScore: 60,
	maxDurationSeconds: 10,
	exactTitle: false,
	stripParentheses: true,
};

/**
 * Extracts a 22-character Spotify track ID from any URL, URI, or raw ID.
 */
export function extractSpotifyTrackId(value: string): string {
	if (!value || typeof value !== "string") {
		throw new Error("Invalid Spotify track identifier.");
	}
	const match = value.trim().match(TRACK_ID_RE);
	if (!match || !match[1]) {
		throw new Error("Please enter a valid Spotify track ID or track link.");
	}
	return match[1];
}

/**
 * Normalizes text matching SpotMatch's Unicode NFKD normalization,
 * lowercasing, converting '&' to 'and', and stripping non-alphanumerics.
 */
export function normalize(value: string): string {
	if (!value) return "";
	return (
		value
			.normalize("NFKD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/&/g, " and ")
			.match(/[a-z0-9]+/g)
			?.join(" ") || ""
	);
}

/**
 * Sequence similarity ratio between 0.0 and 1.0 (equivalent to Python difflib.SequenceMatcher)
 */
export function similarity(left: string, right: string): number {
	const normLeft = normalize(left);
	const normRight = normalize(right);

	if (normLeft === normRight) return 1.0;
	if (!normLeft || !normRight) return 0.0;

	// Gestalt pattern matching / Ratcliff-Obershelp longest common substring ratio
	const matches = countMatchingChars(normLeft, normRight);
	return (2.0 * matches) / (normLeft.length + normRight.length);
}

function countMatchingChars(s1: string, s2: string): number {
	const stack: Array<[number, number, number, number]> = [
		[0, s1.length, 0, s2.length],
	];
	let matchingChars = 0;

	while (stack.length > 0) {
		const [low1, high1, low2, high2] = stack.pop()!;
		let longest = 0;
		let bestI = low1;
		let bestJ = low2;

		for (let i = low1; i < high1; i++) {
			for (let j = low2; j < high2; j++) {
				let k = 0;
				while (i + k < high1 && j + k < high2 && s1[i + k] === s2[j + k]) {
					k++;
				}
				if (k > longest) {
					longest = k;
					bestI = i;
					bestJ = j;
				}
			}
		}

		if (longest > 0) {
			matchingChars += longest;
			if (low1 < bestI && low2 < bestJ) {
				stack.push([low1, bestI, low2, bestJ]);
			}
			if (bestI + longest < high1 && bestJ + longest < high2) {
				stack.push([bestI + longest, high1, bestJ + longest, high2]);
			}
		}
	}

	return matchingChars;
}

/**
 * Strips parenthetical and bracketed segments from a track title (e.g. "(feat. ...)", "[with ...]", "（...）").
 * If removing parenthetical parts results in an empty string, returns the trimmed original title.
 */
export function stripParentheses(title: string): string {
	if (!title || typeof title !== "string") return "";
	const stripped = title
		.replace(/\s*[\(\uff08][^\)\uff09]*[\)\uff09]?/g, "")
		.replace(/\s*[\[\uff3b][^\]\uff3d]*[\]\uff3d]?/g, "")
		.trim();
	return stripped.length > 0 ? stripped : title.trim();
}

/**
 * Calculates the composite match score between the source track and a candidate:
 * - 55% Title similarity
 * - 30% Artist similarity
 * - 15% Duration similarity (linearly decayed over a 15-second delta window)
 */
export function scoreCandidate(
	source: SpotMatchSourceTrack,
	candidate: {
		id: string;
		title: string;
		artists: string;
		album?: string;
		cover?: string;
		durationMs: number;
	},
): SpotMatchCandidate {
	const sourceArtistsStr = source.artists.join(", ");
	const rawTitleScore = similarity(source.title, candidate.title);
	const cleanTitleScore = similarity(
		stripParentheses(source.title),
		stripParentheses(candidate.title),
	);
	const titleScore = Math.max(rawTitleScore, cleanTitleScore);
	const artistScore = similarity(sourceArtistsStr, candidate.artists);

	const deltaMs = Math.abs(source.durationMs - candidate.durationMs);
	// Duration penalty: 1.0 at 0ms delta, down to 0.0 at 15,000ms delta
	const durationScore = Math.max(0.0, 1.0 - deltaMs / 15_000);

	const compositeScore = Math.round(
		100 * (titleScore * 0.55 + artistScore * 0.3 + durationScore * 0.15),
	);

	return {
		trackId: candidate.id,
		title: candidate.title,
		artists: candidate.artists,
		album: candidate.album || "Unknown Album",
		cover: candidate.cover,
		durationMs: candidate.durationMs,
		durationDeltaMs: deltaMs,
		titleSimilarity: Math.round(titleScore * 100),
		artistSimilarity: Math.round(artistScore * 100),
		score: Math.min(100, Math.max(0, compositeScore)),
		spotifyUrl: `https://open.spotify.com/track/${candidate.id}`,
	};
}

/**
 * Format a list of selected matches into the Spicy Lyrics bot format: "id1,id2,id3"
 * Optionally prepends the original/source track ID if provided, deduplicating if needed.
 */
export function formatSpicyLyricsIds(
	matches: Array<Pick<SpotMatchCandidate, "trackId">>,
	sourceTrackId?: string | null,
): string {
	const ids: string[] = [];
	if (sourceTrackId) {
		ids.push(sourceTrackId);
	}
	for (const m of matches) {
		if (m.trackId && m.trackId !== sourceTrackId) {
			ids.push(m.trackId);
		}
	}
	return ids.join(",");
}

/**
 * Generates a sanitized suggested filename for saving SpotMatch IDs to a text file.
 */
export function getSpotMatchTxtFileName(
	source?: Partial<SpotMatchSourceTrack> | null,
): string {
	const artist = source?.artists?.join(", ") || source?.primaryArtist || "";
	const title = source?.title || "";
	const baseName =
		artist && title ? `${artist} - ${title}` : title || artist || "spotify-ids";
	const sanitized = baseName.replace(/[/\\?%*:|"<>]/g, "-").trim();
	return `${sanitized || "spotify-ids"}.txt`;
}

/**
 * Formats duration milliseconds into m:ss
 */
export function formatDuration(ms: number | undefined | null): string {
	if (!ms || ms <= 0) return "0:00";
	const totalSecs = Math.round(ms / 1000);
	const mins = Math.floor(totalSecs / 60);
	const secs = totalSecs % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const SPOTMATCH_WEB_PROXY = "https://proxy.bobjoerules.com/?url=";

/**
 * Native cross-platform HTTP fetcher using Tauri's fetch_url when available,
 * or Cloudflare Worker CORS proxy when running on the web
 */
async function fetchSafeText(
	url: string,
	headers: Record<string, string> = {},
): Promise<string | null> {
	if (checkIsTauri()) {
		try {
			const { invoke } = await import("@tauri-apps/api/core");
			try {
				return await invoke<string>("fetch_url", { url, headers });
			} catch {
				return await invoke<string>("fetch_apple_ttml", { url });
			}
		} catch {
			// fallback
		}
	}

	// Browser / Web mode: route through proxies to bypass CORS
	const encoded = encodeURIComponent(url);
	const proxies = [
		`${SPOTMATCH_WEB_PROXY}${encoded}`,
		`https://corsproxy.io/?url=${encoded}`,
	];

	for (const proxyUrl of proxies) {
		try {
			const res = await fetch(proxyUrl, { headers });
			if (res.ok) {
				return await res.text();
			}
		} catch (proxyErr) {
			console.warn(`SpotMatch proxy fetch failed for ${proxyUrl}:`, proxyErr);
		}
	}

	// Direct fetch fallback
	try {
		const res = await fetch(url, { headers });
		if (res.ok) {
			return await res.text();
		}
	} catch (e) {
		console.warn(`SpotMatch direct fetch failed for ${url}:`, e);
	}
	return null;
}

/**
 * Session token cache for Spotify Pathfinder queries
 */
let cachedSession: { token: string; expiresAtMs: number } | null = null;

async function getSpotifyAnonymousToken(): Promise<string | null> {
	const now = Date.now();
	if (cachedSession && now < cachedSession.expiresAtMs - 60_000) {
		return cachedSession.token;
	}

	try {
		// Fetch anonymous session from Spotify Embed page
		const embedHtml = await fetchSafeText(
			"https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
		);
		if (embedHtml) {
			const match = embedHtml.match(
				/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
			);
			if (match && match[1]) {
				const nextData = JSON.parse(match[1]);
				const session = nextData?.props?.pageProps?.state?.settings?.session;
				if (session?.accessToken) {
					cachedSession = {
						token: session.accessToken,
						expiresAtMs:
							session.accessTokenExpirationTimestampMs || now + 3600_000,
					};
					return session.accessToken;
				}
			}
		}
	} catch (err) {
		console.warn("Failed to get anonymous Spotify token:", err);
	}
	return null;
}

/**
 * Resolve source track details from Spotify Embed or RMM
 */
export async function resolveSourceTrack(
	trackId: string,
): Promise<SpotMatchSourceTrack> {
	// 1. Try Spotify Embed HTML
	try {
		const embedHtml = await fetchSafeText(
			`https://open.spotify.com/embed/track/${trackId}`,
		);
		if (embedHtml) {
			const match = embedHtml.match(
				/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
			);
			if (match && match[1]) {
				const nextData = JSON.parse(match[1]);
				const entity = nextData?.props?.pageProps?.state?.data?.entity;
				if (entity) {
					const title = entity.title || entity.name || "";
					const artists = entity.artists?.map(
						(a: { name: string }) => a.name,
					) || [entity.subtitle || "Unknown Artist"];
					const cover =
						entity.visualIdentity?.image?.[2]?.url ||
						entity.visualIdentity?.image?.[0]?.url ||
						entity.visual?.url ||
						entity.coverArt?.sources?.[0]?.url;
					const album = entity.album?.name;
					const durationMs = entity.duration || entity.durationMs || 0;

					if (title) {
						return {
							id: trackId,
							title,
							artists,
							primaryArtist: artists[0] || "",
							album,
							cover,
							durationMs,
						};
					}
				}
			}
		}
	} catch (e) {
		console.warn("Spotify embed resolution failed:", e);
	}

	// 2. Try RMM Revival Lyrics / Metadata endpoint
	try {
		const rmmJson = await fetchSafeText(
			`https://lyrics.rmmreviv.al/lyrics?id=${encodeURIComponent(trackId)}`,
		);
		if (rmmJson) {
			const data = JSON.parse(rmmJson);
			if (data && data.name && data.artist) {
				const artists = Array.isArray(data.artistList)
					? data.artistList
					: [data.artist];
				return {
					id: trackId,
					title: data.name,
					artists,
					primaryArtist: artists[0] || data.artist,
					album: data.album,
					cover: data.artwork,
					durationMs: data.duration || 0,
				};
			}
		}
	} catch (e) {
		console.warn("RMM source track lookup failed:", e);
	}

	throw new Error(`Could not load Spotify track details for ID ${trackId}.`);
}

/**
 * Searches Spotify's Partner GraphQL catalog
 */
async function searchSpotifyPathfinder(
	searchTerm: string,
	token: string,
	limit: number = 20,
): Promise<
	Array<{
		id: string;
		title: string;
		artists: string;
		album: string;
		cover?: string;
		durationMs: number;
	}>
> {
	try {
		const variables = {
			searchTerm,
			offset: 0,
			limit,
			numberOfTopResults: 5,
			includeAudiobooks: true,
			includePreReleases: true,
			includeAlbumPreReleases: false,
			includeAuthors: false,
			includeEpisodeContentRatingsV2: false,
		};
		const q = {
			operationName: "searchDesktop",
			variables: JSON.stringify(variables),
			extensions: JSON.stringify({
				persistedQuery: {
					version: 1,
					sha256Hash:
						"eff59fa0a3d026b88b56fddbcf4bdfa16a186b8175a5c1a358c072e053c2e5b0",
				},
			}),
		};
		const url = `https://api-partner.spotify.com/pathfinder/v1/query?${new URLSearchParams(q).toString()}`;
		const jsonText = await fetchSafeText(url, {
			authorization: `Bearer ${token}`,
		});
		if (jsonText) {
			const res = JSON.parse(jsonText);
			const items = res?.data?.searchV2?.tracksV2?.items || [];
			return items
				.map((item: any) => {
					const data = item?.item?.data;
					if (!data || !data.uri) return null;
					const trackId = data.uri.replace("spotify:track:", "");
					const title = data.name || "";
					const artists =
						data.artists?.items
							?.map((a: any) => a.profile?.name)
							.filter(Boolean)
							.join(", ") || "";
					const album = data.albumOfTrack?.name || "";
					const cover = data.albumOfTrack?.coverArt?.sources?.[0]?.url;
					const durationMs = data.duration?.totalMilliseconds || 0;
					return { id: trackId, title, artists, album, cover, durationMs };
				})
				.filter(Boolean);
		}
	} catch (e) {
		console.warn("Spotify Pathfinder query error:", e);
	}
	return [];
}

/**
 * Searches RMM Revival database by query
 */
async function searchRmm(query: string): Promise<
	Array<{
		id: string;
		title: string;
		artists: string;
		album: string;
		cover?: string;
		durationMs: number;
	}>
> {
	try {
		const url = `https://lyrics.rmmreviv.al/search?q=${encodeURIComponent(query)}`;
		const jsonText = await fetchSafeText(url);
		if (jsonText) {
			const data = JSON.parse(jsonText);
			if (Array.isArray(data.results)) {
				return data.results
					.map((item: any) => {
						if (!item.id || !item.name) return null;
						return {
							id: item.id,
							title: item.name,
							artists: item.artistNames || item.artist || "",
							album: item.album || "",
							cover: item.artwork,
							durationMs: item.duration || 0,
						};
					})
					.filter(Boolean);
			}
		}
	} catch (e) {
		console.warn("RMM search error:", e);
	}
	return [];
}

/**
 * Main SpotMatch search function:
 * Discovers alternate Spotify recordings for the given track, computes match scores,
 * filters against user thresholds, and returns ranked candidates.
 */
export async function findSpotMatches(
	sourceInput: string | SpotMatchSourceTrack,
	options: Partial<SpotMatchOptions> = {},
	onProgress?: (message: string, current: number, total: number) => void,
): Promise<{ source: SpotMatchSourceTrack; matches: SpotMatchCandidate[] }> {
	const opts: SpotMatchOptions = { ...DEFAULT_OPTIONS, ...options };

	onProgress?.("Reading source track...", 0, 100);
	const source =
		typeof sourceInput === "string"
			? await resolveSourceTrack(extractSpotifyTrackId(sourceInput))
			: sourceInput;

	onProgress?.("Generating candidate queries...", 10, 100);

	// Generate queries following SpotMatch methodology
	const primaryArtist = source.primaryArtist || source.artists[0] || "";
	const allArtists = source.artists.join(" ");
	const album = source.album || "";

	const baseQueries = [
		source.title,
		`${source.title} ${primaryArtist}`.trim(),
		`${source.title} ${allArtists}`.trim(),
	];
	if (album) {
		baseQueries.push(`${source.title} ${album}`.trim());
	}

	if (opts.preset === "Deep") {
		const variants = ["remaster", "deluxe", "live", "edit", "instrumental"];
		for (const v of variants) {
			baseQueries.push(`${source.title} ${v}`);
		}
	}

	// Secondary search: remove the parenthetical part (e.g. features like "(feat. ...)")
	const cleanTitle = stripParentheses(source.title);
	if (
		opts.stripParentheses !== false &&
		cleanTitle &&
		cleanTitle.toLowerCase() !== source.title.toLowerCase()
	) {
		baseQueries.push(
			cleanTitle,
			`${cleanTitle} ${primaryArtist}`.trim(),
			`${cleanTitle} ${allArtists}`.trim(),
		);
		if (album) {
			baseQueries.push(`${cleanTitle} ${album}`.trim());
		}
		if (opts.preset === "Deep") {
			const variants = ["remaster", "deluxe", "live", "edit", "instrumental"];
			for (const v of variants) {
				baseQueries.push(`${cleanTitle} ${v}`);
			}
		}
	}

	// Deduplicate queries
	const queries = Array.from(
		new Set(baseQueries.map((q) => q.trim()).filter((q) => q.length > 0)),
	);

	onProgress?.("Connecting to Spotify catalog...", 20, 100);
	const token = await getSpotifyAnonymousToken();

	const candidatesMap = new Map<string, SpotMatchCandidate>();

	const totalQueries = queries.length;
	let completed = 0;

	for (const query of queries) {
		completed++;
		const progressPercent = 20 + Math.round((completed / totalQueries) * 60);
		onProgress?.(
			`Searching catalog (${completed}/${totalQueries}): "${query}"...`,
			progressPercent,
			100,
		);

		// Concurrently search both Spotify Pathfinder (if token available) and RMM database
		const [spotifyHits, rmmHits] = await Promise.all([
			token
				? searchSpotifyPathfinder(
						query,
						token,
						opts.preset === "Quick" ? 10 : 25,
					)
				: Promise.resolve([]),
			searchRmm(query),
		]);

		const allHits = [...spotifyHits, ...rmmHits];

		for (const hit of allHits) {
			// SpotMatch excludes the source track itself
			if (hit.id === source.id) continue;

			// Check if candidate matches exact title requirement if enabled
			if (opts.exactTitle) {
				const normHit = normalize(hit.title);
				const normSource = normalize(source.title);
				const normCleanHit = normalize(stripParentheses(hit.title));
				const normCleanSource = normalize(stripParentheses(source.title));
				const isExact =
					normHit === normSource ||
					(normCleanHit.length > 0 &&
						normCleanSource.length > 0 &&
						normCleanHit === normCleanSource);
				if (!isExact) continue;
			}

			const scored = scoreCandidate(source, hit);

			// Check thresholds
			if (scored.score < opts.minimumScore) continue;
			if (scored.durationDeltaMs > opts.maxDurationSeconds * 1000) continue;

			const existing = candidatesMap.get(hit.id);
			if (!existing || scored.score > existing.score) {
				candidatesMap.set(hit.id, scored);
			}
		}
	}

	onProgress?.("Ranking matches...", 90, 100);

	const matches = Array.from(candidatesMap.values()).sort((a, b) => {
		// Primary sort: descending score
		if (b.score !== a.score) return b.score - a.score;
		// Secondary sort: ascending duration difference
		if (a.durationDeltaMs !== b.durationDeltaMs)
			return a.durationDeltaMs - b.durationDeltaMs;
		// Tie-breaker: track ID
		return a.trackId.localeCompare(b.trackId);
	});

	onProgress?.(`Found ${matches.length} matching recordings.`, 100, 100);

	return { source, matches };
}
