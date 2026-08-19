import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type DuesStatus = 'paid' | 'due' | 'overdue' | 'waived';

export interface HOADuesRecord {
  id: string;
  period: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: DuesStatus;
  notes: string;
  createdAt: string;
}

export interface HOARule {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'strict';
  createdAt: string;
}

export interface HOAAmenity {
  id: string;
  name: string;
  hours: string;
  reservationRequired: boolean;
  notes: string;
  icon: string;
}

export interface HOAMeeting {
  id: string;
  title: string;
  date: string;
  location: string;
  notes: string;
  attended: boolean;
  minutes: string;
  createdAt: string;
}

interface HOAState {
  dues: HOADuesRecord[];
  rules: HOARule[];
  amenities: HOAAmenity[];
  meetings: HOAMeeting[];
  monthlyDueAmount: number;
  hoaName: string;
  managementCompany: string;
  managementPhone: string;
  addDues: (dues: Omit<HOADuesRecord, 'id' | 'createdAt'>) => void;
  markDuesPaid: (id: string, paidDate: string) => void;
  addRule: (rule: Omit<HOARule, 'id' | 'createdAt'>) => void;
  removeRule: (id: string) => void;
  addMeeting: (meeting: Omit<HOAMeeting, 'id' | 'createdAt'>) => void;
  updateMeetingMinutes: (id: string, minutes: string) => void;
  getTotalOwed: () => number;
  getOverdueDues: () => HOADuesRecord[];
}

export const useHOAStore = create<HOAState>()(
  persist(
    (set, get) => ({
  // A fresh family's HOA tracker starts empty — HOAManagerScreen already has
  // real "No dues records" / "No rules yet" / "No upcoming meetings" empty
  // states for these. Shipping the same hardcoded demo dues/rules/amenities/
  // meetings to every family regardless of their actual HOA was never real
  // data, just a permanent fake default.
  dues: [],
  rules: [],
  amenities: [],
  meetings: [],
  monthlyDueAmount: 250,
  hoaName: 'Sunset Ridge HOA',
  managementCompany: 'Premier Community Management',
  managementPhone: '(555) 822-4400',

  addDues: (dues) =>
    set((s) => ({
      dues: [
        ...s.dues,
        { ...dues, id: generateId(), createdAt: new Date().toISOString() },
      ],
    })),

  markDuesPaid: (id, paidDate) =>
    set((s) => ({
      dues: s.dues.map((d) =>
        d.id === id ? { ...d, status: 'paid', paidDate } : d
      ),
    })),

  addRule: (rule) =>
    set((s) => ({
      rules: [
        ...s.rules,
        { ...rule, id: generateId(), createdAt: new Date().toISOString() },
      ],
    })),

  removeRule: (id) =>
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),

  addMeeting: (meeting) =>
    set((s) => ({
      meetings: [
        ...s.meetings,
        { ...meeting, id: generateId(), createdAt: new Date().toISOString() },
      ],
    })),

  updateMeetingMinutes: (id, minutes) =>
    set((s) => ({
      meetings: s.meetings.map((m) => (m.id === id ? { ...m, minutes } : m)),
    })),

  getTotalOwed: () =>
    get()
      .dues.filter((d) => d.status === 'due' || d.status === 'overdue')
      .reduce((sum, d) => sum + d.amount, 0),

  getOverdueDues: () => get().dues.filter((d) => d.status === 'overdue'),
    }),
    {
      name: 'family-command-center-hoa',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        dues: state.dues,
        rules: state.rules,
        amenities: state.amenities,
        meetings: state.meetings,
        monthlyDueAmount: state.monthlyDueAmount,
        hoaName: state.hoaName,
        managementCompany: state.managementCompany,
        managementPhone: state.managementPhone,
      }),
    }
  )
);
