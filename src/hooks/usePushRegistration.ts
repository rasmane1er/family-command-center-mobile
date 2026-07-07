import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { getMessaging, getToken, isSupported } from '@react-native-firebase/messaging';
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
  }

  try {
    const messaging = getMessaging();
    const fcmToken = await getToken(messaging);
    if (!fcmToken) return;

    await apiRequest('/auth/push-token', {
      method: 'PUT',
      body: JSON.stringify({ pushToken: fcmToken }),
    });
  } catch {
    // Non-fatal — token will be registered next launch
  }
}

export function usePushRegistration(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;
    registerPushToken();
  }, [isAuthenticated]);
}
