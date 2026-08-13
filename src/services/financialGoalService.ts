import { apiRequest } from '../api/client';
import type { FinancialGoal } from '../types';

export function fetchFinancialGoals(): Promise<{ goals: FinancialGoal[] }> {
  return apiRequest('/finance/goals');
}

export function createFinancialGoal(goal: FinancialGoal): Promise<{ goal: FinancialGoal }> {
  return apiRequest('/finance/goals', { method: 'POST', body: JSON.stringify(goal) });
}

export function updateFinancialGoalRemote(id: string, updates: Partial<FinancialGoal>): Promise<{ goal: FinancialGoal }> {
  return apiRequest(`/finance/goals/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteFinancialGoalRemote(id: string): Promise<void> {
  return apiRequest(`/finance/goals/${id}`, { method: 'DELETE' });
}
