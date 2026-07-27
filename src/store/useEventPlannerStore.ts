import { create } from 'zustand';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type EventType =
  | 'birthday'
  | 'holiday'
  | 'graduation'
  | 'wedding'
  | 'baby-shower'
  | 'anniversary'
  | 'dinner-party'
  | 'game-night'
  | 'outdoor'
  | 'other';

export type RSVPStatus = 'pending' | 'yes' | 'no' | 'maybe';

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone: string;
  rsvp: RSVPStatus;
  plusOne: boolean;
  dietaryRestrictions: string;
  notes: string;
}

export interface EventTask {
  id: string;
  eventId: string;
  title: string;
  dueDate: string;
  completed: boolean;
  assignedTo: string;
  category: 'venue' | 'catering' | 'decorations' | 'invitations' | 'entertainment' | 'other';
}

export interface EventExpense {
  id: string;
  eventId: string;
  category: string;
  description: string;
  amount: number;
  paid: boolean;
}

export interface FamilyEvent {
  id: string;
  title: string;
  type: EventType;
  date: string;
  time: string;
  location: string;
  description: string;
  budget: number;
  status: 'planning' | 'confirmed' | 'completed' | 'cancelled';
  hostMember: string;
  emoji: string;
  createdAt: string;
}

interface EventPlannerState {
  events: FamilyEvent[];
  guests: Guest[];
  tasks: EventTask[];
  expenses: EventExpense[];
  addEvent: (event: Omit<FamilyEvent, 'id' | 'createdAt'>) => void;
  updateEvent: (id: string, updates: Partial<FamilyEvent>) => void;
  removeEvent: (id: string) => void;
  addGuest: (guest: Omit<Guest, 'id'>) => void;
  updateGuestRSVP: (id: string, rsvp: RSVPStatus) => void;
  removeGuest: (id: string) => void;
  addTask: (task: Omit<EventTask, 'id'>) => void;
  completeTask: (id: string) => void;
  addExpense: (expense: Omit<EventExpense, 'id'>) => void;
  removeExpense: (id: string) => void;
  getGuestsForEvent: (eventId: string) => Guest[];
  getTasksForEvent: (eventId: string) => EventTask[];
  getExpensesForEvent: (eventId: string) => EventExpense[];
  getTotalSpent: (eventId: string) => number;
  getConfirmedGuestCount: (eventId: string) => number;
}

const NOW = new Date().toISOString();
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().split('T')[0];

const SEED_EVENTS: FamilyEvent[] = [
  {
    id: 'evt1',
    title: "Emma's Birthday Party",
    type: 'birthday',
    date: day(19),
    time: '2:00 PM',
    location: 'Community Center',
    description: "Emma's 13th birthday celebration with friends and family",
    budget: 500,
    status: 'planning',
    hostMember: 'Mom',
    emoji: '🎂',
    createdAt: NOW,
  },
  {
    id: 'evt2',
    title: 'Holiday Family Dinner',
    type: 'holiday',
    date: '2026-12-20',
    time: '6:00 PM',
    location: 'Our House',
    description: 'Annual holiday gathering with extended family',
    budget: 800,
    status: 'planning',
    hostMember: 'Dad',
    emoji: '🎄',
    createdAt: NOW,
  },
  {
    id: 'evt3',
    title: 'Game Night',
    type: 'game-night',
    date: day(5),
    time: '7:00 PM',
    location: 'Living Room',
    description: 'Fun board game night with the neighbors',
    budget: 80,
    status: 'confirmed',
    hostMember: 'Mom',
    emoji: '🎲',
    createdAt: NOW,
  },
];

const SEED_GUESTS: Guest[] = [
  { id: 'g1', eventId: 'evt1', name: 'Sarah Johnson', email: 'sarah@email.com', phone: '555-0101', rsvp: 'yes', plusOne: false, dietaryRestrictions: '', notes: "Emma's best friend" },
  { id: 'g2', eventId: 'evt1', name: 'Mia Chen', email: 'mia@email.com', phone: '555-0102', rsvp: 'yes', plusOne: false, dietaryRestrictions: 'Vegetarian', notes: '' },
  { id: 'g3', eventId: 'evt1', name: 'Jake Williams', email: 'jake@email.com', phone: '555-0103', rsvp: 'maybe', plusOne: false, dietaryRestrictions: '', notes: '' },
  { id: 'g4', eventId: 'evt1', name: 'Grandma Rose', email: '', phone: '555-0104', rsvp: 'yes', plusOne: true, dietaryRestrictions: 'No nuts', notes: 'Bringing grandpa' },
  { id: 'g5', eventId: 'evt2', name: 'Uncle Bob', email: 'bob@email.com', phone: '555-0201', rsvp: 'yes', plusOne: true, dietaryRestrictions: '', notes: '' },
  { id: 'g6', eventId: 'evt2', name: 'Aunt Linda', email: 'linda@email.com', phone: '555-0202', rsvp: 'pending', plusOne: false, dietaryRestrictions: 'Gluten-free', notes: '' },
  { id: 'g7', eventId: 'evt3', name: 'Mike & Karen (next door)', email: '', phone: '555-0301', rsvp: 'yes', plusOne: true, dietaryRestrictions: '', notes: '' },
  { id: 'g8', eventId: 'evt3', name: 'Tom (down the street)', email: '', phone: '555-0302', rsvp: 'pending', plusOne: false, dietaryRestrictions: '', notes: '' },
];

const SEED_TASKS: EventTask[] = [
  { id: 't1', eventId: 'evt1', title: 'Book party venue', dueDate: day(3), completed: true, assignedTo: 'Mom', category: 'venue' },
  { id: 't2', eventId: 'evt1', title: 'Order birthday cake', dueDate: day(14), completed: false, assignedTo: 'Dad', category: 'catering' },
  { id: 't3', eventId: 'evt1', title: 'Buy decorations', dueDate: day(10), completed: false, assignedTo: 'Mom', category: 'decorations' },
  { id: 't4', eventId: 'evt1', title: 'Send invitations', dueDate: day(2), completed: true, assignedTo: 'Emma', category: 'invitations' },
  { id: 't5', eventId: 'evt2', title: 'Plan holiday menu', dueDate: '2026-12-01', completed: false, assignedTo: 'Mom', category: 'catering' },
  { id: 't6', eventId: 'evt2', title: 'Get holiday decorations', dueDate: '2026-12-05', completed: false, assignedTo: 'Dad', category: 'decorations' },
  { id: 't7', eventId: 'evt3', title: 'Pick out board games', dueDate: day(4), completed: false, assignedTo: 'Emma', category: 'entertainment' },
  { id: 't8', eventId: 'evt3', title: 'Buy snacks and drinks', dueDate: day(4), completed: false, assignedTo: 'Dad', category: 'catering' },
];

const SEED_EXPENSES: EventExpense[] = [
  { id: 'ex1', eventId: 'evt1', category: 'Venue', description: 'Community center rental', amount: 150, paid: true },
  { id: 'ex2', eventId: 'evt1', category: 'Catering', description: 'Birthday cake order', amount: 75, paid: false },
  { id: 'ex3', eventId: 'evt1', category: 'Decorations', description: 'Balloons, streamers, banner', amount: 45, paid: false },
  { id: 'ex4', eventId: 'evt2', category: 'Catering', description: 'Turkey and side dishes', amount: 200, paid: false },
  { id: 'ex5', eventId: 'evt3', category: 'Catering', description: 'Snacks and beverages', amount: 55, paid: true },
];

export const useEventPlannerStore = create<EventPlannerState>()((set, get) => ({
  events: SEED_EVENTS,
  guests: SEED_GUESTS,
  tasks: SEED_TASKS,
  expenses: SEED_EXPENSES,

  addEvent: (event) =>
    set((s) => ({
      events: [{ ...event, id: generateId(), createdAt: new Date().toISOString() }, ...s.events],
    })),

  updateEvent: (id, updates) =>
    set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...updates } : e)) })),

  removeEvent: (id) =>
    set((s) => ({
      events: s.events.filter((e) => e.id !== id),
      guests: s.guests.filter((g) => g.eventId !== id),
      tasks: s.tasks.filter((t) => t.eventId !== id),
      expenses: s.expenses.filter((ex) => ex.eventId !== id),
    })),

  addGuest: (guest) =>
    set((s) => ({ guests: [...s.guests, { ...guest, id: generateId() }] })),

  updateGuestRSVP: (id, rsvp) =>
    set((s) => ({ guests: s.guests.map((g) => (g.id === id ? { ...g, rsvp } : g)) })),

  removeGuest: (id) =>
    set((s) => ({ guests: s.guests.filter((g) => g.id !== id) })),

  addTask: (task) =>
    set((s) => ({ tasks: [...s.tasks, { ...task, id: generateId() }] })),

  completeTask: (id) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, completed: true } : t)) })),

  addExpense: (expense) =>
    set((s) => ({ expenses: [...s.expenses, { ...expense, id: generateId() }] })),

  removeExpense: (id) =>
    set((s) => ({ expenses: s.expenses.filter((ex) => ex.id !== id) })),

  getGuestsForEvent: (eventId) => get().guests.filter((g) => g.eventId === eventId),
  getTasksForEvent: (eventId) => get().tasks.filter((t) => t.eventId === eventId),
  getExpensesForEvent: (eventId) => get().expenses.filter((ex) => ex.eventId === eventId),
  getTotalSpent: (eventId) =>
    get()
      .expenses.filter((ex) => ex.eventId === eventId)
      .reduce((sum, ex) => sum + ex.amount, 0),
  getConfirmedGuestCount: (eventId) =>
    get().guests.filter((g) => g.eventId === eventId && g.rsvp === 'yes').length,
}));
