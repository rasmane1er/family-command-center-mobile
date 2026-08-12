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

// Pricing reviewed 2026-07 against competitors (Cozi, FamCal, OurHome, Life360,
// Cubtale, YNAB) — this app spans far more categories (ops, finance, tasks, AI,
// documents, pets, emergency, inventory, childcare, meal planning, travel,
// vehicles, automation) than any single competitor, which supports pricing at
// the upper end of the comparable range rather than the middle.
export const TIER_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
  free: {
    // Deliberately tight (was 5) — creates real upgrade pressure for any
    // household beyond a couple, rather than being a purely cosmetic limit.
    maxFamilyMembers: 2,
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
    maxFamilyMembers: Infinity,
    aiQueriesPerMonth: 100, // was 50 — felt restrictive at that depth of feature set
    documentVault: true,
    cloudSync: true,
    militaryMode: false,
    digitalTwin: false,
    unlimitedAI: false,
    prioritySupport: false,
    advancedFinance: true,
  },
  family_pro: {
    maxFamilyMembers: Infinity,
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

// Monthly price — shown as the primary/default price everywhere in the app.
export const TIER_PRICES: Record<SubscriptionTier, string> = {
  free: '$0',
  premium: '$12.99/mo',
  family_pro: '$19.99/mo',
};

// Annual price, shown alongside monthly as the discounted option — annual
// plans convert better and improve cash flow, so surface them prominently
// wherever TIER_PRICES is shown, not just as a footnote.
export const TIER_YEARLY_PRICES: Record<SubscriptionTier, string> = {
  free: '$0',
  premium: '$99/yr',
  family_pro: '$179/yr',
};

// Rounded savings vs. paying monthly for 12 months — used for the "Save X%" badge.
export const TIER_YEARLY_SAVINGS_PCT: Record<SubscriptionTier, number> = {
  free: 0,
  premium: 36,
  family_pro: 25,
};

export function useSubscription() {
  const tier = (useAppStore((s) => s.settings.subscriptionTier) ?? 'free') as SubscriptionTier;
  // True once RevenueCat (or the /subscriptions/me fallback) has confirmed
  // the account's real tier at least once this session — lets callers tell
  // "confirmed free" apart from "haven't checked yet, defaulting to free".
  const isChecked = useAppStore((s) => s.subscriptionChecked);
  const features = TIER_FEATURES[tier];

  const canAccess = (feature: keyof SubscriptionFeatures): boolean => {
    const val = features[feature];
    return typeof val === 'boolean' ? val : (val as number) > 0;
  };

  const isAtLeast = (required: SubscriptionTier): boolean => {
    const order: SubscriptionTier[] = ['free', 'premium', 'family_pro'];
    return order.indexOf(tier) >= order.indexOf(required);
  };

  return { tier, isChecked, features, canAccess, isAtLeast, TIER_FEATURES, TIER_LABELS, TIER_PRICES };
}
