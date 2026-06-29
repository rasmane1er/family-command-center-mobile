import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { AppSettings, FamilyHealthScore } from '../types';

interface AppState {
  isOnboarded: boolean;
  isLoading: boolean;
  settings: AppSettings;
  healthScore: FamilyHealthScore;
  activeTab: string;

  setOnboarded: (v: boolean) => void;
  setLoading: (v: boolean) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  setHealthScore: (score: FamilyHealthScore) => void;
  setActiveTab: (tab: string) => void;
  toggleMilitaryMode: () => void;
}

const defaultHealthScore: FamilyHealthScore = {
  overall: 72,
  financial: 68,
  tasks: 80,
  goals: 65,
  health: 75,
  communication: 88,
  lastCalculated: new Date().toISOString(),
};

const defaultSettings: AppSettings = {
  theme: 'light',
  notifications: true,
  biometricLock: false,
  currency: 'USD',
  language: 'en',
  militaryMode: false,
  weekStartsOn: 0,
  subscriptionTier: 'free',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
  isOnboarded: false,
  isLoading: false,
  settings: defaultSettings,
  healthScore: defaultHealthScore,
  activeTab: 'Home',

  setOnboarded: (v) => set({ isOnboarded: v }),
  setLoading: (v) => set({ isLoading: v }),
  updateSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),
  setHealthScore: (score) => set({ healthScore: score }),
  setActiveTab: (tab) => set({ activeTab: tab }),
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
        healthScore: state.healthScore,
        activeTab: state.activeTab,
      }),
    }
  )
);
