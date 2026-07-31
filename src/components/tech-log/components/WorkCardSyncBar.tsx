/**
 * Per-card sync state (TL-38) — the strip at the top of a work card that answers the three questions
 * a technician picking up someone else's job actually has.
 *
 *   1. **Has anyone else been in here, and when?** From the server's stamp, not a local mtime, so it
 *      still reads correctly on a device that has never touched this card.
 *   2. **Is anyone in here right now?** Advisory presence. Deliberately NOT a lock — see
 *      `contract.ts#PresenceRecord`. It exists so two people don't unknowingly troubleshoot the same
 *      squawk, not to stop the second one.
 *   3. **Did anything I typed fail to save?** Conflicts are surfaced here rather than as a toast,
 *      because a toast is gone by the time the person who caused it comes back from the aircraft.
 *
 * The card's own edits are never blocked by any of this. A conflict holds the edit and asks; it does
 * not lock the card, and it does not discard anything without the user saying so.
 */

import { useEffect } from 'react';
import { AlertTriangle, Users, CloudOff } from 'lucide-react';
import { useSync } from '../sync/useSync';
import { describeOp } from '../sync/outbox';
import { Button } from '../../ui/button';

/** "14 minutes ago" from two ISO instants. Coarse on purpose — precision here is false comfort. */
function since(iso: string, nowMs: number): string {
  const mins = Math.floor((nowMs - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(mins) || mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

export function WorkCardSyncBar({ workCardId, nowIso }: { workCardId: string; nowIso: string }) {
  const sync = useSync();

  // Announce this session is on the card, and stop announcing on unmount so presence does not
  // advertise a technician who has walked away.
  useEffect(() => {
    sync?.watchCard(workCardId);
    return () => sync?.watchCard(null);
  }, [sync, workCardId]);

  if (!sync) return null;

  const stamp = sync.stampFor(workCardId);
  const conflicts = sync.conflictsFor(workCardId);
  const others = sync.presenceFor(workCardId);
  const nowMs = Date.parse(nowIso);

  return (
    <div className="mb-3 space-y-2">
      {conflicts.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                {conflicts.length === 1 ? 'An edit could not be saved' : `${conflicts.length} edits could not be saved`}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                This card changed on another device while you were working. Your change is still held here — nothing has
                been discarded. Re-enter it against the current card, then dismiss.
              </p>
              <ul className="mt-2 space-y-1.5">
                {conflicts.map(c => (
                  <li key={c.op.idempotencyKey} className="flex items-center justify-between gap-3 rounded border bg-background/60 px-2 py-1.5">
                    <span className="truncate">
                      {describeOp(c.op)}
                      <span className="ml-2 text-xs text-muted-foreground">{since(c.op.clientAtUtc, nowMs)}</span>
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => sync.resolveConflict(c.op.idempotencyKey)}>
                      Dismiss
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {stamp ? (
          <span>
            Last saved <strong className="font-medium text-foreground">{since(stamp.serverAtUtc, nowMs)}</strong>
            {stamp.updatedByName && stamp.updatedByOid !== 'SEED' && <> by {stamp.updatedByName}</>}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <CloudOff className="h-3.5 w-3.5" /> Not yet saved to the server — this card exists only on this device
          </span>
        )}

        {others.length > 0 && (
          <span className="inline-flex items-center gap-1" title="Someone else has this card open. Advisory only — you are not blocked.">
            <Users className="h-3.5 w-3.5" />
            {others.length === 1 ? '1 other person is viewing this card' : `${others.length} other people are viewing this card`}
          </span>
        )}
      </div>
    </div>
  );
}
