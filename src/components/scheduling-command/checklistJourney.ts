import type { TaskInstance } from '../../scheduling/engine';
import type { TripLegRecord } from '../../scheduling/store/types';

// The trip checklist as a JOURNEY (D87 family, LG-259): whole-trip work first, then each leg in
// flight order, with a NOW marker that moves through the sections as the trip does. Advisory
// reflags (D89) surface as always-visible flagged rows — cleared work stays cleared; the flag is
// information, never a demand. Pure; all time inputs explicit.

/**
 * A booking cutoff drawn on the rail (D110 slice 2, Bryan: "put the cutoffs on the rail"). Not a
 * checklist item — nothing to clear — but it is when the work around it is actually due, so it sits
 * among the whole-trip items in time order.
 */
export interface RailMarker {
  key: string;
  label: string;
  atUtc: string;
  /** 'passed' once the clock is beyond it. */
  state: 'ahead' | 'passed';
  note?: string;
}

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
  /** Cutoff nodes for this section, time-ordered. Only the whole-trip section carries them today. */
  markers: RailMarker[];
}

/** The whole-trip section's open items and cutoff markers, interleaved by time. */
export function railEntries(section: JourneySection): Array<{ kind: 'item'; item: TaskInstance } | { kind: 'marker'; marker: RailMarker }> {
  const entries: Array<{ at: number; entry: { kind: 'item'; item: TaskInstance } | { kind: 'marker'; marker: RailMarker } }> = [
    ...section.open.map(item => ({ at: dueMs(item), entry: { kind: 'item' as const, item } })),
    ...section.markers.map(marker => ({ at: new Date(marker.atUtc).getTime(), entry: { kind: 'marker' as const, marker } })),
  ];
  return entries.sort((a, b) => a.at - b.at).map(e => e.entry);
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
  cutoffs: Array<{ key: string; label: string; atUtc: string; note?: string }> = [],
): ChecklistJourney {
  const markers: RailMarker[] = cutoffs
    .map(c => ({ key: c.key, label: c.label, atUtc: c.atUtc, note: c.note, state: new Date(c.atUtc).getTime() <= nowMs ? 'passed' as const : 'ahead' as const }))
    .sort((a, b) => a.atUtc.localeCompare(b.atUtc));
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
    // The whole-trip section exists whenever there are cutoffs to draw, items or not.
    if (xs.length === 0 && !(kind === 'trip' && markers.length > 0)) return null;
    const settled = xs.filter(isSettled);
    return {
      key, kind,
      legId: leg?.id, sequence: leg?.sequence,
      departureIcao: leg?.departureIcao, arrivalIcao: leg?.arrivalIcao,
      departureTimeUtc: leg?.departureTimeUtc, paxCount: leg?.paxCount,
      open: xs.filter(t => !isSettled(t)).sort((a, b) => dueMs(a) - dueMs(b)),
      flagged: settled.filter(t => t.reflag && t.status !== 'cancelled').sort((a, b) => clearedMs(a) - clearedMs(b)),
      cleared: settled.filter(t => !t.reflag || t.status === 'cancelled').sort((a, b) => clearedMs(a) - clearedMs(b)),
      markers: kind === 'trip' ? markers : [],
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
