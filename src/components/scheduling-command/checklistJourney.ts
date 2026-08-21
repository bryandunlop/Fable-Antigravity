import type { TaskInstance } from '../../scheduling/engine';
import type { TripLegRecord } from '../../scheduling/store/types';

// The trip checklist as a JOURNEY (D87 family, LG-259): whole-trip work first, then each leg in
// flight order, with a NOW marker that moves through the sections as the trip does. Advisory
// reflags (D89) surface as always-visible flagged rows — cleared work stays cleared; the flag is
// information, never a demand. Pure; all time inputs explicit.

export interface JourneySection {
  key: string;               // 'trip' or the legId
  kind: 'trip' | 'leg';
  legId?: string;
  sequence?: number;
  departureIcao?: string;
  arrivalIcao?: string;
  departureTimeUtc?: string;
  paxCount?: number;
  open: TaskInstance[];      // time-ordered by dueAtUtc
  flagged: TaskInstance[];   // settled but carrying an advisory reflag — always visible
  cleared: TaskInstance[];   // settled, unflagged — folds to a ledge
}

export interface ChecklistJourney {
  sections: JourneySection[];
  /** The NOW marker renders after sections[nowAfterIndex]; -1 = before the first leg section. */
  nowAfterIndex: number;
}

const isSettled = (t: TaskInstance) => t.status === 'done' || t.status === 'n_a' || t.status === 'cancelled';
const dueMs = (t: TaskInstance) => new Date(t.dueAtUtc).getTime();
const clearedMs = (t: TaskInstance) => new Date(t.completedAtUtc ?? t.dueAtUtc).getTime();

export function buildChecklistJourney(
  legs: TripLegRecord[],
  instances: TaskInstance[],
  nowMs: number,
): ChecklistJourney {
  const orderedLegs = [...legs].sort((a, b) => a.sequence - b.sequence);
  const legIds = new Set(orderedLegs.map(l => l.id));

  const bucket = new Map<string, TaskInstance[]>();
  for (const t of instances) {
    // An instance pointing at a leg the trip no longer has falls back to the trip section —
    // losing a task silently is worse than mis-filing it.
    const key = t.legId && legIds.has(t.legId) ? t.legId : 'trip';
    (bucket.get(key) ?? bucket.set(key, []).get(key)!).push(t);
  }

  const toSection = (key: string, kind: 'trip' | 'leg', leg?: TripLegRecord): JourneySection | null => {
    const xs = bucket.get(key) ?? [];
    if (xs.length === 0) return null;
    const settled = xs.filter(isSettled);
    return {
      key, kind,
      legId: leg?.id, sequence: leg?.sequence,
      departureIcao: leg?.departureIcao, arrivalIcao: leg?.arrivalIcao,
      departureTimeUtc: leg?.departureTimeUtc, paxCount: leg?.paxCount,
      open: xs.filter(t => !isSettled(t)).sort((a, b) => dueMs(a) - dueMs(b)),
      flagged: settled.filter(t => t.reflag && t.status !== 'cancelled').sort((a, b) => clearedMs(a) - clearedMs(b)),
      cleared: settled.filter(t => !t.reflag || t.status === 'cancelled').sort((a, b) => clearedMs(a) - clearedMs(b)),
    };
  };

  const sections: JourneySection[] = [];
  const trip = toSection('trip', 'trip');
  if (trip) sections.push(trip);
  for (const l of orderedLegs) {
    const s = toSection(l.id, 'leg', l);
    if (s) sections.push(s);
  }

  // NOW sits after the last section whose leg has departed; with none departed it sits after the
  // whole-trip section (the trip is entirely ahead of you), or above everything failing that.
  let nowAfterIndex = trip ? 0 : -1;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (s.kind === 'leg' && s.departureTimeUtc && new Date(s.departureTimeUtc).getTime() <= nowMs) {
      nowAfterIndex = i;
    }
  }
  return { sections, nowAfterIndex };
}
