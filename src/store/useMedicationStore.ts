import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type MedFrequency = 'daily' | 'twice_daily' | 'weekly' | 'as_needed' | 'monthly';

export interface Medication {
  id: string;
  familyId: string;
  memberId: string;
  name: string;
  dosage: string;
  frequency: MedFrequency;
  instructions?: string;
  prescribedBy?: string;
  pharmacy?: string;
  refillDate?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  color: string;
  pillsRemaining?: number;
  createdAt: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  memberId: string;
  takenAt: string;
  doseTaken: boolean;
}

interface MedicationState {
  medications: Medication[];
  logs: MedicationLog[];
  hasSeeded: boolean;
  addMedication: (m: Omit<Medication, 'id' | 'createdAt'>) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  deleteMedication: (id: string) => void;
  logDose: (medicationId: string, memberId: string, taken: boolean) => void;
  seedDemoData: () => void;
}

export const useMedicationStore = create<MedicationState>()(
  persist(
    (set) => ({
  medications: [],
  logs: [],
  hasSeeded: false,
  addMedication: (m) => set((s) => ({ medications: [{ ...m, id: generateId(), createdAt: new Date().toISOString() }, ...s.medications] })),
  updateMedication: (id, updates) => set((s) => ({ medications: s.medications.map((m) => m.id === id ? { ...m, ...updates } : m) })),
  deleteMedication: (id) => set((s) => ({ medications: s.medications.filter((m) => m.id !== id) })),
  logDose: (medicationId, memberId, doseTaken) => set((s) => ({ logs: [{ id: generateId(), medicationId, memberId, takenAt: new Date().toISOString(), doseTaken }, ...s.logs] })),
  seedDemoData: () => {
    const now = new Date().toISOString();
    const refill1 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const refill2 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const medications: Medication[] = [
      { id: 'med1', familyId: 'demo-family', memberId: 'member-1', name: 'Lisinopril', dosage: '10mg', frequency: 'daily', instructions: 'Take in the morning with water', prescribedBy: 'Dr. Martinez', pharmacy: 'CVS Pharmacy', refillDate: refill1, startDate: now, isActive: true, color: '#2980B9', pillsRemaining: 28, createdAt: now },
      { id: 'med2', familyId: 'demo-family', memberId: 'member-2', name: 'Vitamin D3', dosage: '2000 IU', frequency: 'daily', instructions: 'Take with fatty meal', startDate: now, isActive: true, color: '#F5A623', pillsRemaining: 60, createdAt: now },
      { id: 'med3', familyId: 'demo-family', memberId: 'member-3', name: 'Amoxicillin', dosage: '250mg', frequency: 'twice_daily', instructions: 'Take until course complete', prescribedBy: 'Dr. Kim', startDate: now, endDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0], isActive: true, color: '#E74C3C', pillsRemaining: 18, refillDate: refill2, createdAt: now },
      { id: 'med4', familyId: 'demo-family', memberId: 'member-4', name: "Children's Zyrtec", dosage: '5mg', frequency: 'daily', instructions: 'Take at bedtime for allergies', startDate: now, isActive: true, color: '#8E44AD', pillsRemaining: 45, createdAt: now },
    ];
    set({ medications, logs: [], hasSeeded: true });
  },
    }),
    {
      name: 'family-command-center-medication',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
