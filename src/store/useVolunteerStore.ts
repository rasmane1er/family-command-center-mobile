import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type VolunteerCause =
  | 'education'
  | 'environment'
  | 'animals'
  | 'elderly'
  | 'food-bank'
  | 'religious'
  | 'sports-coaching'
  | 'community'
  | 'health'
  | 'arts'
  | 'other';

export interface VolunteerLog {
  id: string;
  memberId: string;
  memberName: string;
  organizationName: string;
  cause: VolunteerCause;
  date: string;
  hours: number;
  description: string;
  supervisor: string;
  verified: boolean;
  createdAt: string;
}

export interface VolunteerGoal {
  memberId: string;
  memberName: string;
  yearlyHoursGoal: number;
  year: number;
}

interface VolunteerState {
  logs: VolunteerLog[];
  goals: VolunteerGoal[];
  addLog: (log: Omit<VolunteerLog, 'id' | 'createdAt'>) => void;
  verifyLog: (id: string) => void;
  removeLog: (id: string) => void;
  setGoal: (goal: VolunteerGoal) => void;
  getLogsForMember: (memberId: string) => VolunteerLog[];
  getTotalHours: (memberId: string, year: number) => number;
  getHoursByOrg: (memberId: string) => Record<string, number>;
  getAllTimeHours: (memberId: string) => number;
}

export const useVolunteerStore = create<VolunteerState>()(
  persist(
    (set, get) => ({
  // A fresh family's volunteer tracker starts empty — VolunteerTrackerScreen
  // already has real "No volunteer logs yet" / "No data yet" empty states
  // for these. Shipping the same 8 hardcoded demo logs and goals to every
  // family regardless of what they actually volunteered for was never real
  // data, just a permanent fake default.
  logs: [],
  goals: [],

  addLog: (log) =>
    set((s) => ({
      logs: [{ ...log, id: generateId(), createdAt: new Date().toISOString() }, ...s.logs],
    })),

  verifyLog: (id) =>
    set((s) => ({ logs: s.logs.map((l) => (l.id === id ? { ...l, verified: true } : l)) })),

  removeLog: (id) =>
    set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),

  setGoal: (goal) =>
    set((s) => {
      const exists = s.goals.find(
        (g) => g.memberId === goal.memberId && g.year === goal.year,
      );
      return {
        goals: exists
          ? s.goals.map((g) =>
              g.memberId === goal.memberId && g.year === goal.year ? goal : g,
            )
          : [...s.goals, goal],
      };
    }),

  getLogsForMember: (memberId) => get().logs.filter((l) => l.memberId === memberId),

  getTotalHours: (memberId, year) =>
    get()
      .logs.filter(
        (l) => l.memberId === memberId && new Date(l.date).getFullYear() === year,
      )
      .reduce((sum, l) => sum + l.hours, 0),

  getHoursByOrg: (memberId) => {
    const memberLogs = get().logs.filter((l) => l.memberId === memberId);
    return memberLogs.reduce<Record<string, number>>((acc, l) => {
      acc[l.organizationName] = (acc[l.organizationName] ?? 0) + l.hours;
      return acc;
    }, {});
  },

  getAllTimeHours: (memberId) =>
    get()
      .logs.filter((l) => l.memberId === memberId)
      .reduce((sum, l) => sum + l.hours, 0),
    }),
    {
      name: 'family-command-center-volunteer',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ logs: state.logs, goals: state.goals }),
    }
  )
);
