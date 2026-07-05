import { apiRequest } from '../api/client';
import type { Poll } from '../store/usePollsStore';

export function fetchPolls(): Promise<{ polls: Poll[] }> {
  return apiRequest('/polls');
}

export function createPoll(poll: Poll): Promise<{ poll: Poll }> {
  return apiRequest('/polls', { method: 'POST', body: JSON.stringify(poll) });
}

export function updatePollRemote(id: string, updates: Partial<Poll>): Promise<{ poll: Poll }> {
  return apiRequest(`/polls/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deletePollRemote(id: string): Promise<void> {
  return apiRequest(`/polls/${id}`, { method: 'DELETE' });
}
