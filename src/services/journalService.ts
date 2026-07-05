import { apiRequest } from '../api/client';
import type { JournalEntry } from '../store/useJournalStore';

export function fetchEntries(): Promise<{ entries: JournalEntry[] }> {
  return apiRequest('/journal/entries');
}

export function createEntry(entry: JournalEntry): Promise<{ entry: JournalEntry }> {
  return apiRequest('/journal/entries', { method: 'POST', body: JSON.stringify(entry) });
}

export function updateEntryRemote(id: string, updates: Partial<JournalEntry>): Promise<{ entry: JournalEntry }> {
  return apiRequest(`/journal/entries/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteEntryRemote(id: string): Promise<void> {
  return apiRequest(`/journal/entries/${id}`, { method: 'DELETE' });
}
