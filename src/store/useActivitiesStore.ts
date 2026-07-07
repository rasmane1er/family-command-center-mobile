import { enqueueSync } from '../sync/enqueueSync';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

export type ActivityType = 'sport' | 'music' | 'art' | 'academic' | 'social' | 'religious' | 'other';
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface Activity {
  id: string;
  familyId: string;
  memberId: string;
  name: string;
  type: ActivityType;
  icon: string; // Ionicons name
  color: string;
  coach?: string;
  location?: string;
  scheduleDays: DayOfWeek[];
  scheduleTime?: string; // "3:30 PM"
  monthlyCost?: number;
  equipment?: string[];
  notes?: string;
  isActive: boolean;
  startDate?: string;
}

interface ActivitiesState {
  activities: Activity[];
  isLoaded: boolean;
  addActivity: (a: Omit<Activity, 'id'>) => void;
  toggleActive: (id: string) => void;
  deleteActivity: (id: string) => void;
  getTotalMonthlyCost: () => number;
  fetchFromServer: () => Promise<void>;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useActivitiesStore = create<ActivitiesState>()(
  persist(
    (set, get) => ({
  activities: [],
  isLoaded: false,

  addActivity: (a) => {
  const activity = { ...a, id: generateId() };

  set((s) => ({ activities: [...s.activities, activity] }));

  enqueueSync({
    entity: 'activities',
    action: 'create',
    payload: { type: 'activity', data: activity },
  });
},

  toggleActive: (id) => {
  let updatedIsActive = false;

  set((s) => ({
    activities: s.activities.map((a) => {
      if (a.id !== id) return a;

      updatedIsActive = !a.isActive;
      return { ...a, isActive: updatedIsActive };
    }),
  }));

  enqueueSync({
    entity: 'activities',
    action: 'update',
    payload: { type: 'activity', id, updates: { isActive: updatedIsActive } },
  });
},

  deleteActivity: (id) => {
  set((s) => ({ activities: s.activities.filter((a) => a.id !== id) }));

  enqueueSync({
    entity: 'activities',
    action: 'delete',
    payload: { type: 'activity', id },
  });
},

  getTotalMonthlyCost: () =>
    get()
      .activities.filter((a) => a.isActive)
      .reduce((sum, a) => sum + (a.monthlyCost ?? 0), 0),

  fetchFromServer: async () => { set({ isLoaded: true }); },
    }),
    {
      name: 'family-command-center-activities',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        activities: state.activities,
      }),
    }
  )
);
