import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as shoppingService from '../services/shoppingService';

export type ShopCategory =
  | 'produce' | 'dairy' | 'meat' | 'bakery'
  | 'frozen' | 'pantry' | 'beverages' | 'personal'
  | 'household' | 'other';

export const SHOP_CAT_CONFIG: Record<ShopCategory, { label: string; emoji: string; color: string }> = {
  produce:   { label: 'Produce',       emoji: '🥬', color: '#27AE60' },
  dairy:     { label: 'Dairy',         emoji: '🥛', color: '#3498DB' },
  meat:      { label: 'Meat & Fish',   emoji: '🥩', color: '#E74C3C' },
  bakery:    { label: 'Bakery',        emoji: '🍞', color: '#E67E22' },
  frozen:    { label: 'Frozen',        emoji: '🧊', color: '#5DADE2' },
  pantry:    { label: 'Pantry',        emoji: '🥫', color: '#8E44AD' },
  beverages: { label: 'Beverages',     emoji: '🥤', color: '#16A085' },
  personal:  { label: 'Personal Care', emoji: '🧴', color: '#E91E63' },
  household: { label: 'Household',     emoji: '🧹', color: '#7F8C8D' },
  other:     { label: 'Other',         emoji: '🛒', color: '#95A5A6' },
};

export const CAT_ORDER: ShopCategory[] = [
  'produce', 'dairy', 'meat', 'bakery', 'frozen',
  'pantry', 'beverages', 'personal', 'household', 'other',
];

export interface ShoppingItem {
  id: string;
  name: string;
  category: ShopCategory;
  quantity: number;
  unit: string;
  checked: boolean;
  estimatedPrice?: number;
  note?: string;
}

interface ShoppingState {
  items: ShoppingItem[];
  budget: number;
  isLoaded: boolean;
  addItem: (item: Omit<ShoppingItem, 'id' | 'checked'>) => Promise<void>;
  toggleItem: (id: string) => void;
  deleteItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<ShoppingItem>) => void;
  clearChecked: () => void;
  setBudget: (amount: number) => void;
  fetchFromServer: () => Promise<void>;
}

export const useShoppingStore = create<ShoppingState>()(
  persist(
    (set, get) => ({
      items: [],
      budget: 200,
      isLoaded: false,
      addItem: async (item) => {
        const newItem = { ...item, id: `shop-${Date.now()}-${Math.random()}`, checked: false };
        set((s) => ({ items: [...s.items, newItem] }));
        try {
          await shoppingService.createItem(newItem);
        } catch {
          set((s) => ({ items: s.items.filter((i) => i.id !== newItem.id) }));
        }
      },
      toggleItem: (id) => {
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
        }));
        const item = get().items.find((i) => i.id === id);
        if (item) shoppingService.updateItemRemote(id, { checked: item.checked }).catch(() => {});
      },
      deleteItem: (id) => {
        const prev = get().items;
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        shoppingService.deleteItemRemote(id).catch(() => { set({ items: prev }); });
      },
      updateItem: (id, updates) => {
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)) }));
        shoppingService.updateItemRemote(id, updates).catch(() => {});
      },
      clearChecked: () => {
        const toDelete = get().items.filter((i) => i.checked).map((i) => i.id);
        set((s) => ({ items: s.items.filter((i) => !i.checked) }));
        toDelete.forEach((id) => shoppingService.deleteItemRemote(id).catch(() => {}));
      },
      setBudget: (amount) => {
        set({ budget: amount });
        shoppingService.updateBudgetRemote(amount).catch(() => {});
      },
      fetchFromServer: async () => {
        try {
          const { items, budget } = await shoppingService.fetchItems();
          set({ items, budget, isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },
    }),
    { name: 'shopping-store', storage: createJSONStorage(() => mmkvStorage) }
  )
);
