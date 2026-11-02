# Downloader runtime notices

These tools run as separate executables. They are not linked into the editor.

- yt-dlp 2026.10.26: https://github.com/yt-dlp/yt-dlp/tree/2026.10.26
  The project is Unlicense; its Windows executable also includes third-party code.
  See the bundled `yt-dlp-LICENSE` and `yt-dlp-THIRD_PARTY_LICENSES.txt` for the applicable notices and licenses
- FFmpeg 9.0.2 essentials Windows build by Gyan Doshi:
  https://www.gyan.dev/ffmpeg/builds/
  This static build is GPLv3. Its README, license and documentation are preserved in `ffmpeg-notices/`
  FFmpeg source: https://github.com/FFmpeg/FFmpeg/tree/946fcce07b
- Deno 2.9.8: https://github.com/denoland/deno/tree/v2.9.8
  MIT license; see `deno-LICENSE.md` and the notices in that repository

The preparation script is intended for private local builds. Before distributing
an installer, provide the complete corresponding source and build material for
the exact FFmpeg build and its included libraries as required by GPLv3, and
review all bundled executable dependencies' redistribution requirements. A link
to the FFmpeg repository alone is not complete corresponding source. This local
packaging override is not enabled in the public release workflow.
