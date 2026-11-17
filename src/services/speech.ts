import { getSpeechLocale } from '../utils/speechLocale';
import { storage } from '../storage/mmkvStorage';

// Text-to-speech for assistant replies. expo-speech is a native module: builds
// made before it was added don't contain it, so it is loaded defensively and
// every function degrades to a no-op instead of crashing an over-the-air update.
let Speech: typeof import('expo-speech') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Speech = require('expo-speech');
} catch {
  Speech = null;
}

const KEY = 'ai-voice-replies';

export function isTtsAvailable(): boolean {
  return Speech != null && typeof Speech.speak === 'function';
}

export function getVoiceRepliesEnabled(): boolean {
  try {
    return storage.getBoolean(KEY) ?? false;
  } catch {
    return false;
  }
}

export function setVoiceRepliesEnabled(on: boolean): void {
  try {
    storage.set(KEY, on);
  } catch {
    // preference simply isn't remembered
  }
  if (!on) stopSpeaking();
}

// Spoken text shouldn't include markdown marks, links or emoji.
export function toSpeakable(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_`#>~]+/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1500);
}

export function speak(text: string): void {
  if (!Speech) return;
  const clean = toSpeakable(text);
  if (!clean) return;
  try {
    Speech.stop();
    Speech.speak(clean, { language: getSpeechLocale(), rate: 1.0, pitch: 1.0 });
  } catch {
    // never let TTS break the chat
  }
}

export function stopSpeaking(): void {
  try {
    Speech?.stop();
  } catch {
    // ignore
  }
}
