import { apiRequest } from './client';

type SyncEntity = 'family' | 'finance' | 'operations' | 'activities' | 'notifications' | 'ai';
type SyncAction = 'create' | 'update' | 'delete' | 'sync';

export async function pushSyncEvent(entity: SyncEntity, action: SyncAction, payload: unknown): Promise<void> {
  try {
    await apiRequest('/sync/queue', {
      method: 'POST',
      body: JSON.stringify({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        entity, action, payload,
        createdAt: new Date().toISOString(),
      }),
    });
  } catch {}
}
