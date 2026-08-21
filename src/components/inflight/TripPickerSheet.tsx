import React, { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Button } from '../ui/button';
import { List, CalendarDays, ChevronLeft, ChevronRight, Check, ShieldAlert } from 'lucide-react';
import type { Passenger } from '../passengers/passengerData';
import type { FaTrip } from './faTrips';
import { rosterFor, summarise, splitAllergens } from './faTripRoster';
import { monthGrid, monthSegments, tripsInMonth, nextTripAfterMonth, addMonths, tripSpan } from './tripCalendar';

// The trip switcher. It is a SHEET rather than anything permanent because the roster is
// what the crew open the app for — spending 56px of every screen on navigation they use
// a few times a week is the wrong trade. The month lives in here for the same reason: a
// calendar answers "when am I away", which is a question you go and ask, not one you
// need answered continuously.

const MODE_KEY = 'fa-trip-picker-mode';

function fmtRange(trip: FaTrip): string {
  const span = tripSpan(trip);
  if (!span) return '';
  const d = (x: Date) => x.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const wd = (x: Date) => x.toLocaleDateString(undefined, { weekday: 'short' });
  return span.start.getTime() === span.end.getTime()
    ? `${wd(span.start)} ${d(span.start)}`
    : `${wd(span.start)} ${d(span.start)} – ${d(span.end)}`;
}

/** Two allergens plus a count. A wrapped third line of allergen names turns every row
 *  into three lines and buries the trip name that the row exists to show. */
function shortList(items: string[]): string {
  return items.length <= 2 ? items.join(', ') : `${items.slice(0, 2).join(', ')} +${items.length - 2}`;
}

function useTripSummary(trip: FaTrip, passengers: Passenger[]) {
  return useMemo(() => {
    const guests = rosterFor(trip, passengers, null);
    const s = summarise(guests);
    return { total: s.total, allergens: splitAllergens(s.allergens).food, flagged: s.flaggedNoDetail };
  }, [trip, passengers]);
}

function TripRow({ trip, passengers, selected, onSelect }: {
  trip: FaTrip; passengers: Passenger[]; selected: boolean; onSelect: () => void;
}) {
  const s = useTripSummary(trip, passengers);
  const alerts = s.allergens.length + (s.flagged > 0 ? 1 : 0);
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 min-h-[62px] border-t first:border-t-0 hover:bg-muted active:bg-muted ${
        selected ? 'bg-secondary border-l-[3px] border-l-primary' : ''
      }`}
    >
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate">{trip.tripName}</span>
        <span className="block text-xs text-muted-foreground mt-0.5 truncate">
          {fmtRange(trip)} · {trip.tail} · {s.total} guest{s.total === 1 ? '' : 's'}
        </span>
        {alerts > 0 && (
          <span className="block text-xs text-red-700 dark:text-red-300 font-medium mt-0.5 truncate">
            {s.allergens.length > 0 ? shortList(s.allergens) : 'Allergies flagged'}
          </span>
        )}
      </span>
      {selected
        ? <Check className="w-4 h-4 text-primary shrink-0" />
        : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
    </button>
  );
}

function MonthCalendar({ trips, passengers, now, selectedId, onPick }: {
  trips: FaTrip[]; passengers: Passenger[]; now: Date; selectedId: string;
  onPick: (tripId: string) => void;
}) {
  const anchor = useMemo(() => {
    const span = tripSpan(trips.find((t) => t.id === selectedId) ?? trips[0]);
    const d = span?.start ?? now;
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [trips, selectedId, now]);

  const [{ year, month }, setYm] = useState(anchor);
  const [preview, setPreview] = useState<string>(selectedId);

  const weeks = useMemo(() => monthGrid(year, month, now), [year, month, now]);
  const weekSegments = useMemo(() => monthSegments(weeks, trips), [weeks, trips]);
  const inMonth = useMemo(() => tripsInMonth(trips, year, month), [trips, year, month]);
  const next = useMemo(() => nextTripAfterMonth(trips, year, month), [trips, year, month]);
  const previewTrip = trips.find((t) => t.id === preview) ?? null;
  const previewSummary = useTripSummary(previewTrip ?? trips[0], passengers);

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="px-4">
      <div className="flex items-center justify-between py-1">
        <Button variant="ghost" size="icon" aria-label="Previous month"
          onClick={() => setYm(addMonths(year, month, -1))}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="text-base font-semibold">{monthLabel}</span>
        <Button variant="ghost" size="icon" aria-label="Next month"
          onClick={() => setYm(addMonths(year, month, 1))}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      {/* One grid PER WEEK rather than one grid for the month. A month-wide grid with
          explicitly-placed bars lets the following day cells flow into the bar's own
          row — the last two weeks of August rendered scrambled across each other
          before this. Per-week grids remove the auto-placement guesswork entirely. */}
      <div role="grid" aria-label={`Trips in ${monthLabel}`}>
        <div className="grid grid-cols-7 gap-0.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={i} className="text-center text-[11px] font-bold tracking-wide text-muted-foreground pb-0.5">{d}</span>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi}>
            <div className="grid grid-cols-7 gap-0.5">
              {week.map((d) => (
                <span key={d.key}
                  className={`h-10 flex items-start justify-center pt-1 text-sm rounded ${
                    d.isToday ? 'bg-secondary text-secondary-foreground font-bold' : d.inMonth ? '' : 'text-muted-foreground/40'
                  }`}>{d.day}</span>
              ))}
            </div>
            {weekSegments[wi].length > 0 && (
              <div className="grid grid-cols-7 gap-0.5 mt-0.5 mb-1">
                {weekSegments[wi].map((seg, si) => (
                  <button
                    key={seg.tripId + '-' + si}
                    onClick={() => setPreview(seg.tripId)}
                    aria-label={`${seg.label}, select`}
                    style={{ gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}`, gridRow: si + 1 }}
                    className={`h-5 px-1.5 flex items-center text-[11px] font-semibold text-primary-foreground bg-primary truncate rounded ${
                      seg.continuesLeft ? 'rounded-l-none' : ''} ${seg.continuesRight ? 'rounded-r-none' : ''} ${
                      seg.tripId === preview ? 'ring-2 ring-ring ring-offset-1' : ''}`}
                  >
                    {seg.showLabel ? seg.label : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-2 pt-2 border-t flex items-center justify-between gap-2">
        <span>
          {inMonth.length === 0
            ? `Nothing in ${monthLabel.split(' ')[0]}`
            : `${inMonth.length} trip${inMonth.length === 1 ? '' : 's'} in ${monthLabel.split(' ')[0]}`}
        </span>
        {next && (
          <button className="text-primary font-medium flex items-center gap-1"
            onClick={() => { const s = tripSpan(next)!; setYm({ year: s.start.getFullYear(), month: s.start.getMonth() }); }}>
            {new Date(tripSpan(next)!.start).toLocaleDateString(undefined, { month: 'long' })}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </p>

      {previewTrip && (
        <div className="mt-2.5 rounded-lg border border-l-[3px] border-l-primary bg-secondary px-3 py-2.5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{previewTrip.tripName}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {fmtRange(previewTrip)} · {previewTrip.tail} · {previewSummary.total} guests
            </p>
            {previewSummary.allergens.length > 0 && (
              <p className="text-xs text-red-700 dark:text-red-300 font-medium mt-0.5 truncate">
                {shortList(previewSummary.allergens)}
              </p>
            )}
          </div>
          {/* Deliberately a second action: tapping a bar previews, Open commits. A
              mis-tap on a 20px bar should not throw you into a different trip. */}
          <Button className="h-9 shrink-0" onClick={() => onPick(previewTrip.id)}>Open</Button>
        </div>
      )}
    </div>
  );
}

export default function TripPickerSheet({ open, onOpenChange, trips, passengers, now, selectedId, onSelect }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  trips: FaTrip[];
  passengers: Passenger[];
  now: Date;
  selectedId: string;
  onSelect: (tripId: string) => void;
}) {
  const [mode, setMode] = useState<'list' | 'calendar'>(() => {
    try { return localStorage.getItem(MODE_KEY) === 'calendar' ? 'calendar' : 'list'; } catch { return 'list'; }
  });
  const setModePersisted = (m: 'list' | 'calendar') => {
    setMode(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* private mode — it just forgets */ }
  };

  const pick = (id: string) => { onSelect(id); onOpenChange(false); };

  const seg = (m: 'list' | 'calendar', Icon: React.ElementType, label: string) => (
    <button
      onClick={() => setModePersisted(m)}
      aria-pressed={mode === m}
      className={`flex-1 min-h-9 rounded-md flex items-center justify-center gap-1.5 text-sm transition-colors duration-fast ease-gfo ${
        mode === m ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground'
      }`}
    >
      <Icon className="w-4 h-4" />{label}
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[88dvh] flex-col gap-0 overflow-hidden p-0 pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="sr-only">
          <SheetTitle>Your trips</SheetTitle>
          <SheetDescription>Pick a trip to open, as a list or on a calendar.</SheetDescription>
        </SheetHeader>

        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="flex gap-0.5 rounded-lg border bg-muted/40 p-1">
            {seg('list', List, 'List')}
            {seg('calendar', CalendarDays, 'Calendar')}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-3">
          {mode === 'list' ? (
            <div>
              {trips.map((t) => (
                <TripRow key={t.id} trip={t} passengers={passengers}
                  selected={t.id === selectedId} onSelect={() => pick(t.id)} />
              ))}
              {trips.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No trips assigned.</p>
              )}
            </div>
          ) : (
            <MonthCalendar trips={trips} passengers={passengers} now={now} selectedId={selectedId} onPick={pick} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
