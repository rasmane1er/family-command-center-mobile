import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as habitsService from '../services/habitsService';

export interface Habit {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  memberId?: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  longestStreak: number;
  completedDates: string[];
  points: number;
  createdAt: string;
}

interface HabitsState {
  habits: Habit[];
  isLoaded: boolean;
  addHabit: (h: Omit<Habit, 'id' | 'streak' | 'longestStreak' | 'completedDates' | 'createdAt'>) => Promise<void>;
  completeHabit: (id: string, date: string) => void;
  uncompleteHabit: (id: string, date: string) => void;
  deleteHabit: (id: string) => void;
  isCompletedToday: (id: string) => boolean;
  fetchFromServer: (familyId?: string) => Promise<void>;
}

import { generateId } from '../utils/generateId';
const toDateStr = (d: Date) => d.toISOString().split('T')[0];

// calcStreak() below only ever looks back 365 days, and HabitsScreen only
// ever renders the last 7 days, so nothing reads completedDates entries
// older than a year — cap with margin instead of growing this forever.
const MAX_COMPLETED_DATES = 400;

function calcStreak(dates: string[], from: string): number {
  let streak = 0;
  const base = new Date(from);
  for (let i = 0; i <= 365; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    if (dates.includes(toDateStr(d))) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export const useHabitsStore = create<HabitsState>()(
  persist(
    (set, get) => ({
      habits: [],
      isLoaded: false,

      fetchFromServer: async () => {
        try {
          const { habits } = await habitsService.fetchHabits();
          set({ habits, isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },

      addHabit: async (h) => {
        const newHabit: Habit = {
          ...h, id: generateId(), streak: 0, longestStreak: 0, completedDates: [], createdAt: new Date().toISOString(),
        };
        set((s) => ({ habits: [...s.habits, newHabit] }));
        try {
          await habitsService.createHabit(newHabit);
        } catch {
          set((s) => ({ habits: s.habits.filter((h2) => h2.id !== newHabit.id) }));
        }
      },

      completeHabit: (id, date) => {
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id || h.completedDates.includes(date)) return h;
            const newDates = [...h.completedDates, date].sort().slice(-MAX_COMPLETED_DATES);
            const streak = calcStreak(newDates, date);
            return { ...h, completedDates: newDates, streak, longestStreak: Math.max(h.longestStreak, streak) };
          }),
        }));
        const habit = get().habits.find((h) => h.id === id);
        if (habit) {
          habitsService.updateHabitRemote(id, {
            completedDates: habit.completedDates,
            streak: habit.streak,
            longestStreak: habit.longestStreak,
          }).catch(() => {});
        }
      },

      uncompleteHabit: (id, date) => {
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h;
            const newDates = h.completedDates.filter((d) => d !== date);
            const streak = newDates.length > 0 ? calcStreak(newDates, toDateStr(new Date())) : 0;
            return { ...h, completedDates: newDates, streak };
          }),
        }));
        const habit = get().habits.find((h) => h.id === id);
        if (habit) {
          habitsService.updateHabitRemote(id, { completedDates: habit.completedDates, streak: habit.streak }).catch(() => {});
        }
      },

      deleteHabit: (id) => {
        const prev = get().habits;
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }));
        habitsService.deleteHabitRemote(id).catch(() => { set({ habits: prev }); });
      },

      isCompletedToday: (id) => {
        const today = toDateStr(new Date());
        return get().habits.find((h) => h.id === id)?.completedDates.includes(today) ?? false;
      },
    }),
    {
      name: 'family-command-center-habits',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
