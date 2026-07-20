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
