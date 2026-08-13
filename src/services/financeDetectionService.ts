import { apiRequest } from '../api/client';

export type DetectionKind = 'bill' | 'subscription' | 'budget' | 'debt' | 'asset' | 'insurance' | 'utility';

export interface DetectionDismissal {
  id: string;
  familyId: string;
  kind: DetectionKind;
  matchKey: string;
  createdAt: string;
}

export function fetchDismissals(): Promise<{ dismissals: DetectionDismissal[] }> {
  return apiRequest('/finance/detections/dismissals');
}

export function dismissDetection(kind: DetectionKind, matchKey: string): Promise<{ dismissal: DetectionDismissal }> {
  return apiRequest('/finance/detections/dismiss', { method: 'POST', body: JSON.stringify({ kind, matchKey }) });
}

export function undismissDetection(kind: DetectionKind, matchKey: string): Promise<void> {
  return apiRequest(`/finance/detections/dismiss/${kind}/${encodeURIComponent(matchKey)}`, { method: 'DELETE' });
}
