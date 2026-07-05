import { apiRequest } from '../api/client';
import type { Assignment, AssignmentStatus } from '../store/useHomeworkStore';

export function fetchAssignments(): Promise<{ assignments: Assignment[] }> {
  return apiRequest('/homework/assignments');
}

export function createAssignment(a: Assignment): Promise<{ assignment: Assignment }> {
  return apiRequest('/homework/assignments', { method: 'POST', body: JSON.stringify(a) });
}

export function updateAssignmentRemote(id: string, updates: { status?: AssignmentStatus; grade?: number }): Promise<{ assignment: Assignment }> {
  return apiRequest(`/homework/assignments/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteAssignmentRemote(id: string): Promise<void> {
  return apiRequest(`/homework/assignments/${id}`, { method: 'DELETE' });
}
