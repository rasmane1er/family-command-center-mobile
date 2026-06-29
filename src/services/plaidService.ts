import * as SecureStore from 'expo-secure-store';
import type { PlaidTransaction, PlaidAccount } from '../types';

const API_BASE_URL = 'http://localhost:3000';

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
    throw new Error((body as any).error || (body as any).message || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function createLinkToken(redirectUri?: string): Promise<string> {
  const data = await authFetch<{ linkToken: string }>('/plaid/create-link-token', {
    method: 'POST',
    body: JSON.stringify(redirectUri ? { redirectUri } : {}),
  });
  return data.linkToken;
}

export async function exchangeToken(
  publicToken: string,
  institutionId?: string,
  institutionName?: string,
): Promise<{ success: boolean; institutionName: string }> {
  return authFetch('/plaid/exchange-token', {
    method: 'POST',
    body: JSON.stringify({ publicToken, institutionId, institutionName }),
  });
}

export async function syncPlaid(): Promise<{ synced: number }> {
  return authFetch('/plaid/sync', { method: 'POST' });
}

export async function getConnectedItems(): Promise<{
  items: Array<{
    id: string;
    institutionName: string | null;
    lastSyncedAt: string | null;
    createdAt: string;
  }>;
}> {
  return authFetch('/plaid/items');
}

export async function disconnectItem(id: string): Promise<void> {
  await authFetch(`/plaid/items/${id}`, { method: 'DELETE' });
}

export async function getTransactions(params?: {
  limit?: number;
  offset?: number;
  category?: string;
  search?: string;
  month?: string;
}): Promise<{ transactions: PlaidTransaction[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));
  if (params?.category) qs.set('category', params.category);
  if (params?.search) qs.set('search', params.search);
  if (params?.month) qs.set('month', params.month);
  const query = qs.toString();
  return authFetch(`/plaid/transactions${query ? `?${query}` : ''}`);
}

export async function getAccounts(): Promise<{ accounts: PlaidAccount[] }> {
  return authFetch('/plaid/accounts');
}

export async function getSpendingByCategory(month?: string): Promise<{
  month: string;
  categories: { category: string; total: number; count: number }[];
}> {
  const qs = month ? `?month=${month}` : '';
  return authFetch(`/plaid/spending/by-category${qs}`);
}

export async function getMonthlySpending(): Promise<{
  months: { month: string; total: number }[];
}> {
  return authFetch('/plaid/spending/monthly');
}
