import { BUILD_TIME, GIT_COMMIT } from "virtual:buildmeta";
import {
	ArrowSync24Regular,
	BoxRegular,
	CheckmarkCircle24Regular,
	CloudArrowDown24Regular,
	MusicNote1Regular,
	Open16Regular,
	SearchRegular,
	SettingsRegular,
	StarRegular,
} from "@fluentui/react-icons";
import {
	AlertDialog,
	Avatar,
	Badge,
	Box,
	Button,
	Card,
	Flex,
	Grid,
	Heading,
	Link,
	Progress,
	Text,
} from "@radix-ui/themes";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { openExternal } from "$/utils/openExternal";
import { clearWebsiteCache, forceWebsiteRefresh } from "$/utils/pwa";
import { useAppUpdate } from "$/utils/useAppUpdate";

export const SettingsAboutTab = () => {
	const { t } = useTranslation();
	const {
		status,
		update,
		progress,
		downloadedBytes,
		totalBytes,
		errorMsg,
		installUpdate,
		checkUpdate,
		relaunchApp,
	} = useAppUpdate();
	const [cacheConfirmationOpen, setCacheConfirmationOpen] = useState(false);
	const [recoveryAction, setRecoveryAction] = useState<
		"refresh" | "clear" | null
	>(null);

	const isWebsite = !import.meta.env.TAURI_ENV_PLATFORM;

	const handleForceRefresh = async () => {
		setRecoveryAction("refresh");
		try {
			await forceWebsiteRefresh();
		} finally {
			setRecoveryAction(null);
		}
	};

	const handleClearCache = async () => {
		setRecoveryAction("clear");
		try {
			await clearWebsiteCache();
		} finally {
			setRecoveryAction(null);
			setCacheConfirmationOpen(false);
		}
	};

	return (
		<Flex direction="column" gap="4">
			{/* Software Update at top (Desktop) */}
			{!isWebsite && (
				<Card>
					<Flex direction="column" gap="3">
						<Flex align="center" justify="between" wrap="wrap" gap="2">
							<Flex align="center" gap="2">
								<Heading size="3" style={{ margin: 0 }}>
									{t("settings.about.update", "Software Update")}
								</Heading>
								{status === "available" && (
									<Badge
										color="ruby"
										size="1"
										variant="soft"
										radius="full"
										style={{
											display: "inline-flex",
											alignItems: "center",
											padding: "2px 8px",
											fontWeight: 500,
										}}
									>
										{t("settings.about.newVersion", "New Version")}
									</Badge>
								)}
								{status === "up-to-date" && (
									<Badge
										color="green"
										size="1"
										variant="soft"
										radius="full"
										style={{
											display: "inline-flex",
											alignItems: "center",
											padding: "2px 8px",
											fontWeight: 500,
										}}
									>
										{t("settings.about.upToDate", "Up to date")}
									</Badge>
								)}
								{status === "error" && (
									<Badge
										color="red"
										size="1"
										variant="soft"
										radius="full"
										style={{
											display: "inline-flex",
											alignItems: "center",
											padding: "2px 8px",
											fontWeight: 500,
										}}
									>
										{t("settings.about.errorBadge", "Update Failed")}
									</Badge>
								)}
							</Flex>

							<Flex gap="2">
								{status === "downloading" && (
									<Button disabled>
										<CloudArrowDown24Regular />
										{t("settings.about.downloading", "Downloading update...")}
									</Button>
								)}
								{status === "checking" && (
									<Button variant="soft" disabled>
										<CloudArrowDown24Regular />
										{t("settings.about.checking", "Checking for Updates...")}
									</Button>
								)}
								{status === "available" && (
									<Button onClick={installUpdate}>
										<CloudArrowDown24Regular />
										{t("settings.about.updateNow", "Update Now")}
									</Button>
								)}
								{status === "ready" && (
									<Button onClick={relaunchApp}>
										<ArrowSync24Regular />
										{t("settings.about.restart", "Restart Application")}
									</Button>
								)}
								{["idle", "up-to-date", "error"].includes(status) && (
									<Button variant="soft" onClick={() => checkUpdate(false)}>
										<CloudArrowDown24Regular />
										{status === "error"
											? t("settings.about.retryUpdate", "Retry Update Check")
											: t("settings.about.checkUpdate", "Check for Updates")}
									</Button>
								)}
							</Flex>
						</Flex>

						<Box>
							{status === "available" && update && (
								<Flex direction="column" gap="3">
									<Flex
										direction="column"
										gap="1"
										style={{
											padding: "8px",
											background: "var(--gray-3)",
											borderRadius: "6px",
										}}
									>
										<Text weight="bold" size="2">
											{update.version}
										</Text>
										<Text size="1" style={{ whiteSpace: "pre-wrap" }}>
											{update.body}
										</Text>
									</Flex>
								</Flex>
							)}

							{status === "downloading" && (
								<Flex direction="column" gap="2">
									<Flex justify="between">
										<Text size="2">
											{t("settings.about.downloading", "Downloading update...")}
										</Text>
										<Text size="2">
											{totalBytes > 0
												? `${progress.toFixed(0)}% (${(downloadedBytes / (1024 * 1024)).toFixed(1)} / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB)`
												: downloadedBytes > 0
													? `${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB`
													: `${progress.toFixed(0)}%`}
										</Text>
									</Flex>
									<Progress value={totalBytes > 0 ? progress : undefined} />
								</Flex>
							)}

							{status === "error" && errorMsg && (
								<Flex
									direction="column"
									gap="1"
									style={{
										padding: "8px 12px",
										background: "var(--red-3)",
										border: "1px solid var(--red-6)",
										borderRadius: "6px",
									}}
								>
									<Text size="2" color="red" weight="bold">
										{t("settings.about.updateError", "Update error")}
									</Text>
									<Text size="1" color="red" style={{ wordBreak: "break-all" }}>
										{errorMsg}
									</Text>
								</Flex>
							)}

							{status === "ready" && (
								<Flex align="center" justify="between" wrap="wrap" gap="2">
									<Flex align="center" gap="2">
										<CheckmarkCircle24Regular color="var(--ruby-9)" />
										<Text size="2">
											{t(
												"settings.about.ready",
												"Update ready, restart application to apply",
											)}
										</Text>
									</Flex>
									<Button onClick={relaunchApp}>
										<ArrowSync24Regular />
										{t("settings.about.restart", "Restart Application")}
									</Button>
								</Flex>
							)}

							{status === "checking" && (
								<Text size="2" color="gray">
									{t("settings.about.checking", "Checking for updates...")}
								</Text>
							)}
						</Box>
					</Flex>
				</Card>
			)}

			{/* Website Update at top (Browser PWA) */}
			{isWebsite && (
				<Card>
					<Flex direction="column" gap="3">
						<Flex align="center" justify="between" wrap="wrap" gap="2">
							<Heading size="3">
								{t("settings.about.websiteUpdate", "Website Update")}
							</Heading>
							<Flex gap="2">
								<Button
									onClick={handleForceRefresh}
									disabled={recoveryAction !== null}
								>
									{t("settings.about.forceRefresh", "Update Website Now")}
								</Button>
								<Button
									variant="soft"
									color="red"
									onClick={() => setCacheConfirmationOpen(true)}
									disabled={recoveryAction !== null}
								>
									{t("settings.about.clearWebsiteCache", "Clear Cache")}
								</Button>
							</Flex>
						</Flex>
						<Text size="2" color="gray">
							{t(
								"settings.about.websiteUpdateDescription",
								"Refresh the website to retrieve the latest version if an update prompt did not appear.",
							)}
						</Text>
					</Flex>
				</Card>
			)}

			<Card>
				<Flex direction="column" gap="3">
					<Heading size="3">
						{t("aboutModal.maintainers", "Fork Maintainers")}
					</Heading>
					<Text size="2" color="gray">
						{t(
							"aboutModal.maintainersDesc",
							"This fork is maintained and developed by:",
						)}
					</Text>
					<Box
						p="3"
						style={{
							background: "var(--gray-3)",
							borderRadius: "var(--radius-3)",
						}}
					>
						<Flex align="center">
							<Flex align="center" gap="2" style={{ minWidth: 0, flex: 1 }}>
								<Avatar
									src="https://avatars.githubusercontent.com/bobjoerules"
									fallback="M"
									size="3"
									radius="small"
								/>
								<Flex direction="column" gap="1">
									<Text as="div" weight="bold">
										Bobjoerules
									</Text>
									<Text as="div" size="1" color="gray">
										{t(
											"aboutModal.forkMaintainer",
											"Fork maintainer & contributor",
										)}
									</Text>
								</Flex>
							</Flex>
							<Button asChild variant="soft" size="1">
								<a
									href="https://github.com/bobjoerules"
									target="_blank"
									rel="noreferrer"
									aria-label={t("aboutModal.visitWebsite", "Visit website")}
								>
									<Open16Regular />
								</a>
							</Button>
						</Flex>
					</Box>
				</Flex>
			</Card>

			<Card>
				<Flex direction="column" gap="3">
					<Heading size="3">
						{t("aboutModal.credits", "Credits & Third-Party Notices")}
					</Heading>
					<Text size="2" color="gray">
						{t(
							"aboutModal.creditsIntro",
							"This project includes work adapted from the following open-source projects.",
						)}
					</Text>
					<Grid columns="2" gap="3">
						<Card variant="classic" style={{ padding: "var(--space-3)" }}>
							<Flex direction="column" gap="2">
								<Flex align="center" gap="2">
									<Flex
										align="center"
										justify="center"
										style={{
											color: "var(--ruby-11)",
											width: 20,
											height: 20,
											flexShrink: 0,
											display: "inline-flex",
											lineHeight: 1,
										}}
									>
										<StarRegular />
									</Flex>
									<Heading
										size="3"
										style={{ margin: 0, display: "flex", alignItems: "center" }}
									>
										Spicy Lyrics
									</Heading>
								</Flex>
								<Text size="2" color="gray">
									Renderer and font adapted from{" "}
									<Link
										href="https://github.com/Spikerko/Spicy-Lyrics"
										target="_blank"
										rel="noreferrer"
									>
										Spicy Lyrics
									</Link>{" "}
									by Spikerko and contributors, licensed under
									AGPL-3.0-or-later.
								</Text>
							</Flex>
						</Card>
						<Card variant="classic" style={{ padding: "var(--space-3)" }}>
							<Flex direction="column" gap="2">
								<Flex align="center" gap="2">
									<Flex
										align="center"
										justify="center"
										style={{
											color: "var(--violet-11)",
											width: 20,
											height: 20,
											flexShrink: 0,
											display: "inline-flex",
											lineHeight: 1,
										}}
									>
										<SettingsRegular />
									</Flex>
									<Heading
										size="3"
										style={{ margin: 0, display: "flex", alignItems: "center" }}
									>
										Fraktality Spring
									</Heading>
								</Flex>
								<Text size="2" color="gray">
									Analytic spring implementation derived from Fraktality&apos;s{" "}
									<code>spr.lua</code>, licensed under the MIT License.
								</Text>
							</Flex>
						</Card>
						<Card variant="classic" style={{ padding: "var(--space-3)" }}>
							<Flex direction="column" gap="2">
								<Flex align="center" gap="2">
									<Flex
										align="center"
										justify="center"
										style={{
											color: "var(--cyan-11)",
											width: 20,
											height: 20,
											flexShrink: 0,
											display: "inline-flex",
											lineHeight: 1,
										}}
									>
										<MusicNote1Regular />
									</Flex>
									<Heading
										size="3"
										style={{ margin: 0, display: "flex", alignItems: "center" }}
									>
										Prosodic Engine
									</Heading>
								</Flex>
								<Text size="2" color="gray">
									Syllabification engine and dictionary adapted from{" "}
									<Link
										href="https://github.com/amll-dev/amll-editor"
										target="_blank"
										rel="noreferrer"
									>
										amll-dev/amll-editor
									</Link>
									, licensed under GNU AGPL-3.0-only.
								</Text>
							</Flex>
						</Card>
						<Card variant="classic" style={{ padding: "var(--space-3)" }}>
							<Flex direction="column" gap="2">
								<Flex align="center" gap="2">
									<Flex
										align="center"
										justify="center"
										style={{
											color: "var(--green-11)",
											width: 20,
											height: 20,
											flexShrink: 0,
											display: "inline-flex",
											lineHeight: 1,
										}}
									>
										<SearchRegular />
									</Flex>
									<Heading
										size="3"
										style={{ margin: 0, display: "flex", alignItems: "center" }}
									>
										SpotMatch
									</Heading>
								</Flex>
								<Text size="2" color="gray">
									Alternate Spotify recording ID discovery tool and algorithm
									adapted from{" "}
									<Link
										href="https://github.com/TheX24/SpotMatch"
										target="_blank"
										rel="noreferrer"
									>
										SpotMatch
									</Link>{" "}
									by TheX24.
								</Text>
							</Flex>
						</Card>
						<Card variant="classic" style={{ padding: "var(--space-3)" }}>
							<Flex direction="column" gap="2">
								<Flex align="center" gap="2">
									<Flex
										align="center"
										justify="center"
										style={{
											color: "var(--gold-11)",
											width: 20,
											height: 20,
											flexShrink: 0,
											display: "inline-flex",
											lineHeight: 1,
										}}
									>
										<BoxRegular />
									</Flex>
									<Heading
										size="3"
										style={{ margin: 0, display: "flex", alignItems: "center" }}
									>
										AMLL TTML Tool
									</Heading>
								</Flex>
								<Text size="2" color="gray">
									Forked from{" "}
									<Link
										href="https://github.com/amll-dev/amll-ttml-tool"
										target="_blank"
										rel="noreferrer"
									>
										amll-dev/amll-ttml-tool
									</Link>
									, licensed under GPL-3.0-or-later.
								</Text>
							</Flex>
						</Card>
					</Grid>
				</Flex>
			</Card>

			<Card>
				<Flex direction="column" gap="3">
					<Heading size="3">
						{t("aboutModal.community", "Community & Contributions")}
					</Heading>
					<Text size="2" color="gray">
						{t(
							"aboutModal.communityDesc",
							"Help us make the tool better by contributing code, reporting issues, or providing translations.",
						)}
					</Text>
					<Flex gap="3" mt="1">
						<Button
							variant="soft"
							onClick={() =>
								openExternal("https://github.com/bobjoerules/AMLL-TTML-TOOL")
							}
						>
							{t("aboutModal.github", "GitHub Repository")}
						</Button>
					</Flex>
				</Flex>
			</Card>

			<AlertDialog.Root
				open={cacheConfirmationOpen}
				onOpenChange={setCacheConfirmationOpen}
			>
				<AlertDialog.Content maxWidth="420px">
					<AlertDialog.Title>
						{t(
							"settings.about.clearWebsiteCacheTitle",
							"Clear cached website data?",
						)}
					</AlertDialog.Title>
					<AlertDialog.Description size="2">
						{t(
							"settings.about.clearWebsiteCacheDescription",
							"This removes offline website files and reloads the page. Your saved projects and preferences will not be deleted.",
						)}
					</AlertDialog.Description>
					<Flex gap="3" mt="4" justify="end">
						<AlertDialog.Cancel>
							<Button
								variant="soft"
								color="gray"
								disabled={recoveryAction !== null}
							>
								{t("common.cancel", "Cancel")}
							</Button>
						</AlertDialog.Cancel>
						<AlertDialog.Action>
							<Button
								color="red"
								onClick={handleClearCache}
								disabled={recoveryAction !== null}
							>
								{t(
									"settings.about.clearWebsiteCache",
									"Clear cached website data",
								)}
							</Button>
						</AlertDialog.Action>
					</Flex>
				</AlertDialog.Content>
			</AlertDialog.Root>

			<Card>
				<Flex direction="column" gap="2">
					<Flex direction="column" gap="1">
						<Text as="div" size="2">
							{t("aboutModal.buildDate", "Build Date: {date}", {
								date: BUILD_TIME,
							})}
						</Text>
						<Text as="div" size="2">
							{t("aboutModal.gitCommit", "Git Commit: {commit}", {
								commit:
									GIT_COMMIT === "unknown" ? (
										t("aboutModal.unknown", "Unknown")
									) : (
										<Link
											href={`https://github.com/bobjoerules/AMLL-TTML-TOOL/commit/${GIT_COMMIT}`}
											target="_blank"
											rel="noreferrer"
											onClick={(event) => {
												if (import.meta.env.TAURI_ENV_PLATFORM) {
													event.preventDefault();
													openExternal(
														`https://github.com/bobjoerules/AMLL-TTML-TOOL/commit/${GIT_COMMIT}`,
													);
												}
											}}
										>
											{GIT_COMMIT}
										</Link>
									),
							})}
						</Text>
					</Flex>
				</Flex>
			</Card>
		</Flex>
	);
};
