import { apiRequest } from './client';

export interface ReferralStats {
  referralCode: string;
  creditsAvailable: number;
  stats: {
    sent: number;
    subscribed: number;
    creditsEarned: number;
    toNextReward: number;
  };
}

export async function getReferralInfo(): Promise<ReferralStats> {
  return apiRequest<ReferralStats>('/referrals/me');
}

// Reports a completed "Share Invite Link" action, incrementing the family's
// server-side share counter (returned as stats.sent by getReferralInfo).
export async function reportReferralShare(): Promise<{ sent: number }> {
  return apiRequest<{ sent: number }>('/referrals/share', { method: 'POST' });
}
