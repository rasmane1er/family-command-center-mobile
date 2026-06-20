import { create } from 'zustand';

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
  addHabit: (h: Omit<Habit, 'id' | 'streak' | 'longestStreak' | 'completedDates' | 'createdAt'>) => void;
  completeHabit: (id: string, date: string) => void;
  uncompleteHabit: (id: string, date: string) => void;
  deleteHabit: (id: string) => void;
  isCompletedToday: (id: string) => boolean;
  seedDemoData: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);
const toDateStr = (d: Date) => d.toISOString().split('T')[0];

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

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],

  addHabit: (h) =>
    set((s) => ({
      habits: [...s.habits, {
        ...h, id: generateId(), streak: 0, longestStreak: 0, completedDates: [], createdAt: new Date().toISOString(),
      }],
    })),

  completeHabit: (id, date) =>
    set((s) => ({
      habits: s.habits.map((h) => {
        if (h.id !== id || h.completedDates.includes(date)) return h;
        const newDates = [...h.completedDates, date].sort();
        const streak = calcStreak(newDates, date);
        return { ...h, completedDates: newDates, streak, longestStreak: Math.max(h.longestStreak, streak) };
      }),
    })),

  uncompleteHabit: (id, date) =>
    set((s) => ({
      habits: s.habits.map((h) => {
        if (h.id !== id) return h;
        const newDates = h.completedDates.filter((d) => d !== date);
        const streak = newDates.length > 0 ? calcStreak(newDates, toDateStr(new Date())) : 0;
        return { ...h, completedDates: newDates, streak };
      }),
    })),

  deleteHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

  isCompletedToday: (id) => {
    const today = toDateStr(new Date());
    return get().habits.find((h) => h.id === id)?.completedDates.includes(today) ?? false;
  },

  seedDemoData: () => {
    const today = new Date();
    const pastDates = (n: number) => {
      const out = [];
      for (let i = n; i >= 1; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        out.push(toDateStr(d));
      }
      return out;
    };

    set({
      habits: [
        { id: 'h1', title: 'Family Exercise', description: '30 min of physical activity together', icon: 'fitness', color: '#27AE60', frequency: 'daily', streak: 7, longestStreak: 14, completedDates: pastDates(7), points: 20, createdAt: today.toISOString() },
        { id: 'h2', title: 'Family Dinner Together', description: 'Eat dinner together, phones away', icon: 'restaurant', color: '#E67E22', frequency: 'daily', streak: 21, longestStreak: 45, completedDates: pastDates(21), points: 15, createdAt: today.toISOString() },
        { id: 'h3', title: 'Gratitude Journal', description: 'Share 3 things you\'re grateful for', icon: 'book', color: '#8E44AD', frequency: 'daily', memberId: 'member-1', streak: 12, longestStreak: 30, completedDates: pastDates(12), points: 10, createdAt: today.toISOString() },
        { id: 'h4', title: 'Reading Time', description: 'Read for 20 minutes before bed', icon: 'library', color: '#2980B9', frequency: 'daily', memberId: 'member-3', streak: 5, longestStreak: 18, completedDates: pastDates(5), points: 10, createdAt: today.toISOString() },
        { id: 'h5', title: 'Weekly Savings Transfer', description: 'Move money to savings account', icon: 'wallet', color: '#16A085', frequency: 'weekly', streak: 8, longestStreak: 12, completedDates: pastDates(8), points: 30, createdAt: today.toISOString() },
        { id: 'h6', title: 'Family Compliment Circle', description: 'Give each member a sincere compliment', icon: 'heart', color: '#E74C3C', frequency: 'daily', streak: 3, longestStreak: 10, completedDates: pastDates(3), points: 10, createdAt: today.toISOString() },
        { id: 'h7', title: 'Digital Detox Hour', description: 'One hour screen-free family time', icon: 'phone-portrait', color: '#1565C0', frequency: 'daily', streak: 4, longestStreak: 7, completedDates: pastDates(4), points: 15, createdAt: today.toISOString() },
      ],
    });
  },
}));
