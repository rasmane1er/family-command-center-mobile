import { apiRequest } from '../api/client';
import type { Chore } from '../store/useChoreStore';

export function fetchChores(): Promise<{ chores: Chore[] }> {
  return apiRequest('/chores');
}

export function createChore(chore: Chore): Promise<{ chore: Chore }> {
  return apiRequest('/chores', { method: 'POST', body: JSON.stringify(chore) });
}

export function updateChoreRemote(id: string, updates: Partial<Chore>): Promise<{ chore: Chore }> {
  return apiRequest(`/chores/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteChoreRemote(id: string): Promise<void> {
  return apiRequest(`/chores/${id}`, { method: 'DELETE' });
}
