import { describe, expect, it } from "vitest";
import {
	downloadError,
	formatDuration,
	metadataQuery,
	nextSearchQuery,
	validDownloadUrl,
} from "./model";

describe("downloader search helpers", () => {
	it("builds a query from artist and title", () => {
		expect(
			metadataQuery([
				{ key: "musicName", value: [" Song "] },
				{ key: "artists", value: ["Artist", "Feature"] },
			]),
		).toBe("Artist Song");
		expect(metadataQuery([{ key: "musicName", value: ["Song"] }])).toBe("Song");
		expect(metadataQuery([])).toBe("");
		expect(
			metadataQuery([
				{ key: "Title", value: ["Track"] },
				{ key: "artist", value: ["Singer"] },
			]),
		).toBe("Singer Track");
	});
	it("replaces an untouched search with the newly opened song", () => {
		expect(nextSearchQuery("", "", "Artist A")).toBe("Artist A");
		// Reopened after loading song B, query never edited.
		expect(nextSearchQuery("Artist A", "Artist A", "Artist B")).toBe(
			"Artist B",
		);
		// The user typed their own query: keep it.
		expect(nextSearchQuery("my search", "Artist A", "Artist B")).toBe(
			"my search",
		);
		// No metadata: keep whatever is there.
		expect(nextSearchQuery("Artist A", "Artist A", "")).toBe("Artist A");
	});
	it("formats durations", () => {
		expect(formatDuration(215)).toBe("3:35");
		expect(formatDuration(3725)).toBe("1:02:05");
		expect(formatDuration(null)).toBe("");
		expect(formatDuration(Number.NaN)).toBe("");
	});
});

describe("downloader URL validation", () => {
	it("accepts HTTP(S) links with query strings", () => {
		expect(validDownloadUrl("https://example.org/watch?v=a&list=b")).toBe(true);
		expect(validDownloadUrl("http://example.org/audio")).toBe(true);
	});
	it.each([
		"--exec=calc",
		"file:///C:/secret",
		"ftp://example.org/a",
		"https://user:pass@example.org",
		"not a URL",
		`https://example.org/${"a".repeat(8192)}`,
	])("rejects %s", (value) => {
		expect(validDownloadUrl(value)).toBe(false);
	});
	it("preserves structured errors and handles unexpected failures", () => {
		expect(downloadError({ code: "cancelled", detail: "" })).toEqual({
			code: "cancelled",
			detail: "",
		});
		expect(downloadError("IPC failed")).toEqual({
			code: "failed",
			detail: "IPC failed",
		});
	});
});
