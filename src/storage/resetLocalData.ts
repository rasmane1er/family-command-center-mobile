import { mmkvStorage } from './mmkvStorage';

const LOCAL_KEYS = [
  'family-command-center-app',
  'family-command-center-family',
  'family-command-center-finance',
  'family-command-center-operations',
  'family-command-center-notifications',
  'family-command-center-ai',
  'family-command-center-activities',
  'family-command-center-sync-queue',
];

export function clearLocalAppData() {
  LOCAL_KEYS.forEach((key) => {
    mmkvStorage.removeItem(key);
  });
}