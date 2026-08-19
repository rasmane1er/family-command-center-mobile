import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type PrepCategory =
  | 'protein'
  | 'grain'
  | 'vegetable'
  | 'sauce'
  | 'snack'
  | 'breakfast'
  | 'full-meal'
  | 'dessert';

export interface PrepItem {
  id: string;
  sessionId: string;
  name: string;
  category: PrepCategory;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  instructions: string;
  completed: boolean;
  storageDays: number;
  storageMethod: 'fridge' | 'freezer' | 'room-temp';
}

export interface PrepIngredient {
  id: string;
  sessionId: string;
  name: string;
  quantity: string;
  purchased: boolean;
  aisle: string;
}

export interface PrepSession {
  id: string;
  title: string;
  scheduledDate: string;
  estimatedHours: number;
  status: 'planned' | 'in-progress' | 'completed';
  notes: string;
  weekOf: string;
  createdAt: string;
}

interface MealPrepState {
  sessions: PrepSession[];
  items: PrepItem[];
  ingredients: PrepIngredient[];
  addSession: (session: Omit<PrepSession, 'id' | 'createdAt'>) => void;
  updateSession: (id: string, updates: Partial<PrepSession>) => void;
  removeSession: (id: string) => void;
  addItem: (item: Omit<PrepItem, 'id'>) => void;
  completeItem: (id: string) => void;
  removeItem: (id: string) => void;
  addIngredient: (ingredient: Omit<PrepIngredient, 'id'>) => void;
  toggleIngredientPurchased: (id: string) => void;
  removeIngredient: (id: string) => void;
  getItemsForSession: (sessionId: string) => PrepItem[];
  getIngredientsForSession: (sessionId: string) => PrepIngredient[];
  getCompletionPercent: (sessionId: string) => number;
  getTotalPrepTime: (sessionId: string) => number;
}

export const useMealPrepStore = create<MealPrepState>()(
  persist(
    (set, get) => ({
  // A fresh family's meal prep planner starts empty — MealPrepScreen already
  // has a real "No prep sessions yet, tap + to plan a batch cook session"
  // empty state for this. Shipping the same 2 hardcoded demo sessions (plus
  // their items/ingredients) to every family regardless of what they're
  // actually cooking was never real data, just a permanent fake default.
  sessions: [],
  items: [],
  ingredients: [],

  addSession: (session) =>
    set((s) => ({
      sessions: [
        { ...session, id: generateId(), createdAt: new Date().toISOString() },
        ...s.sessions,
      ],
    })),

  updateSession: (id, updates) =>
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, ...updates } : sess)),
    })),

  removeSession: (id) =>
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== id),
      items: s.items.filter((item) => item.sessionId !== id),
      ingredients: s.ingredients.filter((ing) => ing.sessionId !== id),
    })),

  addItem: (item) =>
    set((s) => ({ items: [...s.items, { ...item, id: generateId() }] })),

  completeItem: (id) =>
    set((s) => ({
      items: s.items.map((item) => (item.id === id ? { ...item, completed: true } : item)),
    })),

  removeItem: (id) =>
    set((s) => ({ items: s.items.filter((item) => item.id !== id) })),

  addIngredient: (ingredient) =>
    set((s) => ({ ingredients: [...s.ingredients, { ...ingredient, id: generateId() }] })),

  toggleIngredientPurchased: (id) =>
    set((s) => ({
      ingredients: s.ingredients.map((ing) =>
        ing.id === id ? { ...ing, purchased: !ing.purchased } : ing,
      ),
    })),

  removeIngredient: (id) =>
    set((s) => ({ ingredients: s.ingredients.filter((ing) => ing.id !== id) })),

  getItemsForSession: (sessionId) => get().items.filter((item) => item.sessionId === sessionId),

  getIngredientsForSession: (sessionId) =>
    get().ingredients.filter((ing) => ing.sessionId === sessionId),

  getCompletionPercent: (sessionId) => {
    const sessionItems = get().items.filter((item) => item.sessionId === sessionId);
    if (sessionItems.length === 0) return 0;
    const completed = sessionItems.filter((item) => item.completed).length;
    return Math.round((completed / sessionItems.length) * 100);
  },

  getTotalPrepTime: (sessionId) =>
    get()
      .items.filter((item) => item.sessionId === sessionId)
      .reduce((sum, item) => sum + item.prepTimeMinutes + item.cookTimeMinutes, 0),
    }),
    {
      name: 'family-command-center-meal-prep',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        items: state.items,
        ingredients: state.ingredients,
      }),
    }
  )
);
