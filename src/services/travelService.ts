import { apiRequest } from '../api/client';
import type { Trip } from '../store/useTravelStore';

export function fetchTrips(): Promise<{ trips: Trip[] }> {
  return apiRequest('/travel/trips');
}

export function createTrip(t: Trip): Promise<{ trip: Trip }> {
  return apiRequest('/travel/trips', { method: 'POST', body: JSON.stringify(t) });
}

export function updateTripRemote(id: string, updates: Partial<Trip>): Promise<{ trip: Trip }> {
  return apiRequest(`/travel/trips/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteTripRemote(id: string): Promise<void> {
  return apiRequest(`/travel/trips/${id}`, { method: 'DELETE' });
}
