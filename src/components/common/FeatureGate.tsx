import React from 'react';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

interface FeatureGateProps {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Generic percentage-rollout gate — unlike SubscriptionGate (a full-screen
// paywall with its own upsell UI), a feature flag is meant to hide a piece
// of UI silently while it rolls out, so the default fallback is nothing at
// all. Wraps whatever JSX should only exist for families the backend's
// rollout-percent bucketing (api/src/utils/featureFlags.ts) has switched on.
export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const enabled = useFeatureFlag(flag);
  return <>{enabled ? children : fallback}</>;
}
