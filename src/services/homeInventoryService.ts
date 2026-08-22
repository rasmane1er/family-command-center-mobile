import { apiRequest } from '../api/client';
import type { InventoryItem } from '../store/useHomeInventoryStore';

export function fetchInventoryItems(): Promise<{ items: InventoryItem[] }> {
  return apiRequest('/home-inventory');
}

export function createInventoryItem(item: InventoryItem): Promise<{ item: InventoryItem }> {
  return apiRequest('/home-inventory', { method: 'POST', body: JSON.stringify(item) });
}

export function updateInventoryItemRemote(id: string, updates: Partial<InventoryItem>): Promise<{ item: InventoryItem }> {
  return apiRequest(`/home-inventory/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteInventoryItemRemote(id: string): Promise<void> {
  return apiRequest(`/home-inventory/${id}`, { method: 'DELETE' });
}
