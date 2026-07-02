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
  useEffect(() => {
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
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppInner />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
