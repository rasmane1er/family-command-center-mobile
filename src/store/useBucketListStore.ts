import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import { apiRequest } from '../api/client';

import { generateId } from '../utils/generateId';

export type BucketCategory = 'travel' | 'experience' | 'achievement' | 'learn' | 'give' | 'adventure' | 'food' | 'other';

export interface BucketItem {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  category: BucketCategory;
  targetYear?: number;
  estimatedCost?: number;
  membersInterested: string[];
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  completedDate?: string;
  emoji: string;
  notes?: string;
  createdAt: string;
}

interface BucketListState {
  items: BucketItem[];
  isLoaded: boolean;
  addItem: (item: Omit<BucketItem, 'id' | 'createdAt'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<BucketItem>) => Promise<void>;
  completeItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  fetchFromServer: () => Promise<void>;
}

export const useBucketListStore = create<BucketListState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoaded: false,

      fetchFromServer: async () => {
        try {
          const data = await apiRequest<{ items: BucketItem[] }>('/bucketList');
          set({ items: data.items ?? [], isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },

      addItem: async (item) => {
        const tempId = generateId();
        const optimistic: BucketItem = { ...item, id: tempId, createdAt: new Date().toISOString() };
        set((s) => ({ items: [optimistic, ...s.items] }));
        try {
          const created = await apiRequest<BucketItem>('/bucketList', {
            method: 'POST',
            body: JSON.stringify({
              title: item.title,
              category: item.category,
              targetDate: item.targetYear ? `${item.targetYear}-01-01` : undefined,
            }),
          });
          set((s) => ({ items: s.items.map((i) => (i.id === tempId ? { ...optimistic, id: created.id ?? tempId } : i)) }));
        } catch {
          set((s) => ({ items: s.items.filter((i) => i.id !== tempId) }));
        }
      },

      updateItem: async (id, updates) => {
        const prev = get().items.find((i) => i.id === id);
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)) }));
        try {
          const updated = await apiRequest<BucketItem>(`/bucketList/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
          });
          set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...updated } : i)) }));
        } catch {
          if (prev) set((s) => ({ items: s.items.map((i) => (i.id === id ? prev : i)) }));
        }
      },

      completeItem: async (id) => {
        const completedDate = new Date().toISOString();
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, isCompleted: true, completedDate } : i)) }));
        try {
          await apiRequest(`/bucketList/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ isCompleted: true, completedDate }),
          });
        } catch {
          set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, isCompleted: false, completedDate: undefined } : i)) }));
        }
      },

      deleteItem: async (id) => {
        const prev = get().items;
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        try {
          await apiRequest(`/bucketList/${id}`, { method: 'DELETE' });
        } catch {
          set({ items: prev });
        }
      },
    }),
    {
      name: 'family-command-center-bucketlist',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (s) => ({ items: s.items }),
    }
  )
);
