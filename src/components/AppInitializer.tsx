import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useHealthScore } from '../hooks/useHealthScore';
import { useAIInsights } from '../hooks/useAIInsights';
import { useAIStore } from '../store/useAIStore';
import { Analytics } from '../services/AnalyticsService';
import { evaluateRules } from '../services/AutomationEngine';

export function AppInitializer() {
  useHealthScore(); // subscribes to stores, writes back to useAppStore
  const { refresh } = useAIInsights();
  const insights = useAIStore((s) => s.insights);

  useEffect(() => {
    Analytics.track('app_open');

    // Seed insights on first open or if stale (older than 4 hours)
    const newest = insights[0];
    const stale = !newest || Date.now() - new Date(newest.createdAt).getTime() > 4 * 3_600_000;
    if (stale) refresh();

    // Run automation engine on startup
    setTimeout(() => evaluateRules(), 2000);

    // Re-run on each app foreground
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') evaluateRules();
    });
    return () => sub.remove();
  }, []);

  return null;
}
