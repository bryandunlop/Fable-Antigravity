import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useSchedulingWorkspace } from '../../scheduling-workspace/SchedulingWorkspaceContext';
import type { TripRecord } from '../../../scheduling/store/types';
import { completedVisibleItems, type CompletedPrepItem } from '../tripPrep';

const fmtWhen = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

/**
 * Scheduling module body (board): a read-only list of the completed scheduling checklist items the
 * operator exposes to the pilot (see the scheduling Pilot-visibility panel). A live projection over
 * the trip's task instances; no acknowledgement. Bare — the ModuleCard supplies the header + pill.
 */
export default function TripBriefPanel({ trip, userRole }: { trip: TripRecord; userRole: string }) {
  const { store, tick } = useSchedulingWorkspace();
  const [items, setItems] = useState<CompletedPrepItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [instances, visible] = await Promise.all([
        store.listInstancesForTrip(trip.id),
        store.getPilotVisibility(),
      ]);
      if (!cancelled) setItems(completedVisibleItems(instances, new Set(visible)));
    })();
    return () => { cancelled = true; };
  }, [store, tick, trip]);

  return (
    <div className="text-sm">
      {['scheduling', 'admin'].includes(userRole) && (
        <div className="mb-2 flex justify-end">
          <Link to="/scheduling-workspace" className="text-xs text-primary hover:underline">Open in scheduling ↗</Link>
        </div>
      )}
      {items.length === 0 && <p className="text-muted-foreground">No trip prep completed yet.</p>}
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between rounded border px-3 py-2">
            <span>{it.title}</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
              <Check className="h-3.5 w-3.5" /> done{it.completedAtUtc ? ` · ${fmtWhen(it.completedAtUtc)}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
