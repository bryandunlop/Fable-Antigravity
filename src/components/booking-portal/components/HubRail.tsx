// The right rail: everything that is not a bar on the month.
//
// Three bands, in the order she acts on them. The middle one is the whole
// planning/calendar split (D103): a trip with no dates is not late and not hidden in a
// second view — it is "not on the calendar yet", which is literally true, and it drops
// onto a week the moment it earns dates.

import { Link } from 'react-router-dom';
import { cn } from '../../ui/utils';
import type { HubTrip, Rail } from '../engine/hubMonth';

function Band({
  title,
  hint,
  trips,
  selectedId,
  onSelect,
  tone,
}: {
  title: string;
  hint?: string;
  trips: HubTrip[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  tone?: 'attention';
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
        {trips.length > 0 && <span className="ml-1.5 tabular-nums opacity-70">{trips.length}</span>}
      </p>
      {trips.length === 0 ? (
        <p className="mb-3 text-xs text-muted-foreground/70">{hint ?? 'Nothing here.'}</p>
      ) : (
        <ul className="mb-3 flex flex-col gap-1">
          {trips.map(t => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                className={cn(
                  'w-full rounded-md border px-2.5 py-1.5 text-left text-sm hover:bg-muted/40',
                  tone === 'attention' && 'border-[color-mix(in_srgb,var(--gfo-gold,#C9A227)_55%,transparent)]',
                  selectedId === t.id && 'ring-2 ring-[var(--gfo-daylight,#0096FC)] ring-offset-1',
                )}
              >
                <span className="block truncate font-medium">{t.label}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {t.span ? `${t.span.start}${t.span.end !== t.span.start ? ` → ${t.span.end}` : ''}` : 'No dates yet'}
                </span>
                {t.bumpLine && (
                  <span className="mt-0.5 block text-[11px] italic text-muted-foreground">{t.bumpLine}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HubRail({
  rail,
  selectedId,
  onSelect,
}: {
  rail: Rail;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="flex w-full flex-col md:w-[260px] md:shrink-0">
      <Band
        title="Needs you"
        hint="Nothing waiting on you."
        trips={rail.needsYou}
        selectedId={selectedId}
        onSelect={onSelect}
        tone="attention"
      />
      <Band
        title="Not on the calendar yet"
        hint="Every trip you have has dates."
        trips={rail.noDatesYet}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <Band
        title="Approved"
        hint="Nothing approved yet."
        trips={rail.approved}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <Link
        to="/booking-portal/requests/new"
        className="mt-1 rounded-md border border-dashed px-2.5 py-2 text-center text-xs font-semibold text-muted-foreground hover:bg-muted/40"
      >
        + New trip
      </Link>
    </aside>
  );
}
