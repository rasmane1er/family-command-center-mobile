import { apiRequest } from '../api/client';
import type { ShoppingItem } from '../store/useShoppingStore';

export function fetchItems(): Promise<{ items: ShoppingItem[]; budget: number }> {
  return apiRequest('/shopping/items');
}

export function createItem(item: ShoppingItem): Promise<{ item: ShoppingItem }> {
  return apiRequest('/shopping/items', { method: 'POST', body: JSON.stringify(item) });
}

export function updateItemRemote(id: string, updates: Partial<ShoppingItem>): Promise<{ item: ShoppingItem }> {
  return apiRequest(`/shopping/items/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteItemRemote(id: string): Promise<void> {
  return apiRequest(`/shopping/items/${id}`, { method: 'DELETE' });
}

export function updateBudgetRemote(amount: number): Promise<{ budget: number }> {
  return apiRequest('/shopping/budget', { method: 'PATCH', body: JSON.stringify({ amount }) });
}
