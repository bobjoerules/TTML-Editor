# Local Windows downloader build

The optional desktop downloader is available under
**Tools > Media Downloader (yt-dlp)**. It is separate from **Download Audio...**,
which keeps using Joox. Search by artist and song (prefilled from the open
lyrics' metadata) and pick a YouTube result, or paste any HTTP(S) URL. Choose
audio or video and a format, then click **Download** to select the destination
folder. Each download gets its own subfolder, so it
cannot overwrite another download. Closing the dialog does not stop a download;
reopen it to check progress or cancel. Quitting or restarting the editor stops
any running yt-dlp/FFmpeg processes (they run in a kill-on-close Windows job),
but leaves that download's `download-*` subfolder with its partial files. Video links ignore the playlist; a
playlist-only link downloads at most its first item.

Only download media you have permission to save. Site restrictions, login
requirements, unavailable formats and DRM can prevent downloading. This feature
does not supply cookies, credentials or DRM bypasses. Video resolution is a
maximum, not a promise that the site has that resolution. MP4 requires an
MP4-compatible source, while MKV allows more source codecs. Audio extraction
cannot restore quality missing from the original source.

## Build on Windows x64

```powershell
pnpm install
node scripts/prepare-downloader.mjs
pnpm exec tauri dev --config src-tauri/tauri.downloader.conf.json
```

To make a local installer:

```powershell
pnpm exec tauri build --config src-tauri/tauri.downloader.conf.json
```

The preparation script downloads pinned, SHA-256-verified executable archives
for yt-dlp, FFmpeg/ffprobe and the JavaScript runtime needed for YouTube
extraction. It preserves license notices alongside the binaries. No Python,
FFmpeg or JavaScript runtime installation is needed on the installed app's
machine. The binaries are ignored by Git and need preparing on each build
machine. Re-run the script after intentionally updating its version/hash pins.
Nothing auto-updates or downloads executable code at app runtime.

The standard packaging configuration, app version and release workflows are
unchanged. A desktop build without the tools shows a setup message; the web app
does not expose the downloader menu. The preparation script currently supports
Windows x64 only, not ARM, macOS or Linux.

Read [THIRD-PARTY.md](./THIRD-PARTY.md) before publishing a fork's installers.

## Tests

```powershell
pnpm exec vitest run src/modules/downloader
cargo test --manifest-path src-tauri/Cargo.toml --lib downloader -- --include-ignored
```

The ignored bundled-tool tests require the preparation step above. Two of them
serve a generated one-second clip over loopback, test all seven output formats
and progress events, and cancel a running download without contacting a media
site. One runs a real YouTube search and needs network access.
The native folder picker still needs a manual end-to-end check in the desktop app.
