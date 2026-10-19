import { SrtCue } from '../types';

/**
 * Converts milliseconds to SRT timestamp: HH:MM:SS,mmm
 */
export function msToSrtTime(ms: number): string {
  const safeMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(safeMs / 3600000);
  const minutes = Math.floor((safeMs % 3600000) / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const milliseconds = safeMs % 1000;

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

/**
 * Converts SRT timestamp string (HH:MM:SS,mmm or HH:MM:SS.mmm) to milliseconds
 */
export function srtTimeToMs(timeStr: string): number {
  if (!timeStr) return 0;
  const normalized = timeStr.trim().replace('.', ',');
  const parts = normalized.split(':');
  if (parts.length < 3) return 0;

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const [secStr, msStr] = parts[2].split(',');
  const seconds = parseInt(secStr, 10) || 0;
  const milliseconds = parseInt(msStr || '0', 10) || 0;

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
}

/**
 * Detects speaker type and label from subtitle text (e.g., "[ប្រុស]: សួស្តី", "[Woman] Hello", "(Narrator) In a world...")
 */
export function detectSpeakerFromText(rawText: string): {
  speaker: 'male' | 'female' | 'narrator' | 'other';
  speakerLabel: string;
  cleanText: string;
} {
  const trimmed = rawText.trim();
  const maleRegex = /^(?:\[(?:ប្រុស|បុរស|Man|Male|Boy)(?::\s*([^\]]*))?\]|\((?:ប្រុស|បុរស|Man|Male)\):?)/i;
  const femaleRegex = /^(?:\[(?:ស្រី|នារី|Woman|Female|Girl)(?::\s*([^\]]*))?\]|\((?:ស្រី|នារី|Woman|Female)\):?)/i;
  const narratorRegex = /^(?:\[(?:អ្នកសម្រាយ|Narrator|VO|Voiceover)(?::\s*([^\]]*))?\]|\((?:អ្នកសម្រាយ|Narrator)\):?)/i;

  if (maleRegex.test(trimmed)) {
    const match = trimmed.match(maleRegex);
    const label = match?.[1] ? `ប្រុស (${match[1]})` : 'ប្រុស / Male';
    const clean = trimmed.replace(maleRegex, '').replace(/^[:\s-]+/, '').trim();
    return { speaker: 'male', speakerLabel: label, cleanText: clean };
  }

  if (femaleRegex.test(trimmed)) {
    const match = trimmed.match(femaleRegex);
    const label = match?.[1] ? `ស្រី (${match[1]})` : 'ស្រី / Female';
    const clean = trimmed.replace(femaleRegex, '').replace(/^[:\s-]+/, '').trim();
    return { speaker: 'female', speakerLabel: label, cleanText: clean };
  }

  if (narratorRegex.test(trimmed)) {
    const match = trimmed.match(narratorRegex);
    const label = match?.[1] ? `អ្នកសម្រាយ (${match[1]})` : 'អ្នកសម្រាយ / Narrator';
    const clean = trimmed.replace(narratorRegex, '').replace(/^[:\s-]+/, '').trim();
    return { speaker: 'narrator', speakerLabel: label, cleanText: clean };
  }

  // Generic tag [Name]:
  const genericTagMatch = trimmed.match(/^\[([^\]]+)\]:?\s*/);
  if (genericTagMatch) {
    const name = genericTagMatch[1];
    const isLikelyFemale = /(ស្រី|នារី|Mary|Anna|Sarah|Queen|Mom|Girl)/i.test(name);
    const isLikelyMale = /(ប្រុស|បុរស|John|David|King|Dad|Boy)/i.test(name);
    return {
      speaker: isLikelyFemale ? 'female' : isLikelyMale ? 'male' : 'narrator',
      speakerLabel: name,
      cleanText: trimmed.replace(/^\[([^\]]+)\]:?\s*/, '').trim(),
    };
  }

  return {
    speaker: 'narrator',
    speakerLabel: 'អ្នកសម្រាយ / Narrator',
    cleanText: trimmed,
  };
}

/**
 * Parses raw SRT string into array of structured SrtCue items
 */
export function parseSrt(srtString: string): SrtCue[] {
  if (!srtString || !srtString.trim()) return [];

  // Normalize line breaks
  const normalized = srtString.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.trim().split(/\n\s*\n/);
  const cues: SrtCue[] = [];

  let autoId = 1;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIndex = 1;
    // Handle cases where block doesn't start with a number
    if (lines[0].includes('-->')) {
      timeLineIndex = 0;
    }

    const timeLine = lines[timeLineIndex];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const [startRaw, endRaw] = timeLine.split('-->');
    const startStr = startRaw.trim();
    const endStr = (endRaw || '').trim().split(' ')[0]; // ignore coordinate info in WebVTT

    const textLines = lines.slice(timeLineIndex + 1);
    const fullText = textLines.join('\n').trim();

    const speakerInfo = detectSpeakerFromText(fullText);

    const startMs = srtTimeToMs(startStr);
    const endMs = srtTimeToMs(endStr);

    cues.push({
      id: autoId++,
      startTime: msToSrtTime(startMs),
      endTime: msToSrtTime(endMs),
      startMs,
      endMs,
      speaker: speakerInfo.speaker,
      speakerLabel: speakerInfo.speakerLabel,
      text: fullText,
    });
  }

  return cues;
}

/**
 * Serializes SrtCue array back to standard SRT format string
 */
export function stringifySrt(cues: SrtCue[], includeSpeakerTags = true): string {
  return cues
    .map((cue, index) => {
      let displayText = cue.text;
      if (includeSpeakerTags && cue.speaker && !displayText.startsWith('[')) {
        const tag =
          cue.speaker === 'male'
            ? '[ប្រុស]: '
            : cue.speaker === 'female'
            ? '[ស្រី]: '
            : '[អ្នកសម្រាយ]: ';
        displayText = `${tag}${displayText}`;
      }
      return `${index + 1}\n${cue.startTime} --> ${cue.endTime}\n${displayText}`;
    })
    .join('\n\n');
}

/**
 * Shifts all cues by a given delta in milliseconds (positive or negative)
 */
export function shiftSrtTimes(cues: SrtCue[], deltaMs: number): SrtCue[] {
  return cues.map((cue) => {
    const newStart = Math.max(0, cue.startMs + deltaMs);
    const duration = Math.max(500, cue.endMs - cue.startMs);
    const newEnd = newStart + duration;

    return {
      ...cue,
      startMs: newStart,
      endMs: newEnd,
      startTime: msToSrtTime(newStart),
      endTime: msToSrtTime(newEnd),
    };
  });
}
