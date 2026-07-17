import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { getMessaging, getToken, onTokenRefresh } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { apiRequest } from '../api/client';

async function registerPushToken(): Promise<void> {
  if (__DEV__ && Platform.OS !== 'android' && Platform.OS !== 'ios') return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
    // Messages from child device
    await Notifications.setNotificationChannelAsync('guardian_messages', {
      name: 'Child Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
    // Dedicated alarm channel for SOS alerts — plays at max importance, always audible
    await Notifications.setNotificationChannelAsync('sos_alarm', {
      name: 'SOS Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      enableLights: true,
      lightColor: '#FF0000',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }

  let fcmToken: string | null = null;
  let tokenSource = 'none';

  try {
    const messaging = getMessaging();
    fcmToken = await getToken(messaging);
    tokenSource = 'firebase-messaging';
  } catch (firebaseErr) {
    console.warn('[PushReg] Firebase messaging failed, falling back to expo-notifications:', firebaseErr);
    // Firebase messaging not available (e.g. iOS simulator) — fall back to
    // the native device push token from expo-notifications.
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      fcmToken = tokenData.data as string;
      tokenSource = 'expo-device-token';
    } catch (expoErr) {
      console.warn('[PushReg] expo-notifications fallback also failed:', expoErr);
    }
  }

  if (!fcmToken) {
    console.warn('[PushReg] No push token obtained — SOS and reconnect notifications will not work.');
    return;
  }

  console.log(`[PushReg] Got push token via ${tokenSource}: ${fcmToken.slice(0, 20)}…`);
  await saveTokenToServer(fcmToken);
}

async function saveTokenToServer(token: string): Promise<void> {
  try {
    await apiRequest('/auth/push-token', {
      method: 'PUT',
      body: JSON.stringify({ pushToken: token }),
    });
    console.log('[PushReg] Push token saved to server successfully.');
  } catch (err) {
    console.warn('[PushReg] Failed to save push token to server:', err);
  }
}

export function usePushRegistration(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;
    registerPushToken();

    // FCM tokens rotate periodically — persist the new token immediately so
    // pushes are never dropped between rotation and next app launch.
    let unsubscribe: (() => void) | null = null;
    try {
      const messaging = getMessaging();
      unsubscribe = onTokenRefresh(messaging, (newToken) => {
        console.log('[PushReg] FCM token refreshed, saving…');
        saveTokenToServer(newToken);
      });
    } catch {
      // messaging not available (simulator etc.)
    }

    return () => {
      unsubscribe?.();
    };
  }, [isAuthenticated]);
}
