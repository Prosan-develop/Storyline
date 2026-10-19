import React, { useState, useRef, useId } from 'react';
import { transcribeAudioApi } from '../services/geminiService';
import { parseSrt } from '../utils/srtParser';
import { SrtCue } from '../types';
import {
  Mic,
  MicOff,
  Upload,
  Cpu,
  Sparkles,
  FileText,
  Copy,
  Check,
  ArrowRight,
  Download,
  AlertCircle,
  Loader2,
  Volume2,
  Trash2,
} from 'lucide-react';

interface TranscribeStudioProps {
  appLang: 'km' | 'en';
  onSendToSrt: (srtText: string) => void;
  onSendToRecap?: (text: string) => void;
}

export const TranscribeStudio: React.FC<TranscribeStudioProps> = ({
  appLang,
  onSendToSrt,
  onSendToRecap,
}) => {
  const isKhmer = appLang === 'km';
  const fileInputId = useId();

  // Mode: 'local' (Free low-spec) vs 'gemini' (AI Multimodal)
  const [engine, setEngine] = useState<'local' | 'gemini'>('local');

  // Local STT state
  const [isListening, setIsListening] = useState(false);
  const [localTranscript, setLocalTranscript] = useState('');
  const [localLang, setLocalLang] = useState('km-KH');
  const recognitionRef = useRef<any>(null);

  // Gemini STT state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [geminiResult, setGeminiResult] = useState<{
    transcript: string;
    srt: string;
    detectedLanguage?: string;
  } | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Microphone recording for Gemini upload
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Toggle Local Web Speech Recognition
  const toggleLocalRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        isKhmer
          ? 'កម្មវិធីអ៊ីនធឺណិតនេះមិនទាន់គាំទ្រ Web Speech API ទេ។ សូមប្រើ Google Chrome ឬ Microsoft Edge!'
          : 'Web Speech API is not supported in this browser. Please use Chrome or Edge!'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = localLang;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setLocalTranscript(currentText.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setErrorMessage(`Speech recognition notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message);
      setIsListening(false);
    }
  };

  // Convert uploaded audio file to base64 and call Gemini API
  const handleGeminiTranscribe = async () => {
    if (!audioFile) return;

    setIsTranscribing(true);
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioFile);
      });

      const audioBase64 = await base64Promise;
      const data = await transcribeAudioApi({
        audioBase64,
        mimeType: audioFile.type || 'audio/mp3',
        language: 'km',
      });

      setGeminiResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Transcription error');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Start / Stop mic recording to send to Gemini
  const toggleRecordingForGemini = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `mic_recording_${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        setAudioFile(file);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(isKhmer ? 'មិនអាចបើក Microphone បានទេ' : 'Microphone access denied');
    }
  };

  const handleCopyTranscript = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Turn local raw text into basic SRT blocks
  const convertLocalTextToSrt = () => {
    if (!localTranscript.trim()) return;
    const sentences = localTranscript.split(/([.!?។\n]+)/).filter(Boolean);
    let srtText = '';
    let startSec = 1;

    let cueIndex = 1;
    for (let i = 0; i < sentences.length; i += 2) {
      const text = (sentences[i] + (sentences[i + 1] || '')).trim();
      if (!text) continue;

      const duration = Math.max(3, Math.ceil(text.length / 15));
      const endSec = startSec + duration;

      const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `00:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},000`;
      };

      srtText += `${cueIndex}\n${formatTime(startSec)} --> ${formatTime(endSec)}\n[អ្នកសម្រាយ]: ${text}\n\n`;
      startSec = endSec + 1;
      cueIndex++;
    }

    onSendToSrt(srtText.trim());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-slate-900 border border-blue-500/20 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 text-blue-400 text-xs font-semibold">
              <Mic className="w-4 h-4" />
              <span>{isKhmer ? 'បំប្លែងសំឡេងជាអក្សរ (Speech to Text)' : 'Audio & Speech to Text'}</span>
            </div>
            <h1 className="text-xl font-bold text-white">
              {isKhmer ? 'Transcript សំឡេងជាអត្ថបទ និងបង្កើត Subtitles' : 'Transcribe Audio & Generate Subtitles'}
            </h1>
            <p className="text-xs text-slate-300">
              {isKhmer
                ? 'ជម្រើស ២ ប្រភេទ៖ ម៉ាស៊ីន Free Local សម្រាប់កុំព្យូទ័រកម្លាំងទាប ឬ Gemini 3.5 Transcribe សម្រាប់ឯកសារសំឡេងច្បាស់ល្អ!'
                : 'Dual Engine: Free Local Web Speech for low-spec PCs, or Gemini 3.5 Transcribe for audio files.'}
            </p>
          </div>

          {/* Engine Selector */}
          <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800 self-start md:self-center">
            <button
              onClick={() => setEngine('local')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                engine === 'local'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'Free Local (ម៉ាស៊ីនទាប)' : 'Free Local (Low-Spec)'}</span>
            </button>
            <button
              onClick={() => setEngine('gemini')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                engine === 'gemini'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isKhmer ? 'Gemini 3.5 Transcribe' : 'Gemini AI Transcribe'}</span>
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

      {/* Engine A: Free Local STT (Web Speech API) */}
      {engine === 'local' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 glass-panel rounded-2xl p-5 space-y-4 shadow-xl border border-slate-800">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span>{isKhmer ? 'Speech Recognition ក្នុងកុំព្យូទ័រ (Free Local)' : 'Local Speech Recognition'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {isKhmer
                  ? 'មិនត្រូវការ Quota និងដំណើរការបានលឿនបំផុតលើគ្រប់កុំព្យូទ័រ'
                  : 'Zero quota, ultra-fast streaming dictation for any low-spec computer.'}
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">
                {isKhmer ? 'ភាសានិយាយ (Spoken Language):' : 'Spoken Language:'}
              </label>
              <select
                value={localLang}
                onChange={(e) => setLocalLang(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
              >
                <option value="km-KH">ភាសាខ្មែរ (Khmer - Cambodia)</option>
                <option value="en-US">English (US)</option>
                <option value="th-TH">ไทย (Thai)</option>
                <option value="zh-CN">中文 (Chinese - Mandarin)</option>
                <option value="vi-VN">Tiếng Việt (Vietnamese)</option>
              </select>
            </div>

            {/* Mic trigger button */}
            <div className="py-4 flex flex-col items-center justify-center space-y-3">
              <button
                onClick={toggleLocalRecognition}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse ring-8 ring-red-500/20'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                }`}
              >
                {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
              <span className="text-xs font-semibold text-slate-300">
                {isListening
                  ? isKhmer
                    ? 'កំពុងស្តាប់... សូមនិយាយ!'
                    : 'Listening live... speak now!'
                  : isKhmer
                  ? 'ចុចដើម្បីចាប់ផ្តើមនិយាយ'
                  : 'Click to Start Dictation'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
              💡 {isKhmer
                ? 'គន្លឹះ៖ នៅពេលនិយាយចប់ អ្នកអាចចុច "បំប្លែងជា SRT" ដើម្បីយកទៅកែសម្រួល ឬបកប្រែបន្ត!'
                : 'Tip: Once dictation is done, click "Convert to SRT" to edit or translate in SRT Studio!'}
            </div>
          </div>

          {/* Transcript Viewer */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-5 space-y-4 shadow-xl border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>{isKhmer ? 'អត្ថបទដែលបានស្តាប់ (Transcript Result)' : 'Live Transcript Output'}</span>
              </span>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <button
                  onClick={() => handleCopyTranscript(localTranscript)}
                  disabled={!localTranscript}
                  title={isKhmer ? 'ចម្លង' : 'Copy'}
                  aria-label="Copy Transcript"
                  className="flex items-center space-x-1 p-1.5 sm:px-3 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 disabled:opacity-40 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                  <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ចម្លង' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setLocalTranscript('')}
                  title={isKhmer ? 'លុប' : 'Clear'}
                  aria-label="Clear Transcript"
                  className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 hover:text-white transition cursor-pointer flex items-center"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="phone-hide-label hidden sm:inline ml-1">{isKhmer ? 'លុប' : 'Clear'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={11}
              value={localTranscript}
              onChange={(e) => setLocalTranscript(e.target.value)}
              placeholder={
                isKhmer
                  ? 'អត្ថបទនឹងបង្ហាញនៅទីនេះពេលអ្នកនិយាយ...'
                  : 'Spoken text will appear here in real-time...'
              }
              className="w-full p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={convertLocalTextToSrt}
                disabled={!localTranscript.trim()}
                title={isKhmer ? 'បំប្លែងជា Subtitle SRT' : 'Convert to SRT Studio'}
                aria-label="Convert to SRT Studio"
                className="flex items-center space-x-2 p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-40 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4 shrink-0" />
                <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'បំប្លែងជា Subtitle SRT' : 'Convert to SRT Studio'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Engine B: Gemini Multimodal Audio Transcribe */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 glass-panel rounded-2xl p-5 space-y-4 shadow-xl border border-slate-800">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>{isKhmer ? 'Gemini 3.5 Audio Transcribe' : 'Gemini AI Multimodal Transcribe'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {isKhmer
                  ? 'ផ្ទុកឯកសារសំឡេង/វីដេអូ ដើម្បីបង្កើតអត្ថបទ និង SRT ជាមួយ Timestamp យ៉ាងសុក្រឹត'
                  : 'Upload audio or record clip to generate high-accuracy transcripts and timed SRT cues.'}
              </p>
            </div>

            {/* File Upload Box */}
            <div className="space-y-2">
              <input
                type="file"
                accept="audio/*,video/*"
                id={fileInputId}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setAudioFile(file);
                }}
              />
              <label
                htmlFor={fileInputId}
                className="block p-6 rounded-xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 text-center transition cursor-pointer bg-slate-900/60"
              >
                <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-200 block">
                  {audioFile ? audioFile.name : isKhmer ? 'ជ្រើសរើសឯកសារ MP3, WAV, WebM, M4A' : 'Choose audio/video file'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {audioFile ? `${(audioFile.size / 1024 / 1024).toFixed(2)} MB` : isKhmer ? 'ឬទម្លាក់ឯកសារនៅទីនេះ' : 'or drag and drop'}
                </span>
              </label>
            </div>

            {/* Quick Mic Record Alternative */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-300">
                {isKhmer ? 'ឬថតសំឡេងភ្លាមៗ៖' : 'Or record directly:'}
              </span>
              <button
                onClick={toggleRecordingForGemini}
                title={isRecording ? (isKhmer ? 'បញ្ឈប់ការថត' : 'Stop') : (isKhmer ? 'ថតសំឡេង' : 'Record')}
                aria-label="Record Audio"
                className={`flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5 shrink-0" />
                <span className="phone-hide-label hidden sm:inline">{isRecording ? (isKhmer ? 'បញ្ឈប់ការថត' : 'Stop') : (isKhmer ? 'ថតសំឡេង' : 'Record')}</span>
              </button>
            </div>

            <button
              onClick={handleGeminiTranscribe}
              disabled={!audioFile || isTranscribing}
              title={isKhmer ? 'ចាប់ផ្តើម Transcript' : 'Start AI Transcription'}
              aria-label="Start AI Transcription"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-40 cursor-pointer"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'Gemini កំពុងវិភាគ និង Transcript...' : 'Transcribing audio with Gemini...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'ចាប់ផ្តើម Transcript' : 'Start AI Transcription'}</span>
                </>
              )}
            </button>
          </div>

          {/* Gemini Result Box */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-5 space-y-4 shadow-xl border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{isKhmer ? 'លទ្ធផល Subtitles & Transcript' : 'Transcription & SRT Output'}</span>
              </span>
              {geminiResult?.srt && (
                <button
                  onClick={() => onSendToSrt(geminiResult.srt)}
                  title={isKhmer ? 'បើកក្នុង SRT Studio' : 'Open in SRT Studio'}
                  aria-label="Open in SRT Studio"
                  className="flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  <span className="phone-hide-label hidden sm:inline">{isKhmer ? 'បើកក្នុង SRT Studio' : 'Open in SRT Studio'}</span>
                </button>
              )}
            </div>

            {geminiResult ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase">
                    {isKhmer ? 'អត្ថបទ Subtitle SRT' : 'SRT Subtitles'}
                  </span>
                  <textarea
                    readOnly
                    rows={8}
                    value={geminiResult.srt}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-indigo-200 resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase">
                    {isKhmer ? 'អត្ថបទសរុប (Full Text)' : 'Full Text Transcript'}
                  </span>
                  <p className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 max-h-36 overflow-y-auto leading-relaxed">
                    {geminiResult.transcript}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs space-y-2">
                <FileText className="w-10 h-10 mx-auto text-slate-700" />
                <p>{isKhmer ? 'មិនទាន់មានលទ្ធផល Transcript នៅឡើយទេ' : 'No transcription results yet'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
