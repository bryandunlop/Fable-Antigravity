import { useEffect, useSyncExternalStore } from 'react';
import {
  subscribeOffline, getOfflineSnapshot, startOfflineController, type OfflineState,
} from '../store/offlineController';

/** Subscribe to the offline controller (connectivity + outbox + last-synced). */
export function useOffline(): OfflineState {
  useEffect(() => { startOfflineController(); }, []);
  return useSyncExternalStore(subscribeOffline, getOfflineSnapshot, getOfflineSnapshot);
}
