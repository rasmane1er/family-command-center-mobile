import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type DuesStatus = 'paid' | 'due' | 'overdue' | 'waived';

export interface HOADuesRecord {
  id: string;
  period: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: DuesStatus;
  notes: string;
  createdAt: string;
}

export interface HOARule {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'strict';
  createdAt: string;
}

export interface HOAAmenity {
  id: string;
  name: string;
  hours: string;
  reservationRequired: boolean;
  notes: string;
  icon: string;
}

export interface HOAMeeting {
  id: string;
  title: string;
  date: string;
  location: string;
  notes: string;
  attended: boolean;
  minutes: string;
  createdAt: string;
}

interface HOAState {
  dues: HOADuesRecord[];
  rules: HOARule[];
  amenities: HOAAmenity[];
  meetings: HOAMeeting[];
  monthlyDueAmount: number;
  hoaName: string;
  managementCompany: string;
  managementPhone: string;
  addDues: (dues: Omit<HOADuesRecord, 'id' | 'createdAt'>) => void;
  markDuesPaid: (id: string, paidDate: string) => void;
  addRule: (rule: Omit<HOARule, 'id' | 'createdAt'>) => void;
  removeRule: (id: string) => void;
  addMeeting: (meeting: Omit<HOAMeeting, 'id' | 'createdAt'>) => void;
  updateMeetingMinutes: (id: string, minutes: string) => void;
  getTotalOwed: () => number;
  getOverdueDues: () => HOADuesRecord[];
}

const today = new Date();
const monthsAgo = (n: number) => {
  const d = new Date(today);
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};
const monthsAhead = (n: number) => {
  const d = new Date(today);
  d.setMonth(d.getMonth() + n);
  return d.toISOString();
};

const DEMO_DUES: HOADuesRecord[] = [
  {
    id: generateId(),
    period: 'Q1 2026',
    amount: 750,
    dueDate: '2026-01-01',
    paidDate: '2026-01-05',
    status: 'paid',
    notes: 'Paid on time via online portal',
    createdAt: monthsAgo(6),
  },
  {
    id: generateId(),
    period: 'Q2 2026',
    amount: 750,
    dueDate: '2026-04-01',
    paidDate: '2026-04-03',
    status: 'paid',
    notes: 'Paid via check',
    createdAt: monthsAgo(3),
  },
  {
    id: generateId(),
    period: 'July 2026',
    amount: 250,
    dueDate: '2026-07-01',
    paidDate: '2026-07-02',
    status: 'paid',
    notes: 'Auto-pay processed',
    createdAt: monthsAgo(1),
  },
  {
    id: generateId(),
    period: 'August 2026',
    amount: 250,
    dueDate: '2026-08-01',
    status: 'due',
    notes: '',
    createdAt: monthsAgo(0),
  },
  {
    id: generateId(),
    period: 'May 2026',
    amount: 250,
    dueDate: '2026-05-01',
    status: 'overdue',
    notes: 'Missed payment — late fee may apply',
    createdAt: monthsAgo(2),
  },
  {
    id: generateId(),
    period: 'June 2026',
    amount: 250,
    dueDate: '2026-06-01',
    status: 'overdue',
    notes: 'Second missed month — contact HOA',
    createdAt: monthsAgo(1),
  },
];

const DEMO_RULES: HOARule[] = [
  {
    id: generateId(),
    category: 'Parking',
    title: 'No overnight street parking',
    description:
      'Vehicles may not be parked on the street between midnight and 6am. All vehicles must be parked in driveways or designated guest spots.',
    severity: 'strict',
    createdAt: monthsAgo(12),
  },
  {
    id: generateId(),
    category: 'Pets',
    title: 'Leash required in common areas',
    description:
      'All pets must be on a leash no longer than 6 feet when in common areas. Pet owners are responsible for cleaning up after their animals.',
    severity: 'warning',
    createdAt: monthsAgo(12),
  },
  {
    id: generateId(),
    category: 'Landscaping',
    title: 'Lawn maintenance standards',
    description:
      'Lawns must be mowed at least every two weeks from April through October. No lawn ornaments taller than 36 inches without prior board approval.',
    severity: 'info',
    createdAt: monthsAgo(12),
  },
  {
    id: generateId(),
    category: 'Noise',
    title: 'Quiet hours 10pm - 7am',
    description:
      'No excessive noise including music, power tools, or outdoor gatherings between 10pm and 7am on weekdays, and 11pm to 8am on weekends.',
    severity: 'warning',
    createdAt: monthsAgo(12),
  },
  {
    id: generateId(),
    category: 'Guests',
    title: 'Guest parking registration',
    description:
      'Guests staying more than 3 consecutive nights must be registered with the management office. Guest parking passes are available at the front office.',
    severity: 'info',
    createdAt: monthsAgo(12),
  },
];

const DEMO_AMENITIES: HOAAmenity[] = [
  {
    id: generateId(),
    name: 'Pool',
    hours: '7am - 9pm',
    reservationRequired: false,
    notes: 'Heated pool, open Memorial Day through Labor Day. Pool rules posted at entrance.',
    icon: 'water',
  },
  {
    id: generateId(),
    name: 'Fitness Center',
    hours: '5am - 11pm',
    reservationRequired: false,
    notes: 'Cardio and weight equipment. Resident key fob required for access.',
    icon: 'barbell',
  },
  {
    id: generateId(),
    name: 'Clubhouse',
    hours: '8am - 10pm',
    reservationRequired: true,
    notes: 'Seats up to 75. Kitchen included. Reserve at least 2 weeks in advance for events.',
    icon: 'business',
  },
];

const DEMO_MEETINGS: HOAMeeting[] = [
  {
    id: generateId(),
    title: 'Annual HOA Board Meeting',
    date: monthsAgo(3),
    location: 'Clubhouse, Main Hall',
    notes: 'Budget review, board elections, community feedback',
    attended: true,
    minutes:
      'Board approved 2026 budget of $125,000. New landscaping contract awarded to GreenThumb Services. Pool hours extended by 1 hour daily. Next meeting scheduled for Q3.',
    createdAt: monthsAgo(4),
  },
  {
    id: generateId(),
    title: 'Q2 Community Town Hall',
    date: monthsAgo(1),
    location: 'Clubhouse, Conference Room B',
    notes: 'Street repaving project update and resident questions',
    attended: false,
    minutes: '',
    createdAt: monthsAgo(2),
  },
  {
    id: generateId(),
    title: 'Q3 Board Meeting',
    date: monthsAhead(1),
    location: 'Clubhouse, Main Hall',
    notes: 'Fall maintenance projects and holiday decoration policy',
    attended: false,
    minutes: '',
    createdAt: monthsAgo(0),
  },
];

export const useHOAStore = create<HOAState>()((set, get) => ({
  dues: DEMO_DUES,
  rules: DEMO_RULES,
  amenities: DEMO_AMENITIES,
  meetings: DEMO_MEETINGS,
  monthlyDueAmount: 250,
  hoaName: 'Sunset Ridge HOA',
  managementCompany: 'Premier Community Management',
  managementPhone: '(555) 822-4400',

  addDues: (dues) =>
    set((s) => ({
      dues: [
        ...s.dues,
        { ...dues, id: generateId(), createdAt: new Date().toISOString() },
      ],
    })),

  markDuesPaid: (id, paidDate) =>
    set((s) => ({
      dues: s.dues.map((d) =>
        d.id === id ? { ...d, status: 'paid', paidDate } : d
      ),
    })),

  addRule: (rule) =>
    set((s) => ({
      rules: [
        ...s.rules,
        { ...rule, id: generateId(), createdAt: new Date().toISOString() },
      ],
    })),

  removeRule: (id) =>
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),

  addMeeting: (meeting) =>
    set((s) => ({
      meetings: [
        ...s.meetings,
        { ...meeting, id: generateId(), createdAt: new Date().toISOString() },
      ],
    })),

  updateMeetingMinutes: (id, minutes) =>
    set((s) => ({
      meetings: s.meetings.map((m) => (m.id === id ? { ...m, minutes } : m)),
    })),

  getTotalOwed: () =>
    get()
      .dues.filter((d) => d.status === 'due' || d.status === 'overdue')
      .reduce((sum, d) => sum + d.amount, 0),

  getOverdueDues: () => get().dues.filter((d) => d.status === 'overdue'),
}));
