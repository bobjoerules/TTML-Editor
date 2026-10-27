import type { TTMLMetadata } from "$/types/ttml";

export const checkIsTauri = (): boolean =>
	typeof window !== "undefined" &&
	(!!(window as any).__TAURI__ ||
		!!(window as any).__TAURI_INTERNALS__ ||
		!!import.meta.env?.TAURI_ENV_PLATFORM);

export interface SongLoadCheckParams {
	metadata: TTMLMetadata[];
	lyricLinesCount: number;
	loadedAudioFileName?: string | null;
	saveFileName?: string | null;
}

export interface GeniusTargetResolutionParams {
	metadata: TTMLMetadata[];
	loadedAudioFileName?: string | null;
	saveFileName?: string | null;
}

export interface GeniusAsyncTargetResolutionParams
	extends GeniusTargetResolutionParams {
	apiKey?: string;
}

/**
 * Checks if a string is a valid Genius song page or album page URL,
 * explicitly excluding cover artwork images, static assets, and dev portals.
 */
export function isGeniusSongPageUrl(val: string): boolean {
	if (!val || typeof val !== "string") return false;
	const trimmed = val.trim();

	// Explicitly reject image domains, CDN assets, and image file extensions
	if (
		/images\.genius\.com/i.test(trimmed) ||
		/assets\.genius\.com/i.test(trimmed) ||
		/\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i.test(trimmed)
	) {
		return false;
	}

	// Reject non-song paths like api-clients, tags, about, static
	if (
		/https?:\/\/(?:[a-zA-Z0-9-]+\.)?genius\.com\/(api-clients|tags|about|static)\b/i.test(
			trimmed,
		)
	) {
		return false;
	}

	// Must be on genius.com domain or genius:// protocol
	if (
		!/^(https?:\/\/)?([a-zA-Z0-9-]+\.)?genius\.com\//i.test(trimmed) &&
		!/^genius:\/\//i.test(trimmed)
	) {
		return false;
	}

	return true;
}

/**
 * Searches metadata for a direct song or album page URL on Genius,
 * ignoring cover art, thumbnail, and image metadata entries.
 */
export function findDirectGeniusPageUrl(
	metadata?: TTMLMetadata[],
): string | null {
	if (!metadata || !Array.isArray(metadata)) return null;

	for (const m of metadata) {
		const key = m.key?.toLowerCase();
		// Skip cover art / image metadata
		if (
			key === "cover_art" ||
			key === "cover" ||
			key === "artwork" ||
			key === "image" ||
			key === "album_art"
		) {
			continue;
		}

		if (Array.isArray(m.value)) {
			for (const v of m.value) {
				if (typeof v === "string" && isGeniusSongPageUrl(v)) {
					let url = v.trim();
					if (!/^https?:\/\//i.test(url)) {
						url = `https://${url}`;
					}
					return url;
				}
			}
		}
	}

	return null;
}

export function getIsSongLoaded(params: SongLoadCheckParams): boolean {
	if (params.lyricLinesCount > 0) return true;
	if (params.loadedAudioFileName) return true;

	const hasTitle = !!params.metadata?.find((m) => {
		const key = m.key?.toLowerCase();
		return key === "musicname" || key === "title" || key === "trackname";
	})?.value?.[0]?.trim();

	const hasArtist = !!params.metadata?.find((m) => {
		const key = m.key?.toLowerCase();
		return key === "artists" || key === "artist" || key === "author";
	})?.value?.[0]?.trim();

	if (hasTitle || hasArtist) return true;

	const hasGeniusSongUrl = !!findDirectGeniusPageUrl(params.metadata);
	if (hasGeniusSongUrl) return true;

	if (
		params.saveFileName &&
		params.saveFileName !== "unnamed.ttml" &&
		params.saveFileName !== "lyric.ttml" &&
		params.saveFileName !== "untitled.ttml"
	) {
		return true;
	}

	return false;
}

export function getSongSearchQuery(
	params: GeniusTargetResolutionParams,
): string | null {
	const titleMeta = params.metadata?.find((m) => {
		const key = m.key?.toLowerCase();
		return key === "musicname" || key === "title" || key === "trackname";
	});
	const artistMeta = params.metadata?.find((m) => {
		const key = m.key?.toLowerCase();
		return key === "artists" || key === "artist" || key === "author";
	});

	let title = titleMeta?.value?.[0]?.trim() || "";
	let artist = artistMeta?.value?.[0]?.trim() || "";

	if (!title && !artist) {
		const candidateFileName =
			params.saveFileName &&
			params.saveFileName !== "unnamed.ttml" &&
			params.saveFileName !== "lyric.ttml" &&
			params.saveFileName !== "untitled.ttml"
				? params.saveFileName
				: params.loadedAudioFileName || "";

		const baseFileName = candidateFileName
			.replace(/\.(ttml|lrc|txt|mp3|flac|wav|m4a|ogg|opus|aac)$/i, "")
			.trim();

		if (baseFileName) {
			if (baseFileName.includes(" - ")) {
				const parts = baseFileName.split(" - ");
				artist = parts[0]?.trim() || "";
				title = parts.slice(1).join(" - ")?.trim() || "";
			} else {
				title = baseFileName;
			}
		}
	}

	if (title || artist) {
		return artist && title ? `${artist} ${title}` : title || artist;
	}

	return null;
}

async function fetchSafeJson<T = any>(url: string): Promise<T | null> {
	if (checkIsTauri()) {
		try {
			const { invoke } = await import("@tauri-apps/api/core");
			const raw = await invoke<string>("fetch_url", { url });
			if (raw) return JSON.parse(raw);
		} catch (err) {
			console.warn("fetch_url failed, falling back to fetch:", err);
		}
	}
	try {
		const res = await fetch(url, {
			headers: {
				Accept: "application/json",
			},
		});
		if (res.ok) return await res.json();
	} catch (err) {
		console.warn("fetch failed:", err);
	}
	return null;
}

export function resolveGeniusTargetUrl(
	params: GeniusTargetResolutionParams,
): string {
	const directUrl = findDirectGeniusPageUrl(params.metadata);
	if (directUrl) {
		return directUrl;
	}

	const query = getSongSearchQuery(params);
	if (query) {
		return `https://genius.com/search?q=${encodeURIComponent(query)}`;
	}

	return "https://genius.com";
}

/**
 * Resolves a song's direct Genius page URL asynchronously by first querying
 * Genius search endpoints, falling back to the standard search query URL.
 */
export async function resolveGeniusDirectTargetUrl(
	params: GeniusAsyncTargetResolutionParams,
): Promise<string> {
	const directUrl = findDirectGeniusPageUrl(params.metadata);
	if (directUrl) {
		return directUrl;
	}

	const query = getSongSearchQuery(params);
	if (!query) {
		return "https://genius.com";
	}

	// 1. Try authenticated official API search if API key is configured
	if (params.apiKey) {
		try {
			const apiUrl = `https://api.genius.com/search?q=${encodeURIComponent(query)}&access_token=${params.apiKey}`;
			const data = await fetchSafeJson(apiUrl);
			const hitUrl = data?.response?.hits?.[0]?.result?.url;
			if (hitUrl && isGeniusSongPageUrl(hitUrl)) {
				return hitUrl;
			}
		} catch {
			// fallback
		}
	}

	// 2. Try Genius public song search API (returns song hits directly)
	try {
		const songSearchUrl = `https://genius.com/api/search/song?q=${encodeURIComponent(query)}`;
		const data = await fetchSafeJson(songSearchUrl);
		const hits = data?.response?.sections?.[0]?.hits || [];
		for (const h of hits) {
			const hitUrl = h?.result?.url;
			if (hitUrl && isGeniusSongPageUrl(hitUrl)) {
				return hitUrl;
			}
		}
	} catch {
		// fallback
	}

	// 3. Try Genius public multi search API (returns sections for top_hit and song)
	try {
		const multiSearchUrl = `https://genius.com/api/search/multi?q=${encodeURIComponent(query)}`;
		const data = await fetchSafeJson(multiSearchUrl);
		const sections = data?.response?.sections || [];
		for (const section of sections) {
			if (section.type === "song" || section.type === "top_hit") {
				for (const h of section.hits || []) {
					const hitUrl = h?.result?.url;
					if (hitUrl && isGeniusSongPageUrl(hitUrl)) {
						return hitUrl;
					}
				}
			}
		}
	} catch {
		// fallback
	}

	// 4. Fallback to web search page if direct page could not be located
	return `https://genius.com/search?q=${encodeURIComponent(query)}`;
}
