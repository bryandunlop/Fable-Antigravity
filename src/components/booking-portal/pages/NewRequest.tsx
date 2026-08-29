// Frame B — new trip request. Per-leg manifest with a lead passenger, purpose
// per passenger per leg (the SIFL/SEC capture), a planning estimate as legs are
// built, and structured extras so the free-text note stays small.

import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plane, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { PortalShell } from '../components/PortalShell';
import { Chip, SectionLabel, purposeLabel } from '../components/portalUi';
import { QuotePanel, savingsAvailable } from '../components/QuotePanel';
import { GFO_RATE_CARD, daysUntil, quoteRequest } from '../engine/quote';
import { usePortal } from '../BookingPortalContext';
import type { Purpose, RequestLeg } from '../types';
import { cn } from '../../ui/utils';

const PURPOSES: Purpose[] = ['business', 'personal', 'entertainment', 'commuting'];
const EXTRAS = ['Catering — light', 'Ground at destination', 'Pets', 'Extra baggage'];

// Rough planning numbers per airport pair; anything unknown gets a generic figure.
const EST: Record<string, { minutes: number; nm: number }> = {
  'KCVG-KTEB': { minutes: 105, nm: 570 },
  'KTEB-KCVG': { minutes: 125, nm: 570 },
  'KCVG-KATL': { minutes: 80, nm: 373 },
  'KLUK-KORD': { minutes: 75, nm: 250 },
  'KLUK-KAUS': { minutes: 145, nm: 920 },
  'KCVG-EGGW': { minutes: 460, nm: 3400 },
};

interface DraftLeg {
  from: string;
  to: string;
  date: string;
  departLocal: string;
  flexHours: number;
  passengerIds: string[];
  leadId: string;
  purposes: Record<string, Purpose>;
}

function estimate(from: string, to: string) {
  return EST[`${from}-${to}`] ?? { minutes: 120, nm: 500 };
}

function emptyLeg(date: string): DraftLeg {
  return { from: 'KCVG', to: 'KTEB', date, departLocal: '08:00', flexHours: 0, passengerIds: [], leadId: '', purposes: {} };
}

export default function NewRequest() {
  const { state, dispatch } = usePortal();
  const navigate = useNavigate();
  // `fromExecutive` is what D99's fleet-week "Ask my EA" button sends. It was
  // declared nowhere, so the tail the executive actually pointed at was silently
  // dropped and only the date survived (found in the D100 scan).
  const location = useLocation() as {
    state?: {
      fromWatchId?: string;
      dates?: [string, string];
      fromExecutive?: { tail: string; dateUtc: string };
    };
  };
  const prefill = location.state;

  const inTwoWeeks = new Date();
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
  const defaultDate = prefill?.dates?.[0] ?? inTwoWeeks.toISOString().slice(0, 10);

  const [legs, setLegs] = useState<DraftLeg[]>([emptyLeg(defaultDate)]);
  const [principalId, setPrincipalId] = useState('P-REYES');
  const [extras, setExtras] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const bookable = state.passengers.filter((p) => p.kind !== 'principal' || p.eaLevel !== 'view');
  const totalMinutes = useMemo(
    () => legs.reduce((sum, l) => sum + estimate(l.from, l.to).minutes, 0),
    [legs],
  );

  // Quoted against a fixed "today" rather than the live clock, so the estimate an
  // EA is looking at does not silently change underneath them mid-edit.
  const asOf = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const quote = useMemo(
    () =>
      quoteRequest(
        legs.map((l) => ({
          estMinutes: estimate(l.from, l.to).minutes,
          date: l.date,
          flexHours: l.flexHours,
          purposes: l.passengerIds.map((pid) => l.purposes[pid] ?? 'business'),
          sharedRepositioning: false,
        })),
        asOf,
      ),
    [legs, asOf],
  );
  const savings = useMemo(() => {
    const leadDays = legs.length ? daysUntil(asOf, [...legs].map((l) => l.date).sort()[0]) : 0;
    return savingsAvailable(quote, {
      leadDays,
      earlyBookingDays: GFO_RATE_CARD.earlyBookingDays,
      allFlexed: legs.length > 0 && legs.every((l) => l.flexHours >= GFO_RATE_CARD.flexThresholdHours),
      anySharedRepo: false,
    });
  }, [quote, legs, asOf]);

  const updateLeg = (i: number, patch: Partial<DraftLeg>) =>
    setLegs((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const togglePassenger = (i: number, pid: string) =>
    setLegs((prev) =>
      prev.map((l, j) => {
        if (j !== i) return l;
        const on = l.passengerIds.includes(pid);
        return {
          ...l,
          passengerIds: on ? l.passengerIds.filter((x) => x !== pid) : [...l.passengerIds, pid],
          leadId: on && l.leadId === pid ? '' : l.leadId || pid,
          purposes: { ...l.purposes, [pid]: l.purposes[pid] ?? 'business' },
        };
      }),
    );

  const canSubmit = legs.every((l) => l.from && l.to && l.date && l.passengerIds.length > 0);

  const submit = () => {
    const requestLegs: RequestLeg[] = legs.map((l, i) => {
      const est = estimate(l.from, l.to);
      return {
        id: `L-${Date.now()}-${i}`,
        from: l.from,
        to: l.to,
        date: l.date,
        departLocal: l.departLocal,
        flexHours: l.flexHours,
        estMinutes: est.minutes,
        estNm: est.nm,
        passengers: l.passengerIds.map((pid) => ({
          passengerId: pid,
          lead: pid === l.leadId,
          purpose: l.purposes[pid] ?? 'business',
        })),
      };
    });
    dispatch({ type: 'SUBMIT_REQUEST', legs: requestLegs, principalId, extras, note: note || undefined, fromWatchId: prefill?.fromWatchId });
    navigate('/booking-portal/requests');
  };

  const field = 'rounded-md border bg-background px-2.5 py-1.5 text-sm';

  return (
    <PortalShell title="New trip request">
      {prefill?.fromWatchId && (
        <Card className="mb-4 border-l-[3px] border-l-[var(--gfo-sunrise,#D1AC6B)]">
          <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
            <Chip tone="gold">Freed</Chip>
            <span className="text-muted-foreground">Pre-filled from your fleet-date hold — adjust and submit.</span>
          </CardContent>
        </Card>
      )}

      {prefill?.fromExecutive && (
        <Card className="mb-4 border-l-[3px] border-l-[var(--gfo-daylight,#0096FC)]">
          <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
            <Chip tone="info">From the fleet week</Chip>
            <span className="text-muted-foreground">
              An executive marked <span className="font-medium text-foreground">{prefill.fromExecutive.tail}</span> open on{' '}
              <span className="font-medium text-foreground">{prefill.fromExecutive.dateUtc}</span> — the date is pre-filled.
              Availability is not a hold; scheduling still confirms the tail.
            </span>
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
                    <input aria-label={`Leg ${i + 1} departure`} type="time" className={field} value={leg.departLocal} onChange={(e) => updateLeg(i, { departLocal: e.target.value })} />
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      flex ±
                      <input
                        aria-label={`Leg ${i + 1} flexibility hours`}
                        type="number" min={0} max={12}
                        className={cn(field, 'w-16')}
                        value={leg.flexHours}
                        onChange={(e) => updateLeg(i, { flexHours: Number(e.target.value) })}
                      /> h
                    </label>
                  </div>

                  <div className="rounded-lg border" data-tour={i === 0 ? 'manifest' : undefined}>
                    <p className="border-b bg-muted/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Manifest — leg {i + 1}
                    </p>
                    <div className="divide-y">
                      {bookable.map((p) => {
                        const on = leg.passengerIds.includes(p.id);
                        return (
                          <div key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                            <label className="flex w-44 items-center gap-2">
                              <input type="checkbox" checked={on} onChange={() => togglePassenger(i, p.id)} />
                              {p.name}
                              <span className="text-xs text-muted-foreground">{p.kind}</span>
                            </label>
                            {on && (
                              <>
                                <Button
                                  variant={leg.leadId === p.id ? 'secondary' : 'outline'}
                                  size="sm"
                                  className="h-7 text-[10px]"
                                  onClick={() => updateLeg(i, { leadId: p.id })}
                                >
                                  {leg.leadId === p.id ? 'Lead' : 'Set lead'}
                                </Button>
                                <select
                                  aria-label={`${p.name} purpose leg ${i + 1}`}
                                  className={cn(field, 'py-1 text-xs')}
                                  value={leg.purposes[p.id] ?? 'business'}
                                  onChange={(e) => updateLeg(i, { purposes: { ...leg.purposes, [p.id]: e.target.value as Purpose } })}
                                >
                                  {PURPOSES.map((pu) => <option key={pu} value={pu}>{purposeLabel(pu)}</option>)}
                                </select>
                                {(leg.purposes[p.id] === 'personal' || leg.purposes[p.id] === 'entertainment') && (
                                  <Chip tone="flag">SIFL — imputed income, logged</Chip>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <Button
            variant="outline"
            className="self-start"
            onClick={() => setLegs((p) => [...p, { ...emptyLeg(p[p.length - 1]?.date ?? defaultDate), from: p[p.length - 1]?.to ?? 'KTEB', to: p[0]?.from ?? 'KCVG' }])}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add leg
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="py-4"><CardTitle className="text-base">Principal</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <select aria-label="Principal" className={cn(field, 'w-full')} value={principalId} onChange={(e) => setPrincipalId(e.target.value)}>
                {state.passengers.filter((p) => p.kind === 'principal' && p.eaLevel !== 'view').map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-muted-foreground">
                Your View-level principals can't be booked for — ask for Book access.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4"><CardTitle className="text-base">Extras</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex flex-col gap-1.5 text-sm">
                {EXTRAS.map((x) => (
                  <label key={x} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={extras.includes(x)}
                      onChange={() => setExtras((p) => (p.includes(x) ? p.filter((e) => e !== x) : [...p, x]))}
                    />
                    {x}
                  </label>
                ))}
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

          <QuotePanel quote={quote} savings={savings} />

          <Card>
            <CardHeader className="py-4"><CardTitle className="text-base">Planning estimate</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-sm">
                <span className="font-semibold">{Math.floor(totalMinutes / 60)} h {totalMinutes % 60} m</span>
                {' '}total flight time · {legs.length} leg{legs.length === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-muted-foreground">
                Estimate only — scheduling assigns aircraft and final times, and the cost estimate moves with them.
              </p>
              <Button className="w-full" disabled={!canSubmit} onClick={submit}>Submit request</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
