import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
	type Auth,
	createUserWithEmailAndPassword,
	getAuth,
	onAuthStateChanged,
	signInWithEmailAndPassword,
	signOut,
	type User,
	updateProfile,
} from "firebase/auth";
import {
	collection,
	collectionGroup,
	type DocumentData,
	deleteDoc,
	doc,
	type Firestore,
	getDoc,
	getDocs,
	getFirestore,
	limit,
	query,
	setDoc,
	updateDoc,
} from "firebase/firestore";

export interface FinishedTTML {
	id: string;
	title: string;
	artist: string;
	album?: string;
	coverArt?: string;
	lineCount?: number;
	wordCount?: number;
	durationMs?: number;
	tags?: string[];
	rawTTML?: string;
	isWordSync?: boolean;
	timing?: string;
	authorUid?: string;
	authorName?: string;
	createdAt?: number;
	updatedAt?: number;
	downloadUrl?: string;
	timeSpentSeconds?: number;
}

export function countWordsInTTML(rawTTML: string): number {
	if (!rawTTML) return 0;
	const spanMatches = rawTTML.match(
		/<span\b[^>]*\bbegin=[^>]*>([\s\S]*?)<\/span>/gi,
	);
	if (spanMatches && spanMatches.length > 0) {
		let count = 0;
		for (const span of spanMatches) {
			const text = span.replace(/<[^>]+>/g, "").trim();
			if (text.length > 0) count++;
		}
		if (count > 0) return count;
	}

	const pMatches = rawTTML.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi);
	if (pMatches && pMatches.length > 0) {
		let totalWords = 0;
		for (const p of pMatches) {
			const text = p.replace(/<[^>]+>/g, " ").trim();
			if (text.length > 0) {
				const words = text.split(/\s+/).filter(Boolean);
				totalWords += words.length;
			}
		}
		if (totalWords > 0) return totalWords;
	}

	return 0;
}

export const MODERATOR_UIDS = new Set(["s41Sey8PJUSYHQUsS6aLLb7lsf02"]);

export function isUserModerator(uid?: string | null): boolean {
	return Boolean(uid && MODERATOR_UIDS.has(uid));
}

export function normalizeSongKey(str: string): string {
	return (str || "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[’'`´"]/g, "")
		.replace(/&/g, "and")
		.replace(/[\s\-_.,/\\()[\]{}!?:;+*]/g, "");
}

export function getSongKey(title: string, artist: string): string {
	const nTitle = normalizeSongKey(title);
	const nArtist = normalizeSongKey(artist);
	return `${nTitle}:::${nArtist}`;
}

const FIREBASE_CONFIG = {
	apiKey: "AIzaSyBLreHn7aJHItOdp9Sq8EHEf-cQtKIjvus",
	authDomain: "amll-ttml.firebaseapp.com",
	projectId: "amll-ttml",
	storageBucket: "amll-ttml.firebasestorage.app",
	messagingSenderId: "733113073433",
	appId: "1:733113073433:web:37a70a2f3741dd3847cf88",
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
	if (getApps().length === 0) {
		app = initializeApp(FIREBASE_CONFIG);
	} else {
		app = getApps()[0];
	}
	db = getFirestore(app);
	auth = getAuth(app);
} catch (e) {
	console.warn("Firebase initialization failed:", e);
}

export function getWebsiteAuth(): Auth | null {
	return auth;
}

export async function signInWithEmail(
	email: string,
	pass: string,
): Promise<User> {
	if (!auth) throw new Error("Firebase Auth not initialized");
	const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
	return result.user;
}

export async function signUpWithEmail(
	email: string,
	pass: string,
	displayName?: string,
): Promise<User> {
	if (!auth) throw new Error("Firebase Auth not initialized");
	const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
	if (displayName && result.user) {
		await updateProfile(result.user, { displayName: displayName.trim() });
	}
	return result.user;
}

export async function signOutUser(): Promise<void> {
	if (!auth) return;
	await signOut(auth);
}

export function subscribeToAuth(
	callback: (user: User | null) => void,
): () => void {
	if (!auth) {
		callback(null);
		return () => {};
	}
	return onAuthStateChanged(auth, callback);
}

export async function updateUserProfile(updates: {
	displayName?: string;
	photoURL?: string;
}): Promise<void> {
	if (!auth?.currentUser) throw new Error("Not signed in");
	const user = auth.currentUser;
	await updateProfile(user, updates);
	if (db) {
		await setDoc(
			doc(db, "users", user.uid),
			{ ...updates, updatedAt: Date.now() },
			{ merge: true },
		).catch(() => {});
	}
}

export async function removeFromFinishedList(
	ttml: FinishedTTML,
	currentUserUid: string,
): Promise<void> {
	if (!db) throw new Error("Database not connected");
	const isOwner = Boolean(ttml.authorUid && ttml.authorUid === currentUserUid);
	const isMod = isUserModerator(currentUserUid);

	if (!isOwner && !isMod) {
		throw new Error(
			"You do not have permission to remove this song from the Finished list.",
		);
	}

	// 1. Delete from public finished lists
	await Promise.all([
		deleteDoc(doc(db, "finished_ttmls", ttml.id)).catch(() => {}),
		deleteDoc(doc(db, "public_ttmls", ttml.id)).catch(() => {}),
	]);

	// 2. Safely toggle public status in author's cloud saves WITHOUT deleting the private file or completion status
	if (ttml.authorUid) {
		try {
			const userDocRef = doc(db, "users", ttml.authorUid, "ttmls", ttml.id);
			const userDocSnap = await getDoc(userDocRef);
			const existingTags: string[] =
				userDocSnap.exists() && Array.isArray(userDocSnap.data().tags)
					? userDocSnap.data().tags
					: [];
			const updatedTags = existingTags.filter((t) => t !== "community");
			await updateDoc(userDocRef, {
				publishedToCommunity: false,
				tags: updatedTags,
			});
		} catch {
			// User doc may not exist if it was directly in finished_ttmls
		}
	}
}

export function isTTMLPubliclyOptedIn(data: DocumentData): boolean {
	return (
		data.publishedToCommunity === true ||
		data.isPublic === true ||
		Boolean(data.publishedToCommunity) ||
		Boolean(data.isPublic) ||
		(Array.isArray(data.tags) && data.tags.includes("community"))
	);
}

function parseTTMLDoc(
	id: string,
	data: DocumentData,
	inferredAuthorUid?: string,
): FinishedTTML {
	const rawTTML = data.rawTTML || data.ttmlContent || data.ttml || "";

	let coverArt =
		data.coverArt || data.cover_art || data.cover || data.songCover || null;
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

	let title = data.title;
	let artist = data.artist;
	const album = data.album;

	if (!title && rawTTML) {
		const titleMatch = rawTTML.match(/<ttm:title>([^<]+)<\/ttm:title>/i);
		if (titleMatch) title = titleMatch[1];
	}

	if (!artist && rawTTML) {
		const artistMatch = rawTTML.match(
			/<ttm:agent[^>]*type=["']person["'][^>]*>([^<]+)<\/ttm:agent>/i,
		);
		if (artistMatch) artist = artistMatch[1];
	}

	let isWordSync: boolean | undefined;
	if (typeof data.isWordSync === "boolean") {
		isWordSync = data.isWordSync;
	} else if (typeof data.timing === "string") {
		isWordSync = data.timing.toLowerCase() === "word";
	} else if (typeof data.timingMode === "string") {
		isWordSync = data.timingMode.toLowerCase() === "word";
	} else if (rawTTML) {
		isWordSync =
			/itunes:timing=["']Word["']/i.test(rawTTML) ||
			/<span\b[^>]*\bbegin=/i.test(rawTTML);
	}

	const createdAt = data.createdAt?.toMillis
		? data.createdAt.toMillis()
		: data.createdAt || Date.now();
	const updatedAt = data.updatedAt?.toMillis
		? data.updatedAt.toMillis()
		: data.updatedAt || createdAt;

	const lineCount =
		data.lineCount ||
		(data.lines ? data.lines.length : 0) ||
		rawTTML.match(/<p\b/g)?.length ||
		0;

	const wordCount =
		typeof data.wordCount === "number" && data.wordCount > 0
			? data.wordCount
			: rawTTML
				? countWordsInTTML(rawTTML)
				: lineCount
					? Math.round(lineCount * 6.5)
					: 0;

	return {
		id,
		title: title || "Untitled",
		artist: artist || "Unknown Artist",
		album: album || undefined,
		coverArt: coverArt || undefined,
		lineCount,
		wordCount,
		durationMs: data.durationMs || 0,
		tags:
			data.tags ||
			(data.publishedToCommunity
				? ["community"]
				: data.finished
					? ["finished"]
					: []),
		rawTTML,
		isWordSync,
		timing:
			typeof data.timing === "string"
				? data.timing
				: isWordSync
					? "Word"
					: "Line",
		authorUid:
			data.authorUid ||
			data.author_uid ||
			data.userId ||
			inferredAuthorUid ||
			undefined,
		authorName: data.authorName || data.author_name || data.author || undefined,
		createdAt,
		updatedAt,
		downloadUrl: data.downloadUrl || data.audioUrl,
		timeSpentSeconds:
			typeof data.timeSpentSeconds === "number"
				? data.timeSpentSeconds
				: undefined,
	};
}

export function deduplicateAndMergeTTMLs(
	rawDocs: FinishedTTML[],
): FinishedTTML[] {
	// Deduplicate by song key so that ONLY THE NEWEST VERSION of each song is shown
	const latestBySong = new Map<string, FinishedTTML>();

	for (const item of rawDocs) {
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
			// If newer doc doesn't have rawTTML, retain existing rawTTML
			if (!merged.rawTTML && existing.rawTTML) {
				merged.rawTTML = existing.rawTTML;
			}
			if (
				typeof merged.isWordSync !== "boolean" &&
				typeof existing.isWordSync === "boolean"
			) {
				merged.isWordSync = existing.isWordSync;
			}
			if (!merged.wordCount && existing.wordCount) {
				merged.wordCount = existing.wordCount;
			}
			latestBySong.set(key, merged);
		} else if (itemTime === existingTime) {
			// Tie-breaker: keep the version with more lyrics or rich metadata
			const hasBetterContent =
				(item.lineCount || 0) > (existing.lineCount || 0) ||
				(item.wordCount || 0) > (existing.wordCount || 0) ||
				(item.rawTTML?.length || 0) > (existing.rawTTML?.length || 0);

			if (hasBetterContent) {
				const merged = { ...item };
				if (!merged.rawTTML && existing.rawTTML) {
					merged.rawTTML = existing.rawTTML;
				}
				if (
					typeof merged.isWordSync !== "boolean" &&
					typeof existing.isWordSync === "boolean"
				) {
					merged.isWordSync = existing.isWordSync;
				}
				if (!merged.wordCount && existing.wordCount) {
					merged.wordCount = existing.wordCount;
				}
				latestBySong.set(key, merged);
			} else {
				if (!existing.rawTTML && item.rawTTML) {
					existing.rawTTML = item.rawTTML;
				}
				if (
					typeof existing.isWordSync !== "boolean" &&
					typeof item.isWordSync === "boolean"
				) {
					existing.isWordSync = item.isWordSync;
				}
				if (!existing.wordCount && item.wordCount) {
					existing.wordCount = item.wordCount;
				}
			}
		} else {
			// existingTime > itemTime: ensure existing retains rawTTML and isWordSync if missing
			if (!existing.rawTTML && item.rawTTML) {
				existing.rawTTML = item.rawTTML;
			}
			if (
				typeof existing.isWordSync !== "boolean" &&
				typeof item.isWordSync === "boolean"
			) {
				existing.isWordSync = item.isWordSync;
			}
			if (!existing.wordCount && item.wordCount) {
				existing.wordCount = item.wordCount;
			}
		}
	}

	// Include featured verified tracks if not already superseded by a live upload
	for (const featured of FEATURED_FINISHED_TTMLS) {
		const key = getSongKey(featured.title, featured.artist);
		if (!latestBySong.has(key)) {
			latestBySong.set(key, { ...featured });
		}
	}

	return Array.from(latestBySong.values()).sort(
		(a, b) =>
			(b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0),
	);
}

export async function fetchRawPublicTTMLs(): Promise<FinishedTTML[]> {
	if (!db) return FEATURED_FINISHED_TTMLS;

	const rawDocs: FinishedTTML[] = [];
	const seenDocIds = new Set<string>();

	try {
		// 1. Query collection "finished_ttmls" (opt-in community shares)
		try {
			const snap = await getDocs(
				query(collection(db, "finished_ttmls"), limit(500)),
			);
			snap.forEach((docSnap) => {
				const data = docSnap.data();
				if (isTTMLPubliclyOptedIn(data) && !seenDocIds.has(docSnap.id)) {
					seenDocIds.add(docSnap.id);
					rawDocs.push(parseTTMLDoc(docSnap.id, data));
				}
			});
		} catch (e) {
			console.warn("Could not read finished_ttmls collection:", e);
		}

		// 2. Query collection "public_ttmls"
		try {
			const snap = await getDocs(
				query(collection(db, "public_ttmls"), limit(500)),
			);
			snap.forEach((docSnap) => {
				const data = docSnap.data();
				if (isTTMLPubliclyOptedIn(data) && !seenDocIds.has(docSnap.id)) {
					seenDocIds.add(docSnap.id);
					rawDocs.push(parseTTMLDoc(docSnap.id, data));
				}
			});
		} catch (e) {
			console.warn("Could not read public_ttmls collection:", e);
		}

		// 3. Query collectionGroup "ttmls", but ONLY include documents where user explicitly opted in to community
		try {
			const snap = await getDocs(
				query(collectionGroup(db, "ttmls"), limit(1000)),
			);
			snap.forEach((docSnap) => {
				const data = docSnap.data();
				if (isTTMLPubliclyOptedIn(data) && !seenDocIds.has(docSnap.id)) {
					seenDocIds.add(docSnap.id);
					const authorUidFromPath = docSnap.ref.parent?.parent?.id;
					rawDocs.push(parseTTMLDoc(docSnap.id, data, authorUidFromPath));
				}
			});
		} catch (e) {
			console.warn("Could not read collectionGroup(ttmls):", e);
		}
	} catch (err) {
		console.error("Error connecting to Firebase:", err);
	}

	return rawDocs;
}

export async function fetchFinishedTTMLs(): Promise<FinishedTTML[]> {
	const rawDocs = await fetchRawPublicTTMLs();
	return deduplicateAndMergeTTMLs(rawDocs);
}

// Built-in showcase finished TTMLs (empty by default; library loads live verified community uploads)
export const FEATURED_FINISHED_TTMLS: FinishedTTML[] = [];

export async function downloadTTMLFile(ttml: FinishedTTML): Promise<void> {
	let content = ttml.rawTTML || "";
	if (!content && db && ttml.authorUid && ttml.id) {
		try {
			const payloadRef = doc(
				db,
				"users",
				ttml.authorUid,
				"ttmls",
				ttml.id,
				"payload",
				"content",
			);
			const payloadSnap = await getDoc(payloadRef);
			if (payloadSnap.exists()) {
				content = payloadSnap.data().rawTTML || "";
			}
		} catch (e) {
			console.warn("Could not fetch ttml payload for download:", e);
		}
	}

	if (!content) {
		content = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-internal" itunes:timing="Word">
  <head>
    <metadata>
      <ttm:title>${ttml.title}</ttm:title>
      <ttm:agent type="person">${ttml.artist}</ttm:agent>
    </metadata>
  </head>
  <body>
    <div></div>
  </body>
</tt>`;
	}

	const filename = `${ttml.artist} - ${ttml.title}.ttml`.replace(
		/[/\\?%*:|"<>]/g,
		"-",
	);
	const blob = new Blob([content], { type: "application/xml;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export async function downloadAudioFile(ttml: FinishedTTML): Promise<void> {
	const url = ttml.downloadUrl;
	if (!url) throw new Error("No audio download URL available for this song");
	const filename =
		`${ttml.artist ? `${ttml.artist} - ` : ""}${ttml.title || "audio"}.mp3`.replace(
			/[/\\?%*:|"<>]/g,
			"-",
		);
	const resp = await fetch(url);
	if (!resp.ok) throw new Error(`Failed to fetch audio file (${resp.status})`);
	const blob = await resp.blob();
	const blobUrl = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = blobUrl;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(blobUrl);
}

/**
 * Reads and compresses an image File into a square JPEG data URL (~512x512 max).
 */
export async function compressImageToDataUrl(
	file: File,
	maxSize = 512,
	quality = 0.85,
): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("Failed to read image file"));
		reader.onload = () => {
			const img = new Image();
			img.onerror = () => reject(new Error("Failed to decode image"));
			img.onload = () => {
				const canvas = document.createElement("canvas");
				const width = img.width;
				const height = img.height;

				// Center-crop to a square aspect ratio
				const size = Math.min(width, height);
				const startX = (width - size) / 2;
				const startY = (height - size) / 2;

				const targetSize = Math.min(size, maxSize);
				canvas.width = targetSize;
				canvas.height = targetSize;

				const ctx = canvas.getContext("2d");
				if (!ctx) {
					resolve(reader.result as string);
					return;
				}

				ctx.drawImage(
					img,
					startX,
					startY,
					size,
					size,
					0,
					0,
					targetSize,
					targetSize,
				);
				const dataUrl = canvas.toDataURL("image/jpeg", quality);
				resolve(dataUrl);
			};
			img.src = reader.result as string;
		};
		reader.readAsDataURL(file);
	});
}

/**
 * Updates the cover art of a song across Firestore documents.
 * Restricted to the song author or designated moderators.
 */
export async function updateSongCoverArt(
	ttml: FinishedTTML,
	coverArtDataUrl: string,
	currentUserUid?: string,
): Promise<{ success: boolean; error?: string }> {
	if (!db) return { success: false, error: "Firestore is not connected." };

	const callerUid = currentUserUid || auth?.currentUser?.uid;
	if (!callerUid) {
		return {
			success: false,
			error: "You must be logged in to update artwork.",
		};
	}

	const isAuthor = Boolean(ttml.authorUid && ttml.authorUid === callerUid);
	const isMod = isUserModerator(callerUid);

	if (!isAuthor && !isMod) {
		return {
			success: false,
			error: "You do not have permission to update artwork for this song.",
		};
	}

	try {
		const payload = {
			coverArt: coverArtDataUrl,
			updatedAt: Date.now(),
		};
		const promises: Promise<any>[] = [];

		if (ttml.authorUid && (isAuthor || isMod)) {
			const userDocRef = doc(db, "users", ttml.authorUid, "ttmls", ttml.id);
			promises.push(
				setDoc(userDocRef, payload, { merge: true }).catch(() => {}),
			);
		}

		const finishedRef = doc(db, "finished_ttmls", ttml.id);
		promises.push(
			setDoc(finishedRef, payload, { merge: true }).catch(() => {}),
		);

		const publicRef = doc(db, "public_ttmls", ttml.id);
		promises.push(setDoc(publicRef, payload, { merge: true }).catch(() => {}));

		await Promise.all(promises);
		return { success: true };
	} catch (err: any) {
		console.error("Error updating song cover art:", err);
		return {
			success: false,
			error: err?.message || "Failed to update artwork in Firestore.",
		};
	}
}

export interface UserProfileStats {
	uid: string;
	displayName: string;
	photoURL?: string;
	isModerator: boolean;
	totalSongs: number;
	totalLines: number;
	totalWords: number;
	totalDurationMs: number;
	wordSyncSongs: number;
	lineSyncSongs: number;
	uniqueArtists: string[];
	firstContribution?: number;
	lastContribution?: number;
	songs: FinishedTTML[];
	averageTimeSeconds?: number;
	timedSongsCount?: number;
	fastestTimeSeconds?: number;
	fastestSongTitle?: string;
}

export interface CommunityGlobalStats {
	totalSongs: number;
	totalLines: number;
	totalWords: number;
	totalDurationMs: number;
	totalCreators: number;
	totalWordSync: number;
	totalArtists: number;
}

export function isSongWordSync(ttml: FinishedTTML): boolean {
	if (typeof ttml.isWordSync === "boolean") return ttml.isWordSync;
	if (!ttml.rawTTML) return false;
	return (
		/itunes:timing=["']Word["']/i.test(ttml.rawTTML) ||
		/<span\b[^>]*\bbegin=/i.test(ttml.rawTTML)
	);
}

export async function fetchUserProfilesWithStats(): Promise<{
	profiles: UserProfileStats[];
	globalStats: CommunityGlobalStats;
}> {
	const songs = await fetchRawPublicTTMLs();

	// Fetch registered user profiles for rich avatar & up-to-date display name
	const userDocsMap = new Map<
		string,
		{ displayName?: string; photoURL?: string }
	>();
	if (db) {
		try {
			const snap = await getDocs(query(collection(db, "users"), limit(500)));
			snap.forEach((docSnap) => {
				const data = docSnap.data();
				userDocsMap.set(docSnap.id, {
					displayName: data.displayName || data.name,
					photoURL: data.photoURL || data.avatarUrl || data.photoUrl,
				});
			});
		} catch {
			// Allowed to fail gracefully if security rules restrict users collection
		}
	}

	const creatorsMap = new Map<
		string,
		{
			uid: string;
			displayName: string;
			photoURL?: string;
			songMap: Map<string, FinishedTTML>;
			artistsSet: Set<string>;
			firstContribution: number;
			lastContribution: number;
		}
	>();

	for (const song of songs) {
		const uid =
			song.authorUid ||
			(song.authorName
				? `author:${song.authorName.toLowerCase()}`
				: "community");
		const userDoc = song.authorUid
			? userDocsMap.get(song.authorUid)
			: undefined;
		const displayName =
			userDoc?.displayName ||
			song.authorName ||
			(song.authorUid
				? `Creator (${song.authorUid.slice(0, 6)})`
				: "Community Creator");
		const photoURL = userDoc?.photoURL;

		let creator = creatorsMap.get(uid);
		if (!creator) {
			creator = {
				uid: song.authorUid || uid,
				displayName,
				photoURL,
				songMap: new Map<string, FinishedTTML>(),
				artistsSet: new Set<string>(),
				firstContribution: song.createdAt || Date.now(),
				lastContribution: song.updatedAt || song.createdAt || Date.now(),
			};
			creatorsMap.set(uid, creator);
		} else {
			if (userDoc?.displayName) {
				creator.displayName = userDoc.displayName;
			} else if (
				!creator.displayName ||
				creator.displayName.startsWith("Creator (")
			) {
				if (song.authorName) creator.displayName = song.authorName;
			}
			if (photoURL && !creator.photoURL) {
				creator.photoURL = photoURL;
			}
		}

		// Deduplicate songs PER CREATOR (so different versions of same song are merged into 1 song entry for this creator)
		const songKey = getSongKey(song.title, song.artist);
		const existing = creator.songMap.get(songKey);
		if (!existing) {
			creator.songMap.set(songKey, { ...song });
		} else {
			const songTime = song.updatedAt || song.createdAt || 0;
			const existingTime = existing.updatedAt || existing.createdAt || 0;
			if (songTime > existingTime) {
				const merged = { ...song };
				if (!merged.rawTTML && existing.rawTTML)
					merged.rawTTML = existing.rawTTML;
				if (
					typeof merged.isWordSync !== "boolean" &&
					typeof existing.isWordSync === "boolean"
				) {
					merged.isWordSync = existing.isWordSync;
				}
				creator.songMap.set(songKey, merged);
			} else {
				if (!existing.rawTTML && song.rawTTML) {
					existing.rawTTML = song.rawTTML;
				}
				if (
					typeof existing.isWordSync !== "boolean" &&
					typeof song.isWordSync === "boolean"
				) {
					existing.isWordSync = song.isWordSync;
				}
			}
		}

		if (song.artist && song.artist.trim()) {
			creator.artistsSet.add(song.artist.trim());
		}

		const t = song.updatedAt || song.createdAt || 0;
		if (t > 0) {
			if (!creator.firstContribution || t < creator.firstContribution) {
				creator.firstContribution = t;
			}
			if (t > creator.lastContribution) {
				creator.lastContribution = t;
			}
		}
	}

	const allArtistsSet = new Set<string>();
	let globalTotalLines = 0;
	let globalTotalWords = 0;
	let globalTotalDuration = 0;
	let globalWordSync = 0;
	let globalTotalSongs = 0;

	const profiles: UserProfileStats[] = Array.from(creatorsMap.values())
		.filter((c) => {
			const name = (c.displayName || "").toLowerCase();
			const uid = (c.uid || "").toLowerCase();
			return (
				!name.includes("copilot") &&
				!uid.includes("copilot") &&
				!name.includes("codebuff") &&
				!uid.includes("codebuff")
			);
		})
		.map((c) => {
			const creatorSongs = Array.from(c.songMap.values()).sort(
				(a, b) =>
					(b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0),
			);

			let cLines = 0;
			let cWords = 0;
			let cDuration = 0;
			let cWordSync = 0;
			let cLineSync = 0;
			let minTimeSpent = Infinity;
			let minTimeTitle: string | undefined;
			let timedCount = 0;
			let totalTimeSpent = 0;

			for (const s of creatorSongs) {
				cLines += s.lineCount || 0;
				cWords +=
					s.wordCount ||
					(s.rawTTML ? countWordsInTTML(s.rawTTML) : 0) ||
					(s.lineCount ? Math.round(s.lineCount * 6.5) : 0);
				cDuration += s.durationMs || 0;
				const isWord = isSongWordSync(s);
				if (isWord) {
					cWordSync++;
				} else {
					cLineSync++;
				}
				if (s.artist && s.artist.trim()) {
					allArtistsSet.add(s.artist.trim().toLowerCase());
				}
				if (typeof s.timeSpentSeconds === "number" && s.timeSpentSeconds >= 5) {
					timedCount++;
					totalTimeSpent += s.timeSpentSeconds;
					if (s.timeSpentSeconds < minTimeSpent) {
						minTimeSpent = s.timeSpentSeconds;
						minTimeTitle = `${s.title}${s.artist ? ` - ${s.artist}` : ""}`;
					}
				}
			}

			globalTotalLines += cLines;
			globalTotalWords += cWords;
			globalTotalDuration += cDuration;
			globalWordSync += cWordSync;
			globalTotalSongs += creatorSongs.length;

			const averageTimeSeconds =
				timedCount > 0 ? Math.round(totalTimeSpent / timedCount) : undefined;

			return {
				uid: c.uid,
				displayName: c.displayName,
				photoURL: c.photoURL,
				isModerator: isUserModerator(c.uid),
				totalSongs: creatorSongs.length,
				totalLines: cLines,
				totalWords: cWords,
				totalDurationMs: cDuration,
				wordSyncSongs: cWordSync,
				lineSyncSongs: cLineSync,
				uniqueArtists: Array.from(c.artistsSet),
				firstContribution: c.firstContribution,
				lastContribution: c.lastContribution,
				songs: creatorSongs,
				averageTimeSeconds,
				timedSongsCount: timedCount,
				fastestTimeSeconds: minTimeSpent < Infinity ? minTimeSpent : undefined,
				fastestSongTitle: minTimeTitle,
			};
		},
	);

	// Sort profiles by total lines descending (standard leaderboard ranking)
	profiles.sort(
		(a, b) => b.totalLines - a.totalLines || b.totalSongs - a.totalSongs,
	);

	const globalStats: CommunityGlobalStats = {
		totalSongs: globalTotalSongs,
		totalLines: globalTotalLines,
		totalWords: globalTotalWords,
		totalDurationMs: globalTotalDuration,
		totalCreators: profiles.length,
		totalWordSync: globalWordSync,
		totalArtists: allArtistsSet.size,
	};

	return { profiles, globalStats };
}

export async function fetchUserProfileDirect(
	userUid: string,
): Promise<UserProfileStats | null> {
	if (!db || !userUid) return null;

	try {
		// 1. Fetch user profile details
		let displayName = `Creator (${userUid.slice(0, 6)})`;
		let photoURL: string | undefined;
		let fastestTimeSeconds: number | undefined;
		let fastestSongTitle: string | undefined;
		let userDocAverageTime: number | undefined;

		try {
			const userSnap = await getDoc(doc(db, "users", userUid));
			if (userSnap.exists()) {
				const udata = userSnap.data();
				displayName = udata.displayName || udata.name || displayName;
				photoURL = udata.photoURL || udata.avatarUrl || udata.photoUrl;
				if (
					typeof udata.averageTimeSeconds === "number" &&
					udata.averageTimeSeconds >= 5
				) {
					userDocAverageTime = udata.averageTimeSeconds;
				}
				if (
					typeof udata.fastestTimeSeconds === "number" &&
					udata.fastestTimeSeconds >= 5
				) {
					fastestTimeSeconds = udata.fastestTimeSeconds;
					fastestSongTitle = udata.fastestSongTitle;
				}
			}
		} catch {
			// ignore
		}

		// 2. Fetch all user ttmls directly from users/{uid}/ttmls
		const userTtmlsSnap = await getDocs(
			collection(db, "users", userUid, "ttmls"),
		);
		const rawUserDocs: FinishedTTML[] = [];

		userTtmlsSnap.forEach((docSnap) => {
			const data = docSnap.data();
			if (isTTMLPubliclyOptedIn(data)) {
				rawUserDocs.push(parseTTMLDoc(docSnap.id, data, userUid));
			}
		});

		// Also check finished_ttmls and public_ttmls for any docs authored by this user
		try {
			const finishedSnap = await getDocs(
				query(collection(db, "finished_ttmls"), limit(500)),
			);
			finishedSnap.forEach((docSnap) => {
				const data = docSnap.data();
				if (
					(data.authorUid === userUid || data.author_uid === userUid) &&
					isTTMLPubliclyOptedIn(data)
				) {
					if (!rawUserDocs.some((d) => d.id === docSnap.id)) {
						rawUserDocs.push(parseTTMLDoc(docSnap.id, data, userUid));
					}
				}
			});
		} catch {
			// ignore
		}

		if (rawUserDocs.length === 0) {
			return null;
		}

		// For docs where rawTTML was moved to payload/content and isWordSync is not yet stored,
		// load payload in parallel so word sync status, stats, and download content are accurate.
		await Promise.all(
			rawUserDocs.map(async (docItem) => {
				if (typeof docItem.isWordSync !== "boolean" && !docItem.rawTTML) {
					try {
						const payloadRef = doc(
							db,
							"users",
							userUid,
							"ttmls",
							docItem.id,
							"payload",
							"content",
						);
						const payloadSnap = await getDoc(payloadRef);
						if (payloadSnap.exists()) {
							const pData = payloadSnap.data();
							const raw = pData.rawTTML || "";
							docItem.rawTTML = raw;
							docItem.isWordSync =
								/itunes:timing=["']Word["']/i.test(raw) ||
								/<span\b[^>]*\bbegin=/i.test(raw);
						}
					} catch {
						// ignore
					}
				}
			}),
		);

		// Group songs per song key (just like groupCloudTTMLs in the app)
		const songMap = new Map<string, FinishedTTML>();
		for (const docItem of rawUserDocs) {
			const key = getSongKey(docItem.title, docItem.artist);
			const existing = songMap.get(key);
			if (!existing) {
				songMap.set(key, { ...docItem });
			} else {
				const docTime = docItem.updatedAt || docItem.createdAt || 0;
				const existingTime = existing.updatedAt || existing.createdAt || 0;
				if (docTime > existingTime) {
					const merged = { ...docItem };
					if (!merged.rawTTML && existing.rawTTML)
						merged.rawTTML = existing.rawTTML;
					if (
						typeof merged.isWordSync !== "boolean" &&
						typeof existing.isWordSync === "boolean"
					) {
						merged.isWordSync = existing.isWordSync;
					}
					songMap.set(key, merged);
				} else {
					if (!existing.rawTTML && docItem.rawTTML) {
						existing.rawTTML = docItem.rawTTML;
					}
					if (
						typeof existing.isWordSync !== "boolean" &&
						typeof docItem.isWordSync === "boolean"
					) {
						existing.isWordSync = docItem.isWordSync;
					}
				}
			}
		}

		const uniqueSongs = Array.from(songMap.values()).sort(
			(a, b) =>
				(b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0),
		);

		const artistsSet = new Set<string>();
		let totalLines = 0;
		let totalWords = 0;
		let totalDurationMs = 0;
		let wordSyncSongs = 0;
		let lineSyncSongs = 0;
		let firstContribution = Date.now();
		let lastContribution = 0;
		let minTimeSpent =
			typeof fastestTimeSeconds === "number" ? fastestTimeSeconds : Infinity;
		let minTimeTitle = fastestSongTitle;
		let timedCount = 0;
		let totalTimeSpent = 0;

		for (const song of uniqueSongs) {
			if (song.artist && song.artist.trim()) {
				artistsSet.add(song.artist.trim());
			}
			totalLines += song.lineCount || 0;
			totalWords +=
				song.wordCount ||
				(song.rawTTML ? countWordsInTTML(song.rawTTML) : 0) ||
				(song.lineCount ? Math.round(song.lineCount * 6.5) : 0);
			totalDurationMs += song.durationMs || 0;
			if (isSongWordSync(song)) {
				wordSyncSongs++;
			} else {
				lineSyncSongs++;
			}
			if (
				typeof song.timeSpentSeconds === "number" &&
				song.timeSpentSeconds >= 5
			) {
				timedCount++;
				totalTimeSpent += song.timeSpentSeconds;
				if (song.timeSpentSeconds < minTimeSpent) {
					minTimeSpent = song.timeSpentSeconds;
					minTimeTitle = `${song.title}${song.artist ? ` - ${song.artist}` : ""}`;
				}
			}
			const t = song.updatedAt || song.createdAt || 0;
			if (t > 0) {
				if (t < firstContribution) firstContribution = t;
				if (t > lastContribution) lastContribution = t;
			}
			if (displayName.startsWith("Creator (") && song.authorName) {
				displayName = song.authorName;
			}
		}

		const averageTimeSeconds =
			timedCount > 0
				? Math.round(totalTimeSpent / timedCount)
				: userDocAverageTime;

		return {
			uid: userUid,
			displayName,
			photoURL,
			isModerator: isUserModerator(userUid),
			totalSongs: uniqueSongs.length,
			totalLines,
			totalWords,
			totalDurationMs,
			wordSyncSongs,
			lineSyncSongs,
			uniqueArtists: Array.from(artistsSet),
			firstContribution:
				firstContribution === Date.now() ? undefined : firstContribution,
			lastContribution: lastContribution === 0 ? undefined : lastContribution,
			songs: uniqueSongs,
			averageTimeSeconds,
			timedSongsCount: timedCount,
			fastestTimeSeconds: minTimeSpent < Infinity ? minTimeSpent : undefined,
			fastestSongTitle: minTimeTitle,
		};
	} catch (err) {
		console.error("Error fetching direct user profile:", err);
		return null;
	}
}

export interface CloudSongStats {
	totalUsers: number;
	totalSongs: number;
	uniqueSongs: number;
	duplicateSongs: number;
	publicSongs: number;
	privateSongs: number;
	totalDurationMs: number;
	totalLines: number;
}

export async function fetchCloudSongStats(): Promise<CloudSongStats> {
	if (!db) {
		return {
			totalUsers: 0,
			totalSongs: 0,
			uniqueSongs: 0,
			duplicateSongs: 0,
			publicSongs: 0,
			privateSongs: 0,
			totalDurationMs: 0,
			totalLines: 0,
		};
	}

	try {
		const [ttmlsSnap, usersSnap, finishedSnap] = await Promise.all([
			getDocs(collectionGroup(db, "ttmls")),
			getDocs(query(collection(db, "users"), limit(250))).catch(() => null),
			getDocs(query(collection(db, "finished_ttmls"), limit(250))).catch(
				() => null,
			),
		]);

		const usersSet = new Set<string>();
		if (usersSnap) {
			usersSnap.forEach((u) => usersSet.add(u.id));
		}

		const seenDocIds = new Set<string>();
		let publicCount = 0;
		let privateCount = 0;
		let totalLines = 0;
		let totalDurationMs = 0;
		const songKeyOccurrences = new Map<string, number>();

		const processDoc = (
			id: string,
			data: DocumentData,
			authorFromPath?: string,
		) => {
			if (seenDocIds.has(id)) return;
			seenDocIds.add(id);

			const isPublic = isTTMLPubliclyOptedIn(data);
			if (isPublic) {
				publicCount++;
			} else {
				privateCount++;
			}

			const author = data.authorUid || data.author_uid || authorFromPath;
			if (author) {
				usersSet.add(author);
			}

			if (typeof data.lineCount === "number") totalLines += data.lineCount;
			if (typeof data.durationMs === "number")
				totalDurationMs += data.durationMs;

			const title = data.title || "Untitled";
			const artist = data.artist || "Unknown Artist";
			const key = getSongKey(title, artist);
			songKeyOccurrences.set(key, (songKeyOccurrences.get(key) || 0) + 1);
		};

		ttmlsSnap.forEach((docSnap) => {
			const authorFromPath = docSnap.ref.parent?.parent?.id;
			processDoc(docSnap.id, docSnap.data(), authorFromPath);
		});

		if (finishedSnap) {
			finishedSnap.forEach((docSnap) => {
				processDoc(docSnap.id, docSnap.data());
			});
		}

		let duplicateSongs = 0;
		for (const count of songKeyOccurrences.values()) {
			if (count > 1) {
				duplicateSongs += count - 1;
			}
		}

		const totalSongs = seenDocIds.size;
		const uniqueSongs = songKeyOccurrences.size;
		const totalUsers = usersSet.size;

		return {
			totalUsers,
			totalSongs,
			uniqueSongs,
			duplicateSongs,
			publicSongs: publicCount,
			privateSongs: privateCount,
			totalDurationMs,
			totalLines,
		};
	} catch (err) {
		console.error("Failed to fetch cloud song stats:", err);
		return {
			totalUsers: 0,
			totalSongs: 0,
			uniqueSongs: 0,
			duplicateSongs: 0,
			publicSongs: 0,
			privateSongs: 0,
			totalDurationMs: 0,
			totalLines: 0,
		};
	}
}

export interface PublicChecklistSong {
	id: string;
	song: string;
	artist: string;
	album?: string;
	status: "completed" | "in-progress" | "not-started";
	notes?: string;
	sourceUrl?: string;
	sharePublicly?: boolean;
	uploadedToDatabase?: boolean;
	coverArt?: string | null;
	updatedAt?: number;
	authorUid?: string;
	authorName?: string;
	authorPhoto?: string | null;
}

export async function fetchPublicChecklistSongs(): Promise<
	PublicChecklistSong[]
> {
	if (!db) return [];
	try {
		const snap = await getDocs(
			query(collection(db, "public_checklists"), limit(250)),
		);
		const songs: PublicChecklistSong[] = [];
		snap.forEach((docSnap) => {
			const data = docSnap.data();
			const authorUid = data.userId || docSnap.id;
			const authorName = data.userName || "Anonymous";
			const authorPhoto = data.userPhoto || null;
			const updatedAt = data.updatedAt || Date.now();
			if (Array.isArray(data.entries)) {
				for (const entry of data.entries) {
					if (
						entry &&
						(entry.sharePublicly || entry.sharePublicly === undefined)
					) {
						const status: "completed" | "in-progress" | "not-started" =
							entry.status === "completed" || entry.completed
								? "completed"
								: entry.status === "not-started"
									? "not-started"
									: "in-progress";
						songs.push({
							id: `${authorUid}_${entry.id || entry.cloudDocId || getSongKey(entry.song || "", entry.artist || "")}`,
							song: entry.song || "Untitled",
							artist: entry.artist || "Unknown Artist",
							album: entry.album || undefined,
							status,
							notes: entry.notes || "",
							sourceUrl: entry.sourceUrl || "",
							sharePublicly: true,
							uploadedToDatabase: Boolean(entry.uploadedToDatabase),
							coverArt: entry.coverArt || null,
							updatedAt: entry.updatedAt || updatedAt,
							authorUid,
							authorName,
							authorPhoto,
						});
					}
				}
			}
		});

		songs.sort((a, b) => {
			const statusWeight = (s: string) =>
				s === "in-progress" ? 1 : s === "not-started" ? 2 : 3;
			const diff = statusWeight(a.status) - statusWeight(b.status);
			if (diff !== 0) return diff;
			return (b.updatedAt || 0) - (a.updatedAt || 0);
		});

		return songs;
	} catch (err) {
		console.warn("Failed to fetch public checklists:", err);
		return [];
	}
}
