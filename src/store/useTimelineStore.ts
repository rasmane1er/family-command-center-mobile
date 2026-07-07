import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  isLoaded: boolean;
  addEntry: (entry: Omit<TimelineEntry, 'id'>) => void;
  deleteEntry: (id: string) => void;
  fetchFromServer: () => Promise<void>;
}


export const useTimelineStore = create<TimelineState>()(
  persist(
    (set) => ({
      entries: [],
      isLoaded: false,
      addEntry: (entry) =>
        set((s) => ({
          entries: [{ ...entry, id: `timeline-${Date.now()}` }, ...s.entries].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
        })),
      deleteEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      fetchFromServer: async () => { set({ isLoaded: true }); },
    }),
    { name: 'timeline-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
