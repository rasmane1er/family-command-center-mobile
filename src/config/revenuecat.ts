// Set EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY in your
// .env with the public API keys from the RevenueCat dashboard (Project settings
// → API keys) for production. These are safe to ship in the client bundle — they
// are not secrets. Falls back to the shared test/sandbox key for local dev so IAP
// works out of the box before per-platform keys are set up.
//
// This must match RevenueCat dashboard → API keys → SDK API keys → "Test Store"
// public key exactly, or every SDK call fails with a silent-until-you-check-logs
// "Invalid API Key" 401 — that's what the previous key here was doing.
const TEST_API_KEY = 'test_rxrnfKMVoxIdabSeEBZKrznAJMs';

export const revenueCatConfig = {
  iosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? TEST_API_KEY,
  androidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? TEST_API_KEY,
};

// Must match exactly what's configured in the RevenueCat dashboard (Entitlements)
// and resolveTier() in family-command-center-api/src/routes/subscriptions.ts.
// Two paid entitlements, mapped 1:1 onto the app's internal SubscriptionTier
// ('premium' | 'family_pro') so feature-gating via useSubscription() elsewhere
// in the app works unchanged.
//
// "family command center Pro" already exists in the dashboard (originally set
// up as a single-tier product) — it's kept as-is and repurposed as the
// FAMILY PRO tier's entitlement. "premium" is a NEW entitlement that still
// needs to be created in the dashboard for the Premium tier to actually be
// purchasable — see the setup checklist wherever this is discussed.
export const REVENUECAT_ENTITLEMENTS = {
  premium: 'premium',
  familyPro: 'family command center Pro',
} as const;

// Product identifiers configured in the RevenueCat dashboard. "monthly"/
// "yearly" already exist (attached to the family_pro entitlement above) —
// the premium_* ones are new and still need to be created, attached to the
// "premium" entitlement, and added to the "default" offering alongside the
// existing two. Presented automatically by the RevenueCat Paywall UI — these
// constants are for reference/debugging, not manual lookup.
export const REVENUECAT_PRODUCTS = {
  premiumMonthly: 'premium_monthly',
  premiumYearly: 'premium_yearly',
  familyProMonthly: 'monthly',
  familyProYearly: 'yearly',
} as const;
