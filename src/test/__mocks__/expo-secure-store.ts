// In-memory stand-in for expo-secure-store under Jest (no Keychain/Keystore
// access in the test environment).
const map = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  return map.get(key) ?? null;
}
export async function setItemAsync(key: string, value: string): Promise<void> {
  map.set(key, value);
}
export async function deleteItemAsync(key: string): Promise<void> {
  map.delete(key);
}

// Sync variants (SDK 53+'s JSI-based API) — mmkvStorage.ts uses these
// directly since it's imported at module-load time by i18n/index.ts, before
// anything in the app could await an async key lookup.
export function getItem(key: string): string | null {
  return map.get(key) ?? null;
}
export function setItem(key: string, value: string): void {
  map.set(key, value);
}
