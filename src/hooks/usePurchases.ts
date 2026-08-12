import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  STORE_REPLACEMENT_MODE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
  type StoreProductChangeInfo,
} from 'react-native-purchases';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  activePeriodForTier,
  activeProductIdentifierForTier,
  describePurchaseError,
  findPackageForTier,
  getCustomerInfo,
  getOfferings,
  hasOverlappingEntitlements,
  presentCustomerCenter as presentCustomerCenterService,
  purchasePackage as purchasePackageService,
  restorePurchases as restorePurchasesService,
  tierFromEntitlements,
} from '../services/purchaseService';
import { useSubscription } from './useSubscription';

interface UsePurchasesResult {
  offerings: PurchasesOffering | null;
  isLoading: boolean;
  error: string | null;
  isPro: boolean;
  purchase: (
    pkg: PurchasesPackage,
    productChangeInfo?: StoreProductChangeInfo | null,
  ) => Promise<{ success: boolean; userCancelled?: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; error?: string }>;
  // Preferred entry point for any "Upgrade"/"Downgrade" tap. Purchases the
  // exact package for the requested tier + billing period (default monthly)
  // — no-op if the user already has that tier. On Android, if the customer
  // currently holds a *different* paid tier, replaces it in-place instead of
  // stacking a second subscription (Play Billing only; iOS has no
  // client-side equivalent — see purchaseService.purchasePackage).
  showPaywall: (tier?: 'premium' | 'family_pro', period?: 'monthly' | 'annual') => Promise<PAYWALL_RESULT>;
  // Preferred entry point for "Manage Subscription" — native Customer Center
  // (cancel, change plan, restore, refund requests on iOS).
  showCustomerCenter: () => Promise<void>;
  currentTier: ReturnType<typeof useSubscription>['tier'];
  // Billing period backing currentTier ('free' has none) — lets callers offer
  // a period switch (e.g. "Switch to Yearly") on the tier the customer
  // already owns, not just tiers they don't.
  currentPeriod: 'monthly' | 'annual' | null;
}

function syncTierFromCustomerInfo(customerInfo: CustomerInfo) {
  const tier = tierFromEntitlements(customerInfo.entitlements.active);
  const hasOverlappingSubscriptions = hasOverlappingEntitlements(customerInfo.entitlements.active);
  const subscriptionPeriod = tier === 'free' ? null : activePeriodForTier(customerInfo.entitlements.active, tier);
  useAppStore.getState().updateSettings({ subscriptionTier: tier, hasOverlappingSubscriptions, subscriptionPeriod });
  useAppStore.getState().setSubscriptionChecked(true);
}

export function usePurchases(): UsePurchasesResult {
  const { tier: currentTier } = useSubscription();
  const currentPeriod = useAppStore((s) => s.settings.subscriptionPeriod ?? null);
  const familyId = useAuthStore((s) => s.familyId);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait until the account is backend-linked (familyId available) so
    // configurePurchases() in App.tsx has already run before we try to
    // load offerings. getOfferings() calls ensureConfigured() internally,
    // so no separate isPurchasesConfigured() guard is needed.
    if (!familyId) return;

    let cancelled = false;
    setIsLoading(true);
    getOfferings()
      .then((offering) => {
        if (!cancelled) setOfferings(offering);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load subscription plans.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // Sync the locally-cached tier with RevenueCat's actual entitlements as
    // soon as the account is linked. Without this, a device that already
    // holds entitlements (e.g. from earlier testing, a reinstall, or a
    // purchase made outside this session) keeps showing a stale/default
    // tier — including a stale "Free" while an overlapping-subscriptions
    // warning correctly reports Premium/Family Pro as active — until the
    // next purchase or restore event happens to fire the listener below.
    getCustomerInfo()
      .then((customerInfo) => {
        if (!cancelled) syncTierFromCustomerInfo(customerInfo);
      })
      .catch(() => {
        // Couldn't verify (offline, RevenueCat unreachable, etc.) — still
        // mark the check as attempted so gates fall back to whatever tier
        // is already cached instead of spinning forever.
        if (!cancelled) useAppStore.getState().setSubscriptionChecked(true);
      });

    // Sync immediately on any entitlement change (purchase, renewal, refund,
    // restore) rather than waiting on the backend webhook round-trip.
    const listener = (customerInfo: CustomerInfo) => syncTierFromCustomerInfo(customerInfo);
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [familyId]);

  const purchase = useCallback(async (pkg: PurchasesPackage, productChangeInfo?: StoreProductChangeInfo | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const customerInfo = await purchasePackageService(pkg, productChangeInfo);
      syncTierFromCustomerInfo(customerInfo);
      return { success: true };
    } catch (err) {
      const { userCancelled, message } = describePurchaseError(err);
      if (!userCancelled) setError(message);
      return { success: false, userCancelled, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restore = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const customerInfo = await restorePurchasesService();
      syncTierFromCustomerInfo(customerInfo);
      return { success: true };
    } catch (err) {
      const { message } = describePurchaseError(err);
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showPaywall = useCallback(async (
    tier: 'premium' | 'family_pro' = 'premium',
    period: 'monthly' | 'annual' = 'monthly',
  ) => {
    if (currentTier === tier && currentPeriod === period) {
      // Already has this exact tier + period — same no-op behavior
      // presentPaywallIfNeeded used to give. A period switch on the same
      // tier (e.g. monthly -> yearly) falls through to a real purchase below.
      return PAYWALL_RESULT.NOT_PRESENTED;
    }

    try {
      const offering = offerings ?? (await getOfferings());
      if (!offering) {
        setError('Unable to load subscription plans.');
        return PAYWALL_RESULT.ERROR;
      }

      const pkg = findPackageForTier(offering, tier, period);
      if (!pkg) {
        setError('This plan is not available right now.');
        return PAYWALL_RESULT.ERROR;
      }

      // Android-only: if the customer already holds a paid tier — either a
      // *different* tier, or the same tier on a different billing period
      // (e.g. monthly -> yearly) — replace it in-place instead of purchasing
      // a second, overlapping subscription. No iOS equivalent exists without
      // an App Store Connect Subscription Group — see purchaseService.purchasePackage.
      let productChangeInfo: StoreProductChangeInfo | undefined;
      if (Platform.OS === 'android' && currentTier !== 'free' && (currentTier !== tier || currentPeriod !== period)) {
        try {
          const activeInfo = await getCustomerInfo();
          const oldProductIdentifier = activeProductIdentifierForTier(
            activeInfo.entitlements.active,
            currentTier as 'premium' | 'family_pro',
          );
          if (oldProductIdentifier) {
            productChangeInfo = { oldProductIdentifier, replacementMode: STORE_REPLACEMENT_MODE.WITH_TIME_PRORATION };
          }
        } catch {
          // Fall through and purchase without replacement info — worst case
          // this creates a second subscription, same as before this fix.
        }
      }

      const result = await purchase(pkg, productChangeInfo);
      if (result.success) {
        // Don't rely solely on the CustomerInfoUpdateListener here — it isn't
        // guaranteed to fire before this promise resolves, which left the
        // Settings tier list showing the old "Current Plan" checkmark right
        // after a successful purchase. Fetch and sync explicitly instead.
        try {
          const customerInfo = await getCustomerInfo();
          syncTierFromCustomerInfo(customerInfo);
        } catch {
          // Listener will still catch up if this fetch fails.
        }
        return PAYWALL_RESULT.PURCHASED;
      }
      if (result.userCancelled) return PAYWALL_RESULT.CANCELLED;
      setError(result.error ?? 'Something went wrong. Please try again.');
      return PAYWALL_RESULT.ERROR;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      return PAYWALL_RESULT.ERROR;
    }
  }, [offerings, currentTier, currentPeriod, purchase]);

  const showCustomerCenter = useCallback(async () => {
    try {
      await presentCustomerCenterService();
      // Customer Center can result in a cancellation/plan change that the
      // CustomerInfoUpdateListener will pick up automatically once dismissed.
    } catch (err) {
      // Re-thrown (not just recorded in `error`) so callers can fall back to
      // a different management path — e.g. opening the store's subscription
      // page directly when Customer Center itself isn't reachable.
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      throw err;
    }
  }, []);

  return {
    offerings,
    isLoading,
    error,
    isPro: currentTier === 'family_pro',
    purchase,
    restore,
    showPaywall,
    showCustomerCenter,
    currentTier,
    currentPeriod,
  };
}
