import { apiRequest } from '../api/client';
import type { AutomationRule } from '../types';

export function fetchAutomationRules(): Promise<{ rules: AutomationRule[] }> {
  return apiRequest('/automation-rules');
}

export function createAutomationRule(rule: AutomationRule): Promise<{ rule: AutomationRule }> {
  return apiRequest('/automation-rules', { method: 'POST', body: JSON.stringify(rule) });
}

export function updateAutomationRuleRemote(id: string, updates: Partial<AutomationRule>): Promise<{ rule: AutomationRule }> {
  return apiRequest(`/automation-rules/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteAutomationRuleRemote(id: string): Promise<void> {
  return apiRequest(`/automation-rules/${id}`, { method: 'DELETE' });
}
