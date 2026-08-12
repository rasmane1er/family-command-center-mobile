import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { AppSettings } from '../types';

interface AppState {
  isOnboarded: boolean;
  isLoading: boolean;
  settings: AppSettings;
  // Whether we've heard back at least once this session — from RevenueCat's
  // getCustomerInfo() or the backend's /subscriptions/me fallback — about
  // the account's real subscription tier. Deliberately NOT persisted (starts
  // false on every cold launch): settings.subscriptionTier's cached value
  // (defaulting to 'free') is indistinguishable from a freshly-confirmed
  // free account, so gates that key off tier alone (SubscriptionGate) would
  // otherwise flash the upgrade paywall at paid users for the brief window
  // before the async entitlement check resolves.
  subscriptionChecked: boolean;

  setOnboarded: (v: boolean) => void;
  setLoading: (v: boolean) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  toggleMilitaryMode: () => void;
  setSubscriptionChecked: (v: boolean) => void;
}

const defaultSettings: AppSettings = {
  theme: 'light',
  notifications: true,
  biometricLock: false,
  hideBalances: false,
  autoLock: true,
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
  subscriptionChecked: false,

  setOnboarded: (v) => set({ isOnboarded: v }),
  setLoading: (v) => set({ isLoading: v }),
  updateSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),
  toggleMilitaryMode: () =>
    set((state) => ({
      settings: { ...state.settings, militaryMode: !state.settings.militaryMode },
    })),
  setSubscriptionChecked: (v) => set({ subscriptionChecked: v }),
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
