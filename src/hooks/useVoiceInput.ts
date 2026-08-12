import { useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

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
  //   recognizer keeps listening (continuous: true) so a full sentence can be
  //   spoken across multiple pauses without cutting off early.
  const activeRef = useRef(false);
  const heldRef = useRef(false);
  const cancelledRef = useRef(false);
  const accumulatedRef = useRef('');

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

  useSpeechRecognitionEvent('start', () => {
    if (!activeRef.current) return;
    setIsListening(true);
    setPartial('');
  });

  useSpeechRecognitionEvent('result', (e: ExpoSpeechRecognitionResultEvent) => {
    if (!activeRef.current) return;
    const segment = e.results[0]?.transcript ?? '';
    if (e.isFinal) {
      accumulatedRef.current = mergeSegments(accumulatedRef.current, segment);
      setPartial(accumulatedRef.current);
      if (!heldRef.current) finalize();
    } else {
      setPartial(mergeSegments(accumulatedRef.current, segment));
    }
  });

  useSpeechRecognitionEvent('error', (e: ExpoSpeechRecognitionErrorEvent) => {
    if (!activeRef.current) return;
    // "no-speech"/"speech-timeout" mid-hold just means a pause — continuous
    // mode keeps the recognizer running, so there's nothing to restart here.
    if (e.error === 'no-speech' || e.error === 'speech-timeout') return;
    finalize();
  });

  useSpeechRecognitionEvent('end', () => {
    if (!activeRef.current) return;
    finalize();
  });

  useEffect(() => {
    return () => {
      activeRef.current = false;
      heldRef.current = false;
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  async function start() {
    try {
      let available = false;
      try {
        const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!granted) {
          Alert.alert('Microphone access denied', 'Enable microphone access in Settings to use voice input.');
          return;
        }
        available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      } catch (err: any) {
        const msg: string = err?.message ?? String(err);
        Alert.alert('Voice not available', `Could not start voice recognition: ${msg}`);
        return;
      }
      if (!available) {
        Alert.alert(
          'Voice not available',
          Platform.OS === 'android'
            ? 'Speech recognition isn\'t available on this device. Make sure Google app / Google Speech Services is installed and up to date.'
            : 'Speech recognition is not available on this device.',
        );
        return;
      }
      cancelledRef.current = false;
      accumulatedRef.current = '';
      activeRef.current = true;
      heldRef.current = true;
      setPartial('');
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
      });
    } catch (e: any) {
      activeRef.current = false;
      heldRef.current = false;
      const msg: string = e?.message ?? String(e);
      Alert.alert('Voice error', msg || 'Could not start voice recognition.');
      setIsListening(false);
    }
  }

  async function stop() {
    // Mark released — continuous mode keeps listening until stop() finalizes.
    heldRef.current = false;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // ignore — the 'end'/'error' event will still fire and finalize
    }
  }

  async function cancel() {
    cancelledRef.current = true;
    activeRef.current = false;
    heldRef.current = false;
    accumulatedRef.current = '';
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // ignore
    }
    setIsListening(false);
    setPartial('');
  }

  return { isListening, partial, start, stop, cancel };
}
