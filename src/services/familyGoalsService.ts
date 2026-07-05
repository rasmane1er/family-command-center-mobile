import { apiRequest } from '../api/client';
import type { FamilyGoal } from '../store/useFamilyGoalsStore';

export function fetchGoals(): Promise<{ goals: FamilyGoal[] }> {
  return apiRequest('/goals');
}

export function createGoal(g: FamilyGoal): Promise<{ goal: FamilyGoal }> {
  return apiRequest('/goals', { method: 'POST', body: JSON.stringify(g) });
}

export function updateGoalRemote(id: string, updates: Partial<FamilyGoal>): Promise<{ goal: FamilyGoal }> {
  return apiRequest(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteGoalRemote(id: string): Promise<void> {
  return apiRequest(`/goals/${id}`, { method: 'DELETE' });
}
