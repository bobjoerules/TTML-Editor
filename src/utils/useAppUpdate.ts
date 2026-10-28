import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useAtom, useStore } from "jotai";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
	updateDownloadedBytesAtom,
	updateErrorAtom,
	updateInfoAtom,
	updateProgressAtom,
	updateStatusAtom,
	updateTotalBytesAtom,
} from "$/states/update";

export function useAppUpdate() {
	const [status, setStatus] = useAtom(updateStatusAtom);
	const [update, setUpdate] = useAtom(updateInfoAtom);
	const [progress, setProgress] = useAtom(updateProgressAtom);
	const [downloadedBytes, setDownloadedBytes] = useAtom(
		updateDownloadedBytesAtom,
	);
	const [totalBytes, setTotalBytes] = useAtom(updateTotalBytesAtom);
	const [errorMsg, setErrorMsg] = useAtom(updateErrorAtom);
	const store = useStore();

	const { t } = useTranslation();

	const checkUpdate = useCallback(
		async (silent = false) => {
			const currentStatus = store.get(updateStatusAtom);
			if (currentStatus === "checking" || currentStatus === "downloading")
				return;

			setStatus("checking");
			setErrorMsg("");

			try {
				const updateResult = await check();
				if (updateResult) {
					setUpdate(updateResult);
					setStatus("available");
				} else {
					setUpdate(null);
					setStatus("up-to-date");
				}
			} catch (e) {
				if (!silent) {
					console.error("Failed to check for updates", e);
				}
				setStatus("error");
				setErrorMsg(e instanceof Error ? e.message : String(e));
			}
		},
		[setStatus, setUpdate, setErrorMsg, store.get],
	);

	const relaunchApp = useCallback(async () => {
		try {
			const { invoke } = await import("@tauri-apps/api/core");
			await invoke("restart_app");
		} catch {
			try {
				await relaunch();
			} catch (e) {
				console.error("Relaunch failed", e);
				setErrorMsg(e instanceof Error ? e.message : String(e));
			}
		}
	}, [setErrorMsg]);

	const installUpdate = useCallback(async () => {
		let currentUpdate = update;
		if (!currentUpdate) {
			setStatus("checking");
			try {
				currentUpdate = await check();
				if (!currentUpdate) {
					setStatus("up-to-date");
					return;
				}
				setUpdate(currentUpdate);
			} catch (e) {
				console.error("Failed to check for updates during install", e);
				setStatus("error");
				setErrorMsg(e instanceof Error ? e.message : String(e));
				return;
			}
		}

		setStatus("downloading");
		setProgress(0);
		setDownloadedBytes(0);
		setTotalBytes(0);
		setErrorMsg("");

		let currentDownloaded = 0;
		let currentTotal = 0;

		try {
			await currentUpdate.downloadAndInstall((event) => {
				switch (event.event) {
					case "Started":
						currentTotal = event.data.contentLength || 0;
						setTotalBytes(currentTotal);
						currentDownloaded = 0;
						setDownloadedBytes(0);
						setProgress(0);
						break;
					case "Progress":
						currentDownloaded += event.data.chunkLength;
						setDownloadedBytes(currentDownloaded);
						if (currentTotal > 0) {
							setProgress(
								Math.min(100, (currentDownloaded / currentTotal) * 100),
							);
						}
						break;
					case "Finished":
						setProgress(100);
						break;
				}
			});

			setStatus("ready");

			// Trigger restart
			await relaunchApp();
		} catch (e) {
			console.error("Failed to install update", e);
			setStatus("error");
			const details = e instanceof Error ? e.message : String(e);
			setErrorMsg(
				details || t("app.update.installError", "Failed to install update"),
			);
		}
	}, [
		update,
		t,
		setStatus,
		setUpdate,
		setProgress,
		setDownloadedBytes,
		setTotalBytes,
		setErrorMsg,
		relaunchApp,
	]);

	return {
		status,
		update,
		progress,
		downloadedBytes,
		totalBytes,
		errorMsg,
		checkUpdate,
		installUpdate,
		relaunchApp,
	};
}
