import { useEffect } from 'react';
import { useHealthScore } from '../hooks/useHealthScore';
import { useAIInsights } from '../hooks/useAIInsights';
import { useAIStore } from '../store/useAIStore';
import { Analytics } from '../services/AnalyticsService';

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
  }, []);

  return null;
}
