import { enqueueSync } from '../sync/enqueueSync';
import { apiRequest } from '../api/client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type {
  Transaction, Budget, Bill, Subscription, FinancialAccount, FinancialGoal, Debt,
  AccountTransaction, RecurringAccountTransaction,
} from '../types';
import * as financeAccountService from '../services/financeAccountService';
import type { CreateAccountTransactionInput, CreateRecurringInput } from '../services/financeAccountService';

interface FinanceState {
  accounts: FinancialAccount[];
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  subscriptions: Subscription[];
  financialGoals: FinancialGoal[];
  debts: Debt[];
  totalNetWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  isLoaded: boolean;

  // Account ledger — keyed by accountId. Not eagerly fetched with the rest
  // of the store; AccountDetailScreen calls fetchAccountLedger on mount.
  accountTransactions: Record<string, AccountTransaction[]>;
  recurringTransactions: Record<string, RecurringAccountTransaction[]>;

  addAccount: (a: FinancialAccount) => void;
  updateAccount: (id: string, updates: Partial<FinancialAccount>) => void;
  deleteAccount: (id: string) => void;
  confirmAccountBalance: (accountId: string, actualBalance: number, reason?: string) => Promise<void>;
  fetchAccountLedger: (accountId: string) => Promise<void>;
  addAccountTransaction: (accountId: string, input: CreateAccountTransactionInput) => Promise<void>;
  importStatementRows: (
    accountId: string,
    rows: Array<{ date: string; description: string; amount: number; type: 'INCOME' | 'EXPENSE' }>,
  ) => Promise<number>;
  updateAccountTransaction: (accountId: string, id: string, updates: Partial<CreateAccountTransactionInput>) => Promise<void>;
  deleteAccountTransaction: (accountId: string, id: string) => Promise<void>;
  addRecurringTransaction: (accountId: string, input: CreateRecurringInput) => Promise<void>;
  updateRecurringTransaction: (accountId: string, id: string, updates: Partial<CreateRecurringInput> & { isActive?: boolean }) => Promise<void>;
  deleteRecurringTransaction: (accountId: string, id: string) => Promise<void>;
  confirmRecurringTransaction: (accountId: string, id: string) => Promise<void>;
  skipRecurringTransaction: (accountId: string, id: string) => Promise<void>;
  addTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addBudget: (b: Budget) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  addBill: (b: Bill) => void;
  updateBill: (id: string, updates: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  markBillPaid: (id: string) => void;
  addSubscription: (s: Subscription) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  addFinancialGoal: (g: FinancialGoal) => void;
  updateFinancialGoal: (id: string, updates: Partial<FinancialGoal>) => void;
  addDebt: (d: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  removeDebt: (id: string) => void;
  recordPayment: (debtId: string, amount: number, date: string) => void;
  fetchFromServer: () => Promise<void>;
}

import { generateId } from '../utils/generateId';

// Unlike every other log-like persisted store (notifications, journal,
// memories, chat, timeline), this array had no growth cap — manual entries
// plus ongoing Plaid sync accumulate indefinitely over months/years.
const MAX_TRANSACTIONS = 2000;

function calcDerived(
  accounts: FinancialAccount[],
  transactions: Transaction[],
) {
  const totalNetWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
  const monthlyIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  return { totalNetWorth, monthlyIncome, monthlyExpenses, monthlySavings: monthlyIncome - monthlyExpenses };
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
  accounts: [],
  transactions: [],
  budgets: [],
  bills: [],
  subscriptions: [],
  financialGoals: [],
  debts: [],
  accountTransactions: {},
  recurringTransactions: {},
  totalNetWorth: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  monthlySavings: 0,
  isLoaded: false,

  addAccount: (a) => {
    set((s) => {
      const accounts = [...s.accounts, a];
      return { accounts, ...calcDerived(accounts, s.transactions) };
    });
    financeAccountService.createAccount(a).catch(() => {
      set((s) => {
        const accounts = s.accounts.filter((x) => x.id !== a.id);
        return { accounts, ...calcDerived(accounts, s.transactions) };
      });
    });
  },
  updateAccount: (id, updates) => {
    const prev = get().accounts;
    set((s) => {
      const accounts = s.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a));
      return { accounts, ...calcDerived(accounts, s.transactions) };
    });
    financeAccountService.updateAccountRemote(id, updates).catch(() => {
      set((s) => ({ accounts: prev, ...calcDerived(prev, s.transactions) }));
    });
  },
  deleteAccount: (id) => {
    const prev = get().accounts;
    set((s) => {
      const accounts = s.accounts.filter((a) => a.id !== id);
      return { accounts, ...calcDerived(accounts, s.transactions) };
    });
    financeAccountService.deleteAccountRemote(id).catch(() => {
      set((s) => ({ accounts: prev, ...calcDerived(prev, s.transactions) }));
    });
  },

  // Ledger: server is the source of truth for account.balance from here on,
  // so every action below applies the server's returned balance rather than
  // computing it locally, then refetches that account's ledger to stay exact.
  confirmAccountBalance: async (accountId, actualBalance, reason) => {
    const { account } = await financeAccountService.confirmAccountBalance(accountId, actualBalance, reason);
    set((s) => {
      const accounts = s.accounts.map((a) => (a.id === accountId ? account : a));
      return { accounts, ...calcDerived(accounts, s.transactions) };
    });
    await get().fetchAccountLedger(accountId);
  },
  fetchAccountLedger: async (accountId) => {
    const [{ transactions }, { rules }] = await Promise.all([
      financeAccountService.fetchAccountTransactions(accountId),
      financeAccountService.fetchRecurringTransactions(accountId),
    ]);
    set((s) => ({
      accountTransactions: { ...s.accountTransactions, [accountId]: transactions },
      recurringTransactions: { ...s.recurringTransactions, [accountId]: rules },
    }));
  },
  addAccountTransaction: async (accountId, input) => {
    const result = await financeAccountService.createAccountTransaction(accountId, input);
    set((s) => {
      const accounts = s.accounts.map((a) => {
        if (a.id === accountId) return { ...a, balance: result.balance };
        if (input.transferToAccountId && a.id === input.transferToAccountId && result.transferAccountBalance !== undefined) {
          return { ...a, balance: result.transferAccountBalance };
        }
        return a;
      });
      return { accounts, ...calcDerived(accounts, s.transactions) };
    });
    await get().fetchAccountLedger(accountId);
    if (input.transferToAccountId) await get().fetchAccountLedger(input.transferToAccountId);
  },
  importStatementRows: async (accountId, rows) => {
    const { balance, imported } = await financeAccountService.confirmStatementImport(accountId, rows);
    set((s) => {
      const accounts = s.accounts.map((a) => (a.id === accountId ? { ...a, balance } : a));
      return { accounts, ...calcDerived(accounts, s.transactions) };
    });
    await get().fetchAccountLedger(accountId);
    return imported;
  },
  updateAccountTransaction: async (accountId, id, updates) => {
    const { balance } = await financeAccountService.updateAccountTransaction(accountId, id, updates);
    set((s) => {
      const accounts = s.accounts.map((a) => (a.id === accountId ? { ...a, balance } : a));
      return { accounts, ...calcDerived(accounts, s.transactions) };
    });
    await get().fetchAccountLedger(accountId);
  },
  deleteAccountTransaction: async (accountId, id) => {
    const { balance } = await financeAccountService.deleteAccountTransaction(accountId, id);
    set((s) => {
      const accounts = s.accounts.map((a) => (a.id === accountId ? { ...a, balance } : a));
      return { accounts, ...calcDerived(accounts, s.transactions) };
    });
    await get().fetchAccountLedger(accountId);
  },
  addRecurringTransaction: async (accountId, input) => {
    await financeAccountService.createRecurringTransaction(accountId, input);
    await get().fetchAccountLedger(accountId);
  },
  updateRecurringTransaction: async (accountId, id, updates) => {
    await financeAccountService.updateRecurringTransaction(accountId, id, updates);
    await get().fetchAccountLedger(accountId);
  },
  deleteRecurringTransaction: async (accountId, id) => {
    await financeAccountService.deleteRecurringTransaction(accountId, id);
    await get().fetchAccountLedger(accountId);
  },
  confirmRecurringTransaction: async (accountId, id) => {
    const { balance } = await financeAccountService.confirmRecurringTransaction(accountId, id);
    set((s) => {
      const accounts = s.accounts.map((a) => (a.id === accountId ? { ...a, balance } : a));
      return { accounts, ...calcDerived(accounts, s.transactions) };
    });
    await get().fetchAccountLedger(accountId);
  },
  skipRecurringTransaction: async (accountId, id) => {
    await financeAccountService.skipRecurringTransaction(accountId, id);
    await get().fetchAccountLedger(accountId);
  },

  addTransaction: (t) => {
    set((s) => {
      const transactions = [t, ...s.transactions].slice(0, MAX_TRANSACTIONS);
      return { transactions, ...calcDerived(s.accounts, transactions) };
    });
    enqueueSync({ entity: 'finance', action: 'create', payload: { type: 'transaction', data: t } });
  },
  deleteTransaction: (id) => {
    set((s) => {
      const transactions = s.transactions.filter((tx) => tx.id !== id);
      return { transactions, ...calcDerived(s.accounts, transactions) };
    });
    enqueueSync({ entity: 'finance', action: 'delete', payload: { type: 'transaction', id } });
  },
  addBudget: (b) => set((s) => ({ budgets: [...s.budgets, b] })),
  updateBudget: (id, updates) =>
    set((s) => ({ budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...updates } : b)) })),
  deleteBudget: (id) => set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),
  addBill: (b) => {
  set((s) => ({ bills: [...s.bills, b] }));

  enqueueSync({
    entity: 'finance',
    action: 'create',
    payload: { type: 'bill', data: b },
  });
},
  updateBill: (id, updates) =>
    set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, ...updates } : b)) })),
  deleteBill: (id) => set((s) => ({ bills: s.bills.filter((b) => b.id !== id) })),
  markBillPaid: (id) => {
  set((s) => ({
    bills: s.bills.map((b) => (b.id === id ? { ...b, status: 'paid' } : b)),
  }));

  enqueueSync({
    entity: 'finance',
    action: 'update',
    payload: { type: 'bill', id, updates: { status: 'paid' } },
  });
},
  addSubscription: (s_) => set((s) => ({ subscriptions: [...s.subscriptions, s_] })),
  updateSubscription: (id, updates) =>
    set((s) => ({ subscriptions: s.subscriptions.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub)) })),
  deleteSubscription: (id) => set((s) => ({ subscriptions: s.subscriptions.filter((s_) => s_.id !== id) })),
  addFinancialGoal: (g) => set((s) => ({ financialGoals: [...s.financialGoals, g] })),
  updateFinancialGoal: (id, updates) =>
    set((s) => ({ financialGoals: s.financialGoals.map((g) => (g.id === id ? { ...g, ...updates } : g)) })),

  addDebt: (d) => {
    const now = new Date().toISOString();
    const debt: Debt = { ...d, id: generateId(), createdAt: now, updatedAt: now };
    set((s) => ({ debts: [...s.debts, debt] }));
    void apiRequest('/debts', { method: 'POST', body: JSON.stringify(debt) }).catch(() => {});
  },
  updateDebt: (id, updates) => {
    const now = new Date().toISOString();
    set((s) => ({ debts: s.debts.map((d) => (d.id === id ? { ...d, ...updates, updatedAt: now } : d)) }));
    void apiRequest(`/debts/${id}`, { method: 'PATCH', body: JSON.stringify({ ...updates, updatedAt: now }) }).catch(() => {});
  },
  removeDebt: (id) => {
    set((s) => ({ debts: s.debts.filter((d) => d.id !== id) }));
    void apiRequest(`/debts/${id}`, { method: 'DELETE' }).catch(() => {});
  },
  recordPayment: (debtId, amount, date) => {
    const now = new Date().toISOString();
    set((s) => ({
      debts: s.debts.map((d) =>
        d.id === debtId
          ? {
              ...d,
              balance: Math.max(0, d.balance - amount),
              lastPaymentDate: date,
              lastPaymentAmount: amount,
              updatedAt: now,
            }
          : d
      ),
    }));
    void apiRequest(`/debts/${debtId}`, { method: 'PATCH', body: JSON.stringify({ lastPaymentDate: date, lastPaymentAmount: amount, updatedAt: now }) }).catch(() => {});
  },

  fetchFromServer: async () => {
    try {
      const { accounts } = await financeAccountService.fetchAccounts();
      set((s) => ({ accounts, ...calcDerived(accounts, s.transactions) }));
    } catch {
      // keep local accounts if the fetch fails
    }
    try {
      const data = await apiRequest('/debts') as Debt[];
      if (Array.isArray(data)) {
        set((s) => ({ debts: data, isLoaded: true, ...calcDerived(s.accounts, s.transactions) }));
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },
    }),
    {
      name: 'family-command-center-finance',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        accounts: state.accounts,
        transactions: state.transactions,
        budgets: state.budgets,
        bills: state.bills,
        subscriptions: state.subscriptions,
        financialGoals: state.financialGoals,
        debts: state.debts,
        accountTransactions: state.accountTransactions,
        recurringTransactions: state.recurringTransactions,
        totalNetWorth: state.totalNetWorth,
        monthlyIncome: state.monthlyIncome,
        monthlyExpenses: state.monthlyExpenses,
        monthlySavings: state.monthlySavings,
        isLoaded: state.isLoaded,
      }),
    }
  )
);
