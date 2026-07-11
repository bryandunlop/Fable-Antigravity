import type { FirState, FlightIrregularityReport } from './types';
import { buildFir } from './engine/create';
import { nextFirRef } from './engine/refs';

const H = 3600_000;
const D = 24 * H;

/** Seeded FIRs, dated relative to `referenceNowMs` so they always read current.
 * The AOG seed anchors the tech-log seed grounding defect (`d-n1pg` on N1PG),
 * so its SYSTEM timeline and state-hours bar populate from live evidence. */
export function getSeedState(referenceNowMs = Date.now()): FirState {
  const iso = (msAgo: number) => new Date(referenceNowMs - msAgo).toISOString();
  const firs: FlightIrregularityReport[] = [];
  const refs = () => firs.map(f => f.ref);

  // 1 — A routine irregularity that closed internal: a deicing delay, manual timeline only.
  const deice = buildFir({
    id: 'fir-seed-deice',
    ref: nextFirRef(refs(), iso(8 * D)),
    title: 'KTEB departure delay — de-ice queue and Type IV application',
    category: 'DELAY',
    openedBy: { oid: 'USR001', name: 'Capt. John Smith' },
    atUtc: iso(8 * D),
    eventStartUtc: iso(9 * D),
    eventEndUtc: iso(9 * D - 2 * H),
    aircraftId: 'ac-n2pg',
    impact: { delayMinutes: 65, tripsAffected: 1 },
  });
  deice.manualTimeline.push(
    { source: 'MANUAL', atUtc: iso(9 * D), label: 'Pushback ready — de-ice required, joined the KTEB queue', byOid: 'USR001' },
    { source: 'MANUAL', atUtc: iso(9 * D - 40 * 60_000), label: 'Holding for de-ice pad — 6 aircraft ahead', byOid: 'USR001', note: 'FBO advised single truck operating; second truck down for maintenance.' },
    { source: 'MANUAL', atUtc: iso(9 * D - 85 * 60_000), label: 'Type I / Type IV applied, holdover time started', byOid: 'USR001' },
    { source: 'MANUAL', atUtc: iso(9 * D - 105 * 60_000), label: 'Departed KTEB — 65 min behind schedule', byOid: 'USR001', note: 'Passengers advised en route; arrival slot kept.' },
  );
  deice.status = 'CLOSED_INTERNAL';
  deice.audit.push({
    kind: 'STATUS_CHANGED', atUtc: iso(7 * D), byOid: 'USR002', byName: 'Sarah Wilson (DOM)',
    detail: 'Closed internal — routine weather delay, no company-wide publish',
  });
  firs.push(deice);

  // 2 — The live one: N1PG LMLG AOG, anchored to the tech-log seed grounding defect.
  const aog = buildFir({
    id: 'fir-seed-lmlg',
    ref: nextFirRef(refs(), iso(2 * H)),
    title: 'N1PG AOG — LMLG unsafe indication, sensor on order',
    category: 'AOG',
    openedBy: { oid: 'USR002', name: 'Sarah Wilson (DOM)' },
    atUtc: iso(2 * H),
    eventStartUtc: iso(3 * H), // defect d-n1pg reported 3 h ago in the tech-log seed
    aircraftId: 'ac-n1pg',
    anchors: [{ kind: 'DEFECT', refId: 'd-n1pg' }],
  });
  aog.manualTimeline.push(
    { source: 'MANUAL', atUtc: iso(1 * H), label: 'Gulfstream Savannah AOG desk engaged — uplock proximity sensor sourced', byOid: 'USR002', note: 'Overnight freight; ETA tomorrow 10:00 local.' },
    { source: 'MANUAL', atUtc: iso(30 * 60_000), label: 'Tomorrow’s KLUK–KTEB leg moved to N2PG', byOid: 'USR002', note: 'Scheduling advised; no passenger impact expected.' },
  );
  firs.push(aog);

  return { firs };
}
