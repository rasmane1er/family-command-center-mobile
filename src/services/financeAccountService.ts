import { apiRequest } from '../api/client';
import type { FinancialAccount } from '../types';

export function fetchAccounts(): Promise<{ accounts: FinancialAccount[] }> {
  return apiRequest('/finance/accounts');
}

export function createAccount(account: FinancialAccount): Promise<{ account: FinancialAccount }> {
  return apiRequest('/finance/accounts', { method: 'POST', body: JSON.stringify(account) });
}

export function updateAccountRemote(id: string, updates: Partial<FinancialAccount>): Promise<{ account: FinancialAccount }> {
  return apiRequest(`/finance/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteAccountRemote(id: string): Promise<void> {
  return apiRequest(`/finance/accounts/${id}`, { method: 'DELETE' });
}
