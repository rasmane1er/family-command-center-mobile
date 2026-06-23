import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

type UtilityType = 'electric' | 'water' | 'gas' | 'internet' | 'phone' | 'trash' | 'sewer' | 'other';

interface UtilityBill {
  id: string;
  familyId: string;
  type: UtilityType;
  provider: string;
  month: string;
  amount: number;
  usage?: number;
  usageUnit?: string;
  isPaid: boolean;
  notes?: string;
}

interface UtilityState {
  bills: UtilityBill[];
  addBill: (b: Omit<UtilityBill, 'id'>) => void;
  markPaid: (id: string) => void;
  deleteBill: (id: string) => void;
  getMonthlyTotal: (month: string) => number;
  getAverageForType: (type: UtilityType) => number;
  getCurrentMonthTotal: () => number;
  seedDemoData: () => void;
}

export const useUtilityStore = create<UtilityState>((set, get) => ({
  bills: [],

  addBill: (b) =>
    set((s) => ({ bills: [...s.bills, { ...b, id: generateId() }] })),

  markPaid: (id) =>
    set((s) => ({
      bills: s.bills.map((b) => (b.id === id ? { ...b, isPaid: true } : b)),
    })),

  deleteBill: (id) =>
    set((s) => ({ bills: s.bills.filter((b) => b.id !== id) })),

  getMonthlyTotal: (month) =>
    get()
      .bills.filter((b) => b.month === month)
      .reduce((sum, b) => sum + b.amount, 0),

  getAverageForType: (type) => {
    const typeBills = get().bills.filter((b) => b.type === type);
    if (typeBills.length === 0) return 0;
    return typeBills.reduce((sum, b) => sum + b.amount, 0) / typeBills.length;
  },

  getCurrentMonthTotal: () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return get().getMonthlyTotal(month);
  },

  seedDemoData: () => {
    const familyId = 'demo-family';
    const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
    const currentMonth = '2026-06';

    // Seasonal variation data
    const electricAmounts = [185, 160, 138, 125, 148, 172];
    const gasAmounts = [120, 105, 75, 45, 30, 32];
    const waterAmounts = [48, 52, 58, 65, 72, 75];

    const bills: UtilityBill[] = [];

    months.forEach((month, idx) => {
      const isPaid = month !== currentMonth;

      bills.push({
        id: generateId(),
        familyId,
        type: 'electric',
        provider: 'AEP',
        month,
        amount: electricAmounts[idx],
        usage: Math.round(electricAmounts[idx] * 8),
        usageUnit: 'kWh',
        isPaid,
      });

      bills.push({
        id: generateId(),
        familyId,
        type: 'water',
        provider: 'City Water',
        month,
        amount: waterAmounts[idx],
        usage: Math.round(waterAmounts[idx] * 100),
        usageUnit: 'gallons',
        isPaid,
      });

      bills.push({
        id: generateId(),
        familyId,
        type: 'gas',
        provider: 'Southwest Gas',
        month,
        amount: gasAmounts[idx],
        usage: Math.round(gasAmounts[idx] / 1.2),
        usageUnit: 'therms',
        isPaid,
      });

      bills.push({
        id: generateId(),
        familyId,
        type: 'internet',
        provider: 'Xfinity',
        month,
        amount: 79.99,
        usage: 450,
        usageUnit: 'GB',
        isPaid,
      });

      bills.push({
        id: generateId(),
        familyId,
        type: 'phone',
        provider: 'Verizon',
        month,
        amount: 150,
        isPaid,
      });

      bills.push({
        id: generateId(),
        familyId,
        type: 'trash',
        provider: 'WM',
        month,
        amount: 35,
        isPaid,
      });
    });

    set({ bills });
  },
}));
