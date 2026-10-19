import React, { useState } from 'react';
import { TranslationHistoryItem, SrtCue } from '../types';
import { parseSrt } from '../utils/srtParser';
import {
  History,
  RotateCcw,
  GitCompare,
  Download,
  Trash2,
  X,
  Clock,
  FileText,
  Languages,
  Check,
  ArrowRight,
  Sparkles,
  Eye,
  AlertCircle,
} from 'lucide-react';

interface TranslationHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  appLang: 'km' | 'en';
  historyItems: TranslationHistoryItem[];
  currentSrtText?: string;
  onRevertToHistoryItem: (item: TranslationHistoryItem) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearAllHistory: () => void;
}

export const TranslationHistoryPanel: React.FC<TranslationHistoryPanelProps> = ({
  isOpen,
  onClose,
  appLang,
  historyItems,
  currentSrtText,
  onRevertToHistoryItem,
  onDeleteHistoryItem,
  onClearAllHistory,
}) => {
  const isKhmer = appLang === 'km';

  // Compare modal state
  const [comparingItem, setComparingItem] = useState<TranslationHistoryItem | null>(null);
  const [compareMode, setCompareMode] = useState<'orig-vs-trans' | 'current-vs-history'>(
    'orig-vs-trans'
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = (item: TranslationHistoryItem) => {
    const filename = `${item.title.replace(/\.[^/.]+$/, '')}_${item.targetLanguage}_${Date.now()}.srt`;
    const blob = new Blob([item.translatedSrt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 space-y-5 max-h-[90vh] flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {isKhmer ? 'ប្រវត្តិការបកប្រែ (Translation History)' : 'Translation History'}
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 font-mono border border-purple-800/40">
                  {historyItems.length} / 10 {isKhmer ? 'កំណែ' : 'versions'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isKhmer
                  ? 'រក្សាទុក ១០ កំណែចុងក្រោយដោយស្វ័យប្រវត្តក្នុង Browser សម្រាប់ Revert ឬ Compare'
                  : 'Saves your last 10 successful translations locally to quickly revert or compare versions.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {historyItems.length > 0 && (
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      isKhmer
                        ? 'តើអ្នកពិតជាចង់លុបប្រវត្តិទាំងអស់មែនទេ?'
                        : 'Are you sure you want to clear all translation history?'
                    )
                  ) {
                    onClearAllHistory();
                  }
                }}
                className="text-xs text-slate-500 hover:text-red-400 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 transition"
              >
                {isKhmer ? 'សម្អាតទាំងអស់' : 'Clear All'}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* History Items List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {historyItems.length === 0 ? (
            <div className="py-16 text-center space-y-3 text-slate-500">
              <History className="w-12 h-12 mx-auto text-slate-700" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-300">
                  {isKhmer ? 'មិនទាន់មានប្រវត្តិបកប្រែនៅឡើយទេ' : 'No Translation History Yet'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isKhmer
                    ? 'រាល់ពេលដែលអ្នកបកប្រែ Subtitle ដោយជោគជ័យ ប្រព័ន្ធនឹងរក្សាទុកកំណែនោះនៅទីនេះដោយស្វ័យប្រវត្តិ។'
                    : 'Whenever you translate subtitles successfully, the version will be saved here automatically.'}
                </p>
              </div>
            </div>
          ) : (
            historyItems.map((item, index) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition space-y-3"
              >
                {/* Item Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase font-mono">
                          {item.targetLanguage}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {item.mode === 'dual' ? 'Dual-Language' : 'Replace'}
                        </span>
                        <span className="text-[10px] text-purple-400">
                          ({item.cueCount} cues)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span>{item.formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center space-x-1.5 self-end sm:self-center">
                    {/* Revert / Restore button */}
                    <button
                      onClick={() => {
                        onRevertToHistoryItem(item);
                        onClose();
                      }}
                      className="flex items-center space-x-1 p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                      title={isKhmer ? 'ស្តារកំណែនេះទៅកាន់ SRT Editor' : 'Revert to this version'}
                      aria-label="Revert to this version"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ត្រឡប់ទៅកំណែនេះ' : 'Revert'}</span>
                    </button>

                    {/* Compare button */}
                    <button
                      onClick={() => setComparingItem(item)}
                      className="flex items-center space-x-1 p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
                      title={isKhmer ? 'ប្រៀបធៀបកំណែ' : 'Compare versions'}
                      aria-label="Compare versions"
                    >
                      <GitCompare className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ប្រៀបធៀប' : 'Compare'}</span>
                    </button>

                    {/* Download */}
                    <button
                      onClick={() => handleDownload(item)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title={isKhmer ? 'ទាញយក .srt' : 'Download .srt'}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteHistoryItem(item.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-500 hover:text-red-400 transition"
                      title={isKhmer ? 'លុបចេញពីប្រវត្តិ' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtitle Snippet Preview */}
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60 text-xs font-mono text-slate-300 max-h-16 overflow-hidden text-ellipsis whitespace-pre-line leading-relaxed">
                  {item.firstCueSnippet || item.translatedSrt.slice(0, 160) + '...'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comparison Modal Sub-View */}
        {comparingItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <GitCompare className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white">
                    {isKhmer ? 'ផ្ទាំងប្រៀបធៀប Subtitle' : 'Subtitle Version Comparison'}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {comparingItem.title}
                  </span>
                </div>

                <button
                  onClick={() => setComparingItem(null)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  {isKhmer ? 'បិទ' : 'Close'}
                </button>
              </div>

              {/* Compare Mode Switcher */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-400">{isKhmer ? 'របៀបប្រៀបធៀប៖' : 'Compare Mode:'}</span>
                <button
                  onClick={() => setCompareMode('orig-vs-trans')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    compareMode === 'orig-vs-trans'
                      ? 'bg-purple-600 text-white font-semibold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {isKhmer ? 'អត្ថបទដើម vs កំណែប្រវត្តិ' : 'Original vs History Version'}
                </button>
                {currentSrtText && (
                  <button
                    onClick={() => setCompareMode('current-vs-history')}
                    className={`px-3 py-1 rounded-lg font-medium transition ${
                      compareMode === 'current-vs-history'
                        ? 'bg-purple-600 text-white font-semibold'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isKhmer ? 'កំណែបច្ចុប្បន្ន vs កំណែប្រវត្តិ' : 'Current Active vs History Version'}
                  </button>
                )}
              </div>

              {/* Dual Viewport */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
                {/* Left Side */}
                <div className="space-y-1.5 flex flex-col">
                  <span className="text-xs font-semibold text-slate-400">
                    {compareMode === 'orig-vs-trans'
                      ? isKhmer
                        ? 'អត្ថបទដើម (Original SRT):'
                        : 'Original Source Subtitle:'
                      : isKhmer
                      ? 'អត្ថបទបច្ចុប្បន្នកំពុងកែ (Current Active):'
                      : 'Current Active Subtitle:'}
                  </span>
                  <textarea
                    readOnly
                    rows={14}
                    value={
                      compareMode === 'orig-vs-trans'
                        ? comparingItem.originalSrt
                        : currentSrtText || ''
                    }
                    className="w-full flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 resize-none leading-relaxed"
                  />
                </div>

                {/* Right Side */}
                <div className="space-y-1.5 flex flex-col">
                  <span className="text-xs font-semibold text-emerald-400">
                    {isKhmer
                      ? `កំណែប្រវត្តិ (Saved at ${comparingItem.formattedDate}):`
                      : `History Version (${comparingItem.formattedDate}):`}
                  </span>
                  <textarea
                    readOnly
                    rows={14}
                    value={comparingItem.translatedSrt}
                    className="w-full flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-200 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-500">
                  Target: {comparingItem.targetLanguage.toUpperCase()} | Mode: {comparingItem.mode}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      onRevertToHistoryItem(comparingItem);
                      setComparingItem(null);
                      onClose();
                    }}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isKhmer ? 'ត្រឡប់ទៅកំណែនេះ (Revert)' : 'Revert to This Version'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
