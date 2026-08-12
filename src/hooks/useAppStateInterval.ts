import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Runs `callback` immediately and then every `intervalMs` while the app is
// foregrounded; pauses entirely while backgrounded instead of continuing to
// poll a screen nobody can see, and fires once more immediately on return to
// foreground so state isn't stale after a backgrounding.
export function useAppStateInterval(callback: () => void, intervalMs: number, enabled = true): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval) return;
      callbackRef.current();
      interval = setInterval(() => callbackRef.current(), intervalMs);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    if (AppState.currentState === 'active') start();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') start();
      else stop();
    });

    return () => {
      stop();
      sub.remove();
    };
  }, [intervalMs, enabled]);
}
