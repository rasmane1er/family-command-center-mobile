import { enqueueSync } from '../sync/enqueueSync';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type {
  Transaction, Budget, Bill, Subscription, FinancialAccount, FinancialGoal, Debt,
  AccountTransaction, RecurringAccountTransaction,
} from '../types';
import * as financeAccountService from '../services/financeAccountService';
import type { CreateAccountTransactionInput, CreateRecurringInput } from '../services/financeAccountService';
import * as budgetService from '../services/budgetService';
import * as billService from '../services/billService';
import * as financeSubscriptionService from '../services/financeSubscriptionService';
import * as financialGoalService from '../services/financialGoalService';
import * as debtService from '../services/debtService';
import * as financeAdoptService from '../services/financeAdoptService';
import * as financeSummaryService from '../services/financeSummaryService';

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
  // Set once the pre-backend-persistence MMKV budgets/bills/subscriptions/
  // goals/debts on this device have been uploaded via /finance/adopt-local.
  // null means "not yet attempted" (or a prior attempt failed) — checked and
  // retried at the top of every fetchFromServer() call.
  localAdoptedAt: string | null;

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
  fetchBudgets: (month?: string) => Promise<void>;
  addBill: (b: Bill) => void;
  updateBill: (id: string, updates: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  markBillPaid: (id: string) => void;
  fetchBills: () => Promise<void>;
  addSubscription: (s: Subscription) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  fetchSubscriptions: () => Promise<void>;
  addFinancialGoal: (g: FinancialGoal) => void;
  updateFinancialGoal: (id: string, updates: Partial<FinancialGoal>) => void;
  deleteFinancialGoal: (id: string) => void;
  fetchFinancialGoals: () => Promise<void>;
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
  localAdoptedAt: null,

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

  // ─── Budgets ────────────────────────────────────────────────────────────
  addBudget: (b) => {
    set((s) => ({ budgets: [...s.budgets, b] }));
    budgetService.createBudget(b).catch(() => {
      set((s) => ({ budgets: s.budgets.filter((x) => x.id !== b.id) }));
    });
  },
  updateBudget: (id, updates) => {
    const prev = get().budgets;
    set((s) => ({ budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...updates } : b)) }));
    budgetService.updateBudgetRemote(id, updates).catch(() => { set({ budgets: prev }); });
  },
  deleteBudget: (id) => {
    const prev = get().budgets;
    set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }));
    budgetService.deleteBudgetRemote(id).catch(() => { set({ budgets: prev }); });
  },
  fetchBudgets: async (month) => {
    const { budgets } = await budgetService.fetchBudgets(month);
    set({ budgets });
  },

  // ─── Bills ──────────────────────────────────────────────────────────────
  addBill: (b) => {
    set((s) => ({ bills: [...s.bills, b] }));
    billService.createBill(b).catch(() => {
      set((s) => ({ bills: s.bills.filter((x) => x.id !== b.id) }));
    });
  },
  updateBill: (id, updates) => {
    const prev = get().bills;
    set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, ...updates } : b)) }));
    billService.updateBillRemote(id, updates).catch(() => { set({ bills: prev }); });
  },
  deleteBill: (id) => {
    const prev = get().bills;
    set((s) => ({ bills: s.bills.filter((b) => b.id !== id) }));
    billService.deleteBillRemote(id).catch(() => { set({ bills: prev }); });
  },
  markBillPaid: (id) => {
    const prev = get().bills;
    set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, status: 'paid' } : b)) }));
    billService.payBillRemote(id).catch(() => { set({ bills: prev }); });
  },
  fetchBills: async () => {
    const { bills } = await billService.fetchBills();
    set({ bills });
  },

  // ─── Subscriptions ──────────────────────────────────────────────────────
  addSubscription: (s_) => {
    set((s) => ({ subscriptions: [...s.subscriptions, s_] }));
    financeSubscriptionService.createSubscription(s_).catch(() => {
      set((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== s_.id) }));
    });
  },
  updateSubscription: (id, updates) => {
    const prev = get().subscriptions;
    set((s) => ({ subscriptions: s.subscriptions.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub)) }));
    financeSubscriptionService.updateSubscriptionRemote(id, updates).catch(() => { set({ subscriptions: prev }); });
  },
  deleteSubscription: (id) => {
    const prev = get().subscriptions;
    set((s) => ({ subscriptions: s.subscriptions.filter((s_) => s_.id !== id) }));
    financeSubscriptionService.deleteSubscriptionRemote(id).catch(() => { set({ subscriptions: prev }); });
  },
  fetchSubscriptions: async () => {
    const { subscriptions } = await financeSubscriptionService.fetchSubscriptions();
    set({ subscriptions });
  },

  // ─── Financial Goals ────────────────────────────────────────────────────
  addFinancialGoal: (g) => {
    set((s) => ({ financialGoals: [...s.financialGoals, g] }));
    financialGoalService.createFinancialGoal(g).catch(() => {
      set((s) => ({ financialGoals: s.financialGoals.filter((x) => x.id !== g.id) }));
    });
  },
  updateFinancialGoal: (id, updates) => {
    const prev = get().financialGoals;
    set((s) => ({ financialGoals: s.financialGoals.map((g) => (g.id === id ? { ...g, ...updates } : g)) }));
    financialGoalService.updateFinancialGoalRemote(id, updates).catch(() => { set({ financialGoals: prev }); });
  },
  deleteFinancialGoal: (id) => {
    const prev = get().financialGoals;
    set((s) => ({ financialGoals: s.financialGoals.filter((g) => g.id !== id) }));
    financialGoalService.deleteFinancialGoalRemote(id).catch(() => { set({ financialGoals: prev }); });
  },
  fetchFinancialGoals: async () => {
    const { goals } = await financialGoalService.fetchFinancialGoals();
    set({ financialGoals: goals });
  },

  // ─── Debts ──────────────────────────────────────────────────────────────
  addDebt: (d) => {
    const now = new Date().toISOString();
    const debt: Debt = { ...d, id: generateId(), createdAt: now, updatedAt: now };
    set((s) => ({ debts: [...s.debts, debt] }));
    debtService.createDebt(debt).catch(() => {
      set((s) => ({ debts: s.debts.filter((x) => x.id !== debt.id) }));
    });
  },
  updateDebt: (id, updates) => {
    const prev = get().debts;
    const now = new Date().toISOString();
    set((s) => ({ debts: s.debts.map((d) => (d.id === id ? { ...d, ...updates, updatedAt: now } : d)) }));
    debtService.updateDebtRemote(id, { ...updates, updatedAt: now }).catch(() => { set({ debts: prev }); });
  },
  removeDebt: (id) => {
    const prev = get().debts;
    set((s) => ({ debts: s.debts.filter((d) => d.id !== id) }));
    debtService.deleteDebtRemote(id).catch(() => { set({ debts: prev }); });
  },
  recordPayment: (debtId, amount, date) => {
    const prev = get().debts;
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
    debtService.updateDebtRemote(debtId, { lastPaymentDate: date, lastPaymentAmount: amount, updatedAt: now })
      .catch(() => { set({ debts: prev }); });
  },

  fetchFromServer: async () => {
    // One-time adoption of pre-backend MMKV records (see financeAdoptService)
    // — must run BEFORE the fetches below, which replace each local array
    // with server state and would otherwise discard anything never uploaded.
    const st = get();
    if (
      !st.localAdoptedAt &&
      (st.budgets.length || st.bills.length || st.subscriptions.length || st.financialGoals.length || st.debts.length)
    ) {
      try {
        await financeAdoptService.adoptLocal({
          budgets: st.budgets,
          bills: st.bills,
          subscriptions: st.subscriptions,
          financialGoals: st.financialGoals,
          debts: st.debts,
        });
        set({ localAdoptedAt: new Date().toISOString() });
      } catch {
        // leave null so the next launch retries
      }
    }

    const [accountsRes, debtsRes, budgetsRes, billsRes, subscriptionsRes, goalsRes, summaryRes] = await Promise.allSettled([
      financeAccountService.fetchAccounts(),
      debtService.fetchDebts(),
      budgetService.fetchBudgets(),
      billService.fetchBills(),
      financeSubscriptionService.fetchSubscriptions(),
      financialGoalService.fetchFinancialGoals(),
      financeSummaryService.fetchFinanceSummary(),
    ]);

    set((s) => {
      const accounts = accountsRes.status === 'fulfilled' ? accountsRes.value.accounts : s.accounts;
      const debts = debtsRes.status === 'fulfilled' ? debtsRes.value.debts : s.debts;
      const budgets = budgetsRes.status === 'fulfilled' ? budgetsRes.value.budgets : s.budgets;
      const bills = billsRes.status === 'fulfilled' ? billsRes.value.bills : s.bills;
      const subscriptions = subscriptionsRes.status === 'fulfilled' ? subscriptionsRes.value.subscriptions : s.subscriptions;
      const financialGoals = goalsRes.status === 'fulfilled' ? goalsRes.value.goals : s.financialGoals;
      // totalNetWorth still comes from calcDerived (accounts-based, already
      // correct) — only monthlyIncome/monthlyExpenses/monthlySavings are
      // overridden here, with the real server-computed figures from Plaid +
      // ledger activity replacing calcDerived's near-always-zero numbers
      // (which come from the local `transactions` array — see
      // financeSummaryService.ts for why that array doesn't reflect real
      // bank activity).
      const derived = calcDerived(accounts, s.transactions);
      if (summaryRes.status === 'fulfilled') {
        derived.monthlyIncome = summaryRes.value.monthlyIncome;
        derived.monthlyExpenses = summaryRes.value.monthlyExpenses;
        derived.monthlySavings = summaryRes.value.monthlySavings;
      }
      return {
        accounts, debts, budgets, bills, subscriptions, financialGoals,
        isLoaded: true,
        ...derived,
      };
    });
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
        localAdoptedAt: state.localAdoptedAt,
        // isLoaded intentionally NOT persisted — it was previously set true
        // even on fetch failure and persisted forever, so on any existing
        // install fetchFromServer() would never be called again (see
        // FinanceDashboardScreen's identical fix for useOperationsStore).
      }),
    }
  )
);
