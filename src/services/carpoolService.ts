import { apiRequest } from '../api/client';
import type { CarpoolRoute } from '../store/useCarpoolStore';

export function fetchRoutes(): Promise<{ routes: CarpoolRoute[] }> {
  return apiRequest('/carpool/routes');
}

export function createRoute(route: CarpoolRoute): Promise<{ route: CarpoolRoute }> {
  return apiRequest('/carpool/routes', { method: 'POST', body: JSON.stringify(route) });
}

export function updateRouteRemote(id: string, updates: Partial<CarpoolRoute>): Promise<{ route: CarpoolRoute }> {
  return apiRequest(`/carpool/routes/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteRouteRemote(id: string): Promise<void> {
  return apiRequest(`/carpool/routes/${id}`, { method: 'DELETE' });
}
