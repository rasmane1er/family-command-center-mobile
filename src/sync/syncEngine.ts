import { apiRequest } from '../api/client';

export async function syncFamilyState(payload: unknown) {
  return apiRequest('/sync/family', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchFamilyState() {
  return apiRequest('/sync/family', {
    method: 'GET',
  });
}