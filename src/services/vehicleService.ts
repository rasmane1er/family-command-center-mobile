import { apiRequest } from '../api/client';
import type { Vehicle } from '../types';

export function fetchVehicles(): Promise<{ vehicles: Vehicle[] }> {
  return apiRequest('/vehicles');
}

export function createVehicle(vehicle: Vehicle): Promise<{ vehicle: Vehicle }> {
  return apiRequest('/vehicles', { method: 'POST', body: JSON.stringify(vehicle) });
}

export function updateVehicleRemote(id: string, updates: Partial<Vehicle>): Promise<{ vehicle: Vehicle }> {
  return apiRequest(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteVehicleRemote(id: string): Promise<void> {
  return apiRequest(`/vehicles/${id}`, { method: 'DELETE' });
}
