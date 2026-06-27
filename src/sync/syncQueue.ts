import { mmkvStorage } from '../storage/mmkvStorage';

const QUEUE_KEY = 'family-command-center-sync-queue';

export type SyncAction = {
  id: string;
  entity: 'family' | 'finance' | 'operations' | 'activities' | 'notifications' | 'ai';
  action: 'create' | 'update' | 'delete' | 'sync';
  payload: unknown;
  createdAt: string;
};

const getQueue = (): SyncAction[] => {
  const raw = mmkvStorage.getItem(QUEUE_KEY);

  if (!raw || typeof raw !== 'string') {
    return [];
  }

  return JSON.parse(raw);
};

const saveQueue = (queue: SyncAction[]) => {
  mmkvStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const syncQueue = {
  add: (item: Omit<SyncAction, 'id' | 'createdAt'>) => {
    const queue = getQueue();
    const nextItem: SyncAction = {
      ...item,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
    };

    saveQueue([...queue, nextItem]);
  },

  all: () => getQueue(),

  remove: (id: string) => {
    saveQueue(getQueue().filter((item) => item.id !== id));
  },

  clear: () => {
    saveQueue([]);
  },
};