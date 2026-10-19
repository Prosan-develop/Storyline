import React, { useState, useEffect, useId } from 'react';
import { SrtCue, StoryRecapResult } from '../types';
import { stringifySrt, parseSrt } from '../utils/srtParser';
import {
  FolderDown,
  Upload,
  Download,
  Cloud,
  CheckCircle2,
  HardDrive,
  Wifi,
  WifiOff,
  X,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  appLang: 'km' | 'en';
  cues: SrtCue[];
  onRestoreCues: (cues: SrtCue[]) => void;
  recapDraft?: StoryRecapResult | null;
  onRestoreRecap?: (recap: StoryRecapResult) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  appLang,
  cues,
  onRestoreCues,
  recapDraft,
  onRestoreRecap,
}) => {
  const isKhmer = appLang === 'km';
  const fileInputId = useId();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSavedTime, setLastSavedTime] = useState<string>(new Date().toLocaleTimeString());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOpen) return null;

  // Export full project JSON
  const handleExportProject = () => {
    const projectData = {
      version: '1.0',
      appName: 'KromaRecap AI Studio',
      exportedAt: new Date().toISOString(),
      cues,
      recapDraft,
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kromarecap_project_backup_${Date.now()}.cinerecap`;
    a.click();
    URL.revokeObjectURL(url);

    setStatusMessage(isKhmer ? 'បានទាញយកឯកសារបម្រុងទុកដោយជោគជ័យ!' : 'Project backup exported successfully!');
    setLastSavedTime(new Date().toLocaleTimeString());
  };

  // Import full project JSON
  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.cues && Array.isArray(parsed.cues)) {
          onRestoreCues(parsed.cues);
        }
        if (parsed.recapDraft && onRestoreRecap) {
          onRestoreRecap(parsed.recapDraft);
        }
        setStatusMessage(isKhmer ? 'បានស្តារគម្រោងដោយជោគជ័យ!' : 'Project restored successfully!');
      } catch (err: any) {
        setStatusMessage(isKhmer ? 'ឯកសារមិនត្រឹមត្រូវ' : 'Invalid backup file format');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {isKhmer ? 'ការបម្រុងទុក & សមកាលកម្មទិន្នន័យ (Backup & Sync)' : 'Cloud & Offline Data Sync'}
            </h3>
            <p className="text-xs text-slate-400">
              {isKhmer ? 'រក្សាទុកទិន្នន័យឆ្លងឧបករណ៍ និងធ្វើការក្រៅបណ្តាញ' : 'Cross-device sync & offline backup'}
            </p>
          </div>
        </div>

        {/* Online / Offline status badge */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">
                  {isKhmer ? 'ភ្ជាប់អ៊ីនធឺណិត (Online Mode)' : 'Connected Online'}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-semibold">
                  {isKhmer ? 'ដំណើរការក្រៅបណ្តាញ (Offline Mode)' : 'Offline Mode (Local Storage)'}
                </span>
              </>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            {isKhmer ? 'បានរក្សាទុកចុងក្រោយ៖ ' : 'Autosaved at: '}
            {lastSavedTime}
          </span>
        </div>

        {/* Current Project Snapshot */}
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1.5 text-xs text-slate-300">
          <div className="font-semibold text-slate-200">
            {isKhmer ? 'ព័ត៌មានគម្រោងបច្ចុប្បន្ន៖' : 'Current Project Details:'}
          </div>
          <div className="flex justify-between text-slate-400">
            <span>{isKhmer ? 'ចំនួន Subtitle Cues:' : 'Subtitle Cues:'}</span>
            <span className="font-mono text-indigo-300">{cues.length}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>{isKhmer ? 'ស្គ្រីបសម្រាយរឿង:' : 'Recap Script Draft:'}</span>
            <span className="font-mono text-emerald-300">
              {recapDraft ? recapDraft.title.slice(0, 24) + '...' : isKhmer ? 'គ្មាន' : 'None'}
            </span>
          </div>
        </div>

        {statusMessage && (
          <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleExportProject}
            className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isKhmer ? 'ទាញយក Backup (.cinerecap)' : 'Export Backup'}</span>
          </button>

          <div>
            <input
              type="file"
              accept=".cinerecap,.json"
              id={fileInputId}
              className="hidden"
              onChange={handleImportProject}
            />
            <label
              htmlFor={fileInputId}
              className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer transition"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>{isKhmer ? 'ស្តារឡើងវិញ (Import)' : 'Import Backup'}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
