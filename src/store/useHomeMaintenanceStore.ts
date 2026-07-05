import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as homeMaintenanceService from '../services/homeMaintenanceService';

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
  isLoaded: boolean;
  addTask: (t: Omit<MaintenanceTask, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<MaintenanceTask>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  fetchFromServer: () => Promise<void>;
}

export const useHomeMaintenanceStore = create<HomeMaintenanceState>()(
  persist(
    (set, get) => ({
  tasks: [],
  isLoaded: false,
  addTask: async (t) => {
    const newTask = { ...t, id: generateId(), createdAt: new Date().toISOString() };
    set((s) => ({ tasks: [newTask, ...s.tasks] }));
    try {
      await homeMaintenanceService.createTask(newTask);
    } catch {
      set((s) => ({ tasks: s.tasks.filter((x) => x.id !== newTask.id) }));
    }
  },
  updateTask: (id, updates) => {
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t) }));
    homeMaintenanceService.updateTaskRemote(id, updates).catch(() => {});
  },
  deleteTask: (id) => {
    const prev = get().tasks;
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    homeMaintenanceService.deleteTaskRemote(id).catch(() => { set({ tasks: prev }); });
  },
  completeTask: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const completedDate = new Date().toISOString();
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, status: 'done' as MaintenanceStatus, completedDate } : t
      ),
    }));
    homeMaintenanceService.updateTaskRemote(id, { status: 'done', completedDate }).catch(() => {});

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
      const nextDueDate = nextDate.toISOString().split('T')[0];
      const nextTask: MaintenanceTask = {
        ...task,
        id: generateId(),
        status: 'pending',
        completedDate: undefined,
        dueDate: nextDueDate,
        createdAt: new Date().toISOString(),
      };
      set((s) => ({ tasks: [...s.tasks, nextTask] }));
      homeMaintenanceService.completeRecurringRemote(id, { id: nextTask.id, dueDate: nextDueDate }).catch(() => {});
    }
  },
  fetchFromServer: async () => {
    try {
      const { tasks } = await homeMaintenanceService.fetchTasks();
      set({ tasks, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },
    }),
    {
      name: 'family-command-center-home-maintenance',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
