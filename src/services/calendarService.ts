import { apiRequest } from '../api/client';
import type { CalendarEvent } from '../types';

interface CreateEventInput extends Omit<CalendarEvent, 'familyId'> {}
interface UpdateEventInput extends Partial<Omit<CalendarEvent, 'id' | 'familyId'>> {}

export function fetchEvents(range?: { from?: string; to?: string }): Promise<{ events: CalendarEvent[] }> {
  const params = new URLSearchParams();
  if (range?.from) params.set('from', range.from);
  if (range?.to) params.set('to', range.to);
  const qs = params.toString();
  return apiRequest(`/calendar/events${qs ? `?${qs}` : ''}`);
}

export function createEvent(event: CreateEventInput): Promise<{ event: CalendarEvent }> {
  return apiRequest('/calendar/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export function updateEventRemote(id: string, updates: UpdateEventInput): Promise<{ event: CalendarEvent }> {
  return apiRequest(`/calendar/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function deleteEventRemote(id: string): Promise<void> {
  return apiRequest(`/calendar/events/${id}`, { method: 'DELETE' });
}
