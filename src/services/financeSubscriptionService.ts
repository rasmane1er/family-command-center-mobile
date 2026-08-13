import { apiRequest } from '../api/client';
import type { Subscription } from '../types';

// Persistence only — detection logic (grouping Plaid transactions into
// recurring-charge candidates) stays in subscriptionDetectionService.ts.
export function fetchSubscriptions(): Promise<{ subscriptions: Subscription[] }> {
  return apiRequest('/finance/subscriptions');
}

export function createSubscription(subscription: Subscription): Promise<{ subscription: Subscription }> {
  return apiRequest('/finance/subscriptions', { method: 'POST', body: JSON.stringify(subscription) });
}

export function updateSubscriptionRemote(id: string, updates: Partial<Subscription>): Promise<{ subscription: Subscription }> {
  return apiRequest(`/finance/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteSubscriptionRemote(id: string): Promise<void> {
  return apiRequest(`/finance/subscriptions/${id}`, { method: 'DELETE' });
}
