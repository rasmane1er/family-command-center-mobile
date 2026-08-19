import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as activityService from '../services/activityService';

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

import { generateId } from '../utils/generateId';

export const useActivitiesStore = create<ActivitiesState>()(
  persist(
    (set, get) => ({
  activities: [],
  isLoaded: false,

  addActivity: (a) => {
    const activity = { ...a, id: generateId() };
    set((s) => ({ activities: [...s.activities, activity] }));
    activityService.createActivity(activity).catch(() => {
      set((s) => ({ activities: s.activities.filter((x) => x.id !== activity.id) }));
    });
  },

  toggleActive: (id) => {
    const prev = get().activities;
    let updatedIsActive = false;

    set((s) => ({
      activities: s.activities.map((a) => {
        if (a.id !== id) return a;
        updatedIsActive = !a.isActive;
        return { ...a, isActive: updatedIsActive };
      }),
    }));

    activityService.updateActivityRemote(id, { isActive: updatedIsActive }).catch(() => { set({ activities: prev }); });
  },

  deleteActivity: (id) => {
    const prev = get().activities;
    set((s) => ({ activities: s.activities.filter((a) => a.id !== id) }));
    activityService.deleteActivityRemote(id).catch(() => { set({ activities: prev }); });
  },

  getTotalMonthlyCost: () =>
    get()
      .activities.filter((a) => a.isActive)
      .reduce((sum, a) => sum + (a.monthlyCost ?? 0), 0),

  fetchFromServer: async () => {
    try {
      const { activities } = await activityService.fetchActivities();
      set({ activities, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },
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
