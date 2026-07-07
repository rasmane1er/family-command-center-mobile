import { apiRequest } from '../api/client';
import type { SmartDevice } from '../types';

export function fetchDevices(): Promise<{ devices: SmartDevice[] }> {
  return apiRequest('/smart-home/devices');
}

export function createDevice(device: SmartDevice): Promise<{ device: SmartDevice }> {
  return apiRequest('/smart-home/devices', { method: 'POST', body: JSON.stringify(device) });
}

export function updateDeviceRemote(id: string, updates: Partial<SmartDevice>): Promise<{ device: SmartDevice }> {
  return apiRequest(`/smart-home/devices/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteDeviceRemote(id: string): Promise<void> {
  return apiRequest(`/smart-home/devices/${id}`, { method: 'DELETE' });
}
