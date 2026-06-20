import { create } from 'zustand';
import type { WealthEntry, WealthProjection, ReputationScore } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 11);

interface WealthState {
  entries: WealthEntry[];
  projections: WealthProjection[];
  reputationScores: ReputationScore[];
  addEntry: (e: Omit<WealthEntry, 'id' | 'lastUpdated'>) => void;
  updateEntry: (id: string, updates: Partial<WealthEntry>) => void;
  deleteEntry: (id: string) => void;
  getTotalNetWorth: () => number;
  seedDemoData: () => void;
}

export const useWealthStore = create<WealthState>((set, get) => ({
  entries: [],
  projections: [],
  reputationScores: [],

  addEntry: (e) =>
    set((s) => ({
      entries: [{ ...e, id: generateId(), lastUpdated: new Date().toISOString() }, ...s.entries],
    })),

  updateEntry: (id, updates) =>
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...updates, lastUpdated: new Date().toISOString() } : e)),
    })),

  deleteEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

  getTotalNetWorth: () => get().entries.reduce((sum, e) => sum + e.currentValue, 0),

  seedDemoData: () => {
    const now = new Date().toISOString();

    const entries: WealthEntry[] = [
      { id: 'w1', familyId: 'demo-family', name: '401(k) - Marcus', category: 'retirement', currentValue: 145000, costBasis: 98000, percentAllocation: 28, annualReturn: 8.2, institution: 'Fidelity', lastUpdated: now },
      { id: 'w2', familyId: 'demo-family', name: 'Roth IRA - Sarah', category: 'retirement', currentValue: 62000, costBasis: 48000, percentAllocation: 12, annualReturn: 7.8, institution: 'Vanguard', lastUpdated: now },
      { id: 'w3', familyId: 'demo-family', name: 'Primary Home Equity', category: 'real_estate', currentValue: 198000, costBasis: 180000, percentAllocation: 38, annualReturn: 4.5, institution: 'Home', lastUpdated: now },
      { id: 'w4', familyId: 'demo-family', name: 'S&P 500 Index Fund', category: 'stocks', currentValue: 48500, costBasis: 35000, percentAllocation: 9.3, annualReturn: 12.1, institution: 'Schwab', lastUpdated: now },
      { id: 'w5', familyId: 'demo-family', name: 'Emergency Fund', category: 'savings', currentValue: 28000, costBasis: 28000, percentAllocation: 5.4, annualReturn: 4.9, institution: 'High-Yield Savings', lastUpdated: now },
      { id: 'w6', familyId: 'demo-family', name: 'College Fund - Aiden', category: 'savings', currentValue: 18500, costBasis: 15000, percentAllocation: 3.6, annualReturn: 6.5, institution: '529 Plan', lastUpdated: now },
      { id: 'w7', familyId: 'demo-family', name: 'College Fund - Lily', category: 'savings', currentValue: 11200, costBasis: 10000, percentAllocation: 2.2, annualReturn: 6.5, institution: '529 Plan', lastUpdated: now },
      { id: 'w8', familyId: 'demo-family', name: 'Bitcoin', category: 'crypto', currentValue: 8200, costBasis: 5500, percentAllocation: 1.6, annualReturn: 22.4, institution: 'Coinbase', lastUpdated: now },
    ];

    const totalNW = entries.reduce((s, e) => s + e.currentValue, 0);
    const projections: WealthProjection[] = Array.from({ length: 20 }, (_, i) => {
      const yr = new Date().getFullYear() + i;
      const contrib = 24000 * i;
      const growth = totalNW * Math.pow(1.072, i);
      return { year: yr, netWorth: Math.round(growth + contrib), contributions: contrib, returns: Math.round(growth - totalNW) };
    });

    const reputationScores: ReputationScore[] = [
      { memberId: 'member-1', overall: 91, helpfulness: 88, taskCompletion: 94, teamwork: 92, reliability: 95, kindness: 86, trend: 'up', weeklyPoints: 245 },
      { memberId: 'member-2', overall: 95, helpfulness: 98, taskCompletion: 92, teamwork: 96, reliability: 94, kindness: 99, trend: 'up', weeklyPoints: 312 },
      { memberId: 'member-3', overall: 74, helpfulness: 70, taskCompletion: 78, teamwork: 72, reliability: 75, kindness: 80, trend: 'up', weeklyPoints: 168 },
      { memberId: 'member-4', overall: 88, helpfulness: 92, taskCompletion: 80, teamwork: 90, reliability: 82, kindness: 98, trend: 'stable', weeklyPoints: 195 },
    ];

    set({ entries, projections, reputationScores });
  },
}));
