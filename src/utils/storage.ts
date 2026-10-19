import { SrtCue, StoryRecapResult, SubtitleStyle, TranslationHistoryItem } from '../types';

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: "'Kantumruy Pro', sans-serif",
  fontSize: 22,
  textColor: '#ffffff',
  textOutlineColor: '#000000',
  textOutlineWidth: 2,
  backgroundColor: '#000000',
  backgroundOpacity: 0.65,
  position: 'bottom',
  bottomMarginPercent: 8,
  bold: true,
};

export const SAMPLE_RECAP_PROMPT_KHMER = `រឿងព្រេងបុរាណខ្មែរ៖ "ក្អែកនិងកញ្ជ្រោង" ឬដំណើរផ្សងព្រេងរបស់យុវជនម្នាក់ឈ្មោះ សុខា ដែលបានរកឃើញវិបផតថលអាថ៌កំបាំងមួយនៅប្រាសាទបុរាណ នាំឱ្យគាត់ជួបជាមួយអ្នកការពារអាណាចក្របុរាណ។ ពួកគេត្រូវរួមគ្នាសង្គ្រោះពិភពលោកពីការរលាយបាត់។`;

export const SAMPLE_SRT_KHMER = `1
00:00:01,000 --> 00:00:04,500
[អ្នកសម្រាយ]: នៅក្នុងរាត្រីដ៏ស្ងប់ស្ងាត់មួយ នៅចំកណ្តាលព្រៃភ្នំព្រះវិហារ

2
00:00:05,000 --> 00:00:08,200
[ប្រុស]: តើឯងឃើញពន្លឺចម្លែកនោះទេ? វាហាក់ដូចជាកំពុងហៅយើង!

3
00:00:08,800 --> 00:00:12,600
[ស្រី]: កុំទៅជិតវាអី! រឿងព្រេងបុរាណបានប្រាប់ថា អ្នកដែលឈានជើងចូលទីនោះ គ្មានថ្ងៃបានវិលត្រឡប់ឡើយ

4
00:00:13,000 --> 00:00:17,400
[អ្នកសម្រាយ]: ប៉ុន្តែការសម្រេចចិត្តដ៏ក្លាហានរបស់យុវជន បានផ្លាស់ប្តូរជោគវាសនានៃអាណាចក្រទាំងមូល!`;

export const SAMPLE_STORY_RESULT: StoryRecapResult = {
  title: "អាថ៌កំបាំងវិបផតថលប្រាសាទបុរាណ | The Lost Temple Portal",
  hookIntro: "ដូចដែលប្រិយមិត្តដឹងស្រាប់ហើយថា នៅលើផែនដីនេះមានរឿងអាថ៌កំបាំងជាច្រើនដែលវិទ្យាសាស្ត្រនៅតែមិនទាន់អាចបកស្រាយបាន។ ប៉ុន្តែតើអ្នកជឿទេថា នៅក្រោមប្រាសាទបុរាណខ្មែរ មានទ្វារឆ្លងភពមួយដែលបានលាក់ខ្លួនជាងមួយពាន់ឆ្នាំមកហើយ?",
  synopsis: "សុខា យុវជនស្រាវជ្រាវបុរាណវិទ្យា បានរកឃើញសិលាចារឹកសម្ងាត់ដែលនាំទៅរកវិបផតថលបុរាណ។ រួមជាមួយ ទេវី នារីអាថ៌កំបាំងមកពីពិភពស្របគ្នា ពួកគេត្រូវប្រឈមមុខនឹងសត្រូវដើម្បីការពារតុល្យភាពនៃចក្រវាល។",
  fullNarration: `[អ្នកសម្រាយ]: ដំណើររឿងបានចាប់ផ្តើមនៅពេលដែល សុខា បានប្រទះឃើញពន្លឺពណ៌ផ្ទៃមេឃចាំងចេញពីក្រោមថ្មប្រាសាទ។\n[ប្រុស]: តើឯងឃើញពន្លឺចម្លែកនោះទេ? វាហាក់ដូចជាកំពុងហៅយើង!\n[ស្រី]: កុំទៅជិតវាអី! រឿងព្រេងបុរាណបានប្រាប់ថា អ្នកដែលឈានជើងចូលទីនោះ គ្មានថ្ងៃបានវិលត្រឡប់ឡើយ!\n[អ្នកសម្រាយ]: ទោះបីជាមានការព្រមានយ៉ាងណាក្តី សុខាមិនអាចទប់ការចង់ដឹងបានឡើយ។ នៅពេលដៃរបស់គាត់បានប៉ះលើផ្ទៃថ្ម ពន្លឺដ៏អស្ចារ្យក៏បានលេបត្របាក់ពួកគេទាំងពីរចូលទៅកាន់វិមាត្រថ្មីមួយ...`,
  scenes: [
    {
      sceneNumber: 1,
      timeCode: "00:00:00 - 00:00:10",
      visualDescription: "ទេសភាពព្រៃបុរាណពេលរាត្រី ពន្លឺពណ៌ខៀវស្រាលចាំងចេញពីប្រាសាទបាក់បែក",
      narration: "នៅក្នុងរាត្រីដ៏ស្ងប់ស្ងាត់មួយ នៅចំកណ្តាលព្រៃភ្នំព្រះវិហារ",
      characterVoices: [
        { speaker: "អ្នកសម្រាយ", text: "នៅក្នុងរាត្រីដ៏ស្ងប់ស្ងាត់មួយ នៅចំកណ្តាលព្រៃភ្នំព្រះវិហារ" }
      ]
    },
    {
      sceneNumber: 2,
      timeCode: "00:00:10 - 00:00:22",
      visualDescription: "យុវជនសុខាចង្អុលទៅកាន់វិបផតថលពន្លឺ",
      narration: "សុខាបានប្រទះឃើញសញ្ញាអាថ៌កំបាំងដែលមិនធ្លាប់មានក្នុងប្រវត្តិសាស្ត្រ",
      characterVoices: [
        { speaker: "ប្រុស (សុខា)", text: "តើឯងឃើញពន្លឺចម្លែកនោះទេ? វាហាក់ដូចជាកំពុងហៅយើង!" },
        { speaker: "ស្រី (ទេវី)", text: "កុំទៅជិតវាអី! រឿងព្រេងបុរាណបានប្រាប់ថា អ្នកដែលឈានជើងចូលទីនោះ គ្មានថ្ងៃបានវិលត្រឡប់ឡើយ" }
      ]
    },
    {
      sceneNumber: 3,
      timeCode: "00:00:22 - 00:00:35",
      visualDescription: "វិបផតថលបើកចំហ បង្ហាញពិភពអនាគតដ៏អស្ចារ្យ",
      narration: "ប៉ុន្តែការសម្រេចចិត្តដ៏ក្លាហានរបស់យុវជន បានផ្លាស់ប្តូរជោគវាសនានៃអាណាចក្រទាំងមូល!",
      characterVoices: [
        { speaker: "អ្នកសម្រាយ", text: "ប៉ុន្តែការសម្រេចចិត្តដ៏ក្លាហានរបស់យុវជន បានផ្លាស់ប្តូរជោគវាសនានៃអាណាចក្រទាំងមូល!" }
      ]
    }
  ],
  srtSubtitles: SAMPLE_SRT_KHMER,
};

const STORAGE_KEY_SRT = 'kromarecap_saved_srt';
const STORAGE_KEY_RECAP = 'kromarecap_saved_recap';
const STORAGE_KEY_STYLE = 'kromarecap_sub_style';
const STORAGE_KEY_LANG = 'kromarecap_app_lang';

export function saveLocalSrt(srtText: string) {
  try {
    localStorage.setItem(STORAGE_KEY_SRT, srtText);
  } catch (e) {
    console.warn('Storage save error:', e);
  }
}

export function loadLocalSrt(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_SRT);
  } catch {
    return null;
  }
}

export function saveLocalRecap(recap: StoryRecapResult) {
  try {
    localStorage.setItem(STORAGE_KEY_RECAP, JSON.stringify(recap));
  } catch (e) {
    console.warn('Storage save error:', e);
  }
}

export function loadLocalRecap(): StoryRecapResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECAP);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSubtitleStyle(style: SubtitleStyle) {
  try {
    localStorage.setItem(STORAGE_KEY_STYLE, JSON.stringify(style));
  } catch (e) {
    console.warn('Storage save error:', e);
  }
}

export function loadSubtitleStyle(): SubtitleStyle {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STYLE);
    return raw ? { ...DEFAULT_SUBTITLE_STYLE, ...JSON.parse(raw) } : DEFAULT_SUBTITLE_STYLE;
  } catch {
    return DEFAULT_SUBTITLE_STYLE;
  }
}

export function saveAppLanguage(lang: 'km' | 'en') {
  try {
    localStorage.setItem(STORAGE_KEY_LANG, lang);
  } catch (e) {
    console.warn('Storage save error:', e);
  }
}

export function loadAppLanguage(): 'km' | 'en' {
  try {
    const val = localStorage.getItem(STORAGE_KEY_LANG);
    return val === 'en' ? 'en' : 'km';
  } catch {
    return 'km';
  }
}

const STORAGE_KEY_HISTORY = 'kromarecap_translation_history';
const MAX_HISTORY_ITEMS = 10;

export function loadTranslationHistory(): TranslationHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to load translation history:', e);
    return [];
  }
}

export function saveTranslationToHistory(item: {
  title: string;
  targetLanguage: string;
  sourceLanguage?: string;
  mode: 'replace' | 'dual';
  cueCount: number;
  originalSrt: string;
  translatedSrt: string;
  firstCueSnippet?: string;
}): TranslationHistoryItem[] {
  try {
    const existing = loadTranslationHistory();
    const now = new Date();

    const newItem: TranslationHistoryItem = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      formattedDate: now.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      title: item.title || 'Untitled Subtitle',
      targetLanguage: item.targetLanguage,
      sourceLanguage: item.sourceLanguage || 'Auto',
      mode: item.mode,
      cueCount: item.cueCount,
      originalSrt: item.originalSrt,
      translatedSrt: item.translatedSrt,
      firstCueSnippet: item.firstCueSnippet || item.translatedSrt.slice(0, 100),
    };

    // Prepend and cap at MAX_HISTORY_ITEMS (10 items)
    const updated = [newItem, ...existing].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save translation history item:', e);
    return [];
  }
}

export function deleteTranslationHistoryItem(id: string): TranslationHistoryItem[] {
  try {
    const existing = loadTranslationHistory();
    const updated = existing.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to delete history item:', e);
    return [];
  }
}

export function clearTranslationHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  } catch (e) {
    console.warn('Failed to clear translation history:', e);
  }
}

