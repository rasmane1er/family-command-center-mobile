import { apiRequest } from '../api/client';
import { syncQueue } from './syncQueue';

export async function processSyncQueue() {
  const queue = syncQueue.all();

  for (const item of queue) {
    try {
      await apiRequest('/sync/queue', {
        method: 'POST',
        body: JSON.stringify(item),
      });

      syncQueue.remove(item.id);
    } catch {
      break;
    }
  }
}