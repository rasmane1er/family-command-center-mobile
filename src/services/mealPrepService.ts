import { apiRequest } from '../api/client';
import type { PrepSession, PrepItem, PrepIngredient } from '../store/useMealPrepStore';

export function fetchSessions(): Promise<{ sessions: PrepSession[] }> {
  return apiRequest('/meal-prep/sessions');
}

export function createSession(session: PrepSession): Promise<{ session: PrepSession }> {
  return apiRequest('/meal-prep/sessions', { method: 'POST', body: JSON.stringify(session) });
}

export function updateSessionRemote(id: string, updates: Partial<PrepSession>): Promise<{ session: PrepSession }> {
  return apiRequest(`/meal-prep/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteSessionRemote(id: string): Promise<void> {
  return apiRequest(`/meal-prep/sessions/${id}`, { method: 'DELETE' });
}

export function fetchPrepItems(): Promise<{ items: PrepItem[] }> {
  return apiRequest('/meal-prep/items');
}

export function createPrepItem(item: PrepItem): Promise<{ item: PrepItem }> {
  return apiRequest('/meal-prep/items', { method: 'POST', body: JSON.stringify(item) });
}

export function completePrepItemRemote(id: string): Promise<{ item: PrepItem }> {
  return apiRequest(`/meal-prep/items/${id}`, { method: 'PATCH' });
}

export function deletePrepItemRemote(id: string): Promise<void> {
  return apiRequest(`/meal-prep/items/${id}`, { method: 'DELETE' });
}

export function fetchPrepIngredients(): Promise<{ ingredients: PrepIngredient[] }> {
  return apiRequest('/meal-prep/ingredients');
}

export function createPrepIngredient(ingredient: PrepIngredient): Promise<{ ingredient: PrepIngredient }> {
  return apiRequest('/meal-prep/ingredients', { method: 'POST', body: JSON.stringify(ingredient) });
}

export function togglePrepIngredientPurchasedRemote(id: string): Promise<{ ingredient: PrepIngredient }> {
  return apiRequest(`/meal-prep/ingredients/${id}`, { method: 'PATCH' });
}

export function deletePrepIngredientRemote(id: string): Promise<void> {
  return apiRequest(`/meal-prep/ingredients/${id}`, { method: 'DELETE' });
}
