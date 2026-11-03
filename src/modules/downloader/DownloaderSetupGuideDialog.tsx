import {
	ArrowSync20Regular,
	Checkmark20Regular,
	Copy20Regular,
	Open16Regular,
	QuestionCircle20Regular,
} from "@fluentui/react-icons";
import {
	Badge,
	Box,
	Button,
	Callout,
	Card,
	Code,
	Dialog,
	Flex,
	Heading,
	Tabs,
	Text,
} from "@radix-ui/themes";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { openExternal } from "$/utils/openExternal";

interface DownloaderSetupGuideDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	available: boolean | null;
	onAvailabilityChange?: (available: boolean) => void;
}

export function DownloaderSetupGuideDialog({
	open,
	onOpenChange,
	available,
	onAvailabilityChange,
}: DownloaderSetupGuideDialogProps) {
	const { t } = useTranslation();
	const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
	const [checking, setChecking] = useState(false);

	const handleCopy = (text: string) => {
		void navigator.clipboard.writeText(text);
		setCopiedCommand(text);
		toast.success(t("downloader.copied", "Copied to clipboard!"));
		setTimeout(() => setCopiedCommand(null), 2000);
	};

	const handleRecheck = async () => {
		if (!isTauri()) {
			toast.info(
				t(
					"downloader.desktopOnly",
					"Media downloading requires the desktop app.",
				),
			);
			return;
		}
		setChecking(true);
		try {
			const isAvail = await invoke<boolean>("downloader_available");
			onAvailabilityChange?.(isAvail);
			if (isAvail) {
				toast.success(
					t(
						"downloader.toolsDetectedSuccess",
						"yt-dlp and FFmpeg detected successfully!",
					),
				);
			} else {
				toast.warn(
					t(
						"downloader.toolsNotFoundYet",
						"Tools not detected yet. Complete the installation and try again.",
					),
				);
			}
		} catch {
			toast.error(
				t(
					"downloader.checkFailed",
					"Failed to check downloader tool availability.",
				),
			);
		} finally {
			setChecking(false);
		}
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Content maxWidth="680px" style={{ maxHeight: "85vh" }}>
				<Dialog.Title>
					<Flex align="center" gap="2">
						<QuestionCircle20Regular style={{ color: "var(--accent-9)" }} />
						{t("downloader.setupGuideTitle", "Media Downloader Setup Guide")}
					</Flex>
				</Dialog.Title>
				<Dialog.Description size="2" mb="3">
					{t(
						"downloader.setupGuideDesc",
						"Because official GitHub Actions releases do not bundle yt-dlp and FFmpeg, you can install them once on your system. TTML Editor searches your system PATH automatically.",
					)}
				</Dialog.Description>

				<Tabs.Root defaultValue="mac">
					<Tabs.List>
						<Tabs.Trigger value="mac">macOS</Tabs.Trigger>
						<Tabs.Trigger value="windows">Windows</Tabs.Trigger>
						<Tabs.Trigger value="linux">Linux</Tabs.Trigger>
					</Tabs.List>

					<Box pt="3">
						{/* macOS Tab */}
						<Tabs.Content value="mac">
							<Flex direction="column" gap="3">
								<Text size="2">
									The quickest way on macOS is using <strong>Homebrew</strong>.
									It installs and links both <code>yt-dlp</code> and{" "}
									<code>ffmpeg</code> into standard system paths (
									<code>/opt/homebrew/bin</code> on Apple Silicon,{" "}
									<code>/usr/local/bin</code> on Intel).
								</Text>

								<Card style={{ background: "var(--gray-2)" }}>
									<Flex direction="column" gap="2">
										<Flex justify="between" align="center">
											<Text size="1" weight="bold" color="gray">
												TERMINAL COMMAND
											</Text>
											<Button
												size="1"
												variant="soft"
												onClick={() => handleCopy("brew install yt-dlp ffmpeg")}
											>
												{copiedCommand === "brew install yt-dlp ffmpeg" ? (
													<>
														<Checkmark20Regular /> {t("downloader.copied", "Copied!")}
													</>
												) : (
													<>
														<Copy20Regular /> {t("downloader.copyCommand", "Copy Command")}
													</>
												)}
											</Button>
										</Flex>
										<Code
											size="2"
											style={{
												padding: "8px 12px",
												display: "block",
												wordBreak: "break-all",
												fontFamily: "var(--font-mono)",
											}}
										>
											brew install yt-dlp ffmpeg
										</Code>
									</Flex>
								</Card>

								<Callout.Root color="gray" size="1">
									<Callout.Text>
										Don't have Homebrew installed yet? Open Terminal and run:
										<br />
										<Code size="1" mt="1" style={{ display: "block" }}>
											/bin/bash -c &quot;$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)&quot;
										</Code>
										Or visit{" "}
										<Button
											variant="ghost"
											size="1"
											onClick={() => openExternal("https://brew.sh")}
											style={{ padding: 0, height: "auto" }}
										>
											brew.sh <Open16Regular />
										</Button>
										.
									</Callout.Text>
								</Callout.Root>
							</Flex>
						</Tabs.Content>

						{/* Windows Tab */}
						<Tabs.Content value="windows">
							<Flex direction="column" gap="3">
								<Text size="2">
									Choose whichever installation method is most convenient:
								</Text>

								<Heading size="2" mt="1">
									Option 1: Using WinGet (Recommended, built into Windows 10/11)
								</Heading>
								<Card style={{ background: "var(--gray-2)" }}>
									<Flex direction="column" gap="2">
										<Flex justify="between" align="center">
											<Text size="1" weight="bold" color="gray">
												POWERSHELL / COMMAND PROMPT
											</Text>
											<Button
												size="1"
												variant="soft"
												onClick={() =>
													handleCopy(
														"winget install yt-dlp && winget install Gyan.FFmpeg",
													)
												}
											>
												{copiedCommand ===
												"winget install yt-dlp && winget install Gyan.FFmpeg" ? (
													<>
														<Checkmark20Regular /> {t("downloader.copied", "Copied!")}
													</>
												) : (
													<>
														<Copy20Regular /> {t("downloader.copyCommand", "Copy Command")}
													</>
												)}
											</Button>
										</Flex>
										<Code
											size="2"
											style={{
												padding: "8px 12px",
												display: "block",
												wordBreak: "break-all",
												fontFamily: "var(--font-mono)",
											}}
										>
											winget install yt-dlp && winget install Gyan.FFmpeg
										</Code>
									</Flex>
								</Card>

								<Heading size="2" mt="2">
									Option 2: Using Chocolatey or Scoop
								</Heading>
								<Card style={{ background: "var(--gray-2)" }}>
									<Flex direction="column" gap="2">
										<Flex justify="between" align="center">
											<Text size="1" weight="bold" color="gray">
												CHOCOLATEY
											</Text>
											<Button
												size="1"
												variant="soft"
												onClick={() => handleCopy("choco install yt-dlp ffmpeg")}
											>
												{copiedCommand === "choco install yt-dlp ffmpeg" ? (
													<>
														<Checkmark20Regular /> {t("downloader.copied", "Copied!")}
													</>
												) : (
													<>
														<Copy20Regular /> {t("downloader.copyCommand", "Copy Command")}
													</>
												)}
											</Button>
										</Flex>
										<Code
											size="2"
											style={{
												padding: "8px 12px",
												display: "block",
												fontFamily: "var(--font-mono)",
											}}
										>
											choco install yt-dlp ffmpeg
										</Code>
									</Flex>
								</Card>

								<Heading size="2" mt="2">
									Option 3: Manual Executable Placement
								</Heading>
								<Text size="2" color="gray">
									1. Download <code>yt-dlp.exe</code> from{" "}
									<Button
										variant="ghost"
										size="1"
										onClick={() =>
											openExternal(
												"https://github.com/yt-dlp/yt-dlp/releases/latest",
											)
										}
										style={{ padding: 0, height: "auto" }}
									>
										GitHub Releases <Open16Regular />
									</Button>
									.<br />
									2. Download <code>ffmpeg.exe</code> from{" "}
									<Button
										variant="ghost"
										size="1"
										onClick={() =>
											openExternal("https://www.gyan.dev/ffmpeg/builds/")
										}
										style={{ padding: 0, height: "auto" }}
									>
										gyan.dev <Open16Regular />
									</Button>
									.<br />
									3. Add them to your Windows <code>PATH</code>, or place them
									in a <code>downloader-tools</code> folder next to the app's
									executable.
								</Text>
							</Flex>
						</Tabs.Content>

						{/* Linux Tab */}
						<Tabs.Content value="linux">
							<Flex direction="column" gap="3">
								<Text size="2">
									Install <code>yt-dlp</code> and <code>ffmpeg</code> using your
									distribution's package manager:
								</Text>

								<Heading size="2">Ubuntu / Debian / Linux Mint</Heading>
								<Card style={{ background: "var(--gray-2)" }}>
									<Flex direction="column" gap="2">
										<Flex justify="between" align="center">
											<Text size="1" weight="bold" color="gray">
												APT COMMAND
											</Text>
											<Button
												size="1"
												variant="soft"
												onClick={() =>
													handleCopy(
														"sudo apt update && sudo apt install yt-dlp ffmpeg",
													)
												}
											>
												{copiedCommand ===
												"sudo apt update && sudo apt install yt-dlp ffmpeg" ? (
													<>
														<Checkmark20Regular /> {t("downloader.copied", "Copied!")}
													</>
												) : (
													<>
														<Copy20Regular /> {t("downloader.copyCommand", "Copy Command")}
													</>
												)}
											</Button>
										</Flex>
										<Code
											size="2"
											style={{
												padding: "8px 12px",
												display: "block",
												fontFamily: "var(--font-mono)",
											}}
										>
											sudo apt update &amp;&amp; sudo apt install yt-dlp ffmpeg
										</Code>
									</Flex>
								</Card>

								<Heading size="2" mt="2">
									Arch Linux / Manjaro
								</Heading>
								<Card style={{ background: "var(--gray-2)" }}>
									<Flex direction="column" gap="2">
										<Flex justify="between" align="center">
											<Text size="1" weight="bold" color="gray">
												PACMAN COMMAND
											</Text>
											<Button
												size="1"
												variant="soft"
												onClick={() =>
													handleCopy("sudo pacman -S yt-dlp ffmpeg")
												}
											>
												{copiedCommand === "sudo pacman -S yt-dlp ffmpeg" ? (
													<>
														<Checkmark20Regular /> {t("downloader.copied", "Copied!")}
													</>
												) : (
													<>
														<Copy20Regular /> {t("downloader.copyCommand", "Copy Command")}
													</>
												)}
											</Button>
										</Flex>
										<Code
											size="2"
											style={{
												padding: "8px 12px",
												display: "block",
												fontFamily: "var(--font-mono)",
											}}
										>
											sudo pacman -S yt-dlp ffmpeg
										</Code>
									</Flex>
								</Card>

								<Heading size="2" mt="2">
									Fedora / RHEL
								</Heading>
								<Card style={{ background: "var(--gray-2)" }}>
									<Flex direction="column" gap="2">
										<Flex justify="between" align="center">
											<Text size="1" weight="bold" color="gray">
												DNF COMMAND
											</Text>
											<Button
												size="1"
												variant="soft"
												onClick={() => handleCopy("sudo dnf install yt-dlp ffmpeg")}
											>
												{copiedCommand === "sudo dnf install yt-dlp ffmpeg" ? (
													<>
														<Checkmark20Regular /> {t("downloader.copied", "Copied!")}
													</>
												) : (
													<>
														<Copy20Regular /> {t("downloader.copyCommand", "Copy Command")}
													</>
												)}
											</Button>
										</Flex>
										<Code
											size="2"
											style={{
												padding: "8px 12px",
												display: "block",
												fontFamily: "var(--font-mono)",
											}}
										>
											sudo dnf install yt-dlp ffmpeg
										</Code>
									</Flex>
								</Card>
							</Flex>
						</Tabs.Content>
					</Box>
				</Tabs.Root>

				{/* Footer with status & actions */}
				<Flex justify="between" align="center" mt="4" wrap="wrap" gap="2">
					<Flex align="center" gap="2">
						{available === true ? (
							<Badge color="green" size="2">
								<Checkmark20Regular />
								{t("downloader.toolsReady", "yt-dlp Detected & Ready")}
							</Badge>
						) : available === false ? (
							<Badge color="amber" size="2">
								{t("downloader.toolsNotDetected", "Not Detected Yet")}
							</Badge>
						) : (
							<Badge color="gray" size="2">
								{t("downloader.checking", "Checking tools...")}
							</Badge>
						)}
						<Button
							size="1"
							variant="surface"
							onClick={handleRecheck}
							disabled={checking}
						>
							<ArrowSync20Regular />
							{checking
								? t("downloader.checking", "Checking...")
								: t("downloader.recheck", "Recheck Installation")}
						</Button>
					</Flex>
					<Button variant="soft" onClick={() => onOpenChange(false)}>
						{t("downloader.close", "Close")}
					</Button>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
}

