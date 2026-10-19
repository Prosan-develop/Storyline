import React, { useState, useId } from 'react';
import { OcrResult } from '../types';
import { ocrTranslateImageApi, synthesizeSpeechApi, speakWebSpeech } from '../services/geminiService';
import {
  ScanText,
  Upload,
  Volume2,
  Copy,
  Check,
  Sparkles,
  Camera,
  Image as ImageIcon,
  ArrowRight,
  Loader2,
  AlertCircle,
  Layers,
} from 'lucide-react';

interface OcrTranslateStudioProps {
  appLang: 'km' | 'en';
  onSendToSrt: (srtText: string) => void;
}

export const OcrTranslateStudio: React.FC<OcrTranslateStudioProps> = ({
  appLang,
  onSendToSrt,
}) => {
  const isKhmer = appLang === 'km';
  const fileInputId = useId();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState('km');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Sample image demo generator
  const handleLoadSamplePoster = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    // Draw dark cinematic banner
    const grad = ctx.createLinearGradient(0, 0, 0, 600);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 600);

    // Glowing circle
    ctx.beginPath();
    ctx.arc(400, 240, 90, 0, Math.PI * 2);
    ctx.fillStyle = '#6366f1';
    ctx.shadowColor = '#818cf8';
    ctx.shadowBlur = 30;
    ctx.fill();

    // Movie title
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE ANCIENT PROPHECY', 400, 390);

    // Subtitle tagline
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('When the stars align, destiny will awaken.', 400, 440);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('[Guardian]: The sacred relic belongs to eternity!', 400, 500);

    const dataUrl = canvas.toDataURL('image/jpeg');
    setImagePreview(dataUrl);
    setOcrResult(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      setOcrResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRunOcr = async () => {
    if (!imagePreview) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const base64 = imagePreview.split(',')[1];
      const mimeType = imagePreview.split(';')[0].split(':')[1] || 'image/jpeg';

      const result = await ocrTranslateImageApi({
        imageBase64: base64,
        mimeType,
        targetLanguage: targetLang,
      });

      setOcrResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'OCR failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Instant Voice Readout
  const handlePlayVoice = async (textToSpeak: string) => {
    if (isPlayingAudio || !textToSpeak) return;
    setIsPlayingAudio(true);

    try {
      try {
        const { audioUrl } = await synthesizeSpeechApi({
          text: textToSpeak,
          voiceName: 'Kore',
          style: 'Clear educational translation audio',
        });
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => {
          speakWebSpeech(textToSpeak, { lang: 'km-KH' }).finally(() => setIsPlayingAudio(false));
        };
        await audio.play();
      } catch {
        await speakWebSpeech(textToSpeak, { lang: 'km-KH' });
        setIsPlayingAudio(false);
      }
    } catch {
      setIsPlayingAudio(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/40 to-slate-900 border border-cyan-500/20 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 text-cyan-400 text-xs font-semibold">
              <ScanText className="w-4 h-4" />
              <span>{isKhmer ? 'ស្កេនរូបភាព OCR & បកប្រែជាសំឡេង' : 'Image OCR Translation & Instant Voice'}</span>
            </div>
            <h1 className="text-xl font-bold text-white">
              {isKhmer ? 'ស្កេនអត្ថបទក្នុងរូបភាព និងអានជាសំឡេងភ្លាមៗ' : 'Scan Image Text, Preserve Layout & Read Aloud'}
            </h1>
            <p className="text-xs text-slate-300">
              {isKhmer
                ? 'ទាញយកអត្ថបទពីផ្ទាំង Poster, Subtitle ឬសៀវភៅ រក្សាទ្រង់ទ្រាយដើម បកប្រែជាភាសាខ្មែរ និងមានប៊ូតុងអានជាសំឡេងភ្លាមៗ!'
                : 'Extract text from posters, subtitles or book pages, keep layout structure, translate and listen immediately!'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <input
              type="file"
              accept="image/*"
              id={fileInputId}
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor={fileInputId}
              title={isKhmer ? 'ផ្ទុករូបភាព (Upload Image)' : 'Upload Image'}
              aria-label="Upload Image"
              className="flex items-center space-x-1.5 p-2 sm:px-4 sm:py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition cursor-pointer"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ផ្ទុករូបភាព (Upload Image)' : 'Upload Image'}</span>
            </label>

            <button
              onClick={handleLoadSamplePoster}
              title={isKhmer ? 'រូបភាពគំរូសាកល្បង' : 'Load Demo Image'}
              aria-label="Load Demo Image"
              className="flex items-center space-x-1.5 p-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'រូបភាពគំរូសាកល្បង' : 'Load Demo Image'}</span>
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Preview Box */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-5 space-y-4 shadow-xl border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-white flex items-center space-x-1.5">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              <span>{isKhmer ? 'រូបភាពដែលត្រូវស្កេន' : 'Image Preview'}</span>
            </span>
            <div className="flex items-center space-x-2">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
              >
                <option value="km">ភាសាខ្មែរ (Khmer)</option>
                <option value="en">English</option>
                <option value="th">ไทย (Thai)</option>
                <option value="zh">中文 (Chinese)</option>
              </select>
            </div>
          </div>

          <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Upload preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center space-y-2 p-6">
                <ScanText className="w-12 h-12 text-slate-700 mx-auto" />
                <p className="text-xs text-slate-400">
                  {isKhmer
                    ? 'សូមផ្ទុករូបភាព ឬចុច "រូបភាពគំរូសាកល្បង" ដើម្បីចាប់ផ្តើម'
                    : 'Upload an image or click demo to scan text'}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleRunOcr}
            disabled={!imagePreview || isLoading}
            title={isKhmer ? 'ស្កេន និងបកប្រែ' : 'Scan & Translate Image'}
            aria-label="Scan & Translate Image"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-40 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'Gemini កំពុងស្កេន និងបកប្រែ...' : 'Scanning & Translating...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ស្កេន និងបកប្រែ (Scan & Translate)' : 'Scan & Translate Image'}</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Extracted & Translated Blocks with Instant Voice */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-5 space-y-4 shadow-xl border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-white flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{isKhmer ? 'លទ្ធផលបកប្រែតាមលំដាប់ (Layout Preserved)' : 'Structured Translation Output'}</span>
            </span>

            {ocrResult && (
              <button
                onClick={() => handlePlayVoice(ocrResult.fullTranslatedText)}
                disabled={isPlayingAudio}
                title={isKhmer ? 'អានសំឡេងទាំងអស់' : 'Read All Aloud'}
                aria-label="Read All Aloud"
                className="flex items-center space-x-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-cyan-600/90 hover:bg-cyan-600 text-white text-xs font-semibold shadow-md transition cursor-pointer"
              >
                {isPlayingAudio ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'អានសំឡេងទាំងអស់' : 'Read All Aloud'}</span>
              </button>
            )}
          </div>

          {ocrResult ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {/* Full Translated text overview */}
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-cyan-300 uppercase">
                    {isKhmer ? 'អត្ថបទបកប្រែសរុប (Full Translation)' : 'Full Translation'}
                  </span>
                  <button
                    onClick={() => handleCopy(ocrResult.fullTranslatedText)}
                    title={isKhmer ? 'ចម្លង' : 'Copy'}
                    aria-label="Copy Translation"
                    className="flex items-center space-x-1 text-[11px] text-cyan-300 hover:text-white cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
                    <span className="phone-hide-label hidden sm:inline">{copied ? (isKhmer ? 'បានចម្លង!' : 'Copied!') : (isKhmer ? 'ចម្លង' : 'Copy')}</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-cyan-100 leading-relaxed">
                  {ocrResult.fullTranslatedText}
                </p>
              </div>

              {/* Block by Block layout breakdown */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400">
                  {isKhmer ? 'ការបែងចែកតាមតំបន់រូបភាព (Blocks):' : 'Detected Visual Blocks:'}
                </span>

                {ocrResult.blocks.map((block) => (
                  <div
                    key={block.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800 font-mono">
                        {block.region || 'Region'}
                      </span>
                      <button
                        onClick={() => handlePlayVoice(block.translatedText)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>{isKhmer ? 'ស្តាប់' : 'Listen'}</span>
                      </button>
                    </div>

                    <div className="text-slate-400 text-[11px]">
                      <span className="font-semibold text-slate-500">Original: </span>
                      {block.originalText}
                    </div>

                    <div className="text-slate-100 font-medium text-xs">
                      <span className="font-semibold text-cyan-400">Translation: </span>
                      {block.translatedText}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <ScanText className="w-10 h-10 mx-auto text-slate-700" />
              <p>{isKhmer ? 'មិនទាន់មានទិន្នន័យស្កេននៅឡើយទេ' : 'No OCR results yet'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
