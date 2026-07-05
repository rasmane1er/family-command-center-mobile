import { apiRequest } from '../api/client';
import type { Asset } from '../types';

export function fetchAssets(): Promise<{ assets: Asset[] }> {
  return apiRequest('/assets');
}

export function createAsset(asset: Asset): Promise<{ asset: Asset }> {
  return apiRequest('/assets', { method: 'POST', body: JSON.stringify(asset) });
}

export function updateAssetRemote(id: string, updates: Partial<Asset>): Promise<{ asset: Asset }> {
  return apiRequest(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteAssetRemote(id: string): Promise<void> {
  return apiRequest(`/assets/${id}`, { method: 'DELETE' });
}
