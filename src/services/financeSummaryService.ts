import { apiRequest } from '../api/client';

export interface FinanceSummary {
  month: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
}

// Real income/expenses for the given month (defaults server-side to the
// current month), computed from actual Plaid + manual-ledger transactions —
// see financeSummary.ts on the API for why this replaced deriving these
// figures from the local (largely unpopulated) transactions array.
export function fetchFinanceSummary(month?: string): Promise<FinanceSummary> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return apiRequest(`/finance/summary${qs}`);
}
