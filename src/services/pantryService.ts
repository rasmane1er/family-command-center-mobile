import { apiRequest } from '../api/client';
import type { PantryItem } from '../types';

export function fetchPantryItems(): Promise<{ items: PantryItem[] }> {
  return apiRequest('/pantry');
}

export function createPantryItem(item: PantryItem): Promise<{ item: PantryItem }> {
  return apiRequest('/pantry', { method: 'POST', body: JSON.stringify(item) });
}

export function updatePantryItemRemote(id: string, updates: Partial<PantryItem>): Promise<{ item: PantryItem }> {
  return apiRequest(`/pantry/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deletePantryItemRemote(id: string): Promise<void> {
  return apiRequest(`/pantry/${id}`, { method: 'DELETE' });
}

// Used by the receipt-scan and AI-camera-scan flows, where the user confirms
// a whole batch of detected items at once.
export function createPantryItemsBulk(items: PantryItem[]): Promise<{ items: PantryItem[] }> {
  return apiRequest('/pantry/bulk', { method: 'POST', body: JSON.stringify({ items }) });
}

export interface DetectedPantryItem {
  name: string;
  category: string;
}

// AI-camera mode: sends a fridge/pantry photo to the same Gemini vision
// pipeline the receipt scanner uses, but prompted to list distinct grocery
// items instead of extracting a single receipt total.
export function scanPantryPhoto(imageBase64: string): Promise<{ items: DetectedPantryItem[] }> {
  return apiRequest('/pantry/scan-photo', { method: 'POST', body: JSON.stringify({ imageBase64 }) });
}
