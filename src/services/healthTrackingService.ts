import { apiRequest } from '../api/client';
import type { HealthRecord, HealthGoal, HealthAppointment } from '../types';

export function fetchHealthRecords(): Promise<{ records: HealthRecord[] }> {
  return apiRequest('/health-tracking/records');
}

export function createHealthRecord(record: Omit<HealthRecord, 'id' | 'familyId'>): Promise<{ record: HealthRecord }> {
  return apiRequest('/health-tracking/records', { method: 'POST', body: JSON.stringify(record) });
}

export function fetchHealthGoals(): Promise<{ goals: HealthGoal[] }> {
  return apiRequest('/health-tracking/goals');
}

export function createHealthGoal(goal: Omit<HealthGoal, 'id'>): Promise<{ goal: HealthGoal }> {
  return apiRequest('/health-tracking/goals', { method: 'POST', body: JSON.stringify(goal) });
}

export function updateHealthGoalProgress(id: string, current: number): Promise<{ goal: HealthGoal }> {
  return apiRequest(`/health-tracking/goals/${id}`, { method: 'PATCH', body: JSON.stringify({ current }) });
}

export function fetchHealthAppointments(): Promise<{ appointments: HealthAppointment[] }> {
  return apiRequest('/health-tracking/appointments');
}

export function createHealthAppointment(appointment: Omit<HealthAppointment, 'id'>): Promise<{ appointment: HealthAppointment }> {
  return apiRequest('/health-tracking/appointments', { method: 'POST', body: JSON.stringify(appointment) });
}

export function deleteHealthAppointment(id: string): Promise<void> {
  return apiRequest(`/health-tracking/appointments/${id}`, { method: 'DELETE' });
}
