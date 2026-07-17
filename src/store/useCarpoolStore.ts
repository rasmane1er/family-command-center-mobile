import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

import { generateId } from '../utils/generateId';

type CarpoolStatus = 'active' | 'paused' | 'completed';

interface CarpoolParticipant {
  name: string;
  familyMemberId?: string;
  phone?: string;
  address?: string;
}

interface CarpoolDriver {
  week: string; // "2026-W26" ISO week
  driverName: string;
  familyMemberId?: string;
  completed: boolean;
}

interface CarpoolRoute {
  id: string;
  familyId: string;
  name: string;
  destination: string;
  pickupTime: string;
  returnTime?: string;
  daysOfWeek: string[];
  participants: CarpoolParticipant[];
  rotation: CarpoolDriver[];
  currentDriverIndex: number;
  status: CarpoolStatus;
  notes?: string;
  color: string;
}

interface CarpoolState {
  routes: CarpoolRoute[];
  isLoaded: boolean;
  addRoute: (r: Omit<CarpoolRoute, 'id' | 'currentDriverIndex'>) => void;
  advanceDriver: (routeId: string) => void;
  deleteRoute: (id: string) => void;
  addParticipant: (routeId: string, p: CarpoolParticipant) => void;
  fetchFromServer: () => Promise<void>;
}


export const useCarpoolStore = create<CarpoolState>()(
  persist(
    (set, get) => ({
  routes: [],
  isLoaded: false,

  addRoute: (r) =>
    set((s) => ({
      routes: [...s.routes, { ...r, id: generateId(), currentDriverIndex: 0 }],
    })),

  advanceDriver: (routeId) =>
    set((s) => ({
      routes: s.routes.map((r) => {
        if (r.id !== routeId) return r;
        const updatedRotation = r.rotation.map((d, i) =>
          i === r.currentDriverIndex ? { ...d, completed: true } : d
        );
        const nextIndex = (r.currentDriverIndex + 1) % r.rotation.length;
        return { ...r, rotation: updatedRotation, currentDriverIndex: nextIndex };
      }),
    })),

  deleteRoute: (id) =>
    set((s) => ({ routes: s.routes.filter((r) => r.id !== id) })),

  addParticipant: (routeId, p) =>
    set((s) => ({
      routes: s.routes.map((r) =>
        r.id === routeId ? { ...r, participants: [...r.participants, p] } : r
      ),
    })),

  fetchFromServer: async () => { set({ isLoaded: true }); },
    }),
    {
      name: 'family-command-center-carpool',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export type { CarpoolRoute, CarpoolParticipant, CarpoolDriver, CarpoolStatus };
