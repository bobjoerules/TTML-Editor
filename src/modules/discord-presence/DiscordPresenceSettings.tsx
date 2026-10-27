import {
	Button,
	Card,
	Flex,
	Grid,
	Box,
	SegmentedControl,
	Slider,
	Switch,
	Text,
	TextArea,
	TextField,
	Select,
} from "@radix-ui/themes";
import {
	Eye24Regular,
	Timer24Regular,
	Image24Regular,
	Edit24Regular,
	ArrowUndo24Regular,
	PlugConnected24Regular,
	VideoBackgroundEffect24Regular,
	Link24Regular,
	Headphones24Regular,
} from "@fluentui/react-icons";
import { useAtom, useAtomValue } from "jotai";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	audioPlayingAtom,
	currentDurationAtom,
	currentTimeAtom,
	playbackRateAtom,
} from "$/modules/audio/states";
import {
	discordDetailsTemplateAtom,
	discordIdleTimeoutEnabledAtom,
	discordIdleTimeoutMinutesAtom,
	discordPlaybackTimelineAtom,
	discordProjectElapsedAtom,
	discordRepositoryButtonAtom,
	discordRichPresenceEnabledAtom,
	discordStateTemplateAtom,
	discordBottomLineTemplateAtom,
	discordStatusBadgeAtom,
	discordLargeImageModeAtom,
	discordSmallImageModeAtom,
	discordIdleLargeImageModeAtom,
	discordIdleSmallImageModeAtom,
	discordIdleBottomTextAtom,
	discordPrivacyPresetAtom,
	discordShowProgressTimerAtom,
	discordActivityTypeAtom,
} from "$/modules/settings/states";
import { currentUserAtom } from "$/modules/cloud/states";
import { ttmlChecklistAtom } from "$/modules/ttml-checklist/states";
import {
	lyricLinesAtom,
	saveFileNameAtom,
	selectedLinesAtom,
	selectedWordsAtom,
	toolModeAtom,
} from "$/states/main";
import {
	createDiscordTemplateContext,
	createPresenceSnapshot,
	DEFAULT_DISCORD_DETAILS_TEMPLATE,
	DEFAULT_DISCORD_STATE_TEMPLATE,
	DEFAULT_DISCORD_BOTTOM_LINE_TEMPLATE,
	DISCORD_TEMPLATE_VARIABLES,
	renderDiscordTemplate,
	validateDiscordTemplate,
	DISCORD_LOGO_URL,
	DISCORD_PLAY_URL,
	DISCORD_PAUSE_URL,
	getTabImageUrl,
} from "./presence";

type TemplateTarget = "details" | "state" | "bottomLine";

const SettingRow = ({
	icon,
	title,
	description,
	control,
}: {
	icon: React.ReactNode;
	title: string;
	description?: string;
	control: React.ReactNode;
}) => (
	<Flex
		align="center"
		justify="between"
		gap="4"
		py="3"
		style={{ borderBottom: "1px solid var(--gray-a4)" }}
	>
		<Flex align="center" gap="3" flexGrow="1" style={{ minWidth: 0 }}>
			<Box
				style={{
					color: "var(--accent-9)",
					display: "flex",
					alignItems: "center",
					flexShrink: 0,
				}}
			>
				{icon}
			</Box>
			<Flex direction="column" gap="1" style={{ minWidth: 0 }}>
				<Text size="2" weight="medium">
					{title}
				</Text>
				{description && (
					<Text
						size="1"
						color="gray"
						style={{
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{description}
					</Text>
				)}
			</Flex>
		</Flex>
		<Box style={{ flexShrink: 0 }}>{control}</Box>
	</Flex>
);

export function DiscordPresenceSettings() {
	const { t } = useTranslation();
	const user = useAtomValue(currentUserAtom);
	const [enabled, setEnabled] = useAtom(discordRichPresenceEnabledAtom);
	const [detailsTemplate, setDetailsTemplate] = useAtom(
		discordDetailsTemplateAtom,
	);
	const [stateTemplate, setStateTemplate] = useAtom(discordStateTemplateAtom);
	const [bottomLineTemplate, setBottomLineTemplate] = useAtom(
		discordBottomLineTemplateAtom,
	);
	const [showPlaybackTimeline, setShowPlaybackTimeline] = useAtom(
		discordPlaybackTimelineAtom,
	);
	const [showProjectElapsed, setShowProjectElapsed] = useAtom(
		discordProjectElapsedAtom,
	);
	const [showRepositoryButton, setShowRepositoryButton] = useAtom(
		discordRepositoryButtonAtom,
	);
	const [showStatusBadge, setShowStatusBadge] = useAtom(discordStatusBadgeAtom);
	const [idleTimeoutEnabled, setIdleTimeoutEnabled] = useAtom(
		discordIdleTimeoutEnabledAtom,
	);
	const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useAtom(
		discordIdleTimeoutMinutesAtom,
	);
	const [largeImageMode, setLargeImageMode] = useAtom(
		discordLargeImageModeAtom,
	);
	const [smallImageMode, setSmallImageMode] = useAtom(
		discordSmallImageModeAtom,
	);
	const [idleLargeImageMode, setIdleLargeImageMode] = useAtom(
		discordIdleLargeImageModeAtom,
	);
	const [idleSmallImageMode, setIdleSmallImageMode] = useAtom(
		discordIdleSmallImageModeAtom,
	);
	const [idleBottomText, setIdleBottomText] = useAtom(
		discordIdleBottomTextAtom,
	);
	const [privacyPreset, setPrivacyPreset] = useAtom(discordPrivacyPresetAtom);
	const [showProgressTimer, setShowProgressTimer] = useAtom(
		discordShowProgressTimerAtom,
	);
	const [activityType, setActivityType] = useAtom(discordActivityTypeAtom);

	const [detailsDraft, setDetailsDraft] = useState(detailsTemplate);
	const [stateDraft, setStateDraft] = useState(stateTemplate);
	const [bottomLineDraft, setBottomLineDraft] = useState(bottomLineTemplate);
	const [variableSearch, setVariableSearch] = useState("");
	const [templateTarget, setTemplateTarget] = useState<TemplateTarget>("state");
	const detailsRef = useRef<HTMLTextAreaElement>(null);
	const stateRef = useRef<HTMLTextAreaElement>(null);
	const bottomLineRef = useRef<HTMLTextAreaElement>(null);

	const lyrics = useAtomValue(lyricLinesAtom);
	const fileName = useAtomValue(saveFileNameAtom);
	const mode = useAtomValue(toolModeAtom);
	const selectedLineIds = useAtomValue(selectedLinesAtom);
	const selectedWordIds = useAtomValue(selectedWordsAtom);
	const playing = useAtomValue(audioPlayingAtom);
	const positionSeconds = useAtomValue(currentTimeAtom) / 1000;
	const durationSeconds = useAtomValue(currentDurationAtom) / 1000;
	const playbackRate = useAtomValue(playbackRateAtom);
	const checklist = useAtomValue(ttmlChecklistAtom);
	const checklistTotal = checklist?.length ?? 0;
	const checklistCompleted = checklist?.filter((e) => e.completed).length ?? 0;

	const isIdle = useMemo(() => {
		const hasWords = Boolean(
			lyrics?.lyricLines?.some((l) =>
				l.words?.some((w) => Boolean(w.word && w.word.trim().length > 0)),
			),
		);
		const hasCustomFile = Boolean(
			fileName &&
				fileName !== "unnamed.ttml" &&
				fileName !== "unnamed" &&
				fileName !== "lyric.ttml" &&
				fileName !== "lyric" &&
				fileName !== "untitled.ttml" &&
				fileName !== "untitled",
		);
		const hasDuration = durationSeconds > 0;
		return !hasWords && !hasCustomFile && !hasDuration;
	}, [lyrics, fileName, durationSeconds]);

	const detailsError = validateDiscordTemplate(detailsDraft);
	const stateError = validateDiscordTemplate(stateDraft);
	const bottomLineError = validateDiscordTemplate(bottomLineDraft);
	const context = useMemo(() => {
		const snapshot = createPresenceSnapshot({
			lyrics:
				lyrics?.lyricLines?.length > 0
					? lyrics
					: ({ lyricLines: [], metadata: [] } as any),
			fileName: fileName || "",
			mode,
			selectedLineIds,
			playing,
			positionSeconds,
			durationSeconds: durationSeconds || 0,
			playbackRate,
			projectElapsedSeconds: 3,
			userProfilePhoto: user?.photoURL,
			userDisplayName: user?.displayName || user?.email?.split("@")[0],
			checklistTotal,
			checklistCompleted,
		});
		const templateContext = createDiscordTemplateContext({
			snapshot,
			lyrics:
				lyrics?.lyricLines?.length > 0
					? lyrics
					: ({ lyricLines: [], metadata: [] } as any),
			fileName: fileName || "",
			selectedLineIds,
			selectedWordIds,
		});
		return { snapshot, templateContext };
	}, [
		durationSeconds,
		fileName,
		lyrics,
		mode,
		playbackRate,
		playing,
		positionSeconds,
		selectedLineIds,
		selectedWordIds,
		user,
		checklistTotal,
		checklistCompleted,
	]);

	const detailsPreview = detailsError
		? ""
		: renderDiscordTemplate(detailsDraft, context.templateContext);
	const statePreview = stateError
		? ""
		: renderDiscordTemplate(stateDraft, context.templateContext);
	const bottomLinePreview = bottomLineError
		? ""
		: renderDiscordTemplate(bottomLineDraft, context.templateContext);

	const filteredVariables = DISCORD_TEMPLATE_VARIABLES.filter((variable) =>
		variable.toLowerCase().includes(variableSearch.trim().toLowerCase()),
	);

	const updateTemplate = (target: TemplateTarget, value: string) => {
		if (target === "details") {
			setDetailsDraft(value);
			if (!validateDiscordTemplate(value)) setDetailsTemplate(value);
		} else if (target === "state") {
			setStateDraft(value);
			if (!validateDiscordTemplate(value)) setStateTemplate(value);
		} else {
			setBottomLineDraft(value);
			if (!validateDiscordTemplate(value)) setBottomLineTemplate(value);
		}
	};

	const insertVariable = (variable: string) => {
		const ref =
			templateTarget === "details"
				? detailsRef
				: templateTarget === "state"
					? stateRef
					: bottomLineRef;
		const value =
			templateTarget === "details"
				? detailsDraft
				: templateTarget === "state"
					? stateDraft
					: bottomLineDraft;
		const start = ref.current?.selectionStart ?? value.length;
		const end = ref.current?.selectionEnd ?? start;
		const insertion = `{{${variable}}}`;
		updateTemplate(
			templateTarget,
			`${value.slice(0, start)}${insertion}${value.slice(end)}`,
		);
		requestAnimationFrame(() => {
			ref.current?.focus();
			ref.current?.setSelectionRange(
				start + insertion.length,
				start + insertion.length,
			);
		});
	};

	const resetTemplates = () => {
		setDetailsDraft(DEFAULT_DISCORD_DETAILS_TEMPLATE);
		setStateDraft(DEFAULT_DISCORD_STATE_TEMPLATE);
		setBottomLineDraft(DEFAULT_DISCORD_BOTTOM_LINE_TEMPLATE);
		setDetailsTemplate(DEFAULT_DISCORD_DETAILS_TEMPLATE);
		setStateTemplate(DEFAULT_DISCORD_STATE_TEMPLATE);
		setBottomLineTemplate(DEFAULT_DISCORD_BOTTOM_LINE_TEMPLATE);
	};

	// Helper for preview card images
	const getPreviewImageUrl = (imgMode: string) => {
		if (imgMode === "icon") return DISCORD_LOGO_URL;
		if (imgMode === "artwork")
			return context.snapshot.coverUrl || DISCORD_LOGO_URL;
		if (imgMode === "state")
			return playing ? DISCORD_PLAY_URL : DISCORD_PAUSE_URL;
		if (imgMode === "tab") return getTabImageUrl(mode);
		if (imgMode === "profile") return user?.photoURL || DISCORD_LOGO_URL;
		return undefined;
	};

	const largeImgSrc = isIdle
		? getPreviewImageUrl(idleLargeImageMode)
		: getPreviewImageUrl(largeImageMode);
	const smallImgSrc = isIdle
		? getPreviewImageUrl(idleSmallImageMode)
		: getPreviewImageUrl(smallImageMode);

	// Preview details and state texts based on privacy preset and idle state
	const detailsPreviewText = useMemo(() => {
		if (privacyPreset === "none") return undefined;
		if (isIdle) return "AMLL TTML Tool";
		if (privacyPreset === "minimal") return "AMLL TTML Tool";
		return (
			detailsPreview || (fileName ? `Editing ${fileName}` : "AMLL TTML Tool")
		);
	}, [isIdle, privacyPreset, detailsPreview, fileName]);

	const statePreviewText = useMemo(() => {
		if (privacyPreset === "none") return undefined;
		if (isIdle) return "No file open";
		if (privacyPreset === "minimal") return "Working on lyrics";
		return statePreview || "Working on lyrics";
	}, [isIdle, privacyPreset, statePreview]);

	const bottomLinePreviewText = useMemo(() => {
		if (privacyPreset === "none") return undefined;
		if (isIdle) {
			try {
				const rendered = renderDiscordTemplate(
					idleBottomText,
					context.templateContext,
				);
				return (
					rendered ||
					user?.displayName ||
					user?.email?.split("@")[0] ||
					"AMLL TTML Tool"
				);
			} catch {
				return (
					user?.displayName || user?.email?.split("@")[0] || "AMLL TTML Tool"
				);
			}
		}
		if (privacyPreset === "minimal") return undefined;
		return (
			bottomLinePreview ||
			(context.templateContext.title && context.templateContext.artist
				? `${context.templateContext.title} - ${context.templateContext.artist}`
				: undefined)
		);
	}, [
		isIdle,
		privacyPreset,
		bottomLinePreview,
		idleBottomText,
		context.templateContext,
		user,
	]);

	return (
		<Flex direction="column" gap="4">
			{/* Discord Preview Card Section */}
			<Text
				size="2"
				weight="bold"
				mt="1"
				style={{
					color: "var(--gray-11)",
					textTransform: "uppercase",
					letterSpacing: "0.5px",
				}}
			>
				{t("settings.discord.previewSection", "Live Preview")}
			</Text>

			{/* Discord Preview Card */}
			<Box
				style={{
					background: "linear-gradient(135deg, #7c4dff, #5865f2)",
					borderRadius: "var(--radius-3)",
					padding: "24px",
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<Box
					style={{
						background: "#111214",
						color: "#dbdee1",
						borderRadius: "8px",
						padding: "16px",
						width: "100%",
						maxWidth: "360px",
						boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
						fontFamily: 'gg sans, "Noto Sans", sans-serif',
						userSelect: "none",
					}}
				>
					<Text
						size="1"
						weight="bold"
						style={{
							color: "#949ba4",
							display: "block",
							marginBottom: "8px",
							textTransform: "uppercase",
							letterSpacing: "0.5px",
							fontSize: "11px",
						}}
					>
						{activityType === "listening"
							? "Listening to AMLL TTML Tool"
							: "Playing AMLL TTML Tool"}
					</Text>
					<Flex gap="3" align="center">
						<Box
							style={{
								position: "relative",
								width: "64px",
								height: "64px",
								flexShrink: 0,
							}}
						>
							{largeImgSrc ? (
								<img
									src={largeImgSrc}
									style={{
										width: "64px",
										height: "64px",
										borderRadius: "8px",
										objectFit: "cover",
										background: "#2b2d31",
									}}
									alt=""
								/>
							) : (
								<Box
									style={{
										width: "64px",
										height: "64px",
										borderRadius: "8px",
										background: "#2b2d31",
									}}
								/>
							)}
							{smallImgSrc && (
								<Box
									style={{
										position: "absolute",
										bottom: "-4px",
										right: "-4px",
										width: "24px",
										height: "24px",
										borderRadius: "50%",
										background: "#111214",
										padding: "3px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<img
										src={smallImgSrc}
										style={{
											width: "100%",
											height: "100%",
											borderRadius: "50%",
											objectFit: "cover",
										}}
										alt=""
									/>
								</Box>
							)}
						</Box>
						<Flex
							direction="column"
							gap="1"
							style={{ minWidth: 0, flexGrow: 1 }}
						>
							{/* Line 1: Top Line */}
							<Text
								size="2"
								weight="bold"
								style={{
									color: "#fff",
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis",
								}}
							>
								{detailsPreviewText || "Ginseng Strip 2002"}
							</Text>

							{/* Line 2: Middle Line */}
							{statePreviewText && (
								<Text
									size="2"
									style={{
										color: "#dbdee1",
										whiteSpace: "nowrap",
										overflow: "hidden",
										textOverflow: "ellipsis",
									}}
								>
									{statePreviewText}
								</Text>
							)}

							{/* Line 3: Bottom Line */}
							{bottomLinePreviewText && (
								<Text
									size="2"
									style={{
										color: "#949ba4",
										whiteSpace: "nowrap",
										overflow: "hidden",
										textOverflow: "ellipsis",
									}}
								>
									{bottomLinePreviewText}
								</Text>
							)}

							{/* Line 4: Progress / Timer */}
							{((!isIdle && showPlaybackTimeline) ||
								(isIdle && showProgressTimer)) && (
								<Text
									size="2"
									style={{
										color: "#23a55a",
										display: "flex",
										alignItems: "center",
										gap: "4px",
										fontSize: "12px",
									}}
								>
									<span>♫</span> {isIdle ? "1:33" : "2:28:13"}
								</Text>
							)}
						</Flex>
					</Flex>

					{/* Buttons in Discord Preview Card */}
					{showRepositoryButton && (
						<Flex direction="column" gap="2" mt="3">
							<Box
								style={{
									background: "#2b2d31",
									padding: "8px",
									borderRadius: "4px",
									textAlign: "center",
									fontSize: "13px",
									fontWeight: 500,
									color: "#dbdee1",
								}}
							>
								View repository
							</Box>
						</Flex>
					)}
				</Box>
			</Box>

			{/* Presence Lines Customization */}
			<Card style={{ padding: "16px" }}>
				<Flex direction="column" gap="4">
					<Flex align="center" justify="between">
						<Text weight="bold" size="2">
							{t(
								"settings.discord.lineCustomization",
								"Presence Line Customization",
							)}
						</Text>
						<Button size="1" variant="soft" onClick={resetTemplates}>
							{t("common.reset", "Reset All")}
						</Button>
					</Flex>
					<Text size="1" color="gray">
						{t(
							"settings.common.discordTemplateHelp",
							"Customize each of the 3 lines displayed in Discord. Click any variable chip below to insert it into your active line.",
						)}
					</Text>

					{/* 1. Top Line (Details / Title) */}
					<Flex direction="column" gap="1">
						<Flex align="center" justify="between">
							<Text size="2" weight="bold">
								{t("settings.common.discordDetails", "1. Top Line")}
							</Text>
							<Flex gap="1" wrap="wrap">
								<Button
									size="1"
									variant="outline"
									onClick={() => updateTemplate("details", "{{title}}")}
								>
									🎵 Song Title
								</Button>
								<Button
									size="1"
									variant="outline"
									onClick={() =>
										updateTemplate("details", "Editing {{fileName}}")
									}
								>
									📁 File Name
								</Button>
								<Button
									size="1"
									variant="outline"
									onClick={() =>
										updateTemplate("details", "{{title}} • {{artist}}")
									}
								>
									Title • Artist
								</Button>
							</Flex>
						</Flex>
						<TextArea
							ref={detailsRef}
							value={detailsDraft}
							rows={2}
							onFocus={() => setTemplateTarget("details")}
							onChange={(event) =>
								updateTemplate("details", event.target.value)
							}
						/>
						{detailsError && (
							<Text size="1" color="red">
								{detailsError}
							</Text>
						)}
					</Flex>

					{/* 2. Middle Line (State / Subtitle) */}
					<Flex direction="column" gap="1">
						<Flex align="center" justify="between">
							<Text size="2" weight="bold">
								{t("settings.common.discordState", "2. Middle Line")}
							</Text>
							<Flex gap="1" wrap="wrap">
								<Button
									size="1"
									variant="outline"
									onClick={() =>
										updateTemplate(
											"state",
											"[[{{artist}} • ]] {{syncPercentage}} Synced • {{totalLines}} lines",
										)
									}
								>
									Sync % & Lines
								</Button>
								<Button
									size="1"
									variant="outline"
									onClick={() =>
										updateTemplate("state", DEFAULT_DISCORD_STATE_TEMPLATE)
									}
								>
									Default (Artist)
								</Button>
								<Button
									size="1"
									variant="outline"
									onClick={() =>
										updateTemplate(
											"state",
											"[[{{artist}} • ]]{{lineProgress}} • {{playbackStatus}}",
										)
									}
								>
									Line Progress
								</Button>
								<Button
									size="1"
									variant="outline"
									onClick={() =>
										updateTemplate(
											"state",
											"📋 Checklist: {{checklistProgress}} ({{checklistPercentage}})",
										)
									}
								>
									📋 Checklist
								</Button>
							</Flex>
						</Flex>
						<TextArea
							ref={stateRef}
							value={stateDraft}
							rows={2}
							onFocus={() => setTemplateTarget("state")}
							onChange={(event) => updateTemplate("state", event.target.value)}
						/>
						{stateError && (
							<Text size="1" color="red">
								{stateError}
							</Text>
						)}
					</Flex>

					{/* 3. Bottom Line (Album / Tooltip Text) */}
					<Flex direction="column" gap="1">
						<Flex align="center" justify="between">
							<Text size="2" weight="bold">
								{t("settings.common.discordBottomLine", "3. Bottom Line")}
							</Text>
							<Flex gap="1" wrap="wrap">
								<Button
									size="1"
									variant="outline"
									onClick={() =>
										updateTemplate(
											"bottomLine",
											"[[{{title}} - {{artist}}]][[{{album}}]]",
										)
									}
								>
									🎵 Title - Artist
								</Button>
								<Button
									size="1"
									variant="outline"
									onClick={() =>
										updateTemplate(
											"bottomLine",
											"[[{{album}} • ]]{{songwriters}}",
										)
									}
								>
									Album & Writers
								</Button>
								<Button
									size="1"
									variant="outline"
									onClick={() =>
										updateTemplate("bottomLine", "{{fileName}} • {{mode}}")
									}
								>
									📁 File & Mode
								</Button>
								<Button
									size="1"
									variant="outline"
									onClick={() =>
										updateTemplate(
											"bottomLine",
											"{{syncPercentage}} Synced ({{timedLines}}/{{totalLines}} lines)",
										)
									}
								>
									Full Sync Stats
								</Button>
								<Button
									size="1"
									variant="outline"
									onClick={() =>
										updateTemplate(
											"bottomLine",
											"📋 Checklist: {{checklistCompleted}}/{{checklistTotal}} ({{checklistPercentage}})",
										)
									}
								>
									📋 Checklist Stats
								</Button>
							</Flex>
						</Flex>
						<TextArea
							ref={bottomLineRef}
							value={bottomLineDraft}
							rows={2}
							onFocus={() => setTemplateTarget("bottomLine")}
							onChange={(event) =>
								updateTemplate("bottomLine", event.target.value)
							}
						/>
						{bottomLineError && (
							<Text size="1" color="red">
								{bottomLineError}
							</Text>
						)}
					</Flex>

					{/* 1-Click Variable Insertion Chips */}
					<Flex direction="column" gap="1">
						<Text size="1" color="gray">
							{t(
								"settings.discord.clickToInsert",
								"Click to insert variable into active line:",
							)}
						</Text>
						<Flex gap="1" wrap="wrap">
							{filteredVariables.map((variable) => (
								<Button
									key={variable}
									size="1"
									variant="soft"
									onClick={() => insertVariable(variable)}
									style={{ fontSize: "11px", padding: "2px 6px" }}
								>
									{`{{${variable}}}`}
								</Button>
							))}
						</Flex>
					</Flex>
				</Flex>
			</Card>

			{/* Main Settings Panel */}
			<Card style={{ padding: "0 16px" }}>
				<SettingRow
					icon={<PlugConnected24Regular />}
					title={t("settings.discord.enable", "Enable Discord RPC")}
					description={t(
						"settings.discord.enableDesc",
						"Publish the current AMLL Tool activity to Discord.",
					)}
					control={<Switch checked={enabled} onCheckedChange={setEnabled} />}
				/>

				{enabled && (
					<>
						<SettingRow
							icon={<Eye24Regular />}
							title={t("settings.discord.privacy", "Privacy Preset")}
							description={t(
								"settings.discord.privacyDesc",
								"Choose how much project context Discord can display.",
							)}
							control={
								<Select.Root
									value={privacyPreset}
									onValueChange={(val: any) => setPrivacyPreset(val)}
								>
									<Select.Trigger style={{ width: "120px" }} />
									<Select.Content>
										<Select.Item value="rich">Rich</Select.Item>
										<Select.Item value="minimal">Minimal</Select.Item>
										<Select.Item value="none">None</Select.Item>
									</Select.Content>
								</Select.Root>
							}
						/>

						<SettingRow
							icon={<Headphones24Regular />}
							title={t("settings.discord.activityType", "Activity Type")}
							description={t(
								"settings.discord.activityTypeDesc",
								"Choose whether your status displays as 'Listening to' or 'Playing'.",
							)}
							control={
								<Select.Root
									value={activityType}
									onValueChange={(val: any) => setActivityType(val)}
								>
									<Select.Trigger style={{ width: "120px" }} />
									<Select.Content>
										<Select.Item value="listening">Listening</Select.Item>
										<Select.Item value="playing">Playing</Select.Item>
									</Select.Content>
								</Select.Root>
							}
						/>

						<SettingRow
							icon={<Timer24Regular />}
							title={t("settings.discord.timer", "Show Progress Timer")}
							description={t(
								"settings.discord.timerDesc",
								"Show the current app session timer in Discord.",
							)}
							control={
								<Switch
									checked={showProgressTimer}
									onCheckedChange={setShowProgressTimer}
								/>
							}
						/>
					</>
				)}
			</Card>

			{enabled && (
				<>
					{/* Images Section */}
					<Text
						size="2"
						weight="bold"
						mt="2"
						mb="-2"
						style={{
							color: "var(--gray-11)",
							textTransform: "uppercase",
							letterSpacing: "0.5px",
						}}
					>
						{t("settings.discord.imagesSection", "Images")}
					</Text>
					<Card style={{ padding: "0 16px" }}>
						<SettingRow
							icon={<Image24Regular />}
							title={t("settings.discord.largeImage", "Large Image (Active)")}
							description={t(
								"settings.discord.largeImageDesc",
								"Choose the content shown in the large image slot when working on a song.",
							)}
							control={
								<Select.Root
									value={largeImageMode}
									onValueChange={(val: any) => setLargeImageMode(val)}
								>
									<Select.Trigger style={{ width: "130px" }} />
									<Select.Content>
										<Select.Item value="artwork">Artwork</Select.Item>
										<Select.Item value="icon">App Icon</Select.Item>
										<Select.Item value="profile">Profile Photo</Select.Item>
										<Select.Item value="state">Playback State</Select.Item>
										<Select.Item value="tab">Mode / Tab</Select.Item>
										<Select.Item value="none">None</Select.Item>
									</Select.Content>
								</Select.Root>
							}
						/>
						<SettingRow
							icon={<Image24Regular />}
							title={t("settings.discord.smallImage", "Small Image (Active)")}
							description={t(
								"settings.discord.smallImageDesc",
								"Choose the content shown in the small image badge when working on a song.",
							)}
							control={
								<Select.Root
									value={smallImageMode}
									onValueChange={(val: any) => setSmallImageMode(val)}
								>
									<Select.Trigger style={{ width: "130px" }} />
									<Select.Content>
										<Select.Item value="profile">Profile Photo</Select.Item>
										<Select.Item value="tab">Mode / Tab</Select.Item>
										<Select.Item value="state">Playback State</Select.Item>
										<Select.Item value="icon">App Icon</Select.Item>
										<Select.Item value="artwork">Artwork</Select.Item>
										<Select.Item value="none">None</Select.Item>
									</Select.Content>
								</Select.Root>
							}
						/>
						<SettingRow
							icon={<Image24Regular />}
							title={t(
								"settings.discord.idleLargeImage",
								"Large Image (Nothing Loaded)",
							)}
							description={t(
								"settings.discord.idleLargeImageDesc",
								"Choose the large image shown when no song or file is loaded.",
							)}
							control={
								<Select.Root
									value={idleLargeImageMode}
									onValueChange={(val: any) => setIdleLargeImageMode(val)}
								>
									<Select.Trigger style={{ width: "130px" }} />
									<Select.Content>
										<Select.Item value="icon">App Icon</Select.Item>
										<Select.Item value="profile">Profile Photo</Select.Item>
										<Select.Item value="tab">Mode / Tab</Select.Item>
										<Select.Item value="none">None</Select.Item>
									</Select.Content>
								</Select.Root>
							}
						/>
						<SettingRow
							icon={<Image24Regular />}
							title={t(
								"settings.discord.idleSmallImage",
								"Small Image (Nothing Loaded)",
							)}
							description={t(
								"settings.discord.idleSmallImageDesc",
								"Choose the small badge shown when no song or file is loaded.",
							)}
							control={
								<Select.Root
									value={idleSmallImageMode}
									onValueChange={(val: any) => setIdleSmallImageMode(val)}
								>
									<Select.Trigger style={{ width: "130px" }} />
									<Select.Content>
										<Select.Item value="profile">Profile Photo</Select.Item>
										<Select.Item value="icon">App Icon</Select.Item>
										<Select.Item value="tab">Mode / Tab</Select.Item>
										<Select.Item value="none">None</Select.Item>
									</Select.Content>
								</Select.Root>
							}
						/>
					</Card>

					{/* State Texts Section */}
					<Text
						size="2"
						weight="bold"
						mt="2"
						mb="-2"
						style={{
							color: "var(--gray-11)",
							textTransform: "uppercase",
							letterSpacing: "0.5px",
						}}
					>
						{t("settings.discord.stateTextsSection", "State Texts")}
					</Text>

					{/* Idle Third Line / Bottom Text */}
					<Card style={{ padding: "16px" }}>
						<Flex align="center" justify="between" gap="4">
							<Flex align="center" gap="3" style={{ minWidth: 0 }}>
								<Box
									style={{
										color: "var(--accent-9)",
										display: "flex",
										alignItems: "center",
										flexShrink: 0,
									}}
								>
									<Edit24Regular />
								</Box>
								<Flex direction="column" gap="1" style={{ minWidth: 0 }}>
									<Text size="2" weight="medium">
										{t(
											"settings.discord.idleBottomText",
											"Third Line (Nothing Loaded)",
										)}
									</Text>
									<Text
										size="1"
										color="gray"
										style={{
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										{t(
											"settings.discord.idleBottomTextDesc",
											"Text displayed on the third line (large image hover text) when no song is loaded.",
										)}
									</Text>
								</Flex>
							</Flex>
							<Flex gap="2" align="center" style={{ flexShrink: 0 }}>
								<TextField.Root
									value={idleBottomText}
									onChange={(event) => setIdleBottomText(event.target.value)}
									placeholder="{{username}}"
									style={{ width: "160px" }}
								/>
								<Button
									size="1"
									variant="soft"
									onClick={() => setIdleBottomText("{{username}}")}
									disabled={idleBottomText === "{{username}}"}
								>
									<ArrowUndo24Regular
										style={{ width: "14px", height: "14px" }}
									/>
								</Button>
							</Flex>
						</Flex>
						<Flex gap="2" mt="3" wrap="wrap">
							<Button
								size="1"
								variant="surface"
								onClick={() =>
									setIdleBottomText(
										"Checklist: {{checklistProgress}} ({{checklistPercentage}})",
									)
								}
								style={{ fontSize: "11px", padding: "4px 8px" }}
							>
								📋 Checklist: {checklistCompleted}/{checklistTotal} (
								{checklistTotal > 0
									? `${Math.round((checklistCompleted / checklistTotal) * 100)}%`
									: "0%"}
								)
							</Button>
							<Button
								size="1"
								variant="surface"
								onClick={() => setIdleBottomText("{{username}}")}
								style={{ fontSize: "11px", padding: "4px 8px" }}
							>
								👤 Username
							</Button>
							<Button
								size="1"
								variant="surface"
								onClick={() =>
									setIdleBottomText(
										"{{username}} • {{checklistPercentage}} Done",
									)
								}
								style={{ fontSize: "11px", padding: "4px 8px" }}
							>
								👤 User & Percentage
							</Button>
							<Button
								size="1"
								variant="surface"
								onClick={() => setIdleBottomText("AMLL TTML Tool")}
								style={{ fontSize: "11px", padding: "4px 8px" }}
							>
								📁 Tool Name
							</Button>
						</Flex>
					</Card>

					{/* Inactivity & Advanced Options */}
					<details style={{ marginTop: "16px", cursor: "pointer" }}>
						<summary
							style={{
								fontSize: "var(--font-size-2)",
								fontWeight: 500,
								color: "var(--gray-9)",
								padding: "4px 0",
							}}
						>
							{t(
								"settings.common.discordInactivityOptions",
								"Inactivity & Feature Toggles",
							)}
						</summary>
						<Card mt="3" style={{ cursor: "default" }}>
							<Flex direction="column" gap="3">
								<SettingToggle
									label={t(
										"settings.common.discordIdleTimeoutEnabled",
										"Enable idle inactivity timeout",
									)}
									checked={idleTimeoutEnabled}
									onCheckedChange={setIdleTimeoutEnabled}
								/>
								{idleTimeoutEnabled && (
									<>
										<Flex align="center" justify="between">
											<Text size="2">
												{t("settings.common.discordIdleTimeout", "Inactive after")}
											</Text>
											<Text size="2" color="gray">
												{idleTimeoutMinutes} min
											</Text>
										</Flex>
										<Slider
											min={1}
											max={60}
											value={[Math.min(60, Math.max(1, idleTimeoutMinutes))]}
											onValueChange={([value]) => setIdleTimeoutMinutes(value)}
										/>
										<Text size="1" color="gray">
											{t(
												"settings.common.discordIdlePrivacy",
												"Inactive presence hides project details, buttons, badges, and timers.",
											)}
										</Text>
									</>
								)}

								<SettingToggle
									label={t(
										"settings.common.discordPlaybackTimeline",
										"Playback timeline",
									)}
									checked={showPlaybackTimeline}
									onCheckedChange={setShowPlaybackTimeline}
								/>
								<SettingToggle
									label={t(
										"settings.common.discordProjectElapsed",
										"Project elapsed timer",
									)}
									checked={showProjectElapsed}
									onCheckedChange={setShowProjectElapsed}
								/>
								<SettingToggle
									label={t(
										"settings.common.discordRepositoryButton",
										"Repository button",
									)}
									checked={showRepositoryButton}
									onCheckedChange={setShowRepositoryButton}
								/>
								<SettingToggle
									label={t(
										"settings.common.discordStatusBadge",
										"Play/pause status badge",
									)}
									checked={showStatusBadge}
									onCheckedChange={setShowStatusBadge}
								/>
							</Flex>
						</Card>
					</details>
				</>
			)}
		</Flex>
	);
}

const SettingToggle = ({
	label,
	checked,
	onCheckedChange,
}: {
	label: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) => (
	<Flex align="center" justify="between" gap="3">
		<Text size="2">{label}</Text>
		<Switch checked={checked} onCheckedChange={onCheckedChange} />
	</Flex>
);
