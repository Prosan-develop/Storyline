import { StoryRecapResult, OcrResult } from '../types';

/**
 * Story & Movie Recap Generator
 */
export async function generateStoryRecapApi(params: {
  storyText: string;
  genre?: string;
  targetLanguage?: string;
  durationMinutes?: number;
  includeDialogue?: boolean;
}): Promise<StoryRecapResult> {
  const res = await fetch('/api/gemini/recap-story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

/**
 * Subtitle SRT & Text Translator
 */
export async function translateSrtApi(params: {
  srtContent: string;
  sourceLang?: string;
  targetLang: string;
  mode?: 'replace' | 'dual';
}): Promise<string> {
  const res = await fetch('/api/gemini/translate-srt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with ${res.status}`);
  }

  const json = await res.json();
  return json.translatedSrt;
}

/**
 * Gemini Multimodal Audio Transcribe
 */
export async function transcribeAudioApi(params: {
  audioBase64: string;
  mimeType: string;
  language?: string;
}): Promise<{ transcript: string; srt: string; detectedLanguage?: string; speakers?: string[] }> {
  const res = await fetch('/api/gemini/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

/**
 * OCR Image Translation
 */
export async function ocrTranslateImageApi(params: {
  imageBase64: string;
  mimeType: string;
  targetLanguage?: string;
}): Promise<OcrResult> {
  const res = await fetch('/api/gemini/ocr-translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

/**
 * Gemini High-Quality Text-to-Speech (gemini-3.8-flash-lite-tts)
 */
export async function synthesizeSpeechApi(params: {
  text: string;
  voiceName?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  style?: string;
}): Promise<{ audioUrl: string; base64: string }> {
  const res = await fetch('/api/gemini/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with ${res.status}`);
  }

  const json = await res.json();
  const audioUrl = `data:${json.mimeType || 'audio/wav'};base64,${json.audioBase64}`;
  return { audioUrl, base64: json.audioBase64 };
}

/**
 * Free Local Web Speech Synthesis fallback (Works 100% offline, zero CPU lag)
 */
export function speakWebSpeech(text: string, options?: { lang?: string; pitch?: number; rate?: number; gender?: 'male' | 'female' }): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Web Speech Synthesis is not supported in this browser.'));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (options?.lang) utterance.lang = options.lang;
    if (options?.pitch) utterance.pitch = options.pitch;
    if (options?.rate) utterance.rate = options.rate;

    // Try finding matching voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      if (options?.lang) {
        const langVoice = voices.find((v) => v.lang.startsWith(options.lang!));
        if (langVoice) utterance.voice = langVoice;
      }
      if (options?.gender === 'female') {
        const femaleVoice = voices.find((v) => /female|woman|zira|samantha|karen|victoria/i.test(v.name));
        if (femaleVoice) utterance.voice = femaleVoice;
      } else if (options?.gender === 'male') {
        const maleVoice = voices.find((v) => /male|man|david|george|alex|daniel/i.test(v.name));
        if (maleVoice) utterance.voice = maleVoice;
      }
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);
    window.speechSynthesis.speak(utterance);
  });
}
