import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChoreFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type ChoreCategory = 'kitchen' | 'bathroom' | 'bedroom' | 'living' | 'outdoor' | 'laundry' | 'other';

export interface Chore {
  id: string;
  name: string;
  emoji: string;
  description: string;
  frequency: ChoreFrequency;
  estimatedMinutes: number;
  points: number;
  color: string;
  category: ChoreCategory;
  assignedMemberIds: string[];
  currentAssigneeIndex: number;
  lastCompletedDate?: string;
  lastCompletedBy?: string;
}

interface ChoreStore {
  chores: Chore[];
  addChore: (chore: Omit<Chore, 'id' | 'currentAssigneeIndex'>) => void;
  deleteChore: (id: string) => void;
  completeChore: (choreId: string) => void;
  updateChore: (id: string, updates: Partial<Chore>) => void;
  seedDemoData: () => void;
}

const DEMO_CHORES: Omit<Chore, 'id'>[] = [
  {
    name: 'Wash Dishes', emoji: '🍽️', description: 'Wash, dry and put away all dishes',
    frequency: 'daily', estimatedMinutes: 20, points: 15, color: '#2980B9',
    category: 'kitchen', assignedMemberIds: ['member-1', 'member-2', 'member-3'],
    currentAssigneeIndex: 0, lastCompletedDate: new Date().toISOString().split('T')[0],
  },
  {
    name: 'Vacuum Living Room', emoji: '🧹', description: 'Vacuum carpets and rugs in living room',
    frequency: 'weekly', estimatedMinutes: 25, points: 20, color: '#8E44AD',
    category: 'living', assignedMemberIds: ['member-1', 'member-2'],
    currentAssigneeIndex: 1,
  },
  {
    name: 'Take Out Trash', emoji: '🗑️', description: 'Collect bins and take to curb',
    frequency: 'weekly', estimatedMinutes: 10, points: 10, color: '#E74C3C',
    category: 'other', assignedMemberIds: ['member-2', 'member-3'],
    currentAssigneeIndex: 0, lastCompletedDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
  },
  {
    name: 'Clean Bathroom', emoji: '🚿', description: 'Scrub toilet, sink, and shower',
    frequency: 'weekly', estimatedMinutes: 30, points: 25, color: '#16A085',
    category: 'bathroom', assignedMemberIds: ['member-1', 'member-2', 'member-4'],
    currentAssigneeIndex: 2,
  },
  {
    name: 'Do Laundry', emoji: '👕', description: 'Wash, dry, fold, and put away laundry',
    frequency: 'weekly', estimatedMinutes: 60, points: 30, color: '#D35400',
    category: 'laundry', assignedMemberIds: ['member-1', 'member-2'],
    currentAssigneeIndex: 0,
  },
  {
    name: 'Mow Lawn', emoji: '🌿', description: 'Mow front and back yard',
    frequency: 'biweekly', estimatedMinutes: 45, points: 35, color: '#27AE60',
    category: 'outdoor', assignedMemberIds: ['member-2', 'member-3'],
    currentAssigneeIndex: 0, lastCompletedDate: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
  },
  {
    name: 'Wipe Kitchen Counters', emoji: '✨', description: 'Disinfect all kitchen surfaces',
    frequency: 'daily', estimatedMinutes: 10, points: 10, color: '#F39C12',
    category: 'kitchen', assignedMemberIds: ['member-1', 'member-3', 'member-4'],
    currentAssigneeIndex: 1,
  },
  {
    name: 'Clean Bedroom', emoji: '🛏️', description: 'Make bed, vacuum, put things away',
    frequency: 'weekly', estimatedMinutes: 20, points: 15, color: '#E91E63',
    category: 'bedroom', assignedMemberIds: ['member-3', 'member-4'],
    currentAssigneeIndex: 0,
  },
];

export const useChoreStore = create<ChoreStore>()(
  persist(
    (set) => ({
      chores: [],

      addChore: (chore) => set((s) => ({
        chores: [...s.chores, { ...chore, id: `chore-${Date.now()}`, currentAssigneeIndex: 0 }],
      })),

      deleteChore: (id) => set((s) => ({ chores: s.chores.filter((c) => c.id !== id) })),

      completeChore: (choreId) => set((s) => ({
        chores: s.chores.map((c) =>
          c.id === choreId
            ? {
                ...c,
                lastCompletedDate: new Date().toISOString().split('T')[0],
                lastCompletedBy: c.assignedMemberIds[c.currentAssigneeIndex],
                currentAssigneeIndex: (c.currentAssigneeIndex + 1) % c.assignedMemberIds.length,
              }
            : c
        ),
      })),

      updateChore: (id, updates) => set((s) => ({
        chores: s.chores.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      })),

      seedDemoData: () => set((s) => {
        if (s.chores.length > 0) return s;
        return { chores: DEMO_CHORES.map((c, i) => ({ ...c, id: `chore-${i + 1}` })) };
      }),
    }),
    { name: 'chore-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
