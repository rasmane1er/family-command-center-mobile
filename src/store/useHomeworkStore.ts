import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as homeworkService from '../services/homeworkService';

export type SubjectColor = '#E74C3C' | '#2980B9' | '#27AE60' | '#F5A623' | '#8E44AD' | '#16A085' | '#E67E22' | '#C0392B';
export type AssignmentStatus = 'todo' | 'in_progress' | 'submitted' | 'graded';
export type AssignmentPriority = 'low' | 'medium' | 'high';

export interface Assignment {
  id: string;
  familyId: string;
  memberId: string;
  subject: string;
  subjectColor: SubjectColor;
  title: string;
  description?: string;
  dueDate: string;
  assignedDate: string;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  grade?: number;
  maxGrade?: number;
  notes?: string;
  estimatedMinutes?: number;
}

interface HomeworkState {
  assignments: Assignment[];
  isLoaded: boolean;
  addAssignment: (a: Omit<Assignment, 'id' | 'assignedDate'>) => Promise<void>;
  updateStatus: (id: string, status: AssignmentStatus) => void;
  setGrade: (id: string, grade: number) => void;
  deleteAssignment: (id: string) => void;
  getGPAForMember: (memberId: string) => number;
  getOverdueCount: (memberId: string) => number;
  fetchFromServer: (familyId?: string) => Promise<void>;
}

import { generateId } from '../utils/generateId';

export const useHomeworkStore = create<HomeworkState>()(
  persist(
    (set, get) => ({
      assignments: [],
      isLoaded: false,

      addAssignment: async (a) => {
        const newAssignment: Assignment = {
          ...a,
          id: generateId(),
          assignedDate: new Date().toISOString().split('T')[0],
        };
        set((s) => ({ assignments: [...s.assignments, newAssignment] }));
        try {
          await homeworkService.createAssignment(newAssignment);
        } catch {
          set((s) => ({ assignments: s.assignments.filter((x) => x.id !== newAssignment.id) }));
        }
      },

      updateStatus: (id, status) => {
        set((s) => ({
          assignments: s.assignments.map((a) => (a.id === id ? { ...a, status } : a)),
        }));
        homeworkService.updateAssignmentRemote(id, { status }).catch(() => {});
      },

      setGrade: (id, grade) => {
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.id === id ? { ...a, grade, status: 'graded' } : a
          ),
        }));
        homeworkService.updateAssignmentRemote(id, { grade, status: 'graded' }).catch(() => {});
      },

      deleteAssignment: (id) => {
        const prev = get().assignments;
        set((s) => ({ assignments: s.assignments.filter((a) => a.id !== id) }));
        homeworkService.deleteAssignmentRemote(id).catch(() => { set({ assignments: prev }); });
      },

      getGPAForMember: (memberId) => {
        const graded = get().assignments.filter(
          (a) => a.memberId === memberId && a.status === 'graded' && a.grade !== undefined
        );
        if (graded.length === 0) return 0;
        const total = graded.reduce((sum, a) => sum + (a.grade ?? 0), 0);
        return Math.round(total / graded.length);
      },

      getOverdueCount: (memberId) => {
        const today = new Date().toISOString().split('T')[0];
        return get().assignments.filter(
          (a) =>
            a.memberId === memberId &&
            a.status !== 'submitted' &&
            a.status !== 'graded' &&
            a.dueDate < today
        ).length;
      },

      fetchFromServer: async () => {
        try {
          const { assignments } = await homeworkService.fetchAssignments();
          set({ assignments, isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },
    }),
    {
      name: 'family-command-center-homework',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
