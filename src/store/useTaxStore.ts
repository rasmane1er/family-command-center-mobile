import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type TaxCategory =
  | 'income'
  | 'deduction'
  | 'credit'
  | 'property'
  | 'investment'
  | 'business'
  | 'medical'
  | 'charity'
  | 'education'
  | 'childcare';

export type DocumentStatus = 'needed' | 'received' | 'uploaded' | 'filed';

export interface TaxDocument {
  id: string;
  year: number;
  name: string;
  category: TaxCategory;
  status: DocumentStatus;
  amount?: number;
  dueDate?: string;
  notes: string;
  createdAt: string;
}

export interface TaxDeduction {
  id: string;
  year: number;
  category: TaxCategory;
  description: string;
  amount: number;
  date: string;
  receiptCount: number;
  notes: string;
  createdAt: string;
}

interface TaxState {
  documents: TaxDocument[];
  deductions: TaxDeduction[];
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  addDocument: (doc: Omit<TaxDocument, 'id' | 'createdAt'>) => void;
  updateDocumentStatus: (id: string, status: DocumentStatus) => void;
  removeDocument: (id: string) => void;
  addDeduction: (deduction: Omit<TaxDeduction, 'id' | 'createdAt'>) => void;
  removeDeduction: (id: string) => void;
  getTotalDeductions: (year: number) => number;
  getDocumentsByStatus: (year: number, status: DocumentStatus) => TaxDocument[];
}

const DEMO_DOCUMENTS: TaxDocument[] = [
  {
    id: generateId(),
    year: 2026,
    name: 'W-2 from Employer',
    category: 'income',
    status: 'received',
    amount: 85000,
    dueDate: '2026-01-31',
    notes: 'Main employer annual wages',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    year: 2026,
    name: '1099-INT Bank Interest',
    category: 'income',
    status: 'received',
    amount: 320,
    dueDate: '2026-01-31',
    notes: 'Savings account interest from Chase',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    year: 2026,
    name: 'Mortgage Interest Statement (1098)',
    category: 'property',
    status: 'uploaded',
    amount: 12400,
    dueDate: '2026-01-31',
    notes: 'Annual mortgage interest deduction',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    year: 2026,
    name: 'Property Tax Statement',
    category: 'property',
    status: 'received',
    amount: 4800,
    notes: 'County property tax paid 2025',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    year: 2026,
    name: '1099-DIV Investment Dividends',
    category: 'investment',
    status: 'needed',
    notes: 'Awaiting from Fidelity brokerage',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    year: 2026,
    name: 'Child Tax Credit Documentation',
    category: 'childcare',
    status: 'filed',
    notes: 'Daycare receipts and provider EIN submitted',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    year: 2026,
    name: 'HSA Contributions (Form 8889)',
    category: 'medical',
    status: 'needed',
    amount: 3650,
    notes: 'Health Savings Account contributions',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    year: 2026,
    name: '1098-T Tuition Statement',
    category: 'education',
    status: 'received',
    amount: 8200,
    notes: 'University tuition for American Opportunity Credit',
    createdAt: new Date().toISOString(),
  },
];

const DEMO_DEDUCTIONS: TaxDeduction[] = [
  {
    id: generateId(),
    year: 2026,
    category: 'charity',
    description: 'Cash donations to local food bank',
    amount: 1200,
    date: '2025-12-15',
    receiptCount: 4,
    notes: 'Quarterly donations throughout year',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    year: 2026,
    category: 'medical',
    description: 'Out-of-pocket medical expenses',
    amount: 3100,
    date: '2025-11-30',
    receiptCount: 12,
    notes: 'Prescriptions, copays, specialist visits',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    year: 2026,
    category: 'business',
    description: 'Home office deduction',
    amount: 1800,
    date: '2025-12-31',
    receiptCount: 1,
    notes: '200 sq ft office, 10% of home expenses',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    year: 2026,
    category: 'education',
    description: 'Professional development courses',
    amount: 650,
    date: '2025-09-10',
    receiptCount: 3,
    notes: 'Online certifications for work',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    year: 2026,
    category: 'charity',
    description: 'Donated goods to Goodwill',
    amount: 540,
    date: '2025-10-05',
    receiptCount: 2,
    notes: 'Furniture and clothing donations',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    year: 2026,
    category: 'childcare',
    description: 'Summer camp (dependent care)',
    amount: 2400,
    date: '2025-07-01',
    receiptCount: 6,
    notes: 'Qualified dependent care expenses',
    createdAt: new Date().toISOString(),
  },
];

export const useTaxStore = create<TaxState>()((set, get) => ({
  documents: DEMO_DOCUMENTS,
  deductions: DEMO_DEDUCTIONS,
  selectedYear: 2026,

  setSelectedYear: (year) => set({ selectedYear: year }),

  addDocument: (doc) =>
    set((s) => ({
      documents: [
        ...s.documents,
        { ...doc, id: generateId(), createdAt: new Date().toISOString() },
      ],
    })),

  updateDocumentStatus: (id, status) =>
    set((s) => ({
      documents: s.documents.map((d) => (d.id === id ? { ...d, status } : d)),
    })),

  removeDocument: (id) =>
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

  addDeduction: (deduction) =>
    set((s) => ({
      deductions: [
        ...s.deductions,
        { ...deduction, id: generateId(), createdAt: new Date().toISOString() },
      ],
    })),

  removeDeduction: (id) =>
    set((s) => ({ deductions: s.deductions.filter((d) => d.id !== id) })),

  getTotalDeductions: (year) =>
    get()
      .deductions.filter((d) => d.year === year)
      .reduce((sum, d) => sum + d.amount, 0),

  getDocumentsByStatus: (year, status) =>
    get().documents.filter((d) => d.year === year && d.status === status),
}));
