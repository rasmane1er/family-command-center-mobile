import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type SleepQuality = 1 | 2 | 3 | 4 | 5;

export interface SleepLog {
  id: string;
  familyId: string;
  memberId: string;
  date: string;
  bedtime: string;
  wakeTime: string;
  durationHours: number;
  quality: SleepQuality;
  notes?: string;
  createdAt: string;
}

interface SleepState {
  logs: SleepLog[];
  addLog: (l: Omit<SleepLog, 'id' | 'createdAt'>) => void;
  deleteLog: (id: string) => void;
  getAverageSleep: (memberId: string) => number;
  seedDemoData: () => void;
}

export const useSleepStore = create<SleepState>((set, get) => ({
  logs: [],
  addLog: (l) => set((s) => ({ logs: [{ ...l, id: generateId(), createdAt: new Date().toISOString() }, ...s.logs] })),
  deleteLog: (id) => set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
  getAverageSleep: (memberId) => {
    const memberLogs = get().logs.filter((l) => l.memberId === memberId).slice(0, 7);
    if (memberLogs.length === 0) return 0;
    return memberLogs.reduce((s, l) => s + l.durationHours, 0) / memberLogs.length;
  },
  seedDemoData: () => {
    const now = new Date().toISOString();
    const logs: SleepLog[] = [];
    const members = ['member-1', 'member-2', 'member-3', 'member-4'];
    const bedtimes: Record<string, string> = { 'member-1': '22:30', 'member-2': '23:00', 'member-3': '21:00', 'member-4': '20:30' };
    const durations: Record<string, number> = { 'member-1': 7.5, 'member-2': 7, 'member-3': 9, 'member-4': 10 };
    for (let d = 0; d < 7; d++) {
      const date = new Date(Date.now() - d * 86400000).toISOString().split('T')[0];
      members.forEach((memberId) => {
        const dur = durations[memberId] + (Math.random() - 0.5);
        const quality = Math.max(1, Math.min(5, Math.round(3.5 + (Math.random() - 0.5) * 2))) as SleepQuality;
        logs.push({
          id: generateId(),
          familyId: 'demo-family',
          memberId,
          date,
          bedtime: bedtimes[memberId],
          wakeTime: `0${Math.floor((parseInt(bedtimes[memberId].split(':')[0]) + dur) % 24)}:00`,
          durationHours: Math.round(dur * 10) / 10,
          quality,
          createdAt: now,
        });
      });
    }
    set({ logs });
  },
}));
