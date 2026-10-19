import React, { useState } from 'react';
import { StoryRecapResult, StudioTab } from '../types';
import {
  generateStoryRecapApi,
  speakWebSpeech,
  synthesizeSpeechApi,
} from '../services/geminiService';
import {
  SAMPLE_RECAP_PROMPT_KHMER,
  SAMPLE_STORY_RESULT,
  saveLocalRecap,
} from '../utils/storage';
import {
  Sparkles,
  Play,
  Volume2,
  Copy,
  Check,
  Send,
  Clapperboard,
  Clock,
  Layers,
  ArrowRight,
  BookOpen,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface RecapStudioProps {
  appLang: 'km' | 'en';
  onSendToSrt: (srtText: string) => void;
  onSendToDubbing: (srtText: string) => void;
  onNavigateTab: (tab: StudioTab) => void;
  initialRecap?: StoryRecapResult | null;
}

export const RecapStudio: React.FC<RecapStudioProps> = ({
  appLang,
  onSendToSrt,
  onSendToDubbing,
  initialRecap,
}) => {
  const isKhmer = appLang === 'km';

  const [storyInput, setStoryInput] = useState('');
  const [genre, setGenre] = useState('dramatic');
  const [duration, setDuration] = useState(5);
  const [includeDialogue, setIncludeDialogue] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recapResult, setRecapResult] = useState<StoryRecapResult | null>(
    initialRecap || SAMPLE_STORY_RESULT
  );
  const [copied, setCopied] = useState(false);
  const [playingVoice, setPlayingVoice] = useState(false);

  const presets = [
    {
      title: isKhmer ? 'ប្រាសាទអាថ៌កំបាំង' : 'Ancient Temple Mystery',
      text: SAMPLE_RECAP_PROMPT_KHMER,
    },
    {
      title: isKhmer ? 'ដំណើរផ្សងព្រេងអវកាស' : 'Sci-Fi Space Odyssey',
      text: isKhmer
        ? `នាពេលអនាគតឆ្នាំ ២០៩០ យានអវកាសមួយបានបាត់ទំនាក់ទំនងនៅជិតភពព្រះអង្គារ។ ក្រុមអ្នករុករកពីរនាក់ ប្រុសនិងស្រី បានរកឃើញសំណង់អរិយធម៌ចាស់ដែលមានសារព្រមានអំពីគ្រោះមហន្តរាយដែលអាចបំផ្លាញផែនដី។`
        : `In the year 2090, a deep space probe goes silent near Mars. Two astronauts discover ancient alien ruins carrying a dire warning.`,
    },
    {
      title: isKhmer ? 'រឿងស៊ើបអង្កេតឃាតកម្ម' : 'Detective Murder Mystery',
      text: isKhmer
        ? `នៅក្នុងភូមិគ្រឹះត្រកូលអភិជនដ៏ស្ងប់ស្ងាត់ មហាសេដ្ឋីម្នាក់ត្រូវបានគេធ្វើឃាតនៅយប់ថ្ងៃខួបកំណើត។ មេប៉ូលិស និងជំនួយការស្រីដ៏ឆ្លាតវៃ បានសាកសួរជនសង្ស័យទាំង ៤ នាក់ដែលមានហេតុផលសងសឹកផ្សេងៗគ្នា។`
        : `Inside a secluded mansion, a billionaire is poisoned on his birthday. A veteran detective and his sharp female protege interrogate four suspects.`,
    },
  ];

  const handleGenerate = async () => {
    if (!storyInput.trim()) {
      setError(
        isKhmer
          ? 'សូមបញ្ចូលសាច់រឿង ឬជ្រើសរើសគំរូសាច់រឿងជាមុនសិន!'
          : 'Please enter a story prompt or pick a preset first!'
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await generateStoryRecapApi({
        storyText: storyInput,
        genre,
        targetLanguage: 'km',
        durationMinutes: duration,
        includeDialogue,
      });

      setRecapResult(result);
      saveLocalRecap(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate story recap');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyScript = () => {
    if (!recapResult) return;
    const fullText = `# ${recapResult.title}\n\n## Hook Intro\n${recapResult.hookIntro}\n\n## Synopsis\n${recapResult.synopsis}\n\n## Full Narration Script\n${recapResult.fullNarration}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayHook = async (text: string) => {
    if (playingVoice) return;
    setPlayingVoice(true);
    try {
      // Try Gemini TTS first; fallback to browser Web Speech
      try {
        const { audioUrl } = await synthesizeSpeechApi({
          text,
          voiceName: 'Kore',
          style: 'Cinematic, dramatic documentary narrator',
        });
        const audio = new Audio(audioUrl);
        audio.onended = () => setPlayingVoice(false);
        audio.onerror = () => {
          speakWebSpeech(text, { lang: 'km-KH', pitch: 1.0, rate: 0.95 }).finally(() =>
            setPlayingVoice(false)
          );
        };
        await audio.play();
      } catch {
        await speakWebSpeech(text, { lang: 'km-KH', pitch: 1.0, rate: 0.95 });
        setPlayingVoice(false);
      }
    } catch {
      setPlayingVoice(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/50 border border-indigo-500/20 p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isKhmer ? 'ប្រព័ន្ធឆ្លាតវៃសម្រាយរឿងបែបភាពយន្ត' : 'Cinematic Story Recapper'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {isKhmer
                ? 'បង្កើតស្គ្រីបសម្រាយរឿង និង Subtitle ដោយស្វ័យប្រវត្តិ'
                : 'AI Movie Recap & Script Studio'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {isKhmer
                ? 'បញ្ចូលសាច់រឿង សង្ខេបភាពយន្ត ឬគំនិតរបស់អ្នក ដើម្បីឱ្យ AI បង្កើតស្គ្រីបសម្រាយរឿងទាក់ទាញ កំណត់ឈុតឆាក និងបំប្លែងជា Subtitle SRT ភ្លាមៗ!'
                : 'Turn any plot, novel chapter, or movie synopsis into an engaging viral recap script with scene breakdowns, hook intros, and timed SRT subtitles!'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {recapResult?.srtSubtitles && (
              <button
                onClick={() => onSendToSrt(recapResult.srtSubtitles!)}
                title={isKhmer ? 'បញ្ជូនទៅកែសម្រួល SRT' : 'Edit in SRT Studio'}
                aria-label="Edit in SRT Studio"
                className="flex items-center space-x-2 p-2 sm:px-4 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <ArrowRight className="w-4 h-4 shrink-0" />
                <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'បញ្ជូនទៅកែសម្រួល SRT' : 'Edit in SRT Studio'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form & Controls */}
        <div className="lg:col-span-5 space-y-5">
          <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>{isKhmer ? 'បញ្ចូលសាច់រឿង ឬគ្រោងរឿង' : 'Story Content / Plot'}</span>
              </label>
              <span className="text-[11px] text-slate-400">{storyInput.length} chars</span>
            </div>

            {/* Preset quick buttons */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-400">{isKhmer ? 'ជ្រើសរើសគំរូសាកល្បង៖' : 'Quick Presets:'}</div>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setStoryInput(p.text)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={7}
              value={storyInput}
              onChange={(e) => setStoryInput(e.target.value)}
              placeholder={
                isKhmer
                  ? 'សរសេររឿង ឬបិទភ្ជាប់អត្ថបទនៅទីនេះ (ឧ. រឿងព្រេង រឿងកុន រឿងប្រឌិត...)'
                  : 'Write or paste story summary, movie scenes, or script here...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition font-sans"
            />

            {/* Configuration Row */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1">
                  <Clapperboard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isKhmer ? 'ទម្រង់ / ចរិតរឿង' : 'Genre & Tone'}</span>
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="dramatic">{isKhmer ? 'រំជួលចិត្ត (Dramatic)' : 'Dramatic'}</option>
                  <option value="suspense">{isKhmer ? 'ភ័យរន្ធត់ / អាថ៌កំបាំង (Suspense)' : 'Suspense / Thriller'}</option>
                  <option value="action">{isKhmer ? 'សកម្មភាពរហ័ស (Action-Packed)' : 'Action-Packed'}</option>
                  <option value="emotional">{isKhmer ? 'កម្សត់ / មនោសញ្ចេតនា (Emotional)' : 'Emotional / Sad'}</option>
                  <option value="comedy">{isKhmer ? 'បែបកំប្លែងសើចសប្បាយ (Comedy)' : 'Comedy / Funny'}</option>
                  <option value="documentary">{isKhmer ? 'ឯកសារវិទ្យាសាស្ត្រ (Documentary)' : 'Documentary'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isKhmer ? 'រយៈពេលវីដេអូ' : 'Target Length'}</span>
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={3}>~ 3 {isKhmer ? 'នាទី (Short)' : 'mins (Short)'}</option>
                  <option value={5}>~ 5 {isKhmer ? 'នាទី (Standard)' : 'mins (Standard)'}</option>
                  <option value={10}>~ 10 {isKhmer ? 'នាទី (Deep Dive)' : 'mins (Deep Dive)'}</option>
                </select>
              </div>
            </div>

            {/* Checkbox: Include Male/Female Dialogue */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="includeDialogue"
                checked={includeDialogue}
                onChange={(e) => setIncludeDialogue(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
              />
              <label htmlFor="includeDialogue" className="text-xs text-slate-300 cursor-pointer select-none">
                {isKhmer
                  ? 'បែងចែកតួអង្គសន្ទនា ប្រុស-ស្រី ក្នុងស្គ្រីប (Male & Female Dialogue Tags)'
                  : 'Include Male & Female Character Dialogue Tags'}
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/30 flex items-start space-x-2 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isKhmer ? 'កំពុងវិភាគ និងបង្កើតស្គ្រីបសម្រាយរឿង...' : 'Generating Movie Recap Script...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isKhmer ? 'បង្កើតស្គ្រីបសម្រាយរឿង (Generate Recap)' : 'Generate Movie Recap Script'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Generated Recap Results Display */}
        <div className="lg:col-span-7 space-y-5">
          {recapResult ? (
            <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl border border-slate-800/90">
              {/* Header result row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase">
                    {isKhmer ? 'ចំណងជើងវីដេអូ' : 'Recap Title'}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white">{recapResult.title}</h2>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyScript}
                    title={isKhmer ? 'ចម្លងស្គ្រីប' : 'Copy Script'}
                    aria-label="Copy Script"
                    className="flex items-center space-x-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                    <span className="phone-hide-label hidden sm:inline">{copied ? (isKhmer ? 'បានចម្លង!' : 'Copied!') : (isKhmer ? 'ចម្លងស្គ្រីប' : 'Copy Script')}</span>
                  </button>

                  {recapResult.srtSubtitles && (
                    <button
                      onClick={() => onSendToDubbing(recapResult.srtSubtitles!)}
                      title={isKhmer ? 'បង្កើតសំឡេង' : 'Voice Dub'}
                      aria-label="Voice Dub"
                      className="flex items-center space-x-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-purple-600/90 hover:bg-purple-500 text-white text-xs font-medium transition cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'បង្កើតសំឡេង' : 'Voice Dub'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Hook Intro */}
              <div className="rounded-xl bg-indigo-950/40 border border-indigo-500/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-indigo-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{isKhmer ? 'វគ្គបើកឆាកទាក់ទាញ (Viral Hook Intro)' : 'Viral Hook Intro'}</span>
                  </div>
                  <button
                    onClick={() => handlePlayHook(recapResult.hookIntro)}
                    disabled={playingVoice}
                    title={isKhmer ? 'ស្តាប់សំឡេងអាន' : 'Listen Voice'}
                    aria-label="Listen Voice"
                    className="flex items-center space-x-1 text-xs text-indigo-300 hover:text-white p-1.5 sm:px-2 sm:py-0.5 rounded bg-indigo-800/40 hover:bg-indigo-800/70 transition cursor-pointer"
                  >
                    {playingVoice ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : <Play className="w-3 h-3 shrink-0" />}
                    <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ស្តាប់សំឡេងអាន' : 'Listen Voice'}</span>
                  </button>
                </div>
                <p className="text-sm text-indigo-100 italic leading-relaxed">
                  "{recapResult.hookIntro}"
                </p>
              </div>

              {/* Synopsis */}
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {isKhmer ? 'សង្ខេបសាច់រឿង (Synopsis)' : 'Plot Synopsis'}
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                  {recapResult.synopsis}
                </p>
              </div>

              {/* Scene Breakdown */}
              {recapResult.scenes && recapResult.scenes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>{isKhmer ? 'ការបែងចែកឈុតឆាក និងការសន្ទនា (Scene Breakdown)' : 'Scene Breakdown & Dialogues'}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {recapResult.scenes.length} {isKhmer ? 'ឈុត' : 'scenes'}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {recapResult.scenes.map((scene, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-400">
                            {isKhmer ? `ឈុតទី ${scene.sceneNumber}` : `Scene ${scene.sceneNumber}`}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-800">
                            {scene.timeCode}
                          </span>
                        </div>
                        <div className="text-slate-300">
                          <span className="text-slate-400 font-semibold">{isKhmer ? 'រូបភាព៖ ' : 'Visual: '}</span>
                          {scene.visualDescription}
                        </div>
                        <div className="text-slate-200">
                          <span className="text-indigo-300 font-semibold">{isKhmer ? 'អ្នកសម្រាយ៖ ' : 'Voiceover: '}</span>
                          {scene.narration}
                        </div>
                        {scene.characterVoices && scene.characterVoices.length > 0 && (
                          <div className="pt-1 border-t border-slate-800/60 space-y-1">
                            {scene.characterVoices.map((char, cIdx) => (
                              <div key={cIdx} className="text-slate-300 text-[11px] flex items-start space-x-1">
                                <span className="font-medium text-purple-400 shrink-0">[{char.speaker}]:</span>
                                <span>{char.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Toolbar to other studios */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2 sm:gap-3">
                {recapResult.srtSubtitles && (
                  <>
                    <button
                      onClick={() => onSendToSrt(recapResult.srtSubtitles!)}
                      title={isKhmer ? 'បញ្ជូនទៅកែសម្រួល Subtitle SRT' : 'Edit in SRT Studio'}
                      aria-label="Edit in SRT Studio"
                      className="flex items-center space-x-2 p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition cursor-pointer"
                    >
                      <Send className="w-4 h-4 shrink-0" />
                      <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'បញ្ជូនទៅកែសម្រួល Subtitle SRT' : 'Edit in SRT Studio'}</span>
                    </button>

                    <button
                      onClick={() => onSendToDubbing(recapResult.srtSubtitles!)}
                      title={isKhmer ? 'បង្កើតសំឡេងប្រុសស្រី (Dubbing)' : 'Generate Multi-Voice Dubbing'}
                      aria-label="Generate Multi-Voice Dubbing"
                      className="flex items-center space-x-2 p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold transition cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4 shrink-0" />
                      <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'បង្កើតសំឡេងប្រុសស្រី (Dubbing)' : 'Generate Multi-Voice Dubbing'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
              <Clapperboard className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-slate-300">
                {isKhmer ? 'មិនទាន់មានស្គ្រីបសម្រាយរឿងនៅឡើយទេ' : 'No Recap Script Generated Yet'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isKhmer
                  ? 'សូមបំពេញសាច់រឿងនៅខាងឆ្វេង ឬចុចលើគំរូសាកល្បង ដើម្បីចាប់ផ្តើមបង្កើត!'
                  : 'Enter a story summary on the left or click a sample preset to generate.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
