import { useCallback, useEffect, useMemo, useState } from 'react';
import * as financeDetectionService from '../services/financeDetectionService';
import type { DetectionKind } from '../services/financeDetectionService';

// Shared filtering for "detected from Plaid, suggest it, let the user
// confirm or dismiss" flows (Bills, Subscriptions, Budgets). A suggestion
// stays hidden across app restarts and other family devices once dismissed
// (server-persisted DetectionDismissal), and disappears automatically once
// a matching real record exists (reactive `existingKeys`, typically derived
// from the live store — confirming already creates that record, so no
// explicit action is needed to hide a just-confirmed suggestion).
export function useDetectionFilter<T>(
  kind: DetectionKind,
  detected: T[],
  keyOf: (d: T) => string,
  existingKeys: string[],
): { visible: T[]; dismiss: (key: string) => void } {
  // Optimistic-only — covers the gap between tapping dismiss and the next
  // dismissals refetch. The server call below is what makes it durable.
  const [pendingDismissals, setPendingDismissals] = useState<Set<string>>(new Set());
  const [serverDismissals, setServerDismissals] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    financeDetectionService.fetchDismissals()
      .then(({ dismissals }) => {
        if (cancelled) return;
        setServerDismissals(new Set(dismissals.filter((d) => d.kind === kind).map((d) => d.matchKey)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [kind]);

  const existingKeySet = useMemo(() => new Set(existingKeys), [existingKeys]);

  const dismiss = useCallback((key: string) => {
    setPendingDismissals((prev) => new Set(prev).add(key));
    financeDetectionService.dismissDetection(kind, key).catch(() => {});
  }, [kind]);

  const visible = detected.filter((d) => {
    const key = keyOf(d);
    return !pendingDismissals.has(key) && !existingKeySet.has(key) && !serverDismissals.has(key);
  });

  return { visible, dismiss };
}
