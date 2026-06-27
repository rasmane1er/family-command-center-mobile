import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Family, FamilyMember, Task, CalendarEvent, Goal, Reward, Achievement } from '../types';
import { colors } from '../theme/colors';

interface FamilyState {
  family: Family | null;
  members: FamilyMember[];
  tasks: Task[];
  events: CalendarEvent[];
  goals: Goal[];
  rewards: Reward[];
  achievements: Achievement[];
  activeMemberId: string | null;

  setFamily: (f: Family) => void;
  addMember: (m: FamilyMember) => void;
  updateMember: (id: string, updates: Partial<FamilyMember>) => void;
  removeMember: (id: string) => void;
  setActiveMember: (id: string | null) => void;

  addTask: (t: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  completeTask: (id: string, memberId: string) => void;
  deleteTask: (id: string) => void;

  addEvent: (e: CalendarEvent) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  addGoal: (g: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  addReward: (r: Reward) => void;
  redeemReward: (id: string) => void;
  awardPoints: (memberId: string, points: number) => void;

  seedDemoData: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
  family: null,
  members: [],
  tasks: [],
  events: [],
  goals: [],
  rewards: [],
  achievements: [],
  activeMemberId: null,

  setFamily: (f) => set({ family: f }),
  addMember: (m) => set((s) => ({ members: [...s.members, m] })),
  updateMember: (id, updates) =>
    set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, ...updates } : m)) })),
  removeMember: (id) => set((s) => ({ members: s.members.filter((m) => m.id !== id) })),
  setActiveMember: (id) => set({ activeMemberId: id }),

  addTask: (t) => set((s) => ({ tasks: [...s.tasks, t] })),
  updateTask: (id, updates) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
  completeTask: (id, memberId) => {
    const task = get().tasks.find((t) => t.id === id);
    if (task) {
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, status: 'completed', completedAt: new Date().toISOString(), completedBy: memberId } : t
        ),
        members: s.members.map((m) =>
          m.id === memberId ? { ...m, points: m.points + task.points } : m
        ),
      }));
    }
  },
  deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  addEvent: (e) => set((s) => ({ events: [...s.events, e] })),
  updateEvent: (id, updates) =>
    set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...updates } : e)) })),
  deleteEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

  addGoal: (g) => set((s) => ({ goals: [...s.goals, g] })),
  updateGoal: (id, updates) =>
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)) })),
  deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

  addReward: (r) => set((s) => ({ rewards: [...s.rewards, r] })),
  redeemReward: (id) =>
    set((s) => ({
      rewards: s.rewards.map((r) =>
        r.id === id ? { ...r, isRedeemed: true, redeemedAt: new Date().toISOString() } : r
      ),
    })),
  awardPoints: (memberId, points) =>
    set((s) => ({
      members: s.members.map((m) => (m.id === memberId ? { ...m, points: m.points + points } : m)),
    })),

  seedDemoData: () => {
    const familyId = 'demo-family';
    const now = new Date().toISOString();
    const today = new Date();

    const family: Family = {
      id: familyId,
      name: 'The Johnson Family',
      motto: 'Stronger Together',
      homeAddress: '123 Maple Street, Springfield, IL 62701',
      timezone: 'America/Chicago',
      currency: 'USD',
      militaryMode: false,
      premiumTier: 'pro',
      healthScore: 78,
      createdAt: now,
    };

    const members: FamilyMember[] = [
      {
        id: 'member-1',
        familyId,
        name: 'Marcus',
        role: 'parent',
        avatarColor: colors.avatars[0],
        dateOfBirth: '1985-03-15',
        email: 'marcus@family.com',
        phone: '+1 (555) 123-4567',
        status: 'active',
        points: 2450,
        level: 12,
        isAdmin: true,
        createdAt: now,
      },
      {
        id: 'member-2',
        familyId,
        name: 'Sarah',
        role: 'parent',
        avatarColor: colors.avatars[1],
        dateOfBirth: '1987-07-22',
        email: 'sarah@family.com',
        phone: '+1 (555) 234-5678',
        status: 'work',
        points: 3100,
        level: 14,
        isAdmin: true,
        createdAt: now,
      },
      {
        id: 'member-3',
        familyId,
        name: 'Aiden',
        role: 'child',
        avatarColor: colors.avatars[2],
        dateOfBirth: '2012-11-08',
        status: 'school',
        points: 1850,
        level: 8,
        isAdmin: false,
        createdAt: now,
      },
      {
        id: 'member-4',
        familyId,
        name: 'Lily',
        role: 'child',
        avatarColor: colors.avatars[3],
        dateOfBirth: '2016-04-30',
        status: 'school',
        points: 920,
        level: 4,
        isAdmin: false,
        createdAt: now,
      },
    ];

    const tasks: Task[] = [
      {
        id: generateId(),
        familyId,
        title: 'Pay electricity bill',
        description: 'Monthly electricity bill due',
        assignedTo: ['member-1'],
        dueDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        status: 'pending',
        category: 'Finance',
        recurrence: 'monthly',
        points: 50,
        createdAt: now,
        createdBy: 'member-1',
      },
      {
        id: generateId(),
        familyId,
        title: 'Grocery shopping',
        assignedTo: ['member-2'],
        dueDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
        status: 'pending',
        category: 'Home',
        recurrence: 'weekly',
        points: 30,
        createdAt: now,
        createdBy: 'member-2',
      },
      {
        id: generateId(),
        familyId,
        title: 'Clean bedroom',
        assignedTo: ['member-3'],
        dueDate: new Date().toISOString(),
        priority: 'low',
        status: 'pending',
        category: 'Chores',
        recurrence: 'weekly',
        points: 25,
        createdAt: now,
        createdBy: 'member-1',
      },
      {
        id: generateId(),
        familyId,
        title: 'Car oil change',
        assignedTo: ['member-1'],
        dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
        status: 'pending',
        category: 'Vehicle',
        recurrence: 'none',
        points: 40,
        createdAt: now,
        createdBy: 'member-1',
      },
      {
        id: generateId(),
        familyId,
        title: 'Help with math homework',
        assignedTo: ['member-2'],
        dueDate: new Date().toISOString(),
        priority: 'high',
        status: 'completed',
        category: 'Education',
        recurrence: 'none',
        points: 20,
        completedAt: now,
        completedBy: 'member-2',
        createdAt: now,
        createdBy: 'member-1',
      },
    ];

    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const events: CalendarEvent[] = [
      {
        id: generateId(),
        familyId,
        title: "Aiden's Soccer Practice",
        startDate: new Date(tomorrow.setHours(15, 30)).toISOString(),
        endDate: new Date(tomorrow.setHours(17, 0)).toISOString(),
        allDay: false,
        location: 'Riverside Park',
        attendees: ['member-3'],
        color: '#4ECDC4',
        category: 'Sports',
        recurrence: 'weekly',
        createdAt: now,
        createdBy: 'member-1',
      },
      {
        id: generateId(),
        familyId,
        title: 'Family Dinner Night',
        startDate: new Date(today.setHours(18, 0)).toISOString(),
        endDate: new Date(today.setHours(20, 0)).toISOString(),
        allDay: false,
        attendees: ['member-1', 'member-2', 'member-3', 'member-4'],
        color: '#F5A623',
        category: 'Family',
        recurrence: 'weekly',
        createdAt: now,
        createdBy: 'member-2',
      },
      {
        id: generateId(),
        familyId,
        title: "Lily's Dance Recital",
        startDate: new Date(nextWeek.setHours(14, 0)).toISOString(),
        endDate: new Date(nextWeek.setHours(16, 0)).toISOString(),
        allDay: false,
        location: 'City Arts Center',
        attendees: ['member-1', 'member-2', 'member-4'],
        color: '#DDA0DD',
        category: 'Activity',
        recurrence: 'none',
        createdAt: now,
        createdBy: 'member-2',
      },
      {
        id: generateId(),
        familyId,
        title: 'Mortgage Payment Due',
        startDate: new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString(),
        endDate: new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString(),
        allDay: true,
        attendees: ['member-1', 'member-2'],
        color: '#E74C3C',
        category: 'Finance',
        recurrence: 'monthly',
        createdAt: now,
        createdBy: 'member-1',
      },
    ];

    const goals: Goal[] = [
      {
        id: generateId(),
        familyId,
        title: 'Family Vacation to Hawaii',
        description: 'Summer vacation fund for 5 days in Maui',
        category: 'travel',
        targetDate: '2026-07-15',
        milestones: [
          { id: generateId(), title: 'Save $1,000', isCompleted: true, completedAt: now, points: 100 },
          { id: generateId(), title: 'Save $3,000', isCompleted: true, completedAt: now, points: 150 },
          { id: generateId(), title: 'Save $5,000', isCompleted: false, points: 200 },
          { id: generateId(), title: 'Book flights', isCompleted: false, points: 100 },
          { id: generateId(), title: 'Book hotel', isCompleted: false, points: 100 },
        ],
        isCompleted: false,
        color: '#45B7D1',
        icon: 'airplane',
        createdAt: now,
      },
      {
        id: generateId(),
        familyId,
        memberId: 'member-3',
        title: "Aiden's College Fund",
        description: '529 savings plan for college',
        category: 'education',
        targetDate: '2030-09-01',
        milestones: [
          { id: generateId(), title: 'Open 529 account', isCompleted: true, completedAt: now, points: 50 },
          { id: generateId(), title: 'Reach $5,000', isCompleted: false, points: 100 },
          { id: generateId(), title: 'Reach $10,000', isCompleted: false, points: 200 },
        ],
        isCompleted: false,
        color: '#27AE60',
        icon: 'school',
        createdAt: now,
      },
      {
        id: generateId(),
        familyId,
        title: 'Home Renovation',
        description: 'Kitchen and bathroom remodel',
        category: 'home',
        targetDate: '2026-12-01',
        milestones: [
          { id: generateId(), title: 'Get 3 contractor quotes', isCompleted: false, points: 50 },
          { id: generateId(), title: 'Save $10,000', isCompleted: false, points: 200 },
          { id: generateId(), title: 'Start kitchen remodel', isCompleted: false, points: 100 },
        ],
        isCompleted: false,
        color: '#F5A623',
        icon: 'home',
        createdAt: now,
      },
    ];

    const rewards: Reward[] = [
      { id: generateId(), familyId, memberId: 'member-3', title: 'Movie Night Pick', description: 'Pick any movie for family movie night', pointsCost: 200, category: 'Entertainment', isRedeemed: false, icon: 'film-outline', color: '#DDA0DD', },
      { id: generateId(), familyId, memberId: 'member-4', title: 'Ice Cream Trip', description: 'Go to your favorite ice cream shop', pointsCost: 150, category: 'Food', isRedeemed: false, icon: 'ice-cream-outline', color: '#FF6B6B', },
      { id: generateId(), familyId, memberId: 'member-3', title: 'Stay Up Late Pass', description: 'Stay up 1 hour past bedtime', pointsCost: 100, category: 'Privilege', isRedeemed: true, redeemedAt: now, icon: 'moon-outline', color: '#45B7D1', },
      { id: generateId(), familyId, memberId: 'member-4', title: 'Screen Time Bonus', description: '30 extra minutes of screen time', pointsCost: 75, category: 'Privilege', isRedeemed: false, icon: 'tablet-portrait-outline', color: '#4ECDC4', },
    ];

    set({ family, members, tasks, events, goals, rewards });
  },
    }),
    {
      name: 'family-command-center-family',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
