import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

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

export const useEventPlannerStore = create<EventPlannerState>()(
  persist(
    (set, get) => ({
  // A fresh family's event planner starts empty — EventPlannerScreen already
  // has a real "No upcoming/past events, tap + to plan a new event" empty
  // state for this. Shipping the same 3 hardcoded demo events (plus their
  // guests/tasks/expenses) to every family regardless of what they're
  // actually planning was never real data, just a permanent fake default.
  events: [],
  guests: [],
  tasks: [],
  expenses: [],

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
    }),
    {
      name: 'family-command-center-event-planner',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        events: state.events,
        guests: state.guests,
        tasks: state.tasks,
        expenses: state.expenses,
      }),
    }
  )
);
