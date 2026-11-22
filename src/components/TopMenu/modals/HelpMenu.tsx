import { Button, DropdownMenu } from "@radix-ui/themes";
import { useSetAtom } from "jotai";
import { Toolbar } from "radix-ui";
import type { CSSProperties } from "react";
import { Trans, useTranslation } from "react-i18next";
import { changelogDialogAtom, whatsNewDialogAtom } from "$/states/dialogs.ts";
import { useTopMenuActions } from "../useTopMenuActions";
import {
	guideExportedAtom,
	guidePanelOpenAtom,
	guideStepAtom,
	guideWelcomeOpenAtom,
} from "$/modules/onboarding/states";

type HelpMenuProps = {
	variant: "toolbar" | "submenu";
	buttonStyle?: CSSProperties;
};

const isWebsite =
	!import.meta.env.TAURI_ENV_PLATFORM &&
	!(
		typeof window !== "undefined" &&
		(window as unknown as { __TAURI__?: unknown }).__TAURI__
	);

const HelpMenuItems = () => {
	const { t } = useTranslation();
	const menu = useTopMenuActions();
	const setChangelogOpen = useSetAtom(changelogDialogAtom);
	const setWhatsNewOpen = useSetAtom(whatsNewDialogAtom);
	const setGuideWelcomeOpen = useSetAtom(guideWelcomeOpenAtom);
	const setGuidePanelOpen = useSetAtom(guidePanelOpenAtom);
	const setGuideStep = useSetAtom(guideStepAtom);
	const setGuideExported = useSetAtom(guideExportedAtom);

	return (
		<>
			<DropdownMenu.Item
				onSelect={() => {
					setGuideWelcomeOpen(false);
					setGuideExported(false);
					setGuideStep(0);
					setGuidePanelOpen(true);
				}}
			>
				{t("beginnerGuide.menu", "Start Guide")}
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={menu.onOpenGitHub}>GitHub</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={menu.onOpenWiki}>
				{t("topBar.menu.helpDoc", "SpicyLyrics Guides")}
			</DropdownMenu.Item>
			{isWebsite && (
				<DropdownMenu.Item
					onSelect={() =>
						window.open(
							"https://github.com/bobjoerules/TTML-Editor/releases/latest",
							"_blank",
							"noopener,noreferrer",
						)
					}
				>
					{t("topBar.menu.downloadApp", "Download Desktop App")}
				</DropdownMenu.Item>
			)}
			<DropdownMenu.Separator />
			<DropdownMenu.Item onSelect={() => setWhatsNewOpen(true)}>
				What's New
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={() => setChangelogOpen(true)}>
				Changelog & Updates
			</DropdownMenu.Item>
		</>
	);
};

export const HelpMenu = (props: HelpMenuProps) => {
	if (props.variant === "submenu") {
		return (
			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>
					<Trans i18nKey="topBar.menu.help">Help</Trans>
				</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent>
					<HelpMenuItems />
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
						<Trans i18nKey="topBar.menu.help">Help</Trans>
					</Button>
				</DropdownMenu.Trigger>
			</Toolbar.Button>
			<DropdownMenu.Content>
				<HelpMenuItems />
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
};
