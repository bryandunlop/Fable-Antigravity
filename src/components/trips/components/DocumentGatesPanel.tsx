/**
 * Document gates on the trip workspace (D109 slice 3; canvas Q4).
 *
 * Bryan, 2026-09-02: warn, and let scheduling override with a reason. So this panel does three
 * things and no more — says who is short, says whether it is an expiry or the department's own
 * window, and takes a reason before it will let anyone past.
 *
 * The six months are DEPARTMENT POLICY. The copy says so every time, because a scheduler reading
 * "passport expires inside six months" has no way to tell a rule we chose from a rule we are subject
 * to, and the difference decides whether they argue with it or with a regulator.
 */

import { useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '../../ui/button';
import { GfoPanel } from '../../gfo';
import { gateKey, liveOverrideFor, type DocumentGate } from '../engine/documentGates';
import type { Trip } from '../engine/trip';

const field = 'h-9 w-full rounded-md border border-border bg-input-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';

export function DocumentGatesPanel({
  gates, blocking, trip, canOverride, onOverride,
}: {
  gates: DocumentGate[];
  blocking: DocumentGate[];
  trip: Trip;
  canOverride: boolean;
  onOverride: (gate: DocumentGate, reason: string) => void;
}) {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  if (gates.length === 0) return null;

  const blockingKeys = new Set(blocking.map(gateKey));

  return (
    <GfoPanel title={`Travel documents · ${blocking.length} unresolved`}>
      <ul className="space-y-3">
        {gates.map(g => {
          const key = gateKey(g);
          const isBlocking = blockingKeys.has(key);
          // Only an override still standing over THIS situation counts — one made about an earlier
          // leg date or an earlier expiry has gone stale and the gate is blocking again.
          const override = liveOverrideFor(trip, g);
          return (
            <li key={key} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-start gap-2">
                {isBlocking
                  ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-primary">
                    {g.personName}
                    <span className="ml-2 gfo-eyebrow text-muted-foreground">Leg {g.legIndex + 1}</span>
                  </div>
                  <p className={isBlocking ? 'mt-0.5 text-amber-700 dark:text-amber-400' : 'mt-0.5 text-muted-foreground'}>
                    {g.reason}
                  </p>

                  {override && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Overridden by {override.by.name}: “{override.reason}”
                    </p>
                  )}

                  {isBlocking && canOverride && openFor !== key && (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => { setOpenFor(key); setReason(''); }}>
                      Fly anyway — give a reason
                    </Button>
                  )}

                  {isBlocking && canOverride && openFor === key && (
                    <div className="mt-2 space-y-2">
                      <input
                        className={field} autoFocus aria-label={`Override reason for ${g.personName} leg ${g.legIndex + 1}`}
                        placeholder="Renewal booked, courier confirmed for 10 Oct"
                        value={reason} onChange={e => setReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" disabled={!reason.trim()} onClick={() => { onOverride(g, reason); setOpenFor(null); }}>
                          Record the override
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setOpenFor(null)}>Cancel</Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This goes on the trip record with your name against it.
                      </p>
                    </div>
                  )}

                  {isBlocking && !canOverride && (
                    <p className="mt-1.5 text-xs text-muted-foreground">Scheduling decides whether this one flies.</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </GfoPanel>
  );
}
