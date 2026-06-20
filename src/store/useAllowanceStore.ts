import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AllowanceTransactionType = 'weekly' | 'bonus' | 'deduction' | 'manual';

export interface AllowanceConfig {
  id: string;
  memberId: string;
  weeklyAmount: number;
  bonusPerChore: number;
  isActive: boolean;
  lastPaidDate?: string;
  balance: number;
}

export interface AllowanceTransaction {
  id: string;
  memberId: string;
  amount: number;
  type: AllowanceTransactionType;
  description: string;
  date: string;
}

interface AllowanceStore {
  configs: AllowanceConfig[];
  transactions: AllowanceTransaction[];
  addConfig: (config: Omit<AllowanceConfig, 'id' | 'balance'>) => void;
  updateConfig: (id: string, updates: Partial<AllowanceConfig>) => void;
  deleteConfig: (id: string) => void;
  addTransaction: (tx: Omit<AllowanceTransaction, 'id' | 'date'>) => void;
  payWeeklyAllowance: (memberId: string) => void;
  addBonus: (memberId: string, amount: number, reason: string) => void;
  addDeduction: (memberId: string, amount: number, reason: string) => void;
  seedDemoData: () => void;
}

const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];

export const useAllowanceStore = create<AllowanceStore>()(
  persist(
    (set) => ({
      configs: [],
      transactions: [],

      addConfig: (config) => set((s) => ({
        configs: [...s.configs, { ...config, id: `allow-${Date.now()}`, balance: 0 }],
      })),

      updateConfig: (id, updates) => set((s) => ({
        configs: s.configs.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      })),

      deleteConfig: (id) => set((s) => ({
        configs: s.configs.filter((c) => c.id !== id),
      })),

      addTransaction: (tx) => set((s) => {
        const newTx: AllowanceTransaction = { ...tx, id: `tx-${Date.now()}`, date: today() };
        return {
          transactions: [newTx, ...s.transactions],
          configs: s.configs.map((c) =>
            c.memberId === tx.memberId
              ? { ...c, balance: c.balance + (tx.type === 'deduction' ? -tx.amount : tx.amount) }
              : c
          ),
        };
      }),

      payWeeklyAllowance: (memberId) => set((s) => {
        const config = s.configs.find((c) => c.memberId === memberId);
        if (!config || !config.isActive) return s;
        const newTx: AllowanceTransaction = {
          id: `tx-${Date.now()}`,
          memberId,
          amount: config.weeklyAmount,
          type: 'weekly',
          description: 'Weekly allowance payment',
          date: today(),
        };
        return {
          transactions: [newTx, ...s.transactions],
          configs: s.configs.map((c) =>
            c.id === config.id
              ? { ...c, balance: c.balance + config.weeklyAmount, lastPaidDate: today() }
              : c
          ),
        };
      }),

      addBonus: (memberId, amount, reason) => set((s) => {
        const newTx: AllowanceTransaction = {
          id: `tx-${Date.now()}`,
          memberId,
          amount,
          type: 'bonus',
          description: reason,
          date: today(),
        };
        return {
          transactions: [newTx, ...s.transactions],
          configs: s.configs.map((c) =>
            c.memberId === memberId ? { ...c, balance: c.balance + amount } : c
          ),
        };
      }),

      addDeduction: (memberId, amount, reason) => set((s) => {
        const newTx: AllowanceTransaction = {
          id: `tx-${Date.now()}`,
          memberId,
          amount,
          type: 'deduction',
          description: reason,
          date: today(),
        };
        return {
          transactions: [newTx, ...s.transactions],
          configs: s.configs.map((c) =>
            c.memberId === memberId ? { ...c, balance: Math.max(0, c.balance - amount) } : c
          ),
        };
      }),

      seedDemoData: () => set((s) => {
        if (s.configs.length > 0) return s;
        const configs: AllowanceConfig[] = [
          { id: 'allow-1', memberId: 'member-3', weeklyAmount: 15, bonusPerChore: 2, isActive: true, lastPaidDate: daysAgo(7), balance: 47 },
          { id: 'allow-2', memberId: 'member-4', weeklyAmount: 8, bonusPerChore: 1, isActive: true, lastPaidDate: daysAgo(7), balance: 22 },
        ];
        const transactions: AllowanceTransaction[] = [
          { id: 'tx-1', memberId: 'member-3', amount: 15, type: 'weekly', description: 'Weekly allowance', date: daysAgo(7) },
          { id: 'tx-2', memberId: 'member-3', amount: 10, type: 'bonus', description: 'Helped with garage cleanup', date: daysAgo(5) },
          { id: 'tx-3', memberId: 'member-3', amount: 5, type: 'deduction', description: 'Missed trash duty', date: daysAgo(3) },
          { id: 'tx-4', memberId: 'member-3', amount: 15, type: 'weekly', description: 'Weekly allowance', date: daysAgo(0) },
          { id: 'tx-5', memberId: 'member-4', amount: 8, type: 'weekly', description: 'Weekly allowance', date: daysAgo(7) },
          { id: 'tx-6', memberId: 'member-4', amount: 6, type: 'bonus', description: 'Perfect homework week', date: daysAgo(4) },
          { id: 'tx-7', memberId: 'member-4', amount: 8, type: 'weekly', description: 'Weekly allowance', date: daysAgo(0) },
        ];
        return { configs, transactions };
      }),
    }),
    { name: 'allowance-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
