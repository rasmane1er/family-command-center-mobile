import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAppStore } from '../store/useAppStore';

export function useBiometricLock() {
  const biometricLock = useAppStore((s) => s.settings.biometricLock);
  const [isLocked, setIsLocked] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const authenticating = useRef(false);

  const authenticate = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        // Device can't actually back the lock (removed/never set up biometrics) —
        // don't trap the user behind a lock screen that can never be passed.
        setIsLocked(false);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Family Command Center',
      });
      setIsLocked(!result.success);
    } finally {
      authenticating.current = false;
    }
  }, []);

  // Lock on cold launch when the setting is on.
  useEffect(() => {
    if (biometricLock) {
      setIsLocked(true);
      authenticate();
    }
    // Cold-launch check only — re-locking on foreground is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-lock whenever the app returns to the foreground from the background,
  // so a device left unattended can't be picked up and browsed.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (biometricLock && appState.current.match(/inactive|background/) && nextState === 'active') {
        setIsLocked(true);
        authenticate();
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [biometricLock, authenticate]);

  return { isLocked: biometricLock && isLocked, authenticate };
}
