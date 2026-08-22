import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as hoaService from '../services/hoaService';

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
  isLoaded: boolean;
  addDues: (dues: Omit<HOADuesRecord, 'id' | 'createdAt'>) => void;
  markDuesPaid: (id: string, paidDate: string) => void;
  addRule: (rule: Omit<HOARule, 'id' | 'createdAt'>) => void;
  removeRule: (id: string) => void;
  addMeeting: (meeting: Omit<HOAMeeting, 'id' | 'createdAt'>) => void;
  updateMeetingMinutes: (id: string, minutes: string) => void;
  updateSettings: (settings: { hoaName?: string; managementCompany?: string; managementPhone?: string; monthlyDueAmount?: number }) => void;
  getTotalOwed: () => number;
  getOverdueDues: () => HOADuesRecord[];
  fetchFromServer: () => Promise<void>;
}

export const useHOAStore = create<HOAState>()(
  persist(
    (set, get) => ({
  // A fresh family's HOA tracker starts empty — HOAManagerScreen already has
  // real "No dues records" / "No rules yet" / "No upcoming meetings" empty
  // states for these, and the name/company/phone fields below start blank
  // (with a real "Add HOA Info" prompt in the UI) rather than a hardcoded
  // "Sunset Ridge HOA" every family used to see regardless of their actual
  // HOA — that read as real contact info, which made it worse than most
  // fake-seed-data cases.
  dues: [],
  rules: [],
  amenities: [],
  meetings: [],
  monthlyDueAmount: 0,
  hoaName: '',
  managementCompany: '',
  managementPhone: '',
  isLoaded: false,

  addDues: (dues) => {
    const newDues: HOADuesRecord = { ...dues, id: generateId(), createdAt: new Date().toISOString() };
    set((s) => ({ dues: [...s.dues, newDues] }));
    hoaService.createHOADues(newDues).catch(() => {
      set((s) => ({ dues: s.dues.filter((d) => d.id !== newDues.id) }));
    });
  },

  markDuesPaid: (id, paidDate) => {
    const prev = get().dues;
    set((s) => ({
      dues: s.dues.map((d) => (d.id === id ? { ...d, status: 'paid' as DuesStatus, paidDate } : d)),
    }));
    hoaService.markHOADuesPaidRemote(id, paidDate).catch(() => { set({ dues: prev }); });
  },

  addRule: (rule) => {
    const newRule: HOARule = { ...rule, id: generateId(), createdAt: new Date().toISOString() };
    set((s) => ({ rules: [...s.rules, newRule] }));
    hoaService.createHOARule(newRule).catch(() => {
      set((s) => ({ rules: s.rules.filter((r) => r.id !== newRule.id) }));
    });
  },

  removeRule: (id) => {
    const prev = get().rules;
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
    hoaService.deleteHOARuleRemote(id).catch(() => { set({ rules: prev }); });
  },

  addMeeting: (meeting) => {
    const newMeeting: HOAMeeting = { ...meeting, id: generateId(), createdAt: new Date().toISOString() };
    set((s) => ({ meetings: [...s.meetings, newMeeting] }));
    hoaService.createHOAMeeting(newMeeting).catch(() => {
      set((s) => ({ meetings: s.meetings.filter((m) => m.id !== newMeeting.id) }));
    });
  },

  updateMeetingMinutes: (id, minutes) => {
    const prev = get().meetings;
    set((s) => ({
      meetings: s.meetings.map((m) => (m.id === id ? { ...m, minutes } : m)),
    }));
    hoaService.updateHOAMeetingMinutesRemote(id, minutes).catch(() => { set({ meetings: prev }); });
  },

  updateSettings: (settings) => {
    const prev = {
      hoaName: get().hoaName, managementCompany: get().managementCompany,
      managementPhone: get().managementPhone, monthlyDueAmount: get().monthlyDueAmount,
    };
    set(settings);
    hoaService.saveHOASettings(settings).catch(() => { set(prev); });
  },

  getTotalOwed: () =>
    get()
      .dues.filter((d) => d.status === 'due' || d.status === 'overdue')
      .reduce((sum, d) => sum + d.amount, 0),

  getOverdueDues: () => get().dues.filter((d) => d.status === 'overdue'),

  fetchFromServer: async () => {
    try {
      const [{ settings }, { dues }, { rules }, { meetings }] = await Promise.all([
        hoaService.fetchHOASettings(),
        hoaService.fetchHOADues(),
        hoaService.fetchHOARules(),
        hoaService.fetchHOAMeetings(),
      ]);
      set({
        dues, rules, meetings,
        hoaName: settings?.hoaName ?? '',
        managementCompany: settings?.managementCompany ?? '',
        managementPhone: settings?.managementPhone ?? '',
        monthlyDueAmount: settings?.monthlyDueAmount ?? 0,
        isLoaded: true,
      });
    } catch {
      set({ isLoaded: true });
    }
  },
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
        isLoaded: state.isLoaded,
      }),
    }
  )
);
