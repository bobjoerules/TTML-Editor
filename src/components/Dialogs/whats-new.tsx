import {
	ArrowDownload24Regular,
	BoxRegular,
	CheckmarkCircleRegular,
	ClockRegular,
	CodeTextRegular,
	Color24Regular,
	CopyRegular,
	DesktopPulseRegular,
	DismissRegular,
	FlashRegular,
	InfoRegular,
	Keyboard20Regular,
	LayerRegular,
	LocalLanguageRegular,
	MusicNote1Regular,
	RecordRegular,
	SettingsRegular,
	ShieldCheckmarkRegular,
	Sparkle24Regular,
	StarRegular,
	TaskListLtrRegular,
	TimerRegular,
	TranslateRegular,
	WindowRegular,
} from "@fluentui/react-icons";
import {
	Box,
	Button,
	Card,
	Dialog,
	Flex,
	Grid,
	Heading,
	IconButton,
	Popover,
	ScrollArea,
	Text,
} from "@radix-ui/themes";
import { useAtom } from "jotai";
import { whatsNewDialogAtom } from "$/states/dialogs.ts";

export function WhatsNewDialog() {
	const [isOpen, setIsOpen] = useAtom(whatsNewDialogAtom);

	const features = [
		{
			title: "TTML Review Mode",
			description:
				"Dedicated review environment with side-by-side live preview, syllable-accurate playback, multi-word and section flagging, songwriter credit verification, and 1-click Discord markdown export.",
			icon: <ShieldCheckmarkRegular />,
			color: "crimson",
			info: "Open Tools > Review Mode (Cmd/Ctrl+Shift+R) to inspect lyrics and timings, highlight words or phrases to flag issues, and copy preformatted reports directly to Discord.",
		},
		{
			title: "Interactive Visual Keyboard",
			description:
				"Inspect and configure keybindings on a full visual keyboard in Settings, featuring real-time shortcut previews, category filtering, collision detection, and customizable double-press actions.",
			icon: <Keyboard20Regular />,
			color: "indigo",
			info: "Open Settings > Keybindings to explore the interactive keyboard map. Hover over or press keys to test bindings, resolve conflicts, and assign custom double-tap shortcuts.",
		},
		{
			title: "Dual Media Downloader",
			description:
				"Search and download audio directly by title and artist using either the built-in downloader or external yt-dlp, complete with an in-app setup guide for Windows, macOS, and Linux.",
			icon: <ArrowDownload24Regular />,
			color: "cyan",
			info: "Switch downloaders easily from the download dialog dropdown. The built-in setup guide provides copy-paste installation commands and a live installation recheck button.",
		},
		{
			title: "Official Brand Logos in Import",
			description:
				"Easily distinguish lyric sources with sharp, optically centered vector brand marks for Apple Music, Genius, Spotify, QQ Music, NetEase, Kugou, Kuwo, JOOX, Musixmatch, and LRCLIB.",
			icon: <Sparkle24Regular />,
			color: "pink",
			info: "The Import dialog features dedicated high-res SVG source badges and optimized layouts to ensure clean alignment and visibility across all themes.",
		},
		{
			title: "Censor Words & Clean Export",
			description:
				"Filter explicit language across all lyric lines with customizable bad-word lists and export clean, radio-ready TTML files while preserving all timestamp data.",
			icon: <ShieldCheckmarkRegular />,
			color: "grass",
			info: "Open Tools > Censor Bad Words to configure your word list, or choose 'Save Clean TTML' from the File menu to generate a clean version in one click.",
		},
		{
			title: "Word-Level Progress Tracking",
			description:
				"Track your synchronization progress in real time with high-precision percentage indicators in the top bar and ribbon that update with every synced word.",
			icon: <ClockRegular />,
			color: "orange",
			info: "Progress calculations measure each syllable and word rather than entire lines, giving an accurate metric of true completion throughout timing.",
		},
		{
			title: "Time Mode Inline Line Editing",
			description:
				"Press 'E' on any line in Time mode to expand it directly into the full syllable and text editor without needing to switch back to the Edit tab.",
			icon: <FlashRegular />,
			color: "violet",
			info: "Edit words, translations, and romanizations inline in Time mode. Press 'E' again or 'Esc' when finished to seamlessly continue timing.",
		},
		{
			title: "Lyric Line Copy & Paste",
			description:
				"Copy highlighted lyric lines with Cmd+C / Ctrl+C and paste them with Cmd+V / Ctrl+V directly beneath, maintaining section structure and generating fresh line IDs.",
			icon: <CopyRegular />,
			color: "teal",
			info: "Select single or multiple lines in Edit mode to copy and paste. Continuous pasting moves your selection downward for quick repetitive section generation.",
		},
		{
			title: "Dynamic Theme Harmony & Clear Mode",
			description:
				"Dialogs, cards, and toolbars adaptively harmonize their surface tints to your active color scheme in both dark and light modes, featuring elegant frosted glass blur in Clear mode.",
			icon: <Color24Regular />,
			color: "ruby",
			info: "Experience unified color harmony across custom palettes and built-in presets in Settings > Appearance, eliminating harsh static black backgrounds.",
		},
		{
			title: "SpotMatch: Alternate Spotify IDs",
			description:
				"Find alternate Spotify recording IDs across singles, albums, deluxe editions, and remasters with zero authentication or API keys, featuring duration tolerance analysis and 1-click Spicy Lyrics bot export.",
			icon: <Sparkle24Regular />,
			color: "green",
			info: "Open SpotMatch from Tools > SpotMatch (or from the TTML Checklist) to scan for all matching Spotify tracks with length verification.",
		},
		{
			title: "Genius Link Resolver",
			description:
				"Paste direct Genius album or song links anywhere in the app to instantly extract full album tracklists or song metadata without needing a Genius API key.",
			icon: <FlashRegular />,
			color: "amber",
			info: "Pasting a Genius album link into the Album Importer extracts all tracks and artwork directly. Pasting a song link in lyric import or search finds the song instantly.",
		},
		{
			title: "Guided Beginner Workflow",
			description:
				"Learn the complete workflow in-app with focused, state-aware steps using your own song, then move the guide or tuck it into a compact edge tab while you work.",
			icon: <TaskListLtrRegular />,
			color: "purple",
			info: "The guide walks through audio import, lyric review, timing, credits, export, and local testing. Contextual ribbon controls reveal advanced options only when they are relevant.",
		},
		{
			title: "Compact Lyric Workspace",
			description:
				"Use the full editor width with edge-to-edge audio and lyric areas, connected word groups, and compact count-scaled whitespace chips.",
			icon: <FlashRegular />,
			color: "orange",
			info: "Adjacent words without a space join visually, including their romanization. Appearance settings can restore the legacy Space xN labels.",
		},
		{
			title: "Discord Rich Presence",
			description:
				"Optionally share the current file or track, editor mode, line progress, playback status, and live timeline from the desktop app. Per-project elapsed time persists across app restarts, while website presence uses a reliable PreMiD bridge.",
			icon: <MusicNote1Regular />,
			color: "indigo",
			info: "Enable Discord Rich Presence under Settings > General > Privacy in the Tauri desktop app. It stays disabled by default and requires the Discord desktop client.",
		},
		{
			title: "Combine Words Across Lyrics",
			description:
				"Preview a word combination, apply it to matching sequences throughout the lyrics, and optionally ignore case and surrounding punctuation.",
			icon: <CheckmarkCircleRegular />,
			color: "grass",
			info: "Select adjacent words and open Combine Words. Review the preview, then combine only that occurrence or every matching sequence in the project.",
		},
		{
			title: "Header-Free Timing Tools",
			description:
				"Copy line and word timings onto existing lyrics or snap any selected timing block to the playhead without relying on imported Genius headers.",
			icon: <TimerRegular />,
			color: "violet",
			info: "Select the source and target lines in Edit or Time mode to copy timings, or select a timed block and snap its first timestamp to the current playhead.",
		},
		{
			title: "Remembered Desktop Window",
			description:
				"Restore the previous window size, maximized state, and fullscreen state when reopening the desktop app.",
			icon: <SettingsRegular />,
			color: "blue",
			info: "Window state is restored automatically on Windows, macOS, and Linux. Position, visibility, and decorations are intentionally not persisted.",
		},
		{
			title: "Inline Time-Tab Editing",
			description:
				"Double-click a synced word to edit it directly in Time mode, or edit its per-word romanization when displayed.",
			icon: <FlashRegular />,
			color: "indigo",
			info: "In Time mode, double-clicking a word opens an inline text box to make immediate corrections without switching tabs.",
		},
		{
			title: "TTML Checklist",
			description:
				"Keep a persistent local queue of songs to sync, complete with notes, status tracking, and history.",
			icon: <TaskListLtrRegular />,
			color: "blue",
			info: "Access TTML Checklist from the tools menu to organize your pending lyrics sync tasks and keep notes.",
		},
		{
			title: "Smarter Lyrics Splitting",
			description:
				"Choose dedicated syllabification engines for English, Polish, Spanish, French, German, Indonesian, Italian, Portuguese, Russian, Japanese, and CJK lyrics, with legacy fallbacks still available.",
			icon: <MusicNote1Regular />,
			color: "cyan",
			info: "Open Auto Segment to get a language-based engine suggestion before applying it to all lyric lines. Advanced Segmentation exposes the same alphabetized engine list.",
		},
		{
			title: "Learned Word Splits",
			description:
				"Remember manual split boundaries and automatically reuse them whenever the same word appears again.",
			icon: <CheckmarkCircleRegular />,
			color: "grass",
			info: "In the Split Word dialog, enable remembering to save the boundaries you chose. Matching words use that split during future automatic segmentation.",
		},
		{
			title: "Persistent Split Options",
			description:
				"The Split Word dialog remembers the last options you used, so repeated corrections take fewer clicks.",
			icon: <SettingsRegular />,
			color: "violet",
			info: "Your Apply to all, case-sensitivity, and remember-split preferences persist between Split Word sessions.",
		},
		{
			title: "Spicy Lyrics Preview",
			description:
				"A high-fidelity Spicy Lyrics renderer with animated, custom, and cover-art backgrounds; karaoke, Simple Lyrics, and line-synced layouts; automatic scrolling; and an optional FPS counter.",
			icon: <StarRegular />,
			color: "ruby",
			info: "Choose Spicy from the Preview mode selector. It includes interlude dots, RTL- and duet-aware layouts, plus CJK and romanized word wrapping.",
		},
		{
			title: "Time Stretch",
			description:
				"Scale every TTML timestamp to fit a new song duration, with support for reading durations from audio files.",
			icon: <TimerRegular />,
			color: "violet",
			info: "Open Edit > Time Stretch. Set or import the old and new audio durations, then apply the calculated scale factor to the project.",
		},
		{
			title: "Unified Lyrics Import",
			description:
				"Choose Plain Text, LRCLIB, Lyrically, or Genius from clear cards in the empty editor, then use one consistent preparation, replacement-confirmation, and formatting workflow.",
			icon: <CheckmarkCircleRegular />,
			color: "grass",
			info: "Use the import screen as usual. Punctuation, CJK/Latin boundaries, word separators, and background vocals are handled consistently across supported sources.",
		},
		{
			title: "Genius Header Categorization & Section Tools",
			description:
				"Preserve headers such as [Chorus] and [Verse] as color-coded section metadata, with whole-section timing controls.",
			icon: <TaskListLtrRegular />,
			color: "pink",
			info: "Enable categorization during a Genius import or when prompted after a text import. In Sync mode, section headers can snap the section to the playhead or copy timing from an earlier matching section.",
		},
		{
			title: "Backup & Restore",
			description:
				"Export and restore selected settings, keybindings, appearance assets, projects and history, and plugins in a portable backup file.",
			icon: <ShieldCheckmarkRegular />,
			color: "teal",
			info: "Open Settings > Backup to select the data to export or restore. Importing replaces the selected existing data and reloads the app.",
		},
		{
			title: "Bouncy Word Indicator",
			description:
				"Long-duration syllables in Sync mode get a subtle bouncing dot, making held words easier to spot while timing.",
			icon: <MusicNote1Regular />,
			color: "orange",
			info: "The CSS-only indicator appears automatically for qualifying words in Sync mode and hides while playback is active.",
		},
		{
			title: "Toxi Lyrics Engine",
			description:
				"High-fidelity jump-down animations, instant-on bloom with smooth fade-out, and adjustable wipe softness.",
			icon: <StarRegular />,
			color: "pink",
			info: "Located in the Preview tab. Controls under Appearance > Preview allow adjusting wipe softness and bloom.",
		},
		{
			title: "144Hz+ Rendering",
			description:
				"Dedicated interpolation engine for ultra-high refresh rates, bypassing React bottlenecks.",
			icon: <FlashRegular />,
			color: "orange",
			info: "Automatically active. Ensures lyrics move smoothly regardless of your monitor's refresh rate.",
		},
		{
			title: "Millisecond Precision Sync",
			description:
				"Interpolated high-resolution performance markers for frame-accurate timing.",
			icon: <TimerRegular />,
			color: "violet",
			info: "Interpolates audio position between browser updates to achieve 1ms precision. Found in Sync mode.",
		},
		{
			title: "Cinematic Backgrounds",
			description:
				"Hardware-accelerated Mesh Gradient backgrounds running at 60 FPS for a premium, alive-feeling UI.",
			icon: <Sparkle24Regular />,
			color: "indigo",
			info: "Change in Appearance > Background. Supports both static images and dynamic gradients.",
		},
		{
			title: "Snap to Playhead",
			description:
				"One-click synchronization that snaps lyric start times directly to the audio playhead position.",
			icon: <RecordRegular />,
			color: "teal",
			info: "In Sync mode, press 'Enter' or the 'Record' button to snap the current line to the music's current time.",
		},
		{
			title: "Auto-Lyric Sanitizer",
			description:
				"Automatically strips Genius tags and cleans empty lines on import.",
			icon: <CheckmarkCircleRegular />,
			color: "grass",
			info: "Filters out strings like [Chorus] or [Verse] and removes whitespace automatically when importing lyrics.",
		},
		{
			title: "Automatic Multilingual Phonetics",
			description:
				"Generate contextual Japanese, Mandarin, and Korean romanization, including per-word readings and mixed-language line mapping.",
			icon: <TranslateRegular />,
			color: "cyan",
			info: "Select lyric lines or words and use Romanization in the Edit ribbon. Mandarin readings keep tone marks and map contextual readings onto individual Han characters.",
		},
		{
			title: "Pre-Export Validator",
			description:
				"Real-time scan for untimed or overlapping lyrics before saving.",
			icon: <ShieldCheckmarkRegular />,
			color: "red",
			info: "Runs a diagnostic check when you click Export, highlighting lines that are missing timestamps or have timing conflicts.",
		},
		{
			title: "Integrated Audio Bridge",
			description:
				"Built-in FFmpeg.wasm for high-fidelity MP3 to FLAC conversion to eliminate decoding drift.",
			icon: <MusicNote1Regular />,
			color: "blue",
			info: "Triggered when importing non-standard audio formats. Converts them to high-quality FLAC/MP3 for better compatibility.",
		},
		{
			title: "Appearance Editor",
			description:
				"Over 40 granular visual parameters and theme presets to fully customize your editor's look.",
			icon: <SettingsRegular />,
			color: "ruby",
			info: "Access via the Settings icon > Appearance. Customize everything from colors to border radius.",
		},
		{
			title: "Global Localization",
			description: "Full i18n support with community-driven translations.",
			icon: <LocalLanguageRegular />,
			color: "blue",
			info: "Switch languages in Settings > General. Currently supporting English, Chinese, and more via Crowdin.",
		},
		{
			title: "Community Plugin Store",
			description:
				"Integrated store to browse and install community-made WASM importers and exporters.",
			icon: <BoxRegular />,
			color: "gold",
			info: "Open via the 'Plugins' tab in the Ribbon Bar to expand the tool's import/export capabilities.",
		},
		{
			title: "V-Sync & FPS Tools",
			description: "Real-time performance monitoring.",
			icon: <DesktopPulseRegular />,
			color: "cyan",
			info: "Real-time performance monitoring with live frame rate tracking and display refresh rate diagnostics.",
		},
		{
			title: "Smart BG Vocal Grouping",
			description: "Unified scaling for main and background lines.",
			icon: <LayerRegular />,
			color: "purple",
			info: "Harmonious proportional typography and unified scaling for simultaneous main and background vocal lines.",
		},
		{
			title: "Refined .ttml Writer",
			description: "Optimized metadata handling and cleaner XML output.",
			icon: <CodeTextRegular />,
			color: "teal",
			info: "Generates clean, compliant TTML XML files with optimized metadata handling and streamlined element structure.",
		},
		{
			title: "Modernized UI",
			description: "Unified glassmorphism and improved layout stability.",
			icon: <WindowRegular />,
			color: "pink",
			info: "Cohesive frosted glass aesthetic, elegant acrylic surfaces, and improved layout stability across all views.",
		},
		{
			title: "Millisecond Timestamps",
			description: "Support for high-precision 3-digit millisecond output.",
			icon: <ClockRegular />,
			color: "orange",
			info: "Exports high-precision 3-digit millisecond timestamps (00:00.000) for exact sync accuracy across all lyric players.",
		},
	] as const;

	return (
		<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Content style={{ maxWidth: 850, height: "85vh", maxHeight: 800 }}>
				<Flex justify="between" align="center" mb="4">
					<Flex direction="column">
						<Dialog.Title mb="1">What's New in TTML Editor</Dialog.Title>
						<Dialog.Description asChild>
							<Text size="2" color="gray">
								Key features, tools, and enhancements in TTML Editor
							</Text>
						</Dialog.Description>
					</Flex>
					<Dialog.Close>
						<Button variant="ghost" color="gray">
							<DismissRegular />
						</Button>
					</Dialog.Close>
				</Flex>

				<ScrollArea
					type="always"
					scrollbars="vertical"
					style={{ height: "calc(100% - 80px)" }}
				>
					<Flex direction="column" gap="4" pr="4">
						<Card
							variant="surface"
							style={{ backgroundColor: "var(--accent-2)" }}
						>
							<Text size="2" style={{ fontStyle: "italic" }}>
								"TTML Editor focuses on professional-grade performance, cinematic
								visual fidelity, and streamlined synchronization workflows for
								Apple Music style syllable lyrics."
							</Text>
						</Card>

						<Grid columns="2" gap="3">
							{features.map((f) => (
								<Card
									key={f.title}
									variant="classic"
									style={{ padding: "var(--space-3)" }}
								>
									<Flex direction="column" gap="2">
										<Flex align="center" justify="between">
											<Flex align="center" gap="2">
												<Box style={{ color: `var(--${f.color}-11)` }}>
													{f.icon}
												</Box>
												<Heading size="3">{f.title}</Heading>
											</Flex>
											<Popover.Root>
												<Popover.Trigger>
													<IconButton
														size="1"
														variant="ghost"
														color="gray"
														style={{ cursor: "pointer" }}
													>
														<InfoRegular />
													</IconButton>
												</Popover.Trigger>
												<Popover.Content style={{ width: 300 }} size="2">
													<Flex direction="column" gap="2">
														<Text size="2" weight="bold" color={f.color}>
															{f.title}
														</Text>
														<Text size="2" color="gray">
															{f.info}
														</Text>
													</Flex>
												</Popover.Content>
											</Popover.Root>
										</Flex>
										<Text size="2" color="gray">
											{f.description}
										</Text>
									</Flex>
								</Card>
							))}
						</Grid>
					</Flex>
				</ScrollArea>
			</Dialog.Content>
		</Dialog.Root>
	);
}
