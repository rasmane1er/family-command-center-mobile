import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

type DebtType = 'credit_card' | 'student_loan' | 'mortgage' | 'car_loan' | 'personal' | 'medical' | 'other';

interface Debt {
  id: string;
  familyId: string;
  name: string;
  type: DebtType;
  balance: number;
  originalBalance: number;
  interestRate: number;
  minimumPayment: number;
  lender?: string;
  dueDay?: number;
  color: string;
  notes?: string;
}

interface DebtState {
  debts: Debt[];
  addDebt: (d: Omit<Debt, 'id'>) => void;
  makePayment: (id: string, amount: number) => void;
  deleteDebt: (id: string) => void;
  getTotalBalance: () => number;
  getTotalMinimumPayment: () => number;
  getPayoffMonthsAvalanche: (extraPayment: number) => number;
  seedDemoData: () => void;
}

export const useDebtStore = create<DebtState>((set, get) => ({
  debts: [],

  addDebt: (d) =>
    set((s) => ({ debts: [...s.debts, { ...d, id: generateId() }] })),

  makePayment: (id, amount) =>
    set((s) => ({
      debts: s.debts.map((d) =>
        d.id === id ? { ...d, balance: Math.max(0, d.balance - amount) } : d
      ),
    })),

  deleteDebt: (id) =>
    set((s) => ({ debts: s.debts.filter((d) => d.id !== id) })),

  getTotalBalance: () => get().debts.reduce((sum, d) => sum + d.balance, 0),

  getTotalMinimumPayment: () =>
    get().debts.reduce((sum, d) => sum + d.minimumPayment, 0),

  getPayoffMonthsAvalanche: (extraPayment) => {
    const state = get();
    const totalBalance = state.getTotalBalance();
    const totalMin = state.getTotalMinimumPayment();
    const monthlyPayment = totalMin + extraPayment;
    if (monthlyPayment <= 0) return 999;
    return Math.ceil(totalBalance / monthlyPayment);
  },

  seedDemoData: () => {
    const familyId = 'demo-family';
    const debts: Debt[] = [
      {
        id: generateId(),
        familyId,
        name: 'Chase Visa',
        type: 'credit_card',
        balance: 4200,
        originalBalance: 4200,
        interestRate: 19.99,
        minimumPayment: 84,
        color: '#E74C3C',
      },
      {
        id: generateId(),
        familyId,
        name: 'Student Loan',
        type: 'student_loan',
        balance: 18500,
        originalBalance: 25000,
        interestRate: 5.5,
        minimumPayment: 195,
        lender: 'Sallie Mae',
        color: '#2980B9',
      },
      {
        id: generateId(),
        familyId,
        name: 'Car Loan',
        type: 'car_loan',
        balance: 12000,
        originalBalance: 24000,
        interestRate: 6.9,
        minimumPayment: 380,
        lender: 'Wells Fargo',
        color: '#27AE60',
      },
      {
        id: generateId(),
        familyId,
        name: 'Medical Bill',
        type: 'medical',
        balance: 890,
        originalBalance: 890,
        interestRate: 0,
        minimumPayment: 50,
        color: '#F5A623',
      },
    ];
    set({ debts });
  },
}));
