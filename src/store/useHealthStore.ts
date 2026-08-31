import { create } from 'zustand';
import type { HealthRecord, HealthGoal, HealthMetricType, HealthAppointment } from '../types';
import {
  fetchHealthRecords, createHealthRecord,
  fetchHealthGoals, createHealthGoal, updateHealthGoalProgress,
  fetchHealthAppointments, createHealthAppointment, deleteHealthAppointment as deleteHealthAppointmentRemote,
} from '../services/healthTrackingService';

interface HealthState {
  records: HealthRecord[];
  goals: HealthGoal[];
  appointments: HealthAppointment[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  addRecord: (r: Omit<HealthRecord, 'id' | 'familyId'>) => Promise<void>;
  addGoal: (g: Omit<HealthGoal, 'id'>) => Promise<void>;
  updateGoalProgress: (id: string, current: number) => Promise<void>;
  addAppointment: (a: Omit<HealthAppointment, 'id'>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  getRecordsByMember: (memberId: string) => HealthRecord[];
  getLatestMetric: (memberId: string, metric: HealthMetricType) => HealthRecord | undefined;
  fetchFromServer: () => Promise<void>;
}

export const useHealthStore = create<HealthState>()((set, get) => ({
  records: [],
  goals: [],
  appointments: [],
  isLoaded: false,
  isLoading: false,
  error: null,

  fetchFromServer: async () => {
    set({ isLoading: true, error: null });
    try {
      const [{ records }, { goals }, { appointments }] = await Promise.all([
        fetchHealthRecords(), fetchHealthGoals(), fetchHealthAppointments(),
      ]);
      set({ records, goals, appointments, isLoaded: true, isLoading: false });
    } catch {
      set({ isLoading: false, error: "Couldn't load health data. Check your connection and try again." });
    }
  },

  addRecord: async (r) => {
    try {
      const { record } = await createHealthRecord(r);
      set((s) => ({ records: [record, ...s.records] }));
    } catch {
      set({ error: "Couldn't save that entry. Check your connection and try again." });
    }
  },

  addGoal: async (g) => {
    try {
      const { goal } = await createHealthGoal(g);
      set((s) => ({ goals: [goal, ...s.goals] }));
    } catch {
      set({ error: "Couldn't save that goal. Check your connection and try again." });
    }
  },

  updateGoalProgress: async (id, current) => {
    const prev = get().goals;
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, current } : g)) }));
    try {
      await updateHealthGoalProgress(id, current);
    } catch {
      set({ goals: prev, error: "Couldn't update that goal. Check your connection and try again." });
    }
  },

  addAppointment: async (a) => {
    try {
      const { appointment } = await createHealthAppointment(a);
      set((s) => ({ appointments: [appointment, ...s.appointments] }));
    } catch {
      set({ error: "Couldn't save that appointment. Check your connection and try again." });
    }
  },

  deleteAppointment: async (id) => {
    const prev = get().appointments;
    set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) }));
    try {
      await deleteHealthAppointmentRemote(id);
    } catch {
      set({ appointments: prev, error: "Couldn't delete that appointment. Check your connection and try again." });
    }
  },

  getRecordsByMember: (memberId) =>
    get().records.filter((r) => r.memberId === memberId),

  getLatestMetric: (memberId, metric) =>
    get()
      .records.filter((r) => r.memberId === memberId && r.metric === metric)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0],
}));
