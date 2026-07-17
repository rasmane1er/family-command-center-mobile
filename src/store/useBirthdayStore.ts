import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

import { generateId } from '../utils/generateId';

type Relationship = 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'friend' | 'coworker' | 'other';

interface Birthday {
  id: string;
  familyId: string;
  name: string;
  memberId?: string;
  relationship: Relationship;
  date: string; // MM-DD
  birthYear?: number;
  avatarColor: string;
  remindDaysBefore: number;
  giftIdeas?: string[];
  notes?: string;
}

interface BirthdayState {
  birthdays: Birthday[];
  isLoaded: boolean;
  addBirthday: (b: Omit<Birthday, 'id'>) => void;
  updateBirthday: (id: string, updates: Partial<Birthday>) => void;
  deleteBirthday: (id: string) => void;
  getDaysUntil: (mmdd: string) => number;
  getUpcoming: (days: number) => Birthday[];
  fetchFromServer: () => Promise<void>;
}

function getDaysUntilDate(mmdd: string): number {
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMM = today.getMonth() + 1;
  const todayDD = today.getDate();

  const [mm, dd] = mmdd.split('-').map(Number);

  // Build this year's date
  const thisYear = new Date(todayYear, mm - 1, dd);
  const todayStart = new Date(todayYear, todayMM - 1, todayDD);

  const diffMs = thisYear.getTime() - todayStart.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 0;
  if (diffDays > 0) return diffDays;
  // Already passed this year, calculate to next year
  const nextYear = new Date(todayYear + 1, mm - 1, dd);
  return Math.round((nextYear.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
}

export const useBirthdayStore = create<BirthdayState>()(
  persist(
    (set, get) => ({
  birthdays: [],
  isLoaded: false,

  addBirthday: (b) =>
    set((s) => ({ birthdays: [...s.birthdays, { ...b, id: generateId() }] })),

  updateBirthday: (id, updates) =>
    set((s) => ({
      birthdays: s.birthdays.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  deleteBirthday: (id) =>
    set((s) => ({ birthdays: s.birthdays.filter((b) => b.id !== id) })),

  getDaysUntil: (mmdd) => getDaysUntilDate(mmdd),

  getUpcoming: (days) => {
    const { birthdays } = get();
    return birthdays
      .filter((b) => {
        const d = getDaysUntilDate(b.date);
        return d >= 0 && d <= days;
      })
      .sort((a, b) => getDaysUntilDate(a.date) - getDaysUntilDate(b.date));
  },

  fetchFromServer: async () => { set({ isLoaded: true }); },
    }),
    {
      name: 'family-command-center-birthday',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export type { Birthday, Relationship };
