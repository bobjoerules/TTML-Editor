import { ImportAppleTtmlDialog } from "$/modules/apple-ttml/modals/ImportAppleTtmlDialog.tsx";
import { LatencyTestDialog } from "$/modules/audio/modals/LatencyTest.tsx";
import { CloudFileManagerModal } from "$/modules/cloud/modals/CloudFileManagerModal.tsx";
import { DownloaderDialog } from "$/modules/downloader/DownloaderDialog.tsx";
import { GeniusImportLyricsDialog } from "$/modules/genius/modals/GeniusImportLyricsDialog.tsx";
import { GeniusSearchDialog } from "$/modules/genius/modals/GeniusSearchDialog.tsx";
import { ImportFromLRCLIB } from "$/modules/lrclib/modals/ImportDialog.tsx";
import { GrammarCheckDialog } from "$/modules/lyric-editor/modals/GrammarCheckDialog.tsx";
import { UrbanDictionaryDialog } from "$/modules/lyric-editor/modals/UrbanDictionaryDialog.tsx";
import { CombineWordsDialog } from "$/modules/lyric-editor/tools/CombineWordsDialog.tsx";
import { FindReplaceBar } from "$/modules/lyric-editor/tools/FindReplaceBar.tsx";
import { ReplaceRomanizationDialog } from "$/modules/lyric-editor/tools/ReplaceRomanizationDialog.tsx";
import { ReplaceWordDialog } from "$/modules/lyric-editor/tools/ReplaceWordDialog.tsx";
import { TimeShiftDialog } from "$/modules/lyric-editor/tools/TimeShift.tsx";
import { TimeStretchDialog } from "$/modules/lyric-editor/tools/TimeStretch.tsx";
import { ImportLyricsDialog } from "$/modules/lyrics-import/modals/ImportLyricsDialog.tsx";
import { JooxAudioSearchDialog } from "$/modules/joox/modals/JooxAudioSearchDialog.tsx";
import { JooxImportLyricsDialog } from "$/modules/joox/modals/JooxImportLyricsDialog.tsx";
import { HistoryRestoreDialog } from "$/modules/project/modals/HistoryRestore.tsx";
import { ImportFromText } from "$/modules/project/modals/ImportFromText.tsx";
import { MetadataEditor } from "$/modules/project/modals/MetadataEditor.tsx";
import { AdvancedSegmentationDialog } from "$/modules/segmentation/components/AdvancedSegmentation.tsx";
import { AutoSegmentDialog } from "$/modules/segmentation/components/AutoSegmentDialog.tsx";
import { LearnedSplitsDialog } from "$/modules/segmentation/components/LearnedSplits.tsx";
import { SuggestedSplitsDialog } from "$/modules/segmentation/components/SuggestedSplits.tsx";
import { SplitWordDialog } from "$/modules/segmentation/components/split-word.tsx";
import { FontSelectionDialog } from "$/modules/settings/modals/FontSelectionDialog.tsx";
import { SettingsDialog } from "$/modules/settings/modals/index.tsx";
import { SpotMatchDialog } from "$/modules/spotmatch/SpotMatchDialog.tsx";
import { TTMLChecklistDialog } from "$/modules/ttml-checklist/TTMLChecklistDialog.tsx";
import { ChangelogDialog } from "./changelog.tsx";
import { ConfirmationDialog } from "./confirmation.tsx";
import {
	ExperimentalFeaturesDialog,
	GeniusHeaderDetectionDialog,
} from "./experimental-features.tsx";
import { ImportLyricsChooserDialog } from "./import-lyrics-chooser.tsx";
import { Mp3ConversionDialog } from "./mp3-conversion.tsx";
import { WhatsNewDialog } from "./whats-new.tsx";

export const Dialogs = () => {
	return (
		<>
			<ImportLyricsChooserDialog />
			<ImportFromText />
			<ImportFromLRCLIB />
			<ImportLyricsDialog />
			<JooxImportLyricsDialog />
			<JooxAudioSearchDialog />
			<DownloaderDialog />
			<ImportAppleTtmlDialog />
			<MetadataEditor />
			<SettingsDialog />
			<SplitWordDialog />
			<CombineWordsDialog />
			<ReplaceWordDialog />
			<ReplaceRomanizationDialog />
			<FindReplaceBar />
			<LatencyTestDialog />
			<TTMLChecklistDialog />
			<SpotMatchDialog />
			<ConfirmationDialog />
			<Mp3ConversionDialog />
			<HistoryRestoreDialog />
			<AdvancedSegmentationDialog />
			<AutoSegmentDialog />
			<LearnedSplitsDialog />
			<TimeShiftDialog />
			<TimeStretchDialog />
			<GrammarCheckDialog />
			<CloudFileManagerModal />

			<GeniusSearchDialog />
			<GeniusImportLyricsDialog />
			<ChangelogDialog />
			<WhatsNewDialog />
			<FontSelectionDialog />
			<UrbanDictionaryDialog />
			<SuggestedSplitsDialog />
			<ExperimentalFeaturesDialog />
			<GeniusHeaderDetectionDialog />
		</>
	);
};

export default Dialogs;
