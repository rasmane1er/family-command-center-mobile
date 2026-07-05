import { apiRequest } from '../api/client';
import type { UtilityBill } from '../store/useUtilityStore';

export function fetchBills(): Promise<{ bills: UtilityBill[] }> {
  return apiRequest('/utility/bills');
}

export function createBill(b: UtilityBill): Promise<{ bill: UtilityBill }> {
  return apiRequest('/utility/bills', { method: 'POST', body: JSON.stringify(b) });
}

export function updateBillRemote(id: string, updates: Partial<UtilityBill>): Promise<{ bill: UtilityBill }> {
  return apiRequest(`/utility/bills/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteBillRemote(id: string): Promise<void> {
  return apiRequest(`/utility/bills/${id}`, { method: 'DELETE' });
}
