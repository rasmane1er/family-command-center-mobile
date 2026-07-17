import * as SecureStore from 'expo-secure-store';
import { useFinanceStore } from '../store/useFinanceStore';
import type { Subscription } from '../types';
import { API_BASE_URL } from '../config/api';

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await SecureStore.getItemAsync('access_token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as Record<string, string>).error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export interface DetectedSubscription {
  merchantName: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'quarterly';
  lastChargedDate: string;
  nextExpectedDate: string;
  occurrences: number;
  category: string;
  totalSpent: number;
}

export async function getDetectedSubscriptions(): Promise<{ subscriptions: DetectedSubscription[] }> {
  return authFetch('/plaid/detected-subscriptions');
}

import { generateId } from '../utils/generateId';

export function confirmSubscription(detected: DetectedSubscription): void {
  const { addSubscription } = useFinanceStore.getState();
  const intervalDays = detected.frequency === 'monthly' ? 30 : detected.frequency === 'weekly' ? 7 : 91;
  const nextBillingDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

  const billingCycleMap: Record<DetectedSubscription['frequency'], Subscription['billingCycle']> = {
    monthly: 'monthly',
    weekly: 'monthly',
    quarterly: 'quarterly',
  };

  const sub: Subscription = {
    id: generateId(),
    familyId: 'demo-family',
    name: detected.merchantName,
    amount: detected.amount,
    billingCycle: billingCycleMap[detected.frequency],
    nextBillingDate,
    category: detected.category,
    isActive: true,
    sharedMembers: [],
    icon: 'apps-outline',
    color: '#4A90D9',
  };
  addSubscription(sub);
}
