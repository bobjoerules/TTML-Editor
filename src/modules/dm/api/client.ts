import { scoreCandidateTrack } from "$/modules/joox/api/client";
import type { JooxTrack } from "$/modules/joox/types";
import { binaryToBlob } from "$/utils/binaryBlob";
import type { DmSearchResponse, DmTrackItem } from "../types";

export const DM_BASE_URL = "https://dm.rmmreviv.al";

const isTauriEnv = () =>
	typeof window !== "undefined" &&
	(!!(window as unknown as { __TAURI__?: unknown }).__TAURI__ ||
		!!(window as unknown as { __TAURI_INTERNALS__?: unknown })
			.__TAURI_INTERNALS__ ||
		!!import.meta.env.TAURI_ENV_PLATFORM);

export function formatDurationSeconds(sec: number | string): string {
	const total = typeof sec === "number" ? sec : parseInt(String(sec), 10);
	if (isNaN(total) || total <= 0) return "";
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

async function fetchDmJson<T = unknown>(url: string): Promise<T> {
	if (isTauriEnv()) {
		try {
			const { invoke } = await import("@tauri-apps/api/core");
			const raw = await invoke<string>("fetch_url", { url });
			return JSON.parse(raw);
		} catch (tauriErr) {
			console.warn("Tauri fetch_url failed for DM API, falling back:", tauriErr);
		}
	}

	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
		if (res.ok) {
			return (await res.json()) as T;
		}
	} catch (err) {
		console.warn("Direct fetch to DM API failed, trying proxy fallback:", err);
	}

	const encoded = encodeURIComponent(url);
	const proxies = [
		`https://api.allorigins.win/raw?url=${encoded}`,
		`https://corsproxy.io/?${encoded}`,
	];
	for (const proxy of proxies) {
		try {
			const proxyRes = await fetch(proxy, {
				signal: AbortSignal.timeout(10000),
			});
			if (proxyRes.ok) return (await proxyRes.json()) as T;
		} catch {
			// continue
		}
	}

	throw new Error("Failed to connect to DM Audio API");
}

export const DmApi = {
	/**
	 * Search for songs on dm.rmmreviv.al.
	 * Query parameter is `?q=${query}` (artist title or song name).
	 */
	async search(query: string): Promise<JooxTrack[]> {
		const cleanQuery = query.trim();
		if (!cleanQuery) return [];

		const url = `${DM_BASE_URL}/?q=${encodeURIComponent(cleanQuery)}`;

		try {
			const json = await fetchDmJson<DmSearchResponse>(url);

			if (!json || json.error || !Array.isArray(json.data)) {
				return [];
			}

			return json.data
				.filter((item): item is DmTrackItem => Boolean(item && item.title))
				.map((item, idx) => ({
					id: String(item.id),
					index: idx,
					name: item.title,
					artist: item.artist,
					album: item.album,
					duration: formatDurationSeconds(item.duration),
					cover: item.cover,
					source: "Deezer",
					downloadUrl:
						item.downloadUrl ||
						`${DM_BASE_URL}/download?id=${encodeURIComponent(String(item.id))}`,
					rank: item.rank,
				}));
		} catch (err) {
			console.warn("DM search failed:", err);
			return [];
		}
	},

	/**
	 * Get the direct download URL for a track ID or download URL.
	 */
	getDownloadUrl(idOrUrl: string | number): string {
		const str = String(idOrUrl).trim();
		if (str.startsWith("http://") || str.startsWith("https://")) {
			return str;
		}
		return `${DM_BASE_URL}/download?id=${encodeURIComponent(str)}`;
	},

	/**
	 * Download audio binary as a Blob reliably.
	 * Endpoint: /download?id=id
	 */
	async downloadAudioBlob(idOrUrl: string | number): Promise<Blob> {
		const url = this.getDownloadUrl(idOrUrl);
		const mime = "audio/mpeg";

		// 1. Native Tauri fetch_binary first on desktop (zero CORS & COEP)
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
					"Tauri fetch_binary failed for DM audio, trying web fetch:",
					tauriErr,
				);
			}
		}

		// 2. Direct web fetch (dm.rmmreviv.al supplies access-control-allow-origin: *)
		try {
			const res = await fetch(url, { signal: AbortSignal.timeout(35000) });
			if (res.ok) {
				const blob = await res.blob();
				if (blob.size > 0) {
					return blob.type && blob.type.startsWith("audio/")
						? blob
						: new Blob([blob], { type: mime });
				}
			}
		} catch (err) {
			console.warn("Direct fetch failed for DM audio stream:", err);
		}

		// 3. Web proxy fallback
		const encoded = encodeURIComponent(url);
		const corsProxies = [
			`https://api.allorigins.win/raw?url=${encoded}`,
			`https://corsproxy.io/?${encoded}`,
		];
		for (const proxy of corsProxies) {
			try {
				const proxyRes = await fetch(proxy, {
					signal: AbortSignal.timeout(45000),
				});
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

		throw new Error("Failed to download audio from dm.rmmreviv.al");
	},

	/**
	 * Automatically search dm.rmmreviv.al and retrieve audio blob for a song.
	 */
	async searchAndGetAudio(
		title: string,
		artist: string,
		_preferredQuality = "320",
	): Promise<{
		audioBlob: Blob;
		fileName: string;
		qualityName: string;
	} | null> {
		const cleanTitle = title.trim();
		const cleanArtist = artist.trim();
		if (!cleanTitle && !cleanArtist) return null;

		// As requested: ?q=query (artist title)
		const activeQuery =
			cleanArtist && cleanTitle
				? `${cleanArtist} ${cleanTitle}`
				: cleanTitle || cleanArtist;

		let candidates: JooxTrack[] = [];
		try {
			candidates = await this.search(activeQuery);
		} catch {
			return null;
		}

		// If 0 results, try title then artist
		if (candidates.length === 0 && cleanTitle && cleanArtist) {
			try {
				candidates = await this.search(`${cleanTitle} ${cleanArtist}`);
			} catch {
				return null;
			}
		}

		if (candidates.length === 0 && cleanTitle) {
			try {
				candidates = await this.search(cleanTitle);
			} catch {
				return null;
			}
		}

		if (candidates.length === 0) return null;

		// Score candidates in memory based on title, artist, and track rank/popularity
		const scored = candidates
			.map((track) => {
				let score = scoreCandidateTrack(track, cleanTitle, cleanArtist);
				if (score > 0 && track.rank) {
					// Slight boost for highly popular tracks to avoid karaoke/tribute versions
					score += Math.min(10, Math.floor(track.rank / 100000));
				}
				return { track, score };
			})
			.filter((c) => c.score > 0)
			.sort((a, b) => b.score - a.score);

		if (scored.length === 0) return null;

		for (const { track } of scored.slice(0, 3)) {
			try {
				const audioBlob = await this.downloadAudioBlob(track.id);
				(audioBlob as any).isAutoDownloaded = true;
				const outArtist = cleanArtist || track.artist || "";
				const outTitle = cleanTitle || track.name || "audio";
				const fileName = (outArtist ? `${outArtist} - ${outTitle}` : outTitle)
					? `${outArtist ? `${outArtist} - ` : ""}${outTitle}.mp3`
							.replace(/[/\\?%*:|"<>]/g, "-")
							.trim()
					: "audio.mp3";

				return {
					audioBlob,
					fileName,
					qualityName: "MP3 128k",
				};
			} catch {
				// try next candidate
			}
		}

		return null;
	},
};

