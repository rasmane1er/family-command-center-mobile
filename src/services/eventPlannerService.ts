import { apiRequest } from '../api/client';
import type { FamilyEvent, Guest, EventTask, EventExpense, RSVPStatus } from '../store/useEventPlannerStore';

export function fetchEvents(): Promise<{ events: FamilyEvent[] }> {
  return apiRequest('/event-planner/events');
}

export function createEvent(event: FamilyEvent): Promise<{ event: FamilyEvent }> {
  return apiRequest('/event-planner/events', { method: 'POST', body: JSON.stringify(event) });
}

export function updateEventRemote(id: string, updates: Partial<FamilyEvent>): Promise<{ event: FamilyEvent }> {
  return apiRequest(`/event-planner/events/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteEventRemote(id: string): Promise<void> {
  return apiRequest(`/event-planner/events/${id}`, { method: 'DELETE' });
}

export function fetchGuests(): Promise<{ guests: Guest[] }> {
  return apiRequest('/event-planner/guests');
}

export function createGuest(guest: Guest): Promise<{ guest: Guest }> {
  return apiRequest('/event-planner/guests', { method: 'POST', body: JSON.stringify(guest) });
}

export function updateGuestRSVPRemote(id: string, rsvp: RSVPStatus): Promise<{ guest: Guest }> {
  return apiRequest(`/event-planner/guests/${id}`, { method: 'PATCH', body: JSON.stringify({ rsvp }) });
}

export function deleteGuestRemote(id: string): Promise<void> {
  return apiRequest(`/event-planner/guests/${id}`, { method: 'DELETE' });
}

export function fetchEventTasks(): Promise<{ tasks: EventTask[] }> {
  return apiRequest('/event-planner/tasks');
}

export function createEventTask(task: EventTask): Promise<{ task: EventTask }> {
  return apiRequest('/event-planner/tasks', { method: 'POST', body: JSON.stringify(task) });
}

export function completeEventTaskRemote(id: string): Promise<{ task: EventTask }> {
  return apiRequest(`/event-planner/tasks/${id}`, { method: 'PATCH' });
}

export function fetchEventExpenses(): Promise<{ expenses: EventExpense[] }> {
  return apiRequest('/event-planner/expenses');
}

export function createEventExpense(expense: EventExpense): Promise<{ expense: EventExpense }> {
  return apiRequest('/event-planner/expenses', { method: 'POST', body: JSON.stringify(expense) });
}

export function deleteEventExpenseRemote(id: string): Promise<void> {
  return apiRequest(`/event-planner/expenses/${id}`, { method: 'DELETE' });
}
