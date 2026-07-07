import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { HealthRecord, HealthGoal, HealthMetricType, HealthAppointment } from '../types';
import { useAuthStore } from './useAuthStore';
import { pushSyncEvent } from '../api/syncQueue';

const generateId = () => Math.random().toString(36).substring(2, 11);

interface HealthState {
  records: HealthRecord[];
  goals: HealthGoal[];
  appointments: HealthAppointment[];
  isLoaded: boolean;
  addRecord: (r: Omit<HealthRecord, 'id'>) => void;
  addGoal: (g: Omit<HealthGoal, 'id'>) => void;
  updateGoalProgress: (id: string, current: number) => void;
  addAppointment: (a: Omit<HealthAppointment, 'id'>) => void;
  deleteAppointment: (id: string) => void;
  getRecordsByMember: (memberId: string) => HealthRecord[];
  getLatestMetric: (memberId: string, metric: HealthMetricType) => HealthRecord | undefined;
  fetchFromServer: () => Promise<void>;
}

export const useHealthStore = create<HealthState>()(
  persist(
    (set, get) => ({
      records: [],
      goals: [],
      appointments: [],
      isLoaded: false,

      addRecord: (r) => {
        const record = { ...r, id: generateId(), familyId: useAuthStore.getState().familyId ?? '' };
        set((s) => ({ records: [record, ...s.records] }));
        pushSyncEvent('activities', 'create', { type: 'health', ...record });
      },

      addGoal: (g) => {
        const goal = { ...g, id: generateId() };
        set((s) => ({ goals: [goal, ...s.goals] }));
        pushSyncEvent('activities', 'create', { type: 'health_goal', ...goal });
      },

      updateGoalProgress: (id, current) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, current } : g)),
        })),

      addAppointment: (a) => {
        const appointment = { ...a, id: generateId() };
        set((s) => ({ appointments: [appointment, ...s.appointments] }));
        pushSyncEvent('activities', 'create', { ...appointment, type: 'health_appointment' });
      },

      deleteAppointment: (id) => {
        set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) }));
        pushSyncEvent('activities', 'delete', { type: 'health_appointment', id });
      },

      getRecordsByMember: (memberId) =>
        get().records.filter((r) => r.memberId === memberId),

      getLatestMetric: (memberId, metric) =>
        get()
          .records.filter((r) => r.memberId === memberId && r.metric === metric)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0],

      fetchFromServer: async () => {
        set({ isLoaded: true });
      },
    }),
    {
      name: 'family-command-center-health',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        records: state.records,
        goals: state.goals,
        appointments: state.appointments,
      }),
    }
  )
);
