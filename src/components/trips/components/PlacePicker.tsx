// "Where" — the EA types a place; the register answers with the airport we actually use.
//
// The usual field is preselected and marked; alternatives sit beside it; a third choice hands
// the call to scheduling ("scheduling knows better"). An unknown place is allowed through —
// it becomes a question in the record, not a form error.

import { useMemo, useState } from 'react';
import { cn } from '../../ui/utils';
import { resolvePlace, usualAirport, SCHEDULING_DECIDES, type PlaceRecord } from '../engine/places';
import type { LegEnd } from '../engine/trip';

const field = 'h-9 w-full rounded-md border border-border bg-input-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';

export function PlacePicker({ label, value, places, onChange, disabled }: {
  label: string;
  value: LegEnd;
  places: PlaceRecord[];
  onChange: (end: LegEnd) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hits = useMemo(() => resolvePlace(value.placeName, places).slice(0, 5), [value.placeName, places]);
  const place = value.placeId ? places.find(p => p.id === value.placeId) ?? null : null;

  function pick(p: PlaceRecord) {
    onChange({ placeName: p.name, placeId: p.id, airport: usualAirport(p)?.icao ?? null });
    setOpen(false);
  }

  return (
    <div className="min-w-0">
      <label className="gfo-eyebrow mb-1 block text-muted-foreground">{label}</label>
      <div className="relative">
        <input
          className={field}
          value={value.placeName}
          disabled={disabled}
          placeholder="A city, a plant, a site…"
          aria-label={label}
          onChange={e => { onChange({ placeName: e.target.value, placeId: null, airport: null }); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
        />
        {open && !place && hits.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-md">
            {hits.map(p => (
              <li key={p.id}>
                <button type="button" onMouseDown={() => pick(p)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted">
                  <span>{p.name}<span className="ml-2 text-xs text-muted-foreground">{p.kind}</span></span>
                  <span className="text-xs text-muted-foreground">{usualAirport(p)?.name} · {usualAirport(p)?.icao}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {place && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {place.airports.map(a => (
            <button
              key={a.icao}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ ...value, airport: a.icao })}
              title={a.note}
              className={cn(
                'rounded-md border px-2 py-0.5 text-xs transition-colors',
                value.airport === a.icao ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary hover:text-primary',
              )}
            >
              {a.name} · {a.icao}{a.usual && <span className={cn('ml-1', value.airport === a.icao ? 'opacity-80' : 'text-accent')}>usual</span>}
            </button>
          ))}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ ...value, airport: SCHEDULING_DECIDES })}
            className={cn(
              'rounded-md border border-dashed px-2 py-0.5 text-xs transition-colors',
              value.airport === SCHEDULING_DECIDES ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary hover:text-primary',
            )}
          >
            Let scheduling decide
          </button>
        </div>
      )}
      {!place && value.placeName.trim() && hits.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">Not a place we know yet — scheduling will ask which airport.</p>
      )}
    </div>
  );
}
