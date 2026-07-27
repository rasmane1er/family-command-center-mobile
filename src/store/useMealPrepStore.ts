import { create } from 'zustand';

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

const NOW = new Date().toISOString();
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().split('T')[0];

// Monday of this week = today (2026-07-27 is a Monday)
const THIS_SUNDAY = day(6);  // 2026-08-02
const NEXT_SUNDAY = day(13); // 2026-08-09
const THIS_WEEK_OF = day(0); // 2026-07-27 (Monday)
const NEXT_WEEK_OF = day(7); // 2026-08-03 (Monday)

const SEED_SESSIONS: PrepSession[] = [
  {
    id: 'ps1',
    title: 'Sunday Batch Cook – Week 1',
    scheduledDate: THIS_SUNDAY,
    estimatedHours: 3,
    status: 'planned',
    notes: 'Focus on proteins and grains for the week',
    weekOf: THIS_WEEK_OF,
    createdAt: NOW,
  },
  {
    id: 'ps2',
    title: 'Sunday Batch Cook – Week 2',
    scheduledDate: NEXT_SUNDAY,
    estimatedHours: 2.5,
    status: 'planned',
    notes: 'Lighter prep, mostly vegetables and snacks',
    weekOf: NEXT_WEEK_OF,
    createdAt: NOW,
  },
];

const SEED_ITEMS: PrepItem[] = [
  // Session 1
  {
    id: 'pi1',
    sessionId: 'ps1',
    name: 'Baked Chicken Breasts',
    category: 'protein',
    servings: 8,
    prepTimeMinutes: 10,
    cookTimeMinutes: 30,
    instructions: 'Season with salt, pepper, garlic powder. Bake at 400°F until internal temp 165°F.',
    completed: false,
    storageDays: 5,
    storageMethod: 'fridge',
  },
  {
    id: 'pi2',
    sessionId: 'ps1',
    name: 'Brown Rice',
    category: 'grain',
    servings: 10,
    prepTimeMinutes: 5,
    cookTimeMinutes: 45,
    instructions: 'Rinse rice, cook 2:1 water ratio, let steam 10 min after cooking.',
    completed: false,
    storageDays: 5,
    storageMethod: 'fridge',
  },
  {
    id: 'pi3',
    sessionId: 'ps1',
    name: 'Roasted Mixed Vegetables',
    category: 'vegetable',
    servings: 6,
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    instructions: 'Toss broccoli, bell peppers, zucchini with olive oil and seasoning. Roast at 425°F.',
    completed: false,
    storageDays: 4,
    storageMethod: 'fridge',
  },
  {
    id: 'pi4',
    sessionId: 'ps1',
    name: 'Overnight Oats (5 jars)',
    category: 'breakfast',
    servings: 5,
    prepTimeMinutes: 15,
    cookTimeMinutes: 0,
    instructions: 'Mix oats, milk, chia seeds, honey. Divide into mason jars. Add berries on top.',
    completed: false,
    storageDays: 5,
    storageMethod: 'fridge',
  },
  // Session 2
  {
    id: 'pi5',
    sessionId: 'ps2',
    name: 'Turkey Meatballs',
    category: 'protein',
    servings: 12,
    prepTimeMinutes: 20,
    cookTimeMinutes: 25,
    instructions: 'Mix ground turkey with breadcrumbs, egg, herbs. Roll and bake at 375°F.',
    completed: false,
    storageDays: 3,
    storageMethod: 'fridge',
  },
  {
    id: 'pi6',
    sessionId: 'ps2',
    name: 'Homemade Granola Bars',
    category: 'snack',
    servings: 16,
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    instructions: 'Mix oats, honey, peanut butter, nuts. Press into pan and bake until golden.',
    completed: false,
    storageDays: 7,
    storageMethod: 'room-temp',
  },
  {
    id: 'pi7',
    sessionId: 'ps2',
    name: 'Pasta Primavera (Freezer Meals)',
    category: 'full-meal',
    servings: 8,
    prepTimeMinutes: 20,
    cookTimeMinutes: 30,
    instructions: 'Cook pasta, sauté veggies, mix with marinara. Portion into freezer containers.',
    completed: false,
    storageDays: 90,
    storageMethod: 'freezer',
  },
];

const SEED_INGREDIENTS: PrepIngredient[] = [
  // Session 1
  { id: 'ing1', sessionId: 'ps1', name: 'Chicken breasts', quantity: '3 lbs', purchased: false, aisle: 'Meat' },
  { id: 'ing2', sessionId: 'ps1', name: 'Brown rice', quantity: '3 cups dry', purchased: false, aisle: 'Grains' },
  { id: 'ing3', sessionId: 'ps1', name: 'Broccoli florets', quantity: '2 heads', purchased: false, aisle: 'Produce' },
  { id: 'ing4', sessionId: 'ps1', name: 'Bell peppers (mixed)', quantity: '3 large', purchased: true, aisle: 'Produce' },
  { id: 'ing5', sessionId: 'ps1', name: 'Zucchini', quantity: '2 medium', purchased: false, aisle: 'Produce' },
  { id: 'ing6', sessionId: 'ps1', name: 'Rolled oats', quantity: '5 cups', purchased: true, aisle: 'Cereals' },
  { id: 'ing7', sessionId: 'ps1', name: 'Whole milk', quantity: '1 quart', purchased: false, aisle: 'Dairy' },
  { id: 'ing8', sessionId: 'ps1', name: 'Chia seeds', quantity: '1/2 cup', purchased: true, aisle: 'Baking' },
  // Session 2
  { id: 'ing9', sessionId: 'ps2', name: 'Ground turkey', quantity: '2 lbs', purchased: false, aisle: 'Meat' },
  { id: 'ing10', sessionId: 'ps2', name: 'Breadcrumbs', quantity: '1 cup', purchased: false, aisle: 'Baking' },
  { id: 'ing11', sessionId: 'ps2', name: 'Peanut butter', quantity: '1 cup', purchased: false, aisle: 'Nut Butters' },
  { id: 'ing12', sessionId: 'ps2', name: 'Mixed nuts', quantity: '2 cups', purchased: false, aisle: 'Snacks' },
  { id: 'ing13', sessionId: 'ps2', name: 'Penne pasta', quantity: '2 lbs', purchased: false, aisle: 'Pasta' },
  { id: 'ing14', sessionId: 'ps2', name: 'Marinara sauce', quantity: '2 jars', purchased: false, aisle: 'Sauces' },
];

export const useMealPrepStore = create<MealPrepState>()((set, get) => ({
  sessions: SEED_SESSIONS,
  items: SEED_ITEMS,
  ingredients: SEED_INGREDIENTS,

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
}));
