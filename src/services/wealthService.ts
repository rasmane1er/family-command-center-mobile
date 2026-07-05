import { apiRequest } from '../api/client';
import type { WealthEntry } from '../types';

export function fetchEntries(): Promise<{ entries: WealthEntry[] }> {
  return apiRequest('/wealth/entries');
}

export function createEntry(entry: Omit<WealthEntry, 'id' | 'lastUpdated'> & { id: string; lastUpdated: string }): Promise<{ entry: WealthEntry }> {
  return apiRequest('/wealth/entries', { method: 'POST', body: JSON.stringify(entry) });
}

export function updateEntryRemote(id: string, updates: Partial<WealthEntry>): Promise<{ entry: WealthEntry }> {
  return apiRequest(`/wealth/entries/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteEntryRemote(id: string): Promise<void> {
  return apiRequest(`/wealth/entries/${id}`, { method: 'DELETE' });
}
