import type { Trip, Aircraft, TechLogState } from '../tech-log/types';
import { deriveServiceability } from '../tech-log/engine/serviceability';
import { deriveCustody } from '../tech-log/engine/custody';
import { requiresFuelFarmSubmission } from '../tech-log/engine/fuel';
import type { Readiness } from '../../scheduling/engine/readiness';

/**
 * The pilot trip workspace is organised around four modules — FRAT & airport, Fuel, Maintenance
 * handover, Scheduling. This selector reduces a trip to one top-line status per module, shared by
 * both the four-module board cards and the My Flights glance strip so the vocabulary is identical
 * list → board. Card bodies still compute their own detail; this is only the headline.
 */
export type ModuleKey = 'frat' | 'fuel' | 'handover' | 'scheduling';

/** Tone drives colour: `custody` maps to the P&G-blue custody axis; `blocked`/`action`/`done`/`muted`
 *  map to RAG red / amber / green / neutral. Distinct axes — custody is never RAG. */
export type ModuleTone = 'done' | 'action' | 'custody' | 'blocked' | 'muted';

export interface ModuleStatus {
  key: ModuleKey;
  label: string;
  tone: ModuleTone;
  summary: string;
  /** Count of outstanding pilot items, for the glance strip's "N to prep" roll-up. */
  outstanding: number;
}

export function fratModule(tlTrip: Trip | null): ModuleStatus {
  const base = { key: 'frat' as const, label: 'FRAT & airport' };
  if (!tlTrip) return { ...base, tone: 'muted', summary: 'not released', outstanding: 0 };
  const legs = tlTrip.legs ?? [];
  const fratTodo = legs.filter((l) => l.fratStatus !== 'COMPLETED').length;
  const airportTodo = legs.filter((l) => !l.airportReviewed).length;
  const outstanding = fratTodo + airportTodo;
  return outstanding > 0
    ? { ...base, tone: 'action', summary: `${outstanding} to do`, outstanding }
    : { ...base, tone: 'done', summary: 'complete', outstanding: 0 };
}

export function fuelModule(tlTrip: Trip | null, aircraft: Aircraft | undefined): ModuleStatus {
  const base = { key: 'fuel' as const, label: 'Fuel' };
  if (!tlTrip) return { ...base, tone: 'muted', summary: 'not released', outstanding: 0 };
  const legs = tlTrip.legs ?? [];
  const required = aircraft ? legs.filter((l) => requiresFuelFarmSubmission(l, aircraft)) : [];
  if (required.length === 0) return { ...base, tone: 'muted', summary: 'not required', outstanding: 0 };
  const todo = required.filter((l) => !l.fuelRequestId).length;
  return todo > 0
    ? { ...base, tone: 'action', summary: `${todo} to submit`, outstanding: todo }
    : { ...base, tone: 'done', summary: 'submitted', outstanding: 0 };
}

export function handoverModule(
  aircraft: Aircraft | undefined,
  state: TechLogState,
  nowUtc: string,
): ModuleStatus {
  const base = { key: 'handover' as const, label: 'Handover' };
  // Handover is aircraft-keyed (by tail), not trip-keyed: it reflects the aircraft's real
  // serviceability + custody even before the trip is released to preflight (cold-open demo).
  if (!aircraft) return { ...base, tone: 'muted', summary: 'no aircraft', outstanding: 0 };
  /* RED grounding beats custody — a grounded aircraft is a hard stop regardless of who holds it —
     and so does having no dispatch answer at all (LG-143: this fell through to "ready to accept"
     for the tail in onboarding, because the projection used to hand it GREEN). Written as an
     allow-list so a future member of the union blocks by default rather than sailing past. */
  const sv = deriveServiceability(aircraft.id, state, nowUtc).status;
  if (sv === 'RED') return { ...base, tone: 'blocked', summary: 'grounded', outstanding: 1 };
  if (sv !== 'GREEN' && sv !== 'AMBER') {
    return { ...base, tone: 'blocked', summary: 'in onboarding', outstanding: 1 };
  }
  switch (deriveCustody(aircraft.id, state, nowUtc).state) {
    // Both crew-custody states sit on the P&G-blue axis — "ready to accept" is a custody prompt,
    // not an airworthiness warning, so it must not read amber.
    case 'WITH_CREW': return { ...base, tone: 'custody', summary: 'in your custody', outstanding: 0 };
    case 'OFFERED': return { ...base, tone: 'custody', summary: 'ready to accept', outstanding: 1 };
    default: return { ...base, tone: 'muted', summary: 'in maintenance', outstanding: 0 };
  }
}

export function schedulingModule(scheduling: Readiness | undefined): ModuleStatus {
  const base = { key: 'scheduling' as const, label: 'Scheduling' };
  if (!scheduling) return { ...base, tone: 'muted', summary: '—', outstanding: 0 };
  switch (scheduling.state) {
    case 'BLOCKED': return { ...base, tone: 'blocked', summary: scheduling.blocker ?? 'blocked', outstanding: 1 };
    case 'NOT_READY': return { ...base, tone: 'action', summary: scheduling.blocker ?? 'in progress', outstanding: 1 };
    default: return { ...base, tone: 'done', summary: 'on track', outstanding: 0 };
  }
}

/** All four module statuses in board/strip order. `scheduling` is passed in because it is the one
 *  piece derived asynchronously from the scheduling store; the rest is synchronous from tech-log. */
export function deriveTripModules(
  tlTrip: Trip | null,
  aircraft: Aircraft | undefined,
  state: TechLogState,
  scheduling: Readiness | undefined,
  nowUtc: string,
): ModuleStatus[] {
  return [
    fratModule(tlTrip),
    fuelModule(tlTrip, aircraft),
    handoverModule(aircraft, state, nowUtc),
    schedulingModule(scheduling),
  ];
}

/** Total outstanding pilot items across the modules — the glance strip's "N to prep" badge. */
export function totalOutstanding(modules: ModuleStatus[]): number {
  return modules.reduce((n, m) => n + m.outstanding, 0);
}
