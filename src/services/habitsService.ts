import { apiRequest } from '../api/client';
import type { Habit } from '../store/useHabitsStore';

export function fetchHabits(): Promise<{ habits: Habit[] }> {
  return apiRequest('/habits');
}

export function createHabit(habit: Habit): Promise<{ habit: Habit }> {
  return apiRequest('/habits', { method: 'POST', body: JSON.stringify(habit) });
}

export function updateHabitRemote(id: string, updates: Partial<Habit>): Promise<{ habit: Habit }> {
  return apiRequest(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteHabitRemote(id: string): Promise<void> {
  return apiRequest(`/habits/${id}`, { method: 'DELETE' });
}
