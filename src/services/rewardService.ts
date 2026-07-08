import { apiRequest } from '../api/client';
import type { Reward } from '../types';

export function fetchRewards(): Promise<{ rewards: Reward[] }> {
  return apiRequest('/rewards');
}

export function createReward(reward: Reward): Promise<{ reward: Reward }> {
  return apiRequest('/rewards', { method: 'POST', body: JSON.stringify(reward) });
}

export function updateRewardRemote(id: string, updates: Partial<Reward>): Promise<{ reward: Reward }> {
  return apiRequest(`/rewards/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteRewardRemote(id: string): Promise<void> {
  return apiRequest(`/rewards/${id}`, { method: 'DELETE' });
}

// Backs clearRewardHistory — deletes every reward record for one member in
// a single call instead of one DELETE per row.
export function deleteRewardsByMember(memberId: string): Promise<void> {
  return apiRequest(`/rewards?memberId=${encodeURIComponent(memberId)}`, { method: 'DELETE' });
}
