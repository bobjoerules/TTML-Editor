/**
 * Cloudflare Worker for AMLL TTML Tool
 *
 * 1. Discord Component Embeds & Open Graph tags:
 *    - /stats or /leaderboard: Community Leaderboard Embed
 *    - /user/:uid or /u/:uid: User Profile Embed
 *    - /song/:id or /track/:id: Song Preview Embed
 *
 * 2. Human browser fallbacks:
 *    - Transparent pass-through / proxy to SPA site origin
 */

const FIRESTORE_BASE =
	"https://firestore.googleapis.com/v1/projects/amll-ttml/databases/(default)/documents";
const SITE_ORIGIN = "https://ttml.bobjoerules.com";
const EDITOR_ORIGIN = "https://ttmleditor.com";
const GITHUB_REPO = "https://github.com/bobjoerules/AMLL-TTML-TOOL";
const DEFAULT_ICON = "https://ttml.bobjoerules.com/apple-touch-icon.png";

export default {
	async fetch(request, _env, _ctx) {
		const url = new URL(request.url);
		const userAgent = request.headers.get("User-Agent") || "";
		const isBot =
			/Discordbot|Twitterbot|facebookexternalhit|Slackbot|LinkedInBot|TelegramBot|WhatsApp|Googlebot|bingbot|yandex|baiduspider|DuckDuckBot|Applebot|Sogou|Exabot|facebot|ia_archiver/i.test(
				userAgent,
			);

		const pathname = url.pathname.replace(/\/+$/, "") || "/";

		// 0. Dynamic Sitemap Route (/sitemap.xml)
		if (pathname === "/sitemap.xml") {
			return handleDynamicSitemap(request);
		}

		// 1. Leaderboard / Stats Route (/stats or /leaderboard)
		if (pathname === "/stats" || pathname === "/leaderboard") {
			if (!isBot) {
				return fetch(new Request(`${SITE_ORIGIN}/`, request));
			}
			return handleStatsEmbed(request);
		}

		// 2. User Profile Route (/user/:uid or /u/:uid)
		const userMatch = pathname.match(/^\/(?:user|u)\/([^/]+)$/);
		if (userMatch) {
			const uid = decodeURIComponent(userMatch[1]);
			if (!isBot) {
				return fetch(new Request(`${SITE_ORIGIN}/`, request));
			}
			return handleUserProfileEmbed(request, uid);
		}

		// 3. Song Preview Route (/song/:id, /track/:id, /s/:id)
		const songMatch = pathname.match(/^\/(?:song|track|s)\/([^/]+)$/);
		if (songMatch) {
			const songId = decodeURIComponent(songMatch[1]);
			if (!isBot) {
				return fetch(new Request(`${SITE_ORIGIN}/finished`, request));
			}
			return handleSongEmbed(request, songId);
		}

		// 4. Direct TTML Download API (/api/songs/:id/ttml)
		const apiMatch = pathname.match(/^\/api\/songs\/([^/]+)\/ttml$/);
		if (apiMatch) {
			const songId = decodeURIComponent(apiMatch[1]);
			return handleSongDownload(songId);
		}

		// Default pass-through to origin or static website
		return fetch(request);
	},
};

/* ==========================================================================
   Firestore Helpers
   ========================================================================== */

/**
 * Parses raw Firestore document into a clean Song object
 */
function parseFirestoreSongDoc(doc, { includeRaw = false } = {}) {
	const f = doc?.fields || {};
	const id = doc?.name ? doc.name.split("/").pop() : "";
	const rawTTML = f.rawTTML?.stringValue || null;

	let coverArt = f.coverArt?.stringValue || null;
	if (!coverArt && rawTTML) {
		const match =
			rawTTML.match(/key=["']cover(?:_art)?["'][^>]*value=["']([^"']+)["']/i) ||
			rawTTML.match(
				/<amll:meta[^>]*key=["']cover(?:_art)?["'][^>]*>([^<]+)<\/amll:meta>/i,
			) ||
			rawTTML.match(/https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|webp)/i);
		if (match?.[1] || match?.[0]) {
			coverArt = match[1] || match[0];
		}
	}

	let title = f.title?.stringValue || "Untitled";
	let artist = f.artist?.stringValue || "Unknown Artist";
	const album = f.album?.stringValue || "";

	if (title === "Untitled" && rawTTML) {
		const titleMatch = rawTTML.match(/<ttm:title>([^<]+)<\/ttm:title>/i);
		if (titleMatch) title = titleMatch[1];
	}
	if (artist === "Unknown Artist" && rawTTML) {
		const artistMatch = rawTTML.match(
			/<ttm:agent[^>]*type=["']person["'][^>]*>([^<]+)<\/ttm:agent>/i,
		);
		if (artistMatch) artist = artistMatch[1];
	}

	const tags =
		f.tags?.arrayValue?.values?.map((v) => v.stringValue).filter(Boolean) || [];
	const lineCount = parseInt(f.lineCount?.integerValue || "0", 10);
	const durationMs = parseInt(f.durationMs?.integerValue || "0", 10);
	const createdAt =
		parseInt(f.createdAt?.integerValue || "0", 10) ||
		(doc.createTime ? new Date(doc.createTime).getTime() : 0);
	const updatedAt =
		parseInt(f.updatedAt?.integerValue || "0", 10) ||
		(doc.updateTime ? new Date(doc.updateTime).getTime() : createdAt);

	const isPublishedExplicit = f.publishedToCommunity?.booleanValue;
	const publishedToCommunity =
		isPublishedExplicit === true || tags.includes("community");

	const song = {
		id,
		title,
		artist,
		album,
		coverArt,
		lineCount,
		durationMs,
		authorUid: f.authorUid?.stringValue || "community",
		authorName: f.authorName?.stringValue || "Anonymous",
		hasAudio: Boolean(f.hasAudio?.booleanValue),
		audioUrl: f.audioUrl?.stringValue || null,
		audioFileName: f.audioFileName?.stringValue || null,
		audioSize: f.audioSize?.integerValue
			? parseInt(f.audioSize.integerValue, 10)
			: null,
		tags,
		finished: Boolean(f.finished?.booleanValue ?? true),
		publishedToCommunity,
		createdAt,
		updatedAt,
	};

	if (includeRaw) {
		song.rawTTML = rawTTML;
	}

	return song;
}

/**
 * Normalizes title / artist for robust song deduplication
 */
function normalizeSongKey(str) {
	return (str || "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[’'`´"]/g, "")
		.replace(/&/g, "and")
		.replace(/[\s\-_.,/\\()[\]{}!?:;+*]/g, "");
}

function getSongKey(title, artist) {
	return `${normalizeSongKey(title)}:::${normalizeSongKey(artist)}`;
}

/**
 * Deduplicates songs by title and artist, retaining the latest / richest version
 */
function deduplicateAndMergeSongs(songs) {
	const latestBySong = new Map();

	for (const item of songs) {
		const key = getSongKey(item.title, item.artist);
		const existing = latestBySong.get(key);

		if (!existing) {
			latestBySong.set(key, { ...item });
			continue;
		}

		const itemTime = item.updatedAt || item.createdAt || 0;
		const existingTime = existing.updatedAt || existing.createdAt || 0;

		if (itemTime > existingTime) {
			const merged = { ...item };
			if (!merged.rawTTML && existing.rawTTML) {
				merged.rawTTML = existing.rawTTML;
			}
			latestBySong.set(key, merged);
		} else if (itemTime === existingTime) {
			const hasBetterContent =
				(item.lineCount || 0) > (existing.lineCount || 0) ||
				(item.rawTTML?.length || 0) > (existing.rawTTML?.length || 0);

			if (hasBetterContent) {
				const merged = { ...item };
				if (!merged.rawTTML && existing.rawTTML) {
					merged.rawTTML = existing.rawTTML;
				}
				latestBySong.set(key, merged);
			} else if (!existing.rawTTML && item.rawTTML) {
				existing.rawTTML = item.rawTTML;
			}
		} else {
			if (!existing.rawTTML && item.rawTTML) {
				existing.rawTTML = item.rawTTML;
			}
		}
	}

	return Array.from(latestBySong.values()).sort(
		(a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0),
	);
}

/**
 * Fetches all documents from a Firestore collection, handling pagination
 */
async function fetchAllDocumentsInCollection(collectionName) {
	const allDocs = [];
	let pageToken = "";
	const maxPages = 10;
	let pages = 0;

	while (pages < maxPages) {
		pages++;
		const url = `${FIRESTORE_BASE}/${collectionName}?pageSize=300${
			pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""
		}`;
		const res = await fetch(url, {
			cf: { cacheTtl: 60, cacheEverything: true },
		})
			.then((r) => (r.ok ? r.json() : null))
			.catch(() => null);

		if (res?.documents?.length) {
			allDocs.push(...res.documents);
		}
		if (res?.nextPageToken) {
			pageToken = res.nextPageToken;
		} else {
			break;
		}
	}
	return allDocs;
}

/**
 * Fetches all public song documents from finished_ttmls and public_ttmls collections
 */
async function fetchAllPublicSongs({ includeRaw = false, dedupe = true } = {}) {
	const [finishedDocs, publicDocs] = await Promise.all([
		fetchAllDocumentsInCollection("finished_ttmls"),
		fetchAllDocumentsInCollection("public_ttmls"),
	]);

	const docsById = new Map();
	for (const doc of finishedDocs) {
		const id = doc?.name ? doc.name.split("/").pop() : "";
		if (id) docsById.set(id, doc);
	}
	for (const doc of publicDocs) {
		const id = doc?.name ? doc.name.split("/").pop() : "";
		if (id && !docsById.has(id)) {
			docsById.set(id, doc);
		}
	}

	const rawSongs = Array.from(docsById.values())
		.map((d) => parseFirestoreSongDoc(d, { includeRaw }))
		.filter((s) => s.publishedToCommunity);

	if (dedupe) {
		return deduplicateAndMergeSongs(rawSongs);
	}
	return rawSongs;
}

/**
 * Fetches an individual song by ID with complete rawTTML
 */
async function fetchPublicSongById(id) {
	// 1. Try finished_ttmls
	let resp = await fetch(
		`${FIRESTORE_BASE}/finished_ttmls/${encodeURIComponent(id)}`,
		{
			cf: { cacheTtl: 60, cacheEverything: true },
		},
	);

	if (!resp.ok && resp.status === 404) {
		// 2. Try public_ttmls
		resp = await fetch(
			`${FIRESTORE_BASE}/public_ttmls/${encodeURIComponent(id)}`,
			{
				cf: { cacheTtl: 60, cacheEverything: true },
			},
		);
	}

	if (!resp.ok) return null;
	const doc = await resp.json();
	const song = parseFirestoreSongDoc(doc, { includeRaw: true });

	// Ensure song is publicly opted-in
	if (!song || !song.publishedToCommunity) return null;

	// If rawTTML is missing, attempt to fetch from user subcollection payload
	if (!song.rawTTML && song.authorUid && song.id) {
		try {
			const payloadResp = await fetch(
				`${FIRESTORE_BASE}/users/${encodeURIComponent(song.authorUid)}/ttmls/${encodeURIComponent(song.id)}/payload/content`,
				{ cf: { cacheTtl: 60, cacheEverything: true } },
			);
			if (payloadResp.ok) {
				const payloadDoc = await payloadResp.json();
				const payloadTTML = payloadDoc.fields?.rawTTML?.stringValue;
				if (payloadTTML) {
					song.rawTTML = payloadTTML;
				}
			}
		} catch {
			// ignore
		}
	}

	return song;
}

/**
 * Fetches user profile map keyed by UID from Firestore
 */
async function fetchUserMap() {
	try {
		const resp = await fetch(`${FIRESTORE_BASE}/users?pageSize=300`, {
			cf: { cacheTtl: 60, cacheEverything: true },
		});
		if (!resp.ok) return new Map();
		const data = await resp.json();
		const map = new Map();
		for (const doc of data?.documents || []) {
			const uid = doc?.name ? doc.name.split("/").pop() : "";
			if (!uid) continue;
			const f = doc.fields || {};
			map.set(uid, {
				uid,
				displayName: f.displayName?.stringValue || null,
				photoURL: f.photoURL?.stringValue || null,
			});
		}
		return map;
	} catch (err) {
		console.error("fetchUserMap error:", err);
		return new Map();
	}
}

/**
 * Handles raw TTML download requests
 */
async function handleSongDownload(songId) {
	try {
		const song = await fetchPublicSongById(songId);
		if (!song || !song.rawTTML) {
			return new Response("TTML lyrics not found", {
				status: 404,
				headers: { "Content-Type": "text/plain; charset=utf-8" },
			});
		}
		const fileName = `${song.artist} - ${song.title}.ttml`.replace(/[\\/:*?"<>|]/g, "_");
		return new Response(song.rawTTML, {
			headers: {
				"Content-Type": "application/xml; charset=utf-8",
				"Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
				"Access-Control-Allow-Origin": "*",
				"Cache-Control": "public, max-age=3600, s-maxage=3600",
			},
		});
	} catch (err) {
		console.error("Song download error:", err);
		return new Response("Failed to fetch song TTML", {
			status: 500,
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	}
}


/* ==========================================================================
   Discord Component Embed Handlers
   ========================================================================== */

/**
 * Handles generating dynamic Discord Component Embed for a specific public song
 */
async function handleSongEmbed(_request, songId) {
	try {
		const song = await fetchPublicSongById(songId);
		if (!song) {
			return fallbackResponse("Public TTML Song", `${SITE_ORIGIN}/finished`);
		}

		const payload = {
			component: {
				type: 17,
				accent_color: 16395592, // #FA2D48
				spoiler: false,
				components: [
					{
						type: 9,
						components: [
							{
								type: 10,
								content: `-# COMMUNITY TTML LYRICS\n## **${escapeDiscordText(song.title)}**\n**${escapeDiscordText(song.artist)}**${song.album ? ` · *${escapeDiscordText(song.album)}*` : ""}\n**${song.lineCount}** timed lines · Synchronized by **${escapeDiscordText(song.authorName)}**`,
							},
						],
						accessory: {
							type: 11,
							media: { url: song.coverArt || DEFAULT_ICON },
						},
					},
					{ type: 14 },
					{
						type: 1,
						components: [
							{
								type: 2,
								style: 5,
								label: "Download TTML",
								url: `${SITE_ORIGIN}/api/songs/${encodeURIComponent(song.id)}/ttml`,
							},
							{
								type: 2,
								style: 5,
								label: "View in Library",
								url: `${SITE_ORIGIN}/finished`,
							},
							{
								type: 2,
								style: 5,
								label: "Web Editor",
								url: `${EDITOR_ORIGIN}/`,
							},
						],
					},
					{
						type: 10,
						content: `-# ${SITE_ORIGIN.replace("https://", "")} · Syllable-synced Apple Music TTML`,
					},
				],
			},
		};

		const jsonLd = {
			"@context": "https://schema.org",
			"@type": "MusicRecording",
			name: song.title,
			byArtist: {
				"@type": "MusicGroup",
				name: song.artist,
			},
			...(song.album ? { inAlbum: { "@type": "MusicAlbum", name: song.album } } : {}),
			url: `${SITE_ORIGIN}/song/${encodeURIComponent(song.id)}`,
			image: song.coverArt || DEFAULT_ICON,
			...(song.durationMs ? { duration: `PT${Math.round(song.durationMs / 1000)}S` } : {}),
			recordingOf: {
				"@type": "MusicComposition",
				name: song.title,
				lyricist: {
					"@type": "Person",
					name: song.authorName,
				},
			},
		};

		const bodyContent = `
<header>
  <nav><a href="${SITE_ORIGIN}/">← AMLL TTML Community Hub</a> | <a href="${SITE_ORIGIN}/finished">Browse Lyrics</a></nav>
  <h1>${escapeHtml(song.title)} — ${escapeHtml(song.artist)}</h1>
  ${song.album ? `<p><strong>Album:</strong> ${escapeHtml(song.album)}</p>` : ""}
</header>
<main>
  <p><strong>Synchronization:</strong> ${song.lineCount} timed lines of Apple Music style syllable TTML lyrics.</p>
  <p><strong>Synchronized by:</strong> <a href="${SITE_ORIGIN}/user/${encodeURIComponent(song.authorUid)}">${escapeHtml(song.authorName)}</a></p>
  <div style="margin: 24px 0;">
    <a href="${SITE_ORIGIN}/api/songs/${encodeURIComponent(song.id)}/ttml" style="display: inline-block; padding: 10px 20px; background: #fa2d48; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">Download TTML Lyrics</a>
    <a href="${SITE_ORIGIN}/finished" style="display: inline-block; margin-left: 12px; padding: 10px 20px; background: #333; color: #fff; text-decoration: none; border-radius: 8px;">View in Library</a>
    <a href="${EDITOR_ORIGIN}/" style="display: inline-block; margin-left: 12px; padding: 10px 20px; background: #18a058; color: #fff; text-decoration: none; border-radius: 8px;">Open Web Editor</a>
  </div>
</main>`;

		return renderHtmlResponse({
			title: `${song.title} — ${song.artist} | AMLL TTML Lyrics`,
			description: `${song.title} by ${song.artist} — ${song.lineCount} timed lyric lines synchronized by ${song.authorName} on AMLL TTML Tool.`,
			url: `${SITE_ORIGIN}/song/${encodeURIComponent(song.id)}`,
			imageUrl: song.coverArt || DEFAULT_ICON,
			ogType: "music.song",
			themeColor: "#FA2D48",
			jsonLd,
			bodyContent,
			payload,
		});
	} catch (err) {
		console.error("Song embed error:", err);
		return fallbackResponse("Public TTML Song", `${SITE_ORIGIN}/finished`);
	}
}

/**
 * Handles generating dynamic Discord Component Embed for the Community Leaderboard
 */
async function handleStatsEmbed(_request) {
	try {
		const [songs, userMap] = await Promise.all([
			fetchAllPublicSongs({
				includeRaw: true,
				dedupe: true,
			}),
			fetchUserMap(),
		]);

		const creatorMap = new Map();
		let totalLines = 0;
		let totalWordSync = 0;

		for (const s of songs) {
			const authorUid =
				s.authorUid ||
				(s.authorName ? `author:${s.authorName.toLowerCase()}` : "community");
			const lines = s.lineCount || 0;

			totalLines += lines;

			if (
				s.rawTTML &&
				(/itunes:timing=["']Word["']/i.test(s.rawTTML) ||
					/<span\b[^>]*\bbegin=/i.test(s.rawTTML))
			) {
				totalWordSync++;
			}

			const userDoc = s.authorUid ? userMap.get(s.authorUid) : null;
			const displayName =
				userDoc?.displayName ||
				s.authorName ||
				(s.authorUid
					? `Creator (${s.authorUid.slice(0, 6)})`
					: "Community Creator");

			if (!creatorMap.has(authorUid)) {
				creatorMap.set(authorUid, {
					uid: s.authorUid || authorUid,
					name: displayName,
					songs: 0,
					lines: 0,
				});
			}
			const creator = creatorMap.get(authorUid);
			creator.songs += 1;
			creator.lines += lines;
			if (userDoc?.displayName) creator.name = userDoc.displayName;
			else if (s.authorName && creator.name === "Community Creator")
				creator.name = s.authorName;
		}

		const creators = Array.from(creatorMap.values())
			.filter((c) => {
				const name = (c.name || "").toLowerCase();
				const uid = (c.uid || "").toLowerCase();
				return (
					!name.includes("copilot") &&
					!uid.includes("copilot") &&
					!name.includes("codebuff") &&
					!uid.includes("codebuff")
				);
			})
			.sort((a, b) => b.songs - a.songs || b.lines - a.lines);
		const topCreators = creators.slice(0, 3);
		const medals = ["🥇", "🥈", "🥉"];

		let leaderboardText = topCreators
			.map(
				(c, i) =>
					`${medals[i]} **${escapeDiscordText(c.name)}** — ${c.songs} songs (${c.lines.toLocaleString()} lines)`,
			)
			.join("\n");
		if (!leaderboardText) {
			leaderboardText =
				"Community contributions are growing! Be the first to appear on the leaderboard.";
		}

		const payload = {
			component: {
				type: 17,
				accent_color: 16395592, // #FA2D48
				spoiler: false,
				components: [
					{
						type: 9,
						components: [
							{
								type: 10,
								content: `-# COMMUNITY LEADERBOARD\n## **AMLL TTML Lyric Contributors**\n**${songs.length}** finished songs · **${totalLines.toLocaleString()}** timed lines · **${totalWordSync}** word-synced · **${creators.length}** creators`,
							},
						],
						accessory: {
							type: 11,
							media: { url: DEFAULT_ICON },
						},
					},
					{ type: 14 },
					{
						type: 9,
						components: [
							{
								type: 10,
								content: `**Top Lyric Contributors**\n${leaderboardText}`,
							},
						],
						accessory: {
							type: 2,
							style: 5,
							label: "Leaderboard",
							url: `${SITE_ORIGIN}/stats`,
						},
					},
					{ type: 14 },
					{
						type: 1,
						components: [
							{
								type: 2,
								style: 5,
								label: "View Full Rankings",
								url: `${SITE_ORIGIN}/stats`,
							},
							{
								type: 2,
								style: 5,
								label: "Open Editor",
								url: `${EDITOR_ORIGIN}/`,
							},
							{
								type: 2,
								style: 5,
								label: "GitHub",
								url: GITHUB_REPO,
							},
						],
					},
					{
						type: 10,
						content: `-# ${SITE_ORIGIN.replace("https://", "")}/stats · Live community metrics`,
					},
				],
			},
		};

		const jsonLd = {
			"@context": "https://schema.org",
			"@type": "CollectionPage",
			name: "Community Leaderboard — AMLL TTML Tool",
			description: `${songs.length} songs synced across ${creators.length} contributors. View top lyric timing creators.`,
			url: `${SITE_ORIGIN}/stats`,
		};

		const bodyContent = `
<header>
  <nav><a href="${SITE_ORIGIN}/">← AMLL TTML Community Hub</a> | <a href="${SITE_ORIGIN}/finished">Browse Lyrics</a></nav>
  <h1>Community Leaderboard & Statistics — AMLL TTML Tool</h1>
  <p>Live community statistics: <strong>${songs.length}</strong> songs and <strong>${totalLines.toLocaleString()}</strong> lines timed by <strong>${creators.length}</strong> contributors.</p>
</header>
<main>
  <h2>Top Contributors</h2>
  <ol>
    ${creators.slice(0, 25).map((c) => `<li><strong><a href="${SITE_ORIGIN}/user/${encodeURIComponent(c.uid)}">${escapeHtml(c.name)}</a></strong> — ${c.songs} songs (${c.lines.toLocaleString()} lines)</li>`).join("\n")}
  </ol>
</main>`;

		return renderHtmlResponse({
			title: "Community Leaderboard — AMLL TTML Tool",
			description: `${songs.length} songs synced across ${creators.length} contributors. View top lyric timing creators.`,
			url: `${SITE_ORIGIN}/stats`,
			imageUrl: DEFAULT_ICON,
			ogType: "website",
			themeColor: "#FA2D48",
			jsonLd,
			bodyContent,
			payload,
		});
	} catch (err) {
		console.error("Stats embed error:", err);
		return fallbackResponse("Community Leaderboard", `${SITE_ORIGIN}/stats`);
	}
}

/**
 * Handles generating dynamic Discord Component Embed for a specific User Profile
 */
async function handleUserProfileEmbed(_request, uid) {
	try {
		// 1. Fetch user document
		const userPromise = fetch(
			`${FIRESTORE_BASE}/users/${encodeURIComponent(uid)}`,
			{
				cf: { cacheTtl: 60, cacheEverything: true },
			},
		)
			.then((r) => (r.ok ? r.json() : null))
			.catch(() => null);

		// 2. Fetch public songs
		const songsPromise = fetchAllPublicSongs({
			includeRaw: true,
			dedupe: true,
		});

		const [userDoc, allPublicSongs] = await Promise.all([
			userPromise,
			songsPromise,
		]);

		const userFields = userDoc?.fields || {};

		// Calculate user's songs, lines, and global rank
		const creatorMap = new Map();
		const userSongs = [];

		for (const s of allPublicSongs || []) {
			const authorUid = s.authorUid || "community";
			const lines = s.lineCount || 0;
			const authorName = s.authorName || "Anonymous";

			if (!creatorMap.has(authorUid)) {
				creatorMap.set(authorUid, {
					uid: authorUid,
					songs: 0,
					lines: 0,
					name: authorName,
				});
			}
			const c = creatorMap.get(authorUid);
			c.songs += 1;
			c.lines += lines;
			if (s.authorName && s.authorName !== "Anonymous") c.name = s.authorName;

			if (authorUid === uid) {
				userSongs.push({
					title: s.title || "Untitled",
					artist: s.artist || "Unknown Artist",
					lines,
					coverArt: s.coverArt,
					updatedAt: s.updatedAt || s.createdAt || 0,
				});
			}
		}

		const creatorsSorted = Array.from(creatorMap.values())
			.filter((c) => {
				const name = (c.name || "").toLowerCase();
				const uid = (c.uid || "").toLowerCase();
				return (
					!name.includes("copilot") &&
					!uid.includes("copilot") &&
					!name.includes("codebuff") &&
					!uid.includes("codebuff")
				);
			})
			.sort((a, b) => b.songs - a.songs || b.lines - a.lines);
		const rankIndex = creatorsSorted.findIndex((c) => c.uid === uid);
		const rankStr = rankIndex >= 0 ? `#${rankIndex + 1}` : "Contributor";

		const displayName =
			userFields.displayName?.stringValue ||
			userSongs[0]?.artist ||
			`Creator (${uid.slice(0, 6)})`;
		const photoURL = userFields.photoURL?.stringValue || DEFAULT_ICON;

		const totalUserSongs = userSongs.length;
		const totalUserLines = userSongs.reduce((acc, s) => acc + s.lines, 0);

		// Sort songs by newest first
		userSongs.sort((a, b) => b.updatedAt - a.updatedAt);
		const latestSong = userSongs[0];

		const components = [
			{
				type: 9,
				components: [
					{
						type: 10,
						content: `-# CREATOR PROFILE · RANK ${rankStr}\n## **${escapeDiscordText(displayName)}**\nTimed **${totalUserSongs}** songs with **${totalUserLines.toLocaleString()}** lines of syllable-synced lyrics.`,
					},
				],
				accessory: {
					type: 11,
					media: { url: photoURL },
				},
			},
		];

		if (latestSong) {
			components.push(
				{ type: 14 },
				{
					type: 9,
					components: [
						{
							type: 10,
							content: `**Latest Contribution**\n**${escapeDiscordText(latestSong.title)}** — ${escapeDiscordText(latestSong.artist)}\n*${latestSong.lines} lines synchronized*`,
						},
					],
					accessory: {
						type: 2,
						style: 5,
						label: "View Song",
						url: `${SITE_ORIGIN}/user/${encodeURIComponent(uid)}`,
					},
				},
			);
		}

		components.push(
			{ type: 14 },
			{
				type: 1,
				components: [
					{
						type: 2,
						style: 5,
						label: "View Profile",
						url: `${SITE_ORIGIN}/user/${encodeURIComponent(uid)}`,
					},
					{
						type: 2,
						style: 5,
						label: "Leaderboard",
						url: `${SITE_ORIGIN}/stats`,
					},
					{
						type: 2,
						style: 5,
						label: "Web Editor",
						url: `${EDITOR_ORIGIN}/`,
					},
				],
			},
			{
				type: 10,
				content: `-# ${SITE_ORIGIN.replace("https://", "")} · Verified Lyric Creator`,
			},
		);

		const payload = {
			component: {
				type: 17,
				accent_color: 1613912, // #18A058
				spoiler: false,
				components,
			},
		};

		const jsonLd = {
			"@context": "https://schema.org",
			"@type": "ProfilePage",
			mainEntity: {
				"@type": "Person",
				name: displayName,
				url: `${SITE_ORIGIN}/user/${encodeURIComponent(uid)}`,
				...(photoURL ? { image: photoURL } : {}),
				interactionStatistic: [
					{
						"@type": "InteractionCounter",
						interactionType: "https://schema.org/WriteAction",
						userInteractionCount: totalUserSongs,
					},
				],
			},
		};

		const bodyContent = `
<header>
  <nav><a href="${SITE_ORIGIN}/">← AMLL TTML Community Hub</a> | <a href="${SITE_ORIGIN}/stats">Leaderboard</a></nav>
  <h1>${escapeHtml(displayName)} — Creator Profile</h1>
  <p>Rank: <strong>${rankStr}</strong> | Timed: <strong>${totalUserSongs}</strong> songs (<strong>${totalUserLines.toLocaleString()}</strong> lines)</p>
</header>
<main>
  ${latestSong ? `<h2>Latest Contribution</h2><p><strong>${escapeHtml(latestSong.title)}</strong> — ${escapeHtml(latestSong.artist)} (${latestSong.lines} lines)</p>` : ""}
  <p><a href="${SITE_ORIGIN}/user/${encodeURIComponent(uid)}">View All Contributed Songs on AMLL TTML Tool</a></p>
</main>`;

		return renderHtmlResponse({
			title: `${displayName} — Creator Profile`,
			description: `${displayName} has synchronized ${totalUserSongs} songs and ${totalUserLines.toLocaleString()} lines on AMLL TTML Tool.`,
			url: `${SITE_ORIGIN}/user/${encodeURIComponent(uid)}`,
			imageUrl: photoURL || DEFAULT_ICON,
			ogType: "profile",
			themeColor: "#18A058",
			jsonLd,
			bodyContent,
			payload,
		});
	} catch (err) {
		console.error("User embed error:", err);
		return fallbackResponse(
			"Creator Profile",
			`${SITE_ORIGIN}/user/${encodeURIComponent(uid)}`,
		);
	}
}

/**
 * Renders HTML containing Open Graph fallback meta tags, Twitter cards, Schema.org JSON-LD,
 * semantic fallback HTML for search engines, and the Discord Component Embed JSON script
 */
function renderHtmlResponse({
	title,
	description,
	url,
	imageUrl,
	ogType,
	themeColor,
	jsonLd,
	bodyContent,
	payload,
}) {
	const effectiveImage = imageUrl || DEFAULT_ICON;
	const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <link rel="canonical" href="${escapeHtml(url)}" />

  <!-- Open Graph -->
  <meta property="og:site_name" content="AMLL TTML Tool" />
  <meta property="og:type" content="${escapeHtml(ogType || "website")}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:image" content="${escapeHtml(effectiveImage)}" />
  <meta name="theme-color" content="${themeColor || "#18A058"}" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(effectiveImage)}" />

  ${jsonLd ? `<!-- Structured Data (Schema.org) -->\n  <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n  </script>` : ""}

  <!-- Discord Component Embed Payload -->
  <script id="discord:component-embed" type="application/json">
${JSON.stringify(payload, null, 2)}
  </script>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #111; background-color: #fafafa;">
  ${bodyContent || `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><p><a href="${escapeHtml(url)}">Click here to view in AMLL TTML Community Hub</a></p>`}
</body>
</html>`;

	return new Response(html, {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "public, max-age=60, s-maxage=60",
		},
	});
}

/**
 * Dynamically generates an XML sitemap of all public songs and creator profiles
 */
async function handleDynamicSitemap(_request) {
	try {
		const songs = await fetchAllPublicSongs({ includeRaw: false });
		const coreUrls = [
			{ loc: `${SITE_ORIGIN}/`, priority: "1.0", changefreq: "daily" },
			{ loc: `${SITE_ORIGIN}/finished`, priority: "0.9", changefreq: "daily" },
			{ loc: `${SITE_ORIGIN}/stats`, priority: "0.8", changefreq: "daily" },
			{ loc: `${SITE_ORIGIN}/liquid`, priority: "0.8", changefreq: "weekly" },
		];

		const songUrls = [];
		const userSet = new Set();

		for (const song of songs) {
			if (song.id) {
				const lastMod = new Date(song.updatedAt || song.createdAt || Date.now())
					.toISOString()
					.split("T")[0];
				songUrls.push({
					loc: `${SITE_ORIGIN}/song/${encodeURIComponent(song.id)}`,
					lastmod: lastMod,
					priority: "0.7",
					changefreq: "weekly",
				});
			}
			if (song.authorUid && song.authorUid !== "community") {
				userSet.add(song.authorUid);
			}
		}

		const userUrls = Array.from(userSet).map((uid) => ({
			loc: `${SITE_ORIGIN}/user/${encodeURIComponent(uid)}`,
			priority: "0.6",
			changefreq: "weekly",
		}));

		const allUrls = [...coreUrls, ...songUrls, ...userUrls];

		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
	.map(
		(u) => `  <url>
    <loc>${escapeHtml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
	)
	.join("\n")}
</urlset>`;

		return new Response(xml, {
			headers: {
				"Content-Type": "application/xml; charset=utf-8",
				"Cache-Control": "public, max-age=3600, s-maxage=3600",
			},
		});
	} catch (err) {
		console.error("Dynamic sitemap generation error:", err);
		const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_ORIGIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_ORIGIN}/finished</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_ORIGIN}/stats</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_ORIGIN}/liquid</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
		return new Response(fallbackXml, {
			headers: {
				"Content-Type": "application/xml; charset=utf-8",
				"Cache-Control": "public, max-age=3600, s-maxage=3600",
			},
		});
	}
}

function fallbackResponse(title, url) {
	const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta name="theme-color" content="#000000" />
</head>
<body>Redirecting...</body>
</html>`;
	return new Response(html, {
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}

function escapeHtml(str) {
	return String(str || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function escapeDiscordText(str) {
	return String(str || "").replace(/([*_`~|\\])/g, "\\$1");
}
