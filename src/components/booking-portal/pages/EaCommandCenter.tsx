// The EA's home (D100). Split screen: the month on the left, the selected trip
// always open on the right. The bet is that an EA lives here all day, so trip
// context is furniture, not something you open and close — and the calendar is
// the primary read because an assistant thinks in "what's happening that week",
// not in a list sorted by request id.

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, Eye, Send } from 'lucide-react';
import { Button } from '../../ui/button';
import { PortalShell } from '../components/PortalShell';
import { MessageThread } from '../components/MessageThread';
import { Chip } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import { buildItineraries, type Itinerary } from '../engine/itinerary';
import { defaultSelectedId, initialMonth, isRevised, itineraryToIcs, toCalTrips } from '../engine/eaCalendar';
import { addMonths, dayKey, monthGrid, monthSegments, tripsInMonth } from '../../inflight/tripCalendar';
import { cn } from '../../ui/utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function EaCommandCenter() {
  const { state, dispatch } = usePortal();
  const now = new Date();
  const itineraries = useMemo(() => buildItineraries(state, now.getTime()), [state]);
  const calTrips = useMemo(() => toCalTrips(itineraries), [itineraries]);

  const [selectedId, setSelectedId] = useState<string | null>(() => defaultSelectedId(itineraries, now.getTime()));
  const [cursor, setCursor] = useState(() =>
    initialMonth(itineraries, defaultSelectedId(itineraries, now.getTime()), now),
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  // Never leave the panel empty while trips exist — an always-open panel that
  // starts blank is a drawer with extra steps.
  useEffect(() => {
    if (!selectedId || !itineraries.some((i) => i.id === selectedId)) {
      setSelectedId(defaultSelectedId(itineraries, Date.now()));
    }
  }, [itineraries, selectedId]);

  const selected = itineraries.find((i) => i.id === selectedId) ?? null;

  // Opening a trip is what ages out its "Revised" chip.
  useEffect(() => {
    if (selected) dispatch({ type: 'MARK_TRIP_SEEN', id: selected.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month, now), [cursor.year, cursor.month]);
  const inMonth = useMemo(() => tripsInMonth(calTrips, cursor.year, cursor.month), [calTrips, cursor]);
  const segments = useMemo(() => monthSegments(weeks, inMonth), [weeks, inMonth]);

  const requestOf = (id: string) => state.requests.find((r) => r.id === id);
  const revisedFor = (i: Itinerary) => isRevised(requestOf(i.id)?.revisedAt, state.tripSeenAt[i.id]);

  function downloadIcs(itinerary: Itinerary) {
    const blob = new Blob([itineraryToIcs(itinerary)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${itinerary.title.replace(/[^\w]+/g, '-')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PortalShell
      title="My flights"
      meta={<span className="text-sm text-muted-foreground">{itineraries.length} confirmed · calendar and trip, side by side</span>}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* ── Left: the month ── */}
        <section className="rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium">{MONTHS[cursor.month]} {cursor.year}</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setCursor(addMonths(cursor.year, cursor.month, -1))}>‹</Button>
              <Button variant="ghost" size="sm" onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}>Today</Button>
              <Button variant="ghost" size="sm" onClick={() => setCursor(addMonths(cursor.year, cursor.month, 1))}>›</Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {WEEKDAYS.map((d) => <span key={d} className="px-1">{d}</span>)}
          </div>

          <div className="mt-1 space-y-1">
            {weeks.map((week, wi) => (
              <div key={week[0].key}>
                <div className="grid grid-cols-7 gap-1">
                  {week.map((day) => (
                    <div
                      key={day.key}
                      className={cn(
                        'min-h-8 rounded-md border px-1 py-0.5 text-[10px]',
                        day.inMonth ? 'text-muted-foreground' : 'text-muted-foreground/40',
                        day.isToday && 'border-primary font-semibold text-primary',
                      )}
                    >
                      {day.day}
                    </div>
                  ))}
                </div>
                {/* Spanning bars: one row per segment, squared off at week edges. */}
                {segments[wi].map((seg) => {
                  const itinerary = itineraries.find((i) => i.id === seg.tripId);
                  const revised = itinerary ? revisedFor(itinerary) : false;
                  return (
                    <button
                      key={`${seg.tripId}-${week[0].key}`}
                      onClick={() => setSelectedId(seg.tripId)}
                      className={cn(
                        'mt-1 grid w-full grid-cols-7 gap-1 text-left',
                      )}
                      aria-label={`Open ${seg.label}`}
                    >
                      <span
                        style={{ gridColumn: `${seg.startCol + 1} / span ${seg.endCol - seg.startCol + 1}` }}
                        className={cn(
                          'truncate px-2 py-1 text-[11px] font-medium transition-colors',
                          seg.tripId === selectedId
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-[color-mix(in_srgb,var(--gfo-daylight,#0096FC)_12%,transparent)] text-primary hover:bg-[color-mix(in_srgb,var(--gfo-daylight,#0096FC)_20%,transparent)]',
                          seg.continuesLeft ? 'rounded-l-none' : 'rounded-l-md',
                          seg.continuesRight ? 'rounded-r-none' : 'rounded-r-md',
                        )}
                      >
                        {seg.showLabel ? `${revised ? '• ' : ''}${seg.label}` : ' '}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {inMonth.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">Nothing this month. Use ‹ › to look around.</p>
          )}
        </section>

        {/* ── Right: the trip, always open ── */}
        <section className="rounded-lg border bg-card p-3">
          {!selected ? (
            <p className="text-sm text-muted-foreground">No confirmed trips yet. Once one is confirmed it opens here.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-medium">{selected.title}</h2>
                  {revisedFor(selected) && <Chip tone="flag">Revised</Chip>}
                  {selected.kind === 'seat' && <Chip tone="neutral">Seat on another trip</Chip>}
                  {selected.international && <Chip tone="neutral">International</Chip>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selected.dates}
                  {selected.hoursToLockout > 0
                    ? ` · manifest locks in ${Math.round(selected.hoursToLockout)} h`
                    : ' · manifest locked'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => downloadIcs(selected)}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Add to calendar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPreviewOpen((v) => !v)}>
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> {previewOpen ? 'Hide' : 'Principal'} preview
                </Button>
                <Button size="sm" variant="outline" disabled title="Sends the itinerary to the principal — wired in a later slice">
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Send itinerary
                </Button>
              </div>

              {previewOpen && <PrincipalPreview itinerary={selected} />}

              <ol className="space-y-2">
                {selected.legs.map((leg) => (
                  <li key={leg.id} className="rounded-md border p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{leg.from} → {leg.to}</span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {leg.date} · {leg.depart}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {leg.fbo.from} → {leg.fbo.to}
                      {leg.aircraft ? ` · ${leg.aircraft}` : ''}
                    </p>
                    <p className="mt-1 text-xs">
                      {leg.passengers.length > 0
                        ? leg.passengers.map((p) => `${p.name}${p.lead ? ' (lead)' : ''}`).join(', ')
                        : <span className="text-muted-foreground">No passengers named yet</span>}
                    </p>
                  </li>
                ))}
              </ol>

              {selected.kind === 'trip' ? (
                <div className="border-t pt-3">
                  <MessageThread
                    messages={requestOf(selected.id)?.messages ?? []}
                    threadId={selected.id}
                    label="Chat with scheduling — this trip only"
                    emptyHint="Nothing yet. Anything you ask here stays attached to this trip."
                  />
                </div>
              ) : (
                <p className="border-t pt-3 text-xs text-muted-foreground">
                  A claimed seat rides another principal's trip — questions go to that trip's owner, not here.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </PortalShell>
  );
}

/** What the principal would see if the EA forwarded this — the EA's job is to
 *  send it on, so she should be able to check it first without leaving. */
function PrincipalPreview({ itinerary }: { itinerary: Itinerary }) {
  const first = itinerary.legs[0];
  return (
    <div className="rounded-md border border-dashed p-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        <CalendarDays className="mr-1 inline h-3 w-3" /> What your principal sees
      </p>
      <p className="text-sm font-medium">{itinerary.title}</p>
      <p className="text-xs text-muted-foreground">{itinerary.dates}</p>
      {first && (
        <p className="mt-1 text-xs">
          Depart {first.depart} from {first.fbo.from}
          {first.aircraft ? ` · ${first.aircraft}` : ''}
        </p>
      )}
      <p className="mt-1 text-[11px] text-muted-foreground">No request ids, no thread, no queue position.</p>
    </div>
  );
}
