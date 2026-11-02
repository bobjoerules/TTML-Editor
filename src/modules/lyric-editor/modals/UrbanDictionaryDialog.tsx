import {
	BookSearchRegular,
	DismissRegular,
	SearchRegular,
} from "@fluentui/react-icons";
import {
	Box,
	Card,
	Dialog,
	Flex,
	Heading,
	IconButton,
	Link,
	ScrollArea,
	Spinner,
	Text,
} from "@radix-ui/themes";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { urbanDictionaryDialogAtom } from "$/states/urban-dictionary";

interface Definition {
	definition: string;
	permalink: string;
	thumbs_up: number;
	author: string;
	word: string;
	defid: number;
	example: string;
	thumbs_down: number;
}

export const UrbanDictionaryDialog = () => {
	const { t } = useTranslation();
	const [state, setState] = useAtom(urbanDictionaryDialogAtom);
	const [definitions, setDefinitions] = useState<Definition[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (state.open && state.word) {
			setLoading(true);
			setError(null);
			fetch(
				`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(state.word)}`,
			)
				.then((res) => res.json())
				.then((data) => {
					setDefinitions(data.list || []);
					setLoading(false);
				})
				.catch((err) => {
					console.error("Failed to fetch Urban Dictionary definitions", err);
					setError("Failed to reach Urban Dictionary");
					setLoading(false);
				});
		} else {
			setDefinitions([]);
		}
	}, [state.open, state.word]);

	const handleClose = () => {
		setState({ ...state, open: false });
	};

	return (
		<Dialog.Root
			open={state.open}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
		>
			<Dialog.Content
				maxWidth="620px"
				style={{
					maxWidth: 620,
					width: "min(620px, 94vw)",
					maxHeight: "85vh",
					display: "flex",
					flexDirection: "column",
					padding: "20px 24px",
					borderRadius: "16px",
				}}
			>
				<Flex
					align="center"
					justify="between"
					pb="3"
					style={{ borderBottom: "1px solid var(--gray-a4)" }}
				>
					<Flex align="center" gap="2">
						<Box
							style={{
								width: 32,
								height: 32,
								borderRadius: "50%",
								backgroundColor: "var(--accent-a3)",
								color: "var(--accent-11)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<BookSearchRegular style={{ width: 18, height: 18 }} />
						</Box>
						<Dialog.Title asChild>
							<Heading size="3">{t("urbanDictionary.title")}</Heading>
						</Dialog.Title>
					</Flex>
					<Dialog.Close>
						<IconButton
							size="2"
							variant="ghost"
							onClick={handleClose}
							color="gray"
							style={{ cursor: "pointer" }}
							aria-label={t("common.close", "Close")}
						>
							<DismissRegular style={{ width: 18, height: 18 }} />
						</IconButton>
					</Dialog.Close>
				</Flex>

				<Box py="3">
					<Flex align="baseline" gap="2">
						<Text
							size="6"
							weight="bold"
							style={{ letterSpacing: "-0.02em", color: "var(--accent-11)" }}
						>
							{state.word}
						</Text>
						<Text size="2" color="gray" style={{ opacity: 0.8 }}>
							{t("urbanDictionary.slang")}
						</Text>
					</Flex>
				</Box>

				<ScrollArea style={{ maxHeight: "60vh", minHeight: 0 }} type="auto">
					<Box pr="2">
						{loading ? (
							<Flex align="center" justify="center" height="200px">
								<Spinner size="3" />
							</Flex>
						) : error ? (
							<Flex
								direction="column"
								align="center"
								justify="center"
								gap="3"
								height="200px"
							>
								<Text color="red" size="2">
									{error}
								</Text>
							</Flex>
						) : definitions.length === 0 ? (
							<Flex
								direction="column"
								align="center"
								justify="center"
								gap="3"
								height="200px"
								style={{ opacity: 0.5 }}
							>
								<SearchRegular style={{ fontSize: "40px" }} />
								<Text size="2">
									{t("urbanDictionary.noDefinitions", { word: state.word })}
								</Text>
							</Flex>
						) : (
							<Flex direction="column" gap="3">
								{definitions.map((def) => (
									<Card
										key={def.defid}
										style={{
											padding: "16px",
											backgroundColor: "var(--color-surface)",
											border: "1px solid var(--gray-a4)",
											borderRadius: "10px",
											borderLeft: "4px solid var(--accent-9)",
										}}
									>
										<Flex direction="column" gap="3">
											<Text
												size="3"
												style={{
													whiteSpace: "pre-wrap",
													lineHeight: "1.6",
													wordBreak: "break-word",
												}}
											>
												{def.definition.replace(/\[|\]/g, "")}
											</Text>
											{def.example && (
												<Box
													style={{
														padding: "12px",
														backgroundColor: "var(--gray-a3)",
														borderRadius: "8px",
														borderLeft: "2px solid var(--gray-a7)",
													}}
												>
													<Text
														size="2"
														color="gray"
														style={{
															whiteSpace: "pre-wrap",
															fontStyle: "italic",
															lineHeight: "1.5",
															wordBreak: "break-word",
														}}
													>
														"{def.example.replace(/\[|\]/g, "")}"
													</Text>
												</Box>
											)}
											<Flex
												justify="between"
												align="center"
												style={{ marginTop: "4px" }}
											>
												<Text size="1" color="gray" style={{ opacity: 0.7 }}>
													{t("urbanDictionary.by")} {def.author} • 👍{" "}
													{def.thumbs_up}
												</Text>
												<Link
													href={def.permalink}
													target="_blank"
													size="1"
													style={{ fontWeight: 500 }}
												>
													{t("urbanDictionary.viewOnline")}
												</Link>
											</Flex>
										</Flex>
									</Card>
								))}
							</Flex>
						)}
					</Box>
				</ScrollArea>
			</Dialog.Content>
		</Dialog.Root>
	);
};
