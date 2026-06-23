import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

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
  addWorkout: (w: Omit<WorkoutLog, 'id' | 'createdAt'>) => void;
  deleteWorkout: (id: string) => void;
  getWeeklyCount: (memberId: string) => number;
  getTotalMinutes: (memberId: string) => number;
  seedDemoData: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  workouts: [],
  addWorkout: (w) => set((s) => ({ workouts: [{ ...w, id: generateId(), createdAt: new Date().toISOString() }, ...s.workouts] })),
  deleteWorkout: (id) => set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),
  getWeeklyCount: (memberId) => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    return get().workouts.filter((w) => w.memberId === memberId && w.date >= weekAgo).length;
  },
  getTotalMinutes: (memberId) => get().workouts.filter((w) => w.memberId === memberId).reduce((s, w) => s + w.durationMinutes, 0),
  seedDemoData: () => {
    const now = new Date().toISOString();
    const day = (d: number) => new Date(Date.now() - d * 86400000).toISOString().split('T')[0];
    const workouts: WorkoutLog[] = [
      { id: 'w1', familyId: 'demo-family', memberId: 'member-1', date: day(0), type: 'strength', title: 'Upper Body Workout', durationMinutes: 45, caloriesBurned: 320, createdAt: now },
      { id: 'w2', familyId: 'demo-family', memberId: 'member-2', date: day(0), type: 'yoga', title: 'Morning Yoga Flow', durationMinutes: 30, caloriesBurned: 150, createdAt: now },
      { id: 'w3', familyId: 'demo-family', memberId: 'member-1', date: day(2), type: 'cardio', title: '5K Run', durationMinutes: 28, caloriesBurned: 285, distance: 3.1, distanceUnit: 'miles', createdAt: now },
      { id: 'w4', familyId: 'demo-family', memberId: 'member-2', date: day(2), type: 'walking', title: 'Evening Walk', durationMinutes: 45, caloriesBurned: 180, distance: 2.5, distanceUnit: 'miles', createdAt: now },
      { id: 'w5', familyId: 'demo-family', memberId: 'member-3', date: day(1), type: 'sports', title: 'Basketball Practice', durationMinutes: 90, caloriesBurned: 450, createdAt: now },
      { id: 'w6', familyId: 'demo-family', memberId: 'member-3', date: day(3), type: 'cycling', title: 'Bike ride with Dad', durationMinutes: 60, caloriesBurned: 380, distance: 10, distanceUnit: 'miles', createdAt: now },
      { id: 'w7', familyId: 'demo-family', memberId: 'member-1', date: day(4), type: 'strength', title: 'Leg Day', durationMinutes: 50, caloriesBurned: 400, createdAt: now },
      { id: 'w8', familyId: 'demo-family', memberId: 'member-2', date: day(4), type: 'yoga', title: 'Yin Yoga', durationMinutes: 60, caloriesBurned: 200, createdAt: now },
    ];
    set({ workouts });
  },
}));
