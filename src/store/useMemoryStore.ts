import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { FamilyMemory, MemoryType } from '../types';
import { authBridge } from './authBridge';
import { pushSyncEvent } from '../api/syncQueue';

import { generateId } from '../utils/generateId';

// This store has no server sync (fetchFromServer is a no-op below), so the
// local addMemory cap is the only thing bounding its persisted size — same
// convention as useTimelineStore.ts, but pinned memories are always kept
// since a user pinning something is an explicit "don't let this age out".
const MAX_MEMORIES = 1000;

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
        const memory = { ...m, id: generateId(), familyId: authBridge.getSnapshot().familyId ?? '', createdAt: now, lastAccessed: now };
        set((s) => {
          const next = [memory, ...s.memories];
          if (next.length <= MAX_MEMORIES) return { memories: next };
          // Trim oldest unpinned entries first so pinned memories are never evicted.
          const pinned = next.filter((mm) => mm.isPinned);
          const unpinned = next.filter((mm) => !mm.isPinned);
          const keepUnpinned = unpinned.slice(0, Math.max(0, MAX_MEMORIES - pinned.length));
          const merged = [...pinned, ...keepUnpinned].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          return { memories: merged };
        });
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
