import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import { fetchFeatureFlags } from '../services/featureFlagService';

interface FeatureFlagState {
  flags: Record<string, boolean>;
  isLoaded: boolean;
  isEnabled: (key: string) => boolean;
  fetchFlags: () => Promise<void>;
}

// Persisted so the last-known flags are available immediately on cold start
// (before the network round-trip resolves), same offline-first pattern the
// rest of the app's stores use. A flag not present in `flags` evaluates to
// false — new flags default off until explicitly rolled out, and a stale
// cached flag from a deleted server-side flag harmlessly falls back to false
// once the next fetch overwrites it.
export const useFeatureFlagStore = create<FeatureFlagState>()(
  persist(
    (set, get) => ({
      flags: {},
      isLoaded: false,

      isEnabled: (key) => get().flags[key] === true,

      fetchFlags: async () => {
        try {
          const { flags } = await fetchFeatureFlags();
          set({ flags, isLoaded: true });
        } catch {
          // Offline or request failed — keep whatever was last persisted.
          set({ isLoaded: true });
        }
      },
    }),
    {
      name: 'family-command-center-feature-flags',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ flags: state.flags }),
    }
  )
);
