import React, { useState } from 'react';
import { StudioTab, SrtCue, StoryRecapResult, TranslationHistoryItem } from './types';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { RecapStudio } from './components/RecapStudio';
import { SrtEditor } from './components/SrtEditor';
import { BatchTranslator } from './components/BatchTranslator';
import { SrtDubbingStudio } from './components/SrtDubbingStudio';
import { VocalSeparator } from './components/VocalSeparator';
import { TranscribeStudio } from './components/TranscribeStudio';
import { VideoBurner } from './components/VideoBurner';
import { OcrTranslateStudio } from './components/OcrTranslateStudio';
import { BackupModal } from './components/BackupModal';
import { TranslationHistoryPanel } from './components/TranslationHistoryPanel';
import {
  parseSrt,
  stringifySrt,
} from './utils/srtParser';
import {
  loadLocalSrt,
  saveLocalSrt,
  loadLocalRecap,
  saveLocalRecap,
  loadAppLanguage,
  saveAppLanguage,
  SAMPLE_SRT_KHMER,
  SAMPLE_STORY_RESULT,
  loadTranslationHistory,
  deleteTranslationHistoryItem,
  clearTranslationHistory,
} from './utils/storage';
import { FileText, Files, Wifi, Battery, Signal } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<StudioTab>('recap');
  const [appLang, setAppLang] = useState<'km' | 'en'>(() => loadAppLanguage());
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPhoneMode, setIsPhoneMode] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<TranslationHistoryItem[]>(() =>
    loadTranslationHistory()
  );

  // Sub-view in SRT studio: 'single' editor vs 'batch' multi-file translator
  const [srtSubView, setSrtSubView] = useState<'single' | 'batch'>('single');

  // Shared Subtitle Cues
  const [cues, setCues] = useState<SrtCue[]>(() => {
    const saved = loadLocalSrt();
    return saved ? parseSrt(saved) : parseSrt(SAMPLE_SRT_KHMER);
  });

  // Shared Story Recap draft
  const [recapDraft, setRecapDraft] = useState<StoryRecapResult | null>(() => {
    return loadLocalRecap() || SAMPLE_STORY_RESULT;
  });

  // Language toggle
  const toggleLanguage = () => {
    const next = appLang === 'km' ? 'en' : 'km';
    setAppLang(next);
    saveAppLanguage(next);
  };

  // Callback to update cues and save
  const handleUpdateCues = (newCues: SrtCue[]) => {
    setCues(newCues);
    saveLocalSrt(stringifySrt(newCues));
  };

  // Navigations from Recap studio
  const handleSendToSrtFromRecap = (srtText: string) => {
    const parsed = parseSrt(srtText);
    setCues(parsed);
    saveLocalSrt(srtText);
    setSrtSubView('single');
    setCurrentTab('srt-editor');
  };

  const handleSendToDubbing = (srtText: string) => {
    const parsed = parseSrt(srtText);
    setCues(parsed);
    saveLocalSrt(srtText);
    setCurrentTab('srt-dubbing');
  };

  const handleSendToVideoBurner = (newCues: SrtCue[]) => {
    setCues(newCues);
    setCurrentTab('video-burner');
  };

  // Translation History Handlers
  const handleOpenHistory = () => {
    setHistoryItems(loadTranslationHistory());
    setIsHistoryOpen(true);
  };

  const handleRevertToHistoryItem = (item: TranslationHistoryItem) => {
    const parsed = parseSrt(item.translatedSrt);
    setCues(parsed);
    saveLocalSrt(item.translatedSrt);
    setSrtSubView('single');
    setCurrentTab('srt-editor');
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = deleteTranslationHistoryItem(id);
    setHistoryItems(updated);
  };

  const handleClearAllHistory = () => {
    clearTranslationHistory();
    setHistoryItems([]);
  };

  const isKhmer = appLang === 'km';

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200 ${
        isPhoneMode ? 'phone-mode-active p-0 sm:py-6 sm:px-4 bg-slate-900/90' : ''
      }`}
    >
      {/* Phone Model Container when phone simulation is enabled on desktop */}
      <div
        className={`${
          isPhoneMode
            ? 'w-full max-w-sm sm:max-w-md mx-auto min-h-[850px] bg-slate-950 rounded-[44px] border-[10px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden ring-1 ring-white/10 flex flex-col relative transition-all duration-300'
            : 'w-full flex-1 flex flex-col'
        }`}
      >
        {/* Phone Simulation Header: Dynamic Island and Mobile Status Bar */}
        {isPhoneMode && (
          <div className="bg-slate-950 text-slate-300 px-6 pt-3 pb-1 flex items-center justify-between text-[11px] font-mono border-b border-slate-900 select-none">
            <span className="font-semibold text-white">9:41</span>
            {/* Dynamic Island Pill */}
            <div className="w-24 h-4 bg-black rounded-full flex items-center justify-center space-x-1.5 shadow-inner border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60" />
            </div>
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
        )}

        {/* Top Navigation Header */}
        <Header
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          appLang={appLang}
          onToggleLang={toggleLanguage}
          onOpenBackup={() => setIsBackupOpen(true)}
          onOpenHistory={handleOpenHistory}
          isPhoneMode={isPhoneMode}
          onTogglePhoneMode={() => setIsPhoneMode(!isPhoneMode)}
        />

        {/* Main Studio Viewport */}
        <main className={`flex-1 pb-24 ${isPhoneMode ? 'overflow-y-auto px-1' : ''}`}>
          {currentTab === 'recap' && (
            <RecapStudio
              appLang={appLang}
              onSendToSrt={handleSendToSrtFromRecap}
              onSendToDubbing={handleSendToDubbing}
              onNavigateTab={setCurrentTab}
              initialRecap={recapDraft}
            />
          )}

          {currentTab === 'srt-editor' && (
            <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4 space-y-4">
              {/* Sub-view switcher inside SRT Studio: Single vs Batch (Icon-only on phone) */}
              <div className="flex items-center space-x-1.5 sm:space-x-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setSrtSubView('single')}
                  title={isKhmer ? 'កែសម្រួល & បកប្រែឯកសារទោល' : 'Single SRT Subtitle Studio'}
                  aria-label="Single SRT Studio"
                  className={`flex items-center space-x-2 p-2 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    srtSubView === 'single'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="phone-hide-label hidden sm:inline">
                    {isKhmer ? 'កែសម្រួល & បកប្រែឯកសារទោល' : 'Single SRT Subtitle Studio'}
                  </span>
                </button>

                <button
                  onClick={() => setSrtSubView('batch')}
                  title={isKhmer ? 'បកប្រែជាក្រុម (Batch Processing)' : 'Batch Multi-File Translation'}
                  aria-label="Batch Translation"
                  className={`flex items-center space-x-2 p-2 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    srtSubView === 'batch'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <Files className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="phone-hide-label hidden sm:inline">
                    {isKhmer ? 'បកប្រែជាក្រុម (Batch)' : 'Batch Translation'}
                  </span>
                  <span className="phone-hide-label hidden sm:inline text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-200">
                    NEW
                  </span>
                </button>
              </div>

              {srtSubView === 'single' ? (
                <SrtEditor
                  appLang={appLang}
                  cues={cues}
                  onUpdateCues={handleUpdateCues}
                  onSendToDubbing={handleSendToDubbing}
                  onSendToVideoBurner={handleSendToVideoBurner}
                  onOpenHistory={handleOpenHistory}
                />
              ) : (
                <BatchTranslator
                  appLang={appLang}
                  onOpenInSrtStudio={(loadedCues) => {
                    setCues(loadedCues);
                    setSrtSubView('single');
                  }}
                  onOpenHistory={handleOpenHistory}
                />
              )}
            </div>
          )}

          {currentTab === 'batch-translator' && (
            <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4">
              <BatchTranslator
                appLang={appLang}
                onOpenInSrtStudio={(loadedCues) => {
                  setCues(loadedCues);
                  setCurrentTab('srt-editor');
                }}
                onOpenHistory={handleOpenHistory}
              />
            </div>
          )}

          {currentTab === 'srt-dubbing' && (
            <SrtDubbingStudio
              appLang={appLang}
              cues={cues}
              onUpdateCues={handleUpdateCues}
            />
          )}

          {currentTab === 'vocal-remover' && (
            <VocalSeparator appLang={appLang} />
          )}

          {currentTab === 'transcribe' && (
            <TranscribeStudio
              appLang={appLang}
              onSendToSrt={handleSendToSrtFromRecap}
            />
          )}

          {currentTab === 'video-burner' && (
            <VideoBurner
              appLang={appLang}
              cues={cues}
            />
          )}

          {currentTab === 'ocr-translate' && (
            <OcrTranslateStudio
              appLang={appLang}
              onSendToSrt={handleSendToSrtFromRecap}
            />
          )}
        </main>

        {/* Mobile Phone Bottom Navigation Dock: All Functions Shown as Icon Only */}
        <div className={isPhoneMode ? 'block' : 'block sm:hidden'}>
          <MobileBottomNav
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            appLang={appLang}
            onOpenHistory={handleOpenHistory}
          />
        </div>
      </div>

      {/* Cloud & Local Backup Modal */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        appLang={appLang}
        cues={cues}
        onRestoreCues={handleUpdateCues}
        recapDraft={recapDraft}
        onRestoreRecap={(draft) => {
          setRecapDraft(draft);
          saveLocalRecap(draft);
        }}
      />

      {/* Translation History Modal Panel */}
      <TranslationHistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        appLang={appLang}
        historyItems={historyItems}
        currentSrtText={stringifySrt(cues)}
        onRevertToHistoryItem={handleRevertToHistoryItem}
        onDeleteHistoryItem={handleDeleteHistoryItem}
        onClearAllHistory={handleClearAllHistory}
      />
    </div>
  );
}
