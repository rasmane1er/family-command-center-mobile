import { apiRequest } from '../api/client';
import type { BucketItem } from '../store/useBucketListStore';

function toLocalItem(raw: any): BucketItem {
  return {
    ...raw,
    completedDate: raw.completedDate ? new Date(raw.completedDate).toISOString() : undefined,
    createdAt: new Date(raw.createdAt).toISOString(),
  };
}

export async function fetchBucketItems(): Promise<BucketItem[]> {
  const res = await apiRequest('/bucket-list') as { items: any[] };
  return res.items.map(toLocalItem);
}

export async function createBucketItem(item: Omit<BucketItem, 'id' | 'createdAt'>): Promise<BucketItem> {
  const res = await apiRequest('/bucket-list', {
    method: 'POST',
    body: JSON.stringify(item),
  }) as { item: any };
  return toLocalItem(res.item);
}

export async function updateBucketItem(id: string, updates: Partial<BucketItem>): Promise<BucketItem> {
  const res = await apiRequest(`/bucket-list/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }) as { item: any };
  return toLocalItem(res.item);
}

export async function deleteBucketItem(id: string): Promise<void> {
  await apiRequest(`/bucket-list/${id}`, { method: 'DELETE' });
}
