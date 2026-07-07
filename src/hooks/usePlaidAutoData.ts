import { useEffect, useRef } from 'react';
import { usePlaidStore } from '../store/usePlaidStore';

/**
 * Runs `fetchFn` on mount, and again any time the shared Plaid connection
 * state changes — a bank getting connected or a sync completing, even if
 * the user did that from a different screen. This is what makes Plaid-backed
 * data ("detected bills", investment accounts, spending categories, etc.)
 * show up automatically instead of requiring a manual pull-to-refresh after
 * connecting a bank for the first time.
 */
export function usePlaidAutoData(fetchFn: () => void | Promise<void>): void {
  const isConnected = usePlaidStore((s) => s.isConnected);
  const lastSyncedAt = usePlaidStore((s) => s.lastSyncedAt);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  useEffect(() => {
    fetchRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, lastSyncedAt]);
}
