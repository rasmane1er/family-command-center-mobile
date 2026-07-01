import { useEffect, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
} from '@react-native-voice/voice';

// Restarting the recognizer mid-utterance has a tiny audio overlap at the boundary,
// so the new segment's leading word(s) are often a re-hearing of the previous
// segment's trailing word(s). Strip that overlap before appending.
function mergeSegments(acc: string, next: string): string {
  const accTrimmed = acc.trim();
  const nextTrimmed = next.trim();
  if (!accTrimmed) return nextTrimmed;
  if (!nextTrimmed) return accTrimmed;

  const accWords = accTrimmed.split(/\s+/);
  const nextWords = nextTrimmed.split(/\s+/);
  const maxOverlap = Math.min(accWords.length, nextWords.length, 5);

  for (let len = maxOverlap; len > 0; len--) {
    const accTail = accWords.slice(-len).join(' ').toLowerCase();
    const nextHead = nextWords.slice(0, len).join(' ').toLowerCase();
    if (accTail === nextHead) {
      return [...accWords, ...nextWords.slice(len)].join(' ');
    }
  }
  return [...accWords, ...nextWords].join(' ');
}

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (already) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Microphone Permission',
    message: 'Allow access to your microphone to use voice input.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

interface UseVoiceInputOptions {
  onResult?: (text: string) => void;
}

export function useVoiceInput({ onResult }: UseVoiceInputOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [partial, setPartial] = useState('');
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // activeRef: a logical recording session is in progress (start() called, not yet finalized)
  // heldRef: the mic button is currently pressed down — while true, the native
  //   recognizer is auto-restarted on every pause so a full sentence can be spoken
  //   across multiple silences without cutting off early.
  const activeRef = useRef(false);
  const heldRef = useRef(false);
  const cancelledRef = useRef(false);
  const accumulatedRef = useRef('');

  useEffect(() => {
    Voice.onSpeechStart = () => {
      if (!activeRef.current) return;
      setIsListening(true);
      setPartial('');
    };

    Voice.onSpeechEnd = () => {
      // Native engine ended its segment — if still held, we restart in onSpeechResults.
      if (!heldRef.current) setIsListening(false);
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      if (!activeRef.current) return;
      const segment = e.value?.[0] ?? '';
      setPartial(mergeSegments(accumulatedRef.current, segment));
    };

    Voice.onSpeechResults = async (e: SpeechResultsEvent) => {
      if (!activeRef.current) return;
      const segment = e.value?.[0] ?? '';
      accumulatedRef.current = mergeSegments(accumulatedRef.current, segment);

      if (heldRef.current) {
        // Still holding the button — keep listening across the pause.
        setPartial(accumulatedRef.current);
        try {
          await Voice.start('en-US');
        } catch {
          // If restart fails, fall through and finalize what we have.
          finalize();
        }
        return;
      }

      finalize();
    };

    Voice.onSpeechError = async (e: SpeechErrorEvent) => {
      if (!activeRef.current) return;
      if (heldRef.current) {
        // Likely a "no speech detected" timeout mid-hold — restart and keep waiting.
        try {
          await Voice.start('en-US');
          return;
        } catch {
          // fall through to finalize
        }
      }
      finalize();
    };

    function finalize() {
      activeRef.current = false;
      heldRef.current = false;
      const text = accumulatedRef.current.trim();
      accumulatedRef.current = '';
      setPartial('');
      setIsListening(false);
      if (text && !cancelledRef.current) {
        onResultRef.current?.(text);
      }
      cancelledRef.current = false;
    }

    return () => {
      activeRef.current = false;
      heldRef.current = false;
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
    };
  }, []);

  async function start() {
    try {
      const hasPermission = await ensureMicPermission();
      if (!hasPermission) {
        Alert.alert('Microphone access denied', 'Enable microphone access in Settings to use voice input.');
        return;
      }
      const available = await Voice.isAvailable();
      if (!available) {
        Alert.alert(
          'Voice not available',
          Platform.OS === 'android'
            ? 'Speech recognition requires Google Speech Services. Try on a real device.'
            : 'Speech recognition is not available on this device.',
        );
        return;
      }
      cancelledRef.current = false;
      accumulatedRef.current = '';
      activeRef.current = true;
      heldRef.current = true;
      setPartial('');
      await Voice.start('en-US');
    } catch (e: any) {
      activeRef.current = false;
      heldRef.current = false;
      const msg: string = e?.message ?? String(e);
      if (
        msg.includes('recognizer') ||
        msg.includes('not available') ||
        msg.includes('not supported') ||
        msg.includes('Cannot find')
      ) {
        Alert.alert('Voice not supported', 'Try on a real device — emulators lack speech recognition.');
      }
      setIsListening(false);
    }
  }

  async function stop() {
    // Mark released — the in-flight (or next) onSpeechResults/onSpeechError will finalize.
    heldRef.current = false;
    try {
      await Voice.stop();
    } catch {
      // ignore — onSpeechResults/onSpeechError will still fire and finalize
    }
  }

  async function cancel() {
    cancelledRef.current = true;
    activeRef.current = false;
    heldRef.current = false;
    accumulatedRef.current = '';
    try {
      await Voice.cancel();
    } catch {
      // ignore
    }
    setIsListening(false);
    setPartial('');
  }

  return { isListening, partial, start, stop, cancel };
}
