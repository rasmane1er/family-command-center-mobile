import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as emergencyService from '../services/emergencyService';

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

// The 12-item supply checklist shown on EmergencyModeScreen's Kit tab —
// distinct from DEFAULT_CHECKLIST above (that's broad household-readiness
// tasks; this is the physical go-bag contents). Same id/label/done shape,
// same reasoning for defaulting every item to false: a fresh family hasn't
// actually stocked any of this yet.
export const DEFAULT_KIT: SafetyCheckItem[] = [
  { id: 'water', label: 'Water (1 gallon/person/day × 3 days)', done: false },
  { id: 'food', label: 'Non-perishable food (3-day supply)', done: false },
  { id: 'first-aid', label: 'First aid kit & manual', done: false },
  { id: 'flashlights', label: 'Flashlights + extra batteries', done: false },
  { id: 'radio', label: 'Battery/crank radio', done: false },
  { id: 'whistle', label: 'Whistle to signal for help', done: false },
  { id: 'masks', label: 'Dust masks', done: false },
  { id: 'shutoff-tools', label: 'Wrench/pliers to shut off utilities', done: false },
  { id: 'can-opener', label: 'Manual can opener', done: false },
  { id: 'maps', label: 'Local maps (paper)', done: false },
  { id: 'documents', label: 'Copies of important documents', done: false },
  { id: 'medications', label: 'Extra medications (7-day supply)', done: false },
];

interface EmergencyState {
  checklist: SafetyCheckItem[];
  toggleCheckItem: (id: string) => void;
  kit: SafetyCheckItem[];
  toggleKitItem: (id: string) => void;
  // Free text, not a structured address — a rally point ("corner of Oak &
  // Main, in front of the Johnsons'") is conceptually distinct from the
  // family's home address and doesn't need to resolve to one.
  meetingPoint: string;
  setMeetingPoint: (text: string) => void;
  isLoaded: boolean;
  fetchFromServer: () => Promise<void>;
}

// This is a safety feature — the checklist previously had hardcoded
// `done: true/false` values that never reflected what this family had
// actually done, and weren't even tappable. Real, persisted, defaults to
// nothing checked (a fresh family hasn't done any of this yet — showing
// 3/6 "complete" out of the box would be dishonest, not reassuring). Now
// also synced to the backend — a household-safety checklist that only ever
// lived on one device defeated the point of a shared family view (one
// parent checking "fire extinguisher charged" should show as checked for
// everyone, not just re-hide itself on the next phone).
export const useEmergencyStore = create<EmergencyState>()(
  persist(
    (set, get) => ({
      checklist: DEFAULT_CHECKLIST,
      toggleCheckItem: (id) => {
        const prev = get().checklist;
        const checklist = prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c));
        set({ checklist });
        emergencyService.saveEmergencyPreparedness({ checklist }).catch(() => { set({ checklist: prev }); });
      },
      kit: DEFAULT_KIT,
      toggleKitItem: (id) => {
        const prev = get().kit;
        const kit = prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c));
        set({ kit });
        emergencyService.saveEmergencyPreparedness({ kit }).catch(() => { set({ kit: prev }); });
      },
      meetingPoint: '',
      setMeetingPoint: (text) => {
        const prev = get().meetingPoint;
        set({ meetingPoint: text });
        emergencyService.saveEmergencyPreparedness({ meetingPoint: text }).catch(() => { set({ meetingPoint: prev }); });
      },
      isLoaded: false,
      fetchFromServer: async () => {
        try {
          const { preparedness } = await emergencyService.fetchEmergencyPreparedness();
          if (preparedness) {
            set({
              checklist: preparedness.checklist.length > 0 ? preparedness.checklist : DEFAULT_CHECKLIST,
              kit: preparedness.kit.length > 0 ? preparedness.kit : DEFAULT_KIT,
              meetingPoint: preparedness.meetingPoint ?? '',
            });
          }
        } catch {
          // offline or backend unreachable — keep whatever is already local.
        }
        set({ isLoaded: true });
      },
    }),
    {
      name: 'family-command-center-emergency',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ checklist: state.checklist, kit: state.kit, meetingPoint: state.meetingPoint, isLoaded: state.isLoaded }),
    }
  )
);
