import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  addItem: (item: Omit<ShoppingItem, 'id' | 'checked'>) => void;
  toggleItem: (id: string) => void;
  deleteItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<ShoppingItem>) => void;
  clearChecked: () => void;
  setBudget: (amount: number) => void;
  seedDemoData: () => void;
}

const DEMO: Omit<ShoppingItem, 'id'>[] = [
  { name: 'Bananas',           category: 'produce',   quantity: 6,  unit: 'ea',     checked: false, estimatedPrice: 1.50 },
  { name: 'Organic Spinach',   category: 'produce',   quantity: 1,  unit: 'bag',    checked: false, estimatedPrice: 3.99 },
  { name: 'Cherry Tomatoes',   category: 'produce',   quantity: 1,  unit: 'pint',   checked: false, estimatedPrice: 3.49 },
  { name: 'Avocados',          category: 'produce',   quantity: 3,  unit: 'ea',     checked: false, estimatedPrice: 4.49 },
  { name: 'Whole Milk',        category: 'dairy',     quantity: 1,  unit: 'gallon', checked: false, estimatedPrice: 4.29 },
  { name: 'Greek Yogurt',      category: 'dairy',     quantity: 2,  unit: 'tub',    checked: false, estimatedPrice: 5.98 },
  { name: 'Cheddar Cheese',    category: 'dairy',     quantity: 1,  unit: 'block',  checked: false, estimatedPrice: 4.99 },
  { name: 'Butter',            category: 'dairy',     quantity: 1,  unit: 'pack',   checked: true,  estimatedPrice: 3.49 },
  { name: 'Chicken Breast',    category: 'meat',      quantity: 2,  unit: 'lbs',    checked: false, estimatedPrice: 9.98 },
  { name: 'Ground Beef',       category: 'meat',      quantity: 1,  unit: 'lb',     checked: false, estimatedPrice: 6.49 },
  { name: 'Whole Wheat Bread', category: 'bakery',    quantity: 1,  unit: 'loaf',   checked: true,  estimatedPrice: 3.79 },
  { name: 'Pasta',             category: 'pantry',    quantity: 2,  unit: 'box',    checked: false, estimatedPrice: 3.98 },
  { name: 'Olive Oil',         category: 'pantry',    quantity: 1,  unit: 'bottle', checked: false, estimatedPrice: 7.99 },
  { name: 'Orange Juice',      category: 'beverages', quantity: 1,  unit: 'carton', checked: false, estimatedPrice: 4.49 },
  { name: 'Frozen Peas',       category: 'frozen',    quantity: 1,  unit: 'bag',    checked: false, estimatedPrice: 2.49 },
  { name: 'Dish Soap',         category: 'household', quantity: 1,  unit: 'bottle', checked: false, estimatedPrice: 2.99 },
  { name: 'Shampoo',           category: 'personal',  quantity: 1,  unit: 'bottle', checked: false, estimatedPrice: 6.99 },
];

export const useShoppingStore = create<ShoppingState>()(
  persist(
    (set) => ({
      items: [],
      budget: 200,
      addItem: (item) =>
        set((s) => ({
          items: [...s.items, { ...item, id: `shop-${Date.now()}-${Math.random()}`, checked: false }],
        })),
      toggleItem: (id) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
        })),
      deleteItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      updateItem: (id, updates) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      clearChecked: () => set((s) => ({ items: s.items.filter((i) => !i.checked) })),
      setBudget: (amount) => set({ budget: amount }),
      seedDemoData: () =>
        set({
          items: DEMO.map((item, idx) => ({ ...item, id: `shop-seed-${idx}` })),
          budget: 200,
        }),
    }),
    { name: 'shopping-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
