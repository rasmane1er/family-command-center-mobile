import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import { getConnectedItems, syncPlaid } from '../services/plaidService';

interface PlaidState {
  isConnected: boolean;
  itemCount: number;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  // Re-reads the connected-items list from the server and updates the
  // summary fields above. Cheap and safe to call from anywhere (mount,
  // app launch, after a Link success) — it never mutates bank data itself.
  checkConnection: () => Promise<void>;
  // Runs a real Plaid sync (imports new transactions/balances), then
  // refreshes the connection summary. `lastSyncedAt` changing is what
  // every screen's usePlaidAutoData() watches to know it's time to refetch.
  // Returns the raw sync result (or null on failure) for callers that want
  // to show e.g. "N new transactions imported".
  triggerSync: () => Promise<{ synced: number } | null>;
}

export const usePlaidStore = create<PlaidState>()(
  persist(
    (set, get) => ({
      isConnected: false,
      itemCount: 0,
      lastSyncedAt: null,
      isSyncing: false,

      checkConnection: async () => {
        try {
          const { items } = await getConnectedItems();
          const latestSync = items
            .map((i) => i.lastSyncedAt)
            .filter((d): d is string => !!d)
            .sort()
            .pop() ?? null;
          set({ isConnected: items.length > 0, itemCount: items.length, lastSyncedAt: latestSync });
        } catch {
          // No backend reachable / not authenticated yet — leave state as-is.
        }
      },

      triggerSync: async () => {
        if (get().isSyncing) return null;
        set({ isSyncing: true });
        try {
          const result = await syncPlaid();
          await get().checkConnection();
          return result;
        } catch {
          // Sync failures are surfaced by whichever screen called this
          // (e.g. ConnectBankScreen's own error Alert); this store only
          // tracks whether a bank is connected and when it last synced.
          return null;
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'plaid-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        isConnected: state.isConnected,
        itemCount: state.itemCount,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
