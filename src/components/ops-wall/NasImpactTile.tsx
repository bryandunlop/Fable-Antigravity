import React, { useMemo, useState } from 'react';
import { useFlightNASImpact } from '../hooks/useFlightNASImpact';

const SEVERITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

const SEVERITY_DOT: Record<string, string> = {
  High: 'var(--gfo-error, #EF3340)',
  Medium: 'var(--gfo-warning, #F1B434)',
  Low: 'var(--muted-foreground)',
};

/** How many relevant events the tile shows before rolling the rest up. */
const VISIBLE_EVENTS = 3;

function impactLabel(impactType: string, estimatedDelay?: number): string {
  switch (impactType) {
    case 'ground_stop':
      return 'ground stop';
    case 'ground_delay':
      return estimatedDelay ? `ground delay ${estimatedDelay}m` : 'ground delay';
    case 'flow_program':
      return 'flow program';
    case 'facility_outage':
      return 'facility outage';
    default:
      return impactType.replace(/_/g, ' ');
  }
}

/**
 * NAS impact, ranked rather than listed.
 *
 * A national feed carries many simultaneous events; rendering them all turns the
 * tile into noise at exactly the moment it matters. Relevance leads — the hook
 * already resolves which events touch our own flights' airports — then severity,
 * and everything national rolls into one count that expands in place.
 */
export default function NasImpactTile({ className = '' }: { className?: string }) {
  const { impactData, loading } = useFlightNASImpact();
  const [expanded, setExpanded] = useState(false);

  const { relevant, totalActive, affectingUs } = useMemo(() => {
    const nas = impactData.nasData;
    const total = nas
      ? nas.groundStops.length +
        nas.groundDelays.length +
        nas.airspaceFlowPrograms.length +
        nas.facilityOutages.length
      : 0;

    // One row per airport+type, however many of our flights it hits. Note this
    // can exceed `total` — a single flow program spanning five airports becomes
    // five airport rows here — so these two counts are not subtractable.
    const seen = new Set<string>();
    const ours = impactData.impactedFlights
      .flatMap(f => f.impacts)
      .filter(i => {
        const key = `${i.affectedAirport}:${i.impactType}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9));

    return {
      relevant: ours,
      totalActive: total,
      affectingUs: impactData.totalImpacted,
    };
  }, [impactData]);

  const visible = expanded ? relevant : relevant.slice(0, VISIBLE_EVENTS);
  // Everything the roll-up hides is still a relevant impact on our flights —
  // never label it "national", which is what the summary count already conveys.
  const hidden = relevant.length - visible.length;

  return (
    <section className={`rounded-lg border border-border bg-card p-3 ${className}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">NAS impact</span>
        <span className="text-[11px] text-muted-foreground">
          {loading ? 'loading…' : `${totalActive} active · ${affectingUs} affect you`}
        </span>
      </div>

      {!loading && relevant.length === 0 && (
        <p className="text-[11px] text-muted-foreground">No events affecting our flights.</p>
      )}

      <ul className="space-y-1.5">
        {visible.map(i => (
          <li
            key={`${i.affectedAirport}-${i.impactType}`}
            className="flex items-center gap-2 text-[11px] text-muted-foreground"
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: SEVERITY_DOT[i.severity] ?? 'var(--muted-foreground)' }}
            />
            <span className="font-mono text-foreground/80">{i.affectedAirport}</span>
            <span className="truncate">{impactLabel(i.impactType, i.estimatedDelay)}</span>
          </li>
        ))}
      </ul>

      {!loading && (hidden > 0 || (expanded && relevant.length > VISIBLE_EVENTS)) && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-2 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {expanded ? 'Show less' : `+${hidden} more · show all`}
        </button>
      )}
    </section>
  );
}
