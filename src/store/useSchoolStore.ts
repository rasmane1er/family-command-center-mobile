import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as schoolService from '../services/schoolService';

export type AssignmentStatus = 'not_started' | 'in_progress' | 'completed';
export type AssignmentPriority = 'low' | 'medium' | 'high';
export type GradeType = 'quiz' | 'test' | 'homework' | 'project' | 'exam';

export interface GradeEntry {
  id: string;
  type: GradeType;
  score: number;
  maxScore: number;
  date: string;
  notes?: string;
}

export interface SchoolSubject {
  id: string;
  familyId: string;
  memberId: string;
  name: string;
  teacherName: string;
  color: string;
  icon: string;
  gradeEntries: GradeEntry[];
}

export interface SchoolAssignment {
  id: string;
  familyId: string;
  memberId: string;
  title: string;
  subject: string;
  dueDate: string;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  notes?: string;
}

interface SchoolState {
  subjects: SchoolSubject[];
  assignments: SchoolAssignment[];
  isLoaded: boolean;

  addSubject: (s: SchoolSubject) => void;
  deleteSubject: (id: string) => void;
  addGradeEntry: (subjectId: string, grade: Omit<GradeEntry, 'id'>) => void;
  deleteGradeEntry: (subjectId: string, gradeId: string) => void;
  addAssignment: (a: SchoolAssignment) => void;
  updateAssignment: (id: string, updates: Partial<SchoolAssignment>) => void;
  toggleAssignmentComplete: (id: string) => void;
  deleteAssignment: (id: string) => void;
  fetchFromServer: () => Promise<void>;
}

import { generateId } from '../utils/generateId';

export const useSchoolStore = create<SchoolState>()(
  persist(
    (set, get) => ({
      subjects: [],
      assignments: [],
      isLoaded: false,

      addSubject: (s) => {
        set((state) => ({ subjects: [...state.subjects, s] }));
        schoolService.createSubject(s).catch(() => {
          set((state) => ({ subjects: state.subjects.filter((x) => x.id !== s.id) }));
        });
      },

      deleteSubject: (id) => {
        const prevSubjects = get().subjects;
        set((state) => {
          const target = state.subjects.find((s) => s.id === id);
          return {
            subjects: state.subjects.filter((s) => s.id !== id),
            assignments: target
              ? state.assignments.filter((a) => !(a.memberId === target.memberId && a.subject === target.name))
              : state.assignments,
          };
        });
        schoolService.deleteSubjectRemote(id).catch(() => { set({ subjects: prevSubjects }); });
      },

      addGradeEntry: (subjectId, grade) => {
        const prev = get().subjects;
        const tempId = generateId();
        set((state) => ({
          subjects: state.subjects.map((s) =>
            s.id === subjectId
              ? { ...s, gradeEntries: [...s.gradeEntries, { ...grade, id: tempId }] }
              : s
          ),
        }));
        schoolService.createGradeEntryRemote(subjectId, grade)
          .then(({ gradeEntry }) => {
            set((state) => ({
              subjects: state.subjects.map((s) =>
                s.id === subjectId
                  ? { ...s, gradeEntries: s.gradeEntries.map((g) => (g.id === tempId ? gradeEntry : g)) }
                  : s
              ),
            }));
          })
          .catch(() => { set({ subjects: prev }); });
      },

      deleteGradeEntry: (subjectId, gradeId) => {
        const prev = get().subjects;
        set((state) => ({
          subjects: state.subjects.map((s) =>
            s.id === subjectId
              ? { ...s, gradeEntries: s.gradeEntries.filter((g) => g.id !== gradeId) }
              : s
          ),
        }));
        schoolService.deleteGradeEntryRemote(subjectId, gradeId).catch(() => { set({ subjects: prev }); });
      },

      addAssignment: (a) => {
        set((state) => ({ assignments: [a, ...state.assignments] }));
        schoolService.createAssignment(a).catch(() => {
          set((state) => ({ assignments: state.assignments.filter((x) => x.id !== a.id) }));
        });
      },

      updateAssignment: (id, updates) => {
        const prev = get().assignments;
        set((state) => ({
          assignments: state.assignments.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        }));
        schoolService.updateAssignmentRemote(id, updates).catch(() => { set({ assignments: prev }); });
      },

      toggleAssignmentComplete: (id) => {
        const prev = get().assignments;
        const current = prev.find((a) => a.id === id);
        if (!current) return;
        const newStatus: AssignmentStatus = current.status === 'completed' ? 'in_progress' : 'completed';
        set((state) => ({
          assignments: state.assignments.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
        }));
        schoolService.updateAssignmentRemote(id, { status: newStatus }).catch(() => { set({ assignments: prev }); });
      },

      deleteAssignment: (id) => {
        const prev = get().assignments;
        set((state) => ({ assignments: state.assignments.filter((a) => a.id !== id) }));
        schoolService.deleteAssignmentRemote(id).catch(() => { set({ assignments: prev }); });
      },

      fetchFromServer: async () => {
        try {
          const [{ subjects }, { assignments }] = await Promise.all([
            schoolService.fetchSubjects(),
            schoolService.fetchAssignments(),
          ]);
          set({ subjects, assignments, isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },
    }),
    { name: 'school-store', storage: createJSONStorage(() => mmkvStorage) }
  )
);

export function computeGPA(subjects: SchoolSubject[]): number {
  if (subjects.length === 0) return 0;
  const avg = subjects.reduce((sum, s) => {
    const avg = s.gradeEntries.length === 0
      ? 0
      : s.gradeEntries.reduce((a, g) => a + (g.score / g.maxScore) * 100, 0) / s.gradeEntries.length;
    return sum + avg;
  }, 0) / subjects.length;
  return (avg / 100) * 4;
}

export function computeAverage(subject: SchoolSubject): number {
  if (subject.gradeEntries.length === 0) return 0;
  return subject.gradeEntries.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / subject.gradeEntries.length;
}

export function scoreToLetter(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}
