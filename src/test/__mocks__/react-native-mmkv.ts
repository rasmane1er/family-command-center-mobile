// In-memory stand-in for the native MMKV module under Jest — every persisted
// Zustand store in the app goes through createMMKV(), so without this every
// test that imports a store (even transitively via resetAllStores) would
// crash trying to load the native binding.
class MockMMKV {
  private map = new Map<string, string>();

  getString(key: string): string | undefined {
    return this.map.get(key);
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
  remove(key: string): void {
    this.map.delete(key);
  }
  contains(key: string): boolean {
    return this.map.has(key);
  }
  getAllKeys(): string[] {
    return [...this.map.keys()];
  }
  clearAll(): void {
    this.map.clear();
  }
}

export function createMMKV(): MockMMKV {
  return new MockMMKV();
}

export const MMKV = MockMMKV;
