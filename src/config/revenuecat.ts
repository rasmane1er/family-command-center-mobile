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

// __DEV__ is false in every EAS build profile (development/preview/production
// all bundle in release mode), so this only fires for a real shipped build —
// loud and impossible to miss in device logs, unlike the 401 this previously
// surfaced as only if you happened to check RevenueCat's own SDK logs.
if (!__DEV__ && (revenueCatConfig.iosApiKey === TEST_API_KEY || revenueCatConfig.androidApiKey === TEST_API_KEY)) {
  console.error(
    '[revenuecat] This build is using the TEST/SANDBOX API key in a non-dev build — ' +
      'real purchases will fail. Set EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ' +
      'as EAS environment variables for this build profile.'
  );
}

// Must match exactly what's configured in the RevenueCat dashboard (Entitlements)
// and resolveTier() in family-command-center-api/src/routes/subscriptions.ts.
// Two paid entitlements, mapped 1:1 onto the app's internal SubscriptionTier
// ('premium' | 'family_pro') so feature-gating via useSubscription() elsewhere
// in the app works unchanged.
//
// Both entitlements exist in the dashboard: "family command center Pro"
// (originally set up as a single-tier product, repurposed as the FAMILY PRO
// tier's entitlement) and "premium" (Premium tier), each with its products
// attached and included in the "default" offering.
export const REVENUECAT_ENTITLEMENTS = {
  premium: 'premium',
  familyPro: 'family command center Pro',
} as const;

// Product identifiers configured in the RevenueCat dashboard, all four
// already created and attached to their entitlements above. Presented
// automatically by the RevenueCat Paywall UI — these constants are for
// reference/debugging, not manual lookup.
export const REVENUECAT_PRODUCTS = {
  premiumMonthly: 'premium_monthly',
  premiumYearly: 'premium_yearly',
  familyProMonthly: 'monthly',
  familyProYearly: 'yearly',
} as const;
