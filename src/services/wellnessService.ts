import { apiRequest } from '../api/client';

export interface WeightEntry {
  id: string;
  familyId: string;
  memberId: string;
  weightLbs: number;
  date: string;
  createdAt: string;
}

export interface MealSuggestion {
  name: string;
  description: string;
}

export interface MealSuggestions {
  breakfast: MealSuggestion;
  lunch: MealSuggestion;
  dinner: MealSuggestion;
}

export function fetchWeightEntries(memberId: string): Promise<{ entries: WeightEntry[] }> {
  return apiRequest(`/wellness/members/${memberId}/weight-entries`);
}

export function logWeightEntry(memberId: string, weightLbs: number, date?: string): Promise<{ entry: WeightEntry }> {
  return apiRequest(`/wellness/members/${memberId}/weight-entries`, {
    method: 'POST',
    body: JSON.stringify({ weightLbs, date }),
  });
}

export function setWeightGoal(memberId: string, weightGoalLbs: number | null): Promise<{ weightGoalLbs: number | null }> {
  return apiRequest(`/wellness/members/${memberId}/weight-goal`, {
    method: 'PATCH',
    body: JSON.stringify({ weightGoalLbs }),
  });
}

export function fetchMealSuggestions(memberId: string): Promise<{ suggestions: MealSuggestions | null }> {
  return apiRequest('/ai/wellness-meal-suggestions', {
    method: 'POST',
    body: JSON.stringify({ memberId }),
  });
}
