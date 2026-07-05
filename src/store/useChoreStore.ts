import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as choresService from '../services/choresService';

export type ChoreFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type ChoreCategory = 'kitchen' | 'bathroom' | 'bedroom' | 'living' | 'outdoor' | 'laundry' | 'other';

export interface Chore {
  id: string;
  name: string;
  emoji: string;
  description: string;
  frequency: ChoreFrequency;
  estimatedMinutes: number;
  points: number;
  color: string;
  category: ChoreCategory;
  assignedMemberIds: string[];
  currentAssigneeIndex: number;
  lastCompletedDate?: string;
  lastCompletedBy?: string;
}

interface ChoreStore {
  chores: Chore[];
  isLoaded: boolean;
  addChore: (chore: Omit<Chore, 'id' | 'currentAssigneeIndex'>) => Promise<void>;
  deleteChore: (id: string) => void;
  completeChore: (choreId: string) => void;
  updateChore: (id: string, updates: Partial<Chore>) => void;
  fetchFromServer: (familyId?: string) => Promise<void>;
}

export const useChoreStore = create<ChoreStore>()(
  persist(
    (set, get) => ({
      chores: [],
      isLoaded: false,

      fetchFromServer: async () => {
        try {
          const { chores } = await choresService.fetchChores();
          set({ chores, isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },

      addChore: async (chore) => {
        const newChore: Chore = { ...chore, id: `chore-${Date.now()}`, currentAssigneeIndex: 0 };
        set((s) => ({ chores: [...s.chores, newChore] }));
        try {
          await choresService.createChore(newChore);
        } catch {
          set((s) => ({ chores: s.chores.filter((c) => c.id !== newChore.id) }));
        }
      },

      deleteChore: (id) => {
        const prev = get().chores;
        set((s) => ({ chores: s.chores.filter((c) => c.id !== id) }));
        choresService.deleteChoreRemote(id).catch(() => { set({ chores: prev }); });
      },

      completeChore: (choreId) => {
        set((s) => ({
          chores: s.chores.map((c) =>
            c.id === choreId
              ? {
                  ...c,
                  lastCompletedDate: new Date().toISOString().split('T')[0],
                  lastCompletedBy: c.assignedMemberIds[c.currentAssigneeIndex],
                  currentAssigneeIndex: (c.currentAssigneeIndex + 1) % c.assignedMemberIds.length,
                }
              : c
          ),
        }));
        const chore = get().chores.find((c) => c.id === choreId);
        if (chore) {
          choresService.updateChoreRemote(choreId, {
            lastCompletedDate: chore.lastCompletedDate,
            lastCompletedBy: chore.lastCompletedBy,
            currentAssigneeIndex: chore.currentAssigneeIndex,
          }).catch(() => {});
        }
      },

      updateChore: (id, updates) => {
        set((s) => ({
          chores: s.chores.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
        choresService.updateChoreRemote(id, updates).catch(() => {});
      },
    }),
    { name: 'chore-store', storage: createJSONStorage(() => mmkvStorage) }
  )
);
