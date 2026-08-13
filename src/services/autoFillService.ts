import * as SecureStore from 'expo-secure-store';
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
    const errBody = body as Record<string, unknown>;
    throw new Error(
      (errBody.error as string | undefined) ??
        (errBody.message as string | undefined) ??
        `HTTP ${response.status}`,
    );
  }
  return response.json() as Promise<T>;
}

export interface DetectedBill {
  merchantName: string;
  merchantKey: string;
  amount: number;
  category: string;
  lastDate: string;
  nextDueDate: string;
  occurrences: number;
}

export interface BudgetSuggestion {
  category: string;
  monthlyAverage: number;
  monthlyMin: number;
  monthlyMax: number;
}

export interface DetectedUtility {
  merchantName: string;
  amount: number;
  date: string;
  category: string;
  type: string;
}

export interface DetectedInsurance {
  merchantName: string;
  amount: number;
  frequency: 'monthly' | 'annual';
  lastDate: string;
  type: string;
}

export interface PlaidInvestmentAccount {
  plaidAccountId: string;
  name: string;
  officialName: string | null;
  balance: number;
  mask: string | null;
}

export async function getDetectedBills(): Promise<{ bills: DetectedBill[] }> {
  return authFetch('/plaid/autofill/bills');
}

export async function getBudgetSuggestions(): Promise<{ suggestions: BudgetSuggestion[] }> {
  return authFetch('/plaid/autofill/budget-suggestions');
}

export async function getDetectedUtilities(month?: string): Promise<{ utilities: DetectedUtility[] }> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return authFetch(`/plaid/autofill/utilities${qs}`);
}

export async function getDetectedInsurance(): Promise<{ insurance: DetectedInsurance[] }> {
  return authFetch('/plaid/autofill/insurance');
}

export async function getInvestmentAccounts(): Promise<{ accounts: PlaidInvestmentAccount[] }> {
  return authFetch('/plaid/autofill/investment-accounts');
}

// ─── New autofill types and functions ─────────────────────────────────────────

export interface TravelCharge {
  merchantName: string;
  amount: number;
  date: string;
  suggestedType: string;
}

export interface RetailPurchase {
  merchantName: string;
  amount: number;
  date: string;
  suggestedCategory: string;
}

export interface PetCharge {
  merchantName: string;
  amount: number;
  date: string;
  isVetVisit: boolean;
}

export interface CaregiverPayment {
  merchantName: string;
  amount: number;
  date: string;
  matchedName: string;
}

export async function getTravelCharges(startDate: string, endDate: string): Promise<{ charges: TravelCharge[] }> {
  return authFetch(`/plaid/autofill/travel-charges?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
}

export async function getRetailPurchases(minAmount = 100, days = 30): Promise<{ purchases: RetailPurchase[] }> {
  return authFetch(`/plaid/autofill/retail-purchases?minAmount=${minAmount}&days=${days}`);
}

export async function getPetCharges(): Promise<{ charges: PetCharge[] }> {
  return authFetch('/plaid/autofill/pet-charges');
}

export async function getCaregiverPayments(caregiverNames: string[]): Promise<{ payments: CaregiverPayment[] }> {
  const names = caregiverNames.join(',');
  return authFetch(`/plaid/autofill/caregiver-payments?names=${encodeURIComponent(names)}`);
}
