import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import { useFamilyStore } from './useFamilyStore';

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
  hasSeeded: boolean;

  addSubject: (s: SchoolSubject) => void;
  deleteSubject: (id: string) => void;
  addGradeEntry: (subjectId: string, grade: Omit<GradeEntry, 'id'>) => void;
  deleteGradeEntry: (subjectId: string, gradeId: string) => void;
  addAssignment: (a: SchoolAssignment) => void;
  updateAssignment: (id: string, updates: Partial<SchoolAssignment>) => void;
  toggleAssignmentComplete: (id: string) => void;
  deleteAssignment: (id: string) => void;
  seedDemoData: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const makeGrade = (type: GradeType, score: number, daysAgo: number, notes?: string): GradeEntry => ({
  id: generateId(),
  type,
  score,
  maxScore: 100,
  date: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  notes,
});

export const useSchoolStore = create<SchoolState>()(
  persist(
    (set, get) => ({
      subjects: [],
      assignments: [],
      hasSeeded: false,

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

      seedDemoData: () => {
        if (get().hasSeeded) return;
        const familyId = useFamilyStore.getState().family?.id ?? 'demo-family';
        const today = new Date();
        const fmt = (d: Date) => d.toISOString();
        const future = (days: number) => fmt(new Date(today.getTime() + days * 86400000));

        const subjects: SchoolSubject[] = [
          // Aiden (member-3) — 8th grade
          {
            id: generateId(), familyId, memberId: 'member-3', name: 'Mathematics', teacherName: 'Ms. Rodriguez',
            color: '#2980B9', icon: 'calculator',
            gradeEntries: [makeGrade('test', 94, 14), makeGrade('quiz', 88, 7), makeGrade('homework', 100, 3), makeGrade('exam', 92, 21)],
          },
          {
            id: generateId(), familyId, memberId: 'member-3', name: 'Science', teacherName: 'Dr. Patel',
            color: '#27AE60', icon: 'flask',
            gradeEntries: [makeGrade('project', 96, 10), makeGrade('test', 84, 20), makeGrade('quiz', 91, 5)],
          },
          {
            id: generateId(), familyId, memberId: 'member-3', name: 'English', teacherName: 'Mr. Thompson',
            color: '#8E44AD', icon: 'book',
            gradeEntries: [makeGrade('homework', 88, 4), makeGrade('test', 82, 15), makeGrade('project', 90, 8)],
          },
          {
            id: generateId(), familyId, memberId: 'member-3', name: 'History', teacherName: 'Ms. Johnson',
            color: '#E67E22', icon: 'time',
            gradeEntries: [makeGrade('test', 78, 12), makeGrade('homework', 85, 6), makeGrade('quiz', 73, 3)],
          },
          {
            id: generateId(), familyId, memberId: 'member-3', name: 'Computer Science', teacherName: 'Mr. Garcia',
            color: '#16A085', icon: 'laptop',
            gradeEntries: [makeGrade('project', 98, 5), makeGrade('test', 95, 18), makeGrade('homework', 100, 2)],
          },
          {
            id: generateId(), familyId, memberId: 'member-3', name: 'Physical Ed.', teacherName: 'Coach Williams',
            color: '#E74C3C', icon: 'fitness',
            gradeEntries: [makeGrade('homework', 100, 7), makeGrade('test', 98, 14)],
          },
          // Lily (member-4) — 4th grade
          {
            id: generateId(), familyId, memberId: 'member-4', name: 'Mathematics', teacherName: 'Mrs. Kim',
            color: '#2980B9', icon: 'calculator',
            gradeEntries: [makeGrade('test', 96, 8), makeGrade('quiz', 100, 3), makeGrade('homework', 92, 1)],
          },
          {
            id: generateId(), familyId, memberId: 'member-4', name: 'Reading', teacherName: 'Ms. Chen',
            color: '#E91E63', icon: 'book-outline',
            gradeEntries: [makeGrade('test', 90, 10), makeGrade('project', 94, 6), makeGrade('homework', 88, 2)],
          },
          {
            id: generateId(), familyId, memberId: 'member-4', name: 'Art', teacherName: 'Ms. Davis',
            color: '#F5A623', icon: 'color-palette',
            gradeEntries: [makeGrade('project', 100, 5), makeGrade('homework', 98, 2)],
          },
          {
            id: generateId(), familyId, memberId: 'member-4', name: 'Science', teacherName: 'Mr. Lee',
            color: '#27AE60', icon: 'leaf',
            gradeEntries: [makeGrade('test', 88, 9), makeGrade('quiz', 84, 4), makeGrade('project', 92, 12)],
          },
          {
            id: generateId(), familyId, memberId: 'member-4', name: 'Social Studies', teacherName: 'Mrs. Brown',
            color: '#7F8C8D', icon: 'globe',
            gradeEntries: [makeGrade('test', 82, 11), makeGrade('homework', 86, 3)],
          },
        ];

        const assignments: SchoolAssignment[] = [
          // Aiden
          { id: generateId(), familyId, memberId: 'member-3', title: 'Science Project: Solar System Model', subject: 'Science', dueDate: future(1), status: 'in_progress', priority: 'high' },
          { id: generateId(), familyId, memberId: 'member-3', title: 'Math Chapter 9 Problem Set', subject: 'Mathematics', dueDate: future(3), status: 'not_started', priority: 'medium' },
          { id: generateId(), familyId, memberId: 'member-3', title: 'History Essay: Industrial Revolution', subject: 'History', dueDate: future(7), status: 'not_started', priority: 'medium' },
          { id: generateId(), familyId, memberId: 'member-3', title: 'CS App Development Project', subject: 'Computer Science', dueDate: future(10), status: 'in_progress', priority: 'high' },
          { id: generateId(), familyId, memberId: 'member-3', title: "Book Report: The Outsiders", subject: 'English', dueDate: future(-2), status: 'completed', priority: 'high' },
          // Lily
          { id: generateId(), familyId, memberId: 'member-4', title: "Book Report: Charlotte's Web", subject: 'Reading', dueDate: future(2), status: 'in_progress', priority: 'high' },
          { id: generateId(), familyId, memberId: 'member-4', title: 'Math Multiplication Worksheet', subject: 'Mathematics', dueDate: future(1), status: 'completed', priority: 'low' },
          { id: generateId(), familyId, memberId: 'member-4', title: 'Volcano Science Experiment', subject: 'Science', dueDate: future(5), status: 'not_started', priority: 'medium' },
          { id: generateId(), familyId, memberId: 'member-4', title: 'Art: Self Portrait Project', subject: 'Art', dueDate: future(6), status: 'in_progress', priority: 'low' },
          { id: generateId(), familyId, memberId: 'member-4', title: 'Community Helpers Report', subject: 'Social Studies', dueDate: future(9), status: 'not_started', priority: 'low' },
        ];

        set({ subjects, assignments, hasSeeded: true });
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
