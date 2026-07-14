import { Wifi, WifiOff } from 'lucide-react';
import { useOffline } from '../hooks/useOffline';
import { setDemoOffline } from '../store/offlineController';
import { syncAgeLabel, syncAgeLevel } from '../engine/offline';

// Offline copy freshness + connectivity. Amber = document-surface staleness (not
// the RAG palette). Clicking simulates offline/online so the outbox is demoable
// without touching the network.
const STYLE: Record<string, string> = {
  online: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
  aging: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
  offline: 'border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100',
};

export function SyncAgeChip() {
  const { online, pending, lastSyncedUtc, ready } = useOffline();
  if (!ready) return null;
  const now = new Date().toISOString();
  const level = syncAgeLevel(lastSyncedUtc, now);
  const pendingCount = pending.length;
  const key = !online ? 'offline' : level === 'fresh' ? 'online' : 'aging';

  return (
    <button
      type="button"
      onClick={() => setDemoOffline(online)}
      title={online ? 'Working online — click to simulate offline' : 'Working offline — click to reconnect'}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${STYLE[key]}`}
    >
      {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {online ? (
        <span>{syncAgeLabel(lastSyncedUtc, now)}</span>
      ) : (
        <span>Offline{pendingCount > 0 ? ` · ${pendingCount} queued` : ''}</span>
      )}
      {online && pendingCount > 0 && <span className="rounded-full bg-amber-200 px-1.5 text-[10px] text-amber-900">{pendingCount}</span>}
    </button>
  );
}
