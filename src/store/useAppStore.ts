import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { AppSettings } from '../types';

interface AppState {
  isOnboarded: boolean;
  isLoading: boolean;
  settings: AppSettings;

  setOnboarded: (v: boolean) => void;
  setLoading: (v: boolean) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  toggleMilitaryMode: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'light',
  notifications: true,
  biometricLock: false,
  hideBalances: false,
  autoLock: true,
  cloudBackup: true,
  currency: 'USD',
  language: 'en',
  militaryMode: false,
  weekStartsOn: 0,
  subscriptionTier: 'free',
  deviceLockedMemberId: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
  isOnboarded: false,
  isLoading: false,
  settings: defaultSettings,

  setOnboarded: (v) => set({ isOnboarded: v }),
  setLoading: (v) => set({ isLoading: v }),
  updateSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),
  toggleMilitaryMode: () =>
    set((state) => ({
      settings: { ...state.settings, militaryMode: !state.settings.militaryMode },
    })),
    }),
    {
      name: 'family-command-center-app',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        isOnboarded: state.isOnboarded,
        settings: state.settings,
      }),
    }
  )
);
