import React from 'react';
import { Shield, Fuel, Wrench, CalendarClock } from 'lucide-react';
import type { ModuleStatus, ModuleKey, ModuleTone } from '../moduleStatus';

const ICON: Record<ModuleKey, React.ElementType> = {
  frat: Shield,
  fuel: Fuel,
  handover: Wrench,
  scheduling: CalendarClock,
};

// Colour is spent only on genuine status: green = done, red = grounded, P&G-blue = custody.
// Routine "to-do" (action) stays neutral — amber is reserved for airworthiness caution, not prep.
const TONE_PILL: Record<ModuleTone, string> = {
  done: 'bg-emerald-100 text-emerald-800',
  action: 'bg-muted text-foreground',
  blocked: 'bg-red-100 text-red-800',
  custody: 'gfo-pill-custody',
  muted: 'bg-muted text-muted-foreground',
};

/** One module of the four-module pilot trip board: a titled card with a status pill and a body.
 *  The pill comes from the shared `deriveTripModules` roll-up so the list glance strip and the board
 *  speak the same status vocabulary. */
export function ModuleCard({ status, children }: { status: ModuleStatus; children?: React.ReactNode }) {
  const Icon = ICON[status.key];
  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden /> {status.label}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_PILL[status.tone]}`}>
          {status.summary}
        </span>
      </div>
      {children}
    </section>
  );
}
