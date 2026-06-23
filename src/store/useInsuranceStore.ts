import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

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
  addPolicy: (p: Omit<InsurancePolicy, 'id' | 'createdAt'>) => void;
  updatePolicy: (id: string, updates: Partial<InsurancePolicy>) => void;
  deletePolicy: (id: string) => void;
  getTotalMonthlyPremium: () => number;
  seedDemoData: () => void;
}

export const useInsuranceStore = create<InsuranceState>((set, get) => ({
  policies: [],
  addPolicy: (p) => set((s) => ({ policies: [{ ...p, id: generateId(), createdAt: new Date().toISOString() }, ...s.policies] })),
  updatePolicy: (id, updates) => set((s) => ({ policies: s.policies.map((p) => p.id === id ? { ...p, ...updates } : p) })),
  deletePolicy: (id) => set((s) => ({ policies: s.policies.filter((p) => p.id !== id) })),
  getTotalMonthlyPremium: () => {
    const { policies } = get();
    return policies.filter((p) => p.isActive).reduce((sum, p) => {
      const monthly = p.premiumFrequency === 'monthly' ? p.premium : p.premiumFrequency === 'quarterly' ? p.premium / 3 : p.premium / 12;
      return sum + monthly;
    }, 0);
  },
  seedDemoData: () => {
    const now = new Date().toISOString();
    const renewal1 = new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0];
    const renewal2 = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
    const policies: InsurancePolicy[] = [
      { id: 'ins1', familyId: 'demo-family', type: 'health', provider: 'Blue Cross Blue Shield', policyNumber: 'BCBS-2024-4892', premium: 780, premiumFrequency: 'monthly', deductible: 2000, coverageAmount: 1000000, renewalDate: renewal1, membersInsured: ['member-1','member-2','member-3','member-4'], agentName: 'Jane Wilson', agentPhone: '555-0143', color: '#2980B9', isActive: true, createdAt: now },
      { id: 'ins2', familyId: 'demo-family', type: 'auto', provider: 'State Farm', policyNumber: 'SF-AUTO-78234', premium: 245, premiumFrequency: 'monthly', deductible: 500, renewalDate: renewal2, membersInsured: ['member-1','member-2'], agentName: 'Tom Richards', agentPhone: '555-0166', color: '#E74C3C', isActive: true, createdAt: now },
      { id: 'ins3', familyId: 'demo-family', type: 'home', provider: 'Allstate', policyNumber: 'ALL-HO-55512', premium: 1450, premiumFrequency: 'annual', deductible: 1000, coverageAmount: 450000, renewalDate: renewal2, membersInsured: ['member-1','member-2'], color: '#27AE60', isActive: true, createdAt: now },
      { id: 'ins4', familyId: 'demo-family', type: 'life', provider: 'Northwestern Mutual', policyNumber: 'NM-LIFE-33401', premium: 125, premiumFrequency: 'monthly', coverageAmount: 500000, renewalDate: renewal2, membersInsured: ['member-1'], agentName: 'Sarah Chen', agentPhone: '555-0177', color: '#8E44AD', isActive: true, createdAt: now },
      { id: 'ins5', familyId: 'demo-family', type: 'dental', provider: 'Delta Dental', policyNumber: 'DD-2024-9901', premium: 85, premiumFrequency: 'monthly', deductible: 50, renewalDate: renewal1, membersInsured: ['member-1','member-2','member-3','member-4'], color: '#16A085', isActive: true, createdAt: now },
    ];
    set({ policies });
  },
}));
