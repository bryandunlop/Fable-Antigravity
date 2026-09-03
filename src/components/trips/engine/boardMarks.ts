// What the fleet board says about a booking without opening it (D110 slice 3, Bryan: "steal the crew
// row and the gates on the block"). The marks come from the same facts the trip workspace reads —
// blocking document gates, pending change requests, crew — so the block and the page cannot disagree.
// Pure.

import { blockingGates, documentGates, type DocumentPolicy } from './documentGates';
import type { Person } from './people';
import { pendingChanges, type Trip, type TripCrew } from './trip';

export interface BoardMarks {
  /** Unresolved document gates on people aboard. */
  gates: number;
  /** Change requests scheduling has not decided. */
  changes: number;
  /** Assigned aircraft, nobody flying it yet. */
  crewMissing: boolean;
  crew: TripCrew | null;
}

const isLive = (t: Trip) => t.status === 'submitted' || t.status === 'confirmed';

export function boardMarksFor(trips: Trip[], people: Person[], policy: DocumentPolicy, nowUtc: string): Map<string, BoardMarks> {
  const out = new Map<string, BoardMarks>();
  for (const t of trips) {
    if (!isLive(t)) continue;
    const gates = blockingGates(t, documentGates(t, people, policy, nowUtc)).length;
    out.set(t.id, { gates, changes: pendingChanges(t).length, crewMissing: !!t.tail && !t.crew, crew: t.crew });
  }
  return out;
}

/** Short labels for a block: "✕ passport" style, in the order a scheduler reads them. */
export function markLabels(m: BoardMarks | undefined): string[] {
  if (!m) return [];
  const out: string[] = [];
  if (m.gates > 0) out.push(m.gates === 1 ? '✕ gate' : `✕ ${m.gates} gates`);
  if (m.changes > 0) out.push(m.changes === 1 ? '△ change' : `△ ${m.changes} changes`);
  return out;
}

/** Submitted bookings with no aircraft — the board's Unassigned lane. These never reach the scheduling store (LG-372). */
export function unassignedBookings(trips: Trip[]): Trip[] {
  return trips.filter(t => t.status === 'submitted' && !t.tail && t.visibleToScheduling);
}

/** "Hart / Lim · FA Nguyen" for a crew chip. */
export function crewLabel(crew: TripCrew | null): string | null {
  if (!crew) return null;
  const short = (n: string) => n.replace(/^(Capt\.|FO|Captain)\s+/i, '').split(' ').pop() ?? n;
  return `${short(crew.pic)} / ${short(crew.sic)}${crew.fa ? ` · FA ${short(crew.fa)}` : ''}`;
}
