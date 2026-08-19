import { createMMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import type { StateStorage } from 'zustand/middleware';

// The encryption key is generated once per device and kept in the platform
// Keychain/Keystore via expo-secure-store's synchronous JSI API (SDK 53+;
// getItem/setItem here are the sync variants, not getItemAsync/setItemAsync
// — this file is imported at module-load time by src/i18n/index.ts, which
// reads storage.getString(...) synchronously before anything else in the
// app has a chance to await an async key lookup).
const ENCRYPTION_KEY_STORE_KEY = 'fcc_mmkv_encryption_key';

function getOrCreateEncryptionKey(): string {
  try {
    const existing = SecureStore.getItem(ENCRYPTION_KEY_STORE_KEY);
    if (existing) return existing;
  } catch {
    // SecureStore unavailable for some reason — fall through and generate a
    // key anyway so MMKV still works; it just won't survive a process
    // restart reliably until SecureStore is available again.
  }
  const generated = Crypto.randomUUID();
  try {
    SecureStore.setItem(ENCRYPTION_KEY_STORE_KEY, generated);
  } catch {
    // Non-fatal for the same reason as above.
  }
  return generated;
}

// SECURITY NOTE — this is a one-time re-key, not a migration. This file
// previously shipped a hardcoded literal ('fcc-store-v1') as every
// install's MMKV encryption key, which isn't real encryption — anyone who
// extracted the app bundle had the key. Switching to a real per-device key
// means existing installs' MMKV data (encrypted under the old literal)
// can't be decrypted under the new one and is discarded, not carried
// forward: MMKV/zustand's persist middleware already fail safe on
// unreadable persisted data (falls back to each store's default state,
// same as a fresh install — not a crash). The one user-visible effect is a
// one-time sign-out on upgrade: real access/refresh tokens live in
// secureStorage.ts, a separate Keychain/Keystore entry untouched by this
// change, but useAuthStore's own MMKV-persisted `user`/`isAuthenticated`
// fields reset, and the session-restore check in useAuthStore requires
// both. Every other store's data re-fetches from the backend on next
// sign-in — nothing is actually lost, just re-synced.
export const storage = createMMKV({
  id: 'family-command-center-storage',
  encryptionKey: getOrCreateEncryptionKey(),
});

export const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => {
    storage.set(name, value);
  },
  removeItem: (name) => {
    storage.remove(name);
  },
};
