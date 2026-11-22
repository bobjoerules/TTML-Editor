import { Keyboard20Regular } from "@fluentui/react-icons";
import { Box, Flex, Heading } from "@radix-ui/themes";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardView } from "./KeyboardView";

/** Preferences › Shortcuts: the keyboard view above the shortcut list. */
export const KeyboardViewSection: FC = () => {
	const { t } = useTranslation();

	return (
		<Box mb="5">
			<Flex align="center" gap="2" mb="3">
				<Flex
					align="center"
					justify="center"
					style={{
						color: "var(--gray-11)",
						width: 20,
						height: 20,
						flexShrink: 0,
						display: "inline-flex",
						lineHeight: 1,
					}}
				>
					<Keyboard20Regular style={{ width: 20, height: 20 }} />
				</Flex>
				<Heading
					size="3"
					color="gray"
					style={{ margin: 0, display: "flex", alignItems: "center" }}
				>
					{t("keyboardView.title")}
				</Heading>
			</Flex>
			<KeyboardView />
		</Box>
	);
};
