import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Allow payloads for base64 audio and image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Shared server-side Gemini client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// 1. Health & Config Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// 2. Story / Movie Recap Generator (សម្រាយរឿងបែបភាពយន្ត)
app.post('/api/gemini/recap-story', async (req: Request, res: Response) => {
  try {
    const {
      storyText,
      genre = 'dramatic',
      targetLanguage = 'km',
      durationMinutes = 5,
      includeDialogue = true,
    } = req.body;

    if (!storyText || typeof storyText !== 'string') {
      res.status(400).json({ error: 'storyText is required' });
      return;
    }

    const ai = getAiClient();
    const isKhmer = targetLanguage === 'km' || targetLanguage === 'khmer';

    const prompt = `
You are a professional movie recapper, scriptwriter, and story storyteller (សម្រាយរឿងបែបភាពយន្តគួរឱ្យទាក់ទាញ).
Analyze the following story, plot outline, or transcript and create a high-retention recap package formatted in ${isKhmer ? 'Khmer (ភាសាខ្មែរ)' : targetLanguage}.

Input Story / Synopsis:
"""
${storyText.slice(0, 15000)}
"""

Preferences:
- Tone/Genre: ${genre} (dramatic, suspenseful, fast-paced, emotional, or humorous)
- Target Video Duration: approx ${durationMinutes} minutes
- Dialogue with Male/Female characters included: ${includeDialogue ? 'Yes' : 'No'}

Respond ONLY with valid JSON conforming to this schema (no extra explanation, no markdown ticks):
{
  "title": "A captivating, viral title for the recap video in ${isKhmer ? 'Khmer' : targetLanguage}",
  "hookIntro": "A powerful 2-3 sentence teaser/hook narration that grips listeners immediately (e.g. ដូចដែលប្រិយមិត្តដឹងហើយថា...)",
  "synopsis": "A clear 3-sentence summary of the core narrative arc",
  "fullNarration": "The full spoken voiceover narration script with emotional beats and speaker tags like [អ្នកសម្រាយ], [ប្រុស: ឈ្មោះ], [ស្រី: ឈ្មោះ]",
  "scenes": [
    {
      "sceneNumber": 1,
      "timeCode": "00:00:00 - 00:00:15",
      "visualDescription": "Scene visual prompt for video editors or AI video generators",
      "narration": "What the narrator says for this scene",
      "characterVoices": [
        { "speaker": "ប្រុស / Male", "text": "Short dialogue snippet if any" },
        { "speaker": "ស្រី / Female", "text": "Short dialogue snippet if any" }
      ]
    }
  ],
  "srtSubtitles": "Full formatted SRT subtitle file content ready for video burning, with timestamps like '00:00:00,000 --> 00:00:04,500' and speaker tags like [ប្រុស]: ... or [ស្រី]: ..."
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const text = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch {
      // Clean possible stray codeblocks
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error generating story recap:', error);
    res.status(500).json({ error: error.message || 'Failed to generate movie recap' });
  }
});

// 3. SRT & Text Universal Translation
app.post('/api/gemini/translate-srt', async (req: Request, res: Response) => {
  try {
    const { srtContent, sourceLang = 'Auto', targetLang = 'km', mode = 'replace' } = req.body;

    if (!srtContent || typeof srtContent !== 'string') {
      res.status(400).json({ error: 'srtContent is required' });
      return;
    }

    const ai = getAiClient();
    const prompt = `
You are an expert subtitle translator and localizer specializing in film and video subtitles.
Translate the following SRT file content from ${sourceLang} into ${targetLang === 'km' ? 'Khmer (ភាសាខ្មែរ)' : targetLang}.

RULES:
1. STRICTLY PRESERVE all subtitle sequence numbers (1, 2, 3...) and ALL timestamp lines exactly unchanged (e.g. "00:01:23,400 --> 00:01:26,800").
2. Only translate the subtitle text lines.
3. ${mode === 'dual' ? 'Output bilingual subtitles: Line 1 = Original text, Line 2 = Translated text.' : 'Replace the text with natural, culturally accurate translations.'}
4. If speaker indicators like [Man], [Woman], [ប្រុស], [ស្រី] are present, keep or localize them appropriately.
5. Return ONLY the raw translated SRT content. Do not include markdown \`\`\`srt blocks or commentary.

SRT INPUT:
"""
${srtContent.slice(0, 30000)}
"""
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
      },
    });

    let translatedSrt = response.text || '';
    translatedSrt = translatedSrt.replace(/^```[a-z]*\n?/im, '').replace(/```$/im, '').trim();

    res.json({ success: true, translatedSrt });
  } catch (error: any) {
    console.error('Error translating SRT:', error);
    res.status(500).json({ error: error.message || 'Failed to translate SRT file' });
  }
});

// 4. Gemini Audio Transcription (with timestamped SRT cues)
app.post('/api/gemini/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/mp3', language = 'km' } = req.body;

    if (!audioBase64) {
      res.status(400).json({ error: 'audioBase64 is required' });
      return;
    }

    const ai = getAiClient();
    const audioPart = {
      inlineData: {
        mimeType,
        data: audioBase64,
      },
    };

    const instruction = `
You are an audio transcription engine for videos and voiceovers.
Transcribe the speech in this audio accurately. Target language context: ${language}.
Provide BOTH:
1. Full combined text transcript.
2. Timed SRT subtitle blocks with precise timestamps (00:00:00,000 --> 00:00:00,000) and speaker attribution if distinct male/female speakers are detected ([ប្រុស] / [ស្រី] / [Speaker 1] / [Speaker 2]).

Respond strictly in valid JSON format:
{
  "transcript": "Full text transcript here...",
  "detectedLanguage": "Language name or code",
  "srt": "1\\n00:00:00,000 --> 00:00:03,500\\nText line 1\\n\\n2\\n00:00:03,600 --> 00:00:07,200\\nText line 2",
  "speakers": ["Speaker 1 (ប្រុស)", "Speaker 2 (ស្រី)"]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [audioPart, { text: instruction }],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({ error: error.message || 'Failed to transcribe audio' });
  }
});

// 5. OCR Image Translation (Preserving layout and text overlay)
app.post('/api/gemini/ocr-translate', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', targetLanguage = 'km' } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'imageBase64 is required' });
      return;
    }

    const ai = getAiClient();
    const imagePart = {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    };

    const prompt = `
You are an advanced optical character recognition (OCR) and layout-preserving translation engine.
Analyze this image (e.g. movie subtitle, poster, comic panel, document, or sign).
Extract all text in the image, detect its original language, and translate it into ${targetLanguage === 'km' ? 'Khmer (ភាសាខ្មែរ)' : targetLanguage}.

Maintain the logical structural regions (e.g., Header, Subtitle, Caption, Dialog box).
Respond strictly in JSON format:
{
  "detectedLanguage": "e.g. English, Chinese, Thai",
  "fullOriginalText": "Complete original text extracted",
  "fullTranslatedText": "Complete translation in target language",
  "blocks": [
    {
      "id": 1,
      "originalText": "Original text block",
      "translatedText": "Translated text block",
      "region": "top-center | center | bottom-subtitle | headline",
      "speakerOrRole": "Narrator | Character | Title",
      "confidence": "high"
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [imagePart, { text: prompt }],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error performing OCR translation:', error);
    res.status(500).json({ error: error.message || 'Failed to perform OCR translation' });
  }
});

// 6. Gemini Text-To-Speech (gemini-3.8-flash-lite-tts)
app.post('/api/gemini/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Kore', style = 'Clear, engaging documentary voice' } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    // Supported voices: Puck, Charon, Kore, Fenrir, Zephyr
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const selectedVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 1000), // chunk safety
              speechMetadata: {
                style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      res.status(502).json({ error: 'No audio returned from Gemini TTS engine' });
      return;
    }

    res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      voice: selectedVoice,
    });
  } catch (error: any) {
    console.error('Error generating TTS:', error);
    res.status(500).json({ error: error.message || 'Failed to synthesize speech' });
  }
});

// Production / Dev Vite Mount
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // In dev mode, mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 KromaRecap AI Studio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
