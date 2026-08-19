import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

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

export const useTaxStore = create<TaxState>()(
  persist(
    (set, get) => ({
  // A fresh family's tax organizer starts empty — TaxOrganizerScreen already
  // has real "No documents yet" / "No deductions yet" empty states for
  // these. Shipping the same hardcoded demo documents/deductions to every
  // family regardless of their actual tax situation was never real data,
  // just a permanent fake default.
  documents: [],
  deductions: [],
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
    }),
    {
      name: 'family-command-center-tax',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        documents: state.documents,
        deductions: state.deductions,
        selectedYear: state.selectedYear,
      }),
    }
  )
);
