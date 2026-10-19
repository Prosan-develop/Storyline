export interface SrtCue {
  id: number;
  startTime: string; // "00:00:01,200"
  endTime: string;   // "00:00:04,500"
  startMs: number;
  endMs: number;
  speaker?: 'male' | 'female' | 'narrator' | 'other';
  speakerLabel?: string; // e.g. "ប្រុស (តួឯក)" or "[Man]"
  text: string;
  translatedText?: string;
  audioUrl?: string;
  isSynthesizing?: boolean;
}

export type StudioTab =
  | 'recap'
  | 'srt-editor'
  | 'batch-translator'
  | 'srt-dubbing'
  | 'vocal-remover'
  | 'transcribe'
  | 'video-burner'
  | 'ocr-translate';

export interface RecapScene {
  sceneNumber: number;
  timeCode: string;
  visualDescription: string;
  narration: string;
  characterVoices?: Array<{
    speaker: string;
    text: string;
  }>;
}

export interface StoryRecapResult {
  title: string;
  hookIntro: string;
  synopsis: string;
  fullNarration: string;
  scenes: RecapScene[];
  srtSubtitles?: string;
}

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  textOutlineColor: string;
  textOutlineWidth: number;
  backgroundColor: string;
  backgroundOpacity: number;
  position: 'bottom' | 'center' | 'top';
  bottomMarginPercent: number;
  bold: boolean;
}

export interface OcrTextBlock {
  id: number;
  originalText: string;
  translatedText: string;
  region: string;
  speakerOrRole?: string;
  confidence?: string;
}

export interface OcrResult {
  detectedLanguage: string;
  fullOriginalText: string;
  fullTranslatedText: string;
  blocks: OcrTextBlock[];
}

export interface TranslationHistoryItem {
  id: string;
  timestamp: number;
  formattedDate: string;
  title: string;
  targetLanguage: string;
  sourceLanguage?: string;
  mode: 'replace' | 'dual';
  cueCount: number;
  originalSrt: string;
  translatedSrt: string;
  firstCueSnippet?: string;
}

