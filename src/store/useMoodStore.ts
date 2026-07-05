import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface MoodEntry {
  id: string;
  memberId: string;
  level: MoodLevel;
  note?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

interface MoodState {
  entries: MoodEntry[];
  hasSeeded: boolean;
  addMoodEntry: (entry: Omit<MoodEntry, 'id' | 'createdAt'>) => void;
  deleteMoodEntry: (id: string) => void;
  getTodayMood: (memberId: string) => MoodEntry | undefined;
  getMemberHistory: (memberId: string, days: number) => MoodEntry[];
  getFamilyAvgToday: () => number;
  seedDemoData: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);
const toDateStr = (d: Date) => d.toISOString().split('T')[0];

export const useMoodStore = create<MoodState>()(
  persist(
    (set, get) => ({
  entries: [],
  hasSeeded: false,

  addMoodEntry: (entry) => {
    const { entries } = get();
    const filtered = entries.filter((e) => !(e.memberId === entry.memberId && e.date === entry.date));
    set({ entries: [...filtered, { ...entry, id: generateId(), createdAt: new Date().toISOString() }] });
  },

  deleteMoodEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

  getTodayMood: (memberId) => {
    const today = toDateStr(new Date());
    return get().entries.find((e) => e.memberId === memberId && e.date === today);
  },

  getMemberHistory: (memberId, days) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return get().entries
      .filter((e) => e.memberId === memberId && new Date(e.date) >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  getFamilyAvgToday: () => {
    const today = toDateStr(new Date());
    const dayEntries = get().entries.filter((e) => e.date === today);
    if (dayEntries.length === 0) return 0;
    return dayEntries.reduce((s, e) => s + e.level, 0) / dayEntries.length;
  },

  seedDemoData: () => {
    const now = new Date();
    const memberIds = ['member-1', 'member-2', 'member-3', 'member-4'];
    const baseMoods: Record<string, number> = { 'member-1': 4, 'member-2': 5, 'member-3': 3, 'member-4': 4 };
    const entries: MoodEntry[] = [];

    for (let d = 13; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const dateStr = toDateStr(date);
      memberIds.forEach((memberId) => {
        const base = baseMoods[memberId];
        const variance = Math.round((Math.random() - 0.5) * 2);
        const level = Math.max(1, Math.min(5, base + variance)) as MoodLevel;
        entries.push({ id: generateId(), memberId, level, date: dateStr, createdAt: date.toISOString() });
      });
    }
    set({ entries, hasSeeded: true });
  },
    }),
    {
      name: 'family-command-center-mood',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
