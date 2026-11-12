import type { JooxSongDetail, JooxSongItem, JooxTrack } from "../types";
import { binaryToBlob } from "$/utils/binaryBlob";

export const DEFAULT_JOOX_TOKEN = "f84ao9lMF_q7husBWRfgUw";

const isTauriEnv = () =>
	typeof window !== "undefined" &&
	(!!(window as unknown as { __TAURI__?: unknown }).__TAURI__ ||
		!!(window as unknown as { __TAURI_INTERNALS__?: unknown })
			.__TAURI_INTERNALS__ ||
		!!import.meta.env.TAURI_ENV_PLATFORM);

export function normalizeSearchText(str: string): string {
	return str
		.toLowerCase()
		.replace(/[()[\]{}、，,。·\-–—_/\\:;'"“”‘’`~!@#$%^&*+=<>?]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function extractBaseTitle(title: string): string {
	return normalizeSearchText(
		title
			.replace(/\s*[\(\[\{][^\)\]\}]*[\)\]\}]/g, " ")
			.replace(
				/\s*[-–—/]\s*(?:feat\.?|ft\.?|featuring|with|remix|version|edit|live|acoustic|deluxe|remastered|explicit|clean|radio)[\s\S]*/gi,
				" ",
			)
			.replace(/\s+(?:feat\.?|ft\.?|featuring|with)\s+[\s\S]*/gi, " "),
	);
}

export function scoreCandidateTrack(
	track: JooxTrack,
	targetTitle: string,
	targetArtist: string,
): number {
	const trackName = normalizeSearchText(track.name);
	const trackArtist = normalizeSearchText(track.artist);
	const expectedTitle = normalizeSearchText(targetTitle);
	const expectedArtist = normalizeSearchText(targetArtist);

	const baseTrackName = extractBaseTitle(track.name);
	const baseExpectedTitle = extractBaseTitle(targetTitle);

	let score = 0;

	// Title evaluation
	let titleMatches = false;
	if (expectedTitle) {
		if (trackName === expectedTitle) {
			score += 100;
			titleMatches = true;
		} else if (
			baseTrackName &&
			baseExpectedTitle &&
			baseTrackName === baseExpectedTitle
		) {
			score += 95;
			titleMatches = true;
		} else {
			// Check if track name has significant extra or missing words
			const trackWords = baseTrackName.split(" ").filter(Boolean);
			const expectedWords = baseExpectedTitle.split(" ").filter(Boolean);

			const matchingWords = expectedWords.filter((w) => trackWords.includes(w));
			const isSubset =
				expectedWords.length > 0 &&
				matchingWords.length === expectedWords.length;
			const extraWords = trackWords.filter((w) => !expectedWords.includes(w));

			// If track has extra distinct words (not features/versions), it's a completely different song
			if (isSubset && extraWords.length === 0) {
				score += 90;
				titleMatches = true;
			} else if (isSubset && extraWords.length > 0) {
				// Different song by same artist that merely contains or starts with the title!
				// E.g., target: "Hold On", track: "Hold On We're Going Home"
				score -= 80;
			} else if (
				trackName.startsWith(expectedTitle) ||
				expectedTitle.startsWith(trackName)
			) {
				if (baseTrackName === baseExpectedTitle) {
					score += 70;
					titleMatches = true;
				} else {
					score -= 60;
				}
			} else if (trackName.includes(expectedTitle)) {
				if (baseTrackName === baseExpectedTitle) {
					score += 50;
					titleMatches = true;
				} else {
					score -= 60;
				}
			} else {
				if (trackArtist.includes(expectedTitle)) {
					score -= 100;
				} else {
					score -= 50;
				}
			}
		}
	}

	// Artist evaluation
	let artistMatches = false;
	if (expectedArtist) {
		if (trackArtist === expectedArtist) {
			score += 100;
			artistMatches = true;
		} else if (
			trackArtist.includes(expectedArtist) ||
			expectedArtist.includes(trackArtist)
		) {
			score += 60;
			artistMatches = true;
		} else {
			// Word overlap for multi-artist or collaboration
			const expectedWords = expectedArtist
				.split(" ")
				.filter((w) => w.length > 1);
			const matchedWords = expectedWords.filter((w) => trackArtist.includes(w));
			if (matchedWords.length > 0) {
				score += (matchedWords.length / expectedWords.length) * 40;
				artistMatches = true;
			} else {
				score -= 80;
			}
		}
	}

	// If artist was requested, candidate MUST match the artist
	if (expectedArtist && !artistMatches) {
		return -1;
	}

	// If title was requested, candidate MUST match the title
	if (expectedTitle && !titleMatches) {
		return -1;
	}

	const text =
		`${track.name} ${track.artist || ""} ${track.album || ""}`.toLowerCase();
	const targetText = `${targetTitle} ${targetArtist}`.toLowerCase();

	// Clean vs Explicit versions evaluation
	const isTargetClean =
		/\b(clean|radio edit|radio version|censored)\b/i.test(targetText);
	const isTrackClean =
		/\b(clean|clean version|clean edit|radio edit|radio version|censored|edited version|tv edit)\b/i.test(
			text,
		);

	if (isTrackClean && !isTargetClean) {
		// Heavily penalize clean/radio edit versions when not requested
		score -= 60;
	} else if (!isTrackClean && isTargetClean) {
		score -= 40;
	}

	const isTrackExplicit =
		/\b(explicit|dirty|uncensored|original mix|original version)\b/i.test(text);
	if (isTrackExplicit && !isTargetClean) {
		// Bonus for authentic explicit/original track
		score += 25;
	}

	// Deduct for unrequested covers or instrumentals so authentic track is chosen
	if (
		/instrumental|karaoke|伴奏|纯音乐/.test(text) &&
		!/instrumental|karaoke/.test(targetTitle.toLowerCase())
	) {
		score -= 50;
	}
	if (
		/cover|tribute|remake|翻唱/.test(text) &&
		!/cover|tribute/.test((targetTitle + targetArtist).toLowerCase())
	) {
		score -= 50;
	}

	// Deduct for unrequested live versions
	if (
		/\b(live|concert|in concert|live at|live from)\b/i.test(text) &&
		!/\b(live|concert)\b/i.test(targetText)
	) {
		score -= 40;
	}

	// Deduct for unrequested remixes
	if (
		/\b(remix|bootleg|mashup|club mix|extended mix|dub mix)\b/i.test(text) &&
		!/\b(remix|bootleg|mashup|club mix|extended mix|dub mix)\b/i.test(targetText)
	) {
		score -= 45;
	}

	return score;
}

async function fetchJooxJson<T = any>(url: string): Promise<T> {
	if (isTauriEnv()) {
		try {
			const { invoke } = await import("@tauri-apps/api/core");
			const raw = await invoke<string>("fetch_url", { url });
			return JSON.parse(raw);
		} catch (tauriErr) {
			console.warn("Tauri fetch_url failed, falling back to fetch:", tauriErr);
		}
	}

	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.json();
	} catch (webErr) {
		const encoded = encodeURIComponent(url);
		const corsProxies = [
			`https://api.allorigins.win/raw?url=${encoded}`,
			`https://corsproxy.io/?${encoded}`,
		];
		for (const proxy of corsProxies) {
			try {
				const proxyRes = await fetch(proxy, {
					signal: AbortSignal.timeout(8000),
				});
				if (proxyRes.ok) return await proxyRes.json();
			} catch {
				// continue
			}
		}
		throw webErr;
	}
}

export async function fetchItunesCover(
	name: string,
	artist?: string,
): Promise<string | undefined> {
	try {
		const term = artist ? `${name} ${artist}` : name;
		const res = await fetch(
			`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=1`,
			{ signal: AbortSignal.timeout(3500) },
		);
		if (!res.ok) return undefined;
		const data = await res.json();
		const result = data.results?.[0];
		if (!result) return undefined;
		const raw = result.artworkUrl100 || result.artworkUrl60;
		return raw ? raw.replace(/100x100bb\.jpg/i, "600x600bb.jpg") : undefined;
	} catch {
		return undefined;
	}
}

async function fetchItunesCoversForQuery(
	query: string,
): Promise<Map<string, string>> {
	const map = new Map<string, string>();
	try {
		const res = await fetch(
			`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=10`,
			{ signal: AbortSignal.timeout(3500) },
		);
		if (!res.ok) return map;
		const data = await res.json();
		if (!Array.isArray(data.results)) return map;
		for (const item of data.results) {
			const key = normalizeSearchText(item.trackName || "");
			const raw = item.artworkUrl100 || item.artworkUrl60;
			if (key && raw) {
				const highRes = raw.replace(/100x100bb\.jpg/i, "300x300bb.jpg");
				if (!map.has(key)) {
					map.set(key, highRes);
				}
				const fullKey = `${key} ${normalizeSearchText(item.artistName || "")}`;
				map.set(fullKey, highRes);
			}
		}
	} catch {
		// Covers are an enhancement, fail safely
	}
	return map;
}

export const JooxApi = {
	/**
	 * Search for songs on JOOX.
	 */
	async search(
		query: string,
		token: string = DEFAULT_JOOX_TOKEN,
	): Promise<JooxTrack[]> {
		if (!query.trim()) return [];
		const url = `https://apicx.asia/api/joox_music?msg=${encodeURIComponent(query.trim())}&token=${token}&br=4`;

		let json: any;
		try {
			json = await fetchJooxJson(url);
		} catch (err) {
			throw new Error(
				`JOOX search failed: ${err instanceof Error ? err.message : String(err)}`,
			);
		}

		if (json.code !== 200 || !json.data?.songs) {
			return [];
		}

		// Try fetching real album covers from iTunes in parallel with JOOX results parsing
		let itunesCovers = new Map<string, string>();
		try {
			itunesCovers = await fetchItunesCoversForQuery(query.trim());
		} catch {
			// ignore
		}

		return json.data.songs.map((song: JooxSongItem) => {
			const normTitle = normalizeSearchText(song.歌曲名称 || "");
			const normArtist = normalizeSearchText(song.歌手 || "");
			const cover =
				itunesCovers.get(`${normTitle} ${normArtist}`) ||
				itunesCovers.get(normTitle) ||
				undefined;

			return {
				id: String(song.歌曲ID || song.songmid || song.序号),
				index: song.序号,
				name: song.歌曲名称,
				artist: song.歌手,
				album: song.专辑,
				duration: song.时长,
				songmid: song.songmid,
				cover,
				source: "JOOX",
			};
		});
	},

	/**
	 * Fetch song detail including lyrics and audio stream URLs.
	 */
	async getDetail(
		query: string,
		index: number,
		token: string = DEFAULT_JOOX_TOKEN,
	): Promise<JooxSongDetail> {
		const url = `https://apicx.asia/api/joox_music?msg=${encodeURIComponent(query.trim())}&token=${token}&br=4&n=${index}`;

		let json: any;
		try {
			json = await fetchJooxJson(url);
		} catch (err) {
			throw new Error(
				`JOOX detail failed: ${err instanceof Error ? err.message : String(err)}`,
			);
		}

		if (json.code !== 200 || !json.data) {
			throw new Error(json.msg || "Failed to get song details from JOOX");
		}
		return json.data;
	},

	/**
	 * Download audio binary as a Blob reliably.
	 */
	async downloadAudioBlob(url: string): Promise<Blob> {
		const mime = url.includes(".flac")
			? "audio/flac"
			: url.includes(".ogg")
				? "audio/ogg"
				: url.includes(".m4a")
					? "audio/mp4"
					: "audio/mpeg";

		// 1. Native Tauri fetch_binary first on desktop (bypasses browser CORS & COEP)
		if (isTauriEnv()) {
			try {
				const { invoke } = await import("@tauri-apps/api/core");
				const raw = await invoke<unknown>("fetch_binary", { url });
				const blob = binaryToBlob(raw, mime);
				if (blob && blob.size > 0) {
					return blob;
				}
			} catch (tauriErr) {
				console.warn(
					"Tauri fetch_binary failed, falling back to direct fetch:",
					tauriErr,
				);
			}
		}

		// 2. Direct browser fetch (for web)
		try {
			const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
			if (res.ok) {
				const blob = await res.blob();
				if (blob.size > 0) {
					return blob.type && blob.type.startsWith("audio/")
						? blob
						: new Blob([blob], { type: mime });
				}
			}
		} catch (fetchErr) {
			console.warn(
				"Direct fetch failed for audio stream, trying fallback:",
				fetchErr,
			);
		}

		// 3. Web proxy fallback
		const encoded = encodeURIComponent(url);
		const corsProxies = [
			`https://api.allorigins.win/raw?url=${encoded}`,
			`https://corsproxy.io/?${encoded}`,
		];
		for (const proxy of corsProxies) {
			try {
				const proxyRes = await fetch(proxy, { signal: AbortSignal.timeout(45000) });
				if (proxyRes.ok) {
					const blob = await proxyRes.blob();
					if (blob.size > 0) {
						return new Blob([blob], { type: mime });
					}
				}
			} catch {
				// continue
			}
		}

		throw new Error("Failed to download audio stream");
	},

	/**
	 * Select the best available audio stream URL based on quality preference.
	 */
	getBestAudioUrl(
		audioLinks?: Record<string, string>,
		preferredQuality = "320",
	): { url: string; ext: string; qualityName: string } | null {
		if (!audioLinks) return null;

		const qualityOrder: { keys: string[]; ext: string; name: string }[] = [];
		if (preferredQuality === "flac") {
			qualityOrder.push(
				{
					keys: ["无损FLAC", "母带无损", "Hi-Res无损"],
					ext: "flac",
					name: "FLAC",
				},
				{ keys: ["MP3 320"], ext: "mp3", name: "MP3 320k" },
				{ keys: ["MP3 128"], ext: "mp3", name: "MP3 128k" },
				{ keys: ["OGG 320", "OGG 192"], ext: "ogg", name: "OGG" },
				{ keys: ["AAC 192", "AAC 96"], ext: "m4a", name: "AAC" },
			);
		} else if (preferredQuality === "128") {
			qualityOrder.push(
				{ keys: ["MP3 128"], ext: "mp3", name: "MP3 128k" },
				{ keys: ["MP3 320"], ext: "mp3", name: "MP3 320k" },
				{ keys: ["AAC 192", "AAC 96"], ext: "m4a", name: "AAC" },
				{ keys: ["OGG 320", "OGG 192"], ext: "ogg", name: "OGG" },
				{ keys: ["无损FLAC"], ext: "flac", name: "FLAC" },
			);
		} else {
			// default: MP3 320
			qualityOrder.push(
				{ keys: ["MP3 320"], ext: "mp3", name: "MP3 320k" },
				{
					keys: ["无损FLAC", "母带无损", "Hi-Res无损"],
					ext: "flac",
					name: "FLAC",
				},
				{ keys: ["MP3 128"], ext: "mp3", name: "MP3 128k" },
				{ keys: ["OGG 320", "OGG 192"], ext: "ogg", name: "OGG" },
				{ keys: ["AAC 192", "AAC 96"], ext: "m4a", name: "AAC" },
			);
		}

		for (const candidate of qualityOrder) {
			for (const key of candidate.keys) {
				if (audioLinks[key]) {
					return {
						url: audioLinks[key],
						ext: candidate.ext,
						qualityName: candidate.name,
					};
				}
			}
		}

		// Fallback to any audio link except preview
		for (const [key, url] of Object.entries(audioLinks)) {
			if (key.includes("30s") || key.includes("preview")) continue;
			if (url) {
				const ext = url.includes(".flac")
					? "flac"
					: url.includes(".ogg")
						? "ogg"
						: url.includes(".m4a")
							? "m4a"
							: "mp3";
				return { url, ext, qualityName: key };
			}
		}

		if (audioLinks["30s 18"]) {
			return {
				url: audioLinks["30s 18"],
				ext: "mp3",
				qualityName: "Preview (30s)",
			};
		}

		return null;
	},

	/**
	 * Convenience helper: search JOOX by song title & artist, fetch detail, and download audio blob.
	 */
	async searchAndGetAudio(
		title: string,
		artist: string,
		token: string = DEFAULT_JOOX_TOKEN,
		preferredQuality = "320",
		provider?: string,
	): Promise<{
		audioBlob: Blob;
		fileName: string;
		qualityName: string;
	} | null> {
		const cleanTitle = title.trim();
		const cleanArtist = artist.trim();
		if (!cleanTitle && !cleanArtist) return null;

		const targetProvider = provider === "builtin" ? "all" : provider;

		// 1. Deezer / DM (https://dm.rmmreviv.al)
		if (!targetProvider || targetProvider === "all" || targetProvider === "dm") {
			try {
				const { DmApi } = await import("$/modules/dm/api/client");
				const dmResult = await DmApi.searchAndGetAudio(
					cleanTitle,
					cleanArtist,
					preferredQuality,
				);
				if (dmResult) return dmResult;
			} catch (dmErr) {
				console.warn("DM (Deezer) audio search failed, trying fallback:", dmErr);
			}
			if (targetProvider === "dm") return null;
		}

		// 2. Direct Kuwo Music
		if (targetProvider === "kuwo") {
			try {
				const { KuwoApi } = await import("$/modules/kuwo/api/client");
				return await KuwoApi.searchAndGetAudio(
					cleanTitle,
					cleanArtist,
					preferredQuality,
				);
			} catch (kuwoErr) {
				console.warn("Kuwo Music audio search failed:", kuwoErr);
				return null;
			}
		}

		// 3. Direct QQ Music
		if (targetProvider === "qq") {
			try {
				const { QqMusicApi } = await import("$/modules/qqmusic/api/client");
				return await QqMusicApi.searchAndGetAudio(
					cleanTitle,
					cleanArtist,
					preferredQuality,
				);
			} catch (qqErr) {
				console.warn("QQ Music audio search failed:", qqErr);
				return null;
			}
		}

		// 4. JOOX search
		if (!targetProvider || targetProvider === "all" || targetProvider === "joox") {
			let activeQuery =
				cleanArtist && cleanTitle
					? `${cleanArtist} ${cleanTitle}`
					: cleanTitle || cleanArtist;

			let tracks: JooxTrack[] = [];
			try {
				tracks = await this.search(activeQuery, token);
			} catch {
				// Continue to fallback search or Kuwo
			}

			// Fallback search only if first query returned zero results
			if (tracks.length === 0 && cleanArtist && cleanTitle) {
				try {
					activeQuery = cleanTitle;
					tracks = await this.search(activeQuery, token);
				} catch {
					// Continue to Kuwo fallback
				}
			}

			if (tracks.length > 0) {
				// Score candidates in memory (instant)
				const scoredCandidates = tracks
					.map((track) => ({
						track,
						score: scoreCandidateTrack(track, cleanTitle, cleanArtist),
					}))
					.filter((c) => c.score > 0)
					.sort((a, b) => b.score - a.score);

				// Try only the top matching candidates (up to 3)
				for (const { track } of scoredCandidates.slice(0, 3)) {
					try {
						const detail = await this.getDetail(activeQuery, track.index, token);
						const bestAudio = this.getBestAudioUrl(
							detail.播放链接,
							preferredQuality,
						);
						if (bestAudio) {
							const audioBlob = await this.downloadAudioBlob(bestAudio.url);
							(audioBlob as any).isAutoDownloaded = true;
							const outArtist = cleanArtist || track.artist || "";
							const outTitle = cleanTitle || track.name || "";
							const fileName = (
								outArtist
									? `${outArtist} - ${outTitle}`
									: outTitle
							)
								? `${outArtist ? `${outArtist} - ` : ""}${outTitle}.${bestAudio.ext}`
										.replace(/[/\\?%*:|"<>]/g, "-")
										.trim()
								: `audio.${bestAudio.ext}`;
							return {
								audioBlob,
								fileName,
								qualityName: bestAudio.qualityName,
							};
						}
					} catch {
						// Try next candidate
					}
				}
			}
			if (targetProvider === "joox") return null;
		}

		// 5. Fallback to Kuwo Music (fast and comprehensive)
		try {
			const { KuwoApi } = await import("$/modules/kuwo/api/client");
			const kuwoResult = await KuwoApi.searchAndGetAudio(
				cleanTitle,
				cleanArtist,
				preferredQuality,
			);
			if (kuwoResult) return kuwoResult;
		} catch (kuwoErr) {
			console.warn("Kuwo Music audio fallback failed:", kuwoErr);
		}

		// 6. Fallback to QQ Music
		try {
			const { QqMusicApi } = await import("$/modules/qqmusic/api/client");
			const qqResult = await QqMusicApi.searchAndGetAudio(
				cleanTitle,
				cleanArtist,
				preferredQuality,
			);
			if (qqResult) return qqResult;
		} catch (qqErr) {
			console.warn("QQ Music audio fallback failed:", qqErr);
		}

		return null;
	},
};
