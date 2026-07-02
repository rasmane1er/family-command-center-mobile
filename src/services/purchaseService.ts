import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT, type PresentCustomerCenterParams } from 'react-native-purchases-ui';
import { revenueCatConfig, REVENUECAT_ENTITLEMENTS } from '../config/revenuecat';
import { useAuthStore } from '../store/useAuthStore';
import type { SubscriptionTier } from '../hooks/useSubscription';

let configured = false;
let configuredAppUserId: string | null = null;

// Configures the RevenueCat SDK with our `Family.id` as the app_user_id so the
// backend webhook (subscriptions.ts) can map RevenueCat purchase events back
// to the right family. Must NOT use RevenueCat's anonymous ID. Skips entirely
// if the account isn't backend-linked yet (familyId === null) — the account
// gets configured (or re-configured) once familyId becomes available.
export async function configurePurchases(): Promise<boolean> {
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return false;

  if (configured && configuredAppUserId === familyId) return true;

  const apiKey = Platform.OS === 'ios' ? revenueCatConfig.iosApiKey : revenueCatConfig.androidApiKey;
  if (!apiKey) {
    // Expected until the RevenueCat dashboard keys are set — see
    // src/config/revenuecat.ts. IAP stays disabled until then.
    return false;
  }

  // RevenueCatUI's present* methods only return an opaque PAYWALL_RESULT.ERROR
  // to JS with no reason attached — DEBUG logging is the only way to see the
  // real native-side cause (missing offering, no products, invalid key, etc.)
  // in the Xcode/Metro console. Safe to leave on in dev; harmless in prod.
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

  Purchases.configure({ apiKey, appUserID: familyId });
  configured = true;
  configuredAppUserId = familyId;
  return true;
}

export function isPurchasesConfigured(): boolean {
  return configured;
}

// Every RevenueCat/RevenueCatUI call below reaches into native code. If
// Purchases.configure() was never called, react-native-purchases-ui's
// present* methods don't reject a promise — they throw a native-side fatal
// exception that crashes the whole app, not just this feature. This guard
// makes that failure mode a normal, catchable JS Error instead. Also
// double-checks the account is backend-linked (familyId set) since that's
// almost always *why* configuration hasn't happened yet.
class PurchasesNotReadyError extends Error {
  constructor(reason: 'not_linked' | 'not_configured') {
    super(
      reason === 'not_linked'
        ? 'Subscriptions are not available yet — this account is not linked to a server profile. Try signing in again.'
        : 'Subscriptions are not available right now. Please try again in a moment.',
    );
    this.name = 'PurchasesNotReadyError';
  }
}

async function ensureConfigured(): Promise<void> {
  if (configured) return;
  if (!useAuthStore.getState().familyId) throw new PurchasesNotReadyError('not_linked');
  const ok = await configurePurchases();
  if (!ok) throw new PurchasesNotReadyError('not_configured');
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  await ensureConfigured();
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  await ensureConfigured();
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  await ensureConfigured();
  return Purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  await ensureConfigured();
  return Purchases.getCustomerInfo();
}

// Pure mapping from RevenueCat's active entitlements to our SubscriptionTier.
// family_pro wins if a customer somehow has both entitlements active.
export function tierFromEntitlements(activeEntitlements: CustomerInfo['entitlements']['active']): SubscriptionTier {
  if (activeEntitlements[REVENUECAT_ENTITLEMENTS.familyPro]) return 'family_pro';
  if (activeEntitlements[REVENUECAT_ENTITLEMENTS.premium]) return 'premium';
  return 'free';
}

function entitlementForTier(tier: 'premium' | 'family_pro'): string {
  return tier === 'family_pro' ? REVENUECAT_ENTITLEMENTS.familyPro : REVENUECAT_ENTITLEMENTS.premium;
}

// Presents RevenueCat's dashboard-configured Paywall UI (best-practice modern
// path — no manual package/pricing UI to maintain). Resolves to PAYWALL_RESULT:
// NOT_PRESENTED | ERROR | CANCELLED | PURCHASED | RESTORED.
export async function presentPaywall(): Promise<PAYWALL_RESULT> {
  await ensureConfigured();
  return RevenueCatUI.presentPaywall();
}

// Only shows the paywall if the user doesn't already have the target tier's
// entitlement. Defaults to 'premium' (the entry paid tier) — pass 'family_pro'
// when the gated feature specifically requires the top tier. Both entitlements'
// packages should live in the same "default" offering (RevenueCat's multi-tier
// Paywall v2 template is designed for exactly this — one paywall, both tiers
// selectable) so either call renders the same paywall with the right tier
// pre-selected/required.
export async function presentPaywallIfNeeded(tier: 'premium' | 'family_pro' = 'premium'): Promise<PAYWALL_RESULT> {
  await ensureConfigured();
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: entitlementForTier(tier),
  });

  if (__DEV__ && result === PAYWALL_RESULT.ERROR) {
    // presentPaywallIfNeeded() doesn't surface *why* it failed to JS — the
    // most common cause by far is no "current" Offering configured in the
    // RevenueCat dashboard (or the current offering has zero packages). This
    // check runs after the fact just to log a pointed diagnostic; it doesn't
    // change the result the caller sees.
    Purchases.getOfferings()
      .then((offerings) => {
        if (!offerings.current) {
          console.warn(
            '[RevenueCat] Paywall failed to load: no "current" Offering is configured in the dashboard ' +
              '(Offerings → mark one as current, with the monthly/yearly packages attached).',
          );
        } else if (offerings.current.availablePackages.length === 0) {
          console.warn(
            `[RevenueCat] Paywall failed to load: the current offering "${offerings.current.identifier}" has no packages attached.`,
          );
        } else {
          console.warn(
            '[RevenueCat] Paywall failed to load for an unknown reason — check the DEBUG logs just above this line for the native error.',
          );
        }
      })
      .catch(() => {});
  }

  return result;
}

// Native subscription management UI (cancel, change plan, refund requests on
// iOS, restore, FAQs) — configured in the RevenueCat dashboard under
// Customer Center. Preferred over hand-rolled "manage subscription" flows.
export async function presentCustomerCenter(params?: PresentCustomerCenterParams): Promise<void> {
  await ensureConfigured();
  return RevenueCatUI.presentCustomerCenter(params);
}

export { PAYWALL_RESULT };

// Normalizes RevenueCat purchase/restore errors into a friendly message,
// distinguishing user-cancelled purchases (not a real error) from real
// failures so the UI can decide whether to show an alert.
export function describePurchaseError(error: unknown): { userCancelled: boolean; message: string } {
  const err = error as { userCancelled?: boolean; message?: string; readableErrorCode?: string } | null;
  if (err?.userCancelled) {
    return { userCancelled: true, message: 'Purchase cancelled.' };
  }
  return {
    userCancelled: false,
    message: err?.message || err?.readableErrorCode || 'Something went wrong with the purchase. Please try again.',
  };
}
