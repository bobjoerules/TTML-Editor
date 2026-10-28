import {
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import { log, warn } from "$/utils/logging.ts";
import styles from "./index.module.css";
import { MacOSSystemsControls } from "./macos.tsx";
import { WindowsSystemsControls } from "./windows.tsx";

export type WindowControlsVariant = "windows" | "macos";

export interface WindowControlsProps {
	variant?: WindowControlsVariant;
	titleChildren?: ReactNode;
	startChildren?: ReactNode;
	endChildren?: ReactNode;
	onClosed?: () => void;
	onMaximized?: () => void;
	onMinimized?: () => void;
	onSpacerClicked?: () => void;
}

export interface SystemControlProps {
	isMaximized: boolean;
	isFullscreen?: boolean;
	onClosed: () => void;
	onMaximized: () => void;
	onMinimized: () => void;
}

export default function WindowControls(props: WindowControlsProps) {
	const [variant, setVariant] = useState<WindowControlsVariant>("windows");
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isMaximized, setIsMaximized] = useState(false);
	const placeLeft = useMemo(() => variant === "macos", [variant]);

	useLayoutEffect(() => {
		if (props.variant) return setVariant(props.variant);
		if (import.meta.env.DEV)
			log(
				"Setting variant based on platform:",
				import.meta.env.TAURI_ENV_PLATFORM,
			);
		switch (import.meta.env.TAURI_ENV_PLATFORM) {
			case "windows":
				return setVariant("windows");
			case "darwin":
				return setVariant("macos");
			case "linux":
				return setVariant("windows");
		}
	}, [props.variant]);

	useEffect(() => {
		let isCleanedUp = false;
		let unlistenResized: (() => void) | undefined;
		let timer: ReturnType<typeof setTimeout> | null = null;

		const updateFullscreenState = async () => {
			try {
				if (
					typeof window !== "undefined" &&
					(!!(window as unknown as { __TAURI__?: unknown }).__TAURI__ ||
						!!import.meta.env.TAURI_ENV_PLATFORM)
				) {
					const { getCurrentWindow } = await import("@tauri-apps/api/window");
					const win = getCurrentWindow();
					const [fs, max] = await Promise.all([
						win.isFullscreen().catch(() => false),
						win.isMaximized().catch(() => false),
					]);
					if (!isCleanedUp) {
						setIsFullscreen(fs);
						setIsMaximized(max);
					}
					return;
				}
			} catch {}

			if (!isCleanedUp) {
				setIsFullscreen(!!document.fullscreenElement);
			}
		};

		const handleResize = () => {
			updateFullscreenState();
			if (timer) clearTimeout(timer);
			timer = setTimeout(updateFullscreenState, 350);
		};

		updateFullscreenState();

		window.addEventListener("resize", handleResize);
		document.addEventListener("fullscreenchange", handleResize);

		if (
			typeof window !== "undefined" &&
			(!!(window as unknown as { __TAURI__?: unknown }).__TAURI__ ||
				!!import.meta.env.TAURI_ENV_PLATFORM)
		) {
			import("@tauri-apps/api/window")
				.then(({ getCurrentWindow }) => {
					if (isCleanedUp) return;
					return getCurrentWindow().onResized(() => {
						handleResize();
					});
				})
				.then((unlisten) => {
					if (isCleanedUp) {
						unlisten?.();
					} else {
						unlistenResized = unlisten;
					}
				})
				.catch(() => {});
		}

		return () => {
			isCleanedUp = true;
			if (timer) clearTimeout(timer);
			window.removeEventListener("resize", handleResize);
			document.removeEventListener("fullscreenchange", handleResize);
			unlistenResized?.();
		};
	}, []);

	const onClosed = useCallback(async () => {
		if (props.onClosed) return props.onClosed();
		try {
			const tauriWin = import("@tauri-apps/api/window");
			await (await tauriWin).getCurrentWindow().close();
		} catch (err) {
			if (import.meta.env.DEV) warn(err);
		}
	}, [props.onClosed]);

	const onMaximized = useCallback(async () => {
		if (props.onMaximized) return props.onMaximized();
		try {
			const tauriWin = import("@tauri-apps/api/window");
			const win = (await tauriWin).getCurrentWindow();
			const canMaximize = await win.isMaximizable().catch(() => true);
			if (!canMaximize) return;
			await win.toggleMaximize().catch(async () => {
				const isMax = await win.isMaximized().catch(() => false);
				if (isMax) {
					await win.unmaximize();
				} else {
					await win.maximize();
				}
			});
			const isMaxNow = await win.isMaximized().catch(() => false);
			setIsMaximized(isMaxNow);
		} catch (err) {
			if (import.meta.env.DEV) warn(err);
		}
	}, [props.onMaximized]);

	const onMinimized = useCallback(async () => {
		if (props.onMinimized) return props.onMinimized();
		try {
			const tauriWin = import("@tauri-apps/api/window");
			const win = (await tauriWin).getCurrentWindow();
			const canMinimize = await win.isMinimizable().catch(() => true);
			if (!canMinimize) return;
			await win.minimize();
		} catch (err) {
			if (import.meta.env.DEV) warn(err);
		}
	}, [props.onMinimized]);

	const systemControls: ReactNode = (() => {
		if (!import.meta.env.TAURI_ENV_PLATFORM) return null;
		if (variant === "windows") {
			return (
				<WindowsSystemsControls
					isMaximized={isMaximized}
					onClosed={onClosed}
					onMaximized={onMaximized}
					onMinimized={onMinimized}
				/>
			);
		} else if (variant === "macos") {
			return (
				<MacOSSystemsControls
					isMaximized={isMaximized}
					isFullscreen={isFullscreen}
					onClosed={onClosed}
					onMaximized={onMaximized}
					onMinimized={onMinimized}
				/>
			);
		} else if (variant === "gtk") {
		} else {
			return null;
		}
	})();

	return (
		<div className={styles.windowControls}>
			<div className={styles.leftSide}>
				{placeLeft && systemControls}
				<div className={styles.leftSlot}>{props.startChildren}</div>
				<div
					className={styles.spacer}
					onClick={props.onSpacerClicked}
					data-tauri-drag-region
				/>
			</div>
			<div className={styles.centerSlot} data-tauri-drag-region>
				{props.titleChildren}
			</div>
			<div className={styles.rightSide}>
				<div
					className={styles.spacer}
					onClick={props.onSpacerClicked}
					data-tauri-drag-region
				/>
				<div className={styles.rightSlot}>{props.endChildren}</div>
				{!placeLeft && systemControls}
			</div>
		</div>
	);
}
