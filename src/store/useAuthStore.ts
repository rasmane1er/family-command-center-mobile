import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple hash — good enough for a local PIN (not a password manager)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36) + pin.length.toString();
}

export type LockTimeout = 'immediate' | '1min' | '5min' | '15min' | '1hour' | 'never';

interface AuthState {
  // Setup
  hasPinSet: boolean;
  pinHash: string;
  biometricEnabled: boolean;
  lockTimeout: LockTimeout;

  // Runtime (not persisted)
  isAuthenticated: boolean;
  lastActiveAt: number;
  failedAttempts: number;
  lockedUntil: number | null;

  // Actions
  setupPin: (pin: string) => void;
  changePin: (oldPin: string, newPin: string) => boolean;
  removePin: () => void;
  verifyPin: (pin: string) => boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  setLockTimeout: (timeout: LockTimeout) => void;
  setAuthenticated: (value: boolean) => void;
  updateLastActive: () => void;
  checkShouldLock: () => boolean;
  resetFailedAttempts: () => void;
  logout: () => void;
}

const TIMEOUT_MS: Record<LockTimeout, number> = {
  immediate: 0,
  '1min': 60_000,
  '5min': 300_000,
  '15min': 900_000,
  '1hour': 3_600_000,
  never: Infinity,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      hasPinSet: false,
      pinHash: '',
      biometricEnabled: false,
      lockTimeout: '5min',

      isAuthenticated: false,
      lastActiveAt: 0,
      failedAttempts: 0,
      lockedUntil: null,

      setupPin: (pin) =>
        set({ hasPinSet: true, pinHash: hashPin(pin), isAuthenticated: true, failedAttempts: 0 }),

      changePin: (oldPin, newPin) => {
        if (hashPin(oldPin) !== get().pinHash) return false;
        set({ pinHash: hashPin(newPin) });
        return true;
      },

      removePin: () =>
        set({ hasPinSet: false, pinHash: '', biometricEnabled: false, isAuthenticated: true }),

      verifyPin: (pin) => {
        const { lockedUntil, failedAttempts } = get();
        if (lockedUntil && Date.now() < lockedUntil) return false;

        if (hashPin(pin) === get().pinHash) {
          set({ isAuthenticated: true, failedAttempts: 0, lockedUntil: null, lastActiveAt: Date.now() });
          return true;
        }

        const newAttempts = failedAttempts + 1;
        // Lock for 30s after 5 failed attempts, 5min after 10
        const lockMs = newAttempts >= 10 ? 300_000 : newAttempts >= 5 ? 30_000 : 0;
        set({
          failedAttempts: newAttempts,
          lockedUntil: lockMs > 0 ? Date.now() + lockMs : null,
        });
        return false;
      },

      setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),

      setLockTimeout: (timeout) => set({ lockTimeout: timeout }),

      setAuthenticated: (value) =>
        set({ isAuthenticated: value, lastActiveAt: value ? Date.now() : 0 }),

      updateLastActive: () => set({ lastActiveAt: Date.now() }),

      checkShouldLock: () => {
        const { hasPinSet, lockTimeout, lastActiveAt, isAuthenticated } = get();
        if (!hasPinSet || !isAuthenticated) return false;
        if (lockTimeout === 'never') return false;
        const elapsed = Date.now() - lastActiveAt;
        return elapsed > TIMEOUT_MS[lockTimeout];
      },

      resetFailedAttempts: () => set({ failedAttempts: 0, lockedUntil: null }),

      logout: () => set({ isAuthenticated: false, lastActiveAt: 0 }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist runtime session state
      partialize: (state) => ({
        hasPinSet: state.hasPinSet,
        pinHash: state.pinHash,
        biometricEnabled: state.biometricEnabled,
        lockTimeout: state.lockTimeout,
      }),
    }
  )
);
