import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';

// Matches the "Auto-Lock" setting's subtitle ("Lock app after 5 minutes of
// inactivity"). Only meaningful when biometricLock is also on — see below.
const AUTO_LOCK_DELAY_MS = 5 * 60 * 1000;

export function useBiometricLock() {
  const biometricLockSetting = useAppStore((s) => s.settings.biometricLock);
  // Defaults to true, matching useAppStore's defaultSettings.
  const autoLock = useAppStore((s) => s.settings.autoLock ?? true);
  // The setting persists across sign-out (it lives in useAppStore, not
  // useAuthStore), so without this a signed-out device — e.g. someone else's
  // Face ID enrolled, about to sign into their own account — would be locked
  // out of the sign-in screen itself, which has no session to protect.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const biometricLock = biometricLockSetting && isAuthenticated;
  const [isLocked, setIsLocked] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const authenticating = useRef(false);
  // When the app last left the foreground — null while foregrounded.
  const backgroundedAtRef = useRef<number | null>(null);

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

  // Re-lock when the app returns to the foreground from the background, so
  // a device left unattended can't be picked up and browsed. With Auto-Lock
  // on (the default), a brief trip to the background — checking a
  // notification, switching apps for a few seconds — doesn't force a fresh
  // Face/Touch ID prompt; only a background stay of AUTO_LOCK_DELAY_MS or
  // longer does. With Auto-Lock off, every foreground return re-locks
  // immediately, regardless of how long the app was backgrounded.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appState.current;
      const wentToBackground = prevState === 'active' && nextState.match(/inactive|background/);
      const cameToForeground = prevState.match(/inactive|background/) && nextState === 'active';

      if (wentToBackground) {
        backgroundedAtRef.current = Date.now();
      }

      if (cameToForeground && biometricLock) {
        const backgroundedAt = backgroundedAtRef.current;
        const elapsedMs = backgroundedAt != null ? Date.now() - backgroundedAt : Infinity;
        if (!autoLock || elapsedMs >= AUTO_LOCK_DELAY_MS) {
          setIsLocked(true);
          authenticate();
        }
        backgroundedAtRef.current = null;
      }

      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [biometricLock, autoLock, authenticate]);

  return { isLocked: biometricLock && isLocked, authenticate };
}
