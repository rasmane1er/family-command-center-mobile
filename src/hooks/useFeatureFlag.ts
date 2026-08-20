import { useFeatureFlagStore } from '../store/useFeatureFlagStore';

// The store's own isEnabled() reads via get() — fine for a one-off check
// outside render, but calling it inside a component won't re-render that
// component when flags update later (e.g. fetchFlags() resolving after
// mount). This subscribes to just the one key's value via zustand's
// selector, so a component using this hook re-renders exactly when its
// own flag changes, nothing else.
export function useFeatureFlag(key: string): boolean {
  return useFeatureFlagStore((state) => state.flags[key] === true);
}
