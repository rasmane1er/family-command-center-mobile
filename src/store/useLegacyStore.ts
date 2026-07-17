import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { LegacyItem, LegacyItemType } from '../types';

import { generateId } from '../utils/generateId';

interface LegacyState {
  items: LegacyItem[];
  isLoaded: boolean;
  addItem: (i: Omit<LegacyItem, 'id' | 'createdAt' | 'reactions'>) => void;
  toggleFeatured: (id: string) => void;
  addReaction: (id: string, memberId: string, emoji: string) => void;
  deleteItem: (id: string) => void;
  getItemsByType: (type: LegacyItemType) => LegacyItem[];
  fetchFromServer: () => Promise<void>;
}

export const useLegacyStore = create<LegacyState>()(
  persist(
    (set, get) => ({
  items: [],
  isLoaded: false,

  addItem: (i) => {
    const now = new Date().toISOString();
    set((s) => ({
      items: [{ ...i, id: generateId(), createdAt: now, reactions: [] }, ...s.items],
    }));
  },

  toggleFeatured: (id) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, isFeatured: !i.isFeatured } : i)),
    })),

  addReaction: (id, memberId, emoji) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id
          ? { ...i, reactions: [...i.reactions.filter((r) => r.memberId !== memberId), { memberId, emoji }] }
          : i
      ),
    })),

  deleteItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  getItemsByType: (type) => get().items.filter((i) => i.type === type),

  fetchFromServer: async () => { set({ isLoaded: true }); },
    }),
    {
      name: 'family-command-center-legacy',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
