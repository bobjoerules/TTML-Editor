export interface SettingSearchItem {
	id: string;
	title: string;
	description?: string;
	tab: string;
	tabName: string;
	keywords: string[];
}

export const SETTINGS_SEARCH_ITEMS: SettingSearchItem[] = [
	// General
	{
		id: "general-language",
		title: "Language Selection",
		description: "Change interface display language (English, 中文, etc.)",
		tab: "common",
		tabName: "General",
		keywords: ["language", "locale", "translation", "chinese", "english", "i18n"],
	},
	{
		id: "general-scale",
		title: "UI Scale",
		description: "Adjust interface zoom and display scaling factor",
		tab: "common",
		tabName: "General",
		keywords: ["scale", "zoom", "size", "dpi", "magnification", "ui scale"],
	},
	{
		id: "general-layout",
		title: "Layout Mode",
		description: "Switch between Split View, Full Width, or Single Panel workspace layouts",
		tab: "common",
		tabName: "General",
		keywords: ["layout", "split", "single", "full width", "view", "workspace"],
	},
	{
		id: "general-key-trigger",
		title: "Keybinding Trigger Mode",
		description: "Trigger timing shortcuts on Key Down (immediate) or Key Up (release)",
		tab: "common",
		tabName: "General",
		keywords: ["trigger", "keydown", "keyup", "shortcut", "keybinding", "press"],
	},
	{
		id: "general-latency",
		title: "Audio Latency Test",
		description: "Calibrate keyboard input delay and timing offset",
		tab: "common",
		tabName: "General",
		keywords: ["latency", "calibrate", "delay", "offset", "timing", "test"],
	},

	// Account
	{
		id: "account-cloud",
		title: "Cloud Account & Login",
		description: "Sign in with your cloud account to sync and manage TTML lyrics",
		tab: "account",
		tabName: "Account & Cloud",
		keywords: ["account", "login", "profile", "user", "cloud", "auth", "token", "sign in"],
	},
	{
		id: "account-stats",
		title: "Lyric Sync Statistics",
		description: "View synchronized songs count, lines contributed, and community stats",
		tab: "account",
		tabName: "Account & Cloud",
		keywords: ["stats", "statistics", "contribution", "profile", "lyrics count", "amll db"],
	},

	// Editor & Sync
	{
		id: "editor-sync-judge",
		title: "Sync Judge Mode",
		description: "Choose strict or loose timing validation during word synchronization",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: ["judge", "sync judge", "strict", "loose", "validation", "timing rule"],
	},
	{
		id: "editor-sync-offset",
		title: "Input Timing Offset",
		description: "Global compensation offset in milliseconds applied when recording timestamps",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: ["offset", "delay", "input offset", "ms", "compensation", "timing"],
	},
	{
		id: "editor-commit-offset",
		title: "Sync Commit Offset",
		description: "Fine-tune offset added when committing synchronized timestamps",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: ["commit offset", "timestamp", "offset", "delay", "finalize"],
	},
	{
		id: "editor-smart-first-word",
		title: "Smart First Word Timing",
		description: "Automatically predict reasonable start times for initial words in lines",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: ["smart", "first word", "start time", "lead-in", "prediction"],
	},
	{
		id: "editor-smart-word-anywhere",
		title: "Smart Word (Any Word in Line)",
		description:
			"Pressing G when a word has no start time acts as F to set its start time instead of ending it",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: [
			"smart",
			"smart word",
			"any word",
			"g key",
			"f key",
			"start time",
			"sync next",
			"no start time",
		],
	},
	{
		id: "editor-smart-last-word",
		title: "Smart Last Word Timing",
		description: "Automatically calculate end times for terminal words in lines",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: ["smart", "last word", "duration", "end time", "terminal"],
	},
	{
		id: "editor-split-occupied-word",
		title: "Split Word at Playhead on Sync",
		description:
			"When pressing Sync Next (G) inside an occupied word, replace its end time with the playhead and start the next word there",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: [
			"split",
			"playhead",
			"occupied",
			"sync next",
			"g key",
			"timing error",
			"end before start",
		],
	},
	{
		id: "editor-auto-split-trailing-space",
		title: "Split Trailing Space on Input",
		description:
			"Automatically split a trailing space into a dedicated space capsule when editing or typing words",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: [
			"split",
			"space",
			"trailing space",
			"capsule",
			"word edit",
			"typing",
			"input",
		],
	},
	{
		id: "editor-auto-segment",
		title: "Auto-Segment on Line Sync",
		description: "Automatically split lyrics into syllables or words while performing sync",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: ["auto-segment", "segmentation", "split", "syllables", "words", "spacing"],
	},
	{
		id: "editor-word-wrap",
		title: "Wrap Lyric Lines",
		description: "Wrap long lyric lines within the editor instead of horizontal clipping",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: ["wrap", "word wrap", "line wrap", "overflow", "editor lines"],
	},
	{
		id: "editor-upcoming-highlight",
		title: "Upcoming Word Highlight",
		description: "Visual glow or color indicator to highlight the next upcoming word to sync",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: ["upcoming", "highlight", "glow", "cue", "visual indicator", "threshold"],
	},
	{
		id: "editor-auto-scroll",
		title: "Keep Playing Word in View",
		description: "Smoothly follow and auto-scroll the active playing word in the lyric editor",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: ["auto-scroll", "follow", "scroll", "view", "playhead", "follow word"],
	},
	{
		id: "editor-compact-bg",
		title: "Compact Background Lines in Sync",
		description: "Condense background vocal lines during active synchronization",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: ["compact", "background", "bg", "vocal", "secondary", "collapse"],
	},
	{
		id: "editor-consecutive-bg",
		title: "Allow Consecutive Background Lines",
		description: "Allow multiple adjacent lines to be tagged as background vocals",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: ["consecutive", "background lines", "bg lines", "adjacent"],
	},
	{
		id: "editor-genius-header",
		title: "Genius Header Categorization",
		description: "Automatically parse section headers like [Chorus], [Verse], and [Bridge]",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: ["genius", "header", "verse", "chorus", "bridge", "section", "categorization"],
	},
	{
		id: "editor-never-split-words",
		title: "Words to Never Split",
		description: "Configure words that will never be split into syllables or segments across all songs",
		tab: "editor",
		tabName: "Editor & Sync",
		keywords: [
			"never split",
			"words to never split",
			"ignore list",
			"syllable",
			"split",
			"hyphenation",
			"segmentation",
			"protect words",
		],
	},

	// Files & Storage
	{
		id: "files-autosave",
		title: "Autosave",
		description: "Automatically save editing progress periodically to prevent data loss",
		tab: "files",
		tabName: "Files & Storage",
		keywords: ["autosave", "auto save", "interval", "save", "recovery", "history"],
	},
	{
		id: "files-download-audio",
		title: "Download Audio on Lyric Import",
		description: "Automatically download corresponding audio when importing lyric files",
		tab: "files",
		tabName: "Files & Storage",
		keywords: ["download audio", "import", "fetch audio", "stream", "media"],
	},
	{
		id: "files-cloud-audio",
		title: "Auto-load Cloud Audio",
		description: "Automatically load linked audio files when opening saved cloud songs",
		tab: "files",
		tabName: "Files & Storage",
		keywords: ["cloud audio", "auto-load", "storage", "media load"],
	},
	{
		id: "files-apostrophe",
		title: "Normalize Apostrophes on Import",
		description: "Convert curved typographic apostrophes (’, ‘) to standard straight apostrophes (')",
		tab: "files",
		tabName: "Files & Storage",
		keywords: ["apostrophe", "curly", "quotes", "normalize", "import", "straight quote"],
	},
	{
		id: "files-cyrillic-es",
		title: "Normalize Cyrillic Es on Import",
		description: "Convert lookalike Cyrillic 'с' homoglyphs to Latin 'c'",
		tab: "files",
		tabName: "Files & Storage",
		keywords: ["cyrillic", "homoglyph", "es", "c", "normalize", "character"],
	},
	{
		id: "files-spotmatch-save",
		title: "Open SpotMatch after saving",
		description: "Automatically open the SpotMatch track finder after saving a TTML file with Ctrl+S or Cmd+S",
		tab: "files",
		tabName: "Files & Storage",
		keywords: ["spotmatch", "spot match", "spotify", "match", "save", "ctrl+s", "cmd+s", "track finder"],
	},
	{
		id: "files-checklist",
		title: "TTML Checklist Database Status",
		description: "Show button to mark songs as uploaded to the database in TTML checklist",
		tab: "files",
		tabName: "Files & Storage",
		keywords: ["checklist", "database", "uploaded", "track", "status", "amll db", "mark as uploaded"],
	},
	{
		id: "files-backup",
		title: "Data Backup & Restore",
		description: "Export full backup file or restore all settings, autosaves, and custom themes",
		tab: "files",
		tabName: "Files & Storage",
		keywords: ["backup", "export", "restore", "import backup", "portable data", "zip"],
	},

	// Audio
	{
		id: "audio-volume",
		title: "Master Volume",
		description: "Default playback loudness for music preview and editing",
		tab: "audio",
		tabName: "Audio",
		keywords: ["volume", "sound", "loudness", "level", "audio", "gain"],
	},
	{
		id: "audio-playback-rate",
		title: "Playback Speed & Pitch",
		description: "Adjust playback rate multiplier and toggle pitch preservation",
		tab: "audio",
		tabName: "Audio",
		keywords: ["playback rate", "speed", "tempo", "pitch", "preserve pitch", "soundtouch"],
	},
	{
		id: "audio-equalizer",
		title: "10-Band Graphic Equalizer",
		description: "Tailor frequencies from 32Hz to 16kHz with equalizer presets",
		tab: "audio",
		tabName: "Audio",
		keywords: ["equalizer", "eq", "bass", "treble", "bands", "frequencies", "audio filter"],
	},
	{
		id: "audio-spectrogram",
		title: "Spectrogram Visualizer Settings",
		description: "Configure FFT size, frequency scale (Mel/Bark/Linear), contrast, and color palettes",
		tab: "audio",
		tabName: "Audio",
		keywords: ["spectrogram", "fft", "frequency", "mel", "bark", "colormap", "contrast", "palette"],
	},

	// Keybindings
	{
		id: "keybindings-shortcuts",
		title: "Keyboard Shortcuts",
		description: "Customize hotkeys for playback, timing input, split, merge, undo, and redo",
		tab: "keybinding",
		tabName: "Keybindings",
		keywords: ["keybindings", "shortcuts", "hotkeys", "keyboard", "bindings", "space", "play", "seek"],
	},

	// Appearance
	{
		id: "appearance-themes",
		title: "Built-in Themes & Presets",
		description: "Choose presets including Apple, Clear, Sunset Vibes, Nord Frost, Dracula, and Cyberpunk",
		tab: "appearance",
		tabName: "Appearance",
		keywords: ["theme", "preset", "builtin", "apple", "clear", "sunset", "nord", "dracula", "cyberpunk", "catppuccin"],
	},
	{
		id: "appearance-theme-mode",
		title: "Theme Mode (Light / Dark)",
		description: "Select Auto (matches operating system), Light theme, or Dark theme",
		tab: "appearance",
		tabName: "Appearance",
		keywords: ["dark mode", "light mode", "theme mode", "auto", "system theme", "legacy dark"],
	},
	{
		id: "appearance-accent",
		title: "Accent Color & Custom Tint",
		description: "Pick an accent color palette or enter custom HEX/HSL color",
		tab: "appearance",
		tabName: "Appearance",
		keywords: ["accent", "accent color", "tint", "custom color", "palette", "primary color"],
	},
	{
		id: "appearance-background",
		title: "Background Style & Wallpaper",
		description: "Set wallpaper image, linear/radial gradient, or clean solid background",
		tab: "appearance",
		tabName: "Appearance",
		keywords: ["background", "wallpaper", "gradient", "image", "glass", "backdrop", "acrylic"],
	},
	{
		id: "appearance-fonts",
		title: "Typography & Fonts",
		description: "Select custom system fonts for the Application UI, Lyric Editor, and Previews",
		tab: "appearance",
		tabName: "Appearance",
		keywords: ["font", "typography", "family", "text font", "editor font", "sans", "monospace"],
	},
	{
		id: "appearance-glassmorphism",
		title: "Glassmorphism & Blur Intensity",
		description: "Adjust blur radius and acrylic transparency effects",
		tab: "appearance",
		tabName: "Appearance",
		keywords: ["glass", "glassmorphism", "blur", "backdrop blur", "transparency", "frosted"],
	},
	{
		id: "appearance-custom-colors",
		title: "Advanced Component Colors",
		description: "Customize individual colors for Titlebar, Sidebar, Editor canvas, and Audio Bar",
		tab: "appearance",
		tabName: "Appearance",
		keywords: ["custom colors", "titlebar bg", "sidebar bg", "editor bg", "waveform color", "selection color"],
	},

	// Discord
	{
		id: "discord-rpc",
		title: "Discord Rich Presence",
		description: "Show your current song, artist, and editing state in Discord status",
		tab: "discord",
		tabName: "Discord RPC",
		keywords: ["discord", "rpc", "rich presence", "status", "activity", "album art"],
	},

	// About
	{
		id: "about-info",
		title: "About & Community Links",
		description: "Version details, changelog, repository links, and licenses",
		tab: "about",
		tabName: "About",
		keywords: ["about", "version", "github", "wiki", "changelog", "license", "contributors"],
	},

	// Developer
	{
		id: "dev-tools",
		title: "Developer Tools & Debugging",
		description: "Inspection aids, debug logging, and developer testing utilities",
		tab: "dev",
		tabName: "Developer",
		keywords: ["developer", "dev", "debug", "logs", "inspection", "experimental"],
	},
];

export function filterSettings(query: string): SettingSearchItem[] {
	const clean = query.trim().toLowerCase();
	if (!clean) return [];

	const terms = clean.split(/\s+/).filter(Boolean);

	return SETTINGS_SEARCH_ITEMS.filter((item) => {
		const targetText = [
			item.title,
			item.description ?? "",
			item.tabName,
			...item.keywords,
		]
			.join(" ")
			.toLowerCase();

		return terms.every((term) => targetText.includes(term));
	});
}
