import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { FamilyMemory, MemoryType } from '../types';
import { useAuthStore } from './useAuthStore';
import { pushSyncEvent } from '../api/syncQueue';

const generateId = () => Math.random().toString(36).substring(2, 11);

interface MemoryState {
  memories: FamilyMemory[];
  isLoaded: boolean;
  addMemory: (m: Omit<FamilyMemory, 'id' | 'createdAt' | 'lastAccessed'>) => void;
  pinMemory: (id: string) => void;
  deleteMemory: (id: string) => void;
  clearMemories: () => void;
  getMemoriesByMember: (memberId: string) => FamilyMemory[];
  getMemoriesByType: (type: MemoryType) => FamilyMemory[];
  fetchFromServer: () => Promise<void>;
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],
      isLoaded: false,

      addMemory: (m) => {
        const now = new Date().toISOString();
        const memory = { ...m, id: generateId(), familyId: useAuthStore.getState().familyId ?? '', createdAt: now, lastAccessed: now };
        set((s) => ({
          memories: [memory, ...s.memories],
        }));
        pushSyncEvent('ai', 'create', { ...memory, type: 'memory' });
      },

      pinMemory: (id) =>
        set((s) => ({
          memories: s.memories.map((m) => (m.id === id ? { ...m, isPinned: !m.isPinned } : m)),
        })),

      deleteMemory: (id) => {
        set((s) => ({ memories: s.memories.filter((m) => m.id !== id) }));
        pushSyncEvent('ai', 'delete', { type: 'memory', id });
      },

      clearMemories: () => set({ memories: [] }),

      getMemoriesByMember: (memberId) => get().memories.filter((m) => m.memberId === memberId),

      getMemoriesByType: (type) => get().memories.filter((m) => m.type === type),

      fetchFromServer: async () => {
        set({ isLoaded: true });
      },
    }),
    {
      name: 'family-command-center-memory',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
