import React from 'react';
import { StudioTab } from '../types';
import {
  Film,
  FileText,
  Files,
  AudioWaveform,
  Scissors,
  Mic,
  Video,
  ScanText,
  History,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  appLang: 'km' | 'en';
  onOpenHistory: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  appLang,
  onOpenHistory,
}) => {
  const isKhmer = appLang === 'km';

  const navItems: Array<{
    id: StudioTab | 'history';
    icon: React.ReactNode;
    title: string;
    badge?: string;
  }> = [
    {
      id: 'recap',
      icon: <Film className="w-5 h-5" />,
      title: isKhmer ? 'សម្រាយរឿង' : 'Recap',
    },
    {
      id: 'srt-editor',
      icon: <FileText className="w-5 h-5" />,
      title: isKhmer ? 'SRT Editor' : 'SRT',
    },
    {
      id: 'batch-translator',
      icon: <Files className="w-5 h-5 text-amber-300" />,
      title: isKhmer ? 'បកប្រែជាក្រុម' : 'Batch',
      badge: 'NEW',
    },
    {
      id: 'srt-dubbing',
      icon: <AudioWaveform className="w-5 h-5" />,
      title: isKhmer ? 'Voiceover' : 'Dubbing',
    },
    {
      id: 'vocal-remover',
      icon: <Scissors className="w-5 h-5" />,
      title: isKhmer ? 'បំបែកសំឡេង' : 'Vocal',
    },
    {
      id: 'transcribe',
      icon: <Mic className="w-5 h-5" />,
      title: isKhmer ? 'Transcript' : 'Transcribe',
    },
    {
      id: 'video-burner',
      icon: <Video className="w-5 h-5" />,
      title: isKhmer ? 'វីដេអូ Subtitle' : 'Video Burn',
    },
    {
      id: 'ocr-translate',
      icon: <ScanText className="w-5 h-5" />,
      title: isKhmer ? 'ស្កេនរូបភាព' : 'OCR',
    },
    {
      id: 'history',
      icon: <History className="w-5 h-5 text-purple-400" />,
      title: isKhmer ? 'ប្រវត្តិបកប្រែ' : 'History',
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.8)] px-2 py-1.5"
    >
      <div className="flex items-center justify-around overflow-x-auto no-scrollbar gap-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isHistory = item.id === 'history';
          const isActive = !isHistory && currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isHistory) {
                  onOpenHistory();
                } else {
                  onSelectTab(item.id as StudioTab);
                }
              }}
              title={item.title}
              aria-label={item.title}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 relative cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-indigo-600/30 text-indigo-300 ring-1 ring-indigo-500/50 scale-105'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-950 animate-ping" />
                )}
              </div>
              <span className="text-[9px] font-medium tracking-tight mt-0.5 truncate max-w-[52px]">
                {item.title}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
