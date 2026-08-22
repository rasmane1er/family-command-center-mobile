import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as eventPlannerService from '../services/eventPlannerService';

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
  isLoaded: boolean;
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
  fetchFromServer: () => Promise<void>;
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
  isLoaded: false,

  addEvent: (event) => {
    const newEvent: FamilyEvent = { ...event, id: generateId(), createdAt: new Date().toISOString() };
    set((s) => ({ events: [newEvent, ...s.events] }));
    eventPlannerService.createEvent(newEvent).catch(() => {
      set((s) => ({ events: s.events.filter((e) => e.id !== newEvent.id) }));
    });
  },

  updateEvent: (id, updates) => {
    const prev = get().events;
    set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...updates } : e)) }));
    eventPlannerService.updateEventRemote(id, updates).catch(() => { set({ events: prev }); });
  },

  removeEvent: (id) => {
    const prevEvents = get().events;
    const prevGuests = get().guests;
    const prevTasks = get().tasks;
    const prevExpenses = get().expenses;
    set((s) => ({
      events: s.events.filter((e) => e.id !== id),
      guests: s.guests.filter((g) => g.eventId !== id),
      tasks: s.tasks.filter((t) => t.eventId !== id),
      expenses: s.expenses.filter((ex) => ex.eventId !== id),
    }));
    eventPlannerService.deleteEventRemote(id).catch(() => {
      set({ events: prevEvents, guests: prevGuests, tasks: prevTasks, expenses: prevExpenses });
    });
  },

  addGuest: (guest) => {
    const newGuest: Guest = { ...guest, id: generateId() };
    set((s) => ({ guests: [...s.guests, newGuest] }));
    eventPlannerService.createGuest(newGuest).catch(() => {
      set((s) => ({ guests: s.guests.filter((g) => g.id !== newGuest.id) }));
    });
  },

  updateGuestRSVP: (id, rsvp) => {
    const prev = get().guests;
    set((s) => ({ guests: s.guests.map((g) => (g.id === id ? { ...g, rsvp } : g)) }));
    eventPlannerService.updateGuestRSVPRemote(id, rsvp).catch(() => { set({ guests: prev }); });
  },

  removeGuest: (id) => {
    const prev = get().guests;
    set((s) => ({ guests: s.guests.filter((g) => g.id !== id) }));
    eventPlannerService.deleteGuestRemote(id).catch(() => { set({ guests: prev }); });
  },

  addTask: (task) => {
    const newTask: EventTask = { ...task, id: generateId() };
    set((s) => ({ tasks: [...s.tasks, newTask] }));
    eventPlannerService.createEventTask(newTask).catch(() => {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== newTask.id) }));
    });
  },

  completeTask: (id) => {
    const prev = get().tasks;
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, completed: true } : t)) }));
    eventPlannerService.completeEventTaskRemote(id).catch(() => { set({ tasks: prev }); });
  },

  addExpense: (expense) => {
    const newExpense: EventExpense = { ...expense, id: generateId() };
    set((s) => ({ expenses: [...s.expenses, newExpense] }));
    eventPlannerService.createEventExpense(newExpense).catch(() => {
      set((s) => ({ expenses: s.expenses.filter((ex) => ex.id !== newExpense.id) }));
    });
  },

  removeExpense: (id) => {
    const prev = get().expenses;
    set((s) => ({ expenses: s.expenses.filter((ex) => ex.id !== id) }));
    eventPlannerService.deleteEventExpenseRemote(id).catch(() => { set({ expenses: prev }); });
  },

  getGuestsForEvent: (eventId) => get().guests.filter((g) => g.eventId === eventId),
  getTasksForEvent: (eventId) => get().tasks.filter((t) => t.eventId === eventId),
  getExpensesForEvent: (eventId) => get().expenses.filter((ex) => ex.eventId === eventId),
  getTotalSpent: (eventId) =>
    get()
      .expenses.filter((ex) => ex.eventId === eventId)
      .reduce((sum, ex) => sum + ex.amount, 0),
  getConfirmedGuestCount: (eventId) =>
    get().guests.filter((g) => g.eventId === eventId && g.rsvp === 'yes').length,

  fetchFromServer: async () => {
    try {
      const [{ events }, { guests }, { tasks }, { expenses }] = await Promise.all([
        eventPlannerService.fetchEvents(),
        eventPlannerService.fetchGuests(),
        eventPlannerService.fetchEventTasks(),
        eventPlannerService.fetchEventExpenses(),
      ]);
      set({ events, guests, tasks, expenses, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },
    }),
    {
      name: 'family-command-center-event-planner',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        events: state.events,
        guests: state.guests,
        tasks: state.tasks,
        expenses: state.expenses,
        isLoaded: state.isLoaded,
      }),
    }
  )
);
