import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

import { generateId } from '../utils/generateId';
import * as homeInventoryService from '../services/homeInventoryService';

export type InventoryRoom =
  | 'living_room'
  | 'kitchen'
  | 'master_bedroom'
  | 'bedroom_2'
  | 'bedroom_3'
  | 'bathroom'
  | 'garage'
  | 'office'
  | 'basement'
  | 'attic'
  | 'outdoor'
  | 'other';

export type ItemCondition = 'excellent' | 'good' | 'fair' | 'poor';

export type ItemCategory =
  | 'electronics'
  | 'furniture'
  | 'appliance'
  | 'jewelry'
  | 'clothing'
  | 'tools'
  | 'sports'
  | 'collectible'
  | 'other';

export interface InventoryItem {
  id: string;
  familyId: string;
  room: InventoryRoom;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  category: ItemCategory;
  condition: ItemCondition;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  warrantyExpiry?: string;
  notes?: string;
}

interface HomeInventoryState {
  items: InventoryItem[];
  isLoaded: boolean;
  addItem: (i: Omit<InventoryItem, 'id'>) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  getTotalValue: () => number;
  getItemsByRoom: (room: InventoryRoom) => InventoryItem[];
  fetchFromServer: () => Promise<void>;
}

export const useHomeInventoryStore = create<HomeInventoryState>()(
  persist(
    (set, get) => ({
  items: [],
  isLoaded: false,

  addItem: (i) => {
    const newItem: InventoryItem = { ...i, id: generateId() };
    set((s) => ({ items: [...s.items, newItem] }));
    homeInventoryService.createInventoryItem(newItem).catch(() => {
      set((s) => ({ items: s.items.filter((item) => item.id !== newItem.id) }));
    });
  },

  updateItem: (id, updates) => {
    const prev = get().items;
    set((s) => ({
      items: s.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
    homeInventoryService.updateInventoryItemRemote(id, updates).catch(() => { set({ items: prev }); });
  },

  deleteItem: (id) => {
    const prev = get().items;
    set((s) => ({ items: s.items.filter((item) => item.id !== id) }));
    homeInventoryService.deleteInventoryItemRemote(id).catch(() => { set({ items: prev }); });
  },

  getTotalValue: () =>
    get().items.reduce((sum, item) => sum + (item.currentValue ?? 0), 0),

  getItemsByRoom: (room) =>
    get().items.filter((item) => item.room === room),

  fetchFromServer: async () => {
    try {
      const { items } = await homeInventoryService.fetchInventoryItems();
      set({ items, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },
    }),
    {
      name: 'family-command-center-home-inventory',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
