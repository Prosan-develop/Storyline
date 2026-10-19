import React, { useState, useRef, useEffect } from 'react';
import { SrtCue } from '../types';
import { synthesizeSpeechApi, speakWebSpeech } from '../services/geminiService';
import {
  Volume2,
  Play,
  Pause,
  Square,
  Download,
  Sparkles,
  User,
  Users,
  Mic,
  Loader2,
  CheckCircle2,
  Clock,
  AudioWaveform,
  AlertCircle,
} from 'lucide-react';

interface SrtDubbingStudioProps {
  appLang: 'km' | 'en';
  cues: SrtCue[];
  onUpdateCues: (cues: SrtCue[]) => void;
}

export const SrtDubbingStudio: React.FC<SrtDubbingStudioProps> = ({
  appLang,
  cues,
  onUpdateCues,
}) => {
  const isKhmer = appLang === 'km';

  // Voice Persona Settings
  const [narratorVoice, setNarratorVoice] = useState<'Kore' | 'Fenrir' | 'Puck' | 'Charon' | 'Zephyr'>('Kore');
  const [maleVoice, setMaleVoice] = useState<'Fenrir' | 'Charon' | 'Puck'>('Fenrir');
  const [femaleVoice, setFemaleVoice] = useState<'Kore' | 'Zephyr'>('Zephyr');
  const [engineMode, setEngineMode] = useState<'gemini' | 'local'>('gemini');

  // Playback & Synthesis states
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [activeCueId, setActiveCueId] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio elements & timeline
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [fullAudioBlob, setFullAudioBlob] = useState<Blob | null>(null);
  const [fullAudioUrl, setFullAudioUrl] = useState<string | null>(null);

  // Prebuilt voice descriptions
  const geminiVoices = [
    { id: 'Kore', label: isKhmer ? 'Kore (ស្រី - ធម្មជាតិ / ភាពយន្ត)' : 'Kore (Female - Cinematic Natural)' },
    { id: 'Zephyr', label: isKhmer ? 'Zephyr (ស្រី - ស្រទន់ / ឆ្លាតវៃ)' : 'Zephyr (Female - Soft & Clear)' },
    { id: 'Fenrir', label: isKhmer ? 'Fenrir (ប្រុស - រឹងមាំ / ជ្រៅ)' : 'Fenrir (Male - Deep & Heroic)' },
    { id: 'Charon', label: isKhmer ? 'Charon (ប្រុស - សំឡេងចាស់ទុំ / ធ្ងន់)' : 'Charon (Male - Authoritative)' },
    { id: 'Puck', label: isKhmer ? 'Puck (ប្រុស - រហ័សរហួន / ក្មេង)' : 'Puck (Male - Dynamic & Youthful)' },
  ];

  // Helper to determine which voice config to use for a cue
  const getVoiceForCue = (cue: SrtCue) => {
    if (cue.speaker === 'male') return maleVoice;
    if (cue.speaker === 'female') return femaleVoice;
    return narratorVoice;
  };

  // Generate single cue audio
  const handleGenerateCueAudio = async (cue: SrtCue) => {
    const cleanText = cue.text.replace(/^\[[^\]]+\]:?\s*/, '').trim();
    if (!cleanText) return;

    const voice = getVoiceForCue(cue);
    const updated = cues.map((c) => (c.id === cue.id ? { ...c, isSynthesizing: true } : c));
    onUpdateCues(updated);
    setErrorMessage(null);

    try {
      if (engineMode === 'gemini') {
        const { audioUrl } = await synthesizeSpeechApi({
          text: cleanText,
          voiceName: voice,
          style:
            cue.speaker === 'male'
              ? 'Male movie character dialogue'
              : cue.speaker === 'female'
              ? 'Female movie character dialogue'
              : 'Cinematic documentary narration',
        });

        const next = cues.map((c) => (c.id === cue.id ? { ...c, audioUrl, isSynthesizing: false } : c));
        onUpdateCues(next);

        // Play audition immediately
        const audio = new Audio(audioUrl);
        audio.play();
      } else {
        // Free Local Web Speech
        await speakWebSpeech(cleanText, {
          lang: isKhmer ? 'km-KH' : 'en-US',
          gender: cue.speaker === 'female' ? 'female' : 'male',
          pitch: cue.speaker === 'female' ? 1.2 : cue.speaker === 'male' ? 0.9 : 1.0,
        });
        const next = cues.map((c) => (c.id === cue.id ? { ...c, isSynthesizing: false } : c));
        onUpdateCues(next);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error generating cue audio');
      const next = cues.map((c) => (c.id === cue.id ? { ...c, isSynthesizing: false } : c));
      onUpdateCues(next);
    }
  };

  // Batch synthesize all cues
  const handleBatchSynthesizeAll = async () => {
    if (cues.length === 0) return;
    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: cues.length });
    setErrorMessage(null);

    const updatedCues = [...cues];
    const generatedAudioBuffers: Uint8Array[] = [];

    try {
      for (let i = 0; i < updatedCues.length; i++) {
        setBatchProgress({ current: i + 1, total: updatedCues.length });
        const cue = updatedCues[i];
        const cleanText = cue.text.replace(/^\[[^\]]+\]:?\s*/, '').trim();

        if (cleanText) {
          try {
            const voice = getVoiceForCue(cue);
            const { audioUrl, base64 } = await synthesizeSpeechApi({
              text: cleanText,
              voiceName: voice,
              style:
                cue.speaker === 'male'
                  ? 'Male movie character'
                  : cue.speaker === 'female'
                  ? 'Female movie character'
                  : 'Cinematic documentary story narration',
            });

            updatedCues[i] = {
              ...cue,
              audioUrl,
            };

            // Collect binary for concatenation
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let b = 0; b < binary.length; b++) {
              bytes[b] = binary.charCodeAt(b);
            }
            generatedAudioBuffers.push(bytes);
          } catch (e) {
            console.warn(`Failed synthesis for cue #${cue.id}`, e);
          }
        }
      }

      onUpdateCues(updatedCues);

      // Concatenate WAV clips if available
      if (generatedAudioBuffers.length > 0) {
        // Strip 44-byte WAV header for subsequent files to make a valid WAV sequence
        const combinedParts: Uint8Array[] = [];
        for (let idx = 0; idx < generatedAudioBuffers.length; idx++) {
          const buf = generatedAudioBuffers[idx];
          if (idx === 0) {
            combinedParts.push(buf);
          } else {
            // strip first 44 bytes (WAV header)
            combinedParts.push(buf.slice(44));
          }
        }
        const fullBlob = new Blob(combinedParts as any, { type: 'audio/wav' });
        setFullAudioBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setFullAudioUrl(url);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Batch dubbing failed');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  // Play through all cues sequentially
  const handlePlayThroughCues = async () => {
    if (isPlayingAll) {
      setIsPlayingAll(false);
      setActiveCueId(null);
      return;
    }

    setIsPlayingAll(true);

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];
      setActiveCueId(cue.id);
      const cleanText = cue.text.replace(/^\[[^\]]+\]:?\s*/, '').trim();

      if (cue.audioUrl) {
        await new Promise<void>((resolve) => {
          const audio = new Audio(cue.audioUrl);
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
      } else {
        // Fallback Web Speech
        await speakWebSpeech(cleanText, {
          lang: isKhmer ? 'km-KH' : 'en-US',
          gender: cue.speaker === 'female' ? 'female' : 'male',
        }).catch(() => {});
      }
      // Small pause between cues
      await new Promise((r) => setTimeout(r, 200));
    }

    setIsPlayingAll(false);
    setActiveCueId(null);
  };

  // Download full narration track
  const handleDownloadFullAudio = () => {
    if (!fullAudioUrl) return;
    const a = document.createElement('a');
    a.href = fullAudioUrl;
    a.download = `narration_full_track_${Date.now()}.wav`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/40 border border-purple-500/20 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 text-purple-400 text-xs font-semibold">
              <AudioWaveform className="w-4 h-4" />
              <span>{isKhmer ? 'ស្ទូឌីយោបំប្លែង SRT ជាសំឡេងប្រុស-ស្រី' : 'Multi-Voice SRT Dubbing Studio'}</span>
            </div>
            <h1 className="text-xl font-bold text-white">
              {isKhmer ? 'បង្កើតសំឡេង Voiceover ចេញពី Subtitles ដោយស្វ័យប្រវត្តិ' : 'Auto-Generate Voiceover from Subtitles'}
            </h1>
            <p className="text-xs text-slate-300">
              {isKhmer
                ? 'កំណត់សំឡេងដាច់ដោយឡែកសម្រាប់ [អ្នកសម្រាយ], [តួប្រុស], និង [តួស្រី] ហើយបង្កើតជាសម្លេងពេញលេញ!'
                : 'Assign distinct voices for Narrator, Male and Female dialogue cues, with instant audition & full-track download.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={handlePlayThroughCues}
              title={isPlayingAll ? (isKhmer ? 'ផ្អាកចាក់' : 'Pause Sequential') : (isKhmer ? 'ចាក់ស្តាប់តាមលំដាប់' : 'Play All Cues')}
              aria-label="Play All Cues"
              className={`flex items-center space-x-2 p-2 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isPlayingAll ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {isPlayingAll ? <Pause className="w-4 h-4 shrink-0" /> : <Play className="w-4 h-4 text-emerald-400 shrink-0" />}
              <span className="phone-hide-label hidden sm:inline">{isPlayingAll ? (isKhmer ? 'ផ្អាកចាក់' : 'Pause Sequential') : (isKhmer ? 'ចាក់ស្តាប់តាមលំដាប់' : 'Play All Cues')}</span>
            </button>

            {fullAudioUrl && (
              <button
                onClick={handleDownloadFullAudio}
                title={isKhmer ? 'ទាញយកសំឡេងរួម (.WAV)' : 'Download Full WAV'}
                aria-label="Download Full WAV"
                className="flex items-center space-x-1.5 p-2 sm:px-4 sm:py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ទាញយកសំឡេងរួម (.WAV)' : 'Download Full WAV'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Voice Casting & Config Row */}
      <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-lg border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-bold text-white">
              {isKhmer ? 'ការកំណត់សំឡេងតួអង្គ (Voice Casting)' : 'Voice Casting & Personas'}
            </span>
          </div>

          {/* Engine Selector */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">{isKhmer ? 'ម៉ាស៊ីនសំឡេង៖' : 'Engine:'}</span>
            <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
              <button
                onClick={() => setEngineMode('gemini')}
                className={`px-3 py-1 rounded-md transition ${
                  engineMode === 'gemini'
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gemini 3.8 Flash-Lite TTS
              </button>
              <button
                onClick={() => setEngineMode('local')}
                className={`px-3 py-1 rounded-md transition ${
                  engineMode === 'local'
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Free Local Web Speech
              </button>
            </div>
          </div>
        </div>

        {/* 3 Voice Slots: Narrator, Male, Female */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Narrator Voice */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
              <Mic className="w-4 h-4" />
              <span>{isKhmer ? '🎙️ សំឡេងអ្នកសម្រាយ (Narrator)' : '🎙️ Narrator Voice'}</span>
            </div>
            <select
              value={narratorVoice}
              onChange={(e) => setNarratorVoice(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {geminiVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {/* Male Dialogue Voice */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-blue-900/30 space-y-2">
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold">
              <User className="w-4 h-4" />
              <span>{isKhmer ? '👨 សំឡេងតួប្រុស (Male Dialogue)' : '👨 Male Character Voice'}</span>
            </div>
            <select
              value={maleVoice}
              onChange={(e) => setMaleVoice(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Fenrir">Fenrir (ជ្រៅ & ម៉ឺងម៉ាត់ / Deep Heroic)</option>
              <option value="Charon">Charon (សំឡេងចាស់ទុំ / Authoritative)</option>
              <option value="Puck">Puck (ក្មេងរហ័ស / Youthful)</option>
            </select>
          </div>

          {/* Female Dialogue Voice */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-pink-900/30 space-y-2">
            <div className="flex items-center space-x-2 text-pink-400 text-xs font-semibold">
              <User className="w-4 h-4" />
              <span>{isKhmer ? '👩 សំឡេងតួស្រី (Female Dialogue)' : '👩 Female Character Voice'}</span>
            </div>
            <select
              value={femaleVoice}
              onChange={(e) => setFemaleVoice(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-pink-500"
            >
              <option value="Zephyr">Zephyr (ស្រទន់ & ច្បាស់ / Soft & Articulate)</option>
              <option value="Kore">Kore (ធម្មជាតិ / Cinematic Expressive)</option>
            </select>
          </div>
        </div>

        {/* Batch action button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {cues.filter((c) => Boolean(c.audioUrl)).length} / {cues.length}{' '}
            {isKhmer ? 'Cues មានសំឡេងរួចរាល់' : 'cues with generated audio'}
          </div>

          <button
            onClick={handleBatchSynthesizeAll}
            disabled={isBatchGenerating || cues.length === 0}
            title={isKhmer ? 'បង្កើតសំឡេងទាំងអស់' : 'Synthesize All Cues'}
            aria-label="Synthesize All Cues"
            className="w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
          >
            {isBatchGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="phone-hide-label hidden sm:inline">
                  {isKhmer ? 'កំពុងបង្កើតសំឡេង' : 'Synthesizing'} ({batchProgress.current}/
                  {batchProgress.total})...
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'បង្កើតសំឡេងទាំងអស់ (Synthesize All Cues)' : 'Synthesize All Cues'}</span>
              </>
            )}
          </button>
        </div>

        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Cues List with Voice Audition & Individual Generation */}
      <div className="space-y-3">
        {cues.map((cue, idx) => {
          const isActive = activeCueId === cue.id;
          const assignedVoice = getVoiceForCue(cue);
          const hasAudio = Boolean(cue.audioUrl);

          return (
            <div
              key={cue.id}
              className={`p-4 rounded-xl border transition-all duration-200 ${
                isActive
                  ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/50 shadow-lg'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/50">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {cue.startTime} → {cue.endTime}
                  </span>

                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      cue.speaker === 'male'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : cue.speaker === 'female'
                        ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}
                  >
                    {cue.speaker === 'male'
                      ? '👨 ប្រុស (Male)'
                      : cue.speaker === 'female'
                      ? '👩 ស្រី (Female)'
                      : '🎙️ អ្នកសម្រាយ'}
                  </span>

                  <span className="text-[10px] text-slate-400 font-mono">
                    Voice: {assignedVoice}
                  </span>
                </div>

                {/* Individual Audition / Generate */}
                <div className="flex items-center space-x-2">
                  {hasAudio && (
                    <span className="text-emerald-400 text-xs flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] hidden sm:inline">Ready</span>
                    </span>
                  )}

                  <button
                    onClick={() => handleGenerateCueAudio(cue)}
                    disabled={cue.isSynthesizing}
                    title={
                      hasAudio
                        ? isKhmer ? 'ចាក់ស្តាប់' : 'Play'
                        : isKhmer ? 'បង្កើតសំឡេង' : 'Generate Voice'
                    }
                    aria-label="Generate or Play Voice"
                    className="flex items-center space-x-1.5 p-1.5 sm:px-3 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition cursor-pointer"
                  >
                    {cue.isSynthesizing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400 shrink-0" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    )}
                    <span className="phone-hide-label hidden sm:inline">
                      {hasAudio
                        ? isKhmer
                          ? 'ចាក់ស្តាប់'
                          : 'Play'
                        : isKhmer
                        ? 'បង្កើតសំឡេង'
                        : 'Generate Voice'}
                    </span>
                  </button>

                  {cue.audioUrl && (
                    <a
                      href={cue.audioUrl}
                      download={`cue_${cue.id}_${cue.speaker || 'narrator'}.wav`}
                      title="Download clip"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Cue Spoken Line */}
              <p className="text-sm text-slate-200 pt-2 font-medium leading-relaxed">
                {cue.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
