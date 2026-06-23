import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

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
  addGoal: (g: Omit<FamilyGoal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, updates: Partial<FamilyGoal>) => void;
  deleteGoal: (id: string) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  completeGoal: (id: string) => void;
  seedDemoData: () => void;
}

export const useFamilyGoalsStore = create<FamilyGoalsState>((set) => ({
  goals: [],
  addGoal: (g) => set((s) => ({ goals: [{ ...g, id: generateId(), createdAt: new Date().toISOString() }, ...s.goals] })),
  updateGoal: (id, updates) => set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, ...updates } : g) })),
  deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
  toggleMilestone: (goalId, milestoneId) => set((s) => ({
    goals: s.goals.map((g) => {
      if (g.id !== goalId) return g;
      const milestones = g.milestones.map((m) => m.id === milestoneId ? { ...m, isDone: !m.isDone } : m);
      const progress = milestones.length > 0 ? Math.round((milestones.filter((m) => m.isDone).length / milestones.length) * 100) : g.progress;
      return { ...g, milestones, progress };
    }),
  })),
  completeGoal: (id) => set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, isCompleted: true, progress: 100 } : g) })),
  seedDemoData: () => {
    const now = new Date().toISOString();
    const goals: FamilyGoal[] = [
      { id: 'fg1', familyId: 'demo-family', title: 'Hawaii Family Vacation', description: 'A 10-day trip to Maui for the whole family in August', category: 'travel', targetDate: '2024-08-15', progress: 65, milestones: [ { id: 'm1', text: 'Book flights', isDone: true }, { id: 'm2', text: 'Reserve hotel', isDone: true }, { id: 'm3', text: 'Save $5,000 vacation fund', isDone: false }, { id: 'm4', text: 'Plan activities itinerary', isDone: false } ], membersInvolved: ['member-1','member-2','member-3','member-4'], priority: 'high', isCompleted: false, color: '#2980B9', icon: 'airplane', createdAt: now },
      { id: 'fg2', familyId: 'demo-family', title: 'Pay off car loan', description: 'Pay off Marcus\'s car by December', category: 'finance', targetDate: '2024-12-31', progress: 40, milestones: [ { id: 'm5', text: 'Set up auto-pay', isDone: true }, { id: 'm6', text: 'Make extra $500 payment', isDone: false }, { id: 'm7', text: 'Final payoff', isDone: false } ], membersInvolved: ['member-1','member-2'], priority: 'high', isCompleted: false, color: '#27AE60', icon: 'car', createdAt: now },
      { id: 'fg3', familyId: 'demo-family', title: 'Aiden gets B average or above', description: 'Maintain B average across all subjects this year', category: 'education', targetDate: '2024-06-15', progress: 75, milestones: [ { id: 'm8', text: 'B in Math', isDone: true }, { id: 'm9', text: 'B in English', isDone: true }, { id: 'm10', text: 'B in Science', isDone: false }, { id: 'm11', text: 'B in History', isDone: true } ], membersInvolved: ['member-3','member-1','member-2'], priority: 'high', isCompleted: false, color: '#F5A623', icon: 'school', createdAt: now },
      { id: 'fg4', familyId: 'demo-family', title: 'Family runs a 5K together', description: 'Train and complete a 5K as a family by spring', category: 'health', targetDate: '2024-05-01', progress: 30, milestones: [ { id: 'm12', text: 'Sign up for a 5K', isDone: true }, { id: 'm13', text: 'Run 2K without stopping', isDone: false }, { id: 'm14', text: 'Run 5K without stopping', isDone: false } ], membersInvolved: ['member-1','member-2','member-3'], priority: 'medium', isCompleted: false, color: '#E74C3C', icon: 'fitness', createdAt: now },
      { id: 'fg5', familyId: 'demo-family', title: 'Renovate master bathroom', category: 'home', targetDate: '2024-09-30', progress: 10, milestones: [ { id: 'm15', text: 'Get 3 contractor quotes', isDone: true }, { id: 'm16', text: 'Choose contractor', isDone: false }, { id: 'm17', text: 'Select tiles and fixtures', isDone: false }, { id: 'm18', text: 'Complete renovation', isDone: false } ], membersInvolved: ['member-1','member-2'], priority: 'low', isCompleted: false, color: '#8E44AD', icon: 'home', createdAt: now },
    ];
    set({ goals });
  },
}));
