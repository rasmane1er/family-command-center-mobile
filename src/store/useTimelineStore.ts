import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subDays } from 'date-fns';

export type TimelineType = 'achievement' | 'milestone' | 'memory' | 'event' | 'goal' | 'streak' | 'family';

export interface TimelineEntry {
  id: string;
  date: string;
  type: TimelineType;
  title: string;
  description: string;
  memberId?: string;
  emoji: string;
  color: string;
  isHighlight?: boolean;
}

interface TimelineState {
  entries: TimelineEntry[];
  hasSeeded: boolean;
  addEntry: (entry: Omit<TimelineEntry, 'id'>) => void;
  deleteEntry: (id: string) => void;
  seedDemoData: () => void;
}

const d = (daysAgo: number) => subDays(new Date(), daysAgo).toISOString().split('T')[0];

const DEMO: Omit<TimelineEntry, 'id'>[] = [
  {
    date: d(0), type: 'streak',
    title: '30-Day Habit Streak!',
    description: 'The Johnson family completed 30 consecutive days of morning exercise routines!',
    emoji: '🔥', color: '#E67E22', isHighlight: true,
  },
  {
    date: d(2), type: 'achievement',
    title: 'Emergency Fund Goal Reached',
    description: 'We hit our $5,000 emergency fund goal — 3 months ahead of schedule!',
    emoji: '🏆', color: '#F5A623', isHighlight: true,
  },
  {
    date: d(4), type: 'milestone',
    title: "Aiden's Straight-A Report Card",
    description: 'Aiden got straight A\'s this semester. So incredibly proud!',
    memberId: 'member-3', emoji: '🎓', color: '#8E44AD',
  },
  {
    date: d(7), type: 'family',
    title: 'Family Game Night Tradition',
    description: 'Movie marathon + board games. Marcus won Settlers of Catan again (accused of cheating).',
    emoji: '🎲', color: '#0F2952',
  },
  {
    date: d(10), type: 'goal',
    title: 'Car Loan Paid Off!',
    description: 'The Honda Pilot is officially ours! Freed up $460/month for savings.',
    emoji: '🚗', color: '#27AE60', isHighlight: true,
  },
  {
    date: d(14), type: 'memory',
    title: 'First Family Camping Trip',
    description: 'Blue Ridge Mountains — stargazing, s\'mores, zero WiFi, 100% presence. Best weekend ever.',
    emoji: '⛺', color: '#E91E63', isHighlight: true,
  },
  {
    date: d(18), type: 'achievement',
    title: '100 Family Dinners Cooked!',
    description: 'Logged 100 home-cooked family dinners this year. Saved $4,200 vs dining out!',
    emoji: '🍽️', color: '#F5A623',
  },
  {
    date: d(21), type: 'milestone',
    title: "Emma's First Soccer Goal",
    description: "Emma scored her first goal at Riverside Youth Soccer — the whole family cheered!",
    memberId: 'member-4', emoji: '⚽', color: '#8E44AD',
  },
  {
    date: d(28), type: 'streak',
    title: '21-Day No-Restaurant Challenge',
    description: 'Completed the entire challenge. Saved $380 and discovered 6 new family recipes!',
    emoji: '💪', color: '#E67E22',
  },
  {
    date: d(35), type: 'event',
    title: '14th Wedding Anniversary',
    description: 'Marcus and Sarah celebrated 14 years with dinner at The Capital Grille. Still going strong!',
    emoji: '💑', color: '#2980B9', isHighlight: true,
  },
  {
    date: d(45), type: 'family',
    title: 'The Great Houseplant Invasion',
    description: 'Sarah declared we now have 12 houseplants. The kids named every single one.',
    emoji: '🌿', color: '#27AE60',
  },
  {
    date: d(60), type: 'goal',
    title: 'First Major Investment',
    description: 'Invested $10k in S&P 500 index fund. Starting the family wealth-building journey!',
    emoji: '📈', color: '#2E7D32', isHighlight: true,
  },
  {
    date: d(90), type: 'milestone',
    title: 'Family Command Center Launch',
    description: 'Started using our Family HQ app. Completely changed how we operate as a team.',
    emoji: '🚀', color: '#0F2952', isHighlight: true,
  },
];

export const useTimelineStore = create<TimelineState>()(
  persist(
    (set) => ({
      entries: [],
      hasSeeded: false,
      addEntry: (entry) =>
        set((s) => ({
          entries: [{ ...entry, id: `timeline-${Date.now()}` }, ...s.entries].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
        })),
      deleteEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      seedDemoData: () =>
        set({
          entries: DEMO.map((e, i) => ({ ...e, id: `timeline-seed-${i}` })).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
          hasSeeded: true,
        }),
    }),
    { name: 'timeline-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
