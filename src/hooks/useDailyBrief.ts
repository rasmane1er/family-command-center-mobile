import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { apiRequest, ApiRequestError } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

export interface BriefItem {
  icon: string;
  category: string;
  text: string;
}

export interface DailyBrief {
  greeting: string;
  summary: string;
  items: BriefItem[];
  tip: string;
}

interface BriefState {
  brief: DailyBrief | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours — regenerate mid-day if needed

let cachedBrief: DailyBrief | null = null;
let cachedAt = 0;

export function useDailyBrief(): BriefState {
  const familyId = useAuthStore((s) => s.familyId);

  const [brief, setBrief]       = useState<DailyBrief | null>(cachedBrief);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  // Track whether the last fetch FAILED so we retry on next mount instead of
  // waiting for the 4-hour TTL. Prevents a 429 blip from silencing the brief
  // for hours.
  const lastFetchFailed = useRef(false);
  const hasFetched      = useRef(false);

  async function load(force = false) {
    if (!familyId) return;
    if (!force && cachedBrief && !lastFetchFailed.current && Date.now() - cachedAt < CACHE_TTL) {
      setBrief(cachedBrief);
      return;
    }

    setLoading(true);
    setError(null);
    lastFetchFailed.current = false;

    try {
      const res = await apiRequest<{ brief: DailyBrief | null; generatedAt?: string }>('/ai/daily-brief');
      if (res.brief) {
        cachedBrief = res.brief;
        cachedAt    = Date.now();
        setBrief(res.brief);
      }
    } catch (err) {
      lastFetchFailed.current = true;
      let message = 'Could not load your daily brief.';
      if (err instanceof ApiRequestError && err.status === 429) {
        const body = err.body as { error?: string; limit?: number; resetsAt?: string } | undefined;
        // /ai/daily-brief's 429 means one of two very different things: the
        // family's monthly AI quota is exhausted (won't clear for potentially
        // weeks — a plain "try again soon" is actively misleading here), or a
        // genuine short-lived rate limit. Distinguish by the response body
        // instead of collapsing both into the same message.
        if (body?.error === 'ai_quota_exceeded') {
          const resetDate = body.resetsAt
            ? new Date(body.resetsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : 'next month';
          message = `You've used all ${body.limit ?? ''} AI queries for this month. Resets ${resetDate}, or upgrade your plan for more.`;
        } else {
          message = 'Too many requests right now — try again in a few minutes.';
        }
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // Fetch once on mount — but retry if previous attempt failed
  useEffect(() => {
    if ((!hasFetched.current || lastFetchFailed.current) && familyId) {
      hasFetched.current = true;
      load();
    }
  }, [familyId]);

  // Re-fetch when app returns to foreground (after TTL or if last fetch failed)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && (lastFetchFailed.current || Date.now() - cachedAt > CACHE_TTL)) {
        load();
      }
    });
    return () => sub.remove();
  }, [familyId]);

  return { brief, isLoading, error, refresh: () => load(true) };
}
