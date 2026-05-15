import { useState, useEffect } from 'react';
import { useInventoryV2 } from '../InventoryV2Context';

export function useOnlineStatus() {
  const { state, dispatch } = useInventoryV2();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      dispatch({ type: 'RESET_PENDING_CHANGES' });
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  return { isOnline, pendingChanges: state.pendingChanges };
}
