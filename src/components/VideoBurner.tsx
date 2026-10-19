import React, { useState, useRef, useEffect, useId } from 'react';
import { SrtCue, SubtitleStyle } from '../types';
import { DEFAULT_SUBTITLE_STYLE, saveSubtitleStyle, loadSubtitleStyle } from '../utils/storage';
import {
  Video,
  Upload,
  Play,
  Pause,
  Sliders,
  Type,
  Download,
  Flame,
  Check,
  Loader2,
  AlertCircle,
  Eye,
  Film,
  Sparkles,
} from 'lucide-react';

interface VideoBurnerProps {
  appLang: 'km' | 'en';
  cues: SrtCue[];
}

export const VideoBurner: React.FC<VideoBurnerProps> = ({ appLang, cues }) => {
  const isKhmer = appLang === 'km';
  const fileInputId = useId();

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  // Subtitle styling
  const [style, setStyle] = useState<SubtitleStyle>(() => loadSubtitleStyle());

  // Burner / Export state
  const [isBurning, setIsBurning] = useState(false);
  const [burnProgress, setBurnProgress] = useState(0);
  const [burnedVideoUrl, setBurnedVideoUrl] = useState<string | null>(null);
  const [burnError, setBurnError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const burnerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active subtitle cue for current playback position
  const activeCue = cues.find(
    (c) => currentTimeMs >= c.startMs && currentTimeMs <= c.endMs
  );

  // Video time update listener
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTimeMs(Math.floor(videoRef.current.currentTime * 1000));
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDurationMs(Math.floor(videoRef.current.duration * 1000));
  };

  // Video file upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoName(file.name);
    setBurnedVideoUrl(null);
  };

  // Generate synthetic sample video on Canvas for instant testing
  const handleLoadSampleVideo = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setVideoName('Sample_Cinematic_Background.webm');
      setBurnedVideoUrl(null);
    };

    recorder.start();

    // Animate a cinematic moving gradient background for 12 seconds
    let frame = 0;
    const totalFrames = 30 * 12; // 12 seconds
    const interval = setInterval(() => {
      frame++;
      const time = frame / 30;

      // Draw starry night / galaxy gradient
      const grad = ctx.createLinearGradient(
        0,
        0,
        canvas.width * Math.sin(time * 0.2),
        canvas.height
      );
      grad.addColorStop(0, '#020617');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#0f172a');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle glowing animated orb
      ctx.beginPath();
      ctx.arc(
        canvas.width / 2 + Math.sin(time) * 150,
        canvas.height / 2 + Math.cos(time * 0.8) * 80,
        80 + Math.sin(time * 2) * 20,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.fill();

      // Film title text
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'center';
      ctx.fillText('KROMA CINEMA STUDIO DEMO', canvas.width / 2, 140);

      if (frame >= totalFrames) {
        clearInterval(interval);
        recorder.stop();
      }
    }, 1000 / 30);
  };

  // Update style
  const updateStyle = (partial: Partial<SubtitleStyle>) => {
    const next = { ...style, ...partial };
    setStyle(next);
    saveSubtitleStyle(next);
  };

  // Hardsub video burner (draws video + subtitles onto canvas and records)
  const handleBurnSubtitles = async () => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    setIsBurning(true);
    setBurnProgress(0);
    setBurnError(null);
    setBurnedVideoUrl(null);

    try {
      const canvas = burnerCanvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d')!;

      const stream = canvas.captureStream(30);

      // Support audio if available
      try {
        const audioStream = (video as any).captureStream ? (video as any).captureStream() : null;
        if (audioStream && audioStream.getAudioTracks().length > 0) {
          stream.addTrack(audioStream.getAudioTracks()[0]);
        }
      } catch (e) {
        console.warn('Audio track capture not available:', e);
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: 'video/webm' });
        const finalUrl = URL.createObjectURL(finalBlob);
        setBurnedVideoUrl(finalUrl);
        setIsBurning(false);
      };

      video.currentTime = 0;
      recorder.start();
      await video.play();

      const totalDuration = video.duration || 10;

      const renderFrame = () => {
        if (!isBurning && video.ended) return;

        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Find current subtitle cue
        const curMs = video.currentTime * 1000;
        const currentCue = cues.find((c) => curMs >= c.startMs && curMs <= c.endMs);

        if (currentCue) {
          const text = currentCue.text;
          ctx.save();
          ctx.font = `${style.bold ? 'bold ' : ''}${style.fontSize * (canvas.height / 720)}px ${style.fontFamily}`;
          ctx.textAlign = 'center';

          // Measure text
          const lines = text.split('\n');
          const lineHeight = style.fontSize * 1.35 * (canvas.height / 720);
          const totalTextHeight = lines.length * lineHeight;

          let yPos = canvas.height * (1 - style.bottomMarginPercent / 100);
          if (style.position === 'center') yPos = canvas.height / 2;
          if (style.position === 'top') yPos = canvas.height * 0.15;

          lines.forEach((line, i) => {
            const lineY = yPos - (lines.length - 1 - i) * lineHeight;
            const textWidth = ctx.measureText(line).width;

            // Background box
            if (style.backgroundOpacity > 0) {
              ctx.fillStyle = `rgba(0, 0, 0, ${style.backgroundOpacity})`;
              const padX = 14;
              const padY = 6;
              ctx.fillRect(
                canvas.width / 2 - textWidth / 2 - padX,
                lineY - lineHeight + padY,
                textWidth + padX * 2,
                lineHeight
              );
            }

            // Outline
            if (style.textOutlineWidth > 0) {
              ctx.strokeStyle = style.textOutlineColor;
              ctx.lineWidth = style.textOutlineWidth * 2;
              ctx.strokeText(line, canvas.width / 2, lineY);
            }

            // Main text
            ctx.fillStyle = style.textColor;
            ctx.fillText(line, canvas.width / 2, lineY);
          });

          ctx.restore();
        }

        // Update progress
        const prog = Math.min(99, Math.round((video.currentTime / totalDuration) * 100));
        setBurnProgress(prog);

        if (!video.ended && !video.paused) {
          requestAnimationFrame(renderFrame);
        } else {
          recorder.stop();
        }
      };

      requestAnimationFrame(renderFrame);
    } catch (err: any) {
      console.error(err);
      setBurnError(err.message || 'Hardsub burning failed');
      setIsBurning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/40 to-slate-900 border border-emerald-500/20 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
              <Video className="w-4 h-4" />
              <span>{isKhmer ? 'បញ្ចូល Subtitle ក្នុងវីដេអូ (Video Subtitle Burner)' : 'Hardsub Video Player & Burner'}</span>
            </div>
            <h1 className="text-xl font-bold text-white">
              {isKhmer ? 'ចាក់វីដេអូ សមកាលកម្ម Subtitle និង Render Hardsub' : 'Sync Subtitles & Burn Hardsubs to Video'}
            </h1>
            <p className="text-xs text-slate-300">
              {isKhmer
                ? 'ផ្ទុកវីដេអូ កំណត់ម៉ូដអក្សរខ្មែរ (ពុម្ពអក្សរ ទំហំ ពណ៌ ប្រអប់ផ្ទៃក្រោយ) និង Render បង្កើតវីដេអូដែលជាប់ Subtitle រួចជាស្រេច!'
                : 'Preview synced subtitles on video, style typography (Kantumruy Pro, Siemreap), and export hardcoded video!'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <input
              type="file"
              accept="video/*"
              id={fileInputId}
              className="hidden"
              onChange={handleVideoUpload}
            />
            <label
              htmlFor={fileInputId}
              title={isKhmer ? 'ផ្ទុកវីដេអូ (Upload MP4)' : 'Upload Video'}
              aria-label="Upload Video"
              className="flex items-center space-x-1.5 p-2 sm:px-4 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ផ្ទុកវីដេអូ (Upload MP4)' : 'Upload Video'}</span>
            </label>

            <button
              onClick={handleLoadSampleVideo}
              title={isKhmer ? 'ផ្ទុកវីដេអូគំរូ' : 'Load Demo Video'}
              aria-label="Load Demo Video"
              className="flex items-center space-x-1.5 p-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ផ្ទុកវីដេអូគំរូ' : 'Load Demo Video'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video Player Preview with Styled Live Subtitle Overlay */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-panel rounded-2xl p-4 space-y-3 shadow-xl border border-slate-800">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-2xl">
              {videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="w-full h-full object-contain"
                  />

                  {/* Active Subtitle Overlay */}
                  {activeCue && (
                    <div
                      className={`absolute left-0 right-0 px-6 flex justify-center pointer-events-none transition-all ${
                        style.position === 'top'
                          ? 'top-8'
                          : style.position === 'center'
                          ? 'top-1/2 -translate-y-1/2'
                          : 'bottom-12'
                      }`}
                    >
                      <div
                        style={{
                          fontFamily: style.fontFamily,
                          fontSize: `${style.fontSize}px`,
                          color: style.textColor,
                          fontWeight: style.bold ? 'bold' : 'normal',
                          backgroundColor:
                            style.backgroundOpacity > 0
                              ? `rgba(0, 0, 0, ${style.backgroundOpacity})`
                              : 'transparent',
                          textShadow:
                            style.textOutlineWidth > 0
                              ? `0 0 ${style.textOutlineWidth * 2}px ${style.textOutlineColor}, 0 2px 4px rgba(0,0,0,0.8)`
                              : '0 2px 4px rgba(0,0,0,0.8)',
                        }}
                        className="px-4 py-1.5 rounded-lg max-w-2xl text-center leading-relaxed backdrop-blur-xs select-none"
                      >
                        {activeCue.text}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center space-y-2 p-8">
                  <Film className="w-12 h-12 text-slate-700 mx-auto" />
                  <p className="text-sm font-semibold text-slate-400">
                    {isKhmer ? 'មិនទាន់មានវីដេអូនៅឡើយទេ' : 'No Video Loaded'}
                  </p>
                  <button
                    onClick={handleLoadSampleVideo}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    {isKhmer ? 'ផ្ទុកវីដេអូគំរូសាកល្បង' : 'Load Demo Video'}
                  </button>
                </div>
              )}
            </div>

            {/* Subtitle Cue Timing Bar */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
              <span>
                {Math.floor(currentTimeMs / 1000)}s / {Math.floor(durationMs / 1000)}s
              </span>
              <span>
                {activeCue
                  ? isKhmer
                    ? `Cue #${activeCue.id} កំពុងបង្ហាញ`
                    : `Active Cue #${activeCue.id}`
                  : isKhmer
                  ? 'គ្មាន Subtitle នៅចំណុចនេះ'
                  : 'No subtitle at this frame'}
              </span>
            </div>
          </div>

          {/* Hardsub Burn & Export Action Box */}
          <div className="glass-panel rounded-2xl p-5 space-y-3 border border-emerald-900/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  <span>{isKhmer ? 'បញ្ជូល Subtitle ជាប់ក្នុងវីដេអូ (Hardcode Burner)' : 'Hardsub Video Burner'}</span>
                </h4>
                <p className="text-xs text-slate-400">
                  {isKhmer
                    ? 'Render Subtitles ដោយផ្ទាល់ទៅក្នុង Frame វីដេអូ ហើយទាញយកជាឯកសារវីដេអូថ្មី'
                    : 'Renders styled subtitles directly into video pixels for universal playback on all devices.'}
                </p>
              </div>

              <button
                onClick={handleBurnSubtitles}
                disabled={!videoUrl || isBurning}
                title={isKhmer ? 'ចាប់ផ្តើម Burn Video' : 'Burn Subtitles into Video'}
                aria-label="Burn Subtitles into Video"
                className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-40 cursor-pointer"
              >
                {isBurning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span className="phone-hide-label hidden sm:inline">
                      {isKhmer ? `កំពុង Render វីដេអូ (${burnProgress}%)...` : `Rendering (${burnProgress}%)...`}
                    </span>
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ចាប់ផ្តើម Burn Video' : 'Burn Subtitles into Video'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Burned Result Link */}
            {burnedVideoUrl && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-emerald-300 flex items-center space-x-1.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isKhmer ? 'វីដេអូ Hardsub រួចរាល់!' : 'Hardsub video rendered successfully!'}</span>
                </span>
                <a
                  href={burnedVideoUrl}
                  download={`burned_subtitles_${Date.now()}.webm`}
                  title={isKhmer ? 'ទាញយកវីដេអូ' : 'Download Video'}
                  aria-label="Download Video"
                  className="p-2 sm:px-3.5 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition flex items-center space-x-1"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ទាញយកវីដេអូ' : 'Download Video'}</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Subtitle Styling Inspector */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-5 space-y-4 shadow-xl border border-slate-800">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              {isKhmer ? 'កំណត់ម៉ូដអក្សរ Subtitle' : 'Subtitle Styling'}
            </h3>
          </div>

          {/* Font Family */}
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-medium">
              {isKhmer ? 'ពុម្ពអក្សរ (Font Family):' : 'Font Family:'}
            </label>
            <select
              value={style.fontFamily}
              onChange={(e) => updateStyle({ fontFamily: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
            >
              <option value="'Kantumruy Pro', sans-serif">Kantumruy Pro (ខ្មែរទំនើប)</option>
              <option value="'Siemreap', sans-serif">Siemreap (សៀមរាបបុរាណ)</option>
              <option value="'Inter', sans-serif">Inter (Modern Clean)</option>
              <option value="sans-serif">System Sans-Serif</option>
            </select>
          </div>

          {/* Font Size Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>{isKhmer ? 'ទំហំអក្សរ (Size):' : 'Font Size:'}</span>
              <span className="font-mono">{style.fontSize}px</span>
            </div>
            <input
              type="range"
              min="14"
              max="42"
              value={style.fontSize}
              onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value, 10) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">
                {isKhmer ? 'ពណ៌អក្សរ:' : 'Text Color:'}
              </label>
              <input
                type="color"
                value={style.textColor}
                onChange={(e) => updateStyle({ textColor: e.target.value })}
                className="w-full h-8 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">
                {isKhmer ? 'ពណ៌ស៊ុម (Outline):' : 'Outline Color:'}
              </label>
              <input
                type="color"
                value={style.textOutlineColor}
                onChange={(e) => updateStyle({ textOutlineColor: e.target.value })}
                className="w-full h-8 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer"
              />
            </div>
          </div>

          {/* Background Box Opacity */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>{isKhmer ? 'ផ្ទៃខ្មៅក្រោយអក្សរ:' : 'Background Opacity:'}</span>
              <span className="font-mono">{Math.round(style.backgroundOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={style.backgroundOpacity}
              onChange={(e) => updateStyle({ backgroundOpacity: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Position Selector */}
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-medium block">
              {isKhmer ? 'ទីតាំងលើអេក្រង់:' : 'Position:'}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['bottom', 'center', 'top'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => updateStyle({ position: pos })}
                  className={`py-1.5 rounded-lg text-xs capitalize transition ${
                    style.position === pos
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
