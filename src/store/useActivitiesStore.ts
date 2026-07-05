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
  hasSeeded: boolean;
  addActivity: (a: Omit<Activity, 'id'>) => void;
  toggleActive: (id: string) => void;
  deleteActivity: (id: string) => void;
  getTotalMonthlyCost: () => number;
  seedDemoData: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useActivitiesStore = create<ActivitiesState>()(
  persist(
    (set, get) => ({
  activities: [],
  hasSeeded: false,

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

  seedDemoData: () => {
    const familyId = 'demo-family';
    const activities: Activity[] = [
      {
        id: generateId(),
        familyId,
        memberId: 'member-3',
        name: 'Soccer',
        type: 'sport',
        icon: 'football-outline',
        color: '#27AE60',
        coach: 'Coach Davis',
        location: 'Riverside Park Field 3',
        scheduleDays: ['Tue', 'Thu'],
        scheduleTime: '4:00 PM',
        monthlyCost: 80,
        equipment: ['Cleats', 'Shin Guards', 'Jersey'],
        isActive: true,
        startDate: '2025-09-01',
      },
      {
        id: generateId(),
        familyId,
        memberId: 'member-3',
        name: 'Piano Lessons',
        type: 'music',
        icon: 'musical-notes-outline',
        color: '#8E44AD',
        coach: 'Ms. Patterson',
        location: 'Springfield Music Academy',
        scheduleDays: ['Wed'],
        scheduleTime: '5:00 PM',
        monthlyCost: 120,
        equipment: ['Piano Book Level 3', 'Sheet Music Folder'],
        isActive: true,
        startDate: '2025-08-15',
      },
      {
        id: generateId(),
        familyId,
        memberId: 'member-4',
        name: 'Ballet',
        type: 'art',
        icon: 'body-outline',
        color: '#E91E63',
        coach: 'Madame Lefebvre',
        location: 'City Arts Center Studio B',
        scheduleDays: ['Mon', 'Wed', 'Fri'],
        scheduleTime: '3:30 PM',
        monthlyCost: 150,
        equipment: ['Ballet Shoes', 'Leotard', 'Tights', 'Ballet Bag'],
        isActive: true,
        startDate: '2025-09-05',
      },
      {
        id: generateId(),
        familyId,
        memberId: 'member-4',
        name: 'Art Class',
        type: 'art',
        icon: 'color-palette-outline',
        color: '#F5A623',
        coach: 'Mr. Thompson',
        location: 'Community Art Studio',
        scheduleDays: ['Sat'],
        scheduleTime: '10:00 AM',
        monthlyCost: 60,
        equipment: ['Sketch Pad', 'Colored Pencils', 'Watercolor Set'],
        isActive: true,
        startDate: '2025-10-01',
      },
      {
        id: generateId(),
        familyId,
        memberId: 'member-1',
        name: 'Basketball',
        type: 'sport',
        icon: 'basketball-outline',
        color: '#E67E22',
        location: 'YMCA Gymnasium',
        scheduleDays: ['Sat'],
        scheduleTime: '8:00 AM',
        monthlyCost: 0,
        equipment: ['Basketball Shoes', 'Water Bottle'],
        isActive: true,
        startDate: '2025-11-01',
      },
    ];

    set({ activities, hasSeeded: true });
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
