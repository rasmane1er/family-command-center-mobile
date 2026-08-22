import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as carpoolService from '../services/carpoolService';

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

  addRoute: (r) => {
    const newRoute: CarpoolRoute = { ...r, id: generateId(), currentDriverIndex: 0 };
    set((s) => ({ routes: [...s.routes, newRoute] }));
    carpoolService.createRoute(newRoute).catch(() => {
      set((s) => ({ routes: s.routes.filter((route) => route.id !== newRoute.id) }));
    });
  },

  advanceDriver: (routeId) => {
    const prev = get().routes;
    const target = prev.find((r) => r.id === routeId);
    if (!target) return;
    const updatedRotation = target.rotation.map((d, i) =>
      i === target.currentDriverIndex ? { ...d, completed: true } : d
    );
    const nextIndex = (target.currentDriverIndex + 1) % target.rotation.length;
    set((s) => ({
      routes: s.routes.map((r) =>
        r.id === routeId ? { ...r, rotation: updatedRotation, currentDriverIndex: nextIndex } : r
      ),
    }));
    carpoolService.updateRouteRemote(routeId, { rotation: updatedRotation, currentDriverIndex: nextIndex })
      .catch(() => { set({ routes: prev }); });
  },

  deleteRoute: (id) => {
    const prev = get().routes;
    set((s) => ({ routes: s.routes.filter((r) => r.id !== id) }));
    carpoolService.deleteRouteRemote(id).catch(() => { set({ routes: prev }); });
  },

  addParticipant: (routeId, p) => {
    const prev = get().routes;
    const target = prev.find((r) => r.id === routeId);
    if (!target) return;
    const participants = [...target.participants, p];
    set((s) => ({
      routes: s.routes.map((r) =>
        r.id === routeId ? { ...r, participants } : r
      ),
    }));
    carpoolService.updateRouteRemote(routeId, { participants }).catch(() => { set({ routes: prev }); });
  },

  fetchFromServer: async () => {
    try {
      const { routes } = await carpoolService.fetchRoutes();
      set({ routes, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },
    }),
    {
      name: 'family-command-center-carpool',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export type { CarpoolRoute, CarpoolParticipant, CarpoolDriver, CarpoolStatus };
