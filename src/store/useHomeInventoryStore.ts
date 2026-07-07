import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

const generateId = () => Math.random().toString(36).substring(2, 11);

type InventoryRoom =
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

type ItemCondition = 'excellent' | 'good' | 'fair' | 'poor';

type ItemCategory =
  | 'electronics'
  | 'furniture'
  | 'appliance'
  | 'jewelry'
  | 'clothing'
  | 'tools'
  | 'sports'
  | 'collectible'
  | 'other';

interface InventoryItem {
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

  addItem: (i) =>
    set((s) => ({ items: [...s.items, { ...i, id: generateId() }] })),

  updateItem: (id, updates) =>
    set((s) => ({
      items: s.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),

  deleteItem: (id) =>
    set((s) => ({ items: s.items.filter((item) => item.id !== id) })),

  getTotalValue: () =>
    get().items.reduce((sum, item) => sum + (item.currentValue ?? 0), 0),

  getItemsByRoom: (room) =>
    get().items.filter((item) => item.room === room),

  fetchFromServer: async () => { set({ isLoaded: true }); },
    }),
    {
      name: 'family-command-center-home-inventory',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
