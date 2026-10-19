import React, { useState, useId } from 'react';
import { SrtCue } from '../types';
import {
  parseSrt,
  stringifySrt,
  shiftSrtTimes,
  msToSrtTime,
  srtTimeToMs,
} from '../utils/srtParser';
import { translateSrtApi, speakWebSpeech } from '../services/geminiService';
import { saveLocalSrt, SAMPLE_SRT_KHMER, saveTranslationToHistory } from '../utils/storage';
import {
  FileText,
  Upload,
  Download,
  Languages,
  Plus,
  Trash2,
  Clock,
  Search,
  Replace,
  Play,
  Volume2,
  Sparkles,
  ArrowRight,
  Split,
  Merge,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  FileCode,
  History,
} from 'lucide-react';

interface SrtEditorProps {
  appLang: 'km' | 'en';
  cues: SrtCue[];
  onUpdateCues: (newCues: SrtCue[]) => void;
  onSendToDubbing: (srtText: string) => void;
  onSendToVideoBurner: (cues: SrtCue[]) => void;
  onOpenHistory?: () => void;
}

export const SrtEditor: React.FC<SrtEditorProps> = ({
  appLang,
  cues,
  onUpdateCues,
  onSendToDubbing,
  onSendToVideoBurner,
  onOpenHistory,
}) => {
  const isKhmer = appLang === 'km';
  const fileInputId = useId();

  const [viewMode, setViewMode] = useState<'cards' | 'raw'>('cards');
  const [rawText, setRawText] = useState(stringifySrt(cues));
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [timeOffsetMs, setTimeOffsetMs] = useState<number>(500);

  // Translation states
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState('km');
  const [translateMode, setTranslateMode] = useState<'replace' | 'dual'>('replace');
  const [transError, setTransError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [auditioningId, setAuditioningId] = useState<number | null>(null);

  // Sync raw text when switching to raw view
  const handleSwitchToRaw = () => {
    setRawText(stringifySrt(cues));
    setViewMode('raw');
  };

  const handleSwitchToCards = () => {
    const parsed = parseSrt(rawText);
    onUpdateCues(parsed);
    saveLocalSrt(rawText);
    setViewMode('cards');
  };

  // Upload SRT file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseSrt(content);
      onUpdateCues(parsed);
      setRawText(content);
      saveLocalSrt(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Load Khmer sample
  const handleLoadSample = () => {
    const parsed = parseSrt(SAMPLE_SRT_KHMER);
    onUpdateCues(parsed);
    setRawText(SAMPLE_SRT_KHMER);
    saveLocalSrt(SAMPLE_SRT_KHMER);
  };

  // Update a single cue
  const updateCue = (id: number, partial: Partial<SrtCue>) => {
    const updated = cues.map((c) => {
      if (c.id === id) {
        const next = { ...c, ...partial };
        if (partial.startTime) next.startMs = srtTimeToMs(partial.startTime);
        if (partial.endTime) next.endMs = srtTimeToMs(partial.endTime);
        return next;
      }
      return c;
    });
    onUpdateCues(updated);
    saveLocalSrt(stringifySrt(updated));
  };

  // Add new cue
  const handleAddCue = (afterIndex?: number) => {
    let newStart = 0;
    let newEnd = 3000;

    if (cues.length > 0) {
      const last = afterIndex !== undefined ? cues[afterIndex] : cues[cues.length - 1];
      newStart = last.endMs + 300;
      newEnd = newStart + 3000;
    }

    const newCue: SrtCue = {
      id: Date.now(),
      startTime: msToSrtTime(newStart),
      endTime: msToSrtTime(newEnd),
      startMs: newStart,
      endMs: newEnd,
      speaker: 'narrator',
      speakerLabel: 'អ្នកសម្រាយ',
      text: isKhmer ? '[អ្នកសម្រាយ]: អត្ថបទ Subtitle ថ្មី...' : '[Narrator]: New subtitle line...',
    };

    let nextCues: SrtCue[];
    if (afterIndex !== undefined) {
      nextCues = [...cues.slice(0, afterIndex + 1), newCue, ...cues.slice(afterIndex + 1)];
    } else {
      nextCues = [...cues, newCue];
    }

    // Re-index
    nextCues = nextCues.map((c, i) => ({ ...c, id: i + 1 }));
    onUpdateCues(nextCues);
    saveLocalSrt(stringifySrt(nextCues));
  };

  // Delete cue
  const handleDeleteCue = (id: number) => {
    const filtered = cues.filter((c) => c.id !== id).map((c, i) => ({ ...c, id: i + 1 }));
    onUpdateCues(filtered);
    saveLocalSrt(stringifySrt(filtered));
  };

  // Split cue in half
  const handleSplitCue = (index: number) => {
    const target = cues[index];
    const duration = target.endMs - target.startMs;
    const midMs = target.startMs + Math.floor(duration / 2);

    const words = target.text.split(' ');
    const halfLen = Math.ceil(words.length / 2);
    const text1 = words.slice(0, halfLen).join(' ');
    const text2 = words.slice(halfLen).join(' ') || text1;

    const cue1: SrtCue = {
      ...target,
      endTime: msToSrtTime(midMs),
      endMs: midMs,
      text: text1,
    };

    const cue2: SrtCue = {
      id: target.id + 0.5,
      startTime: msToSrtTime(midMs + 50),
      endTime: target.endTime,
      startMs: midMs + 50,
      endMs: target.endMs,
      speaker: target.speaker,
      speakerLabel: target.speakerLabel,
      text: text2,
    };

    const nextCues = [...cues.slice(0, index), cue1, cue2, ...cues.slice(index + 1)].map(
      (c, i) => ({ ...c, id: i + 1 })
    );

    onUpdateCues(nextCues);
    saveLocalSrt(stringifySrt(nextCues));
  };

  // Merge with next cue
  const handleMergeNext = (index: number) => {
    if (index >= cues.length - 1) return;
    const curr = cues[index];
    const next = cues[index + 1];

    const mergedCue: SrtCue = {
      ...curr,
      endTime: next.endTime,
      endMs: next.endMs,
      text: `${curr.text} ${next.text}`,
    };

    const nextCues = [...cues.slice(0, index), mergedCue, ...cues.slice(index + 2)].map(
      (c, i) => ({ ...c, id: i + 1 })
    );

    onUpdateCues(nextCues);
    saveLocalSrt(stringifySrt(nextCues));
  };

  // Time shift
  const handleShiftTime = (delta: number) => {
    const shifted = shiftSrtTimes(cues, delta);
    onUpdateCues(shifted);
    saveLocalSrt(stringifySrt(shifted));
  };

  // Search & Replace
  const handleReplace = () => {
    if (!searchQuery) return;
    const regex = new RegExp(searchQuery, 'gi');
    const updated = cues.map((c) => ({
      ...c,
      text: c.text.replace(regex, replaceQuery),
    }));
    onUpdateCues(updated);
    saveLocalSrt(stringifySrt(updated));
  };

  // Quick Audition via Web Speech
  const handleAudition = (cue: SrtCue) => {
    setAuditioningId(cue.id);
    const cleanText = cue.text.replace(/^\[[^\]]+\]:?\s*/, '');
    const isFemale = cue.speaker === 'female';
    speakWebSpeech(cleanText, {
      lang: isKhmer ? 'km-KH' : 'en-US',
      pitch: isFemale ? 1.2 : 0.9,
      rate: 1.0,
      gender: isFemale ? 'female' : 'male',
    }).finally(() => {
      setAuditioningId(null);
    });
  };

  // AI Subtitle Translate
  const handleTranslate = async () => {
    const currentSrt = stringifySrt(cues);
    if (!currentSrt.trim()) return;

    setIsTranslating(true);
    setTransError(null);

    try {
      const translated = await translateSrtApi({
        srtContent: currentSrt,
        targetLang,
        mode: translateMode,
      });

      const parsed = parseSrt(translated);
      onUpdateCues(parsed);
      setRawText(translated);
      saveLocalSrt(translated);

      // Save to last 10 translation history
      saveTranslationToHistory({
        title: cues.length > 0 ? (cues[0].text.replace(/^\[[^\]]+\]:?\s*/, '').slice(0, 35) || 'Subtitle Translation') : 'Subtitle Translation',
        targetLanguage: targetLang,
        mode: translateMode,
        cueCount: parsed.length,
        originalSrt: currentSrt,
        translatedSrt: translated,
        firstCueSnippet: parsed[0]?.text || '',
      });
    } catch (err: any) {
      console.error(err);
      setTransError(err.message || 'Failed to translate SRT');
    } finally {
      setIsTranslating(false);
    }
  };

  // Download File
  const handleDownload = (format: 'srt' | 'vtt' | 'txt') => {
    let content = '';
    let filename = `subtitles_${Date.now()}.${format}`;
    let mime = 'text/plain';

    if (format === 'srt') {
      content = stringifySrt(cues);
    } else if (format === 'vtt') {
      content = `WEBVTT\n\n` + stringifySrt(cues).replace(/,/g, '.');
      mime = 'text/vtt';
    } else {
      content = cues.map((c) => c.text).join('\n');
    }

    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySrt = () => {
    navigator.clipboard.writeText(stringifySrt(cues));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner and Toolbar */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
              <FileText className="w-4 h-4" />
              <span>{isKhmer ? 'ស្ទូឌីយោកែប្រែ & បកប្រែឯកសារ SRT' : 'SRT Subtitle Studio'}</span>
            </div>
            <h1 className="text-xl font-bold text-white">
              {isKhmer ? 'គ្រប់គ្រង បកប្រែ និងកំណត់ម៉ោង Subtitles' : 'Edit, Translate & Time Subtitles'}
            </h1>
            <p className="text-xs text-slate-400">
              {isKhmer
                ? `មានសរុប ${cues.length} Cues | គាំទ្រការបែងចែកសំឡេងប្រុសស្រី និងការបកប្រែគ្រប់ភាសា`
                : `${cues.length} Total Cues | Supports male/female speaker tagging and multi-language AI translation`}
            </p>
          </div>

          {/* Quick Actions: Icon-only on phone screens, text + icon on desktop */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <input
              type="file"
              accept=".srt,.vtt,.txt"
              id={fileInputId}
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor={fileInputId}
              title={isKhmer ? 'ផ្ទុកឯកសារ SRT' : 'Upload SRT'}
              aria-label="Upload SRT"
              className="flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 cursor-pointer transition"
            >
              <Upload className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ផ្ទុកឯកសារ SRT' : 'Upload SRT'}</span>
            </label>

            <button
              onClick={handleLoadSample}
              title={isKhmer ? 'គំរូសាកល្បង' : 'Load Sample'}
              aria-label="Load Sample"
              className="flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'គំរូសាកល្បង' : 'Load Sample'}</span>
            </button>

            {onOpenHistory && (
              <button
                onClick={onOpenHistory}
                title={isKhmer ? 'មើលប្រវត្តិបកប្រែទាំង ១០' : 'View Translation History'}
                aria-label="Translation History"
                className="flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-purple-950/50 hover:bg-purple-900/60 text-xs text-purple-200 border border-purple-700/40 transition cursor-pointer"
              >
                <History className="w-4 h-4 text-purple-400 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ប្រវត្តិបកប្រែ' : 'History'}</span>
              </button>
            )}

            <button
              onClick={handleCopySrt}
              title={isKhmer ? 'ចម្លង SRT' : 'Copy SRT'}
              aria-label="Copy SRT"
              className="flex items-center space-x-1 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400 sm:w-3.5 sm:h-3.5 shrink-0" /> : <Copy className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />}
              <span className="phone-hide-label hidden sm:inline">{copied ? (isKhmer ? 'បានចម្លង!' : 'Copied!') : (isKhmer ? 'ចម្លង SRT' : 'Copy')}</span>
            </button>

            {/* Export dropdown / buttons */}
            <button
              onClick={() => handleDownload('srt')}
              title={isKhmer ? 'ទាញយក .SRT' : 'Export .SRT'}
              aria-label="Export .SRT"
              className="flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ទាញយក .SRT' : 'Export .SRT'}</span>
            </button>

            <button
              onClick={() => onSendToDubbing(stringifySrt(cues))}
              title={isKhmer ? 'Voiceover Studio' : 'Voice Dubbing'}
              aria-label="Voice Dubbing"
              className="flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition cursor-pointer"
            >
              <Volume2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'Voiceover Studio' : 'Voice Dubbing'}</span>
            </button>

            <button
              onClick={() => onSendToVideoBurner(cues)}
              title={isKhmer ? 'ដាក់ក្នុងវីដេអូ' : 'Burn to Video'}
              aria-label="Burn to Video"
              className="flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ដាក់ក្នុងវីដេអូ' : 'Burn to Video'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Panel: AI Translation & Search/Replace & Time Shift */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Subtitle Universal Translation Panel */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-4.5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <Languages className="w-4 h-4 text-indigo-400" />
              <span>{isKhmer ? 'បកប្រែ Subtitle គ្រប់ភាសា (AI Translate)' : 'AI Subtitle Universal Translator'}</span>
            </span>
            <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-800">
              Gemini 3.8 Flash
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                {isKhmer ? 'ភាសាគោលដៅ៖' : 'Target Language:'}
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="km">ភាសាខ្មែរ (Khmer)</option>
                <option value="en">English</option>
                <option value="th">ไทย (Thai)</option>
                <option value="vi">Tiếng Việt (Vietnamese)</option>
                <option value="zh">中文 (Chinese)</option>
                <option value="ja">日本語 (Japanese)</option>
                <option value="ko">한국어 (Korean)</option>
                <option value="fr">Français (French)</option>
                <option value="es">Español (Spanish)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                {isKhmer ? 'ទម្រង់បកប្រែ៖' : 'Translation Mode:'}
              </label>
              <select
                value={translateMode}
                onChange={(e) => setTranslateMode(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="replace">{isKhmer ? 'ជំនួសអត្ថបទដើម (Replace)' : 'Replace Original'}</option>
                <option value="dual">{isKhmer ? 'ពីរភាសា Original + Translated' : 'Dual-Language'}</option>
              </select>
            </div>
          </div>

          {transError && (
            <div className="text-xs text-red-300 p-2 rounded bg-red-950/60 border border-red-500/30 flex items-center space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{transError}</span>
            </div>
          )}

          <button
            onClick={handleTranslate}
            disabled={isTranslating || cues.length === 0}
            title={isKhmer ? 'បកប្រែ Subtitle ទាំងអស់' : 'Translate All Cues'}
            aria-label="Translate All Subtitles"
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'កំពុងបកប្រែ Subtitle ដោយរក្សាម៉ោង...' : 'Translating subtitles with timestamps...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'បកប្រែ Subtitle ទាំងអស់ឥឡូវនេះ' : 'Translate All Subtitle Cues'}</span>
              </>
            )}
          </button>
        </div>

        {/* Search & Replace + Timing Offset Adjustment */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-4.5 space-y-3 shadow-lg">
          <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{isKhmer ? 'កែសម្រួលម៉ោង (Time Shift) & ស្វែងរកពាក្យ' : 'Time Shift & Search / Replace'}</span>
          </span>

          {/* Time Offset Tool */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">{isKhmer ? 'ពន្យារ/រំកិលម៉ោង៖' : 'Shift:'}</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleShiftTime(-1000)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition"
              >
                -1.0s
              </button>
              <button
                onClick={() => handleShiftTime(-500)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition"
              >
                -0.5s
              </button>
              <button
                onClick={() => handleShiftTime(500)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition"
              >
                +0.5s
              </button>
              <button
                onClick={() => handleShiftTime(1000)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition"
              >
                +1.0s
              </button>
            </div>
          </div>

          {/* Search & Replace Inputs */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isKhmer ? 'ពាក្យត្រូវស្វែងរក...' : 'Find text...'}
                className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder={isKhmer ? 'ជំនួសដោយ...' : 'Replace with...'}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handleReplace}
                disabled={!searchQuery}
                title={isKhmer ? 'ជំនួសពាក្យ' : 'Replace'}
                aria-label="Replace"
                className="px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-medium disabled:opacity-40 transition cursor-pointer"
              >
                <Replace className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle & Add Cue Row */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={() => {
              if (viewMode === 'raw') handleSwitchToCards();
            }}
            title={isKhmer ? 'ផ្ទាំង Cue Cards' : 'Cue Cards Table'}
            aria-label="Cue Cards View"
            className={`flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ផ្ទាំង Cue Cards' : 'Cue Cards'}</span>
          </button>
          <button
            onClick={() => {
              if (viewMode === 'cards') handleSwitchToRaw();
            }}
            title={isKhmer ? 'កូដ SRT សុទ្ធ (Raw Text)' : 'Raw SRT Editor'}
            aria-label="Raw SRT View"
            className={`flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewMode === 'raw'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4 shrink-0" />
            <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'កូដ SRT សុទ្ធ' : 'Raw Text'}</span>
          </button>
        </div>

        <button
          onClick={() => handleAddCue()}
          title={isKhmer ? 'បន្ថែមបន្ទាត់ថ្មី' : 'Add Cue'}
          aria-label="Add Cue"
          className="flex items-center space-x-1.5 p-2 sm:px-3.5 sm:py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'បន្ថែមបន្ទាត់ថ្មី' : 'Add Cue'}</span>
        </button>
      </div>

      {/* Main Content Area */}
      {viewMode === 'cards' ? (
        <div className="space-y-3">
          {cues.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-medium">
                {isKhmer ? 'មិនទាន់មានទិន្នន័យ Subtitle នៅឡើយទេ' : 'No Subtitle Cues Found'}
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={handleLoadSample}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                >
                  {isKhmer ? 'ផ្ទុកគំរូសាកល្បង' : 'Load Sample SRT'}
                </button>
                <button
                  onClick={() => handleAddCue()}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
                >
                  {isKhmer ? 'បង្កើតបន្ទាត់ថ្មី' : 'Create First Cue'}
                </button>
              </div>
            </div>
          ) : (
            cues.map((cue, index) => {
              const durationSec = ((cue.endMs - cue.startMs) / 1000).toFixed(1);
              return (
                <div
                  key={cue.id}
                  className="glass-panel rounded-xl p-3.5 space-y-2 border border-slate-800/80 hover:border-slate-700 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
                    <div className="flex items-center space-x-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-700/40 text-indigo-300 text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>

                      {/* Timestamps inputs */}
                      <div className="flex items-center space-x-1 text-xs font-mono">
                        <input
                          type="text"
                          value={cue.startTime}
                          onChange={(e) => updateCue(cue.id, { startTime: e.target.value })}
                          className="w-24 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-center"
                        />
                        <span className="text-slate-500 font-sans">→</span>
                        <input
                          type="text"
                          value={cue.endTime}
                          onChange={(e) => updateCue(cue.id, { endTime: e.target.value })}
                          className="w-24 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-center"
                        />
                        <span className="text-[10px] text-slate-500 pl-1 font-sans">
                          ({durationSec}s)
                        </span>
                      </div>
                    </div>

                    {/* Speaker Selector & Action Buttons */}
                    <div className="flex items-center space-x-1.5">
                      <select
                        value={cue.speaker || 'narrator'}
                        onChange={(e) =>
                          updateCue(cue.id, { speaker: e.target.value as any })
                        }
                        className={`text-xs px-2 py-0.5 rounded-lg border font-medium ${
                          cue.speaker === 'male'
                            ? 'bg-blue-950/60 text-blue-300 border-blue-700/40'
                            : cue.speaker === 'female'
                            ? 'bg-pink-950/60 text-pink-300 border-pink-700/40'
                            : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        <option value="narrator">{isKhmer ? '🎙️ អ្នកសម្រាយ' : '🎙️ Narrator'}</option>
                        <option value="male">{isKhmer ? '👨 ប្រុស (Male)' : '👨 Male'}</option>
                        <option value="female">{isKhmer ? '👩 ស្រី (Female)' : '👩 Female'}</option>
                      </select>

                      {/* Audition Cue Audio */}
                      <button
                        onClick={() => handleAudition(cue)}
                        title={isKhmer ? 'ស្តាប់សំឡេងអាន' : 'Audition Voice'}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      >
                        {auditioningId === cue.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Split Cue */}
                      <button
                        onClick={() => handleSplitCue(index)}
                        title={isKhmer ? 'ពុះជាពីរ Cues' : 'Split Cue'}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      >
                        <Split className="w-3.5 h-3.5" />
                      </button>

                      {/* Merge with Next */}
                      {index < cues.length - 1 && (
                        <button
                          onClick={() => handleMergeNext(index)}
                          title={isKhmer ? 'បញ្ចូលគ្នាជាមួយបន្ទាត់បន្ទាប់' : 'Merge with Next'}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        >
                          <Merge className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteCue(cue.id)}
                        title={isKhmer ? 'លុប' : 'Delete'}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subtitle Text Textarea */}
                  <textarea
                    rows={2}
                    value={cue.text}
                    onChange={(e) => updateCue(cue.id, { text: e.target.value })}
                    placeholder={isKhmer ? 'បញ្ចូលអក្សរ Subtitle...' : 'Enter subtitle text...'}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Raw SRT editor */
        <div className="space-y-3">
          <textarea
            rows={18}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs sm:text-sm font-mono text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSwitchToCards}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              {isKhmer ? 'រក្សាទុក និងត្រឡប់ទៅ Cue Cards' : 'Save & Return to Cards'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
