import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodEntry {
  id: string;
  memberId: string;
  memberName: string;
  date: string; // ISO date YYYY-MM-DD
  meal: MealType;
  foodName: string;
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  servingSize: string; // e.g. "1 cup", "200g"
  notes: string;
  createdAt: string;
}

export interface NutritionGoal {
  memberId: string;
  memberName: string;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
}

interface NutritionState {
  entries: FoodEntry[];
  goals: NutritionGoal[];
  addEntry: (entry: Omit<FoodEntry, 'id' | 'createdAt'>) => void;
  removeEntry: (id: string) => void;
  setGoal: (goal: NutritionGoal) => void;
  getEntriesForDay: (memberId: string, date: string) => FoodEntry[];
  getDayTotals: (memberId: string, date: string) => { calories: number; protein: number; carbs: number; fat: number };
}

const _today = new Date().toISOString().split('T')[0];
const _yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const _now = new Date().toISOString();

const seedEntries: FoodEntry[] = [
  {
    id: 'ne1',
    memberId: 'member-1',
    memberName: 'Dad',
    date: _today,
    meal: 'breakfast',
    foodName: 'Oatmeal with berries',
    calories: 320,
    protein: 10,
    carbs: 58,
    fat: 6,
    servingSize: '1 bowl',
    notes: '',
    createdAt: _now,
  },
  {
    id: 'ne2',
    memberId: 'member-1',
    memberName: 'Dad',
    date: _today,
    meal: 'lunch',
    foodName: 'Grilled chicken salad',
    calories: 450,
    protein: 40,
    carbs: 20,
    fat: 22,
    servingSize: '1 large plate',
    notes: 'No dressing',
    createdAt: _now,
  },
  {
    id: 'ne3',
    memberId: 'member-2',
    memberName: 'Mom',
    date: _today,
    meal: 'breakfast',
    foodName: 'Greek yogurt parfait',
    calories: 280,
    protein: 18,
    carbs: 35,
    fat: 7,
    servingSize: '1 cup',
    notes: 'With granola and honey',
    createdAt: _now,
  },
  {
    id: 'ne4',
    memberId: 'member-2',
    memberName: 'Mom',
    date: _today,
    meal: 'snack',
    foodName: 'Apple and almond butter',
    calories: 190,
    protein: 5,
    carbs: 25,
    fat: 9,
    servingSize: '1 medium apple + 2 tbsp',
    notes: '',
    createdAt: _now,
  },
  {
    id: 'ne5',
    memberId: 'member-1',
    memberName: 'Dad',
    date: _yesterday,
    meal: 'dinner',
    foodName: 'Salmon with roasted vegetables',
    calories: 580,
    protein: 48,
    carbs: 30,
    fat: 28,
    servingSize: '6oz salmon + 1 cup veggies',
    notes: 'Lemon herb seasoning',
    createdAt: _now,
  },
];

const seedGoals: NutritionGoal[] = [
  {
    memberId: 'member-1',
    memberName: 'Dad',
    dailyCalories: 2200,
    dailyProtein: 160,
    dailyCarbs: 220,
    dailyFat: 73,
  },
  {
    memberId: 'member-2',
    memberName: 'Mom',
    dailyCalories: 1800,
    dailyProtein: 120,
    dailyCarbs: 180,
    dailyFat: 60,
  },
];

export const useNutritionStore = create<NutritionState>()((set, get) => ({
  entries: seedEntries,
  goals: seedGoals,

  addEntry: (entry) =>
    set((s) => ({
      entries: [{ ...entry, id: generateId(), createdAt: new Date().toISOString() }, ...s.entries],
    })),

  removeEntry: (id) =>
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

  setGoal: (goal) =>
    set((s) => {
      const existing = s.goals.findIndex((g) => g.memberId === goal.memberId);
      if (existing >= 0) {
        const updated = [...s.goals];
        updated[existing] = goal;
        return { goals: updated };
      }
      return { goals: [...s.goals, goal] };
    }),

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
