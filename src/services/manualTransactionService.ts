import { apiRequest } from '../api/client';
import type { Transaction } from '../types';

// A manually-entered transaction (cash spending, receipt scans) — distinct
// from financeAccountService's AccountTransaction, the real Plaid-synced
// bank ledger.
export function fetchManualTransactions(): Promise<{ transactions: Transaction[] }> {
  return apiRequest('/manual-transactions');
}

export function createManualTransaction(transaction: Transaction): Promise<{ transaction: Transaction }> {
  return apiRequest('/manual-transactions', { method: 'POST', body: JSON.stringify(transaction) });
}

export function deleteManualTransactionRemote(id: string): Promise<void> {
  return apiRequest(`/manual-transactions/${id}`, { method: 'DELETE' });
}
