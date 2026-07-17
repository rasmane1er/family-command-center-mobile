if (__DEV__) {
  require("./ReactotronConfig");
}
import { initSentry } from './src/config/sentry';
initSentry();
import './src/i18n';
import React, { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
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
import { usePlaidStore } from './src/store/usePlaidStore';
import { BiometricLockScreen } from './src/components/common/BiometricLockScreen';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { i18n } from './src/i18n';
import { SOSAlarmOverlay } from './src/components/guardian/SOSAlarmOverlay';
import { MessageBanner, type MessageBannerData } from './src/components/guardian/MessageBanner';
import { useGuardianStore } from './src/store/useGuardianStore';
import { useFamilyStore } from './src/store/useFamilyStore';
import { Alert, Platform } from 'react-native';
import { useNotificationsStore } from './src/store/useNotificationsStore';
import { NavigationContainerRef } from '@react-navigation/native';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';

// Create all Android notification channels at startup so pushes are never silently dropped.
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'General Notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  }).catch(() => {});
  Notifications.setNotificationChannelAsync('guardian_messages', {
    name: 'Child Messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  }).catch(() => {});
  Notifications.setNotificationChannelAsync('sos_alarm', {
    name: 'SOS Emergency Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500, 200, 500],
    enableLights: true,
    lightColor: '#FF0000',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
    sound: 'default',
  }).catch(() => {});
}

// Play sound + show heads-up alert for ALL notifications when app is foregrounded.
// SOS notifications need to be heard even when the guardian is actively using the app.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, unknown> | undefined;
    const isSOS = data?.type === 'sos';
    const isMessage = data?.type === 'message';
    console.log('[Push] received foreground notification type:', data?.type, 'title:', notification.request.content.title);
    return {
      shouldShowBanner: true,   // show ALL notifications while foregrounded
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: isMessage,
    };
  },
});

interface SubscriptionMeResponse {
  subscriptionTier: 'free' | 'premium' | 'family_pro';
  subscriptionSource: string | null;
  subscriptionRenewsAt: string | null;
  subscriptionUpdatedAt: string | null;
}

function AppInner() {
  const language = useAppStore((s) => s.settings.language);
  const familyId = useAuthStore((s) => s.familyId);

  // SOS alarm overlay state — shown whenever an SOS push arrives (foreground or tapped from background)
  const [sosAlarm, setSosAlarm] = useState<{ childName: string; message?: string } | null>(null);
  const [messageBanner, setMessageBanner] = useState<MessageBannerData | null>(null);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  const shownSosIds = useRef<Set<string>>(new Set());
  const processedNotifIds = useRef<Set<string>>(new Set());
  const sosAlerts = useGuardianStore((s) => s.sosAlerts);
  const familyMembers = useFamilyStore((s) => s.members);
  const guardianDevices = useGuardianStore((s) => s.devices);

  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  function navigateToChat(deviceId: string) {
    // Delay slightly so NavigationContainer is mounted on cold start
    setTimeout(() => {
      try {
        // @ts-ignore
        navigationRef.current?.navigate('Main', {
          screen: 'Tabs',
          params: {
            screen: 'Family',
            params: { screen: 'GuardianChat', params: { deviceId } },
          },
        });
      } catch {}
    }, 300);
  }

  // Add a push notification to the in-app badge store (silent — FCM already showed the banner)
  const addPushNotification = useRef((
    data: Record<string, unknown> | undefined,
    title: string,
    body: string,
    notifId: string,
  ) => {
    console.log('[Badge] addPushNotification called type=', data?.type, 'id=', notifId);
    if (!data) { console.log('[Badge] skipped: no data'); return; }
    if (processedNotifIds.current.has(notifId)) { console.log('[Badge] skipped: duplicate id'); return; }
    processedNotifIds.current.add(notifId);

    if (data.type === 'message') {
      const deviceId = data.deviceId as string | undefined;
      const content = data.content as string | undefined;
      const role = data.role as string | undefined;
      // Try to resolve device name for parent users; silently continue if child user
      // doesn't have permission to list devices.
      useGuardianStore.getState().hydrate().catch(() => {}).then(() => {
        const device = useGuardianStore.getState().devices.find((d) => d.id === deviceId);
        const senderLabel = role === 'parent' ? 'Parent' : (device?.deviceName ?? 'Child');
        console.log('[Badge] adding message notification sender=', senderLabel);
        useNotificationsStore.getState().addNotification({
          type: 'family',
          title: title || `💬 Message from ${senderLabel}`,
          body: content || body || 'New message',
          isRead: false,
          action: { label: 'Open Chat', route: 'GuardianChat', params: deviceId ? { deviceId } : undefined },
        }, true);
        console.log('[Badge] notification added, store count=', useNotificationsStore.getState().notifications.length);
      });
    }
    if (data.type === 'sos') {
      const childName = (data.childName as string) || 'Your child';
      useNotificationsStore.getState().addNotification({
        type: 'emergency',
        title: title || `🚨 SOS — ${childName}`,
        body: body || `${childName} needs help immediately!`,
        isRead: false,
      }, true);
    }
    if (data.type === 'tamper_alert') {
      useNotificationsStore.getState().addNotification({
        type: 'emergency',
        title: title || '⚠️ Parental Controls Disabled',
        body: body || 'A child device turned off monitoring.',
        isRead: false,
      }, true);
    }
    if (data.type === 'child_notification') {
      useNotificationsStore.getState().addNotification({
        type: 'family',
        title: title || '🔔 Child notification',
        body: body || 'Your child received a notification.',
        isRead: false,
      }, true);
    }
  }).current;

  // FOREGROUND: on Android, @react-native-firebase/messaging intercepts FCM before
  // expo-notifications can fire addNotificationReceivedListener. We must use Firebase's
  // own onMessage() handler to catch foreground pushes on Android.
  useEffect(() => {
    let unsubFirebase: (() => void) | null = null;
    try {
      const messaging = getMessaging();
      unsubFirebase = onMessage(messaging, (remoteMessage) => {
        const data = remoteMessage.data as Record<string, unknown> | undefined;
        const title = remoteMessage.notification?.title ?? '';
        const body = remoteMessage.notification?.body ?? '';
        const notifId = remoteMessage.messageId ?? `fb-${Date.now()}`;
        console.log('[Push] Firebase onMessage fired type=', data?.type);
        addPushNotification(data, title, body, notifId);
        if (data?.type === 'sos') {
          const childName = (data.childName as string) || 'Your child';
          setSosAlarm({ childName, message: (data.message as string) || undefined });
        }
        if (data?.type === 'message') {
          const deviceId = data.deviceId as string | undefined;
          const content = data.content as string | undefined;
          const device = guardianDevices.find((d) => d.id === deviceId);
          setMessageBanner({ deviceId: deviceId ?? '', deviceName: device?.deviceName ?? 'Child', content: content ?? 'New message' });
        }
        if (data?.type === 'tamper_alert') {
          const device = guardianDevices.find((d) => d.id === data.deviceId);
          Alert.alert('⚠️ Parental Controls Disabled', `${device?.deviceName ?? "Child's device"} turned off monitoring. Open the Family Guardian app to re-enable it.`, [{ text: 'OK' }]);
          useGuardianStore.getState().hydrate();
        }
      });
    } catch (e) {
      console.warn('[Push] Firebase onMessage setup failed:', e);
    }

    // Also keep expo listener as fallback (fires on iOS foregrounded pushes)
    const expoSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown> | undefined;
      const title = notification.request.content.title ?? '';
      const body = notification.request.content.body ?? '';
      console.log('[Push] expo addNotificationReceivedListener fired type=', data?.type);
      addPushNotification(data, title, body, notification.request.identifier);
      if (data?.type === 'sos') {
        const childName = (data.childName as string) || 'Your child';
        setSosAlarm({ childName, message: (data.message as string) || undefined });
      }
      if (data?.type === 'message') {
        const deviceId = data.deviceId as string | undefined;
        const content = data.content as string | undefined;
        const device = guardianDevices.find((d) => d.id === deviceId);
        setMessageBanner({ deviceId: deviceId ?? '', deviceName: device?.deviceName ?? 'Child', content: content ?? 'New message' });
      }
      if (data?.type === 'tamper_alert') {
        const device = guardianDevices.find((d) => d.id === data.deviceId);
        Alert.alert('⚠️ Parental Controls Disabled', `${device?.deviceName ?? "Child's device"} turned off monitoring. Open the Family Guardian app to re-enable it.`, [{ text: 'OK' }]);
        useGuardianStore.getState().hydrate();
      }
    });
    return () => {
      unsubFirebase?.();
      expoSub.remove();
    };
  }, [guardianDevices]);

  // BACKGROUND TAP + COLD START: user taps notification
  useEffect(() => {
    // Handle cold-start tap (app was killed when notification arrived)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) { console.log('[Push] getLastNotificationResponseAsync: no pending response'); return; }
      console.log('[Push] getLastNotificationResponseAsync: found response type=', (response.notification.request.content.data as any)?.type);
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const title = response.notification.request.content.title ?? '';
      const body = response.notification.request.content.body ?? '';
      addPushNotification(data, title, body, response.notification.request.identifier);
      if (data?.type === 'message') {
        const deviceId = data.deviceId as string | undefined;
        if (deviceId) navigateToChat(deviceId);
      }
      if (data?.type === 'sos') {
        setSosAlarm({ childName: (data.childName as string) || 'Your child', message: (data.message as string) || undefined });
      }
    }).catch(() => {});

    // Handle background tap (app was suspended)
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Push] addNotificationResponseReceivedListener fired type=', (response.notification.request.content.data as any)?.type);
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const title = response.notification.request.content.title ?? '';
      const body = response.notification.request.content.body ?? '';
      addPushNotification(data, title, body, response.notification.request.identifier);
      if (data?.type === 'message') {
        const deviceId = data.deviceId as string | undefined;
        if (deviceId) navigateToChat(deviceId);
      }
      if (data?.type === 'sos') {
        setSosAlarm({ childName: (data.childName as string) || 'Your child', message: (data.message as string) || undefined });
      }
      // If this is a child device, forward the tapped notification to the API
      // as a backup in case the background handler couldn't reach the server.
      const thisDeviceId = useGuardianStore.getState().thisDeviceId;
      if (thisDeviceId && (title || body)) {
        import('./src/services/guardianService').then(({ postChildNotification }) => {
          postChildNotification(thisDeviceId, {
            packageName: 'com.familycommandcenter.app',
            title,
            text: body,
            receivedAt: Date.now(),
          }).catch(() => {});
        });
      }
    });
    return () => sub.remove();
  }, []);

  // Polling-based SOS fallback — catches alerts even when FCM push is not delivered.
  // The guardian's hydrate() runs every 10s so sosAlerts stays fresh.
  // We track already-shown alert IDs so we never show the same alarm twice.
  useEffect(() => {
    const TWO_MINUTES = 2 * 60 * 1000;
    const recent = sosAlerts.filter(
      (a) => !a.isResolved && !shownSosIds.current.has(a.id) &&
        Date.now() - new Date(a.createdAt).getTime() < TWO_MINUTES,
    );
    if (recent.length > 0) {
      const latest = recent[recent.length - 1];
      shownSosIds.current.add(latest.id);
      // Resolve child name: try family members first, then device name
      const member = familyMembers.find((m) => m.id === latest.memberId);
      const device = guardianDevices.find((d) => d.id === latest.deviceId);
      const childName = member?.name ?? device?.deviceName ?? 'Your child';
      setSosAlarm({ childName, message: latest.message ?? undefined });
    }
  }, [sosAlerts, familyMembers, guardianDevices]);

  useEffect(() => {
    startNetworkSync();
    return () => stopNetworkSync();
  }, []);

  useGuardianCommandPolling();
  useNotificationTriggers();
  useAutomationEngine();
  usePushRegistration(!!familyId);

  // Global device-status poll — runs regardless of which screen is visible.
  // GuardianDashboardScreen has its own 10s poll, but if the user is on another
  // tab or screen the interval there is stopped. This ensures reconnects are
  // detected within 10s everywhere in the app.
  useEffect(() => {
    if (!familyId) return;
    const hydrate = useGuardianStore.getState().hydrate;
    hydrate();
    const id = setInterval(() => useGuardianStore.getState().hydrate(), 10_000);
    return () => clearInterval(id);
  }, [familyId]);

  // On launch, verify the shared Plaid connection state and — if it's been
  // more than 6 hours since the last sync — run one in the background so
  // finance screens open with fresh data instead of waiting for the user to
  // pull-to-refresh or connect a bank all over again.
  useEffect(() => {
    if (!familyId) return;
    (async () => {
      await usePlaidStore.getState().checkConnection();
      const { isConnected, lastSyncedAt } = usePlaidStore.getState();
      const STALE_MS = 6 * 60 * 60 * 1000;
      const isStale = !lastSyncedAt || Date.now() - new Date(lastSyncedAt).getTime() > STALE_MS;
      if (isConnected && isStale) {
        void usePlaidStore.getState().triggerSync();
      }
    })();
  }, [familyId]);
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
      <AppNavigator navigationRef={navigationRef} />
      {isLocked && <BiometricLockScreen onUnlock={authenticate} />}
      <MessageBanner
        banner={messageBanner}
        onDismiss={() => setMessageBanner(null)}
        onPress={(deviceId) => {
          setMessageBanner(null);
          navigateToChat(deviceId);
        }}
      />
      <SOSAlarmOverlay
        visible={!!sosAlarm}
        childName={sosAlarm?.childName ?? ''}
        message={sosAlarm?.message}
        onDismiss={() => setSosAlarm(null)}
      />
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
