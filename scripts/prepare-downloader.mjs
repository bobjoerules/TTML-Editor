import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const targetArg =
	process.argv.find((a) => a.startsWith("--target="))?.split("=")[1] ||
	(process.argv.includes("--target")
		? process.argv[process.argv.indexOf("--target") + 1]
		: null);

const currentTarget = `${process.platform}-${process.arch}`;
const target = targetArg || currentTarget;

const [platform, arch] = target.split("-");

const SUPPORTED_TARGETS = [
	"win32-x64",
	"darwin-arm64",
	"darwin-x64",
	"linux-x64",
	"linux-arm64",
];

if (!SUPPORTED_TARGETS.includes(target)) {
	throw new Error(
		`Unsupported target: ${target}. Supported targets are: ${SUPPORTED_TARGETS.join(", ")}`,
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
	if (process.platform === "win32") {
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
	} else {
		try {
			execFileSync("unzip", ["-q", "-o", archive, "-d", output], {
				stdio: "inherit",
			});
		} catch {
			execFileSync("tar", ["-xf", archive, "-C", output], {
				stdio: "inherit",
			});
		}
	}
}

async function decompressGz(gzPath, outPath) {
	const compressed = await readFile(gzPath);
	const decompressed = gunzipSync(compressed);
	await writeFile(outPath, decompressed);
}

console.log(`Preparing downloader tools for ${target}...`);

const ytVersion = "2026.10.26";
const denoVersion = "v2.9.8";
const ffmpegStaticVersion = "b6.1.1";

const exeSuffix = platform === "win32" ? ".exe" : "";

// 1. YT-DLP
let ytUrl;
let ytHash;
let ytOutName = `yt-dlp${exeSuffix}`;

if (platform === "win32") {
	ytUrl = `https://github.com/yt-dlp/yt-dlp/releases/download/${ytVersion}/yt-dlp.exe`;
	ytHash = "f5389d3698ecde4ef06f4e6b1ce0294fe9ac1396228c8990b8d3416d6d177a7d";
} else if (platform === "darwin") {
	// Universal binary for macOS (supports both x86_64 and arm64)
	ytUrl = `https://github.com/yt-dlp/yt-dlp/releases/download/${ytVersion}/yt-dlp_macos`;
	ytHash = "0f922c15ccc0b83eefa1c8bc9104e434318c4bf16e408e1ee93b7745a6efe0aa";
} else if (platform === "linux") {
	if (arch === "arm64") {
		ytUrl = `https://github.com/yt-dlp/yt-dlp/releases/download/${ytVersion}/yt-dlp_linux_aarch64`;
		ytHash = "e87e9533e89fe5889abaa21f5114dfe7756d6aa6219b83551add04d48b18e483";
	} else {
		ytUrl = `https://github.com/yt-dlp/yt-dlp/releases/download/${ytVersion}/yt-dlp_linux`;
		ytHash = "767ba9dce7052aa196f8b12652f433d76de128ba168966fa84b6394d5e6c6795";
	}
}

const ytDownloaded = await download(ytUrl, `yt-dlp-${target}${exeSuffix}`, ytHash);
await cp(ytDownloaded, path.join(destination, ytOutName));
if (platform !== "win32") {
	await chmod(path.join(destination, ytOutName), 0o755);
}

for (const name of ["LICENSE", "THIRD_PARTY_LICENSES.txt"]) {
	const file = await download(
		`https://raw.githubusercontent.com/yt-dlp/yt-dlp/${ytVersion}/${name}`,
		`yt-dlp-${name}`,
	);
	await cp(file, path.join(destination, `yt-dlp-${name}`));
}

// 2. FFMPEG & FFPROBE
const ffmpegNoticesDir = path.join(destination, "ffmpeg-notices");
await mkdir(ffmpegNoticesDir, { recursive: true });

if (platform === "win32") {
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
		if (name !== "bin") {
			await cp(
				path.join(packageDir, name),
				path.join(ffmpegNoticesDir, name),
				{ recursive: true },
			);
		}
	}
} else {
	const ffmpegHashes = {
		"darwin-arm64": {
			ffmpeg: "8923876afa8db5585022d7860ec7e589af192f441c56793971276d450ed3bbfa",
			ffprobe: "d986a8ec7b030899fe66a8a288ed809a3543338705a3ce178cfb85869c5d80be",
		},
		"darwin-x64": {
			ffmpeg: "929b375c1182d956c51f7ac25e0b2b0411fb01f6f407aa15c9758efeb4242106",
			ffprobe: "d4da574d6e2e197bd259b47d69cf262df9e312af24ad960444f6d806d3d4c186",
		},
		"linux-x64": {
			ffmpeg: "bfe8a8fc511530457b528c48d77b5737527b504a3797a9bc4866aeca69c2dffa",
			ffprobe: "25d9b6ccb05e3d9de9e04e31e2506d8dd7f9f0418981965ac6df12e8d3afd067",
		},
		"linux-arm64": {
			ffmpeg: "754a678672298bc68156adff58aa7385a592c2b30b1d0ae8750c45c915c4bac0",
			ffprobe: "2ab6aba60ee84412dff9188720703376cb4e7aaf7e0b5e43aa8249f2acae5bf8",
		},
	};

	const hashes = ffmpegHashes[target];
	const ffGz = await download(
		`https://github.com/eugeneware/ffmpeg-static/releases/download/${ffmpegStaticVersion}/ffmpeg-${target}.gz`,
		`ffmpeg-${target}.gz`,
		hashes.ffmpeg,
	);
	const ffprobeGz = await download(
		`https://github.com/eugeneware/ffmpeg-static/releases/download/${ffmpegStaticVersion}/ffprobe-${target}.gz`,
		`ffprobe-${target}.gz`,
		hashes.ffprobe,
	);

	await decompressGz(ffGz, path.join(destination, "ffmpeg"));
	await decompressGz(ffprobeGz, path.join(destination, "ffprobe"));
	await chmod(path.join(destination, "ffmpeg"), 0o755);
	await chmod(path.join(destination, "ffprobe"), 0o755);

	const licenseFile = await download(
		`https://github.com/eugeneware/ffmpeg-static/releases/download/${ffmpegStaticVersion}/${target}.LICENSE`,
		`ffmpeg-${target}.LICENSE`,
	);
	await cp(licenseFile, path.join(ffmpegNoticesDir, "LICENSE"));
}

// 3. DENO
const denoTargets = {
	"win32-x64": {
		artifact: "deno-x86_64-pc-windows-msvc.zip",
		hash: "cba84b26e0df5ae7f74fc66b86a95b866872a86292ebd84fa1e959927edd93bf",
	},
	"darwin-arm64": {
		artifact: "deno-aarch64-apple-darwin.zip",
		hash: "9f0bf660393da2eaff044cdc7444cb08c73f235849b61d224d825a194ce7c98e",
	},
	"darwin-x64": {
		artifact: "deno-x86_64-apple-darwin.zip",
		hash: "4b2f5edd2639b7470f034238b321d7002d8dfb4726d8558f52c17afac370eb2c",
	},
	"linux-x64": {
		artifact: "deno-x86_64-unknown-linux-gnu.zip",
		hash: "e890975bc2549807bbcc0b584ffafda72cc7c93349dd99c80483dd784f6c4609",
	},
	"linux-arm64": {
		artifact: "deno-aarch64-unknown-linux-gnu.zip",
		hash: "d49596c20b9788cf8f5d8ddf644103d4bde56ed239753f0bdb92ba9361d51905",
	},
};

const denoInfo = denoTargets[target];
const deno = await download(
	`https://github.com/denoland/deno/releases/download/${denoVersion}/${denoInfo.artifact}`,
	`deno-${target}.zip`,
	denoInfo.hash,
);

const denoDir = path.join(scratch, "deno");
unzip(deno, denoDir);
const denoBinName = `deno${exeSuffix}`;
await cp(path.join(denoDir, denoBinName), path.join(destination, denoBinName));
if (platform !== "win32") {
	await chmod(path.join(destination, denoBinName), 0o755);
}

const denoLicense = await download(
	`https://raw.githubusercontent.com/denoland/deno/${denoVersion}/LICENSE.md`,
	"deno-LICENSE.md",
);
await cp(denoLicense, path.join(destination, "deno-LICENSE.md"));

// 4. THIRD-PARTY NOTICE
await cp(
	path.join(root, "packaging", "downloader", "THIRD-PARTY.md"),
	path.join(destination, "THIRD-PARTY.md"),
);

// 5. Test execution if target matches host platform and architecture
if (target === currentTarget) {
	console.log("Verifying binary execution on host...");
	for (const binary of ["yt-dlp", "ffmpeg", "ffprobe", "deno"]) {
		const flag =
			binary === "deno" || binary === "yt-dlp" ? "--version" : "-version";
		const binaryPath = path.join(destination, `${binary}${exeSuffix}`);
		const version = execFileSync(binaryPath, [flag], {
			encoding: "utf8",
		}).split(/\r?\n/)[0];
		console.log(`${binary}: ${version}`);
	}
} else {
	console.log(`Prepared binaries for target ${target} (skipping execution test on ${currentTarget})`);
}

await rm(scratch, { recursive: true, force: true });
console.log(`Downloader tools ready: ${destination}`);
