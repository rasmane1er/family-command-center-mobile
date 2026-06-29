import { useAppStore } from '../store/useAppStore';

export type SubscriptionTier = 'free' | 'premium' | 'family_pro';

export interface SubscriptionFeatures {
  maxFamilyMembers: number;
  aiQueriesPerMonth: number;
  documentVault: boolean;
  cloudSync: boolean;
  militaryMode: boolean;
  digitalTwin: boolean;
  unlimitedAI: boolean;
  prioritySupport: boolean;
  advancedFinance: boolean;
}

export const TIER_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
  free: {
    maxFamilyMembers: 5,
    aiQueriesPerMonth: 10,
    documentVault: false,
    cloudSync: false,
    militaryMode: false,
    digitalTwin: false,
    unlimitedAI: false,
    prioritySupport: false,
    advancedFinance: false,
  },
  premium: {
    maxFamilyMembers: 15,
    aiQueriesPerMonth: 50,
    documentVault: true,
    cloudSync: true,
    militaryMode: false,
    digitalTwin: false,
    unlimitedAI: false,
    prioritySupport: false,
    advancedFinance: true,
  },
  family_pro: {
    maxFamilyMembers: 20,
    aiQueriesPerMonth: Infinity,
    documentVault: true,
    cloudSync: true,
    militaryMode: true,
    digitalTwin: true,
    unlimitedAI: true,
    prioritySupport: true,
    advancedFinance: true,
  },
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free',
  premium: 'Premium',
  family_pro: 'Family Pro',
};

export const TIER_PRICES: Record<SubscriptionTier, string> = {
  free: '$0',
  premium: '$9.99/mo',
  family_pro: '$19.99/mo',
};

export function useSubscription() {
  const tier = (useAppStore((s) => s.settings.subscriptionTier) ?? 'free') as SubscriptionTier;
  const features = TIER_FEATURES[tier];

  const canAccess = (feature: keyof SubscriptionFeatures): boolean => {
    const val = features[feature];
    return typeof val === 'boolean' ? val : (val as number) > 0;
  };

  const isAtLeast = (required: SubscriptionTier): boolean => {
    const order: SubscriptionTier[] = ['free', 'premium', 'family_pro'];
    return order.indexOf(tier) >= order.indexOf(required);
  };

  return { tier, features, canAccess, isAtLeast, TIER_FEATURES, TIER_LABELS, TIER_PRICES };
}
