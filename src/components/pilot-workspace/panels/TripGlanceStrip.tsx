import React from 'react';
import { Shield, Fuel, Wrench, CalendarClock } from 'lucide-react';
import type { ModuleStatus, ModuleKey, ModuleTone } from '../moduleStatus';

const ICON: Record<ModuleKey, React.ElementType> = {
  frat: Shield,
  fuel: Fuel,
  handover: Wrench,
  scheduling: CalendarClock,
};

// All four positions always shown; colour only where it matters. Amber is reserved for airworthiness
// caution (it lives on the readiness dot), so routine to-dos read as normal foreground, not yellow.
const TONE: Record<ModuleTone, string> = {
  done: 'text-muted-foreground',
  muted: 'text-muted-foreground/50',
  action: 'text-foreground',
  blocked: 'text-red-600',
  custody: 'text-[var(--gfo-custody-crew)]',
};

function shortLabel(m: ModuleStatus): string {
  switch (m.key) {
    case 'frat': return m.tone === 'action' ? `FRAT · ${m.outstanding}` : 'FRAT';
    case 'fuel': return m.tone === 'action' ? `Fuel · ${m.outstanding}` : 'Fuel';
    case 'handover':
      if (m.tone === 'blocked') return 'Grounded';
      if (m.summary === 'ready to accept') return 'Accept';
      if (m.tone === 'custody') return 'Yours';
      return 'A/C';
    case 'scheduling': return 'Sched';
    default: return m.label;
  }
}

/** The four-module glance strip on a My Flights row — the same FRAT · Fuel · Handover · Scheduling
 *  vocabulary as the board, so a pilot scanning trips sees what each one owes before opening it. */
export function TripGlanceStrip({ modules }: { modules: ModuleStatus[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {modules.map((m) => {
        const Icon = ICON[m.key];
        return (
          <span key={m.key} className={`inline-flex items-center gap-1 text-xs ${TONE[m.tone]}`}>
            <Icon className="h-3.5 w-3.5" aria-hidden /> {shortLabel(m)}
          </span>
        );
      })}
    </div>
  );
}
