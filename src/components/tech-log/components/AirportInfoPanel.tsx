import { airportInfo, type AirportInfo } from '../mockData/airports';
import { Button } from '../../ui/button';

/** One airport (departure or destination) with the pilot-relevant facts on file. */
export function AirportCard({ role, info, icao }: { role: string; info?: AirportInfo; icao: string }) {
  return (
    <div className="p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{role}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-mono text-sm font-medium">{icao}</span>
        {info?.mountainous && <span className="status-warning rounded-md px-1.5 py-0.5 text-[11px]">mountainous</span>}
      </div>
      {!info && <div className="mt-2 text-sm text-muted-foreground">No airport data on file.</div>}
      {info && (
        <div className="mt-2 space-y-0.5 text-xs">
          <div className="text-muted-foreground">{info.name} · elev <span className="font-mono">{info.elevationFt.toLocaleString()}′</span></div>
          {info.runways.map(r => <div key={r.id}>RWY <span className="font-mono">{r.id}</span> · LDA <span className="font-mono">{r.ldaFt.toLocaleString()}′</span></div>)}
          {info.approaches.map((a, i) => <div key={i}>{a.type} {a.runway} · <span className="font-mono">{a.glidepath}°</span></div>)}
          <div>{info.fbo} · {info.jetA ? 'Jet A' : 'no Jet A'} · {info.deice ? 'deice' : 'no deice'}</div>
          {info.limitations && <div className="text-[var(--gfo-sunrise-deep)] dark:text-[var(--gfo-sunrise-light)]">{info.limitations}</div>}
        </div>
      )}
    </div>
  );
}

/**
 * Departure + destination airport facts for a leg, with an optional review affordance.
 * Shared by the tech-log LegDetail page and the pilot-workspace airport drawer so both render the
 * same data — the review action stays where the pilot already is (no environment switch).
 */
export function AirportInfoPanel({
  departureIcao, arrivalIcao, reviewed, onMarkReviewed,
}: {
  departureIcao: string;
  arrivalIcao: string;
  reviewed: boolean;
  onMarkReviewed?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Airport information</div>
        {reviewed
          ? <span className="text-xs text-muted-foreground">Reviewed</span>
          : onMarkReviewed && <Button size="sm" variant="outline" onClick={onMarkReviewed}>Mark reviewed</Button>}
      </div>
      <div className="grid grid-cols-1 border-t md:grid-cols-2 md:divide-x">
        <AirportCard role="Departure" icao={departureIcao} info={airportInfo(departureIcao)} />
        <AirportCard role="Destination" icao={arrivalIcao} info={airportInfo(arrivalIcao)} />
      </div>
    </div>
  );
}
