import {
	type LyricLine,
	stringifyAss,
	stringifyEslrc,
	stringifyLrc,
	stringifyLys,
	stringifyQrc,
	stringifyYrc,
} from "@applemusic-like-lyrics/lyric";
import { Badge, DropdownMenu, Flex } from "@radix-ui/themes";
import { isTauri } from "@tauri-apps/api/core";
import { useSetAtom, useStore } from "jotai";
import { useTranslation } from "react-i18next";
import { useFileOpener } from "$/hooks/useFileOpener.ts";
import {
	downloaderInitialQueryAtom,
	downloaderOpenAtom,
} from "$/modules/downloader/states";
import { notifySectionIssues } from "$/modules/lyric-editor/utils/notify-section-issues.tsx";
import { pluginManager } from "$/modules/plugins/plugin-manager";
import exportTTMLText from "$/modules/project/logic/ttml-writer";
import {
	allowConsecutiveBackgroundLinesAtom,
	lyricTextNormalizationOptionsAtom,
} from "$/modules/settings/states";
import {
	appleTtmlImportDialogAtom,
	geniusImportLyricsDialogAtom,
	importFromLRCLIBDialogAtom,
	importFromTextDialogAtom,
	jooxAudioSearchDialogAtom,
	jooxImportLyricsDialogAtom,
	lyricallyImportLyricsDialogAtom,
} from "$/states/dialogs.ts";
import {
	lyricLinesAtom,
	projectIdAtom,
	saveFileNameAtom,
} from "$/states/main.ts";
import { normalizeLyricText } from "$/utils/apostrophe-normalization";
import { openFileWithDialog } from "$/utils/fileDialog.ts";
import { saveFile } from "$/utils/fileSystem.ts";
import { error } from "$/utils/logging.ts";

export const ImportExportLyric = () => {
	const store = useStore();
	const setImportFromTextDialog = useSetAtom(importFromTextDialogAtom);
	const setImportFromLRCLIBDialog = useSetAtom(importFromLRCLIBDialogAtom);
	const setGeniusImportLyricsDialog = useSetAtom(geniusImportLyricsDialogAtom);
	const setLyricallyImportDialog = useSetAtom(lyricallyImportLyricsDialogAtom);
	const setAppleTtmlImportDialog = useSetAtom(appleTtmlImportDialogAtom);
	const setJooxImportLyricsDialog = useSetAtom(jooxImportLyricsDialogAtom);
	const setJooxAudioSearch = useSetAtom(jooxAudioSearchDialogAtom);
	const { openFile } = useFileOpener();
	const { t } = useTranslation();

	const onImportLyric = (extension: string) => async () => {
		const file = await openFileWithDialog({
			multiple: false,
			filters: [
				{ name: `Lyric files (${extension})`, extensions: [extension, "*"] },
			],
		});
		if (!file || Array.isArray(file)) return;
		openFile(file, extension);
	};

	const onImportWithPlugin =
		(pluginId: string, extension: string) => async () => {
			const file = await openFileWithDialog({
				multiple: false,
				filters: [
					{ name: `Plugin file (${extension})`, extensions: [extension] },
				],
			});
			if (!file || Array.isArray(file)) return;

			try {
				const text = await file.text();
				const transformed = await pluginManager.runImporter(pluginId, text);
				const newFile = new File([transformed], file.name, {
					type: "application/xml",
				});
				openFile(newFile, extension);
			} catch (e: unknown) {
				error(`Plugin import failed: ${pluginId}`, e);
				alert(
					(e as Error)?.message ||
						"Import failed. Please make sure you are using a valid TTML file.",
				);
			}
		};

	const onExportLyric =
		(stringifier: (lines: LyricLine[]) => string, extension: string) =>
		async () => {
			notifySectionIssues(store.get(lyricLinesAtom));
			const lyricState = normalizeLyricText(
				store.get(lyricLinesAtom),
				store.get(lyricTextNormalizationOptionsAtom),
			);
			const lyric = lyricState.lyricLines;
			const metadata = lyricState.metadata;

			const songwriter = metadata.find((m) => m.key === "songwriter");
			if (!songwriter || songwriter.value.every((v) => !v.trim())) {
				const confirm = window.confirm(
					t(
						"confirmDialog.noSongwriter.description",
						"The song has no songwriters. Do you want to continue saving?",
					),
				);
				if (!confirm) return;
			}

			const lyricForExport = lyric.map((line) => ({
				...line,
				startTime: Math.round(line.startTime),
				endTime: Math.round(line.endTime),
				words: line.words.map((word) => ({
					...word,
					startTime: Math.round(word.startTime),
					endTime: Math.round(word.endTime),
				})),
			}));
			const saveFileName = store.get(saveFileNameAtom);
			const baseName = saveFileName.replace(/\.[^.]*$/, "");
			const fileName = `${baseName}.${extension}`;
			try {
				const data = stringifier(lyricForExport);
				const saved = await saveFile(data, {
					suggestedName: fileName,
					types: [
						{
							description: `${extension.toUpperCase()} Files`,
							accept: { "text/plain": [`.${extension}`] },
						},
					],
				});
				if (saved && extension.toLowerCase() === "ttml") {
					try {
						const { recordTTMLCompletion } = await import(
							"$/modules/project/timer/project-timer"
						);
						const title =
							metadata.find((m) => (m.key || "").toLowerCase() === "title")
								?.value[0] || baseName;
						const artist =
							metadata.find((m) => (m.key || "").toLowerCase() === "artist")
								?.value[0] || "";
						const projectId = store.get(projectIdAtom);
						await recordTTMLCompletion({
							projectId,
							title,
							artist,
							lineCount: lyric.length,
						});
					} catch {
						// ignore
					}
				}
			} catch (e) {
				error(`Failed to export lyric with format "${extension}"`, e);
			}
		};

	const exporters = pluginManager.getExporters();
	const importers = pluginManager.getImporters();

	const onExportWithPlugin =
		(pluginId: string, extension: string) => async () => {
			notifySectionIssues(store.get(lyricLinesAtom));
			const lyricState = store.get(lyricLinesAtom);

			// Use TTML as the primary interchange format for plugins
			const ttmlData = exportTTMLText(
				lyricState,
				store.get(lyricTextNormalizationOptionsAtom),
				{
					allowConsecutiveBackgroundLines: store.get(
						allowConsecutiveBackgroundLinesAtom,
					),
				},
			);

			try {
				const result = await pluginManager.runExporter(pluginId, ttmlData);
				const saveFileName = store.get(saveFileNameAtom);
				const baseName = saveFileName.replace(/\.[^.]*$/, "");
				const fileName = `${baseName}.${extension}`;
				await saveFile(result, {
					suggestedName: fileName,
					types: [
						{
							description: `${extension.toUpperCase()} Files`,
							accept: { "text/plain": [`.${extension}`] },
						},
					],
				});
			} catch (e) {
				error(`Plugin export failed: ${pluginId}`, e);
			}
		};

	return (
		<>
			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>
					{t("topBar.menu.importLyric.import", "Import lyrics")}
				</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent>
					<DropdownMenu.Item onClick={() => setAppleTtmlImportDialog(true)}>
						{t(
							"topBar.menu.importLyric.fromAppleTtml",
							"Import from Apple Music TTML (Spotify)…",
						)}
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={() => setImportFromTextDialog(true)}>
						{t(
							"topBar.menu.importLyric.fromPlainText",
							"Import from plain text…",
						)}
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={() => setImportFromLRCLIBDialog(true)}>
						{t("topBar.menu.importLyric.fromLRCLIB", "Import from LRCLIB...")}
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={() => setLyricallyImportDialog(true)}>
						{t(
							"topBar.menu.importLyric.fromLyrically",
							"Import from Lyrically...",
						)}
					</DropdownMenu.Item>

					<DropdownMenu.Item onClick={() => setGeniusImportLyricsDialog(true)}>
						{t("topBar.menu.importLyric.fromGenius", "Import from Genius…")}
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={() => setJooxImportLyricsDialog(true)}>
						{t("topBar.menu.importLyric.fromJoox", "Import from JOOX Music…")}
					</DropdownMenu.Item>
					<DropdownMenu.Item
						onClick={() => {
							const lyricState = store.get(lyricLinesAtom);
							const title = lyricState.metadata.find((m) => m.key === "title")
								?.value[0];
							const artist = lyricState.metadata.find((m) => m.key === "artist")
								?.value[0];
							setJooxAudioSearch({
								open: true,
								title: title || "",
								artist: artist || "",
							});
						}}
					>
						<Flex
							align="center"
							justify="between"
							style={{ width: "100%", gap: "8px" }}
						>
							<span>
								{t("topBar.menu.importAudio.fromJoox", "Download audio…")}
							</span>
							<Badge color="orange" size="1" variant="soft">
								Beta
							</Badge>
						</Flex>
					</DropdownMenu.Item>

					{isTauri() && (
						<DropdownMenu.Item
							onClick={() => {
								const lyricState = store.get(lyricLinesAtom);
								const title = lyricState.metadata.find(
									(m) => (m.key || "").toLowerCase() === "title",
								)?.value[0];
								const artist = lyricState.metadata.find(
									(m) => (m.key || "").toLowerCase() === "artist",
								)?.value[0];
								const q = [artist, title].filter(Boolean).join(" ").trim();
								store.set(downloaderInitialQueryAtom, q || null);
								store.set(downloaderOpenAtom, true);
							}}
						>
							<Flex
								align="center"
								justify="between"
								style={{ width: "100%", gap: "8px" }}
							>
								<span>
									{t(
										"topBar.menu.mediaDownloader",
										"Media Downloader (yt-dlp)...",
									)}
								</span>
								<Badge color="red" size="1" variant="soft">
									yt-dlp
								</Badge>
							</Flex>
						</DropdownMenu.Item>
					)}

					<DropdownMenu.Item onClick={() => onImportLyric("lrc")}>
						{t("topBar.menu.importLyric.fromLyRiC", "Import from LyRiC file…")}
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={() => onImportLyric("eslrc")}>
						{t(
							"topBar.menu.importLyric.fromESLyRiC",
							"Import from ESLyRiC file…",
						)}
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={() => onImportLyric("qrc")}>
						{t("topBar.menu.importLyric.fromQRC", "Import from QRC file…")}
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={() => onImportLyric("yrc")}>
						{t("topBar.menu.importLyric.fromYRC", "Import from YRC file…")}
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={() => onImportLyric("lys")}>
						{t(
							"topBar.menu.importLyric.fromLrcfySylb",
							"Import from Lyricify Syllable file…",
						)}
					</DropdownMenu.Item>
					{importers.length > 0 && <DropdownMenu.Separator />}
					{importers.map((plugin) => (
						<DropdownMenu.Item
							key={plugin.metadata.id}
							onClick={onImportWithPlugin(plugin.metadata.id, "ttml")}
						>
							{plugin.metadata.name}
						</DropdownMenu.Item>
					))}
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>
			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>
					{t("topBar.menu.exportLyric.export", "Export lyrics")}
				</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent>
					<DropdownMenu.Item onClick={onExportLyric(stringifyLrc, "lrc")}>
						{t("topBar.menu.exportLyric.toLyRiC", "Export to LyRiC")}
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onExportLyric(stringifyEslrc, "lrc")}>
						{t("topBar.menu.exportLyric.toESLyRiC", "Export to ESLyRiC")}
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onExportLyric(stringifyQrc, "qrc")}>
						{t("topBar.menu.exportLyric.toQRC", "Export to QRC")}
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onExportLyric(stringifyYrc, "yrc")}>
						{t("topBar.menu.exportLyric.toYRC", "Export to YRC")}
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onExportLyric(stringifyLys, "lys")}>
						{t(
							"topBar.menu.exportLyric.toLrcfySylb",
							"Export to Lyricify Syllable",
						)}
					</DropdownMenu.Item>
					<DropdownMenu.Item onClick={onExportLyric(stringifyAss, "ass")}>
						{t("topBar.menu.exportLyric.toASS", "Export to ASS subtitles")}
					</DropdownMenu.Item>

					{exporters.length > 0 && <DropdownMenu.Separator />}
					{exporters.map((plugin) => (
						<DropdownMenu.Item
							key={plugin.metadata.id}
							onClick={onExportWithPlugin(plugin.metadata.id, "ttml")}
						>
							Export to {plugin.metadata.name}
						</DropdownMenu.Item>
					))}
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>
		</>
	);
};
