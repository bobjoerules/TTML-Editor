import { Button, DropdownMenu, Flex } from "@radix-ui/themes";
import {
	Broom20Regular,
	CloudArrowDown20Regular,
	CloudArrowUp20Regular,
} from "@fluentui/react-icons";
import { Toolbar } from "radix-ui";
import type { CSSProperties } from "react";
import { Trans } from "react-i18next";
import { ImportExportLyric } from "$/modules/project/modals/ImportExportLyric";
import { formatKeyBindings } from "$/utils/keybindings";
import { useTopMenuActions } from "../useTopMenuActions";

type FileMenuProps = {
	variant: "toolbar" | "submenu";
	buttonStyle?: CSSProperties;
};

const FileMenuItems = () => {
	const menu = useTopMenuActions();

	const getShortcut = (key: string[] | undefined) =>
		key ? formatKeyBindings(key) : undefined;

	return (
		<>
			<DropdownMenu.Item
				onSelect={menu.onNewFile}
				shortcut={getShortcut(menu.newFileKey)}
			>
				<Trans i18nKey="topBar.menu.newLyric">New lyrics</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Item
				onSelect={menu.onNewWindow}
				shortcut={getShortcut(menu.newWindowKey)}
			>
				<Trans i18nKey="topBar.menu.newWindow">New window</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Item
				onSelect={menu.onOpenFile}
				shortcut={getShortcut(menu.openFileKey)}
			>
				<Trans i18nKey="topBar.menu.openLyric">Open lyrics</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={menu.onOpenFileFromClipboard}>
				<Trans i18nKey="topBar.menu.openFromClipboard">
					Open TTML from clipboard
				</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Item
				onSelect={menu.onSaveFile}
				shortcut={getShortcut(menu.saveFileKey)}
			>
				<Trans i18nKey="topBar.menu.saveLyric">Save lyrics</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={menu.onSaveCleanFile}>
				<Flex align="center" gap="2">
					<Broom20Regular
						style={{ width: 15, height: 15, flexShrink: 0 }}
					/>
					<Trans i18nKey="topBar.menu.saveCleanLyric">Save clean version…</Trans>
				</Flex>
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item onSelect={menu.onOpenFromCloud}>
				<Flex align="center" gap="2">
					<CloudArrowDown20Regular
						style={{ width: 15, height: 15, flexShrink: 0 }}
					/>
					<Trans i18nKey="topBar.menu.openFromCloud">Open from Cloud...</Trans>
				</Flex>
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={menu.onSaveToCloud}>
				<Flex align="center" gap="2">
					<CloudArrowUp20Regular
						style={{ width: 15, height: 15, flexShrink: 0 }}
					/>
					<Trans i18nKey="topBar.menu.saveToCloud">Save to Cloud...</Trans>
				</Flex>
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item onSelect={menu.onOpenHistoryRestore}>
				<Trans i18nKey="topBar.menu.restoreFromHistory">
					Auto-Saves…
				</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item onSelect={menu.onSaveFileToClipboard}>
				<Trans i18nKey="topBar.menu.saveLyricToClipboard">
					Save TTML to clipboard
				</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={menu.onSaveCleanFileToClipboard}>
				<Trans i18nKey="topBar.menu.saveCleanLyricToClipboard">
					Save clean TTML to clipboard
				</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item onSelect={menu.onOpenMetadataEditor}>
				<Trans i18nKey="metadataDialog.title">Metadata Editor</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<ImportExportLyric />
		</>
	);
};

export const FileMenu = (props: FileMenuProps) => {
	if (props.variant === "submenu") {
		return (
			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>
					<Trans i18nKey="topBar.menu.file">File</Trans>
				</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent>
					<FileMenuItems />
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>
		);
	}

	return (
		<DropdownMenu.Root>
			<Toolbar.Button asChild>
				<DropdownMenu.Trigger>
					<Button
						variant="ghost"
						className="topMenuBarButton"
						style={props.buttonStyle}
					>
						<Trans i18nKey="topBar.menu.file">File</Trans>
					</Button>
				</DropdownMenu.Trigger>
			</Toolbar.Button>
			<DropdownMenu.Content>
				<FileMenuItems />
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
};
