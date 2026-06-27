import NetInfo from '@react-native-community/netinfo';
import { processSyncQueue } from './processSyncQueue';

let unsubscribe: (() => void) | null = null;

export function startNetworkSync() {
  if (unsubscribe) return;

  unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline = Boolean(state.isConnected && state.isInternetReachable);

    if (isOnline) {
      void processSyncQueue();
    }
  });
}

export function stopNetworkSync() {
  unsubscribe?.();
  unsubscribe = null;
}