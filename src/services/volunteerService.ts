import { apiRequest } from '../api/client';
import type { VolunteerLog, VolunteerGoal } from '../store/useVolunteerStore';

export function fetchVolunteerLogs(): Promise<{ logs: VolunteerLog[] }> {
  return apiRequest('/volunteer/logs');
}

export function createVolunteerLog(log: VolunteerLog): Promise<{ log: VolunteerLog }> {
  return apiRequest('/volunteer/logs', { method: 'POST', body: JSON.stringify(log) });
}

export function updateVolunteerLogRemote(id: string, updates: Partial<VolunteerLog>): Promise<{ log: VolunteerLog }> {
  return apiRequest(`/volunteer/logs/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteVolunteerLogRemote(id: string): Promise<void> {
  return apiRequest(`/volunteer/logs/${id}`, { method: 'DELETE' });
}

export function fetchVolunteerGoals(): Promise<{ goals: VolunteerGoal[] }> {
  return apiRequest('/volunteer/goals');
}

export function saveVolunteerGoalRemote(goal: VolunteerGoal): Promise<{ goal: VolunteerGoal }> {
  return apiRequest('/volunteer/goals', { method: 'PUT', body: JSON.stringify(goal) });
}
