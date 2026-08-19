import { apiRequest } from '../api/client';
import type { Activity } from '../store/useActivitiesStore';

export function fetchActivities(): Promise<{ activities: Activity[] }> {
  return apiRequest('/activities');
}

export function createActivity(activity: Activity): Promise<{ activity: Activity }> {
  return apiRequest('/activities', { method: 'POST', body: JSON.stringify(activity) });
}

export function updateActivityRemote(id: string, updates: Partial<Activity>): Promise<{ activity: Activity }> {
  return apiRequest(`/activities/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteActivityRemote(id: string): Promise<void> {
  return apiRequest(`/activities/${id}`, { method: 'DELETE' });
}
