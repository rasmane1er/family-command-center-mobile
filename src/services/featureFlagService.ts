import { apiRequest } from '../api/client';

export function fetchFeatureFlags(): Promise<{ flags: Record<string, boolean> }> {
  return apiRequest('/feature-flags');
}
