import { apiRequest } from '../api/client';
import type { SafetyCheckItem } from '../store/useEmergencyStore';

export interface EmergencyPreparedness {
  checklist: SafetyCheckItem[];
  kit: SafetyCheckItem[];
  meetingPoint?: string;
}

export function fetchEmergencyPreparedness(): Promise<{ preparedness: EmergencyPreparedness | null }> {
  return apiRequest('/emergency-preparedness');
}

export function saveEmergencyPreparedness(data: Partial<EmergencyPreparedness>): Promise<{ preparedness: EmergencyPreparedness }> {
  return apiRequest('/emergency-preparedness', { method: 'PUT', body: JSON.stringify(data) });
}
