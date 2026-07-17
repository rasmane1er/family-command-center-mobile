import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as utilityService from '../services/utilityService';

import { generateId } from '../utils/generateId';

export type UtilityType = 'electric' | 'water' | 'gas' | 'internet' | 'phone' | 'trash' | 'sewer' | 'other';

export interface UtilityBill {
  id: string;
  familyId: string;
  type: UtilityType;
  provider: string;
  month: string;
  amount: number;
  usage?: number;
  usageUnit?: string;
  isPaid: boolean;
  notes?: string;
}

interface UtilityState {
  bills: UtilityBill[];
  isLoaded: boolean;
  addBill: (b: Omit<UtilityBill, 'id'>) => Promise<void>;
  updateBill: (id: string, updates: Partial<UtilityBill>) => void;
  markPaid: (id: string) => void;
  deleteBill: (id: string) => void;
  getMonthlyTotal: (month: string) => number;
  getAverageForType: (type: UtilityType) => number;
  getCurrentMonthTotal: () => number;
  fetchFromServer: () => Promise<void>;
}

export const useUtilityStore = create<UtilityState>()(
  persist(
    (set, get) => ({
  bills: [],
  isLoaded: false,

  addBill: async (b) => {
    const bill = { ...b, id: generateId() };
    set((s) => ({ bills: [...s.bills, bill] }));
    try {
      await utilityService.createBill(bill);
    } catch {
      set((s) => ({ bills: s.bills.filter((x) => x.id !== bill.id) }));
    }
  },

  updateBill: (id, updates) => {
    set((s) => ({
      bills: s.bills.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
    utilityService.updateBillRemote(id, updates).catch(() => {});
  },

  markPaid: (id) => {
    set((s) => ({
      bills: s.bills.map((b) => (b.id === id ? { ...b, isPaid: true } : b)),
    }));
    utilityService.updateBillRemote(id, { isPaid: true }).catch(() => {});
  },

  deleteBill: (id) => {
    const prev = get().bills;
    set((s) => ({ bills: s.bills.filter((b) => b.id !== id) }));
    utilityService.deleteBillRemote(id).catch(() => { set({ bills: prev }); });
  },

  getMonthlyTotal: (month) =>
    get()
      .bills.filter((b) => b.month === month)
      .reduce((sum, b) => sum + b.amount, 0),

  getAverageForType: (type) => {
    const typeBills = get().bills.filter((b) => b.type === type);
    if (typeBills.length === 0) return 0;
    return typeBills.reduce((sum, b) => sum + b.amount, 0) / typeBills.length;
  },

  getCurrentMonthTotal: () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return get().getMonthlyTotal(month);
  },

  fetchFromServer: async () => {
    try {
      const { bills } = await utilityService.fetchBills();
      set({ bills, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },
    }),
    {
      name: 'family-command-center-utility',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
