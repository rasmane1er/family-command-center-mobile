import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

interface SessionProgress {
  content?: string; // AI-generated lesson text, cached once generated — never regenerated
  completedAt?: string; // undefined = not completed
}

interface CoachingState {
  // Flat, keyed by `${memberId}:${moduleId}:${sessionId}` — mirrors
  // useChoreStore's flat-map simplicity over a deeply-nested per-member tree.
  progress: Record<string, SessionProgress>;

  setSessionContent: (memberId: string, moduleId: string, sessionId: string, content: string) => void;
  markComplete: (memberId: string, moduleId: string, sessionId: string) => void;
  markIncomplete: (memberId: string, moduleId: string, sessionId: string) => void;
}

// Exported so components key directly into a reactive `progress` selector
// (`useCoachingStore(s => s.progress)`) at render time, and so one-off
// imperative reads (e.g. inside an event handler) can go through
// `useCoachingStore.getState().progress[sessionKey(...)]` directly.
//
// Deliberately no getSession()/getModuleCompleted() reader methods on this
// store — selecting a method via `useCoachingStore(s => s.getSession)` looks
// reasonable but doesn't subscribe to `progress` (a stable function
// reference never changes), so a component reading through it silently
// never re-renders when progress actually updates. That was a real bug here
// (Mark Complete updated the store fine, the screen just never redrew).
export function sessionKey(memberId: string, moduleId: string, sessionId: string): string {
  return `${memberId}:${moduleId}:${sessionId}`;
}

export const useCoachingStore = create<CoachingState>()(
  persist(
    (set) => ({
      progress: {},

      setSessionContent: (memberId, moduleId, sessionId, content) => {
        const key = sessionKey(memberId, moduleId, sessionId);
        set((s) => ({ progress: { ...s.progress, [key]: { ...s.progress[key], content } } }));
      },

      markComplete: (memberId, moduleId, sessionId) => {
        const key = sessionKey(memberId, moduleId, sessionId);
        set((s) => ({
          progress: { ...s.progress, [key]: { ...s.progress[key], completedAt: new Date().toISOString() } },
        }));
      },

      markIncomplete: (memberId, moduleId, sessionId) => {
        const key = sessionKey(memberId, moduleId, sessionId);
        set((s) => {
          const { [key]: existing, ...rest } = s.progress;
          if (!existing) return s;
          const { completedAt, ...withoutCompletion } = existing;
          return { progress: { ...rest, [key]: withoutCompletion } };
        });
      },
    }),
    {
      name: 'family-command-center-coaching',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
