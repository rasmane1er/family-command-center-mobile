import { apiRequest } from '../api/client';
import type { AllowanceConfig, AllowanceTransaction } from '../store/useAllowanceStore';

export function fetchAllowance(): Promise<{ configs: AllowanceConfig[]; transactions: AllowanceTransaction[] }> {
  return apiRequest('/allowance');
}

export function createConfig(c: AllowanceConfig): Promise<{ config: AllowanceConfig }> {
  return apiRequest('/allowance/configs', { method: 'POST', body: JSON.stringify(c) });
}

export function updateConfigRemote(id: string, updates: Partial<AllowanceConfig>): Promise<{ config: AllowanceConfig }> {
  return apiRequest(`/allowance/configs/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteConfigRemote(id: string): Promise<void> {
  return apiRequest(`/allowance/configs/${id}`, { method: 'DELETE' });
}

export function createTransaction(tx: AllowanceTransaction): Promise<{ transaction: AllowanceTransaction; config: AllowanceConfig | null }> {
  return apiRequest('/allowance/transactions', { method: 'POST', body: JSON.stringify(tx) });
}
