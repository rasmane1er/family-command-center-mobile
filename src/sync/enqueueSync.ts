import { syncQueue, type SyncAction } from './syncQueue';
import { processSyncQueue } from './processSyncQueue';

export function enqueueSync(
  item: Omit<SyncAction, 'id' | 'createdAt'>
) {
  syncQueue.add(item);

  void processSyncQueue();
}