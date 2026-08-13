import { apiRequest } from '../api/client';
import type { Budget } from '../types';

export function fetchBudgets(month?: string): Promise<{ budgets: Budget[]; month: string }> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return apiRequest(`/finance/budgets${qs}`);
}

export function createBudget(budget: Budget): Promise<{ budget: Budget }> {
  return apiRequest('/finance/budgets', { method: 'POST', body: JSON.stringify(budget) });
}

export function updateBudgetRemote(id: string, updates: Partial<Budget>): Promise<{ budget: Budget }> {
  return apiRequest(`/finance/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteBudgetRemote(id: string): Promise<void> {
  return apiRequest(`/finance/budgets/${id}`, { method: 'DELETE' });
}
