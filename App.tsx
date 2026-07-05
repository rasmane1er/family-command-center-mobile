if (__DEV__) {
  require("./ReactotronConfig");
}
import './src/i18n';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/theme/ThemeContext';
import { startNetworkSync, stopNetworkSync } from './src/sync/networkSync';
import { useAppStore } from './src/store/useAppStore';
import { useAuthStore } from './src/store/useAuthStore';
import { apiRequest } from './src/api/client';
import { configurePurchases } from './src/services/purchaseService';
import { useGuardianCommandPolling } from './src/hooks/useGuardianCommandPolling';
import { useNotificationTriggers } from './src/hooks/useNotificationTriggers';
import { usePushRegistration } from './src/hooks/usePushRegistration';
import { useAutomationEngine } from './src/hooks/useAutomationEngine';
import { useBiometricLock } from './src/hooks/useBiometricLock';
import { BiometricLockScreen } from './src/components/common/BiometricLockScreen';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { i18n } from './src/i18n';

interface SubscriptionMeResponse {
  subscriptionTier: 'free' | 'premium' | 'family_pro';
  subscriptionSource: string | null;
  subscriptionRenewsAt: string | null;
  subscriptionUpdatedAt: string | null;
}

function AppInner() {
  const language = useAppStore((s) => s.settings.language);
  const familyId = useAuthStore((s) => s.familyId);

  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  useEffect(() => {
    startNetworkSync();
    return () => stopNetworkSync();
  }, []);

  useGuardianCommandPolling();
  useNotificationTriggers();
  useAutomationEngine();
  usePushRegistration(!!familyId);
  const { isLocked, authenticate } = useBiometricLock();

  // Configure RevenueCat as soon as (and whenever) the account becomes
  // backend-linked — e.g. right after sign-up/sign-in resolves familyId.
  // Skips silently if familyId is still null (configurePurchases handles that).
  useEffect(() => {
    if (!familyId) return;
    configurePurchases().catch(() => {});
  }, [familyId]);

  // One-shot reconciliation on launch: pulls the backend's view of the
  // subscription (updated via the RevenueCat webhook) and syncs local state
  // if it drifted. The primary sync path is usePurchases' CustomerInfo
  // listener — this is just a fallback in case a webhook landed while the
  // app was closed.
  //
  // Skipped entirely in __DEV__: a bare dev-client can't complete a real
  // RevenueCat purchase, so Settings has a dev-only "Set Tier" override for
  // testing premium features locally. Without this guard, this effect
  // overwrote that override with the backend's real (always 'free', since
  // there's no real purchase behind a test account) tier on every reload —
  // "my subscription resets every time I reload" was this exact codepath.
  useEffect(() => {
    if (__DEV__) return;
    if (!familyId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await apiRequest<SubscriptionMeResponse>('/subscriptions/me');
        if (cancelled) return;
        const localTier = useAppStore.getState().settings.subscriptionTier;
        if (res.subscriptionTier !== localTier) {
          useAppStore.getState().updateSettings({ subscriptionTier: res.subscriptionTier });
        }
      } catch {
        // Offline or backend unreachable — keep local state as-is.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [familyId]);

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
      {isLocked && <BiometricLockScreen onUnlock={authenticate} />}
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <AppInner />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
