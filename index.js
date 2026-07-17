import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import * as SecureStore from 'expo-secure-store';
import { MMKV } from 'react-native-mmkv';

import App from './App';

// Background FCM handler — fires when the child app is backgrounded/killed
// and a push notification arrives. Uses raw storage reads (no React/Zustand)
// to forward the notification to the API so "Recent Notifications" stays live.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  try {
    const title = remoteMessage.notification?.title ?? '';
    const body  = remoteMessage.notification?.body  ?? '';
    if (!title && !body) return;

    // Read auth token from SecureStore (available in headless context)
    const accessToken = await SecureStore.getItemAsync('access_token');
    if (!accessToken) return;

    // Read thisDeviceId from the Zustand-persisted MMKV guardian store.
    // The storage key matches the `name` field in the persist() call.
    const storage = new MMKV({ id: 'family-command-center-storage', encryptionKey: 'fcc-store-v1' });
    const raw = storage.getString('guardian-store');
    if (!raw) return;
    const thisDeviceId = JSON.parse(raw)?.state?.thisDeviceId;
    if (!thisDeviceId) return;

    // API base URL comes from the build-time env var (set in .env / EAS secrets).
    // Falls back to the Android-emulator alias in dev — physical devices must have
    // EXPO_PUBLIC_API_URL set.
    const apiBase = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3001';

    await fetch(`${apiBase}/guardian/devices/${thisDeviceId}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        packageName: 'com.familycommandcenter.app',
        title,
        text: body,
        receivedAt: Date.now(),
      }),
    });
  } catch {
    // best-effort — never let the background handler crash the headless task
  }
});

registerRootComponent(App);
