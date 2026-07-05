import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

const generateId = () => Math.random().toString(36).substring(2, 11);

type Relationship = 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'friend' | 'coworker' | 'other';

interface Birthday {
  id: string;
  familyId: string;
  name: string;
  memberId?: string;
  relationship: Relationship;
  date: string; // MM-DD
  birthYear?: number;
  avatarColor: string;
  remindDaysBefore: number;
  giftIdeas?: string[];
  notes?: string;
}

interface BirthdayState {
  birthdays: Birthday[];
  hasSeeded: boolean;
  addBirthday: (b: Omit<Birthday, 'id'>) => void;
  updateBirthday: (id: string, updates: Partial<Birthday>) => void;
  deleteBirthday: (id: string) => void;
  getDaysUntil: (mmdd: string) => number;
  getUpcoming: (days: number) => Birthday[];
  seedDemoData: () => void;
}

function getDaysUntilDate(mmdd: string): number {
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMM = today.getMonth() + 1;
  const todayDD = today.getDate();

  const [mm, dd] = mmdd.split('-').map(Number);

  // Build this year's date
  const thisYear = new Date(todayYear, mm - 1, dd);
  const todayStart = new Date(todayYear, todayMM - 1, todayDD);

  const diffMs = thisYear.getTime() - todayStart.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 0;
  if (diffDays > 0) return diffDays;
  // Already passed this year, calculate to next year
  const nextYear = new Date(todayYear + 1, mm - 1, dd);
  return Math.round((nextYear.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
}

export const useBirthdayStore = create<BirthdayState>()(
  persist(
    (set, get) => ({
  birthdays: [],
  hasSeeded: false,

  addBirthday: (b) =>
    set((s) => ({ birthdays: [...s.birthdays, { ...b, id: generateId() }] })),

  updateBirthday: (id, updates) =>
    set((s) => ({
      birthdays: s.birthdays.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  deleteBirthday: (id) =>
    set((s) => ({ birthdays: s.birthdays.filter((b) => b.id !== id) })),

  getDaysUntil: (mmdd) => getDaysUntilDate(mmdd),

  getUpcoming: (days) => {
    const { birthdays } = get();
    return birthdays
      .filter((b) => {
        const d = getDaysUntilDate(b.date);
        return d >= 0 && d <= days;
      })
      .sort((a, b) => getDaysUntilDate(a.date) - getDaysUntilDate(b.date));
  },

  seedDemoData: () => {
    const familyId = 'demo-family';
    const birthdays: Birthday[] = [
      {
        id: generateId(),
        familyId,
        name: 'Marcus Johnson',
        memberId: 'member-1',
        relationship: 'self',
        date: '06-15',
        birthYear: 1982,
        avatarColor: '#FF6B6B',
        remindDaysBefore: 7,
        giftIdeas: ['Golf clubs', 'Watch', 'Tech gadget'],
        notes: 'Loves outdoor activities',
      },
      {
        id: generateId(),
        familyId,
        name: 'Sarah Johnson',
        memberId: 'member-2',
        relationship: 'spouse',
        date: '09-22',
        birthYear: 1985,
        avatarColor: '#4ECDC4',
        remindDaysBefore: 14,
        giftIdeas: ['Spa day', 'Jewelry', 'Books'],
        notes: 'Loves surprises and flowers',
      },
      {
        id: generateId(),
        familyId,
        name: 'Aiden Johnson',
        memberId: 'member-3',
        relationship: 'child',
        date: '03-10',
        birthYear: 2014,
        avatarColor: '#45B7D1',
        remindDaysBefore: 7,
        giftIdeas: ['LEGO set', 'Video game', 'Soccer gear'],
      },
      {
        id: generateId(),
        familyId,
        name: 'Lily Johnson',
        memberId: 'member-4',
        relationship: 'child',
        date: '11-28',
        birthYear: 2017,
        avatarColor: '#96CEB4',
        remindDaysBefore: 7,
        giftIdeas: ['Art supplies', 'Ballet shoes', 'Stuffed animals'],
      },
      {
        id: generateId(),
        familyId,
        name: 'Mom (Linda)',
        relationship: 'parent',
        date: '04-15',
        birthYear: 1955,
        avatarColor: '#FFEAA7',
        remindDaysBefore: 14,
        giftIdeas: ['Flowers', 'Dinner out', 'Photo album'],
        notes: 'Call and send card early',
      },
      {
        id: generateId(),
        familyId,
        name: 'Dad (Robert)',
        relationship: 'parent',
        date: '08-30',
        birthYear: 1952,
        avatarColor: '#DDA0DD',
        remindDaysBefore: 7,
        giftIdeas: ['Tools', 'Fishing gear', 'Gift card'],
      },
      {
        id: generateId(),
        familyId,
        name: 'Jake (Best Friend)',
        relationship: 'friend',
        date: '07-04',
        avatarColor: '#F5A623',
        remindDaysBefore: 7,
        giftIdeas: ['Beer sampler', 'Sports tickets'],
        notes: 'Always celebrate together on the 4th',
      },
      {
        id: generateId(),
        familyId,
        name: 'Grandma Rose',
        relationship: 'parent',
        date: '02-14',
        birthYear: 1948,
        avatarColor: '#00D4AA',
        remindDaysBefore: 14,
        giftIdeas: ['Flowers', 'Chocolates', 'Family photo frame'],
        notes: 'Birthday on Valentines Day - make it extra special',
      },
    ];
    set({ birthdays, hasSeeded: true });
  },
    }),
    {
      name: 'family-command-center-birthday',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

export type { Birthday, Relationship };
