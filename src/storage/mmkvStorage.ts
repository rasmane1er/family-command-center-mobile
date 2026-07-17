import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

// Encryption key protects Zustand state on rooted/compromised devices against
// plaintext file extraction. For maximum security this key should be bound to
// the device's secure enclave (expo-secure-store + biometric); for now a
// fixed app-scoped key prevents trivial plaintext access.
export const storage = createMMKV({
  id: 'family-command-center-storage',
  encryptionKey: 'fcc-store-v1',
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
