import { apiRequest } from '../api/client';
import type { TimeBlock, ConflictRecord } from '../types';

export function fetchTimeBlocks(): Promise<{ timeBlocks: TimeBlock[] }> {
  return apiRequest('/time-blocks');
}

export function createTimeBlock(block: TimeBlock): Promise<{ timeBlock: TimeBlock }> {
  return apiRequest('/time-blocks', { method: 'POST', body: JSON.stringify(block) });
}

export function deleteTimeBlockRemote(id: string): Promise<void> {
  return apiRequest(`/time-blocks/${id}`, { method: 'DELETE' });
}

export function fetchConflicts(): Promise<{ conflicts: ConflictRecord[] }> {
  return apiRequest('/conflicts');
}

export function createConflict(conflict: ConflictRecord): Promise<{ conflict: ConflictRecord }> {
  return apiRequest('/conflicts', { method: 'POST', body: JSON.stringify(conflict) });
}

export function updateConflictRemote(id: string, updates: Partial<ConflictRecord>): Promise<{ conflict: ConflictRecord }> {
  return apiRequest(`/conflicts/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}
