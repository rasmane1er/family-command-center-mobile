import { enqueueSync } from '../sync/enqueueSync';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { Transaction, Budget, Bill, Subscription, FinancialAccount, FinancialGoal } from '../types';

interface FinanceState {
  accounts: FinancialAccount[];
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  subscriptions: Subscription[];
  financialGoals: FinancialGoal[];
  totalNetWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;

  addAccount: (a: FinancialAccount) => void;
  updateAccount: (id: string, updates: Partial<FinancialAccount>) => void;
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
  seedDemoData: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
  accounts: [],
  transactions: [],
  budgets: [],
  bills: [],
  subscriptions: [],
  financialGoals: [],
  totalNetWorth: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  monthlySavings: 0,

  addAccount: (a) => set((s) => ({ accounts: [...s.accounts, a] })),
  updateAccount: (id, updates) =>
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)) })),
  addTransaction: (t) => {
  set((s) => ({ transactions: [t, ...s.transactions] }));

  enqueueSync({
    entity: 'finance',
    action: 'create',
    payload: { type: 'transaction', data: t },
  });
},
  deleteTransaction: (id) => {
  set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));

  enqueueSync({
    entity: 'finance',
    action: 'delete',
    payload: { type: 'transaction', id },
  });
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

  seedDemoData: () => {
    const familyId = 'demo-family';
    const now = new Date().toISOString();
    const today = new Date();

    const accounts: FinancialAccount[] = [
      { id: 'acc-1', familyId, name: 'Family Checking', type: 'checking', balance: 8420.55, institution: 'Chase Bank', lastUpdated: now, isShared: true },
      { id: 'acc-2', familyId, name: 'Emergency Fund', type: 'savings', balance: 15000.00, institution: 'Marcus', lastUpdated: now, isShared: true },
      { id: 'acc-3', familyId, name: '401(k) - Marcus', type: 'investment', balance: 142300.00, institution: 'Fidelity', lastUpdated: now, isShared: false },
      { id: 'acc-4', familyId, name: 'Roth IRA - Sarah', type: 'investment', balance: 89400.00, institution: 'Vanguard', lastUpdated: now, isShared: false },
      { id: 'acc-5', familyId, name: 'Kids 529 Plan', type: 'investment', balance: 18750.00, institution: 'Vanguard', lastUpdated: now, isShared: true },
    ];

    const transactions: Transaction[] = [
      { id: generateId(), familyId, amount: 4200, type: 'income', category: 'Salary', description: "Marcus's Paycheck", date: new Date(today.getFullYear(), today.getMonth(), 15).toISOString(), isRecurring: true, createdAt: now },
      { id: generateId(), familyId, amount: 3800, type: 'income', category: 'Salary', description: "Sarah's Paycheck", date: new Date(today.getFullYear(), today.getMonth(), 15).toISOString(), isRecurring: true, createdAt: now },
      { id: generateId(), familyId, amount: 2150, type: 'expense', category: 'Housing', description: 'Mortgage Payment', date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(), isRecurring: true, createdAt: now },
      { id: generateId(), familyId, amount: 312.45, type: 'expense', category: 'Food', subcategory: 'Groceries', description: 'Whole Foods Market', date: new Date(today.getFullYear(), today.getMonth(), 18).toISOString(), isRecurring: false, createdAt: now },
      { id: generateId(), familyId, amount: 65.80, type: 'expense', category: 'Food', subcategory: 'Dining Out', description: 'Olive Garden - Family Dinner', date: new Date(today.getFullYear(), today.getMonth(), 17).toISOString(), isRecurring: false, createdAt: now },
      { id: generateId(), familyId, amount: 180, type: 'expense', category: 'Transport', description: 'Fuel - Marcus', date: new Date(today.getFullYear(), today.getMonth(), 16).toISOString(), isRecurring: false, createdAt: now },
      { id: generateId(), familyId, amount: 245, type: 'expense', category: 'Utilities', description: 'Electric & Gas Bill', date: new Date(today.getFullYear(), today.getMonth(), 10).toISOString(), isRecurring: true, createdAt: now },
      { id: generateId(), familyId, amount: 89.99, type: 'expense', category: 'Entertainment', description: 'Cable + Internet', date: new Date(today.getFullYear(), today.getMonth(), 5).toISOString(), isRecurring: true, createdAt: now },
      { id: generateId(), familyId, amount: 500, type: 'transfer', category: 'Savings', description: 'Monthly Savings Transfer', date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(), isRecurring: true, createdAt: now },
      { id: generateId(), familyId, amount: 125, type: 'expense', category: 'Health', description: "Aiden's Soccer Cleats", date: new Date(today.getFullYear(), today.getMonth(), 12).toISOString(), isRecurring: false, createdAt: now },
    ];

    const budgets: Budget[] = [
      { id: generateId(), familyId, category: 'Food', monthlyLimit: 800, spent: 378.25, month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, color: '#FF6B6B', icon: 'restaurant' },
      { id: generateId(), familyId, category: 'Transport', monthlyLimit: 400, spent: 180, month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, color: '#4ECDC4', icon: 'car' },
      { id: generateId(), familyId, category: 'Entertainment', monthlyLimit: 200, spent: 89.99, month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, color: '#DDA0DD', icon: 'tv' },
      { id: generateId(), familyId, category: 'Health', monthlyLimit: 300, spent: 125, month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, color: '#96CEB4', icon: 'medkit' },
      { id: generateId(), familyId, category: 'Clothing', monthlyLimit: 150, spent: 0, month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, color: '#FFEAA7', icon: 'shirt' },
      { id: generateId(), familyId, category: 'Utilities', monthlyLimit: 350, spent: 245, month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, color: '#95A5A6', icon: 'flash' },
    ];

    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const bills: Bill[] = [
      { id: generateId(), familyId, name: 'Mortgage', amount: 2150, dueDate: new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString(), category: 'Housing', status: 'upcoming', isAutoPay: true, isRecurring: true, recurrence: 'monthly', icon: 'home' },
      { id: generateId(), familyId, name: 'Car Insurance', amount: 185, dueDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), category: 'Insurance', status: 'due_soon', isAutoPay: false, isRecurring: true, recurrence: 'monthly', icon: 'car' },
      { id: generateId(), familyId, name: 'Electric & Gas', amount: 245, dueDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(), category: 'Utilities', status: 'upcoming', isAutoPay: false, isRecurring: true, recurrence: 'monthly', icon: 'flash' },
      { id: generateId(), familyId, name: 'Water Bill', amount: 85, dueDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), category: 'Utilities', status: 'overdue', isAutoPay: false, isRecurring: true, recurrence: 'monthly', icon: 'water' },
      { id: generateId(), familyId, name: 'Life Insurance', amount: 120, dueDate: new Date(today.getFullYear(), today.getMonth() + 1, 15).toISOString(), category: 'Insurance', status: 'upcoming', isAutoPay: true, isRecurring: true, recurrence: 'monthly', icon: 'shield-checkmark' },
    ];

    const subscriptions: Subscription[] = [
      { id: generateId(), familyId, name: 'Netflix', amount: 22.99, billingCycle: 'monthly', nextBillingDate: new Date(today.getFullYear(), today.getMonth() + 1, 8).toISOString(), category: 'Streaming', isActive: true, sharedMembers: ['member-1', 'member-2', 'member-3', 'member-4'], icon: 'tv-outline', color: '#E74C3C' },
      { id: generateId(), familyId, name: 'Spotify Family', amount: 16.99, billingCycle: 'monthly', nextBillingDate: new Date(today.getFullYear(), today.getMonth() + 1, 12).toISOString(), category: 'Music', isActive: true, sharedMembers: ['member-1', 'member-2', 'member-3'], icon: 'musical-notes-outline', color: '#27AE60' },
      { id: generateId(), familyId, name: 'Amazon Prime', amount: 14.99, billingCycle: 'monthly', nextBillingDate: new Date(today.getFullYear(), today.getMonth() + 1, 3).toISOString(), category: 'Shopping', isActive: true, sharedMembers: ['member-1', 'member-2'], icon: 'cube-outline', color: '#F5A623' },
      { id: generateId(), familyId, name: 'Disney+', amount: 13.99, billingCycle: 'monthly', nextBillingDate: new Date(today.getFullYear(), today.getMonth() + 1, 20).toISOString(), category: 'Streaming', isActive: true, sharedMembers: ['member-3', 'member-4'], icon: 'star-outline', color: '#45B7D1' },
      { id: generateId(), familyId, name: 'iCloud+ 200GB', amount: 2.99, billingCycle: 'monthly', nextBillingDate: new Date(today.getFullYear(), today.getMonth() + 1, 15).toISOString(), category: 'Cloud Storage', isActive: true, sharedMembers: ['member-1', 'member-2'], icon: 'cloud-outline', color: '#64748B' },
      { id: generateId(), familyId, name: 'Gym Membership', amount: 89, billingCycle: 'monthly', nextBillingDate: new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString(), category: 'Health & Fitness', isActive: true, sharedMembers: ['member-1', 'member-2'], icon: 'fitness-outline', color: '#FF6B6B' },
    ];

    const financialGoals: FinancialGoal[] = [
      { id: generateId(), familyId, name: 'Hawaii Vacation Fund', targetAmount: 8000, savedAmount: 3250, deadline: '2026-06-01', category: 'travel', color: '#45B7D1', icon: 'airplane', isCompleted: false, createdAt: now },
      { id: generateId(), familyId, name: 'Emergency Fund (6 months)', targetAmount: 24000, savedAmount: 15000, category: 'savings', color: '#27AE60', icon: 'shield', isCompleted: false, createdAt: now },
      { id: generateId(), familyId, name: 'New Family Car', targetAmount: 45000, savedAmount: 12000, deadline: '2027-01-01', category: 'home', color: '#F5A623', icon: 'car', isCompleted: false, createdAt: now },
    ];

    const totalNetWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
    const monthlyIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    set({
      accounts,
      transactions,
      budgets,
      bills,
      subscriptions,
      financialGoals,
      totalNetWorth,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings: monthlyIncome - monthlyExpenses,
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
        totalNetWorth: state.totalNetWorth,
        monthlyIncome: state.monthlyIncome,
        monthlyExpenses: state.monthlyExpenses,
        monthlySavings: state.monthlySavings,
      }),
    }
  )
);
