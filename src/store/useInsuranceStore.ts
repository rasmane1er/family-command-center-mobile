import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as insuranceService from '../services/insuranceService';

import { generateId } from '../utils/generateId';

export type InsuranceType = 'health' | 'auto' | 'home' | 'life' | 'dental' | 'vision' | 'disability' | 'other';
export type PremiumFrequency = 'monthly' | 'quarterly' | 'annual';

export interface InsurancePolicy {
  id: string;
  familyId: string;
  type: InsuranceType;
  provider: string;
  policyNumber: string;
  premium: number;
  premiumFrequency: PremiumFrequency;
  deductible?: number;
  coverageAmount?: number;
  renewalDate?: string;
  membersInsured: string[];
  agentName?: string;
  agentPhone?: string;
  notes?: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

interface InsuranceState {
  policies: InsurancePolicy[];
  isLoaded: boolean;
  addPolicy: (p: Omit<InsurancePolicy, 'id' | 'createdAt'>) => Promise<void>;
  updatePolicy: (id: string, updates: Partial<InsurancePolicy>) => void;
  deletePolicy: (id: string) => void;
  getTotalMonthlyPremium: () => number;
  fetchFromServer: () => Promise<void>;
}

export const useInsuranceStore = create<InsuranceState>()(
  persist(
    (set, get) => ({
  policies: [],
  isLoaded: false,
  addPolicy: async (p) => {
    const policy = { ...p, id: generateId(), createdAt: new Date().toISOString() };
    set((s) => ({ policies: [policy, ...s.policies] }));
    try {
      await insuranceService.createPolicy(policy);
    } catch {
      set((s) => ({ policies: s.policies.filter((x) => x.id !== policy.id) }));
    }
  },
  updatePolicy: (id, updates) => {
    set((s) => ({ policies: s.policies.map((p) => p.id === id ? { ...p, ...updates } : p) }));
    insuranceService.updatePolicyRemote(id, updates).catch(() => {});
  },
  deletePolicy: (id) => {
    const prev = get().policies;
    set((s) => ({ policies: s.policies.filter((p) => p.id !== id) }));
    insuranceService.deletePolicyRemote(id).catch(() => { set({ policies: prev }); });
  },
  getTotalMonthlyPremium: () => {
    const { policies } = get();
    return policies.filter((p) => p.isActive).reduce((sum, p) => {
      const monthly = p.premiumFrequency === 'monthly' ? p.premium : p.premiumFrequency === 'quarterly' ? p.premium / 3 : p.premium / 12;
      return sum + monthly;
    }, 0);
  },
  fetchFromServer: async () => {
    try {
      const { policies } = await insuranceService.fetchPolicies();
      set({ policies, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },
    }),
    {
      name: 'family-command-center-insurance',
      storage: createJSONStorage(() => mmkvStorage),
      // isLoaded intentionally excluded — see useWealthStore.ts for why.
      partialize: (state) => ({ policies: state.policies }),
    }
  )
);
