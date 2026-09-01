// Frame B — new trip request.
//
// Rebuilt on the D100 design pass (2026-08-29) around two things an EA actually
// has at request time: the LEAD PASSENGER and roughly WHEN he needs to be
// somewhere. Everything else — the rest of the party, their forms, the exact
// departure — arrives later, so the page says so rather than demanding it. See
// engine/legTiming (what's fixed) and engine/requestReadiness (why submit is off).

import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFleetAvailability } from '../../hooks/useFleetAvailability';
import { readAvailabilityForDates } from '../../../availability/source';
import { datesForLegs, requestedTailStatus, summarizeByDay } from '../engine/requestAvailability';
import { CalendarDays, ChefHat, Plane, Plus, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { PortalShell } from '../components/PortalShell';
import { TimingPicker } from '../components/TimingPicker';
import { Chip, SectionLabel, purposeLabel } from '../components/portalUi';
import { QuotePanel, savingsAvailable } from '../components/QuotePanel';
import { GFO_RATE_CARD, daysUntil, quoteRequest } from '../engine/quote';
import { expectedDeparture, latitudeHours, type LegTiming } from '../engine/legTiming';
import { submitBlockers, clampSeats, type DraftLeg } from '../engine/requestReadiness';
import { SeatsFit } from '../components/SeatsFit';
import { suggestProfile } from '../engine/missionProfile';
import type { MissionProfile } from '../../../fleet/capacity';
import { usePortal } from '../BookingPortalContext';
import type { Purpose, RequestLeg } from '../types';
import { cn } from '../../ui/utils';

const PURPOSES: Purpose[] = ['business', 'personal', 'entertainment', 'commuting'];
// Bryan cut 'Pets' on the design canvas (2026-08-29) — the department does not
// carry them, so offering it invites a request nobody can fill.
const EXTRAS = ['Ground at destination', 'Extra baggage'];

const EST: Record<string, { minutes: number; nm: number }> = {
  'KCVG-KTEB': { minutes: 105, nm: 570 },
  'KTEB-KCVG': { minutes: 125, nm: 570 },
  'KCVG-KATL': { minutes: 80, nm: 373 },
  'KLUK-KORD': { minutes: 75, nm: 250 },
  'KLUK-KAUS': { minutes: 145, nm: 920 },
  'KCVG-EGGW': { minutes: 460, nm: 3400 },
};

function estimate(from: string, to: string) {
  return EST[`${from}-${to}`] ?? { minutes: 120, nm: 500 };
}

function emptyLeg(date: string): DraftLeg {
  return {
    from: 'KCVG',
    to: 'KTEB',
    date,
    // Arrive-by is the default because it is usually the true constraint, and it
    // hands scheduling the whole window rather than a time nobody asked for.
    timing: { kind: 'arrive', arriveByLocal: '09:00' },
    extraPassengerIds: [],
    purposes: {},
  };
}

/** The manifest due date the page promises: five days before the first departure. */
const MANIFEST_PROMPT_DAYS = 5;

function manifestPromptDate(firstLegDate: string): string | null {
  const t = Date.parse(`${firstLegDate}T00:00:00`);
  if (Number.isNaN(t)) return null;
  return new Date(t - MANIFEST_PROMPT_DAYS * 86_400_000).toLocaleDateString('en-US', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

export default function NewRequest() {
  const { state, dispatch } = usePortal();
  const navigate = useNavigate();
  // `fromExecutive` is what D99's fleet-week "Ask my EA" button sends. It was declared nowhere and
  // `dates` was typed as a 2-tuple while the fleet week sends a 1-tuple — so the tail an executive
  // picked was silently dropped between the two surfaces. Both branches found this independently;
  // this is the availability-branch fix, which also carries the tail into the request record
  // as `requestedTail` rather than only rendering a banner (LG-311, D99/D100 reconcile).
  const location = useLocation() as {
    state?: {
      fromWatchId?: string;
      dates?: string[];
      fromExecutive?: { tail: string; dateUtc: string };
    };
  };
  const prefill = location.state;

  const inTwoWeeks = new Date();
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
  const defaultDate =
    prefill?.fromExecutive?.dateUtc ?? prefill?.dates?.[0] ?? inTwoWeeks.toISOString().slice(0, 10);

  const [legs, setLegs] = useState<DraftLeg[]>([emptyLeg(defaultDate)]);
  const [principalId, setPrincipalId] = useState('P-REYES');
  const [seatsHeld, setSeatsHeld] = useState(2);
  // Suggested from the route, overridable by her — and the override is remembered as an
  // override, so a later leg edit does not silently undo a decision she made.
  const [profileOverride, setProfileOverride] = useState<MissionProfile | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [requestedTail, setRequestedTail] = useState<string | null>(prefill?.fromExecutive?.tail ?? null);

  // Advisory availability for the days being asked about. The audience comes from the hook, so an
  // EA sees exactly the reason categories an executive would — never the defect behind them.
  const { audience, nowUtc, trips } = useFleetAvailability(undefined, [], 1);
  const legDates = useMemo(() => datesForLegs(legs), [legs]);
  const availabilityLines = useMemo(
    () => summarizeByDay(readAvailabilityForDates({ trips }, legDates, audience, nowUtc), legDates),
    [trips, legDates, audience, nowUtc],
  );

  const profileSuggestion = useMemo(
    () => suggestProfile(legs.map(l => ({ from: l.from, to: l.to, departLocal: l.departLocal }))),
    [legs],
  );

  const bookablePrincipals = state.passengers.filter((p) => p.kind === 'principal' && p.eaLevel !== 'view');
  const addable = state.passengers.filter((p) => p.id !== principalId && (p.kind !== 'principal' || p.eaLevel !== 'view'));

  const namedCount = useMemo(() => {
    const ids = new Set<string>([principalId, ...legs.flatMap((l) => l.extraPassengerIds)]);
    return ids.size;
  }, [principalId, legs]);

  const blockers = useMemo(
    () => submitBlockers({ legs, leadPassengerId: principalId }, state.passengers),
    [legs, principalId, state.passengers],
  );

  const totalMinutes = useMemo(
    () => legs.reduce((sum, l) => sum + estimate(l.from, l.to).minutes, 0),
    [legs],
  );

  // Quoted against a fixed "today" so the estimate does not move mid-edit.
  const asOf = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const quote = useMemo(
    () =>
      quoteRequest(
        legs.map((l) => ({
          estMinutes: estimate(l.from, l.to).minutes,
          date: l.date,
          // Latitude given to scheduling is what the rate card rewards — an
          // arrive-by or flexible leg is worth more than a firm departure.
          // latitudeHours is ALREADY on the rate card's scale; halving it here
          // silently sank the default arrive-by leg below flexThresholdHours,
          // so the credit the comment promises never fired.
          flexHours: latitudeHours(l.timing),
          purposes: [principalId, ...l.extraPassengerIds].map((pid) => l.purposes[pid] ?? 'business'),
          sharedRepositioning: false,
        })),
        asOf,
      ),
    [legs, principalId, asOf],
  );
  const savings = useMemo(() => {
    const leadDays = legs.length ? daysUntil(asOf, [...legs].map((l) => l.date).sort()[0]) : 0;
    return savingsAvailable(quote, {
      leadDays,
      earlyBookingDays: GFO_RATE_CARD.earlyBookingDays,
      allFlexed: legs.length > 0 && legs.every((l) => latitudeHours(l.timing) >= GFO_RATE_CARD.flexThresholdHours),
      anySharedRepo: false,
    });
  }, [quote, legs, asOf]);

  const updateLeg = (i: number, patch: Partial<DraftLeg>) =>
    setLegs((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const toggleExtraPassenger = (i: number, pid: string) =>
    setLegs((prev) =>
      prev.map((l, j) => {
        if (j !== i) return l;
        const on = l.extraPassengerIds.includes(pid);
        return {
          ...l,
          extraPassengerIds: on ? l.extraPassengerIds.filter((x) => x !== pid) : [...l.extraPassengerIds, pid],
          purposes: { ...l.purposes, [pid]: l.purposes[pid] ?? 'business' },
        };
      }),
    );

  const submit = () => {
    if (blockers.length > 0) return;
    const requestLegs: RequestLeg[] = legs.map((l, i) => {
      const est = estimate(l.from, l.to);
      // With from/to/date, an arrive-by across zones resolves to the ORIGIN's clock. Without
      // them this stored the arrival field's clock as the departure — and every downstream
      // reader (itinerary, queue, calendar) then read it as local to the origin (TL-47).
      const derived = expectedDeparture(l.timing, est.minutes, { from: l.from, to: l.to, date: l.date });
      return {
        id: `L-${Date.now()}-${i}`,
        from: l.from,
        to: l.to,
        date: l.date,
        // departLocal stays the expected departure so every existing reader
        // (itinerary, queue, calendar) keeps working; `timing` carries the truth.
        departLocal: derived ?? '08:00',
        flexHours: l.timing.kind === 'depart' ? l.timing.flexHours : Math.round(latitudeHours(l.timing)),
        timing: l.timing,
        estMinutes: est.minutes,
        estNm: est.nm,
        passengers: [
          { passengerId: principalId, lead: true, purpose: l.purposes[principalId] ?? 'business' },
          ...l.extraPassengerIds.map((pid) => ({ passengerId: pid, purpose: l.purposes[pid] ?? 'business' })),
        ],
      };
    });
    dispatch({
      type: 'SUBMIT_REQUEST',
      legs: requestLegs,
      principalId,
      extras,
      note: note || undefined,
      fromWatchId: prefill?.fromWatchId,
      requestedTail: requestedTail ?? undefined,
      seatsHeld: clampSeats(seatsHeld, namedCount),
    });
    navigate('/booking-portal/requests');
  };

  const field = 'rounded-md border bg-background px-2.5 py-1.5 text-sm';
  const leadPerson = state.passengers.find((p) => p.id === principalId);
  const promptDate = legs[0] ? manifestPromptDate(legs[0].date) : null;

  return (
    <PortalShell
      title="New trip request"
      meta={
        leadPerson ? (
          <span className="text-sm text-muted-foreground">
            For {leadPerson.name} · tell scheduling what is fixed and what isn't
          </span>
        ) : undefined
      }
    >
      {prefill?.fromWatchId && (
        <Card className="mb-4 border-l-[3px] border-l-[var(--gfo-sunrise,#D1AC6B)]">
          <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
            <Chip tone="gold">Freed</Chip>
            <span className="text-muted-foreground">Pre-filled from your fleet-date hold — adjust and submit.</span>
          </CardContent>
        </Card>
      )}

      {requestedTail && (
        <Card className="mb-4 border-l-[3px] border-l-[var(--gfo-sunrise,#D1AC6B)]">
          <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
            <Chip tone="gold">{requestedTail}</Chip>
            <span className="text-muted-foreground">
              Requested from your fleet view
              {prefill?.fromExecutive?.dateUtc ? ` on ${prefill.fromExecutive.dateUtc}, and the date is pre-filled` : ''}.
              Availability is not a hold; scheduling still assigns the aircraft.
            </span>
            <button
              type="button"
              className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setRequestedTail(null)}
            >
              Remove
            </button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {legs.map((leg, i) => {
            const est = estimate(leg.from, leg.to);
            return (
              <Card key={i}>
                <CardHeader className="py-4">
                  <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
                    <span className="status-badge status-info p-1.5"><Plane className="h-4 w-4" /></span>
                    Leg {i + 1}
                    <Badge variant="outline" className="text-[10px]">
                      est. {Math.floor(est.minutes / 60)} h {est.minutes % 60} m · {est.nm} nm
                    </Badge>
                    {legs.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-destructive"
                        onClick={() => setLegs((p) => p.filter((_, j) => j !== i))}
                      >
                        Remove
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex flex-wrap items-center gap-2.5" data-tour={i === 0 ? 'leg-fields' : undefined}>
                    <input aria-label={`Leg ${i + 1} from`} className={cn(field, 'w-24 uppercase')} value={leg.from} onChange={(e) => updateLeg(i, { from: e.target.value.toUpperCase() })} />
                    <span className="text-muted-foreground">→</span>
                    <input aria-label={`Leg ${i + 1} to`} className={cn(field, 'w-24 uppercase')} value={leg.to} onChange={(e) => updateLeg(i, { to: e.target.value.toUpperCase() })} />
                    <input aria-label={`Leg ${i + 1} date`} type="date" className={field} value={leg.date} onChange={(e) => updateLeg(i, { date: e.target.value })} />
                  </div>

                  <TimingPicker
                    legLabel={`leg-${i + 1}`}
                    timing={leg.timing}
                    onChange={(t: LegTiming) => updateLeg(i, { timing: t })}
                    departureAirport={leg.from}
                    arrivalAirport={leg.to}
                    date={leg.date}
                    estMinutes={est.minutes}
                  />

                  {/* Names beyond the lead — optional, and said to be optional. */}
                  <div className="rounded-lg border" data-tour={i === 0 ? 'manifest' : undefined}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b bg-muted/50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Anyone else on leg {i + 1}
                      </p>
                      <p className="text-xs text-muted-foreground">Optional — names can follow later</p>
                    </div>
                    <div className="divide-y">
                      {addable.map((p) => {
                        const on = leg.extraPassengerIds.includes(p.id);
                        const purpose = leg.purposes[p.id] ?? 'business';
                        return (
                          <div key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                            <label className="flex w-44 items-center gap-2">
                              <input type="checkbox" checked={on} onChange={() => toggleExtraPassenger(i, p.id)} />
                              {p.name}
                              <span className="text-xs text-muted-foreground">{p.kind}</span>
                            </label>
                            {on && (
                              <>
                                <select
                                  aria-label={`${p.name} purpose leg ${i + 1}`}
                                  className={cn(field, 'py-1 text-xs')}
                                  value={purpose}
                                  onChange={(e) => updateLeg(i, { purposes: { ...leg.purposes, [p.id]: e.target.value as Purpose } })}
                                >
                                  {PURPOSES.map((pu) => <option key={pu} value={pu}>{purposeLabel(pu)}</option>)}
                                </select>
                                {(purpose === 'personal' || purpose === 'entertainment') && (
                                  <Chip tone="flag">SIFL — imputed income, logged</Chip>
                                )}
                              </>
                            )}
                            {!p.hasFlown && (
                              <span className="text-xs text-muted-foreground">Never flown — travel form sends on submit</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <LegAvailability
                    line={availabilityLines.find(l => l.dateUtc === leg.date) ?? null}
                    requestedTail={requestedTailStatus(availabilityLines, requestedTail, leg.date)}
                  />
                </CardContent>
              </Card>
            );
          })}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setLegs((p) => [...p, { ...emptyLeg(p[p.length - 1]?.date ?? defaultDate), from: p[p.length - 1]?.to ?? 'KTEB', to: p[0]?.from ?? 'KCVG' }])}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add a leg
            </Button>
          </div>

          <Card>
            <CardHeader className="py-4"><CardTitle className="text-base">Anything else scheduling should know</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0">
              {/* Catering is a choice with a price and its own clock, not a checkbox. */}
              <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <ChefHat className="h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Catering — not chosen yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Set menus from $28 a head, orderable up to 24 h out — this can wait until you know who's on board.
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled title="Menus land in the next slice">Choose menus</Button>
              </div>

              <div className="flex flex-wrap gap-1.5 text-sm">
                {EXTRAS.map((x) => {
                  const on = extras.includes(x);
                  return (
                    <button
                      key={x}
                      type="button"
                      onClick={() => setExtras((p) => (p.includes(x) ? p.filter((e) => e !== x) : [...p, x]))}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        on ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary',
                      )}
                    >
                      {x}
                    </button>
                  );
                })}
              </div>

              <div>
                <SectionLabel>Note to scheduling</SectionLabel>
                <textarea
                  aria-label="Note to scheduling"
                  className={cn(field, 'w-full')}
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything the form can't say"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Decision rail ── */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="py-4"><CardTitle className="text-base">Who's flying</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div>
                <SectionLabel>Lead passenger</SectionLabel>
                <select aria-label="Lead passenger" className={cn(field, 'w-full')} value={principalId} onChange={(e) => setPrincipalId(e.target.value)}>
                  {bookablePrincipals.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  All scheduling needs today. Your View-level principals can't be booked for.
                </p>
              </div>

              <div>
                <SectionLabel>Seats to hold</SectionLabel>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setSeatsHeld((s) => clampSeats(s - 1, namedCount))}>−</Button>
                  <span className="gfo-numeric w-10 text-center text-xl text-primary">{clampSeats(seatsHeld, namedCount)}</span>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setSeatsHeld((s) => clampSeats(s + 1, namedCount))}>+</Button>
                  <span className="text-xs text-muted-foreground">an estimate is fine</span>
                </div>
              </div>

              <SeatsFit
                seats={clampSeats(seatsHeld, namedCount)}
                profile={profileOverride ?? profileSuggestion.profile}
                suggestion={profileSuggestion}
                overridden={profileOverride !== null}
                onProfileChange={setProfileOverride}
              />

              {promptDate && (
                <p className="flex items-start gap-1.5 border-t pt-3 text-xs text-muted-foreground">
                  <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    We'll ask you again on <span className="font-medium text-foreground">{promptDate}</span>, five days
                    out. New guests get a travel form, and we chase those for you.
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          <QuotePanel quote={quote} savings={savings} />

          <Card>
            <CardHeader className="py-4"><CardTitle className="text-base">Planning estimate</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-sm">
                <span className="font-semibold">{Math.floor(totalMinutes / 60)} h {totalMinutes % 60} m</span>
                {' '}total flight time · {legs.length} leg{legs.length === 1 ? '' : 's'}
                {' · '}{clampSeats(seatsHeld, namedCount)} seat{clampSeats(seatsHeld, namedCount) === 1 ? '' : 's'}
              </p>

              {blockers.length > 0 ? (
                <div className="rounded-lg border border-[color-mix(in_srgb,var(--gfo-warning,#F1B434)_45%,transparent)] bg-[color-mix(in_srgb,var(--gfo-warning,#F1B434)_10%,transparent)] p-3">
                  <p className="text-sm font-medium">
                    {blockers.length === 1 ? 'One thing first' : `${blockers.length} things first`}
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                    {blockers.map((b, i) => <li key={`${b.code}-${b.passengerId ?? b.legIndex ?? i}`}>{b.message}</li>)}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Lead passenger named and the timing is stated. Everything else can follow.
                </p>
              )}

              <Button className="w-full" disabled={blockers.length > 0} onClick={submit}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                Send to scheduling
              </Button>
              <p className="text-center text-xs text-muted-foreground">Decisions usually same day</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}

/**
 * The fleet picture for one leg's date, in the reason categories an executive sees.
 *
 * Advisory, never blocking: scheduling assigns the aircraft, and asking for a tight day is a
 * legitimate ask. What this prevents is the EA finding out a week later.
 */
function LegAvailability({
  line,
  requestedTail,
}: {
  line: ReturnType<typeof summarizeByDay>[number] | null;
  requestedTail: ReturnType<typeof requestedTailStatus>;
}) {
  if (!line || line.tails.length === 0) return null;

  return (
    <div className="mt-3 border-t pt-3 text-sm">
      {requestedTail && !requestedTail.available && (
        <p className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <Chip tone="gold">{requestedTail.tail}</Chip>
          <span className="text-muted-foreground">{requestedTail.label} on this date.</span>
        </p>
      )}

      {line.availableTails.length > 0 ? (
        <p className="text-muted-foreground">
          Free that day: <span className="text-foreground">{line.availableTails.join(', ')}</span>
        </p>
      ) : (
        <p className="text-muted-foreground">
          No aircraft is free that day — scheduling will look at moving something.
        </p>
      )}

      <p className="mt-1 text-xs text-muted-foreground">
        {line.tails
          .filter(t => !t.available)
          // Lower-case only the leading word so the sentence reads as a clause after the tail —
          // lower-casing the whole label mangles the month in "In maintenance until 5 Sep".
          .map(t => {
            const label = t.label ?? 'Unavailable';
            return `${t.tail} ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
          })
          .join(' · ')}
      </p>
    </div>
  );
}
