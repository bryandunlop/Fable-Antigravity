// Frame B — new trip request. Per-leg manifest with a lead passenger, purpose
// per passenger per leg (the SIFL/SEC capture), a planning estimate as legs are
// built, and structured extras so the free-text note stays small.

import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PortalShell } from '../components/PortalShell';
import { Card, Chip, SectionLabel, purposeLabel } from '../components/portalUi';
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
  const location = useLocation() as { state?: { fromWatchId?: string; dates?: [string, string] } };
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

  const inputCls = 'border border-border bg-background px-2 py-1.5 text-sm';

  return (
    <PortalShell title="New trip request">
      {prefill?.fromWatchId && (
        <div className="mb-4 border border-[#D1AC6B] bg-[#D1AC6B]/10 px-4 py-2.5 text-sm">
          <Chip tone="gold">Freed</Chip> <span className="text-muted-foreground">Pre-filled from your fleet-date hold — adjust and submit.</span>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {legs.map((leg, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <SectionLabel>Leg {i + 1}</SectionLabel>
                {legs.length > 1 && (
                  <button type="button" className="text-xs text-destructive" onClick={() => setLegs((p) => p.filter((_, j) => j !== i))}>
                    Remove leg
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input aria-label={`Leg ${i + 1} from`} className={cn(inputCls, 'w-24 uppercase')} value={leg.from} onChange={(e) => updateLeg(i, { from: e.target.value.toUpperCase() })} />
                <span className="text-muted-foreground">→</span>
                <input aria-label={`Leg ${i + 1} to`} className={cn(inputCls, 'w-24 uppercase')} value={leg.to} onChange={(e) => updateLeg(i, { to: e.target.value.toUpperCase() })} />
                <input aria-label={`Leg ${i + 1} date`} type="date" className={inputCls} value={leg.date} onChange={(e) => updateLeg(i, { date: e.target.value })} />
                <input aria-label={`Leg ${i + 1} departure`} type="time" className={inputCls} value={leg.departLocal} onChange={(e) => updateLeg(i, { departLocal: e.target.value })} />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  flex ±
                  <input
                    aria-label={`Leg ${i + 1} flexibility hours`}
                    type="number" min={0} max={12}
                    className={cn(inputCls, 'w-14')}
                    value={leg.flexHours}
                    onChange={(e) => updateLeg(i, { flexHours: Number(e.target.value) })}
                  /> h
                </label>
                <Chip tone="info">est. {Math.floor(estimate(leg.from, leg.to).minutes / 60)} h {estimate(leg.from, leg.to).minutes % 60} m · {estimate(leg.from, leg.to).nm} nm</Chip>
              </div>

              <div className="mt-3 border-t border-border pt-3">
                <SectionLabel>Manifest — leg {i + 1}</SectionLabel>
                <div className="flex flex-col gap-1.5">
                  {bookable.map((p) => {
                    const on = leg.passengerIds.includes(p.id);
                    return (
                      <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <label className="flex w-44 items-center gap-2">
                          <input type="checkbox" checked={on} onChange={() => togglePassenger(i, p.id)} />
                          {p.name}
                          <span className="text-xs text-muted-foreground">{p.kind}</span>
                        </label>
                        {on && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateLeg(i, { leadId: p.id })}
                              className={cn('px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide', leg.leadId === p.id ? 'bg-[#D1AC6B]/20 text-[#8A6A24] dark:text-[#D1AC6B]' : 'border border-border text-muted-foreground')}
                            >
                              {leg.leadId === p.id ? 'Lead' : 'Set lead'}
                            </button>
                            <select
                              aria-label={`${p.name} purpose leg ${i + 1}`}
                              className={cn(inputCls, 'py-1 text-xs')}
                              value={leg.purposes[p.id] ?? 'business'}
                              onChange={(e) => updateLeg(i, { purposes: { ...leg.purposes, [p.id]: e.target.value as Purpose } })}
                            >
                              {PURPOSES.map((pu) => <option key={pu} value={pu}>{purposeLabel(pu)}</option>)}
                            </select>
                            {(leg.purposes[p.id] === 'personal' || leg.purposes[p.id] === 'entertainment') && (
                              <span className="text-[11px] text-[#8A5B00] dark:text-[#F1B434]">SIFL — imputed income, logged</span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}
          <button
            type="button"
            onClick={() => setLegs((p) => [...p, { ...emptyLeg(p[p.length - 1]?.date ?? defaultDate), from: p[p.length - 1]?.to ?? 'KTEB', to: p[0]?.from ?? 'KCVG' }])}
            className="self-start border border-[#0096FC] px-3 py-1.5 text-xs font-semibold text-[#0077CC] dark:text-[#4FB6FD]"
          >
            + Add leg
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <SectionLabel>Principal</SectionLabel>
            <select aria-label="Principal" className={cn(inputCls, 'w-full')} value={principalId} onChange={(e) => setPrincipalId(e.target.value)}>
              {state.passengers.filter((p) => p.kind === 'principal' && p.eaLevel !== 'view').map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-muted-foreground">Your View-level principals can't be booked for — ask for Book access.</p>
          </Card>
          <Card className="p-4">
            <SectionLabel>Extras</SectionLabel>
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
            <SectionLabel><span className="mt-3 inline-block">Note to scheduling</span></SectionLabel>
            <textarea
              aria-label="Note to scheduling"
              className={cn(inputCls, 'w-full')}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything the form can't say"
            />
          </Card>
          <Card className="p-4">
            <SectionLabel>Planning estimate</SectionLabel>
            <p className="text-sm"><span className="font-semibold">{Math.floor(totalMinutes / 60)} h {totalMinutes % 60} m</span> total flight time · {legs.length} leg{legs.length === 1 ? '' : 's'}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Estimate only — scheduling assigns aircraft and final times.</p>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className="mt-3 w-full bg-[#0096FC] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077CC] disabled:opacity-40"
            >
              Submit request
            </button>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
