import React, { useState, useId } from 'react';
import { SrtCue } from '../types';
import { parseSrt } from '../utils/srtParser';
import { translateSrtApi } from '../services/geminiService';
import { saveTranslationToHistory } from '../utils/storage';
import {
  Files,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Eye,
  FileText,
  Languages,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Check,
  Clock,
  FolderArchive,
  BarChart3,
  AlertTriangle,
  Play,
  History,
} from 'lucide-react';

export type BatchItemStatus = 'pending' | 'processing' | 'complete' | 'failed';

export interface BatchFileItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: 'srt' | 'vtt' | 'txt';
  originalContent: string;
  translatedContent?: string;
  status: BatchItemStatus;
  progress: number; // 0 to 100
  errorMessage?: string;
  cueCount?: number;
  completedAt?: string;
}

interface BatchTranslatorProps {
  appLang: 'km' | 'en';
  onOpenInSrtStudio: (cues: SrtCue[]) => void;
  onOpenHistory?: () => void;
}

export const BatchTranslator: React.FC<BatchTranslatorProps> = ({
  appLang,
  onOpenInSrtStudio,
  onOpenHistory,
}) => {
  const isKhmer = appLang === 'km';
  const fileInputId = useId();

  const [files, setFiles] = useState<BatchFileItem[]>([]);
  const [targetLang, setTargetLang] = useState('km');
  const [mode, setMode] = useState<'replace' | 'dual'>('replace');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [previewItem, setPreviewItem] = useState<BatchFileItem | null>(null);

  // Quick Demo Batch
  const handleLoadDemoBatch = () => {
    const demoItems: BatchFileItem[] = [
      {
        id: 'demo-srt-1',
        fileName: 'Episode_01_Angkor_Dynasty.srt',
        fileSize: 1540,
        fileType: 'srt',
        originalContent: `1\n00:00:01,000 --> 00:00:04,500\n[Narrator]: In the heart of the jungle lies a forgotten empire.\n\n2\n00:00:05,000 --> 00:00:08,200\n[Explorer]: The inscriptions here speak of an eternal guardian!\n\n3\n00:00:08,800 --> 00:00:12,600\n[Guide]: We must tread lightly, danger lurks in every shadow.`,
        status: 'pending',
        progress: 0,
        cueCount: 3,
      },
      {
        id: 'demo-srt-2',
        fileName: 'Episode_02_The_Sky_Portal.srt',
        fileSize: 1820,
        fileType: 'srt',
        originalContent: `1\n00:00:01,200 --> 00:00:05,000\n[Guardian]: Who seeks entrance through the celestial gateway?\n\n2\n00:00:05,500 --> 00:00:09,100\n[Explorer]: We seek the sacred relic to protect our kingdom.\n\n3\n00:00:09,800 --> 00:00:14,000\n[Guardian]: Prove your courage before dawn breaks!`,
        status: 'pending',
        progress: 0,
        cueCount: 3,
      },
      {
        id: 'demo-txt-3',
        fileName: 'Movie_Recap_Dialogue_Script.txt',
        fileSize: 940,
        fileType: 'txt',
        originalContent: `Scene 1: The archaeologists discover an unbroken seal carved into mountain granite.\nScene 2: Rival mercenaries ambush the convoy under the cover of thunderstorm.\nScene 3: A desperate sacrifice unseals the ancient magic to save humanity.`,
        status: 'pending',
        progress: 0,
      },
    ];

    setFiles(demoItems);
  };

  // Handle Multi-file Upload
  const handleFilesSelected = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    Array.from(selectedFiles).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const fileType = ext === 'srt' ? 'srt' : ext === 'vtt' ? 'vtt' : 'txt';

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const cues = fileType === 'srt' || fileType === 'vtt' ? parseSrt(content) : [];

        const newItem: BatchFileItem = {
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          fileName: file.name,
          fileSize: file.size,
          fileType,
          originalContent: content,
          status: 'pending',
          progress: 0,
          cueCount: cues.length > 0 ? cues.length : undefined,
        };

        setFiles((prev) => [...prev, newItem]);
      };
      reader.readAsText(file);
    });
  };

  // Translate a single file with progressive feedback
  const translateSingleFile = async (item: BatchFileItem): Promise<void> => {
    // 1. Set to processing and 20%
    setFiles((prev) =>
      prev.map((f) =>
        f.id === item.id
          ? { ...f, status: 'processing', progress: 20, errorMessage: undefined }
          : f
      )
    );

    try {
      // 2. Animate progress to 50%
      await new Promise((r) => setTimeout(r, 200));
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, progress: 55 } : f))
      );

      // 3. Perform AI Translation
      const translated = await translateSrtApi({
        srtContent: item.originalContent,
        targetLang,
        mode,
      });

      // 4. Complete to 100%
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: 'complete',
                progress: 100,
                translatedContent: translated,
                completedAt: new Date().toLocaleTimeString(),
              }
            : f
        )
      );

      // Save to last 10 translation history
      saveTranslationToHistory({
        title: item.fileName,
        targetLanguage: targetLang,
        mode,
        cueCount: item.cueCount || 1,
        originalSrt: item.originalContent,
        translatedSrt: translated,
        firstCueSnippet: translated.slice(0, 120),
      });
    } catch (err: any) {
      console.error(`Batch translation error for ${item.fileName}:`, err);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: 'failed',
                progress: 0,
                errorMessage: err.message || 'Translation failed. Check connection or file formatting.',
              }
            : f
        )
      );
    }
  };

  // Start Batch Translation (runs all pending or failed items simultaneously)
  const handleStartBatch = async () => {
    const queue = files.filter((f) => f.status === 'pending' || f.status === 'failed');
    if (queue.length === 0) return;

    setIsProcessingBatch(true);

    // Run translations in parallel (simultaneously)
    await Promise.allSettled(queue.map((item) => translateSingleFile(item)));

    setIsProcessingBatch(false);
  };

  // Retry a specific failed file
  const handleRetryFile = async (item: BatchFileItem) => {
    await translateSingleFile(item);
  };

  // Retry all failed files
  const handleRetryAllFailed = async () => {
    const failedFiles = files.filter((f) => f.status === 'failed');
    if (failedFiles.length === 0) return;

    setIsProcessingBatch(true);
    await Promise.allSettled(failedFiles.map((item) => translateSingleFile(item)));
    setIsProcessingBatch(false);
  };

  // Download individual translated file
  const handleDownloadFile = (item: BatchFileItem) => {
    if (!item.translatedContent) return;
    const baseName = item.fileName.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}_${targetLang}.${item.fileType}`;
    const blob = new Blob([item.translatedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download all completed files
  const handleDownloadAll = () => {
    const completed = files.filter((f) => f.status === 'complete' && f.translatedContent);
    completed.forEach((item, index) => {
      setTimeout(() => {
        handleDownloadFile(item);
      }, index * 300);
    });
  };

  // Remove a single file from queue
  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Status Metrics
  const totalCount = files.length;
  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const processingCount = files.filter((f) => f.status === 'processing').length;
  const completeCount = files.filter((f) => f.status === 'complete').length;
  const failedCount = files.filter((f) => f.status === 'failed').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-950/50 via-purple-950/40 to-slate-900 border border-indigo-500/20 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
              <Files className="w-4 h-4" />
              <span>{isKhmer ? 'ផ្ទាំងគ្រប់គ្រងការបកប្រែឯកសារជាក្រុម (Batch Translation Dashboard)' : 'Simultaneous Batch Translation Dashboard'}</span>
            </div>
            <h1 className="text-xl font-bold text-white">
              {isKhmer ? 'បកប្រែឯកសារ SRT & TXT ជាច្រើនស្របពេលគ្នា' : 'Batch Subtitle & Text Translation Dashboard'}
            </h1>
            <p className="text-xs text-slate-300">
              {isKhmer
                ? 'ផ្ទុកឯកសារ Subtitle និង Text ច្រើនក្នុងពេលតែមួយ មើលដំណើរការ Progress Bar នីមួយៗ និងមានប៊ូតុង Retry សម្រាប់ឯកសារបរាជ័យ!'
                : 'Upload multiple SRT or TXT files at once with individual progress bars, real-time status monitoring, and one-click retry.'}
            </p>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              id={fileInputId}
              accept=".srt,.vtt,.txt"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = '';
              }}
            />
            <label
              htmlFor={fileInputId}
              title={isKhmer ? 'ជ្រើសរើសឯកសារច្រើន (.srt, .txt)' : 'Upload Multiple Files'}
              aria-label="Upload Multiple Files"
              className="flex items-center space-x-1.5 p-2 sm:px-4 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 cursor-pointer transition"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ជ្រើសរើសឯកសារច្រើន (.srt, .txt)' : 'Upload Multiple Files'}</span>
            </label>

            <button
              onClick={handleLoadDemoBatch}
              title={isKhmer ? 'ផ្ទុកគំរូជាក្រុម' : 'Load Demo Batch'}
              aria-label="Load Demo Batch"
              className="flex items-center space-x-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ផ្ទុកគំរូជាក្រុម' : 'Load Demo Batch'}</span>
            </button>

            {onOpenHistory && (
              <button
                onClick={onOpenHistory}
                className="flex items-center space-x-1.5 p-2 sm:px-3.5 sm:py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/70 text-purple-200 text-xs font-semibold border border-purple-700/40 transition cursor-pointer"
                title={isKhmer ? 'មើលប្រវត្តិបកប្រែទាំង ១០' : 'View Translation History'}
                aria-label="Translation History"
              >
                <History className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ប្រវត្តិបកប្រែ' : 'History'}</span>
              </button>
            )}

            {completeCount > 0 && (
              <button
                onClick={handleDownloadAll}
                title={isKhmer ? `ទាញយកទាំងអស់ (${completeCount})` : `Download All (${completeCount})`}
                aria-label="Download All"
                className="flex items-center space-x-1.5 p-2 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                <FolderArchive className="w-4 h-4 shrink-0" />
                <span className="phone-hide-label hidden sm:inline">{isKhmer ? `ទាញយកទាំងអស់ (${completeCount})` : `Download All (${completeCount})`}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total */}
        <div className="glass-panel p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400">
            {isKhmer ? 'ឯកសារសរុប' : 'Total Files'}
          </div>
          <div className="text-xl font-bold text-white font-mono">{totalCount}</div>
        </div>

        {/* Pending */}
        <div className="glass-panel p-3.5 rounded-xl border border-amber-900/30 space-y-1">
          <div className="text-[11px] font-semibold text-amber-400 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{isKhmer ? 'រង់ចាំ (Pending)' : 'Pending'}</span>
          </div>
          <div className="text-xl font-bold text-amber-300 font-mono">{pendingCount}</div>
        </div>

        {/* Processing */}
        <div className="glass-panel p-3.5 rounded-xl border border-indigo-900/40 space-y-1">
          <div className="text-[11px] font-semibold text-indigo-400 flex items-center space-x-1">
            <Loader2 className={`w-3.5 h-3.5 ${processingCount > 0 ? 'animate-spin' : ''}`} />
            <span>{isKhmer ? 'កំពុងដំណើរការ' : 'Processing'}</span>
          </div>
          <div className="text-xl font-bold text-indigo-300 font-mono">{processingCount}</div>
        </div>

        {/* Complete */}
        <div className="glass-panel p-3.5 rounded-xl border border-emerald-900/40 space-y-1">
          <div className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isKhmer ? 'ជោគជ័យ (Complete)' : 'Complete'}</span>
          </div>
          <div className="text-xl font-bold text-emerald-300 font-mono">{completeCount}</div>
        </div>

        {/* Failed */}
        <div className="glass-panel p-3.5 rounded-xl border border-red-900/40 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-red-400 flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'បរាជ័យ (Failed)' : 'Failed'}</span>
            </div>
            {failedCount > 0 && (
              <button
                onClick={handleRetryAllFailed}
                disabled={isProcessingBatch}
                className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 hover:bg-red-900 text-red-200 transition"
              >
                Retry All
              </button>
            )}
          </div>
          <div className="text-xl font-bold text-red-300 font-mono">{failedCount}</div>
        </div>
      </div>

      {/* Target Config & Action Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Target Language */}
          <div className="sm:col-span-5 flex items-center space-x-2">
            <Languages className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
              {isKhmer ? 'ភាសាគោលដៅ៖' : 'Target Language:'}
            </span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="km">ភាសាខ្មែរ (Khmer)</option>
              <option value="en">English (US)</option>
              <option value="th">ไทย (Thai)</option>
              <option value="vi">Tiếng Việt (Vietnamese)</option>
              <option value="zh">中文 (Chinese - Mandarin)</option>
              <option value="ja">日本語 (Japanese)</option>
              <option value="ko">한국어 (Korean)</option>
              <option value="fr">Français (French)</option>
              <option value="es">Español (Spanish)</option>
            </select>
          </div>

          {/* Mode */}
          <div className="sm:col-span-4 flex items-center space-x-2">
            <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
              {isKhmer ? 'ទម្រង់ Subtitle៖' : 'Mode:'}
            </span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="replace">{isKhmer ? 'ជំនួសអត្ថបទដើម (Replace)' : 'Replace Original'}</option>
              <option value="dual">{isKhmer ? 'ពីរបន្ទាត់ Original + Translation' : 'Dual-Language'}</option>
            </select>
          </div>

          {/* Start CTA */}
          <div className="sm:col-span-3 flex justify-end gap-2">
            <button
              onClick={handleStartBatch}
              disabled={isProcessingBatch || (pendingCount === 0 && failedCount === 0)}
              title={
                isKhmer
                  ? `បកប្រែទាំងអស់ (${pendingCount + failedCount})`
                  : `Translate All (${pendingCount + failedCount})`
              }
              aria-label="Start Batch Translation"
              className="w-full py-2.5 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-40 cursor-pointer"
            >
              {isProcessingBatch ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'កំពុងបកប្រែ...' : 'Translating Batch...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="phone-hide-label hidden sm:inline">
                    {isKhmer
                      ? `បកប្រែទាំងអស់ (${pendingCount + failedCount})`
                      : `Translate All (${pendingCount + failedCount})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Vertical File List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>
              {isKhmer ? 'បញ្ជីឯកសារក្នុងជួរ (Vertical File Queue):' : 'Uploaded File Queue:'}
            </span>
          </span>

          {files.length > 0 && (
            <button
              onClick={() => setFiles([])}
              className="hover:text-red-400 transition cursor-pointer text-slate-500"
            >
              {isKhmer ? 'សម្អាតបញ្ជីទាំងអស់ (Clear All)' : 'Clear Queue'}
            </button>
          )}
        </div>

        {files.length === 0 ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFilesSelected(e.dataTransfer.files);
            }}
            onClick={() => document.getElementById(fileInputId)?.click()}
            className="rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 p-12 text-center space-y-3 transition cursor-pointer bg-slate-900/30"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-200">
                {isKhmer ? 'ទម្លាក់ឯកសារ SRT ឬ TXT នៅទីនេះ' : 'Drag & Drop SRT or TXT files here'}
              </p>
              <p className="text-xs text-slate-400">
                {isKhmer
                  ? 'ឬចុចដើម្បីជ្រើសរើសឯកសារជាច្រើនក្នុងពេលតែមួយ (.srt, .vtt, .txt)'
                  : 'or click to browse multiple files (.srt, .vtt, .txt)'}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadDemoBatch();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              {isKhmer ? 'ផ្ទុកគំរូសាកល្បង (Load Demo Files)' : 'Load Demo Files'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file, index) => {
              const isPending = file.status === 'pending';
              const isProcessing = file.status === 'processing';
              const isComplete = file.status === 'complete';
              const isFailed = file.status === 'failed';

              return (
                <div
                  key={file.id}
                  className={`p-4 rounded-xl border transition-all duration-200 space-y-3.5 ${
                    isComplete
                      ? 'bg-slate-900/80 border-emerald-500/30 shadow-md shadow-emerald-950/20'
                      : isProcessing
                      ? 'bg-slate-900/90 border-indigo-500/60 ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-950/30'
                      : isFailed
                      ? 'bg-slate-900/80 border-red-500/40 shadow-md shadow-red-950/20'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* File Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Status Icon Indicator */}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                          isComplete
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : isProcessing
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 animate-pulse'
                            : isFailed
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {isComplete ? (
                          <Check className="w-5 h-5 text-emerald-400" />
                        ) : isProcessing ? (
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                        ) : isFailed ? (
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        ) : (
                          <FileText className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      {/* File Details */}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                            {file.fileName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-mono border border-slate-700">
                            {file.fileType}
                          </span>
                          {file.cueCount !== undefined && (
                            <span className="text-[11px] text-indigo-400 font-medium">
                              ({file.cueCount} cues)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                          <span>{(file.fileSize / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>Target: {targetLang.toUpperCase()}</span>
                          {file.completedAt && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400">Done at {file.completedAt}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Action Buttons */}
                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      {/* Status Badge */}
                      {isPending && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{isKhmer ? 'រង់ចាំ (Pending)' : 'Pending'}</span>
                        </span>
                      )}

                      {isProcessing && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>{isKhmer ? 'កំពុងបកប្រែ...' : 'Processing...'}</span>
                        </span>
                      )}

                      {isComplete && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{isKhmer ? 'ជោគជ័យ (Complete)' : 'Complete'}</span>
                        </span>
                      )}

                      {isFailed && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{isKhmer ? 'បរាជ័យ (Failed)' : 'Failed'}</span>
                        </span>
                      )}

                      {/* RETRY BUTTON FOR FAILED ITEMS */}
                      {isFailed && (
                        <button
                          onClick={() => handleRetryFile(file)}
                          title={isKhmer ? 'ព្យាយាមម្តងទៀត' : 'Retry'}
                          aria-label="Retry"
                          className="flex items-center space-x-1 p-1.5 sm:px-3 sm:py-1 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-200 text-xs font-semibold transition cursor-pointer shadow"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ព្យាយាមម្តងទៀត' : 'Retry'}</span>
                        </button>
                      )}

                      {/* Single Translate Button if Pending */}
                      {isPending && (
                        <button
                          onClick={() => translateSingleFile(file)}
                          title={isKhmer ? 'បកប្រែ' : 'Start'}
                          aria-label="Start"
                          className="flex items-center space-x-1 p-1.5 sm:px-3 sm:py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold transition cursor-pointer"
                        >
                          <Play className="w-3 h-3 shrink-0" />
                          <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'បកប្រែ' : 'Start'}</span>
                        </button>
                      )}

                      {/* Preview original vs translated */}
                      <button
                        onClick={() => setPreviewItem(file)}
                        title={isKhmer ? 'មើលអត្ថបទដើម & បកប្រែ' : 'Preview Translation'}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Open in SRT Studio if completed and SRT */}
                      {isComplete && file.translatedContent && file.fileType === 'srt' && (
                        <button
                          onClick={() => {
                            const parsed = parseSrt(file.translatedContent!);
                            onOpenInSrtStudio(parsed);
                          }}
                          title={isKhmer ? 'បើកក្នុង SRT Studio' : 'Open in SRT Studio'}
                          className="p-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 transition cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Download translated file */}
                      {isComplete && file.translatedContent && (
                        <button
                          onClick={() => handleDownloadFile(file)}
                          title={isKhmer ? 'ទាញយកឯកសារនេះ' : 'Download translated file'}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Remove */}
                      <button
                        onClick={() => handleRemoveFile(file.id)}
                        title={isKhmer ? 'ដកចេញ' : 'Remove from list'}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Individual File Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        {isComplete
                          ? isKhmer
                            ? 'ការបកប្រែបានសម្រេច ១០០%'
                            : 'Translation Complete (100%)'
                          : isProcessing
                          ? isKhmer
                            ? `កំពុងដំណើរការបកប្រែ (${file.progress}%)...`
                            : `Processing with Gemini AI (${file.progress}%)...`
                          : isFailed
                          ? file.errorMessage || (isKhmer ? 'ការបកប្រែបរាជ័យ' : 'Translation failed')
                          : isKhmer
                          ? 'រង់ចាំក្នុងជួរ (Pending)'
                          : 'Pending in queue'}
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          isComplete
                            ? 'text-emerald-400'
                            : isProcessing
                            ? 'text-indigo-400'
                            : isFailed
                            ? 'text-red-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {file.progress}%
                      </span>
                    </div>

                    {/* Progress Bar Line */}
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isComplete
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : isProcessing
                            ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse'
                            : isFailed
                            ? 'bg-red-500'
                            : 'bg-slate-700'
                        }`}
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comparison Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">{previewItem.fileName}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {previewItem.status}
                </span>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                {isKhmer ? 'បិទ' : 'Close'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
              <div className="space-y-1 flex flex-col">
                <span className="text-xs font-semibold text-slate-400">
                  {isKhmer ? 'អត្ថបទដើម (Original):' : 'Original Content:'}
                </span>
                <textarea
                  readOnly
                  rows={14}
                  value={previewItem.originalContent}
                  className="w-full flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 resize-none leading-relaxed"
                />
              </div>

              <div className="space-y-1 flex flex-col">
                <span className="text-xs font-semibold text-emerald-400">
                  {isKhmer ? 'អត្ថបទបកប្រែ (Translated):' : 'Translated Content:'}
                </span>
                <textarea
                  readOnly
                  rows={14}
                  value={
                    previewItem.translatedContent ||
                    (isKhmer ? 'មិនទាន់បានបកប្រែនៅឡើយទេ' : 'Not translated yet')
                  }
                  className="w-full flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-200 resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              {previewItem.status === 'failed' && (
                <button
                  onClick={() => {
                    handleRetryFile(previewItem);
                    setPreviewItem(null);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isKhmer ? 'ព្យាយាមម្តងទៀត (Retry)' : 'Retry Translation'}</span>
                </button>
              )}

              {previewItem.translatedContent && (
                <button
                  onClick={() => handleDownloadFile(previewItem)}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isKhmer ? 'ទាញយកឯកសារនេះ' : 'Download File'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
