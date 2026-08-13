import { apiRequest } from '../api/client';
import type { Budget, Bill, Subscription, FinancialGoal, Debt } from '../types';

export interface AdoptLocalInput {
  budgets?: Budget[];
  bills?: Bill[];
  subscriptions?: Subscription[];
  financialGoals?: FinancialGoal[];
  debts?: Debt[];
}

export interface AdoptLocalResult {
  adopted: {
    budgets: number;
    bills: number;
    subscriptions: number;
    financialGoals: number;
    debts: number;
  };
}

// One-time bridge for pre-backend-persistence MMKV records — see the
// `localAdoptedAt` flow in useFinanceStore.fetchFromServer().
export function adoptLocal(input: AdoptLocalInput): Promise<AdoptLocalResult> {
  return apiRequest('/finance/adopt-local', { method: 'POST', body: JSON.stringify(input) });
}
