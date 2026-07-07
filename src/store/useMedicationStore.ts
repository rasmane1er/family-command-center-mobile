import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import { useAuthStore } from './useAuthStore';
import { pushSyncEvent } from '../api/syncQueue';

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
  isLoaded: boolean;
  addMedication: (m: Omit<Medication, 'id' | 'createdAt'>) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  deleteMedication: (id: string) => void;
  logDose: (medicationId: string, memberId: string, taken: boolean) => void;
  fetchFromServer: () => Promise<void>;
}

export const useMedicationStore = create<MedicationState>()(
  persist(
    (set) => ({
      medications: [],
      logs: [],
      isLoaded: false,
      addMedication: (m) => {
        const med = { ...m, id: generateId(), familyId: useAuthStore.getState().familyId ?? '', createdAt: new Date().toISOString() };
        set((s) => ({ medications: [med, ...s.medications] }));
        pushSyncEvent('activities', 'create', { type: 'medication', ...med });
      },
      updateMedication: (id, updates) => set((s) => ({ medications: s.medications.map((m) => m.id === id ? { ...m, ...updates } : m) })),
      deleteMedication: (id) => {
        set((s) => ({ medications: s.medications.filter((m) => m.id !== id) }));
        pushSyncEvent('activities', 'delete', { type: 'medication', id });
      },
      logDose: (medicationId, memberId, doseTaken) => set((s) => ({ logs: [{ id: generateId(), medicationId, memberId, takenAt: new Date().toISOString(), doseTaken }, ...s.logs] })),
      fetchFromServer: async () => {
        set({ isLoaded: true });
      },
    }),
    {
      name: 'family-command-center-medication',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
