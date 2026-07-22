// Serviceability alerts strip for the scheduling hub: upcoming trips × the
// tech-log DERIVED GREEN/AMBER/RED projection (engine/tripAlerts, via the
// bridge). Pure presentation — all logic + tests live in tripAlerts.ts.
// Red/amber here IS aircraft RAG status semantics (never brand accents).

import { AlertTriangle, OctagonAlert } from 'lucide-react';
import type { TripServiceabilityAlert, TripAlertKind } from '../tech-log/bridge';

const KIND_LABEL: Record<TripAlertKind, string> = {
  RED_AT_ETD: 'Aircraft RED at departure',
  DEFERRAL_EXPIRES_MID_TRIP: 'MEL clock runs out mid-trip',
  ACTIVE_DEFERRAL_INFO: 'Departing on active deferral',
};

function fmtUtc(iso: string): string {
  return `${new Date(iso).toLocaleString('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  })}Z`;
}

export function OpsAlertsPanel({
  alerts,
  onOpenTrip,
}: {
  alerts: TripServiceabilityAlert[];
  onOpenTrip: (tripId: string) => void;
}) {
  if (alerts.length === 0) return null;
  const redCount = alerts.filter(a => a.severity === 'red').length;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b">
        <OctagonAlert className="h-4 w-4 text-red-600" />
        <span className="text-sm font-semibold">Serviceability alerts</span>
        <span className="text-xs text-muted-foreground">
          {redCount > 0 ? `${redCount} grounding · ` : ''}{alerts.length} total — derived from tech-log status at each departure time
        </span>
      </div>
      <ul className="divide-y">
        {alerts.map(a => (
          <li key={`${a.tripId}-${a.kind}`}>
            <button
              type="button"
              onClick={() => onOpenTrip(a.tripId)}
              className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {a.severity === 'red'
                  ? <OctagonAlert className="h-4 w-4 shrink-0 text-red-600" aria-label="Grounding" />
                  : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-label="Caution" />}
                <span className="text-sm font-medium">{a.tripNumber}</span>
                <span className="text-xs font-mono text-muted-foreground">{a.tail}</span>
                <span className={`text-xs font-medium ${a.severity === 'red' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {KIND_LABEL[a.kind]}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  ETD {fmtUtc(a.etdUtc)}{a.dueUtc ? ` · clock expires ${fmtUtc(a.dueUtc)}` : ''}
                </span>
              </div>
              <p className="mt-0.5 pl-6 text-xs text-muted-foreground line-clamp-1">{a.detail}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
