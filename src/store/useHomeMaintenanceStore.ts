import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type MaintenanceCategory = 'plumbing' | 'electrical' | 'hvac' | 'appliances' | 'exterior' | 'lawn' | 'cleaning' | 'painting' | 'flooring' | 'other';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';
export type MaintenanceStatus = 'pending' | 'in_progress' | 'done' | 'scheduled';

export interface MaintenanceTask {
  id: string;
  familyId: string;
  title: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  dueDate?: string;
  completedDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  contractor?: string;
  notes?: string;
  isRecurring: boolean;
  recurringInterval?: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  createdAt: string;
}

interface HomeMaintenanceState {
  tasks: MaintenanceTask[];
  addTask: (t: Omit<MaintenanceTask, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, updates: Partial<MaintenanceTask>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  seedDemoData: () => void;
}

export const useHomeMaintenanceStore = create<HomeMaintenanceState>((set) => ({
  tasks: [],
  addTask: (t) => set((s) => ({ tasks: [{ ...t, id: generateId(), createdAt: new Date().toISOString() }, ...s.tasks] })),
  updateTask: (id, updates) => set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t) })),
  deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  completeTask: (id) => set((s) => {
    const task = s.tasks.find((t) => t.id === id);
    if (!task) return s;
    const updatedTasks = s.tasks.map((t) =>
      t.id === id ? { ...t, status: 'done' as MaintenanceStatus, completedDate: new Date().toISOString() } : t
    );
    // Auto-spawn next occurrence for recurring tasks
    if (task.isRecurring && task.recurringInterval && task.dueDate) {
      const intervalDays: Record<string, number> = {
        monthly: 30,
        quarterly: 90,
        biannual: 182,
        annual: 365,
      };
      const days = intervalDays[task.recurringInterval] ?? 90;
      const nextDate = new Date(task.dueDate);
      nextDate.setDate(nextDate.getDate() + days);
      const nextTask: MaintenanceTask = {
        ...task,
        id: generateId(),
        status: 'pending',
        completedDate: undefined,
        dueDate: nextDate.toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };
      return { tasks: [...updatedTasks, nextTask] };
    }
    return { tasks: updatedTasks };
  }),
  seedDemoData: () => {
    const now = new Date().toISOString();
    const soon = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const tasks: MaintenanceTask[] = [
      { id: 'mt1', familyId: 'demo-family', title: 'Replace HVAC filter', category: 'hvac', priority: 'high', status: 'pending', dueDate: soon, estimatedCost: 25, isRecurring: true, recurringInterval: 'quarterly', notes: 'Use 16x25x1 MERV 11 filter', createdAt: now },
      { id: 'mt2', familyId: 'demo-family', title: 'Fix leaking kitchen faucet', category: 'plumbing', priority: 'urgent', status: 'in_progress', estimatedCost: 200, contractor: "Bob's Plumbing (555-0199)", isRecurring: false, createdAt: now },
      { id: 'mt3', familyId: 'demo-family', title: 'Paint living room', category: 'painting', priority: 'low', status: 'scheduled', dueDate: nextMonth, estimatedCost: 350, notes: 'Sherwin-Williams Repose Gray SW 7015', isRecurring: false, createdAt: now },
      { id: 'mt4', familyId: 'demo-family', title: 'Gutter cleaning', category: 'exterior', priority: 'medium', status: 'pending', dueDate: nextMonth, estimatedCost: 150, isRecurring: true, recurringInterval: 'biannual', createdAt: now },
      { id: 'mt5', familyId: 'demo-family', title: 'Lawn fertilization', category: 'lawn', priority: 'low', status: 'done', completedDate: now, actualCost: 80, isRecurring: true, recurringInterval: 'quarterly', createdAt: now },
      { id: 'mt6', familyId: 'demo-family', title: 'Test smoke detectors', category: 'electrical', priority: 'high', status: 'pending', isRecurring: true, recurringInterval: 'biannual', estimatedCost: 0, createdAt: now },
    ];
    set({ tasks });
  },
}));
