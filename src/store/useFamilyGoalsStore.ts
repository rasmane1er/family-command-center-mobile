import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as familyGoalsService from '../services/familyGoalsService';

import { generateId } from '../utils/generateId';

export type GoalCategory = 'health' | 'finance' | 'education' | 'travel' | 'home' | 'relationships' | 'career' | 'fun' | 'other';

export interface GoalMilestone {
  id: string;
  text: string;
  isDone: boolean;
}

export interface FamilyGoal {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  category: GoalCategory;
  targetDate?: string;
  progress: number;
  milestones: GoalMilestone[];
  membersInvolved: string[];
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  color: string;
  icon: string;
  createdAt: string;
}

interface FamilyGoalsState {
  goals: FamilyGoal[];
  isLoaded: boolean;
  addGoal: (g: Omit<FamilyGoal, 'id' | 'createdAt'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<FamilyGoal>) => void;
  deleteGoal: (id: string) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  completeGoal: (id: string) => void;
  fetchFromServer: (familyId: string) => Promise<void>;
}

export const useFamilyGoalsStore = create<FamilyGoalsState>()(
  persist(
    (set, get) => ({
      goals: [],
      isLoaded: false,

      fetchFromServer: async () => {
        try {
          const { goals } = await familyGoalsService.fetchGoals();
          set({ goals, isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },

      addGoal: async (g) => {
        const newGoal: FamilyGoal = { ...g, id: generateId(), createdAt: new Date().toISOString() };
        set((s) => ({ goals: [newGoal, ...s.goals] }));
        try {
          await familyGoalsService.createGoal(newGoal);
        } catch {
          set((s) => ({ goals: s.goals.filter((x) => x.id !== newGoal.id) }));
        }
      },

      updateGoal: (id, updates) => {
        set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, ...updates } : g) }));
        familyGoalsService.updateGoalRemote(id, updates).catch(() => {});
      },

      deleteGoal: (id) => {
        const prev = get().goals;
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
        familyGoalsService.deleteGoalRemote(id).catch(() => { set({ goals: prev }); });
      },

      toggleMilestone: (goalId, milestoneId) => {
        set((s) => ({
          goals: s.goals.map((g) => {
            if (g.id !== goalId) return g;
            const milestones = g.milestones.map((m) => m.id === milestoneId ? { ...m, isDone: !m.isDone } : m);
            const progress = milestones.length > 0 ? Math.round((milestones.filter((m) => m.isDone).length / milestones.length) * 100) : g.progress;
            return { ...g, milestones, progress };
          }),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) familyGoalsService.updateGoalRemote(goalId, { milestones: goal.milestones, progress: goal.progress }).catch(() => {});
      },

      completeGoal: (id) => {
        set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, isCompleted: true, progress: 100 } : g) }));
        familyGoalsService.updateGoalRemote(id, { isCompleted: true, progress: 100 }).catch(() => {});
      },
    }),
    {
      name: 'family-goals-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ goals: state.goals, isLoaded: state.isLoaded }),
    }
  )
);
