import * as SecureStore from 'expo-secure-store';
import type {
  DetectedDebt,
  PaymentDetection,
  Debt,
  PayoffStrategy,
  PayoffSummary,
  DebtPayoffPlan,
  PayoffPlanMonth,
} from '../types';

const API_BASE_URL = 'http://localhost:3000';

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await SecureStore.getItemAsync('access_token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = body as Record<string, unknown>;
    throw new Error((err['error'] as string) || (err['message'] as string) || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getDetectedDebtsFromPlaid(): Promise<{ detected: DetectedDebt[] }> {
  return authFetch('/debts/from-plaid');
}

export async function syncDebtBalances(
  pairs: Array<{ debtId: string; plaidAccountId: string }>,
): Promise<{ updates: Array<{ debtId: string; balance: number; updatedAt: string }> }> {
  return authFetch('/debts/sync-balances', {
    method: 'POST',
    body: JSON.stringify({ debts: pairs }),
  });
}

export async function getPaymentDetections(): Promise<{ detections: PaymentDetection[] }> {
  return authFetch('/debts/payment-detections');
}

// ─── Pure client-side payoff calculator ──────────────────────────────────────

function toYYYYMM(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + n, 1);
  return d;
}

export function calculatePayoffPlan(
  debts: Debt[],
  extraMonthlyBudget: number,
  strategy: PayoffStrategy,
): PayoffSummary {
  if (debts.length === 0) {
    const now = toYYYYMM(new Date());
    return {
      strategy,
      totalMonths: 0,
      payoffDate: now,
      totalInterestPaid: 0,
      totalPaid: 0,
      order: [],
      monthlyBudget: extraMonthlyBudget,
      plans: [],
    };
  }

  // Sort by strategy
  const sorted = [...debts].sort((a, b) => {
    if (strategy === 'avalanche') return b.interestRate - a.interestRate;
    return a.balance - b.balance;
  });

  const now = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // Per-debt running state
  const balances = sorted.map((d) => d.balance);
  const plans: DebtPayoffPlan[] = sorted.map((d, i) => ({
    debtId: d.id,
    debtName: d.name,
    strategy,
    months: [] as PayoffPlanMonth[],
    totalInterest: 0,
    payoffDate: '',
    monthsToPayoff: 0,
    _idx: i,
  })) as Array<DebtPayoffPlan & { _idx: number }>;

  const MAX_MONTHS = 600;
  let month = 0;
  let totalInterestPaid = 0;
  let totalPaid = 0;

  // Extra budget rolls to next active debt
  while (month < MAX_MONTHS && balances.some((b) => b > 0)) {
    // Compute extra this month: goes to first unpaid debt in order
    let rollingExtra = extraMonthlyBudget;

    for (let i = 0; i < sorted.length; i++) {
      if (balances[i] <= 0) {
        // Already paid off — roll its minimum into extra
        rollingExtra += sorted[i].minimumPayment;
        continue;
      }

      const debt = sorted[i];
      const monthDate = addMonths(now, month);
      const monthStr = toYYYYMM(monthDate);
      const interestRate = debt.interestRate; // stored as decimal e.g. 0.2199

      const interest = balances[i] * (interestRate / 12);
      // payment = min + extra (only first active debt gets extra)
      const rawPayment = debt.minimumPayment + rollingExtra;
      const payment = Math.min(rawPayment, balances[i] + interest);
      const principal = Math.max(0, payment - interest);
      balances[i] = Math.max(0, balances[i] - principal);

      const planEntry: PayoffPlanMonth = {
        month: monthStr,
        payment: Math.round(payment * 100) / 100,
        principal: Math.round(principal * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        remainingBalance: Math.round(balances[i] * 100) / 100,
      };

      (plans[i] as DebtPayoffPlan).months.push(planEntry);
      (plans[i] as DebtPayoffPlan).totalInterest += interest;
      totalInterestPaid += interest;
      totalPaid += payment;

      if (balances[i] <= 0) {
        (plans[i] as DebtPayoffPlan).payoffDate = monthStr;
        (plans[i] as DebtPayoffPlan).monthsToPayoff = month + 1;
        // Roll this debt's minimum to next
        rollingExtra += debt.minimumPayment;
      }

      // Extra only goes to the FIRST active debt
      rollingExtra = 0;
    }

    month++;
  }

  // Finalize plans
  for (const plan of plans) {
    plan.totalInterest = Math.round(plan.totalInterest * 100) / 100;
    if (!plan.payoffDate) plan.payoffDate = toYYYYMM(addMonths(now, month));
    if (!plan.monthsToPayoff) plan.monthsToPayoff = month;
  }

  const maxMonths = Math.max(...plans.map((p) => p.monthsToPayoff));
  const payoffDate = toYYYYMM(addMonths(now, maxMonths));

  return {
    strategy,
    totalMonths: maxMonths,
    payoffDate,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    order: sorted.map((d) => d.name),
    monthlyBudget: extraMonthlyBudget + debts.reduce((s, d) => s + d.minimumPayment, 0),
    plans,
  };
}
