import { apiRequest } from '../api/client';
import type { Bill } from '../types';

export function fetchBills(): Promise<{ bills: Bill[] }> {
  return apiRequest('/finance/bills');
}

export function createBill(bill: Bill): Promise<{ bill: Bill }> {
  return apiRequest('/finance/bills', { method: 'POST', body: JSON.stringify(bill) });
}

export function updateBillRemote(id: string, updates: Partial<Bill>): Promise<{ bill: Bill }> {
  return apiRequest(`/finance/bills/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteBillRemote(id: string): Promise<void> {
  return apiRequest(`/finance/bills/${id}`, { method: 'DELETE' });
}

export function payBillRemote(id: string): Promise<{ bill: Bill }> {
  return apiRequest(`/finance/bills/${id}/pay`, { method: 'POST' });
}
