import { apiRequest } from '../api/client';
import type { InsurancePolicy } from '../store/useInsuranceStore';

export function fetchPolicies(): Promise<{ policies: InsurancePolicy[] }> {
  return apiRequest('/insurance/policies');
}

export function createPolicy(p: InsurancePolicy): Promise<{ policy: InsurancePolicy }> {
  return apiRequest('/insurance/policies', { method: 'POST', body: JSON.stringify(p) });
}

export function updatePolicyRemote(id: string, updates: Partial<InsurancePolicy>): Promise<{ policy: InsurancePolicy }> {
  return apiRequest(`/insurance/policies/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deletePolicyRemote(id: string): Promise<void> {
  return apiRequest(`/insurance/policies/${id}`, { method: 'DELETE' });
}
