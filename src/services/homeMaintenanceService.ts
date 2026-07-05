import { apiRequest } from '../api/client';
import type { MaintenanceTask } from '../store/useHomeMaintenanceStore';

export function fetchTasks(): Promise<{ tasks: MaintenanceTask[] }> {
  return apiRequest('/maintenance/tasks');
}

export function createTask(t: MaintenanceTask): Promise<{ task: MaintenanceTask }> {
  return apiRequest('/maintenance/tasks', { method: 'POST', body: JSON.stringify(t) });
}

export function updateTaskRemote(id: string, updates: Partial<MaintenanceTask>): Promise<{ task: MaintenanceTask }> {
  return apiRequest(`/maintenance/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function completeRecurringRemote(id: string, nextTask: { id: string; dueDate: string }): Promise<{ task: MaintenanceTask }> {
  return apiRequest(`/maintenance/tasks/${id}/complete-recurring`, { method: 'POST', body: JSON.stringify(nextTask) });
}

export function deleteTaskRemote(id: string): Promise<void> {
  return apiRequest(`/maintenance/tasks/${id}`, { method: 'DELETE' });
}
