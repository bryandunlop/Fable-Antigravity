// The EA Booking Hub — the screen an executive assistant lives in.
//
// A traditional month calendar, because that is the shape she has used her whole career
// and the one Outlook shows her all day. Her trips are spanning bars: solid approved,
// dashed pending. Every day carries one number, how many aeroplanes are free — a count,
// never which aeroplanes, so scheduling can move metal underneath her without her screen
// becoming wrong.
//
// It is not a booking engine. Nothing here books anything: it is a structured
// conversation with scheduling that accumulates over months.

import { useMemo, useState } from 'react';
import { addMonths } from '../../inflight/tripCalendar';
import { PortalShell } from '../components/PortalShell';
import { MonthStrip } from '../components/MonthStrip';
import { MonthGrid } from '../components/MonthGrid';
import { HubRail } from '../components/HubRail';
import { MessageThread } from '../components/MessageThread';
import { AsOf } from '../components/portalUi';
import { Button } from '../../ui/button';
import { usePortal } from '../BookingPortalContext';
import { useSchedulingWorkspace } from '../../scheduling-workspace/SchedulingWorkspaceContext';
import { useTrips } from '../../hooks/useFleetAvailability';
import { useFreeCounts, monthKey } from '../hooks/useFreeCounts';
import { drawable, railFor, toHubTrips } from '../engine/hubMonth';
import { BumpDialog } from '../components/BumpDialog';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Fifteen months. EAs plan from two days out to fifteen months out; the strip has to
 *  reach the far end of that or it quietly becomes a this-quarter tool. */
const STRIP_MONTHS = 15;

export default function EaHub() {
  const { state, dispatch } = usePortal();
  const { nowUtc } = useSchedulingWorkspace();
  const trips = useTrips();
  const now = nowUtc();
  const today = useMemo(() => new Date(), []);

  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bumping, setBumping] = useState<string | null>(null);

  const months = useMemo(
    () => Array.from({ length: STRIP_MONTHS }, (_, i) => addMonths(today.getFullYear(), today.getMonth(), i)),
    [today],
  );
  const counts = useFreeCounts(trips, now, months);
  const monthCounts = counts[monthKey(cursor.year, cursor.month)];

  const hubTrips = useMemo(() => toHubTrips(state.requests), [state.requests]);
  const rail = useMemo(() => railFor(state.requests), [state.requests]);
  const selected = hubTrips.find(t => t.id === selectedId) ?? null;

  return (
    <PortalShell
      title="Your months"
      meta={
        <AsOf>
          {monthCounts
            ? `${MONTH_NAMES[cursor.month]} averages ${monthCounts.average} of 4 aircraft free per day${monthCounts.provisional ? ' — beyond the published crew roster, so a plan and not a promise' : ''}`
            : 'Availability loading'}
        </AsOf>
      }
    >
      <div className="flex flex-col gap-3">
        <MonthStrip months={months} current={cursor} counts={counts} onPick={setCursor} />

        <div className="flex flex-col gap-4 md:flex-row">
          <div className="min-w-0 flex-1">
            <MonthGrid
              year={cursor.year}
              month={cursor.month}
              today={today}
              trips={drawable(hubTrips)}
              freeByDate={monthCounts?.byDate ?? {}}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Solid means approved. Dashed means asked for — nothing is booked until scheduling says so.
              The number on each day is how many of the four aircraft are free.
            </p>
          </div>

          <HubRail rail={rail} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {selected && (
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-base font-semibold">{selected.label}</h2>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {selected.style === 'solid' ? 'Confirmed' : 'Asked for'}
              </span>
              {selected.span && (
                <span className="text-xs text-muted-foreground">
                  {selected.span.start}
                  {selected.span.end !== selected.span.start && ` → ${selected.span.end}`}
                </span>
              )}
              {state.persona === 'scheduling' && selected.request.status === 'approved' && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setBumping(selected.id)}>
                  Bump for a senior trip
                </Button>
              )}
              {state.persona === 'scheduling' && selected.request.bumpedBy && !selected.request.bumpedBy.reasonVisibleAt && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={() => dispatch({ type: 'DISCLOSE_BUMP_REASON', id: selected.id })}
                >
                  I have made the call
                </Button>
              )}
            </div>

            {selected.bumpLine && (
              <p className="mb-3 rounded-md border border-[color-mix(in_srgb,var(--gfo-gold,#C9A227)_55%,transparent)] bg-[color-mix(in_srgb,var(--gfo-gold,#C9A227)_8%,transparent)] px-3 py-2 text-sm">
                {selected.bumpLine}
              </p>
            )}

            <MessageThread
              messages={selected.request.messages}
              threadId={selected.id}
              label="Message board — you ↔ scheduling"
            />
          </div>
        )}
      </div>

      <BumpDialog
        requestId={bumping}
        onClose={() => setBumping(null)}
        onBump={(authorizedBy, reason) => {
          if (bumping) dispatch({ type: 'BUMP_REQUEST', id: bumping, authorizedBy, reason });
          setBumping(null);
        }}
      />
    </PortalShell>
  );
}
