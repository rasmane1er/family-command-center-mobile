import type { AccountType } from '../types';

export type BalanceFreshness = 'current' | 'needs_review' | 'outdated' | 'estimated';

// Recommended confirmation cadence per account type (days) — checking/credit/
// cash accounts see more day-to-day activity than savings/investment.
const REVIEW_FREQUENCY_DAYS: Record<AccountType, number> = {
  checking: 7,
  credit: 7,
  cash: 7,
  savings: 30,
  investment: 30,
};

export function reviewFrequencyDays(type: AccountType): number {
  return REVIEW_FREQUENCY_DAYS[type];
}

// `referenceDate` is lastVerifiedAt if the account has ever been confirmed,
// otherwise openingBalanceDate — a brand-new account with no activity yet
// starts out accurate by definition.
export function balanceFreshness(
  type: AccountType,
  referenceDate: string,
  hasUnconfirmedActivity: boolean,
): BalanceFreshness {
  const days = (Date.now() - new Date(referenceDate).getTime()) / 86_400_000;
  const frequency = reviewFrequencyDays(type);

  if (days > frequency * 3) return 'outdated';
  if (days > frequency) return 'needs_review';
  if (hasUnconfirmedActivity) return 'estimated';
  return 'current';
}

export const FRESHNESS_LABEL: Record<BalanceFreshness, string> = {
  current: 'Current',
  needs_review: 'Needs review',
  outdated: 'Outdated',
  estimated: 'Estimated',
};

export const FRESHNESS_COLOR: Record<BalanceFreshness, string> = {
  current: '#10B981',
  needs_review: '#F59E0B',
  outdated: '#EF4444',
  estimated: '#3B82F6',
};
