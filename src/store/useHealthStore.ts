import { create } from 'zustand';
import type { HealthRecord, HealthGoal, HealthMetricType } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 11);

interface HealthState {
  records: HealthRecord[];
  goals: HealthGoal[];
  addRecord: (r: Omit<HealthRecord, 'id'>) => void;
  addGoal: (g: Omit<HealthGoal, 'id'>) => void;
  updateGoalProgress: (id: string, current: number) => void;
  getRecordsByMember: (memberId: string) => HealthRecord[];
  getLatestMetric: (memberId: string, metric: HealthMetricType) => HealthRecord | undefined;
  seedDemoData: () => void;
}

export const useHealthStore = create<HealthState>((set, get) => ({
  records: [],
  goals: [],

  addRecord: (r) =>
    set((s) => ({ records: [{ ...r, id: generateId() }, ...s.records] })),

  addGoal: (g) =>
    set((s) => ({ goals: [{ ...g, id: generateId() }, ...s.goals] })),

  updateGoalProgress: (id, current) =>
    set((s) => ({
      goals: s.goals.map((g) => (g.id === id ? { ...g, current } : g)),
    })),

  getRecordsByMember: (memberId) =>
    get().records.filter((r) => r.memberId === memberId),

  getLatestMetric: (memberId, metric) =>
    get()
      .records.filter((r) => r.memberId === memberId && r.metric === metric)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0],

  seedDemoData: () => {
    const today = new Date();
    const records: HealthRecord[] = [];
    const members = [
      { id: 'member-1', steps: [8200, 9100, 7800, 10200, 8600], sleep: [7.2, 6.8, 7.5, 8.0, 7.1], weight: 182 },
      { id: 'member-2', steps: [11000, 10500, 12200, 9800, 11500], sleep: [7.8, 8.0, 7.5, 8.2, 7.9], weight: 135 },
      { id: 'member-3', steps: [6500, 7200, 8100, 5900, 7800], sleep: [8.5, 9.0, 8.0, 8.5, 9.2], weight: 95 },
      { id: 'member-4', steps: [4200, 5100, 3800, 4900, 5500], sleep: [10.0, 9.5, 10.2, 9.8, 10.5], weight: 55 },
    ];
    members.forEach((m) => {
      m.steps.forEach((val, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (4 - i));
        records.push({ id: generateId(), familyId: 'demo-family', memberId: m.id, metric: 'steps', value: val, unit: 'steps', date: d.toISOString().split('T')[0] });
      });
      m.sleep.forEach((val, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (4 - i));
        records.push({ id: generateId(), familyId: 'demo-family', memberId: m.id, metric: 'sleep', value: val, unit: 'hrs', date: d.toISOString().split('T')[0] });
      });
      records.push({ id: generateId(), familyId: 'demo-family', memberId: m.id, metric: 'weight', value: m.weight, unit: 'lbs', date: today.toISOString().split('T')[0] });
    });
    records.push({ id: generateId(), familyId: 'demo-family', memberId: 'member-2', metric: 'bp', value: 118, unit: 'mmHg', notes: '118/76', date: today.toISOString().split('T')[0] });
    records.push({ id: generateId(), familyId: 'demo-family', memberId: 'member-1', metric: 'bp', value: 122, unit: 'mmHg', notes: '122/80', date: today.toISOString().split('T')[0] });

    const goals: HealthGoal[] = [
      { id: 'hg1', memberId: 'member-1', metric: 'steps', target: 10000, unit: 'steps', current: 8600 },
      { id: 'hg2', memberId: 'member-2', metric: 'steps', target: 12000, unit: 'steps', current: 11500 },
      { id: 'hg3', memberId: 'member-1', metric: 'sleep', target: 8, unit: 'hrs', current: 7.1 },
      { id: 'hg4', memberId: 'member-2', metric: 'water', target: 8, unit: 'glasses', current: 6 },
      { id: 'hg5', memberId: 'member-3', metric: 'exercise', target: 30, unit: 'min/day', current: 20 },
    ];

    set({ records, goals });
  },
}));
