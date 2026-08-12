import { apiRequest } from '../api/client';
import { syncQueue, type SyncAction } from './syncQueue';

async function drainGroup(items: SyncAction[]): Promise<void> {
  for (const item of items) {
    try {
      await apiRequest('/sync/queue', {
        method: 'POST',
        body: JSON.stringify(item),
      });

      syncQueue.remove(item.id);
    } catch {
      // Stop this entity's queue on first failure — a later item may depend
      // on this one's ordering (e.g. an update queued after a create) — but
      // let other entities' groups keep draining independently below.
      break;
    }
  }
}

export async function processSyncQueue() {
  const queue = syncQueue.all();

  const groups = new Map<string, SyncAction[]>();
  for (const item of queue) {
    const group = groups.get(item.entity);
    if (group) group.push(item);
    else groups.set(item.entity, [item]);
  }

  // Different entities have no ordering relationship to each other, so drain
  // them concurrently instead of one HTTP round-trip at a time for the whole
  // queue — same-entity items stay strictly ordered within their own group.
  await Promise.allSettled([...groups.values()].map(drainGroup));
}
