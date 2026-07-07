import { apiRequest } from '../api/client';
import type { Task, FamilyMember } from '../types';

export function fetchTasks(): Promise<{ tasks: Task[] }> {
  return apiRequest('/tasks');
}

export function createTask(task: Task): Promise<{ task: Task }> {
  return apiRequest('/tasks', { method: 'POST', body: JSON.stringify(task) });
}

export function updateTaskRemote(id: string, updates: Partial<Task>): Promise<{ task: Task }> {
  return apiRequest(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function completeTaskRemote(id: string, memberId: string): Promise<{ task: Task; member: FamilyMember | null }> {
  return apiRequest(`/tasks/${id}/complete`, { method: 'POST', body: JSON.stringify({ memberId }) });
}

export function deleteTaskRemote(id: string): Promise<void> {
  return apiRequest(`/tasks/${id}`, { method: 'DELETE' });
}
