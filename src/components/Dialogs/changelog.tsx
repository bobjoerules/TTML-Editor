import { DismissRegular } from "@fluentui/react-icons";
import {
	Box,
	Button,
	Dialog,
	Flex,
	Heading,
	ScrollArea,
	Text,
} from "@radix-ui/themes";
import { openExternal } from "$/utils/openExternal";
import { useAtom } from "jotai";
import { changelogDialogAtom } from "$/states/dialogs.ts";

export function ChangelogDialog() {
	const [isOpen, setIsOpen] = useAtom(changelogDialogAtom);

	const openGitHub = async () => {
		await openExternal(
			"https://github.com/bobjoerules/AMLL-TTML-TOOL/commits/main",
		);
	};

	return (
		<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Content
				aria-describedby={undefined}
				style={{ maxWidth: 650, height: "70vh", maxHeight: 600 }}
			>
				<Flex justify="between" align="center" mb="4">
					<Flex align="center" gap="3">
						<Dialog.Title mb="0">Changelog & Updates</Dialog.Title>
						<Button
							variant="soft"
							size="1"
							onClick={openGitHub}
							style={{ cursor: "pointer" }}
						>
							View Commits on GitHub
						</Button>
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
					style={{ height: "calc(100% - 60px)" }}
				>
					<Flex direction="column" gap="5" pr="4">
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v4.6.1
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 27, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Auto-Update Reliability:</b> Fixed desktop app updater hanging or failing silently. Added live byte-level download progress indicators, visible error alerts, and reliable restart handlers.
								</Text>
								<Text size="2">
									• <b>Multi-Window Crash Fix:</b> Fixed application crash when opening a new window (Cmd/Ctrl+Shift+N or menu) by correcting OS version string parsing and asynchronously handling webview window creation.
								</Text>
								<Text size="2">
									• <b>Windows Installer Permissions:</b> Configured updater for current-user installation mode to prevent silent UAC elevation failures during auto-updates.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v4.6.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 27, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Default File Name:</b> Changed default project and export filename to <code>unnamed.ttml</code> across the editor and session restores.
								</Text>
								<Text size="2">
									• <b>Web Edition Dropdown Backgrounds:</b> Fixed transparent backgrounds on section type, singer/voice, assistant settings, display options, and settings select dropdowns on the web version.
								</Text>
								<Text size="2">
									• <b>Clean Web Tab Title:</b> Simplified the browser page title to clean <code>TTML Editor</code>, showing song title only when a project is loaded.
								</Text>
								<Text size="2">
									• <b>Preferences Cleanup:</b> Removed the unused Developer tab from Preferences and search navigation.
								</Text>
								<Text size="2">
									• <b>About Page Alignments:</b> Vertically aligned third-party credit card icons with headings on the About page.
								</Text>
								<Text size="2">
									• <b>Complete Translations:</b> Populated 100% localization key coverage across all 18 interface languages and removed progress percentages.
								</Text>
								<Text size="2">
									• <b>Audio Notification Polish:</b> Suppressed the unneeded "Please load an audio file first" toast notification.
								</Text>
								<Text size="2">
									• <b>Creator Profile Subtitle:</b> Added descriptive subtext under "Total Words Synced" on community creator profile modals.
								</Text>
								<Text size="2">
									• <b>Windows Multi-Window Crash Fix:</b> Resolved crash when opening a new window on Windows by streamlining window initialization flags.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v4.5.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 27, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Trailing Space Auto-Splitting Toggle:</b> Added a setting
									toggle (on by default) under Editor &amp; Sync to automatically split
									a trailing space into its own space capsule when typing or
									editing words.
								</Text>
								<Text size="2">
									• <b>Space Cleanup on Word Deletion:</b> Deleting words in the
									Time tab and editor now automatically collapses adjacent space
									capsules and trims leading/trailing spaces instead of leaving
									orphaned spaces.
								</Text>
								<Text size="2">
									• <b>Word Split Space Extraction:</b> Manual Split Word dialog
									and segmentation logic now automatically extract trailing spaces
									into dedicated space capsules.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v4.4.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 26, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Section Duplication to Location:</b> Duplicating lines to
									a location now automatically assigns the section of the
									preceding line as the duplication&#39;s section.
								</Text>
								<Text size="2">
									• <b>Discord Rich Presence Application:</b> Connected Discord
									RPC to a dedicated TTML Editor application ID and updated
									repository endpoints.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v4.3.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 23, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Brand Renaming:</b> Renamed user-facing product branding
									from AMLL TTML Tool to TTML Editor.
								</Text>
								<Text size="2">
									• <b>Line Deletion Exception Fix:</b> Resolved a TypeError
									accessing unassigned section boundaries when deleting lines
									from the drop-down menu and ensured section integrity is
									repaired on line removal.
								</Text>
								<Text size="2">
									• <b>SpotMatch Badge Alignment:</b> Re-aligned the &quot;by
									tx24&quot; creator badge with the SpotMatch dialog title.
								</Text>
								<Text size="2">
									• <b>Unified Modal Dimensions:</b> Standardized dialog
									dimensions across Metadata Editor, SpotMatch, Cloud Storage,
									TTML Checklist, and Settings to use the checklist dimensions.
								</Text>
								<Text size="2">
									• <b>macOS Fullscreen Restoration:</b> Fixed an issue where
									exiting fullscreen on macOS via the green traffic light button
									left the window excessively wide by recovering normal window
									geometry.
								</Text>
								<Text size="2">
									• <b>Desktop App Download Link:</b> Added a direct download link
									to the desktop app in the Help menu exclusively for the web
									edition.
								</Text>
								<Text size="2">
									• <b>Profile Sync Badge Cleanup:</b> Removed the Word Sync / Line
									Sync badge overlay from songs listed on creator profiles.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v4.2.2
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 22, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Sync Word Split Default:</b> Changed the Split Word at
									Playhead on Sync (<kbd>G</kbd>) setting to be off by default.
								</Text>
								<Text size="2">
									• <b>FPS Counter Typography &amp; Placement:</b> Updated the
									FPS overlay with clean white text, Apple San Francisco Mono
									font styling, and moved the Show FPS control directly below
									Romanization in the preview ribbon bar.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v4.2.1
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 22, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Preview Page Controls Polish:</b> Show FPS is now an
									unconditionally accessible tool on the preview ribbon bar,
									and the redundant Advanced toggle switch has been removed.
								</Text>
								<Text size="2">
									• <b>Active Timer Tooltip Fix:</b> Fixed ICU MessageFormat
									interpolation for the active project timer and average sync
									tooltips on the top title bar.
								</Text>
								<Text size="2">
									• <b>Total Words Synced:</b> Replaced the old word-synced
									song ratio with exact Total Words Synced across your lyrics in
									account statistics and on community web profiles &amp;
									leaderboards.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v4.2.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 22, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Smart Word (Any Word) Synchronization:</b> Added a new
									sync setting allowing the Next Word trigger (<kbd>G</kbd>) on
									any untimed word to automatically act on its prior word,
									committing the prior word&apos;s end time and starting the
									current word seamlessly at the playhead position.
								</Text>
								<Text size="2">
									• <b>Project Active Timer &amp; Average Sync Time:</b>{" "}
									Implemented a non-idle project timer tracking active work
									duration per TTML project, calculating rolling average sync
									duration, syncing to user cloud profiles, and displaying
									average sync duration on the title bar tooltip, account
									settings tab, and online community statistics page.
								</Text>
								<Text size="2">
									• <b>Account Settings UI &amp; Statistics Layout Redesign:</b>{" "}
									Reorganized the account statistics grid into a balanced 6-card
									layout featuring distinct Fluent icons for all metrics
									(including Word-Synced lyrics count), and grouped Account
									Created, Last Active Sign-In, and Unique Account UID into a
									dedicated Account Information panel.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v4.1.3
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 22, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Default 90% Interface Scale:</b> Updated default
									application scale from 85% to 90% with seamless migration for
									existing installations, and added 90% to scale presets.
								</Text>
								<Text size="2">
									• <b>SpotMatch Native Desktop Requests:</b> Fixed 401
									unauthorized and 403 preflight proxy errors on Spotify Partner
									queries in desktop mode by routing authorization headers
									directly through Tauri&apos;s Rust network client.
								</Text>
								<Text size="2">
									• <b>Radix Dialog Accessibility Improvements:</b> Resolved
									missing DialogTitle and aria-describedby console warnings by
									wrapping headers and descriptions in SpotMatch, Ruby Editor,
									Checklist, Metadata Editor, and dialog modals.
								</Text>
								<Text size="2">
									• <b>IndexedDB Audio Cache Fix:</b> Fixed DataError when
									storing records in audio_cache by correctly wrapping loaded
									audio file metadata and safeguarding record key generation.
								</Text>
								<Text size="2">
									• <b>Genius Lyric Importer Hardening:</b> Prevented
									non-numeric track IDs from querying invalid endpoints and
									added native desktop fetch fallbacks.
								</Text>
								<Text size="2">
									• <b>WebGL Animated Background Texture Stability:</b>{" "}
									Implemented safe bitmap decoding for Kawarp animated
									background cover art, eliminating texImage2D bad image data
									errors on blob and data URLs in WebKit.
								</Text>
								<Text size="2">
									• <b>WebKit Viewport Meta Cleanup:</b> Removed unrecognized
									interactive-widget parameter to eliminate console errors on
									WebKit and macOS.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v4.1.2
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 21, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Preferences Search Number Cutoff Fix:</b> Resolved an
									issue where match count badges on sidebar navigation tabs were
									truncated at the right edge by normalizing inner tab trigger
									positioning and expanding sidebar clearance.
								</Text>
								<Text size="2">
									• <b>Website Top Navigation Bar Overhaul:</b> Fixed action
									buttons (&quot;Open in Browser&quot; and &quot;GitHub&quot;)
									overflowing and covering tab buttons by transitioning to a
									responsive flexbox layout with extended breakpoints.
								</Text>
								<Text size="2">
									• <b>Import from Text Auto-Segmentation Fix:</b> Resolved an
									issue when importing raw text lyrics with auto-segmentation
									enabled by allowing the lines array to be reassigned.
								</Text>
								<Text size="2">
									• <b>Showcase Gallery Enhancements:</b> Updated
									high-resolution gallery screenshots across all app showcase
									sections.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v4.1.1
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 21, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Default UI Scale:</b> Set default interface scale to 85%
									with parameterized reset buttons in preferences.
								</Text>
								<Text size="2">
									• <b>Time Tab Unsynced Words Highlighting:</b> Extended the
									red unsynced word highlighting setting to the Time tab (Sync
									Mode) for complete parity with the Edit tab and preview mode.
								</Text>
								<Text size="2">
									• <b>Fullscreen Window Size Recovery:</b> Fixed an issue where
									exiting preview fullscreen left the application window
									excessively wide by properly restoring previous window
									geometry and removing redundant WebKit fullscreen triggers in
									desktop mode.
								</Text>
								<Text size="2">
									• <b>Album Cover Enhancements:</b> Enlarged album artwork
									thumbnails in Metadata Editor with an interactive
									high-resolution hover preview, enhanced cloud song cover
									sizes, and enabled responsive scaling for SpicyLyrics
									fullscreen album art.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v4.1.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 21, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Audio Engine Upgrades:</b> Integrated zero-latency audio
									engine fixes with improved playback synchronization,
									spectrogram stability, and seamless track handling.
								</Text>
								<Text size="2">
									• <b>Never-Split Words Dictionary:</b> Added a global custom
									word list in Settings &gt; Syllabification to prevent
									designated words or proper nouns from ever being split into
									syllables across any songs.
								</Text>
								<Text size="2">
									• <b>Audio Track Bar Navigation:</b> Left-clicking the bottom
									audio track bar moves the playback playhead, while right-click
									moves and scrolls the spectrogram view.
								</Text>
								<Text size="2">
									• <b>Settings Inline Search:</b> Refactored the settings
									search experience so matching controls, toggles, and inputs
									appear directly inside the search view.
								</Text>
								<Text size="2">
									• <b>Public Community Checklist:</b> Launched the public song
									checklist showcase page on the website for browsing community
									planned, in-progress, and finished TTML projects.
								</Text>
								<Text size="2">
									• <b>Top Bar Centering &amp; UI Polish:</b> Fixed navigation
									bar centering when logged in, polished search result spacing,
									and fixed transparent hover tooltips on the website.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v4.0.1
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 20, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Open SpotMatch After Save:</b> Added a setting in
									Settings &gt; Files (disabled by default) that automatically
									launches the SpotMatch track finder after saving a TTML file
									with Ctrl+S or Cmd+S.
								</Text>
								<Text size="2">
									• <b>Sync Progress Tooltip Removed:</b> Removed the hover
									tooltip popup over the sync percentage badge in the top bar.
								</Text>
								<Text size="2">
									• <b>File Menu Auto-Save Cleanup:</b> Removed the Auto-Save
									toggle from the File menu (available in Settings &gt; Files)
									and simplified the dropdown option to <b>Auto-Saves…</b>.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v4.0.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 20, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Spicy Lyrics Exclusive Preview:</b> Transitioned
									exclusively to the Spicy Lyrics renderer across fullscreen and
									side preview panels, retiring legacy AMLL, Toxi, and Timing
									Overview modes for a unified, modern experience.
								</Text>
								<Text size="2">
									• <b>Modern Spicy Visuals & Liquid Glass:</b> Upgraded the
									Spicy Lyrics renderer to match upstream{" "}
									<code>spicy-lyrics</code> with Apple HIG design tokens,
									refined syllable typography and dynamic glow, 3-phase syllable
									expansion transform physics, interlude dot springs, hover
									scrub preview, and song credits.
								</Text>
								<Text size="2">
									• <b>Redesigned Preview Toolbar:</b> Rebuilt the preview
									ribbon bar with clean, modern interactive toggle buttons for
									View and Lyrics controls, removing legacy clutter.
								</Text>
								<Text size="2">
									• <b>Syllabification & Syllable Splits:</b> Restored original
									pre-v3.2.0 dictionary-backed prosodic split behavior with
									speech fallback, and added the singing syllable heuristics
									engine from TTML Review & Spicy Lyrics (
									<code>spicy-lyrics</code>).
								</Text>
								<Text size="2">
									• <b>Auto Segment Re-Split Support:</b> Added an option in
									Auto Segment (enabled by default) to automatically recombine
									and re-split already segmented words.
								</Text>
								<Text size="2">
									• <b>TTML Checklist Public Status:</b> Added an option in the
									TTML checklist to mark planned or in-progress songs as shared
									publicly with the community.
								</Text>
								<Text size="2">
									• <b>TitleBar Genius Direct Navigation:</b> Genius button
									queries song hits to open the track's Genius lyrics page
									directly instead of just search results.
								</Text>
								<Text size="2">
									• <b>Download Audio Tool Fix:</b> Fixed Download Audio in the
									Tools menu failing when reading TTML metadata keys.
								</Text>
								<Text size="2">
									• <b>Discord RPC Idle Timeout:</b> Added an option in Discord
									RPC settings (disabled by default) to control idle inactivity
									timeout behavior.
								</Text>
								<Text size="2">
									• <b>Editor Locate Button:</b> Made the editor locate button
									larger and easier to click.
								</Text>
								<Text size="2">
									• <b>Unsynced Word Highlighting:</b> Added an optional setting
									(disabled by default) to highlight unsynced words in red in
									the Editor tab matching the preview view.
								</Text>
								<Text size="2">
									• <b>Menu Auto-Save Options:</b> Relocated auto-save toggle
									and version history into the File menu and streamlined the top
									bar.
								</Text>
								<Text size="2">
									• <b>SpotMatch tx24 Credit:</b> Added creator badge and
									attribution to tx24 in the SpotMatch dialog.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v3.2.1
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 16, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>TitleBar Genius Shortcut Fix:</b> Resolved an issue where
									clicking the TitleBar Genius button could throw an error or
									open album artwork instead of the track’s Genius song page.
								</Text>
								<Text size="2">
									• <b>Website Word Sync Display:</b> Fixed word-synced songs
									displaying as line-synced on the website when payloads are
									stored separately in the cloud.
								</Text>
								<Text size="2">
									• <b>External Link Navigation:</b> Ensured links in Genius
									search dialog open directly in the default system web browser.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v3.2.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 16, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Direct Lyric Import:</b> Skipped the intermediate section
									review screen when importing lyrics from Genius and plain
									text, directly establishing sections and auto-duet
									assignments.
								</Text>
								<Text size="2">
									• <b>Persistent Audio Download Indicator:</b> Made the audio
									download notification persist on screen until the track is
									completely downloaded and loaded into the audio engine.
								</Text>
								<Text size="2">
									• <b>Enhanced Syllabification Engine:</b> Added hybrid
									TeX-based syllable splitting algorithm with customizable rules
									and restored the Syllable Split button in the segmentation
									module.
								</Text>
								<Text size="2">
									• <b>Line Split Category Inheritance:</b> Splitting a lyric
									line now automatically preserves and inherits the original
									line's category.
								</Text>
								<Text size="2">
									• <b>Genius Background Lyric Splitting:</b> Added an import
									toggle to automatically split background vocals containing
									semicolons or capitalized words into separate lines while
									cleaning punctuation delimiters.
								</Text>
								<Text size="2">
									• <b>TitleBar Genius Shortcut:</b> Added a dedicated Genius
									button in the title bar to open the song page in the browser,
									gracefully disabled when no song is loaded.
								</Text>
								<Text size="2">
									• <b>Audio Downloader Accuracy & Menu Item:</b> Improved
									JOOX/online track search accuracy to avoid wrong songs or
									clean versions from the same artist, and added a "Download
									Audio..." item in the Tools menu.
								</Text>
								<Text size="2">
									• <b>Cloud Storage Filter Parity:</b> Aligned cloud storage
									sort/filter options with the TTML checklist (All, In Progress,
									Completed).
								</Text>
								<Text size="2">
									• <b>Website Song Statistics:</b> Fixed public song count
									syncing between the website statistics page and user profiles.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v3.1.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 9, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Audio Engine Sleep & Wake Recovery:</b> Automatically
									recovers and resumes the AudioContext hardware clock when the
									computer sleeps, switches applications, or loses focus,
									ensuring sound playback never gets permanently silenced.
								</Text>
								<Text size="2">
									• <b>Settings Search:</b> Added an integrated search bar in
									the Settings dialog with real-time keyword indexing, category
									match counts, and keyboard shortcuts (Cmd/Ctrl+F, Esc).
								</Text>
								<Text size="2">
									• <b>Theme & Tool Menu Acrylic Polish:</b> Fixed transparent
									tool menus in Web and Windows when using the Clear theme with
									solid and backdrop-blur styling, and added proper surface
									backgrounds and hover states for the locate button.
								</Text>
								<Text size="2">
									• <b>Line End Time Normalization & Word Preview Sync:</b>{" "}
									Normalized line end times to always match the last synced word
									instead of leaving them at zero on partially synced lines,
									keeping word sweep animations active in preview.
								</Text>
								<Text size="2">
									• <b>JOOX Artwork Resolution & Fallback:</b> Resolved 404
									broken image placeholders across JOOX search results with
									automatic Apple iTunes artwork enrichment and graceful
									fallback to music note icons.
								</Text>
								<Text size="2">
									• <b>Notification Indicator Positioning:</b> Shifted toast
									indicator pop-ups down below the title bar so the Preview
									Panel toggle button is never obscured.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v3.0.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 7, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Spectrogram Playhead Tracking and Navigation:</b>{" "}
									Clicking the bottom audio slider while the spectrogram is open
									now moves the playhead and snaps according to playhead
									tracking mode, preventing unintended viewport displacements.
								</Text>
								<Text size="2">
									• <b>Preview Unsynced Lyric Protection:</b> Clicking unsynced
									lines or words in preview mode no longer moves the audio
									playhead.
								</Text>
								<Text size="2">
									• <b>Checklist Deletion and Cloud Sync:</b> Fixed checklist
									deletion persistence so removing entries deletes them across
									local storage and cloud sync rather than reappearing on
									reload.
								</Text>
								<Text size="2">
									• <b>UI and Layout Polish:</b> Resolved dropdown menu
									scrollbar overflow issues, stabilized toggle button widths,
									and improved lyrics import dialog responsiveness.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.3.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 7, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Split Background and Main Vocals on Spectrogram:</b>{" "}
									Added a setting and sidebar toggle to separate main vocals
									into the upper track and background vocals into the lower
									track on the spectrogram, with simultaneous display for
									overlapping lines during sync.
								</Text>
								<Text size="2">
									• <b>Native Menu Labeling Polish:</b> Resolved an issue where
									native OS menu accelerators stripped the ampersand in Grammar
									and Spelling Check, creating an unwanted double space.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.16
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 6, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Auto Duet by Singer on Genius Import:</b> Added an Auto
									Duet option when downloading lyrics from Genius, automatically
									assigning sequential voices (v1, v2, etc.) and duet flags
									based on section vocalist headers.
								</Text>
								<Text size="2">
									• <b>Cloud Save Fix:</b> Resolved a runtime error caused by a
									missing Firestore updateDoc import when saving projects to
									Cloud Storage.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.15
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 6, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Local Audio Path Prioritization:</b> Before attempting to
									download audio from cloud storage or online providers, the app
									now checks if the audio file still exists in the local disk
									location it was in when the TTML was uploaded, loading the
									original file instantly without re-downloading.
								</Text>
								<Text size="2">
									• <b>Audio Select Track Dialog Polish:</b> Expanded the track
									selection dialog to a spacious responsive width, added proper
									flex truncation for long song titles, and resolved an issue
									where action buttons were partially pushed off-screen.
								</Text>
								<Text size="2">
									• <b>Desktop Release Pipeline Stability:</b> Resolved a
									release collision race condition across multi-platform desktop
									build runners in GitHub Actions.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.14
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 6, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Kuwo Music Provider &amp; Provider Selection:</b> Added
									Kuwo Music integration alongside JOOX and QQ Music for fast,
									high-availability track lookup and direct audio downloads,
									with selectable provider filtering in the search dialog.
								</Text>
								<Text size="2">
									• <b>Auto-Downloader 30ms Audio Timing Alignment:</b>{" "}
									Automatically compensates for streaming CDN leading silence
									trimming by offsetting auto-downloaded tracks by 0.03 seconds,
									ensuring audio starts in exact sync with TTML lyric timestamps
									while preserving untouched local files.
								</Text>
								<Text size="2">
									• <b>Audio Downloader Beta Indicators:</b> Added{" "}
									<code>[Beta]</code> tags to all audio download progress
									notifications, download dialog headers, and import toggles
									across the app.
								</Text>
								<Text size="2">
									• <b>Download Percentage Status:</b> Added real-time progress
									percentage tracking during in-app audio track downloads.
								</Text>
								<Text size="2">
									• <b>Binary Streaming &amp; IPC Reliability:</b> Optimized
									Tauri native binary fetching with array buffer conversion,
									eliminating CORS bottlenecks and download interruptions.
								</Text>
								<Text size="2">
									• <b>Multi-Voice Duet Alignment:</b> Added support for
									multi-voice singing (odd voices v1, v3, v5 aligned left; even
									voices v2, v4 aligned right) across AMLL and Spicy Lyrics
									preview modes.
								</Text>
								<Text size="2">
									• <b>English Syllabification Engine Enhancements:</b> Fixed
									syllable boundaries for compound words with consonant codas
									(e.g. blindfold, headlights, soundtrack) by repairing
									phonotactically impossible onsets, and improved language
									detection accuracy for English lyrics.
								</Text>
								<Text size="2">
									• <b>Checklist Audio Auto-Loading:</b> TTML Checklist now
									seamlessly loads attached cloud audio, searches local matches,
									or triggers the online audio downloader when opening songs.
								</Text>
								<Text size="2">
									• <b>Cloud &amp; Leaderboard Improvements:</b> Added Firestore
									collection pagination for accurate leaderboard statistics,
									deduplicated profile counts, and fixed direct cloud storage
									download routes.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.13
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								October 1, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Full-Width Spectrogram &amp; Docked Preview:</b> Added a
									layout setting allowing the audio controls and spectrogram to
									span the full width across the bottom of the window, docking
									the side preview panel directly above it from the titlebar
									down to the audio bar.
								</Text>
								<Text size="2">
									• <b>Side Preview Panel Quick Toggle:</b> Added a dedicated
									quick-toggle button in the Side Preview Panel header toolbar
									to switch seamlessly between the classic full-height preview
									and full-width spectrogram layouts.
								</Text>
								<Text size="2">
									• <b>Playback Rate Keybinding Fix:</b> Fixed <code>[</code>{" "}
									and <code>]</code> keyboard shortcuts so they adjust playback
									speed without accidentally seeking or jumping playback time.
								</Text>
								<Text size="2">
									• <b>Find &amp; Replace Input Focus Fix:</b> Resolved an issue
									where typing in the Find field while the Replace field was
									visible would prematurely jump focus to the Replace input.
								</Text>
								<Text size="2">
									• <b>SEO, Sitemaps &amp; Search Indexing:</b> Added complete
									search engine metadata, Open Graph tags, sitemaps, and
									robots.txt for both the web app and website.
								</Text>
								<Text size="2">
									• <b>Grayscale Website Redesign:</b> Updated website styling
									to a sleek grayscale theme with refined navigation and
									consistent design accents.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.12
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 28, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Tab Key Mode Switching:</b> Pressing <code>Tab</code> or{" "}
									<code>Shift + Tab</code> now cycles smoothly between Edit,
									Sync, and Preview modes. Focus-aware safeguards preserve
									standard keyboard navigation inside input fields, textareas,
									and modal dialogs.
								</Text>
								<Text size="2">
									• <b>Playhead Tracking &amp; Snapping Off Indicator:</b> Added
									a dedicated <code>EyeTrackingOff</code> icon when spectrogram
									playhead tracking and snapping is disabled, making the
									distinction between Follow, Snap, and Off states instantly
									clear.
								</Text>
								<Text size="2">
									• <b>Native macOS Tools Menu:</b> Relocated Grammar &amp;
									Spelling Check to the Tools menu across both web and native
									macOS application menu bars, alongside direct access to Cloud
									File Manager and TTML Checklist.
								</Text>
								<Text size="2">
									• <b>Multi-Line Relative Playhead Snapping:</b> Snapping
									multiple selected lyric lines to the playhead now aligns the
									first line to current playback time while precisely preserving
									relative timing offsets across all subsequent lines.
								</Text>
								<Text size="2">
									• <b>Discord Component Embeds &amp; Clean URLs:</b> Deployed
									dynamic Cloudflare Worker embeds for user profiles and
									community statistics with live contributor badges and clean
									path routing, alongside raw GitHub asset URLs for Discord RPC.
								</Text>
								<Text size="2">
									•{" "}
									<b>
										Website HTML5 History Navigation &amp; Liquid Player
										Showcase:
									</b>{" "}
									Upgraded the companion website from hash routing to HTML5
									History <code>pushState</code> navigation and introduced a
									dedicated showcase page for Liquid Player.
								</Text>
								<Text size="2">
									• <b>Autosave &amp; Audio File Association:</b> Improved
									project autosave filename resolution and automatic audio
									reload associations for seamless session restoration.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.11
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 22, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Community TTML Opt-In Privacy:</b> Songs uploaded to the
									cloud without toggling public visibility will no longer appear
									on the website community library without lyrics. Cloud songs
									now strictly require public opt-in before appearing in
									community listings.
								</Text>
								<Text size="2">
									• <b>On-Demand Payload Downloading:</b> Community TTML
									downloads now seamlessly fetch raw lyrics on-demand from
									dedicated subcollections when metadata-only records are
									indexed.
								</Text>
								<Text size="2">
									• <b>Website Navbar &amp; Responsive Layout Polish:</b>{" "}
									Prevented navigation buttons and links from wrapping onto two
									lines on desktop viewports, and improved responsive tablet
									navigation drawer behavior.
								</Text>
								<Text size="2">
									• <b>Cloud File Manager Segmented Controls:</b> Upgraded cloud
									file filter controls with modern segmented buttons and
									prevented long song titles or descriptions from wrapping the
									header.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.10
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 22, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Web Audio Pitch Preservation with SoundTouch:</b>{" "}
									Integrated SoundTouch time-stretching directly into the Web
									Audio graph, preserving original musical pitch during playback
									rate changes without routing through HTMLAudioElement or
									experiencing audio dropouts.
								</Text>
								<Text size="2">
									• <b>Smooth Playhead Scrubbing:</b> Eliminated audio dropouts,
									playback stalling, and playhead fighting when dragging the
									timeline scrubber during active playback through
									animation-frame seek throttling.
								</Text>
								<Text size="2">
									• <b>Cloud Save Dialog Polish:</b> Streamlined the Cloud Save
									workflow by removing unnecessary stats navigation links from
									the save modal.
								</Text>
								<Text size="2">
									• <b>Checklist &amp; Cloud Sync Reliability:</b> Improved
									checklist status detection, version history operations, and
									sync consistency.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.9
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 22, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Cloud Library Song Grouping &amp; Version History:</b>{" "}
									Grouped Cloud TTML documents by song and artist with cover
									artwork, line count, audio duration, and version counters,
									introducing an interactive version dropdown to browse,
									restore, download, or delete past revisions.
								</Text>
								<Text size="2">
									•{" "}
									<b>
										On-Demand Cloud Payload Subcollections &amp; Instant
										Caching:
									</b>{" "}
									Decoupled lightweight song metadata from heavy TTML file
									payloads by storing raw lyrics in on-demand subcollections,
									and added instant local storage caching for immediate library
									opening without download delays.
								</Text>
								<Text size="2">
									• <b>Tools Menu Shortcuts &amp; Keyboard Bindings:</b> Rebound
									Auto Segment to <code>Cmd/Ctrl + K</code>, added dedicated
									shortcuts for SpotMatch (<code>Cmd/Ctrl + Shift + M</code>)
									and TTML Checklist (<code>Cmd/Ctrl + Shift + C</code>), and
									exposed keybinding configurations in Settings.
								</Text>
								<Text size="2">
									• <b>TTML Checklist Workflow &amp; Classification:</b> Added
									dedicated tabs and counters for Not Started, In Progress, and
									Completed songs, an instant completion toggle, and separated
									raw cloud upload from auto-completion status.
								</Text>
								<Text size="2">
									• <b>Dark Theme Window &amp; Startup Flash Prevention:</b>{" "}
									Configured native window theme to Dark and injected early
									theme initialization into the HTML root to eliminate white
									screen flashes on startup, with transparent lyric editor
									background when custom backgrounds or gradients are enabled.
								</Text>
								<Text size="2">
									• <b>Universal External Link Handling:</b> Unified desktop and
									web URL opening across community dashboards, creator profiles,
									and guides via a cross-platform opener.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.8
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 21, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Preserve Audio Pitch on Slow Playback:</b> Retained
									native audio pitch through Web Audio routing when slowing down
									audio playback with Preserve Pitch enabled, allowing accurate
									syllable synchronization at 0.75x and 0.5x speeds without
									dropping pitch octaves.
								</Text>
								<Text size="2">
									• <b>Direct Spotify Track ID &amp; Link Importer:</b> Enhanced
									Apple Music TTML importer to directly accept raw Spotify track
									IDs, protocol-less URLs (
									<code>open.spotify.com/track/...</code>), URIs (
									<code>spotify:track:...</code>), and links with query
									parameters, immediately switching to "Fetch TTML".
								</Text>
								<Text size="2">
									• <b>Missing Track Error Handling:</b> Added clear error
									reporting and toast alerts (
									<code>No song found for this Spotify ID</code>) when querying
									invalid or non-existent track IDs.
								</Text>
								<Text size="2">
									• <b>Cloud Accounts &amp; Modern UI Polish:</b> Added user
									profile statistics, direct web dashboard navigation, aligned
									Cloud modal styling with the TTML Checklist aesthetics, and
									modernized app branding assets and app icons.
								</Text>
								<Text size="2">
									• <b>Community Leaderboard &amp; Statistics Dashboard:</b>{" "}
									Launched public community statistics web dashboard (
									<code>ttml.bobjoerules.com/#stats</code>) tracking global
									uploads, top lyric creators, total timed lines, and user
									profile pages (<code>#user=UID</code>).
								</Text>
								<Text size="2">
									• <b>TTML Video Generator (Beta):</b> Introduced experimental
									Python video generation tool for rendering syllable-timed TTML
									lyrics into animated preview videos.
								</Text>
								<Text size="2">
									• <b>Auto Segment Timing &amp; Playhead Sync:</b> Added
									segment-aware syllable timing shortcuts and playhead
									synchronization during sync mode.
								</Text>
								<Text size="2">
									• <b>Custom Appearance &amp; Font Selection:</b> Expanded
									background gradient presets, custom background image loading,
									and granular font customization options.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.7
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 13, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Find &amp; Replace Tool:</b> Integrated an interactive,
									non-blocking Find &amp; Replace toolbar with real-time match
									navigation, case sensitivity, whole-word matching, regular
									expression support, multi-field scope filtering (lyrics,
									translations, romanizations), single replacements, and batch
									Replace All with full undo/redo integration (
									<code>Cmd/Ctrl + F</code> / <code>Cmd/Ctrl + H</code>).
								</Text>
								<Text size="2">
									• <b>English Default Localization:</b> Set English (
									<code>en-US</code>) as the universal default language across
									the app, root HTML tag, TTML translation export attributes (
									<code>xml:lang="en"</code>), and all component fallbacks,
									preventing unwanted translation prompts and untranslated text.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.6
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 13, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Multi-Singer Duet &amp; Voice Channel Engine:</b> Added
									support for three or more singer agents (v1, v2, v3, up to
									v1000) across line properties, auto-duet assignments, line
									vocal badges, ribbon controls, and Apple TTML head metadata
									exports.
								</Text>
								<Text size="2">
									• <b>macOS Fullscreen Titlebar Optimization:</b> Dynamically
									collapse the window control spacer when entering native macOS
									fullscreen mode so titlebar content smoothly shifts to the
									left screen edge.
								</Text>
								<Text size="2">
									• <b>Double Tooltip Fix:</b> Eliminated redundant native
									browser tooltips stacking over styled Radix UI tooltips on the
									Side Preview Panel toggle button.
								</Text>
								<Text size="2">
									• <b>Modern Top Menus &amp; Acrylic Surfaces:</b> Redesigned
									the top menu bar buttons (File, Edit, Tools, Help) and
									dropdown surfaces with translucent acrylic blur, smooth
									slide-and-fade popup animations, Fluent cloud icons, and
									keycap-style keyboard shortcut badges.
								</Text>
								<Text size="2">
									• <b>Domain &amp; Link Updates:</b> Updated canonical web
									application links and website documentation to ttmleditor.com.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.5
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 11, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Keybinding Engine & Shortcut Fixes:</b> Resolved an issue
									where modifier keys (Command/Control/Alt/Shift) could get
									stuck in the listener state after system shortcuts or dialogs,
									preventing all hotkeys from firing. Added event modifier
									reconciliation and ghost key protection.
								</Text>
								<Text size="2">
									• <b>Background & Duet Shortcuts:</b> Added <code>B</code> to
									toggle background vocal (<code>isBG</code>) and <code>D</code>{" "}
									to toggle duet vocal (<code>isDuet</code>) on selected lines
									in Edit mode, and enabled <code>B</code> in Sync mode without
									conflicting with word navigation.
								</Text>
								<Text size="2">
									• <b>Window Close Confirmation:</b> Added unsaved changes
									dialog prompt when closing windows with unsaved edits in the
									desktop app.
								</Text>
								<Text size="2">
									• <b>Preview Progress Bar Time Color:</b> Updated the elapsed
									and remaining time display on the preview progress bar to
									solid white.
								</Text>
								<Text size="2">
									• <b>Checklist Artwork Updates:</b> Fixed song artwork editing
									permissions and allow updating cover art directly by clicking
									the album artwork image in the checklist.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.4
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 8, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Sync Key Playhead Alignment:</b> Fixed word timing start,
									split, and end placements (F, G, and H keys) so they directly
									match the exact playhead position when paused or scrubbing.
								</Text>
								<Text size="2">
									• <b>Word Divider Snapping:</b> All syllable and word boundary
									dividers on the spectrogram timeline now magnetically snap to
									the playhead line.
								</Text>
								<Text size="2">
									• <b>Mini Track View Highlight Fix:</b> Resolved an issue
									where the bottom audio waveform bar was flooded with an
									unwanted red highlight; replaced the viewport region with a
									clean neutral lens that hides automatically when the
									spectrogram is closed.
								</Text>
								<Text size="2">
									• <b>Spectrogram Playhead Improvements:</b> Centered the scrub
									handle tip directly over the playhead line and prevented the
									handle from turning red on hover.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.3
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 8, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>SpotMatch Original ID Toggle:</b> Added a persistent
									toggle to include the searched original track ID when copying
									IDs or exporting to a <code>.txt</code> file.
								</Text>
								<Text size="2">
									• <b>Deduplication & Flexible Export:</b> Prepend source track
									IDs seamlessly while preventing duplicate entries in Spicy
									Lyrics formatted ID lists.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.2
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 7, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Wrap Long Lyric Lines:</b> Added an option to wrap lyric
									lines to subsequent rows instead of forcing horizontal
									scrolling when lines exceed the editor width.
								</Text>
								<Text size="2">
									• <b>Sync Mode & RibbonBar Integration:</b> Quick toggle in
									the Sync Mode Display Options popover and General Settings.
								</Text>
								<Text size="2">
									• <b>Subline & Word Chip Wrapping:</b> Cleanly breaks and
									wraps word chips with distinct borders, and formats
									translations and pronunciation sublines.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.1
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 7, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Interface Scale Setting:</b> Added comprehensive UI
									scaling presets (50% to 200%), reset button, and keyboard
									shortcuts (Cmd/Ctrl +, -, 0) in Appearance and General
									settings.
								</Text>
								<Text size="2">
									• <b>Native Webview Zoom:</b> Utilizes native webview scaling
									to ensure the entire application and dialogs zoom cleanly with
									zero letterboxing or canvas clipping.
								</Text>
								<Text size="2">
									• <b>Theme Accent Harmonization:</b> Harmonized scale
									indicators and active preset buttons with the active theme
									accent color.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.2.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 7, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Empty Beat Deprecation & Removal:</b> Completely removed
									legacy empty beat (amll:empty-beat) controls, sync keybinding
									interceptors, XML attributes, text import options, and data
									models to align cleanly with official Apple TTML standards.
								</Text>
								<Text size="2">
									• <b>Spectrogram Playback Speed Preset:</b> Added a quick 0.8x
									playback speed button to the audio spectrogram toolbar for
									fine-grained sync adjustments.
								</Text>
								<Text size="2">
									• <b>Timing View Layout Normalization:</b> Fixed excessive
									bottom padding when scrolling to the end of lyrics in the
									Timing tab.
								</Text>
								<Text size="2">
									• <b>Preview & Stability Improvements:</b> Refined fullscreen
									mode controls, theme color consistency, and lyric player
									lifecycle hooks.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.1.3
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 6, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Lyric Line View Stability:</b> Fixed missing Badge
									component import from @radix-ui/themes in lyric-line-view.tsx,
									resolving ReferenceError: Can't find variable: Badge when
									rendering collapsed section line counters.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.1.2
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 6, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>SpicyLyrics Album Artwork & Media Controls:</b>{" "}
									Integrated Apple Music style album artwork, track title,
									singer/artist metadata, and an interactive seekable scrubber
									directly into SpicyLyrics mode, toggleable via floating canvas
									button or preview options.
								</Text>
								<Text size="2">
									• <b>Preview Fullscreen Mode:</b> Added dedicated fullscreen
									preview mode (keyboard shortcut F to toggle, Esc to exit) with
									floating controls and an autohiding exit button.
								</Text>
								<Text size="2">
									• <b>SpicyLyrics Theme Background Matching:</b> Updated
									SpicyLyrics container and animated backdrop to seamlessly
									harmonize with active Radix theme accent colors and dark mode
									palette.
								</Text>
								<Text size="2">
									• <b>Editor Background & Contrast Integrity:</b> Resolved
									empty-state transparency issue when custom background
									gradients are active, ensuring editor background properly
									styles the editor workspace and empty-state action buttons
									retain high contrast and visibility.
								</Text>
								<Text size="2">
									• <b>Toolbar Streamlining & Localization:</b> Cleaned up
									duplicate fullscreen and artwork buttons from the RibbonBar,
									removed obsolete guide outlines, and completed localized
									English and Chinese translations for segmentation and spacing
									options.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.1.1
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 6, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Word Context Menu Restoration:</b> Fixed right-click
									targeting in the lyric editor so words in both Edit and Sync
									modes properly display word actions ("Split word…", "Replace
									word…", and "Combine words") rather than falling back to space
									or line menus.
								</Text>
								<Text size="2">
									• <b>Word Menu Runtime Stability:</b> Corrected missing hook
									imports in the word context menu component, resolving runtime
									ReferenceErrors when inspecting words.
								</Text>
								<Text size="2">
									• <b>Website Release Notice:</b> Synchronized the project
									homepage release status banner to reflect the latest release
									version.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.1.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 6, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>TTML Checklist Favorites:</b> Star favorite songs in the
									TTML Checklist with a dedicated 1-click favorite button and
									new Favorites tab filter for quick access to priority tracks.
								</Text>
								<Text size="2">
									• <b>Spectrogram Playback Speed Controls:</b> Added
									interactive playback speed presets (0.5x, 0.75x, 1x, 2x)
									directly in the spectrogram sidebar for fine-tuned audio
									scrubbing and syllable timing alignment.
								</Text>
								<Text size="2">
									• <b>High-Performance Lyric Editor Architecture:</b>{" "}
									Consolidated line and word context menus into a unified single
									listener and centralized word settings context, drastically
									reducing DOM overhead and memory footprint during long editing
									sessions.
								</Text>
								<Text size="2">
									• <b>Accent Theme & Color Palette Harmonization:</b> Cleaned
									up hardcoded element highlights across toolbars, dialogs, and
									controls to fully inherit the user's custom accent colors and
									theme settings.
								</Text>
								<Text size="2">
									• <b>Discord Rich Presence Auto-Reconnect:</b> Implemented a
									5-second background reconnection heartbeat and improved Tauri
									environment detection so Discord RPC status activates
									seamlessly without manual toggling.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v2.0.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 5, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Section Management & Ribbon Controls:</b> Added dedicated
									Section category selection and Vocalist / Singer input in the
									RibbonBar, bracketless clean header display, collapsible
									section blocks with toggle arrows, and section-inheriting line
									insertion.
								</Text>
								<Text size="2">
									• <b>Auto Duet & Smart Spacing:</b> Automatically assigns
									secondary vocalist parts for duets and cleanly separates
									trailing spaces into dedicated space words for Apple
									Music-accurate syllable formatting.
								</Text>
								<Text size="2">
									• <b>Clear Theme Uniformity:</b> Unified all application bars
									(TitleBar, RibbonBar, Editor, and AudioBar) with consistent
									clear transparency, customizable frosted glass styling, and
									polished macOS and Windows controls.
								</Text>
								<Text size="2">
									• <b>Dynamic Completion Percentage Colors:</b> File status
									completion percentage dynamically transitions smoothly through
									red, orange, yellow, and green based on completion progress.
								</Text>
								<Text size="2">
									• <b>Discord Rich Presence & Stability:</b> Improved project
									time tracking accuracy, customizable rich presence settings,
									and overall performance optimizations.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.3.1
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 5, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>SpotMatch .txt Export:</b> Added a dedicated "Save as
									.txt" button to SpotMatch, allowing users to export selected
									alternate Spotify IDs directly to a text file with clean,
									sanitized suggested filenames.
								</Text>
								<Text size="2">
									• <b>Web CORS Resolution:</b> Enabled seamless SpotMatch and
									Apple Music TTML search on the web version via the dedicated
									Cloudflare proxy (proxy.bobjoerules.com).
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.3.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 4, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>SpotMatch (Alternate Spotify IDs):</b> Introduced a
									built-in companion tool adapted from SpotMatch to search and
									match alternate Spotify recording IDs across singles, albums,
									deluxe editions, and remasters with zero authentication or API
									keys. Includes audio duration difference analysis, custom
									tolerance thresholds, and 1-click comma-separated export
									formatted for the Spicy Lyrics bot.
								</Text>
								<Text size="2">
									• <b>Genius Link Resolver:</b> Added native resolution for
									Genius album and song URLs. Pasting a Genius album link into
									the Album Importer now extracts the entire tracklist and cover
									artwork directly without needing an API key; pasting a song
									link into lyric search dialogs instantly resolves and
									prioritizes the exact track.
								</Text>
								<Text size="2">
									• <b>Apple Music TTML Import:</b> Integrated 1-click
									word-synced and line-synced TTML retrieval directly from Apple
									Music using Spotify track links or song searches, complete
									with artwork and duration matching.
								</Text>
								<Text size="2">
									• <b>Checklist Batch Album Importer:</b> Easily search albums
									on Genius or paste Spotify/Genius album links to import entire
									tracklists into the TTML Checklist with automatic track
									numbering and artwork thumbnails.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.2.4
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 4, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Spotify Link Artist Matching:</b> Resolved an issue where
									pasting Spotify track links could pick an incorrect artist
									with a matching song title; track queries now accurately
									target and verify artist and title together.
								</Text>
								<Text size="2">
									• <b>Album Artwork & Metadata Enrichment:</b> Restored
									high-resolution album covers and metadata across Spotify track
									links, album imports, and Genius searches using CORS-free
									native fetching and resilient fallback resolution.
								</Text>
								<Text size="2">
									• <b>Large Checklist Performance & Virtualization:</b>{" "}
									Eliminated UI lag when opening large TTML checklists by
									implementing virtualized list rendering, $O(N)$ fast
									deduplication, memoized checklist entry cards, and deferred
									search filtering.
								</Text>
								<Text size="2">
									• <b>Album Import Artwork & Fallbacks:</b> Fixed missing album
									cover art when importing full albums and restored full iTunes
									album tracklist recovery.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.2.3
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 4, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Windows Updater In-Place Fix:</b> Pinned Windows release
									bundles to NSIS so updates apply cleanly in-place without
									installer target mismatches, restored the restart application
									button, and enabled Tauri process relaunch permissions.
								</Text>
								<Text size="2">
									• <b>Checklist Tooltip Auto-Focus Fix:</b> Prevented dialog
									auto-focus from prematurely showing the Cloud Download tooltip
									upon opening the TTML Checklist.
								</Text>
								<Text size="2">
									• <b>Apple Music TTML Import & Artwork:</b> Connected album
									artwork directly to project metadata and Discord RPC when
									importing Apple Music TTML tracks.
								</Text>
								<Text size="2">
									• <b>Preferences UI & Badge Polish:</b> Refined Synced and
									Update pill badges, removed duplicate headers and excessive
									top spacing in the About tab, and cleaned up Crowdin
									translation links.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.2.2
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 3, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Windows Multi-Window Support:</b> Added complete
									multi-window support for Windows, matching the frameless,
									translucent, and Mica/Tabbed styling with custom controls and
									centered window placement.
								</Text>
								<Text size="2">
									• <b>Windows Image Loading:</b> Resolved an issue where
									external album art and images were blocked on Windows by
									switching COEP to <code>credentialless</code> and updating
									asset protocol permissions.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.2.1
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 3, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Window Header Alignment:</b> Fixed extra space at the top
									of newly created windows by configuring macOS overlay titlebar
									styling and insets identical to the primary window.
								</Text>
								<Text size="2">
									• <b>Updater Notice:</b> Removed the misleading in-app restart
									button on update completion to prevent webview reloads without
									fully restarting the updated desktop binary.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.2.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 3, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Apple Music TTML Import:</b> Import pre-existing
									word-synced and line-synced TTML files directly using Spotify
									track URLs or IDs, complete with native backend fetching to
									bypass CORS restrictions.
								</Text>
								<Text size="2">
									• <b>Multi-Window Support:</b> Open and edit multiple songs or
									projects simultaneously in independent windows via
									Cmd/Ctrl+Shift+N.
								</Text>
								<Text size="2">
									• <b>TTML Checklist Album Import & Provider Search:</b> Batch
									import entire albums from Spotify/Genius into the checklist,
									with quick one-click lyrics downloads and dedicated Apple TTML
									imports.
								</Text>
								<Text size="2">
									• <b>Fixed Lyrics Search & Checklist Download:</b> Resolved
									query formatting issues and type errors when downloading song
									lyrics directly from checklist entries.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.1.5
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 3, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Preview Mode Ribbon Layout:</b> Stacked V-Sync and Show
									FPS controls vertically into a single unified Render section
									for a cleaner toolbar.
								</Text>
								<Text size="2">
									• <b>Sync Mode Ribbon Layout:</b> Combined Assistant Settings
									and Display Options into a stacked Options section.
								</Text>
								<Text size="2">
									• <b>Native macOS & Web Menu Alignment:</b> Enhanced Tools and
									Help menus across desktop and browser with Start Guide,
									GitHub, What's New, Changelog, About, and Segmentation tools.
								</Text>
								<Text size="2">
									• <b>Community Artwork Uploads:</b> Allowed users to upload
									album covers directly on the website for tracks with missing
									artwork.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.1.4
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 2, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>TTML Checklist Cloud Sync Protection:</b> Prevented data
									wipeout race conditions when logging in from new devices and
									locations; local and cloud lists are now seamlessly merged.
								</Text>
								<Text size="2">
									• <b>Finished Cloud TTML Auto-Import:</b> Automatically scans
									your cloud library on login or sync and integrates any
									finished TTML lyrics directly into your checklist.
								</Text>
								<Text size="2">
									• <b>Checklist Provider Search Truncation:</b> Long song and
									artist names now truncate cleanly with ellipsis in search
									results, keeping the Select button aligned and visible.
								</Text>
								<Text size="2">
									• <b>Website Theme & Mobile Redesign:</b> Removed blue tint
									across the companion website in favor of sleek Apple Music
									dark neutral tones and crimson glows; added a fully responsive
									mobile navigation drawer.
								</Text>
							</Flex>
						</Box>
						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.1.3
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 2, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Opt-In Community Library Publishing:</b> Cloud-saved
									lyrics are now kept private by default. Users can explicitly
									opt in via a toggle to publish finished tracks to the website
									community library.
								</Text>
								<Text size="2">
									• <b>Website Song Deduplication:</b> The community library now
									intelligently deduplicates uploads and showcases only the
									latest version of each song.
								</Text>
								<Text size="2">
									• <b>Spectrogram Web Compatibility:</b> Added automatic
									fallback to the serial WebAssembly renderer on web browsers
									when multithreading / SharedArrayBuffer is unavailable.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.1.2
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 1, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>TTML Checklist Deduplication:</b> Automatically detects
									and merges duplicate songs (supporting typographic apostrophes
									and formatting variations) while preserving completion status
									and cloud links.
								</Text>
								<Text size="2">
									• <b>Action Buttons Spacing & Visibility:</b> Added clean
									spacing between song card action buttons, ensured the delete
									button is always comfortably visible, and added margin
									separation before the New Song button.
								</Text>
								<Text size="2">
									• <b>Timing Tools Polish:</b> Improved spacing on the
									single-row Timing Tools toolbar in sync mode.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.1.1
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 1, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>Mac Media Keys & Touch Bar Audio Sync:</b> Fixed
									duplicate / dual audio playback on macOS and fully integrated
									native MediaSession controls for keyboard media keys and Touch
									Bar playback.
								</Text>
								<Text size="2">
									• <b>Compact & Sleek Toolbars:</b> Removed bottom caption
									labels across all mode toolbars, consolidated Assistant
									Settings and Display Options into spacious popover menus, and
									aligned Timing Tools into a single row.
								</Text>
								<Text size="2">
									• <b>Checklist Action Buttons & Empty State Polish:</b>{" "}
									Converted checklist song row actions to compact icon-only
									symbol buttons with consistent styling and tooltips to prevent
									overflow, and fixed search prompt visibility during lyrics
									import.
								</Text>
								<Text size="2">
									• <b>Segmentation Improvements:</b> Guaranteed interjections
									like
									<code>oh</code>, <code>ooh</code>, <code>ah</code>, and{" "}
									<code>yeah</code>
									are never erroneously split by Quick Segment.
								</Text>
								<Text size="2">
									• <b>TitleBar Layout & Height Fix:</b> Corrected vertical
									alignment and explicit height in WindowControls to prevent
									titlebar clipping on macOS.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.1.0
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								September 1, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>TTML Checklist & Cloud Auto-Sync:</b> Automatic linking
									between uploaded Cloud TTMLs and Checklist songs, auto-marking
									100% completed files, and 1-click Download / Load TTML
									directly from checklist cards.
								</Text>
								<Text size="2">
									• <b>Discord RPC Customization & Checklist Stats:</b> Live
									dynamic RPC preview in settings, customizable idle status with
									rich presets (username, tool name, checklist progress &
									percentage), and avatar image selection.
								</Text>
								<Text size="2">
									• <b>New Global Keyboard Shortcuts:</b> Quick shortcuts added
									for Open from Cloud (<code>Cmd/Ctrl+Shift+O</code>), Save to
									Cloud (<code>Cmd/Ctrl+Shift+S</code>), and TTML Checklist (
									<code>Cmd/Ctrl+Shift+C</code>).
								</Text>
								<Text size="2">
									• <b>Compact & Responsive Workspace:</b> Auto-collapsing
									TitleBar mode tabs, collapsible Cloud user avatar, stacked
									Ribbon Timing Tools and Sync Level buttons to optimize screen
									space on smaller displays.
								</Text>
								<Text size="2">
									• <b>UI & Performance Polish:</b> Single-line ellipsis
									truncation for long song titles in checklist, fixed Timing
									Offset Latency Test translation & keybindings, and window
									initialization safety timeouts.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.0.8
							</Heading>
							<Text as="p" size="2" color="gray" mb="2">
								August 31, 2026
							</Text>
							<Flex direction="column" gap="2">
								<Text size="2">
									• <b>TTML Checklist & Cloud Auto-Sync:</b> When saving or
									uploading a TTML to the cloud, it is automatically linked with
									your TTML Checklist. If the song was not in the checklist, it
									is added automatically.
								</Text>
								<Text size="2">
									• <b>Automatic Completion:</b> Uploaded TTMLs that are 100%
									synchronized and timed are automatically marked as completed
									in the checklist.
								</Text>
								<Text size="2">
									• <b>Checklist Cloud TTML Download Button:</b> Each linked
									checklist song now features a 1-click Download / Load TTML
									button to immediately open the cloud lyric in the editor.
								</Text>
								<Text size="2">
									• <b>Lyrics Import Pre-fill Fixes:</b> Opening lyrics import
									from a checklist item now automatically populates the search
									query and loads provider search results without retyping.
								</Text>
								<Text size="2">
									• <b>Checklist Toolbar & Performance Polish:</b> Modern
									surface styling across all action buttons, native desktop JSON
									export, and deep serialization fixes for Firestore cloud
									synchronization.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.0.7
							</Heading>
							<Flex direction="column" gap="3">
								<Text size="2">
									<strong>Line Merging Tools:</strong> Added right-click context
									menu options to merge any lyric line with the previous line,
									next line, multiple selected lines, or any chosen line in the
									song while preserving all individual word timings, line
									bounds, translations, and flags.
								</Text>
								<Text size="2">
									<strong>TTML Checklist Download & Import:</strong> Added
									1-click JSON export/download and file import to easily back
									up, share, or restore your entire checklist.
								</Text>
								<Text size="2">
									<strong>Continuous Checklist Cloud Sync:</strong> Checklist
									sync now runs automatically in the background across web and
									desktop as soon as you sign in, plus dedicated manual Push &
									Pull buttons.
								</Text>
								<Text size="2">
									<strong>Cloudflare Web App & Firestore Rules:</strong> Fixed
									web loading configuration, build settings, and Firestore
									security rules for user checklist data.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.0.6
							</Heading>
							<Flex direction="column" gap="3">
								<Text size="2">
									<strong>TTML Checklist Sorting & Design:</strong> Added
									sorting by Title (A–Z / Z–A) and Artist (A–Z / Z–A), sleek
									icon filter buttons with glowing active indicator bars, and
									fixed-height form view switching.
								</Text>
								<Text size="2">
									<strong>TTML Checklist Cloud Sync:</strong> The TTML Checklist
									connects in real-time to Firebase Firestore when signed in,
									keeping your songs, notes, and cover art synced across
									devices.
								</Text>
								<Text size="2">
									<strong>Seamless 1-Click Lyrics Fetching:</strong> Checklist
									lyric imports immediately fetch the track's lyrics and
									songwriters without prompting for manual re-search.
								</Text>
								<Text size="2">
									<strong>Unified Cloud Account Preferences:</strong>{" "}
									Streamlined all cloud sync, authentication, statistics, and
									profile management directly into Preferences → Account &
									Cloud.
								</Text>
								<Text size="2">
									<strong>Section Review Detailed Notifications:</strong>{" "}
									Section review toasts now display detailed multi-line issue
									descriptions and exact line numbers.
								</Text>
								<Text size="2">
									<strong>Vocal & Sync Editing Controls:</strong> Added
									dedicated Ignore Main Vocals, Duet Vocal, and Ignore Sync
									controls alongside Remembered Background Vocal export
									settings.
								</Text>
								<Text size="2">
									<strong>Discord Activity Type Selection:</strong> Added an
									Activity Type selector (Listening / Playing) in Discord Rich
									Presence settings, applied consistently across all editor
									states.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.0.5
							</Heading>
							<Flex direction="column" gap="3">
								<Text size="2">
									<strong>
										TTML Checklist Provider Search & 1-Click Import:
									</strong>{" "}
									Search and import songs directly from Genius, LRCLIB, and
									Lyrically inside the checklist, complete with cover art, album
									details, and 1-click lyric importing that skips manual search
									retyping.
								</Text>
								<Text size="2">
									<strong>Checklist on Empty State:</strong> Added a
									quick-access "TTML Checklist" button directly to the editor's
									empty state ("No lyric lines") screen.
								</Text>
								<Text size="2">
									<strong>Audio Engine Resiliency & Sleep Recovery:</strong>{" "}
									Proactively refreshes the audio context after system sleep or
									prolonged inactivity, preventing WebKit CoreAudio dropouts.
								</Text>
								<Text size="2">
									<strong>Companion Website:</strong> Added the official
									companion website featuring app showcases, community finished
									TTML downloads via Firebase, and a dedicated Liquid Player
									hub.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.0.4
							</Heading>
							<Flex direction="column" gap="3">
								<Text size="2">
									<strong>Red Tint for Non-Synced Words & Lines:</strong>{" "}
									Untimed words and lines across Standard, Toxi, and SpicyLyrics
									preview modes and Technical Timing Overview now clearly
									display a subtle red tint and glow to quickly identify
									unsynced parts.
								</Text>
								<Text size="2">
									<strong>
										Upgraded TTML Checklist with Cover Art Support:
									</strong>{" "}
									The TTML Checklist now supports song album cover art previews
									and uploads, 1-click import from the current project's
									metadata & audio, search filtering, and progress tracking.
								</Text>
								<Text size="2">
									<strong>Cleaned App & File Menus:</strong> Moved the TTML
									Checklist to the Tools dropdown menu, added Metadata Editor to
									the File menu, and cleaned up unnecessary system window hooks
									from the App menu.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.0.3
							</Heading>
							<Flex direction="column" gap="3">
								<Text size="2">
									<strong>Smooth Virtual Scrolling in Timing Copy Mode:</strong>{" "}
									Fixed an issue where the editor could not be scrolled when
									"Copy timings to…" was active by wrapping virtual line items
									in unified DOM containers for accurate virtual height
									measurement.
								</Text>
								<Text size="2">
									<strong>Timing Copy Banner & Escape Key Cancel:</strong> Added
									a sticky top status banner when copying line timings with a
									one-click Cancel action, alongside native <code>Esc</code> key
									dismissal.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.0.2
							</Heading>
							<Flex direction="column" gap="3">
								<Text size="2">
									<strong>Dedicated Sync Progress Toolbar Widget:</strong> Added
									an integrated synchronization progress widget directly in the
									main ribbon bar featuring an animated SVG circular progress
									wheel, line sync counter (
									<code>timedLines / totalLines Lines</code>), and word count (
									<code>timedWords / totalWords Words</code>).
								</Text>
								<Text size="2">
									<strong>Discord Rich Presence Status Controls:</strong> Added
									support for switching between <code>Playing</code>{" "}
									(interactive repository button enabled) and{" "}
									<code>Listening</code> activity status types.
								</Text>
								<Text size="2">
									<strong>Performance & Stability Fixes:</strong> Optimized
									component rendering, corrected toolbar import bindings, and
									streamlined RPC activity dispatching.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.0.1
							</Heading>
							<Flex direction="column" gap="3">
								<Text size="2">
									<strong>Dedicated Preview Panel Button:</strong> Added an
									easily accessible Preview Panel toggle button directly on the
									right side of the top toolbar for one-click access on both
									desktop and web.
								</Text>
								<Text size="2">
									<strong>New Line Timing Tools:</strong> Added quick-action
									timing tools to Copy line/word timings, Paste timings onto
									selected target lines with proportional word preservation, and
									Snap timings directly to the current audio playhead.
								</Text>
								<Text size="2">
									<strong>Advanced Timing Adjustment:</strong> Moved time and
									commit offset controls into the Advanced options panel for a
									cleaner, streamlined synchronization toolbar.
								</Text>
								<Text size="2">
									<strong>Toolbar Layout & Smooth Scrolling:</strong> Resolved
									container clipping to ensure bottom section labels are never
									cut off, and enhanced native trackpad horizontal scrolling
									with responsive resizing when the preview panel is opened.
								</Text>
								<Text size="2">
									<strong>Streamlined Preview Engines:</strong> Cleaned up
									preview mode options to focus on high-fidelity Standard, Toxi,
									SpicyLyrics, and Timing Overview engines.
								</Text>
								<Text size="2">
									<strong>Dynamic Sync Progress Wheel:</strong> Restored the
									real-time animated circular progress ring in the header status
									badge.
								</Text>
							</Flex>
						</Box>

						<Box>
							<Heading size="4" mb="2" color="indigo">
								v1.0.0
							</Heading>
							<Flex direction="column" gap="3">
								<Text size="2">
									<strong>Cloud Account & Cross-Device Sync:</strong> Integrated
									Firebase Cloud accounts with secure Sign In, Sign Up, and
									multi-provider authentication (Google, GitHub, Apple) to
									seamlessly back up, sync, and access TTML lyrics across all
									your devices.
								</Text>
								<Text size="2">
									<strong>Cloud Project Storage Library:</strong> Save, load,
									and manage full TTML projects to your personal cloud library
									with instant metadata tracking, auto-syncing, and cloud lyric
									management.
								</Text>
								<Text size="2">
									<strong>User Profiles & Custom Avatars:</strong> Upload custom
									avatars (PNG, JPG, GIF, WebP) directly from your device or
									link image URLs, with automatic cloud hosting and profile
									customization.
								</Text>
								<Text size="2">
									<strong>Discord Rich Presence 2.0:</strong> Rich status lines
									with project, editor, playback, and timing variables; dynamic
									raw image tab badges (Edit, Sync, Preview); and custom profile
									avatar display on Discord RPC.
								</Text>
								<Text size="2">
									<strong>Spicy Lyrics Preview Mode:</strong> High-fidelity
									Apple Music-style lyric renderer featuring dynamic mesh
									gradients, smooth scrolling, interlude countdown dots,
									CJK/romanized word wrapping, duet/RTL awareness, custom
									backgrounds, and customizable frame rate / V-Sync.
								</Text>
								<Text size="2">
									<strong>Advanced Appearance & Theming System:</strong> Deep
									Intonated Black dark theme, custom gradient designer
									(linear/radial/conic), 40+ granular customization tokens
									(waveform colors, chips, titlebar, dialogs, borders, shadows,
									backdrop blur), Google Fonts gallery (300+ fonts), and custom
									local font (.ttf/.otf/.woff) imports.
								</Text>
								<Text size="2">
									<strong>Sample-Accurate Native Audio Engine:</strong>{" "}
									High-precision Web Audio clock playback via
									AudioBufferSourceNode, eliminating WebKit seek latency and
									desynchronization on macOS and desktop, with automated
									sleep/wake context recovery and audio device change handling.
								</Text>
								<Text size="2">
									<strong>Interactive Beginner Onboarding Guide:</strong>{" "}
									Step-by-step interactive first-run tutorial teaching lyric
									review, audio import, synchronization, metadata, and testing,
									with movable and tuckable edge docking.
								</Text>
								<Text size="2">
									<strong>Unified Multi-Source Lyrics Importer:</strong> Unified
									import hub supporting Plain Text, LRCLIB, Lyrically
									(lyrics.ovh), and Genius with CORS-safe proxying, automated
									bracket/section filtering, and album art loading.
								</Text>
								<Text size="2">
									<strong>Genius Section Navigator & Tools:</strong> Full
									bracketed section support ([Chorus], [Verse], etc.) with
									repeat detection, color-coded categorization, section merging,
									and repeat-section timing copy.
								</Text>
								<Text size="2">
									<strong>Intelligent Syllabification & Segmentation:</strong>{" "}
									Multi-language syllable splitting engines (English, Spanish,
									French, Polish, Russian, Japanese, CJK), customizable
									Auto-Segment keybinding, and learned word splitting rules.
								</Text>
								<Text size="2">
									<strong>Comprehensive Romanization Suite:</strong>{" "}
									Auto-generated Romaji (JA), Pinyin (ZH), Jyutping (YUE), and
									Romaji (KO) with capsule-aware syllable distribution and batch
									romanization replacement.
								</Text>
								<Text size="2">
									<strong>High-Precision Timing & Spectrogram Tools:</strong>{" "}
									Drag-and-drop waveform alignment, interactive time-shift
									toolbar with playhead snap, scoped time stretch tool,
									millisecond interpolation, and pre-export sync health
									validation.
								</Text>
								<Text size="2">
									<strong>Integrated Audio Tools & Format Converter:</strong>{" "}
									Built-in 10-band custom audio equalizer with presets,
									FFmpeg.wasm MP3-to-FLAC converter to eliminate decoding drift,
									and audio pitch preservation toggle.
								</Text>
								<Text size="2">
									<strong>Native Desktop Integration:</strong> Full native macOS
									application menu bar with standard shortcuts, native file
									open/save dialogs, remembered window state/geometry, and
									multi-platform packages (macOS .dmg/.app, Windows .msi/.exe,
									Linux Arch PKGBUILD and AppImage).
								</Text>
								<Text size="2">
									<strong>Community WASM Plugin System:</strong> Secure,
									extensible plugin architecture for custom importers and
									exporters with SHA-256 integrity verification.
								</Text>
								<Text size="2">
									<strong>Workflow & Editing Polish:</strong> Shift-click fast
									word combination, non-blocking asynchronous undo/redo stack,
									compact space chips, inline time-tab double click editing, and
									TTML sync checklist.
								</Text>
							</Flex>
						</Box>
					</Flex>
				</ScrollArea>
			</Dialog.Content>
		</Dialog.Root>
	);
}
