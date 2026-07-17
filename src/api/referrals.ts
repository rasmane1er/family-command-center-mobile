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
