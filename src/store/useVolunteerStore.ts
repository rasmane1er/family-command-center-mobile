import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type VolunteerCause =
  | 'education'
  | 'environment'
  | 'animals'
  | 'elderly'
  | 'food-bank'
  | 'religious'
  | 'sports-coaching'
  | 'community'
  | 'health'
  | 'arts'
  | 'other';

export interface VolunteerLog {
  id: string;
  memberId: string;
  memberName: string;
  organizationName: string;
  cause: VolunteerCause;
  date: string;
  hours: number;
  description: string;
  supervisor: string;
  verified: boolean;
  createdAt: string;
}

export interface VolunteerGoal {
  memberId: string;
  memberName: string;
  yearlyHoursGoal: number;
  year: number;
}

interface VolunteerState {
  logs: VolunteerLog[];
  goals: VolunteerGoal[];
  addLog: (log: Omit<VolunteerLog, 'id' | 'createdAt'>) => void;
  verifyLog: (id: string) => void;
  removeLog: (id: string) => void;
  setGoal: (goal: VolunteerGoal) => void;
  getLogsForMember: (memberId: string) => VolunteerLog[];
  getTotalHours: (memberId: string, year: number) => number;
  getHoursByOrg: (memberId: string) => Record<string, number>;
  getAllTimeHours: (memberId: string) => number;
}

const NOW = new Date().toISOString();

const SEED_LOGS: VolunteerLog[] = [
  {
    id: 'vl1',
    memberId: 'mom',
    memberName: 'Mom',
    organizationName: 'City Food Bank',
    cause: 'food-bank',
    date: '2026-01-15',
    hours: 4,
    description: 'Sorted and packaged food donations',
    supervisor: 'Maria Garcia',
    verified: true,
    createdAt: NOW,
  },
  {
    id: 'vl2',
    memberId: 'mom',
    memberName: 'Mom',
    organizationName: 'Oakwood Animal Shelter',
    cause: 'animals',
    date: '2026-03-22',
    hours: 3,
    description: 'Dog walking and socialization',
    supervisor: 'Dr. Kim',
    verified: true,
    createdAt: NOW,
  },
  {
    id: 'vl3',
    memberId: 'mom',
    memberName: 'Mom',
    organizationName: 'City Food Bank',
    cause: 'food-bank',
    date: '2026-06-10',
    hours: 5,
    description: 'Helped distribute food at mobile pantry event',
    supervisor: 'Maria Garcia',
    verified: false,
    createdAt: NOW,
  },
  {
    id: 'vl4',
    memberId: 'dad',
    memberName: 'Dad',
    organizationName: 'Jefferson Elementary School',
    cause: 'education',
    date: '2026-02-05',
    hours: 2,
    description: 'Math tutoring for 4th graders after school',
    supervisor: 'Ms. Thompson',
    verified: true,
    createdAt: NOW,
  },
  {
    id: 'vl5',
    memberId: 'dad',
    memberName: 'Dad',
    organizationName: 'Neighborhood Cleanup Coalition',
    cause: 'community',
    date: '2026-04-19',
    hours: 6,
    description: 'Spring neighborhood cleanup and beautification day',
    supervisor: 'Tony Rodriguez',
    verified: true,
    createdAt: NOW,
  },
  {
    id: 'vl6',
    memberId: 'dad',
    memberName: 'Dad',
    organizationName: 'Jefferson Elementary School',
    cause: 'education',
    date: '2026-07-12',
    hours: 3,
    description: 'Summer reading program volunteer',
    supervisor: 'Ms. Thompson',
    verified: false,
    createdAt: NOW,
  },
  {
    id: 'vl7',
    memberId: 'emma',
    memberName: 'Emma',
    organizationName: 'Oakwood Animal Shelter',
    cause: 'animals',
    date: '2026-05-08',
    hours: 4,
    description: 'Kitten socialization and care',
    supervisor: 'Dr. Kim',
    verified: true,
    createdAt: NOW,
  },
  {
    id: 'vl8',
    memberId: 'emma',
    memberName: 'Emma',
    organizationName: 'Youth Soccer League',
    cause: 'sports-coaching',
    date: '2026-06-30',
    hours: 8,
    description: 'Assistant coach for U10 soccer team (seasonal)',
    supervisor: 'Coach Dave',
    verified: true,
    createdAt: NOW,
  },
];

const SEED_GOALS: VolunteerGoal[] = [
  { memberId: 'mom', memberName: 'Mom', yearlyHoursGoal: 50, year: 2026 },
  { memberId: 'dad', memberName: 'Dad', yearlyHoursGoal: 40, year: 2026 },
  { memberId: 'emma', memberName: 'Emma', yearlyHoursGoal: 30, year: 2026 },
];

export const useVolunteerStore = create<VolunteerState>()((set, get) => ({
  logs: SEED_LOGS,
  goals: SEED_GOALS,

  addLog: (log) =>
    set((s) => ({
      logs: [{ ...log, id: generateId(), createdAt: new Date().toISOString() }, ...s.logs],
    })),

  verifyLog: (id) =>
    set((s) => ({ logs: s.logs.map((l) => (l.id === id ? { ...l, verified: true } : l)) })),

  removeLog: (id) =>
    set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),

  setGoal: (goal) =>
    set((s) => {
      const exists = s.goals.find(
        (g) => g.memberId === goal.memberId && g.year === goal.year,
      );
      return {
        goals: exists
          ? s.goals.map((g) =>
              g.memberId === goal.memberId && g.year === goal.year ? goal : g,
            )
          : [...s.goals, goal],
      };
    }),

  getLogsForMember: (memberId) => get().logs.filter((l) => l.memberId === memberId),

  getTotalHours: (memberId, year) =>
    get()
      .logs.filter(
        (l) => l.memberId === memberId && new Date(l.date).getFullYear() === year,
      )
      .reduce((sum, l) => sum + l.hours, 0),

  getHoursByOrg: (memberId) => {
    const memberLogs = get().logs.filter((l) => l.memberId === memberId);
    return memberLogs.reduce<Record<string, number>>((acc, l) => {
      acc[l.organizationName] = (acc[l.organizationName] ?? 0) + l.hours;
      return acc;
    }, {});
  },

  getAllTimeHours: (memberId) =>
    get()
      .logs.filter((l) => l.memberId === memberId)
      .reduce((sum, l) => sum + l.hours, 0),
}));
