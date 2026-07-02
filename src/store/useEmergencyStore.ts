import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

export interface SafetyCheckItem {
  id: string;
  label: string;
  done: boolean;
}

export const DEFAULT_CHECKLIST: SafetyCheckItem[] = [
  { id: 'smoke-detectors', label: 'Smoke detectors tested', done: false },
  { id: 'fire-extinguisher', label: 'Fire extinguisher charged', done: false },
  { id: 'meeting-point', label: 'Family meeting point agreed', done: false },
  { id: 'emergency-kit', label: 'Emergency kit stocked', done: false },
  { id: 'gas-shutoff', label: 'Gas shutoff valve location known', done: false },
  { id: 'evacuation-route', label: 'Evacuation route practiced', done: false },
];

interface EmergencyState {
  checklist: SafetyCheckItem[];
  toggleCheckItem: (id: string) => void;
}

// This is a safety feature — the checklist previously had hardcoded
// `done: true/false` values that never reflected what this family had
// actually done, and weren't even tappable. Real, persisted, defaults to
// nothing checked (a fresh family hasn't done any of this yet — showing
// 3/6 "complete" out of the box would be dishonest, not reassuring).
export const useEmergencyStore = create<EmergencyState>()(
  persist(
    (set) => ({
      checklist: DEFAULT_CHECKLIST,
      toggleCheckItem: (id) =>
        set((s) => ({
          checklist: s.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
        })),
    }),
    {
      name: 'family-command-center-emergency',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ checklist: state.checklist }),
    }
  )
);
