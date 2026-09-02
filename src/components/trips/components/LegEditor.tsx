// One leg of the itinerary: where from, where to, which day, and what is fixed about the time.

import { X } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { PlacePicker } from './PlacePicker';
import type { PlaceRecord } from '../engine/places';
import type { TripLeg } from '../engine/trip';
import type { LegTiming } from '../../booking-portal/engine/legTiming';

const field = 'h-9 rounded-md border border-border bg-input-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';

export function LegEditor({ index, leg, places, onChange, onRemove, disabled, missingDate }: {
  index: number;
  leg: TripLeg;
  places: PlaceRecord[];
  onChange: (patch: Partial<Omit<TripLeg, 'id'>>) => void;
  onRemove?: () => void;
  disabled?: boolean;
  missingDate?: boolean;
}) {
  const t = leg.timing;
  function setKind(kind: LegTiming['kind']) {
    if (kind === 'arrive') onChange({ timing: { kind: 'arrive', arriveByLocal: t.kind === 'arrive' ? t.arriveByLocal : '09:00' } });
    else if (kind === 'depart') onChange({ timing: { kind: 'depart', departLocal: t.kind === 'depart' ? t.departLocal : '08:00', flexHours: t.kind === 'depart' ? t.flexHours : 1 } });
    else onChange({ timing: { kind: 'flexible' } });
  }

  return (
    <div className={cn('rounded-md border p-3', missingDate ? 'border-destructive/60 bg-destructive/5' : 'border-border')}>
      <div className="mb-2 flex items-center justify-between">
        <span className="gfo-eyebrow text-muted-foreground">Leg {index + 1}</span>
        {onRemove && !disabled && (
          <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive" aria-label={`Remove leg ${index + 1}`}><X className="h-4 w-4" /></button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <PlacePicker label="From" value={leg.from} places={places} disabled={disabled} onChange={from => onChange({ from })} />
        <PlacePicker label="To" value={leg.to} places={places} disabled={disabled} onChange={to => onChange({ to })} />
      </div>
      <div className="mt-3 grid gap-3">
        <div>
          <label className="gfo-eyebrow mb-1 block text-muted-foreground">Date</label>
          <input type="date" aria-label={`Leg ${index + 1} date`} className={cn(field, 'w-full max-w-[200px]', missingDate && 'border-destructive')} value={leg.date ?? ''} disabled={disabled} onChange={e => onChange({ date: e.target.value || null })} />
          {missingDate && <p className="mt-1 text-xs text-destructive">No date yet</p>}
        </div>
        <div>
          <label className="gfo-eyebrow mb-1 block text-muted-foreground">What is fixed</label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-border p-0.5">
              {(['arrive', 'depart', 'flexible'] as const).map(k => (
                <button key={k} type="button" disabled={disabled} onClick={() => setKind(k)}
                  className={cn('whitespace-nowrap rounded px-2.5 py-1 text-xs', t.kind === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary')}>
                  {k === 'arrive' ? 'Be there by' : k === 'depart' ? 'Depart at' : 'Any time that day'}
                </button>
              ))}
            </div>
            {t.kind === 'arrive' && (
              <input type="time" aria-label="Arrive by" className={field} value={t.arriveByLocal} disabled={disabled} onChange={e => onChange({ timing: { kind: 'arrive', arriveByLocal: e.target.value } })} />
            )}
            {t.kind === 'depart' && (
              <>
                <input type="time" aria-label="Depart at" className={field} value={t.departLocal} disabled={disabled} onChange={e => onChange({ timing: { ...t, departLocal: e.target.value } })} />
                <select aria-label="Flexibility" className={field} value={t.flexHours} disabled={disabled} onChange={e => onChange({ timing: { ...t, flexHours: Number(e.target.value) } })}>
                  <option value={0}>firm</option><option value={1}>± 1 h</option><option value={2}>± 2 h</option><option value={4}>± 4 h</option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>
      {!disabled && !onRemove && <span className="sr-only">first leg</span>}
      {disabled && <Button variant="ghost" size="sm" className="hidden">-</Button>}
    </div>
  );
}
