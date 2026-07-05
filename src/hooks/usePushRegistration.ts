import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { apiRequest } from '../api/client';

async function registerPushToken(): Promise<void> {
  // Simulators/emulators can't receive real push notifications
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
  }

  // Native FCM token via @react-native-firebase/messaging (backed by
  // google-services.json / GoogleService-Info.plist) — the backend sends
  // through Firebase Admin SDK, which requires this exact token format
  // (not Expo's push token, not the raw APNs device token).
  if (Platform.OS === 'ios') {
    // Required on iOS before requesting an FCM token — exchanges the raw
    // APNs device token with Firebase for a proper FCM registration token.
    await messaging().registerDeviceForRemoteMessages();
  }

  const fcmToken = await messaging().getToken();
  if (!fcmToken) return;

  try {
    await apiRequest('/auth/push-token', {
      method: 'PUT',
      body: JSON.stringify({ pushToken: fcmToken }),
    });
  } catch {
    // Non-fatal — token will be registered next launch
  }
}

// Mount once after login. Registers the device's push token with the API
// so the server can send SOS alerts, join-request approvals, and reminders.
export function usePushRegistration(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;
    registerPushToken();
  }, [isAuthenticated]);
}
