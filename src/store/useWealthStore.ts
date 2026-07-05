import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { WealthEntry, WealthProjection, ReputationScore } from '../types';
import * as wealthService from '../services/wealthService';

const generateId = () => Math.random().toString(36).substring(2, 11);

interface WealthState {
  entries: WealthEntry[];
  projections: WealthProjection[];
  reputationScores: ReputationScore[];
  isLoaded: boolean;
  addEntry: (e: Omit<WealthEntry, 'id' | 'lastUpdated'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<WealthEntry>) => void;
  deleteEntry: (id: string) => void;
  getTotalNetWorth: () => number;
  fetchFromServer: () => Promise<void>;
}

export const useWealthStore = create<WealthState>()(
  persist(
    (set, get) => ({
  entries: [],
  projections: [],
  reputationScores: [],
  isLoaded: false,

  addEntry: async (e) => {
    const entry = { ...e, id: generateId(), lastUpdated: new Date().toISOString() };
    set((s) => ({ entries: [entry, ...s.entries] }));
    try {
      await wealthService.createEntry(entry);
    } catch {
      set((s) => ({ entries: s.entries.filter((x) => x.id !== entry.id) }));
    }
  },

  updateEntry: (id, updates) => {
    const lastUpdated = new Date().toISOString();
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...updates, lastUpdated } : e)),
    }));
    wealthService.updateEntryRemote(id, { ...updates, lastUpdated }).catch(() => {});
  },

  deleteEntry: (id) => {
    const prev = get().entries;
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    wealthService.deleteEntryRemote(id).catch(() => { set({ entries: prev }); });
  },

  getTotalNetWorth: () => get().entries.reduce((sum, e) => sum + e.currentValue, 0),

  fetchFromServer: async () => {
    try {
      const { entries } = await wealthService.fetchEntries();
      set({ entries, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },
    }),
    {
      name: 'family-command-center-wealth',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
