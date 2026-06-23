import { create } from 'zustand';

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
  dueDate: string; // ISO date YYYY-MM-DD
  assignedDate: string;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  grade?: number; // 0-100
  maxGrade?: number; // default 100
  notes?: string;
  estimatedMinutes?: number;
}

interface HomeworkState {
  assignments: Assignment[];
  addAssignment: (a: Omit<Assignment, 'id' | 'assignedDate'>) => void;
  updateStatus: (id: string, status: AssignmentStatus) => void;
  setGrade: (id: string, grade: number) => void;
  deleteAssignment: (id: string) => void;
  getGPAForMember: (memberId: string) => number;
  getOverdueCount: (memberId: string) => number;
  seedDemoData: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useHomeworkStore = create<HomeworkState>((set, get) => ({
  assignments: [],

  addAssignment: (a) =>
    set((s) => ({
      assignments: [
        ...s.assignments,
        { ...a, id: generateId(), assignedDate: new Date().toISOString().split('T')[0] },
      ],
    })),

  updateStatus: (id, status) =>
    set((s) => ({
      assignments: s.assignments.map((a) => (a.id === id ? { ...a, status } : a)),
    })),

  setGrade: (id, grade) =>
    set((s) => ({
      assignments: s.assignments.map((a) =>
        a.id === id ? { ...a, grade, status: 'graded' } : a
      ),
    })),

  deleteAssignment: (id) =>
    set((s) => ({ assignments: s.assignments.filter((a) => a.id !== id) })),

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

  seedDemoData: () => {
    const today = new Date().toISOString().split('T')[0];
    const dayOffset = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return d.toISOString().split('T')[0];
    };
    const familyId = 'demo-family';

    const assignments: Assignment[] = [
      {
        id: generateId(),
        familyId,
        memberId: 'member-3',
        subject: 'Math',
        subjectColor: '#2980B9',
        title: 'Algebra Chapter 5 Worksheet',
        description: 'Complete problems 1-30 on quadratic equations',
        dueDate: dayOffset(-2),
        assignedDate: dayOffset(-7),
        status: 'todo',
        priority: 'high',
        estimatedMinutes: 45,
      },
      {
        id: generateId(),
        familyId,
        memberId: 'member-3',
        subject: 'Science',
        subjectColor: '#27AE60',
        title: 'Ecosystem Research Paper',
        description: 'Write a 3-page paper on ocean ecosystems',
        dueDate: dayOffset(-1),
        assignedDate: dayOffset(-10),
        status: 'in_progress',
        priority: 'high',
        estimatedMinutes: 120,
      },
      {
        id: generateId(),
        familyId,
        memberId: 'member-3',
        subject: 'English',
        subjectColor: '#E74C3C',
        title: 'Book Report: Charlotte\'s Web',
        description: 'Summarize themes and characters',
        dueDate: dayOffset(2),
        assignedDate: dayOffset(-5),
        status: 'in_progress',
        priority: 'medium',
        estimatedMinutes: 60,
      },
      {
        id: generateId(),
        familyId,
        memberId: 'member-3',
        subject: 'History',
        subjectColor: '#F5A623',
        title: 'American Revolution Timeline',
        description: 'Create a visual timeline of key events 1765-1783',
        dueDate: dayOffset(4),
        assignedDate: dayOffset(-3),
        status: 'todo',
        priority: 'medium',
        estimatedMinutes: 90,
      },
      {
        id: generateId(),
        familyId,
        memberId: 'member-3',
        subject: 'Math',
        subjectColor: '#2980B9',
        title: 'Geometry Test',
        description: 'Chapter 3 test on triangles and angles',
        dueDate: dayOffset(-14),
        assignedDate: dayOffset(-21),
        status: 'graded',
        priority: 'high',
        grade: 92,
        maxGrade: 100,
      },
      {
        id: generateId(),
        familyId,
        memberId: 'member-4',
        subject: 'Math',
        subjectColor: '#2980B9',
        title: 'Multiplication Table Practice',
        description: 'Practice times tables 1-12',
        dueDate: dayOffset(1),
        assignedDate: today,
        status: 'todo',
        priority: 'low',
        estimatedMinutes: 20,
      },
      {
        id: generateId(),
        familyId,
        memberId: 'member-4',
        subject: 'Art',
        subjectColor: '#8E44AD',
        title: 'Self Portrait Drawing',
        description: 'Draw a self portrait using pencil and shading techniques',
        dueDate: dayOffset(3),
        assignedDate: dayOffset(-2),
        status: 'in_progress',
        priority: 'medium',
        estimatedMinutes: 60,
      },
      {
        id: generateId(),
        familyId,
        memberId: 'member-4',
        subject: 'English',
        subjectColor: '#E74C3C',
        title: 'Spelling Test Prep',
        description: 'Study 20 vocabulary words for Friday test',
        dueDate: dayOffset(-2),
        assignedDate: dayOffset(-7),
        status: 'todo',
        priority: 'high',
        estimatedMinutes: 30,
      },
      {
        id: generateId(),
        familyId,
        memberId: 'member-4',
        subject: 'Science',
        subjectColor: '#27AE60',
        title: 'Plant Growth Experiment',
        description: 'Observe and record plant growth for 2 weeks',
        dueDate: dayOffset(5),
        assignedDate: dayOffset(-8),
        status: 'submitted',
        priority: 'medium',
        estimatedMinutes: 15,
      },
      {
        id: generateId(),
        familyId,
        memberId: 'member-4',
        subject: 'History',
        subjectColor: '#F5A623',
        title: 'Community Helpers Poster',
        description: 'Create a poster about community helpers in our town',
        dueDate: dayOffset(-10),
        assignedDate: dayOffset(-18),
        status: 'graded',
        priority: 'low',
        grade: 85,
        maxGrade: 100,
      },
    ];

    set({ assignments });
  },
}));
