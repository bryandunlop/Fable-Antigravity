// Serviceability alerts for the scheduling hub — one card per aircraft-cause
// (LG-27, option C). Grouping logic + tests live in alertGroups.ts; the alert
// derivation + tests in tech-log/engine/tripAlerts.ts. Pure presentation here.
// Red/amber here IS aircraft RAG status semantics (never brand accents).

import { AlertTriangle, OctagonAlert } from 'lucide-react';
import type { TripServiceabilityAlert } from '../tech-log/bridge';
import { groupAlertsByAircraft, type AircraftAlertGroup } from './alertGroups';

const CHIP_LIMIT = 6;

function fmtUtc(iso: string): string {
  return `${new Date(iso).toLocaleString('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  })}Z`;
}

function fmtUtcDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
}

function GroupCard({ group, onOpenTrip }: { group: AircraftAlertGroup; onOpenTrip: (tripId: string) => void }) {
  const red = group.severity === 'red';
  const visibleChips = group.trips.slice(0, CHIP_LIMIT);
  const hiddenCount = group.trips.length - visibleChips.length;

  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {red
          ? <OctagonAlert className="h-4 w-4 shrink-0 text-red-600" aria-label="Grounding" />
          : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-label="Caution" />}
        <span className="text-sm font-mono font-medium">{group.tail}</span>
        <span className={`text-sm font-medium ${red ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
          {group.headline}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {group.trips.length} trip{group.trips.length === 1 ? '' : 's'} through {fmtUtcDay(group.lastEtdUtc)}
          {group.dueUtc ? ` · clock expires ${fmtUtc(group.dueUtc)}` : ''}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {visibleChips.map(chip => (
          <button
            key={chip.tripId}
            type="button"
            onClick={() => onOpenTrip(chip.tripId)}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:bg-muted/60 ${
              chip.kind === 'DEFERRAL_EXPIRES_MID_TRIP'
                ? 'border-amber-500 text-amber-800 dark:text-amber-300'
                : 'border-border text-foreground'
            }`}
          >
            {chip.tripNumber} · {fmtUtcDay(chip.etdUtc)}
            {chip.kind === 'DEFERRAL_EXPIRES_MID_TRIP' ? ' · mid-trip' : ''}
          </button>
        ))}
        {hiddenCount > 0 && (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            +{hiddenCount}
          </span>
        )}
      </div>
    </div>
  );
}

export function OpsAlertsPanel({
  alerts,
  onOpenTrip,
}: {
  alerts: TripServiceabilityAlert[];
  onOpenTrip: (tripId: string) => void;
}) {
  if (alerts.length === 0) return null;
  const groups = groupAlertsByAircraft(alerts);
  const redGroups = groups.filter(g => g.severity === 'red').length;
  const tripCount = alerts.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <OctagonAlert className="h-4 w-4 text-red-600" />
        <span className="text-sm font-semibold">Serviceability alerts</span>
        <span className="text-xs text-muted-foreground">
          {redGroups > 0 ? `${redGroups} aircraft grounding trips · ` : ''}{tripCount} trip{tripCount === 1 ? '' : 's'} affected — derived from tech-log status at each departure time
        </span>
      </div>
      {groups.map(g => <GroupCard key={g.tail} group={g} onOpenTrip={onOpenTrip} />)}
    </div>
  );
}
