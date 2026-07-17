import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

import { generateId } from '../utils/generateId';

export type WorkoutType = 'cardio' | 'strength' | 'yoga' | 'sports' | 'walking' | 'cycling' | 'swimming' | 'other';

export interface WorkoutLog {
  id: string;
  familyId: string;
  memberId: string;
  date: string;
  type: WorkoutType;
  title: string;
  durationMinutes: number;
  caloriesBurned?: number;
  distance?: number;
  distanceUnit?: 'miles' | 'km';
  notes?: string;
  createdAt: string;
}

interface WorkoutState {
  workouts: WorkoutLog[];
  isLoaded: boolean;
  addWorkout: (w: Omit<WorkoutLog, 'id' | 'createdAt'>) => void;
  deleteWorkout: (id: string) => void;
  getWeeklyCount: (memberId: string) => number;
  getTotalMinutes: (memberId: string) => number;
  fetchFromServer: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
  workouts: [],
  isLoaded: false,
  addWorkout: (w) => set((s) => ({ workouts: [{ ...w, id: generateId(), createdAt: new Date().toISOString() }, ...s.workouts] })),
  deleteWorkout: (id) => set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),
  getWeeklyCount: (memberId) => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    return get().workouts.filter((w) => w.memberId === memberId && w.date >= weekAgo).length;
  },
  getTotalMinutes: (memberId) => get().workouts.filter((w) => w.memberId === memberId).reduce((s, w) => s + w.durationMinutes, 0),
  fetchFromServer: async () => { set({ isLoaded: true }); },
    }),
    {
      name: 'family-command-center-workout',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
