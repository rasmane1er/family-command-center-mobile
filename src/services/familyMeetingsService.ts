import { apiRequest } from '../api/client';
import type { FamilyMeeting } from '../store/useFamilyMeetingsStore';

export function fetchMeetings(): Promise<{ meetings: FamilyMeeting[] }> {
  return apiRequest('/meetings');
}

export function createMeeting(m: FamilyMeeting): Promise<{ meeting: FamilyMeeting }> {
  return apiRequest('/meetings', { method: 'POST', body: JSON.stringify(m) });
}

export function updateMeetingRemote(id: string, updates: Partial<FamilyMeeting>): Promise<{ meeting: FamilyMeeting }> {
  return apiRequest(`/meetings/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteMeetingRemote(id: string): Promise<void> {
  return apiRequest(`/meetings/${id}`, { method: 'DELETE' });
}
