# Desktop Downloader Build (Windows, macOS, Linux)

The desktop downloader is available under **Tools > Media Downloader (yt-dlp)** and can also be used directly from the **Download audio into app** option when importing lyrics.

Search by artist and song (prefilled from the open lyrics' metadata) and pick a YouTube result, or paste any HTTP(S) URL. Choose audio or video and a format, then click **Download** to select the destination folder. Each download gets its own subfolder, so it cannot overwrite another download. Closing the dialog does not stop a download; reopen it to check progress or cancel. Quitting or restarting the editor terminates any running yt-dlp/FFmpeg processes, but leaves that download's `download-*` subfolder with its partial files. Video links ignore the playlist; a playlist-only link downloads at most its first item.

Only download media you have permission to save. Site restrictions, login requirements, unavailable formats, and DRM can prevent downloading. This feature does not supply cookies, credentials, or DRM bypasses.

---

## Build with Bundled Tools

The preparation script automatically detects your platform and architecture, downloading pinned, SHA-256-verified binaries for `yt-dlp`, `ffmpeg`, `ffprobe`, and `deno` (the JavaScript engine required for YouTube extraction).

Supported targets:
- **Windows**: `x64`
- **macOS**: `arm64` (Apple Silicon) and `x64` (Intel)
- **Linux**: `x64` and `arm64`

### 1. Prepare binaries for your platform:
```bash
node scripts/prepare-downloader.mjs
```
*(Optionally specify a target: `node scripts/prepare-downloader.mjs --target darwin-arm64`)*

### 2. Run in development:
```bash
pnpm exec tauri dev --config src-tauri/tauri.downloader.conf.json
```

### 3. Build a standalone bundle / installer:
```bash
pnpm exec tauri build --config src-tauri/tauri.downloader.conf.json
```

The resulting package contains all necessary executables directly inside the app bundle. End users do not need Python, FFmpeg, or Deno installed on their system.

---

## System Tool Fallback

If the desktop app is built without the bundled tools, it automatically searches your system `PATH` (including standard locations like `/opt/homebrew/bin`, `/usr/local/bin`, and `/usr/bin` on macOS/Linux) for existing installations of `yt-dlp` and `ffmpeg`. If found on the system, yt-dlp will be used without needing to bundle the tools.

---

## Tests

```bash
pnpm exec vitest run src/modules/downloader
cargo test --manifest-path src-tauri/Cargo.toml --lib downloader -- --include-ignored
```
