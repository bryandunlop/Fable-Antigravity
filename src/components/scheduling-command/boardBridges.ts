import type { BoardTrip } from './adapter';

// The fleet board's two bridges to "what's coming" (D87) — the board keeps its familiar tail ×
// time picture, and these selectors carry the upcoming-work signal into it: a per-tail NEXT DUE
// chip, and a BEYOND THIS WINDOW shelf summarizing the weeks past the visible window. Pure and
// unit-tested; the component only renders.

const DAY_MS = 86400000;
const HOUR_MS = 3600000;

export interface NextDueChip {
  tripId: string;
  taskKey?: string;    // focus target for the drawer (absent for a blocked headline)
  label: string;       // 'Catering · due 5h' | 'Waiver · overdue 1d' | 'Blocked · overflight permit'
  severity: 'blocked' | 'overdue' | 'upcoming';
}

export interface BeyondWeek {
  startMs: number;
  endMs: number; // exclusive
  tripCount: number;
  untouchedCount: number; // readiness 0 — no checklist worked yet
  soonest?: { title: string; tripNumber: string; route: string; dueLabel: string };
}

export interface BeyondWindowModel {
  weeks: BeyondWeek[]; // only non-empty weeks, in order
  overflowCount: number; // trips departing past the last bucket
}

const isOpen = (s: string) => s !== 'done' && s !== 'n_a';

function relLabel(dueMs: number, nowMs: number): string {
  if (dueMs < nowMs) {
    const days = Math.max(1, Math.ceil((nowMs - dueMs) / DAY_MS));
    return `overdue ${days}d`;
  }
  const hours = Math.round((dueMs - nowMs) / HOUR_MS);
  return hours <= 48 ? `due ${hours}h` : `due ${Math.ceil((dueMs - nowMs) / DAY_MS)}d`;
}

/** Soonest thing each tail needs a human for: blocked outranks overdue outranks upcoming. */
export function nextDuePerTail(trips: BoardTrip[], nowMs: number): Map<string, NextDueChip> {
  const out = new Map<string, NextDueChip>();
  const rank = { blocked: 0, overdue: 1, upcoming: 2 } as const;

  for (const trip of trips) {
    if (new Date(trip.departureDate).getTime() <= nowMs) continue; // departed

    let candidate: (NextDueChip & { dueMs: number }) | null = null;
    if (trip.criticalBlocker) {
      candidate = { tripId: trip.id, label: `Blocked · ${trip.criticalBlocker}`, severity: 'blocked', dueMs: 0 };
    } else {
      const open = trip.tasks
        .filter(t => isOpen(t.status))
        .map(t => ({ t, dueMs: new Date(t.dueAtUtc).getTime() }))
        .filter(o => Number.isFinite(o.dueMs))
        .sort((a, b) => a.dueMs - b.dueMs);
      const soonest = open[0];
      if (soonest) {
        candidate = {
          tripId: trip.id, taskKey: soonest.t.id,
          label: `${soonest.t.title} · ${relLabel(soonest.dueMs, nowMs)}`,
          severity: soonest.dueMs < nowMs ? 'overdue' : 'upcoming',
          dueMs: soonest.dueMs,
        };
      }
    }
    if (!candidate) continue;

    const current = out.get(trip.aircraft) as (NextDueChip & { dueMs: number }) | undefined;
    if (!current
      || rank[candidate.severity] < rank[current.severity]
      || (rank[candidate.severity] === rank[current.severity] && candidate.dueMs < current.dueMs)) {
      out.set(trip.aircraft, candidate);
    }
  }

  for (const [tail, chip] of out) out.set(tail, (({ dueMs: _d, ...rest }) => rest)(chip as NextDueChip & { dueMs: number }) as NextDueChip);
  return out;
}

/** Weekly summaries of trips departing after the board's visible window (up to `weekCount` weeks). */
export function beyondWindowWeeks(
  trips: BoardTrip[],
  windowEndMs: number,
  nowMs: number,
  weekCount = 3,
): BeyondWindowModel {
  const weeks: BeyondWeek[] = [];
  for (let i = 0; i < weekCount; i++) {
    weeks.push({
      startMs: windowEndMs + i * 7 * DAY_MS,
      endMs: windowEndMs + (i + 1) * 7 * DAY_MS,
      tripCount: 0, untouchedCount: 0,
    });
  }
  const lastEndMs = weeks[weeks.length - 1].endMs;
  let overflowCount = 0;
  const soonestPerWeek = new Map<number, { dueMs: number; title: string; tripNumber: string; route: string }>();

  for (const trip of trips) {
    const depMs = new Date(trip.departureDate).getTime();
    if (depMs < windowEndMs || depMs <= nowMs) continue; // on the board (or departed) — not "beyond"
    if (depMs >= lastEndMs) { overflowCount++; continue; }
    const idx = Math.floor((depMs - windowEndMs) / (7 * DAY_MS));
    const wk = weeks[idx];
    wk.tripCount++;
    if (trip.readinessScore === 0) wk.untouchedCount++;

    const open = trip.tasks
      .filter(t => isOpen(t.status))
      .map(t => ({ t, dueMs: new Date(t.dueAtUtc).getTime() }))
      .filter(o => Number.isFinite(o.dueMs) && o.dueMs >= nowMs)
      .sort((a, b) => a.dueMs - b.dueMs);
    const soonest = open[0];
    if (soonest) {
      const cur = soonestPerWeek.get(idx);
      if (!cur || soonest.dueMs < cur.dueMs) {
        soonestPerWeek.set(idx, { dueMs: soonest.dueMs, title: soonest.t.title, tripNumber: trip.tripNumber, route: trip.route });
      }
    }
  }

  for (const [idx, s] of soonestPerWeek) {
    weeks[idx].soonest = { title: s.title, tripNumber: s.tripNumber, route: s.route, dueLabel: relLabel(s.dueMs, nowMs) };
  }

  return { weeks: weeks.filter(w => w.tripCount > 0), overflowCount };
}
