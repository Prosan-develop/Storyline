import React, { useState, useRef, useEffect, useId } from 'react';
import { VocalSeparatorEngine } from '../utils/audioProcessor';
import {
  Scissors,
  Upload,
  Play,
  Pause,
  Volume2,
  Sliders,
  Download,
  Mic,
  Music,
  Activity,
  Sparkles,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';

interface VocalSeparatorProps {
  appLang: 'km' | 'en';
}

export const VocalSeparator: React.FC<VocalSeparatorProps> = ({ appLang }) => {
  const isKhmer = appLang === 'km';
  const fileInputId = useId();

  const [engine] = useState(() => new VocalSeparatorEngine());
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);

  // Faders: 0.0 to 2.0
  const [vocalLevel, setVocalLevel] = useState(1.0);
  const [bgmLevel, setBgmLevel] = useState(1.0);

  // Mute / Solo states
  const [vocalSolo, setVocalSolo] = useState(false);
  const [bgmSolo, setBgmSolo] = useState(false);

  // Rendering state
  const [isRendering, setIsRendering] = useState(false);
  const [renderMessage, setRenderMessage] = useState<string | null>(null);

  // Visualizer canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setRenderMessage(isKhmer ? 'កំពុងដំណើរការសំឡេង...' : 'Decoding audio...');
      await engine.loadAudioFile(file);
      setFileName(file.name);
      setAudioLoaded(true);
      setRenderMessage(null);
    } catch (err: any) {
      console.error(err);
      setRenderMessage(err.message || 'Failed to decode audio file');
    }
  };

  // Generate synthetic stereo demo audio for instant trial
  const handleLoadDemoAudio = async () => {
    try {
      setRenderMessage(isKhmer ? 'កំពុងបង្កើតសំឡេងគំរូ...' : 'Generating sample stereo audio...');
      const ctx = engine.getAudioContext();
      const sampleRate = ctx.sampleRate;
      const duration = 8; // 8 seconds
      const buffer = ctx.createBuffer(2, sampleRate * duration, sampleRate);

      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      // Stereo synth: Center frequency (simulating vocal) + Panned chords (simulating BGM)
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        // Vocal: Center mono (identical on L and R)
        const vocalTone =
          Math.sin(2 * Math.PI * 440 * t) * 0.3 * Math.sin(t * 3) +
          Math.sin(2 * Math.PI * 880 * t) * 0.15;

        // BGM: Stereo wide chords
        const bgmLeft = Math.sin(2 * Math.PI * 220 * t) * 0.25 + Math.sin(2 * Math.PI * 330 * t) * 0.2;
        const bgmRight = Math.sin(2 * Math.PI * 277 * t) * 0.25 + Math.sin(2 * Math.PI * 370 * t) * 0.2;

        left[i] = vocalTone + bgmLeft;
        right[i] = vocalTone + bgmRight;
      }

      (engine as any).audioBuffer = buffer;
      setFileName('Demo_Stereo_Audio.wav');
      setAudioLoaded(true);
      setRenderMessage(null);
    } catch (err: any) {
      console.error(err);
      setRenderMessage(err.message);
    }
  };

  const handlePlayToggle = () => {
    if (!audioLoaded) return;
    if (isPlaying) {
      engine.pause();
      setIsPlaying(false);
    } else {
      const v = bgmSolo ? 0 : vocalLevel;
      const b = vocalSolo ? 0 : bgmLevel;
      engine.play(v, b, () => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  // Update levels live
  useEffect(() => {
    if (vocalSolo) {
      engine.setVocalLevel(vocalLevel);
      engine.setBgmLevel(0);
    } else if (bgmSolo) {
      engine.setVocalLevel(0);
      engine.setBgmLevel(bgmLevel);
    } else {
      engine.setVocalLevel(vocalLevel);
      engine.setBgmLevel(bgmLevel);
    }
  }, [vocalLevel, bgmLevel, vocalSolo, bgmSolo, engine]);

  // Visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderVisualizer = () => {
      const analyser = engine.getAnalyser();
      if (!analyser || !isPlaying) {
        // Draw idle line
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        animationFrameRef.current = requestAnimationFrame(renderVisualizer);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;

        // Gradient coloring
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#6366f1');
        grad.addColorStop(0.5, '#a855f7');
        grad.addColorStop(1, '#ec4899');

        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }

      animationFrameRef.current = requestAnimationFrame(renderVisualizer);
    };

    animationFrameRef.current = requestAnimationFrame(renderVisualizer);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [engine, isPlaying]);

  // Export isolated track
  const handleExportTrack = async (mode: 'vocal' | 'bgm') => {
    if (!audioLoaded) return;
    setIsRendering(true);
    setRenderMessage(
      mode === 'vocal'
        ? isKhmer
          ? 'កំពុងទាញយកសំឡេងច្រៀង Acapella...'
          : 'Extracting Acapella Vocal Track...'
        : isKhmer
        ? 'កំពុងបំបែកភ្លេង Karaoke / BGM...'
        : 'Rendering Karaoke Instrumental BGM...'
    );

    try {
      const blob = await engine.renderTrackOffline(mode);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace(/\.[^/.]+$/, '')}_${mode}_isolated.wav`;
      a.click();
      URL.revokeObjectURL(url);
      setRenderMessage(null);
    } catch (err: any) {
      console.error(err);
      setRenderMessage(err.message || 'Export error');
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-pink-950/40 via-purple-950/40 to-slate-900 border border-pink-500/20 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 text-pink-400 text-xs font-semibold">
              <Scissors className="w-4 h-4" />
              <span>{isKhmer ? 'ឧបករណ៍បំបែកសំឡេង (AI & DSP Vocal Remover)' : 'Vocal Remover & Audio Separator'}</span>
            </div>
            <h1 className="text-xl font-bold text-white">
              {isKhmer ? 'បំបែកសំឡេងច្រៀងចេញពីភ្លេង (Vocal & BGM)' : 'Separate Vocals from Background Music'}
            </h1>
            <p className="text-xs text-slate-300">
              {isKhmer
                ? 'ទាញយកតែសំឡេងនិយាយ/ច្រៀង (Acapella) ឬភ្លេងសុទ្ធ (Karaoke BGM) ដោយប្រើបច្ចេកវិទ្យា Center-Channel Isolation និង Phase Cancellation!'
                : 'Extract clean vocal voiceovers or isolated background instrumental tracks using real-time Web Audio DSP.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <input
              type="file"
              accept="audio/*,video/*"
              id={fileInputId}
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor={fileInputId}
              title={isKhmer ? 'ផ្ទុកឯកសារសំឡេង (MP3/WAV)' : 'Upload Audio File'}
              aria-label="Upload Audio File"
              className="flex items-center space-x-1.5 p-2 sm:px-4 sm:py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-lg shadow-pink-600/30 transition cursor-pointer"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ផ្ទុកឯកសារសំឡេង (MP3/WAV)' : 'Upload Audio File'}</span>
            </label>

            <button
              onClick={handleLoadDemoAudio}
              title={isKhmer ? 'ផ្ទុកសំឡេងគំរូ' : 'Load Demo Audio'}
              aria-label="Load Demo Audio"
              className="flex items-center space-x-1.5 p-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
            >
              <Music className="w-4 h-4 text-pink-400 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ផ្ទុកសំឡេងគំរូ' : 'Load Demo Audio'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dual Track Mixer Controls */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-5 space-y-6 shadow-xl border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-pink-400" />
              <span className="text-sm font-bold text-white">
                {isKhmer ? 'ផ្ទាំងបញ្ជាកម្រិតសំឡេង (Dual Faders)' : 'Dual Track Studio Mixer'}
              </span>
            </div>
            {fileName && (
              <span className="text-xs text-slate-400 truncate max-w-[200px] font-mono">
                {fileName}
              </span>
            )}
          </div>

          {/* Master Playback controls */}
          <div className="flex items-center justify-center space-x-3 py-2">
            <button
              onClick={handlePlayToggle}
              disabled={!audioLoaded}
              className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-pink-600/30 transition disabled:opacity-40 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
          </div>

          {/* Track 1: Vocal Level Fader */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-pink-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-pink-400 font-semibold text-xs">
                <Mic className="w-4 h-4" />
                <span>{isKhmer ? 'សំឡេងមនុស្ស / ច្រៀង (Vocals)' : 'Vocal / Voice Track'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setVocalSolo(!vocalSolo);
                    setBgmSolo(false);
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase transition ${
                    vocalSolo ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Solo
                </button>
                <span className="text-xs font-mono text-pink-300">
                  {Math.round(vocalLevel * 100)}%
                </span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={vocalLevel}
              disabled={!audioLoaded}
              onChange={(e) => setVocalLevel(parseFloat(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          {/* Track 2: BGM / Instrumental Fader */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-indigo-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs">
                <Music className="w-4 h-4" />
                <span>{isKhmer ? 'ភ្លេងផ្ទៃក្រោយ / BGM (Instrumental)' : 'Background Music (BGM)'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setBgmSolo(!bgmSolo);
                    setVocalSolo(false);
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase transition ${
                    bgmSolo ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Solo
                </button>
                <span className="text-xs font-mono text-indigo-300">
                  {Math.round(bgmLevel * 100)}%
                </span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={bgmLevel}
              disabled={!audioLoaded}
              onChange={(e) => setBgmLevel(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Export Isolated Buttons */}
          <div className="pt-2 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleExportTrack('vocal')}
              disabled={!audioLoaded || isRendering}
              title={isKhmer ? 'ទាញយក Vocals (.WAV)' : 'Export Isolated Vocals'}
              aria-label="Export Isolated Vocals"
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-pink-950 hover:text-pink-200 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center space-x-1.5 transition disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-4 h-4 text-pink-400 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ទាញយក Vocals (.WAV)' : 'Export Isolated Vocals'}</span>
            </button>

            <button
              onClick={() => handleExportTrack('bgm')}
              disabled={!audioLoaded || isRendering}
              title={isKhmer ? 'ទាញយក BGM (.WAV)' : 'Export Isolated BGM'}
              aria-label="Export Isolated BGM"
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-indigo-950 hover:text-indigo-200 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center space-x-1.5 transition disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ទាញយក BGM (.WAV)' : 'Export Isolated BGM'}</span>
            </button>
          </div>

          {renderMessage && (
            <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/30 text-indigo-300 text-xs flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{renderMessage}</span>
            </div>
          )}
        </div>

        {/* Right: Visualizer & Spectrum Display */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-panel rounded-2xl p-5 space-y-3 shadow-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
                <Activity className="w-4 h-4" />
                <span>{isKhmer ? 'រលកសំឡេងតាមពេលវេលាជាក់ស្តែង (Real-Time Visualizer)' : 'Live Audio Spectrum Visualizer'}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">256 FFT Bars</span>
            </div>

            <div className="w-full h-56 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative shadow-inner">
              <canvas
                ref={canvasRef}
                width={500}
                height={220}
                className="w-full h-full block"
              />
              {!audioLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 text-slate-400 text-xs space-y-2">
                  <Scissors className="w-8 h-8 text-slate-600" />
                  <span>{isKhmer ? 'សូមផ្ទុកឯកសារសំឡេងដើម្បីស្តាប់ និងមើល Spectrum' : 'Upload an audio file to start visualizer'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-300">
              💡 {isKhmer ? 'គន្លឹះបច្ចេកវិទ្យា Center Cancellation:' : 'How it works:'}
            </div>
            <p className="leading-relaxed">
              {isKhmer
                ? 'ក្នុងបទចម្រៀងស្តេរ៉េអូ សំឡេងច្រៀងតួឯកភាគច្រើនត្រូវបានដាក់នៅចំកណ្តាល (Center Channel = Left + Right) ខណៈដែលភ្លេងត្រូវបានពង្រីកសងខាង (Stereo Width)។ ប្រព័ន្ធនេះប្រើវិធីដក Channel (L - R) ដើម្បីលុបសំឡេងច្រៀង និងចម្រោះ Formant Bandpass (1000Hz) ដើម្បីទាញយកតែសំឡេងនិយាយ។'
                : 'Stereo audio places lead vocals in the center (L = R). By computing (L - R) we cancel center vocals to produce Karaoke BGM, while bandpass formant matrixing isolates speech.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
