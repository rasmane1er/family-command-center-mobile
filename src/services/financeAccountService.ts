import { apiRequest } from '../api/client';
import type { FinancialAccount, AccountTransaction, RecurringAccountTransaction } from '../types';

export function fetchAccounts(): Promise<{ accounts: FinancialAccount[] }> {
  return apiRequest('/finance/accounts');
}

export function createAccount(account: FinancialAccount): Promise<{ account: FinancialAccount }> {
  return apiRequest('/finance/accounts', { method: 'POST', body: JSON.stringify(account) });
}

// `balance` is intentionally excluded from what the server accepts here —
// see UpdateSchema in financeAccounts.ts. Use confirmBalance() to reconcile.
export function updateAccountRemote(id: string, updates: Partial<FinancialAccount>): Promise<{ account: FinancialAccount }> {
  return apiRequest(`/finance/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteAccountRemote(id: string): Promise<void> {
  return apiRequest(`/finance/accounts/${id}`, { method: 'DELETE' });
}

export function confirmAccountBalance(
  id: string,
  actualBalance: number,
  reason?: string,
): Promise<{ account: FinancialAccount }> {
  return apiRequest(`/finance/accounts/${id}/confirm-balance`, {
    method: 'POST',
    body: JSON.stringify({ actualBalance, reason }),
  });
}

export function fetchAccountTransactions(accountId: string): Promise<{ transactions: AccountTransaction[] }> {
  return apiRequest(`/finance/accounts/${accountId}/transactions`);
}

export interface CreateAccountTransactionInput {
  type: 'INCOME' | 'EXPENSE' | 'ADJUSTMENT';
  amount: number;
  date: string;
  status?: 'PENDING' | 'CLEARED' | 'SKIPPED' | 'RECONCILED';
  category?: string;
  merchant?: string;
  notes?: string;
  transferToAccountId?: string;
}

export function createAccountTransaction(
  accountId: string,
  input: CreateAccountTransactionInput,
): Promise<{ balance: number; transferAccountBalance?: number }> {
  return apiRequest(`/finance/accounts/${accountId}/transactions`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateAccountTransaction(
  accountId: string,
  id: string,
  updates: Partial<CreateAccountTransactionInput>,
): Promise<{ balance: number }> {
  return apiRequest(`/finance/accounts/${accountId}/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteAccountTransaction(accountId: string, id: string): Promise<{ balance: number }> {
  return apiRequest(`/finance/accounts/${accountId}/transactions/${id}`, { method: 'DELETE' });
}

export function fetchRecurringTransactions(accountId: string): Promise<{ rules: RecurringAccountTransaction[] }> {
  return apiRequest(`/finance/accounts/${accountId}/recurring`);
}

export interface CreateRecurringInput {
  name: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  category?: string;
}

export function createRecurringTransaction(
  accountId: string,
  input: CreateRecurringInput,
): Promise<{ rule: RecurringAccountTransaction }> {
  return apiRequest(`/finance/accounts/${accountId}/recurring`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateRecurringTransaction(
  accountId: string,
  id: string,
  updates: Partial<CreateRecurringInput> & { isActive?: boolean },
): Promise<{ rule: RecurringAccountTransaction }> {
  return apiRequest(`/finance/accounts/${accountId}/recurring/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteRecurringTransaction(accountId: string, id: string): Promise<void> {
  return apiRequest(`/finance/accounts/${accountId}/recurring/${id}`, { method: 'DELETE' });
}

export function confirmRecurringTransaction(accountId: string, id: string): Promise<{ balance: number }> {
  return apiRequest(`/finance/accounts/${accountId}/recurring/${id}/confirm`, { method: 'POST' });
}

export function skipRecurringTransaction(accountId: string, id: string): Promise<void> {
  return apiRequest(`/finance/accounts/${accountId}/recurring/${id}/skip`, { method: 'POST' });
}
