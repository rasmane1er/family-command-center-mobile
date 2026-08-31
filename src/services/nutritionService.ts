import { apiRequest } from '../api/client';
import type { FoodEntry, NutritionGoal } from '../store/useNutritionStore';

export function fetchFoodEntries(): Promise<{ entries: FoodEntry[] }> {
  return apiRequest('/nutrition/entries');
}

export function createFoodEntry(entry: Omit<FoodEntry, 'id' | 'createdAt' | 'familyId'>): Promise<{ entry: FoodEntry }> {
  return apiRequest('/nutrition/entries', { method: 'POST', body: JSON.stringify(entry) });
}

export function deleteFoodEntry(id: string): Promise<void> {
  return apiRequest(`/nutrition/entries/${id}`, { method: 'DELETE' });
}

export function fetchNutritionGoals(): Promise<{ goals: NutritionGoal[] }> {
  return apiRequest('/nutrition/goals');
}

export function saveNutritionGoal(
  memberId: string,
  goal: Omit<NutritionGoal, 'id' | 'familyId' | 'memberId' | 'updatedAt'>,
): Promise<{ goal: NutritionGoal }> {
  return apiRequest(`/nutrition/goals/${memberId}`, { method: 'PUT', body: JSON.stringify(goal) });
}
