import {
	ClockRegular,
	DeleteRegular,
	DocumentRegular,
	HistoryRegular,
} from "@fluentui/react-icons";
import {
	Badge,
	Box,
	Button,
	Card,
	Dialog,
	Flex,
	Heading,
	IconButton,
	ScrollArea,
	Table,
	Text,
	VisuallyHidden,
} from "@radix-ui/themes";
import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
	deleteProject,
	getProjectLatestState,
	getProjectList,
	getProjectVersions,
	type ProjectInfo,
	type ProjectVersion,
} from "$/modules/project/autosave/autosave";
import { confirmDialogAtom, historyRestoreDialogAtom } from "$/states/dialogs";
import {
	newLyricLinesAtom,
	projectIdAtom,
	saveFileNameAtom,
} from "$/states/main";
import {
	formatProjectFileName,
	getSuggestedTtmlFileName,
} from "$/modules/project/logic/metadata-filename";
import { tryReloadAudioFromComputer } from "$/modules/audio/utils/autoReloadAudio";
import { error as logError } from "$/utils/logging";

export const HistoryRestoreDialog = () => {
	const [isOpen, setIsOpen] = useAtom(historyRestoreDialogAtom);
	const [projects, setProjects] = useState<ProjectInfo[]>([]);
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
		null,
	);
	const [versions, setVersions] = useState<ProjectVersion[]>([]);

	const setNewLyrics = useSetAtom(newLyricLinesAtom);
	const setProjectId = useSetAtom(projectIdAtom);
	const setSaveFileName = useSetAtom(saveFileNameAtom);
	const setConfirmDialog = useSetAtom(confirmDialogAtom);
	const { t } = useTranslation();

	const loadProjects = useCallback(async () => {
		try {
			const list = await getProjectList();
			setProjects(list);
			if (list.length > 0) {
				setSelectedProjectId((prev) => prev || list[0].id);
			}
		} catch (e) {
			logError("Failed to load project list", e);
			toast.error(
				t("historyRestoreDialog.loadError", "Failed to load history"),
			);
		}
	}, [t]);

	const loadVersions = useCallback(async (projectId: string) => {
		try {
			const list = await getProjectVersions(projectId);
			setVersions(list);
		} catch (e) {
			logError("Failed to load versions:", e);
		}
	}, []);

	const getProjectDisplayName = (project: ProjectInfo) => {
		if (project.id === "legacy_autosave_archive") {
			return t("autosave.legacyProjectName", "Legacy Snapshot");
		}
		if (project.id === "untitled_project") {
			return t("autosave.untitledProjectName", "Untitled Project");
		}

		if (project.name === "Untitled Project") {
			return t("autosave.untitledProjectName", "Untitled Project");
		}

		return project.name;
	};

	const handleRestoreLatest = (project: ProjectInfo) => {
		setConfirmDialog({
			open: true,
			title: t("historyRestoreDialog.confirm.title", "Confirm Restore"),
			description: t(
				"historyRestoreDialog.confirm.description",
				"This will overwrite all content in the current editor. Are you sure you want to restore this snapshot?",
			),
			onConfirm: async () => {
				const latestLyric = await getProjectLatestState(project.id);
				if (latestLyric) {
					setProjectId(project.id);
					setNewLyrics(latestLyric);

					const suggestedFile = getSuggestedTtmlFileName(latestLyric.metadata);
					const rawName =
						project.name &&
						project.name !== "Untitled Project" &&
						project.name !== "Legacy Snapshot" &&
						!project.name.startsWith("Untitled (")
							? project.name
							: project.saveFileName || suggestedFile?.fileName || "unnamed.ttml";
					setSaveFileName(formatProjectFileName(rawName));

					setIsOpen(false);
					toast.success(t("common.success", "Restored successfully"));

					void tryReloadAudioFromComputer({
						projectId: project.id,
						audioFileName: project.audioFileName,
						audioPath: project.audioPath,
						title: project.name,
					});
				} else {
					toast.error(t("common.error", "Data corrupted or missing"));
				}
			},
		});
	};

	const handleRestoreVersion = (version: ProjectVersion) => {
		setConfirmDialog({
			open: true,
			title: t("historyRestoreDialog.confirm.title", "Confirm Restore"),
			description: t(
				"historyRestoreDialog.confirm.description",
				"This will overwrite all content in the current editor. Are you sure you want to restore this snapshot?",
			),
			onConfirm: () => {
				setProjectId(version.projectId);
				setNewLyrics(version.data);

				const project = projects.find((p) => p.id === version.projectId);
				const suggestedFile = getSuggestedTtmlFileName(version.data.metadata);
				const rawName =
					project?.name &&
					project.name !== "Untitled Project" &&
					project.name !== "Legacy Snapshot" &&
					!project.name.startsWith("Untitled (")
						? project.name
						: version.saveFileName ||
							project?.saveFileName ||
							suggestedFile?.fileName ||
							"unnamed.ttml";
				setSaveFileName(formatProjectFileName(rawName));

				setIsOpen(false);
				toast.success(t("common.success", "Restored successfully"));

				void tryReloadAudioFromComputer({
					projectId: version.projectId,
					audioFileName: version.audioFileName || project?.audioFileName,
					audioPath: version.audioPath || project?.audioPath,
					title: project?.name,
				});
			},
		});
	};

	const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
		e.stopPropagation();
		setConfirmDialog({
			open: true,
			title: t(
				"historyRestoreDialog.deleteProject.title",
				"Delete Project Record",
			),
			description: t(
				"historyRestoreDialog.deleteProject.description",
				"Are you sure you want to delete all autosave records for this project? This cannot be undone.",
			),
			onConfirm: async () => {
				await deleteProject(projectId);
				await loadProjects();
				if (selectedProjectId === projectId) {
					setSelectedProjectId(null);
				}
				toast.success(t("common.deleteSuccess", "Deleted successfully"));
			},
		});
	};

	const formatRelativeTime = (timestamp: number) => {
		const diff = Date.now() - timestamp;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0)
			return t("time.daysAgo", "{count} day(s) ago", { count: days });
		if (hours > 0)
			return t("time.hoursAgo", "{count} hour(s) ago", { count: hours });
		if (minutes > 0)
			return t("time.minutesAgo", "{count} minute(s) ago", {
				count: minutes,
			});
		return t("time.justNow", "Just now");
	};

	useEffect(() => {
		if (isOpen) {
			loadProjects();
		} else {
			setSelectedProjectId(null);
			setVersions([]);
		}
	}, [isOpen, loadProjects]);

	useEffect(() => {
		if (selectedProjectId) {
			loadVersions(selectedProjectId);
		} else {
			setVersions([]);
		}
	}, [selectedProjectId, loadVersions]);

	const currentProject = projects.find((p) => p.id === selectedProjectId);

	return (
		<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Content
				style={{
					width: "min(880px, 92vw)",
					maxWidth: "92vw",
					height: "min(640px, 85vh)",
					maxHeight: "85vh",
					padding: 0,
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<VisuallyHidden>
					<Dialog.Title>
						{t("historyRestoreDialog.projects", "Recent Projects")}
					</Dialog.Title>
					<Dialog.Description>
						{t(
							"historyRestoreDialog.confirm.description",
							"Restore or manage project history snapshots",
						)}
					</Dialog.Description>
				</VisuallyHidden>
				<Flex
					style={{
						height: "100%",
						width: "100%",
						minHeight: 0,
						overflow: "hidden",
					}}
				>
					<Flex
						direction="column"
						style={{
							width: "280px",
							minWidth: "240px",
							flexShrink: 0,
							height: "100%",
							minHeight: 0,
							backgroundColor: "var(--gray-2)",
							borderRight: "1px solid var(--gray-5)",
						}}
					>
						<Flex
							p="4"
							align="center"
							justify="between"
							style={{ borderBottom: "1px solid var(--gray-5)" }}
						>
							<Heading size="3">
								{t("historyRestoreDialog.projects", "Recent Projects")}
							</Heading>
						</Flex>

						<Box flexGrow="1" style={{ minHeight: 0 }}>
							<ScrollArea
								type="auto"
								scrollbars="vertical"
								style={{ height: "100%" }}
							>
								<Flex direction="column">
									{projects.length === 0 ? (
										<Box p="4">
											<Text size="2" color="gray" align="center">
												{t(
													"historyRestoreDialog.noProjects",
													"No autosave records",
												)}
											</Text>
										</Box>
									) : (
										projects.map((project) => (
											<Box
												key={project.id}
												onClick={() => setSelectedProjectId(project.id)}
												style={{
													padding: "12px",
													cursor: "pointer",
													backgroundColor:
														selectedProjectId === project.id
															? "var(--accent-4)"
															: "transparent",
													borderBottom: "1px solid var(--gray-4)",
													transition: "background-color 0.2s",
												}}
											>
												<Flex justify="between" align="start">
													<Flex
														direction="column"
														gap="1"
														style={{ overflow: "hidden" }}
													>
														<Text weight="bold" size="2" truncate>
															{getProjectDisplayName(project)}
														</Text>
														<Flex gap="2" align="center">
															<ClockRegular fontSize={12} />
															<Text size="1" color="gray">
																{formatRelativeTime(project.lastModified)}
															</Text>
														</Flex>
													</Flex>
													<IconButton
														size="1"
														variant="ghost"
														color="gray"
														onClick={(e) => handleDeleteProject(e, project.id)}
													>
														<DeleteRegular />
													</IconButton>
												</Flex>
											</Box>
										))
									)}
								</Flex>
							</ScrollArea>
						</Box>
					</Flex>

					<Box
						style={{
							flexGrow: 1,
							minWidth: 0,
							height: "100%",
							minHeight: 0,
							display: "flex",
							flexDirection: "column",
							overflow: "hidden",
						}}
					>
						{currentProject ? (
							<>
								<Box
									p="4"
									style={{
										borderBottom: "1px solid var(--gray-5)",
										flexShrink: 0,
									}}
								>
									<Flex justify="between" align="start" mb="3">
										<Heading size="4">
											{getProjectDisplayName(currentProject)}
										</Heading>
									</Flex>

									<Card variant="surface">
										<Flex align="center" gap="3">
											<Box>
												<DocumentRegular fontSize={24} />
											</Box>
											<Flex
												direction="column"
												flexGrow="1"
												style={{ minWidth: 0 }}
											>
												<Text weight="bold">
													{t(
														"historyRestoreDialog.latestState",
														"Latest Version",
													)}
												</Text>
												<Text size="1" color="gray">
													{new Date(
														currentProject.lastModified,
													).toLocaleString()}
												</Text>
											</Flex>
											<Button
												onClick={() => handleRestoreLatest(currentProject)}
											>
												{t(
													"historyRestoreDialog.restoreLatest",
													"Restore this version",
												)}
											</Button>
										</Flex>
									</Card>
									{currentProject.latestState.metadata &&
										currentProject.latestState.metadata.length > 0 && (
											<Box mt="2">
												<Text size="2" weight="bold" mb="2" as="div">
													{t("metadata.title", "Metadata")}
												</Text>
												<ScrollArea type="auto" scrollbars="horizontal">
													<Flex gap="2" wrap="wrap" pb="1" pr="3">
														{currentProject.latestState.metadata.map((meta) => (
															<Badge key={meta.key} variant="soft" color="gray">
																{meta.key}: {meta.value[0]}
															</Badge>
														))}
													</Flex>
												</ScrollArea>
											</Box>
										)}
								</Box>

								<Box
									p="4"
									style={{
										flexGrow: 1,
										minHeight: 0,
										display: "flex",
										flexDirection: "column",
										overflow: "hidden",
									}}
								>
									<Flex align="center" gap="2" mb="3" style={{ flexShrink: 0 }}>
										<HistoryRegular />
										<Text weight="bold" size="2">
											{t(
												"historyRestoreDialog.historyVersions",
												"Other Versions",
											)}
										</Text>
									</Flex>

									<Box
										style={{ flexGrow: 1, minHeight: 0, overflow: "hidden" }}
									>
										<ScrollArea
											type="auto"
											scrollbars="vertical"
											style={{ height: "100%" }}
										>
											<Table.Root variant="surface">
												<Table.Header>
													<Table.Row>
														<Table.ColumnHeaderCell>
															{t("common.time", "Time")}
														</Table.ColumnHeaderCell>
														<Table.ColumnHeaderCell width="100px" />
													</Table.Row>
												</Table.Header>
												<Table.Body>
													{versions.length === 0 ? (
														<Table.Row>
															<Table.Cell colSpan={2} align="center">
																<Text color="gray" size="2">
																	{t(
																		"historyRestoreDialog.noHistory",
																		"No history records available",
																	)}
																</Text>
															</Table.Cell>
														</Table.Row>
													) : (
														versions.map((version) => (
															<Table.Row key={version.id}>
																<Table.RowHeaderCell>
																	<Flex direction="column">
																		<Text size="2">
																			{new Date(
																				version.timestamp,
																			).toLocaleTimeString()}
																		</Text>
																		<Text size="1" color="gray">
																			{new Date(
																				version.timestamp,
																			).toLocaleDateString()}
																		</Text>
																	</Flex>
																</Table.RowHeaderCell>
																<Table.Cell justify="end">
																	<Button
																		size="2"
																		variant="soft"
																		onClick={() =>
																			handleRestoreVersion(version)
																		}
																	>
																		{t("common.restore", "Restore")}
																	</Button>
																</Table.Cell>
															</Table.Row>
														))
													)}
												</Table.Body>
											</Table.Root>
										</ScrollArea>
									</Box>
								</Box>
							</>
						) : (
							<Flex
								align="center"
								justify="center"
								direction="column"
								style={{ height: "100%", color: "var(--gray-8)" }}
							>
								<DocumentRegular fontSize={48} />
								<Text mt="2">
									{t(
										"historyRestoreDialog.selectProject",
										"Please select a project from the left",
									)}
								</Text>
							</Flex>
						)}
					</Box>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};
