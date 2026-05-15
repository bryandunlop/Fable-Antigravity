import React from 'react';
import { useOnlineStatus } from './useOnlineStatus';

export function OfflineBanner() {
  const { isOnline, pendingChanges } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
      <span>📡</span>
      <span>
        You're offline
        {pendingChanges > 0 && ` · ${pendingChanges} change${pendingChanges !== 1 ? 's' : ''} pending sync`}
      </span>
    </div>
  );
}
