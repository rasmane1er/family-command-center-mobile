import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as volunteerService from '../services/volunteerService';

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
  id?: string;
  memberId: string;
  memberName: string;
  yearlyHoursGoal: number;
  year: number;
}

interface VolunteerState {
  logs: VolunteerLog[];
  goals: VolunteerGoal[];
  isLoaded: boolean;
  addLog: (log: Omit<VolunteerLog, 'id' | 'createdAt'>) => void;
  verifyLog: (id: string) => void;
  removeLog: (id: string) => void;
  setGoal: (goal: VolunteerGoal) => void;
  getLogsForMember: (memberId: string) => VolunteerLog[];
  getTotalHours: (memberId: string, year: number) => number;
  getHoursByOrg: (memberId: string) => Record<string, number>;
  getAllTimeHours: (memberId: string) => number;
  fetchFromServer: () => Promise<void>;
}

export const useVolunteerStore = create<VolunteerState>()(
  persist(
    (set, get) => ({
  logs: [],
  goals: [],
  isLoaded: false,

  addLog: (log) => {
    const newLog: VolunteerLog = { ...log, id: generateId(), createdAt: new Date().toISOString() };
    set((s) => ({ logs: [newLog, ...s.logs] }));
    volunteerService.createVolunteerLog(newLog).catch(() => {
      set((s) => ({ logs: s.logs.filter((l) => l.id !== newLog.id) }));
    });
  },

  verifyLog: (id) => {
    const prev = get().logs;
    set((s) => ({ logs: s.logs.map((l) => (l.id === id ? { ...l, verified: true } : l)) }));
    volunteerService.updateVolunteerLogRemote(id, { verified: true }).catch(() => { set({ logs: prev }); });
  },

  removeLog: (id) => {
    const prev = get().logs;
    set((s) => ({ logs: s.logs.filter((l) => l.id !== id) }));
    volunteerService.deleteVolunteerLogRemote(id).catch(() => { set({ logs: prev }); });
  },

  setGoal: (goal) => {
    const prev = get().goals;
    set((s) => {
      const exists = s.goals.find((g) => g.memberId === goal.memberId && g.year === goal.year);
      return {
        goals: exists
          ? s.goals.map((g) => (g.memberId === goal.memberId && g.year === goal.year ? { ...exists, ...goal } : g))
          : [...s.goals, goal],
      };
    });
    volunteerService.saveVolunteerGoalRemote(goal)
      .then(({ goal: saved }) => {
        set((s) => ({
          goals: s.goals.map((g) => (g.memberId === saved.memberId && g.year === saved.year ? saved : g)),
        }));
      })
      .catch(() => { set({ goals: prev }); });
  },

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

  fetchFromServer: async () => {
    try {
      const [{ logs }, { goals }] = await Promise.all([
        volunteerService.fetchVolunteerLogs(),
        volunteerService.fetchVolunteerGoals(),
      ]);
      set({ logs, goals, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },
    }),
    {
      name: 'family-command-center-volunteer',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ logs: state.logs, goals: state.goals, isLoaded: state.isLoaded }),
    }
  )
);
