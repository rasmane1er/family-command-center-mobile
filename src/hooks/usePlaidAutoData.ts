import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { usePlaidStore } from '../store/usePlaidStore';

// Guards the focus-triggered refetch below with a short TTL — switching
// tabs (Home -> Finance -> Tasks -> Finance) would otherwise re-fire every
// consumer's fetchFn on every single focus. Matches the TTL that was
// previously duplicated ad hoc in FinanceDashboardScreen.
const STALE_TTL_MS = 60_000;

/**
 * Runs `fetchFn`:
 * - on mount and any time the shared Plaid connection state changes (a bank
 *   getting connected or a sync completing, even from a different screen) —
 *   forced, since a real connect/sync event just happened;
 * - whenever the screen calling this hook regains focus (navigating back to
 *   it, switching tabs) — subject to the TTL above, so rapid tab-switching
 *   doesn't hammer the network.
 *
 * This is what makes Plaid-backed data ("detected bills", investment
 * accounts, spending categories, etc.) show up automatically instead of
 * requiring a manual pull-to-refresh — including just navigating back to a
 * screen after time has passed, which previously only worked on
 * FinanceDashboardScreen (the one screen with its own focus+TTL logic).
 */
export function usePlaidAutoData(fetchFn: () => void | Promise<void>): void {
  const isConnected = usePlaidStore((s) => s.isConnected);
  const lastSyncedAt = usePlaidStore((s) => s.lastSyncedAt);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;
  const lastRunAt = useRef(0);

  const runIfStale = useCallback((force = false) => {
    if (!force && Date.now() - lastRunAt.current < STALE_TTL_MS) return;
    lastRunAt.current = Date.now();
    fetchRef.current();
  }, []);

  useEffect(() => {
    runIfStale(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, lastSyncedAt]);

  useFocusEffect(
    useCallback(() => {
      runIfStale();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );
}
