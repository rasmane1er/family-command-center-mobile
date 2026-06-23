import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

type CarpoolStatus = 'active' | 'paused' | 'completed';

interface CarpoolParticipant {
  name: string;
  familyMemberId?: string;
  phone?: string;
  address?: string;
}

interface CarpoolDriver {
  week: string; // "2026-W26" ISO week
  driverName: string;
  familyMemberId?: string;
  completed: boolean;
}

interface CarpoolRoute {
  id: string;
  familyId: string;
  name: string;
  destination: string;
  pickupTime: string;
  returnTime?: string;
  daysOfWeek: string[];
  participants: CarpoolParticipant[];
  rotation: CarpoolDriver[];
  currentDriverIndex: number;
  status: CarpoolStatus;
  notes?: string;
  color: string;
}

interface CarpoolState {
  routes: CarpoolRoute[];
  addRoute: (r: Omit<CarpoolRoute, 'id' | 'currentDriverIndex'>) => void;
  advanceDriver: (routeId: string) => void;
  deleteRoute: (id: string) => void;
  addParticipant: (routeId: string, p: CarpoolParticipant) => void;
  seedDemoData: () => void;
}

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getWeekOffset(baseDate: Date, offsetWeeks: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetWeeks * 7);
  return getISOWeek(d);
}

export const useCarpoolStore = create<CarpoolState>((set, get) => ({
  routes: [],

  addRoute: (r) =>
    set((s) => ({
      routes: [...s.routes, { ...r, id: generateId(), currentDriverIndex: 0 }],
    })),

  advanceDriver: (routeId) =>
    set((s) => ({
      routes: s.routes.map((r) => {
        if (r.id !== routeId) return r;
        const updatedRotation = r.rotation.map((d, i) =>
          i === r.currentDriverIndex ? { ...d, completed: true } : d
        );
        const nextIndex = (r.currentDriverIndex + 1) % r.rotation.length;
        return { ...r, rotation: updatedRotation, currentDriverIndex: nextIndex };
      }),
    })),

  deleteRoute: (id) =>
    set((s) => ({ routes: s.routes.filter((r) => r.id !== id) })),

  addParticipant: (routeId, p) =>
    set((s) => ({
      routes: s.routes.map((r) =>
        r.id === routeId ? { ...r, participants: [...r.participants, p] } : r
      ),
    })),

  seedDemoData: () => {
    const familyId = 'demo-family';
    const today = new Date();

    // Build 4 past + 2 future weeks for route 1
    const drivers1 = ['Marcus Johnson', 'John Smith', 'Maria Garcia', 'Marcus Johnson', 'John Smith', 'Maria Garcia'];
    const memberIds1 = ['member-1', undefined, undefined, 'member-1', undefined, undefined];
    const rotation1: CarpoolDriver[] = drivers1.map((name, i) => ({
      week: getWeekOffset(today, i - 4),
      driverName: name,
      familyMemberId: memberIds1[i],
      completed: i < 4,
    }));

    // Build 2 past + 2 future weeks for route 2
    const drivers2 = ['Sarah Johnson', 'Coach Davis', 'Sarah Johnson', 'Coach Davis'];
    const memberIds2 = ['member-2', undefined, 'member-2', undefined];
    const rotation2: CarpoolDriver[] = drivers2.map((name, i) => ({
      week: getWeekOffset(today, i - 2),
      driverName: name,
      familyMemberId: memberIds2[i],
      completed: i < 2,
    }));

    const routes: CarpoolRoute[] = [
      {
        id: generateId(),
        familyId,
        name: 'School Morning Run',
        destination: 'Lincoln Elementary',
        pickupTime: '7:45 AM',
        returnTime: '3:20 PM',
        daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        participants: [
          { name: 'Johnson Family (Marcus)', familyMemberId: 'member-1' },
          { name: 'Smith Family (John)', phone: '555-1234', address: '142 Oak St' },
          { name: 'Garcia Family (Maria)', phone: '555-5678' },
        ],
        rotation: rotation1,
        currentDriverIndex: 4,
        status: 'active',
        color: '#1565C0',
        notes: 'Meet at Lincoln Ave entrance. Kids should be ready by 7:40am.',
      },
      {
        id: generateId(),
        familyId,
        name: 'Soccer Practice',
        destination: 'Riverside Park',
        pickupTime: '3:30 PM',
        daysOfWeek: ['Tue', 'Thu'],
        participants: [
          { name: 'Johnson (Sarah)', familyMemberId: 'member-2' },
          { name: 'Davis Family (Coach Davis)', phone: '555-9012' },
        ],
        rotation: rotation2,
        currentDriverIndex: 2,
        status: 'active',
        color: '#27AE60',
        notes: 'Practice ends at 5pm. Bring water and snacks.',
      },
    ];

    set({ routes });
  },
}));

export type { CarpoolRoute, CarpoolParticipant, CarpoolDriver, CarpoolStatus };
