import { apiRequest } from '../api/client';
import type { HOADuesRecord, HOARule, HOAMeeting } from '../store/useHOAStore';

export interface HOASettings {
  hoaName?: string;
  managementCompany?: string;
  managementPhone?: string;
  monthlyDueAmount?: number;
}

export function fetchHOASettings(): Promise<{ settings: HOASettings | null }> {
  return apiRequest('/hoa/settings');
}

export function saveHOASettings(settings: HOASettings): Promise<{ settings: HOASettings }> {
  return apiRequest('/hoa/settings', { method: 'PUT', body: JSON.stringify(settings) });
}

export function fetchHOADues(): Promise<{ dues: HOADuesRecord[] }> {
  return apiRequest('/hoa/dues');
}

export function createHOADues(dues: HOADuesRecord): Promise<{ dues: HOADuesRecord }> {
  return apiRequest('/hoa/dues', { method: 'POST', body: JSON.stringify(dues) });
}

export function markHOADuesPaidRemote(id: string, paidDate: string): Promise<{ dues: HOADuesRecord }> {
  return apiRequest(`/hoa/dues/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'paid', paidDate }) });
}

export function fetchHOARules(): Promise<{ rules: HOARule[] }> {
  return apiRequest('/hoa/rules');
}

export function createHOARule(rule: HOARule): Promise<{ rule: HOARule }> {
  return apiRequest('/hoa/rules', { method: 'POST', body: JSON.stringify(rule) });
}

export function deleteHOARuleRemote(id: string): Promise<void> {
  return apiRequest(`/hoa/rules/${id}`, { method: 'DELETE' });
}

export function fetchHOAMeetings(): Promise<{ meetings: HOAMeeting[] }> {
  return apiRequest('/hoa/meetings');
}

export function createHOAMeeting(meeting: HOAMeeting): Promise<{ meeting: HOAMeeting }> {
  return apiRequest('/hoa/meetings', { method: 'POST', body: JSON.stringify(meeting) });
}

export function updateHOAMeetingMinutesRemote(id: string, minutes: string): Promise<{ meeting: HOAMeeting }> {
  return apiRequest(`/hoa/meetings/${id}`, { method: 'PATCH', body: JSON.stringify({ minutes }) });
}
