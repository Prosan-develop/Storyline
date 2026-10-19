import React from 'react';
import { StudioTab } from '../types';
import {
  Film,
  FileText,
  Files,
  Mic,
  Scissors,
  AudioWaveform,
  Video,
  ScanText,
  Languages,
  FolderDown,
  Sparkles,
  History,
  Smartphone,
} from 'lucide-react';

interface HeaderProps {
  currentTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  appLang: 'km' | 'en';
  onToggleLang: () => void;
  onOpenBackup: () => void;
  onOpenHistory: () => void;
  isPhoneMode: boolean;
  onTogglePhoneMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  appLang,
  onToggleLang,
  onOpenBackup,
  onOpenHistory,
  isPhoneMode,
  onTogglePhoneMode,
}) => {
  const isKhmer = appLang === 'km';

  const tabs: Array<{ id: StudioTab; label: string; icon: React.ReactNode; badge?: string }> = [
    {
      id: 'recap',
      label: isKhmer ? 'សម្រាយរឿង AI' : 'Story Recap AI',
      icon: <Film className="w-4 h-4" />,
      badge: 'PRO',
    },
    {
      id: 'srt-editor',
      label: isKhmer ? 'កែប្រែ SRT' : 'SRT Studio',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'batch-translator',
      label: isKhmer ? 'បកប្រែជាក្រុម (Batch)' : 'Batch Translation',
      icon: <Files className="w-4 h-4" />,
      badge: 'NEW',
    },
    {
      id: 'srt-dubbing',
      label: isKhmer ? 'Voiceover ប្រុស-ស្រី' : 'Multi-Voice Dubbing',
      icon: <AudioWaveform className="w-4 h-4" />,
    },
    {
      id: 'vocal-remover',
      label: isKhmer ? 'បំបែកសំឡេងច្រៀង' : 'Vocal Remover',
      icon: <Scissors className="w-4 h-4" />,
      badge: 'DSP',
    },
    {
      id: 'transcribe',
      label: isKhmer ? 'Transcript សំឡេង' : 'Audio Transcribe',
      icon: <Mic className="w-4 h-4" />,
    },
    {
      id: 'video-burner',
      label: isKhmer ? 'បញ្ចូល Subtitle ក្នុងវីដេអូ' : 'Hardsub Video Player',
      icon: <Video className="w-4 h-4" />,
    },
    {
      id: 'ocr-translate',
      label: isKhmer ? 'ស្កេនរូបភាព OCR' : 'Image OCR Translate',
      icon: <ScanText className="w-4 h-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('recap')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                  KromaRecap AI
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {isKhmer ? 'ស្ទូឌីយោបកប្រែ & សម្រាយរឿងបែបភាពយន្ត' : 'Cinematic Story & Subtitle Studio'}
              </p>
            </div>
          </div>

          {/* Quick Action Tools: Icon-only on phone screens / model */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Phone Model Toggle Button */}
            <button
              onClick={onTogglePhoneMode}
              title={
                isPhoneMode
                  ? isKhmer ? 'បិទការត្រាប់តាមទូរស័ព្ទ (Desktop View)' : 'Exit Phone Mode'
                  : isKhmer ? 'បើកទម្រង់ទូរស័ព្ទ (Phone Model View - Icon Only)' : 'Phone Model View (Icon Only)'
              }
              aria-label="Toggle Phone Mode"
              className={`flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                isPhoneMode
                  ? 'text-cyan-200 bg-cyan-950/80 border border-cyan-500/60 shadow-md shadow-cyan-900/30 ring-1 ring-cyan-400/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              <Smartphone className={`w-4 h-4 ${isPhoneMode ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
              <span className="phone-hide-label hidden sm:inline">
                {isPhoneMode ? (isKhmer ? 'ទម្រង់ទូរស័ព្ទ' : 'Phone Mode') : (isKhmer ? 'ទូរស័ព្ទ' : 'Phone')}
              </span>
            </button>

            {/* Translation History Modal Button */}
            <button
              onClick={onOpenHistory}
              title={isKhmer ? 'ប្រវត្តិការបកប្រែ (Translation History)' : 'Translation History'}
              aria-label="Translation History"
              className="flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium text-purple-300 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-700/40 transition cursor-pointer"
            >
              <History className="w-4 h-4 text-purple-400" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ប្រវត្តិ' : 'History'}</span>
            </button>

            {/* Backup & Sync Modal Button */}
            <button
              onClick={onOpenBackup}
              title={isKhmer ? 'បម្រុងទុក និងទាញយកគម្រោង (Cloud / Local Backup)' : 'Backup & Sync Project'}
              aria-label="Backup & Sync"
              className="flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-800 hover:text-white border border-slate-700/60 transition cursor-pointer"
            >
              <FolderDown className="w-4 h-4 text-indigo-400" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'បម្រុងទុក & Sync' : 'Backup'}</span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={onToggleLang}
              title={isKhmer ? 'ប្តូរភាសា (Switch Language)' : 'Switch Language'}
              aria-label="Switch Language"
              className="flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-700/30 transition cursor-pointer"
            >
              <Languages className="w-4 h-4" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ភាសាខ្មែរ' : 'English'}</span>
            </button>
          </div>
        </div>

        {/* Studio Navigation Bar: Icon-only on phone models, text + icon on tablets/desktop */}
        <div className="flex items-center justify-between sm:justify-start space-x-1 overflow-x-auto py-2 no-scrollbar border-t border-slate-800/40">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                title={tab.label}
                aria-label={tab.label}
                className={`flex items-center space-x-1.5 p-2.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
              >
                <span className="shrink-0">{tab.icon}</span>
                <span className="phone-hide-label hidden sm:inline">{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`phone-hide-label hidden md:inline text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                      isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
