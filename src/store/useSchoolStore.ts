import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

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

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useSchoolStore = create<SchoolState>()(
  persist(
    (set, get) => ({
      subjects: [],
      assignments: [],
      isLoaded: false,

      addSubject: (s) => set((state) => ({ subjects: [...state.subjects, s] })),
      deleteSubject: (id) =>
        set((state) => {
          const target = state.subjects.find((s) => s.id === id);
          return {
            subjects: state.subjects.filter((s) => s.id !== id),
            assignments: target
              ? state.assignments.filter((a) => !(a.memberId === target.memberId && a.subject === target.name))
              : state.assignments,
          };
        }),
      addGradeEntry: (subjectId, grade) =>
        set((state) => ({
          subjects: state.subjects.map((s) =>
            s.id === subjectId
              ? { ...s, gradeEntries: [...s.gradeEntries, { ...grade, id: generateId() }] }
              : s
          ),
        })),
      deleteGradeEntry: (subjectId, gradeId) =>
        set((state) => ({
          subjects: state.subjects.map((s) =>
            s.id === subjectId
              ? { ...s, gradeEntries: s.gradeEntries.filter((g) => g.id !== gradeId) }
              : s
          ),
        })),
      addAssignment: (a) => set((state) => ({ assignments: [a, ...state.assignments] })),
      updateAssignment: (id, updates) =>
        set((state) => ({
          assignments: state.assignments.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),
      toggleAssignmentComplete: (id) =>
        set((state) => ({
          assignments: state.assignments.map((a) =>
            a.id === id
              ? { ...a, status: a.status === 'completed' ? 'in_progress' : 'completed' }
              : a
          ),
        })),
      deleteAssignment: (id) =>
        set((state) => ({ assignments: state.assignments.filter((a) => a.id !== id) })),

      fetchFromServer: async () => { set({ isLoaded: true }); },
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
