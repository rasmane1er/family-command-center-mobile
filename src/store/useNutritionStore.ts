import { create } from 'zustand';
import {
  fetchFoodEntries, createFoodEntry, deleteFoodEntry as deleteFoodEntryRemote,
  fetchNutritionGoals, saveNutritionGoal,
} from '../services/nutritionService';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodEntry {
  id: string;
  familyId: string;
  memberId: string;
  date: string; // ISO date YYYY-MM-DD
  meal: MealType;
  foodName: string;
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  servingSize: string;
  notes?: string;
  createdAt: string;
}

export interface NutritionGoal {
  id: string;
  familyId: string;
  memberId: string;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  updatedAt: string;
}

interface NutritionState {
  entries: FoodEntry[];
  goals: NutritionGoal[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  fetchFromServer: () => Promise<void>;
  addEntry: (entry: Omit<FoodEntry, 'id' | 'createdAt' | 'familyId'>) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  setGoal: (goal: Omit<NutritionGoal, 'id' | 'familyId' | 'updatedAt'>) => Promise<void>;
  getEntriesForDay: (memberId: string, date: string) => FoodEntry[];
  getDayTotals: (memberId: string, date: string) => { calories: number; protein: number; carbs: number; fat: number };
}

export const useNutritionStore = create<NutritionState>()((set, get) => ({
  entries: [],
  goals: [],
  isLoaded: false,
  isLoading: false,
  error: null,

  fetchFromServer: async () => {
    set({ isLoading: true, error: null });
    try {
      const [{ entries }, { goals }] = await Promise.all([fetchFoodEntries(), fetchNutritionGoals()]);
      set({ entries, goals, isLoaded: true, isLoading: false });
    } catch {
      set({ isLoading: false, error: "Couldn't load nutrition data. Check your connection and try again." });
    }
  },

  addEntry: async (entry) => {
    try {
      const { entry: created } = await createFoodEntry(entry);
      set((s) => ({ entries: [created, ...s.entries] }));
    } catch {
      set({ error: "Couldn't save that food entry. Check your connection and try again." });
    }
  },

  removeEntry: async (id) => {
    const prev = get().entries;
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    try {
      await deleteFoodEntryRemote(id);
    } catch {
      set({ entries: prev, error: "Couldn't delete that entry. Check your connection and try again." });
    }
  },

  setGoal: async (goal) => {
    try {
      const { goal: saved } = await saveNutritionGoal(goal.memberId, {
        dailyCalories: goal.dailyCalories,
        dailyProtein: goal.dailyProtein,
        dailyCarbs: goal.dailyCarbs,
        dailyFat: goal.dailyFat,
      });
      set((s) => ({
        goals: [saved, ...s.goals.filter((g) => g.memberId !== goal.memberId)],
      }));
    } catch {
      set({ error: "Couldn't save that goal. Check your connection and try again." });
    }
  },

  getEntriesForDay: (memberId, date) =>
    get().entries.filter((e) => e.memberId === memberId && e.date === date),

  getDayTotals: (memberId, date) => {
    const entries = get().getEntriesForDay(memberId, date);
    return entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.protein,
        carbs: acc.carbs + e.carbs,
        fat: acc.fat + e.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  },
}));
