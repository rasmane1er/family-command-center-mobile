import { Platform } from 'react-native';

// Android emulators run in an isolated virtual network and can't reach the
// host machine's real LAN IP the way an iOS simulator can (iOS Simulator
// shares the host's network stack directly, so the Mac's own LAN IP is
// trivially reachable there) — 10.0.2.2 is Android's documented alias for
// "this host machine's localhost", the standard emulator workaround.
// A physical Android device needs the real LAN IP instead, same as before —
// set EXPO_PUBLIC_API_URL in your .env for that case (or prod, or a
// different dev machine).
const DEV_DEFAULT_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://10.0.0.230:3001';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? DEV_DEFAULT_API_URL;
