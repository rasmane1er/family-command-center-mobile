import { useCallback, useEffect, useState } from 'react';
import Purchases, { type CustomerInfo, type PurchasesOffering, type PurchasesPackage } from 'react-native-purchases';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useAppStore } from '../store/useAppStore';
import {
  describePurchaseError,
  getOfferings,
  isPurchasesConfigured,
  presentCustomerCenter as presentCustomerCenterService,
  presentPaywallIfNeeded as presentPaywallIfNeededService,
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
  purchase: (pkg: PurchasesPackage) => Promise<{ success: boolean; userCancelled?: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; error?: string }>;
  // Preferred entry point for any "Upgrade" tap — shows RevenueCat's
  // dashboard-configured Paywall UI, no-op if the user already has the tier
  // requested. Defaults to 'premium' (the entry paid tier).
  showPaywall: (tier?: 'premium' | 'family_pro') => Promise<PAYWALL_RESULT>;
  // Preferred entry point for "Manage Subscription" — native Customer Center
  // (cancel, change plan, restore, refund requests on iOS).
  showCustomerCenter: () => Promise<void>;
  currentTier: ReturnType<typeof useSubscription>['tier'];
}

function syncTierFromCustomerInfo(customerInfo: CustomerInfo) {
  // Skipped in __DEV__ for the same reason as the App.tsx backend
  // reconciliation: RevenueCat's CustomerInfoUpdateListener fires
  // immediately on registration with the SDK's real (no real purchase
  // behind a bare dev-client sandbox account, so always empty/'free')
  // entitlement state — which would otherwise clobber Settings' dev-only
  // tier override the instant any screen using usePurchases() mounts.
  if (__DEV__) return;
  const tier = tierFromEntitlements(customerInfo.entitlements.active);
  useAppStore.getState().updateSettings({ subscriptionTier: tier });
}

export function usePurchases(): UsePurchasesResult {
  const { tier: currentTier } = useSubscription();
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPurchasesConfigured()) return;

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

    // Sync immediately on any entitlement change (purchase, renewal, refund,
    // restore) rather than waiting on the backend webhook round-trip.
    const listener = (customerInfo: CustomerInfo) => syncTierFromCustomerInfo(customerInfo);
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    setIsLoading(true);
    setError(null);
    try {
      const customerInfo = await purchasePackageService(pkg);
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

  const showPaywall = useCallback(async (tier: 'premium' | 'family_pro' = 'premium') => {
    try {
      const result = await presentPaywallIfNeededService(tier);
      // The paywall's own listener-driven refresh (CustomerInfoUpdateListener,
      // above) already syncs the tier on PURCHASED/RESTORED — nothing else to do here.
      if (result === PAYWALL_RESULT.ERROR) {
        setError('Something went wrong loading the paywall. Please try again.');
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      return PAYWALL_RESULT.ERROR;
    }
  }, []);

  const showCustomerCenter = useCallback(async () => {
    try {
      await presentCustomerCenterService();
      // Customer Center can result in a cancellation/plan change that the
      // CustomerInfoUpdateListener will pick up automatically once dismissed.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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
  };
}
