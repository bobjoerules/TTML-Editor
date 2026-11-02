import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "win32" || process.arch !== "x64") {
	throw new Error(
		"The local downloader bundle currently supports Windows x64 only.",
	);
}

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, "src-tauri", "downloader-tools");
const scratch = await mkdtemp(path.join(tmpdir(), "ttml-downloader-"));
await mkdir(destination, { recursive: true });

async function download(url, filename, checksum) {
	console.log(`Downloading ${filename}`);
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${response.status}: ${url}`);
	const bytes = Buffer.from(await response.arrayBuffer());
	if (
		checksum &&
		createHash("sha256").update(bytes).digest("hex") !== checksum
	) {
		throw new Error(`Checksum mismatch: ${filename}`);
	}
	const output = path.join(scratch, filename);
	await writeFile(output, bytes);
	return output;
}

function unzip(archive, output) {
	execFileSync(
		"powershell.exe",
		[
			"-NoProfile",
			"-NonInteractive",
			"-Command",
			"Expand-Archive -LiteralPath $env:DOWNLOADER_ARCHIVE -DestinationPath $env:DOWNLOADER_EXTRACT",
		],
		{
			env: {
				...process.env,
				DOWNLOADER_ARCHIVE: archive,
				DOWNLOADER_EXTRACT: output,
			},
			stdio: "inherit",
		},
	);
}

const ytVersion = "2026.10.26";
const yt = await download(
	`https://github.com/yt-dlp/yt-dlp/releases/download/${ytVersion}/yt-dlp.exe`,
	"yt-dlp.exe",
	"f5389d3698ecde4ef06f4e6b1ce0294fe9ac1396228c8990b8d3416d6d177a7d",
);
await cp(yt, path.join(destination, "yt-dlp.exe"));
for (const name of ["LICENSE", "THIRD_PARTY_LICENSES.txt"]) {
	const file = await download(
		`https://raw.githubusercontent.com/yt-dlp/yt-dlp/${ytVersion}/${name}`,
		`yt-dlp-${name}`,
	);
	await cp(file, path.join(destination, `yt-dlp-${name}`));
}

const ffmpeg = await download(
	"https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-9.0.2-essentials_build.zip",
	"ffmpeg.zip",
	"60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba",
);
const ffDir = path.join(scratch, "ffmpeg");
unzip(ffmpeg, ffDir);
const [ffRoot] = await readdir(ffDir);
const packageDir = path.join(ffDir, ffRoot);
for (const name of ["ffmpeg.exe", "ffprobe.exe"]) {
	await cp(path.join(packageDir, "bin", name), path.join(destination, name));
}
for (const name of await readdir(packageDir)) {
	if (name !== "bin")
		await cp(
			path.join(packageDir, name),
			path.join(destination, "ffmpeg-notices", name),
			{ recursive: true },
		);
}

const denoVersion = "v2.9.8";
const deno = await download(
	`https://github.com/denoland/deno/releases/download/${denoVersion}/deno-x86_64-pc-windows-msvc.zip`,
	"deno.zip",
	"cba84b26e0df5ae7f74fc66b86a95b866872a86292ebd84fa1e959927edd93bf",
);
const denoDir = path.join(scratch, "deno");
unzip(deno, denoDir);
await cp(path.join(denoDir, "deno.exe"), path.join(destination, "deno.exe"));
const denoLicense = await download(
	`https://raw.githubusercontent.com/denoland/deno/${denoVersion}/LICENSE.md`,
	"deno-LICENSE.md",
);
await cp(denoLicense, path.join(destination, "deno-LICENSE.md"));
await cp(
	path.join(root, "packaging", "downloader", "THIRD-PARTY.md"),
	path.join(destination, "THIRD-PARTY.md"),
);
for (const binary of ["yt-dlp", "ffmpeg", "ffprobe", "deno"]) {
	const flag =
		binary === "deno" || binary === "yt-dlp" ? "--version" : "-version";
	const version = execFileSync(
		path.join(destination, `${binary}.exe`),
		[flag],
		{ encoding: "utf8" },
	).split(/\r?\n/)[0];
	console.log(version);
}
console.log(`Downloader tools ready: ${destination}`);
console.log(`Downloaded archives retained for your local build: ${scratch}`);
