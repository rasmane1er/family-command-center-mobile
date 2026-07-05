import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as allowanceService from '../services/allowanceService';

export type AllowanceTransactionType = 'weekly' | 'bonus' | 'deduction' | 'manual';

export interface AllowanceConfig {
  id: string;
  familyId: string;
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
  isLoaded: boolean;
  addConfig: (config: Omit<AllowanceConfig, 'id' | 'balance'>) => Promise<void>;
  updateConfig: (id: string, updates: Partial<AllowanceConfig>) => void;
  deleteConfig: (id: string) => void;
  addTransaction: (tx: Omit<AllowanceTransaction, 'id' | 'date'>) => void;
  payWeeklyAllowance: (memberId: string) => void;
  addBonus: (memberId: string, amount: number, reason: string) => void;
  addDeduction: (memberId: string, amount: number, reason: string) => void;
  fetchFromServer: (familyId?: string) => Promise<void>;
}

const today = () => new Date().toISOString().split('T')[0];

export const useAllowanceStore = create<AllowanceStore>()(
  persist(
    (set, get) => {
      const createTx = (tx: AllowanceTransaction) => {
        allowanceService.createTransaction(tx).then(({ config }) => {
          if (config) {
            set((s) => ({ configs: s.configs.map((c) => (c.id === config.id ? (config as any) : c)) }));
          }
        }).catch(() => {});
      };

      return {
      configs: [],
      transactions: [],
      isLoaded: false,

      addConfig: async (config) => {
        const newConfig: AllowanceConfig = { ...config, id: `allow-${Date.now()}`, balance: 0 };
        set((s) => ({ configs: [...s.configs, newConfig] }));
        try {
          await allowanceService.createConfig(newConfig);
        } catch {
          set((s) => ({ configs: s.configs.filter((c) => c.id !== newConfig.id) }));
        }
      },

      updateConfig: (id, updates) => {
        set((s) => ({ configs: s.configs.map((c) => (c.id === id ? { ...c, ...updates } : c)) }));
        allowanceService.updateConfigRemote(id, updates).catch(() => {});
      },

      deleteConfig: (id) => {
        const prev = get().configs;
        set((s) => ({ configs: s.configs.filter((c) => c.id !== id) }));
        allowanceService.deleteConfigRemote(id).catch(() => { set({ configs: prev }); });
      },

      addTransaction: (tx) => set((s) => {
        const newTx: AllowanceTransaction = { ...tx, id: `tx-${Date.now()}`, date: today() };
        createTx(newTx);
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
        createTx(newTx);
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
        createTx(newTx);
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
        createTx(newTx);
        return {
          transactions: [newTx, ...s.transactions],
          configs: s.configs.map((c) =>
            c.memberId === memberId ? { ...c, balance: Math.max(0, c.balance - amount) } : c
          ),
        };
      }),

      fetchFromServer: async () => {
        try {
          const { configs, transactions } = await allowanceService.fetchAllowance();
          set({ configs, transactions, isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },
      };
    },
    {
      name: 'allowance-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ configs: state.configs, transactions: state.transactions }),
    }
  )
);
