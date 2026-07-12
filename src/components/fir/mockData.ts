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
  deice.narrative =
    'A single-truck de-ice operation at TEB during a Type IV event queued six aircraft ahead of us. Nothing was recoverable on our side — the delay was entirely airport-side capacity. Closed internal as a routine weather delay; noted for the recurring-cause view if TEB single-truck mornings become a pattern.';
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
  // One perspective answered (maintenance), one still requested (the crew) — logging in
  // as 'pilot' (Capt. John Smith, USR001) demonstrates the requestee submit/decline flow.
  aog.statements.push(
    {
      id: 'st-seed-lmlg-crew', requestedByOid: 'USR002', requestedOfOid: 'USR001', requestedOfRole: 'PILOT',
      prompt: 'Your account of the gear indication and the decision to return to KLUK.',
      status: 'REQUESTED', requestedAtUtc: iso(1.4 * H),
    },
    {
      id: 'st-seed-lmlg-mx', requestedByOid: 'USR002', requestedOfOid: 'USR008', requestedOfRole: 'MAINTENANCE',
      prompt: 'What did fault isolation show, and where has the time gone?',
      status: 'SUBMITTED', requestedAtUtc: iso(1.3 * H), respondedAtUtc: iso(0.7 * H),
      text: 'MAU fault history isolated to the LMLG uplock proximity sensor — intermittent only under gear load. Harness continuity checked good. Time since has been waiting on the sensor from Savannah (POO); install + a gear swing per AMM 32-30-00 remain.',
    },
    {
      id: 'st-seed-lmlg-fa', requestedByOid: 'USR002', requestedOfOid: 'USR003', requestedOfRole: 'INFLIGHT',
      prompt: 'Your account of passenger handling when tomorrow’s leg moved to N2PG.',
      status: 'REQUESTED', requestedAtUtc: iso(1.1 * H),
    },
  );
  aog.narrative =
    'N1PG returned to KLUK with an intermittent left-main-gear unsafe indication on retraction. Maintenance isolated it to the uplock proximity sensor; the part was not in stock and was sourced from Gulfstream Savannah on overnight AOG freight. The bulk of the downtime is parts-wait, not wrench time. Tomorrow’s KLUK–KTEB leg was moved to N2PG so there is no passenger impact.';
  aog.impact = {
    delayMinutes: 0,
    tripsAffected: 1,
    costNote: 'One repositioning leg re-tailed to N2PG; AOG freight from Savannah. No pax impact.',
  };
  // A curation draft in progress — one roster name (“Capt. John Smith”) is still in the
  // text so the Publish tab's redaction assist bar demonstrates the name → role swap.
  aog.pendingPublished = {
    summary: 'A G650 went AOG on a landing-gear indication; recovered with an overnight AOG-freight part, no passenger impact.',
    whatHappened:
      'Capt. John Smith returned to base after an intermittent main-gear unsafe indication under load. The assigned technician isolated the uplock proximity sensor; the part shipped overnight AOG freight from the OEM. The next leg was re-tailed early — zero passenger impact.',
    timeline: [],
    lessons: ['Uplock proximity sensor is single-source with no local stock — plan freight lead time into AOG recovery.'],
    ackLevel: 'none',
  };
  firs.push(aog);

  // 3 — A prior AOG already curated and PUBLISHED — the all-employees reading surface
  // and the initials acknowledgement (§7, §9). Content is roles-only by construction.
  const published = buildFir({
    id: 'fir-seed-windshield',
    ref: nextFirRef(refs(), iso(30 * D)),
    title: 'N6PG windshield crack — repositioning and 3-day AOG',
    category: 'AOG',
    openedBy: { oid: 'USR002', name: 'Sarah Wilson (DOM)' },
    atUtc: iso(33 * D),
    eventStartUtc: iso(34 * D),
    eventEndUtc: iso(31 * D),
    aircraftId: 'ac-n6pg',
  });
  published.narrative =
    'N6PG took a cracked outboard windshield ply on descent into a hot-and-high field. The PIC (Capt. Dave Rourke) declared the aircraft unairworthy; the OEM shipped a replacement ply and the aircraft repositioned empty once temporary limits were cleared.';
  published.status = 'PUBLISHED';
  published.reviewSubmittedByOid = 'USR002';
  published.publishedRevision = {
    revision: 1,
    approvedByOid: 'USR010',
    publishedAtUtc: iso(30 * D),
    summary: 'A cracked windshield ply grounded an aircraft for three days at an out-station; the OEM part and a temporary limit drove the timeline.',
    whatHappened:
      'On descent the crew observed a cracked outboard windshield ply. The PIC declared the aircraft unairworthy. The OEM shipped a replacement ply overnight; the aircraft was repositioned empty under a temporary limitation once the field team confirmed the inner ply was intact. Total downtime was three days, driven by part logistics to an out-station rather than the repair itself.',
    timeline: [
      { atUtc: iso(34 * D), label: 'Cracked outboard windshield ply observed on descent' },
      { atUtc: iso(34 * D - 3 * H), label: 'Aircraft declared unairworthy — AOG at out-station' },
      { atUtc: iso(32 * D), label: 'OEM replacement ply delivered' },
      { atUtc: iso(31 * D), label: 'Ply replaced, temporary limitation cleared, repositioned empty' },
    ],
    lessons: [
      'Windshield plies are OEM-only with multi-day logistics to out-stations — carry the OEM AOG-desk contact in the trip pack.',
      'A temporary limitation let us reposition empty before the full repair, recovering the tail two days sooner.',
    ],
    ackLevel: 'initials',
  };
  published.publishedAcks = [
    { oid: 'USR001', initials: 'JS', atUtc: iso(29 * D) },
    { oid: 'USR007', initials: 'MB', atUtc: iso(29 * D - 6 * H) },
  ];
  published.audit.push(
    { kind: 'SUBMITTED_FOR_REVIEW', atUtc: iso(31 * D), byOid: 'USR002', byName: 'Sarah Wilson (DOM)', detail: 'Submitted the published version for review' },
    { kind: 'PUBLISHED', atUtc: iso(30 * D), byOid: 'USR010', byName: 'Chief Pilot', detail: 'Approved and published revision 1' },
  );
  firs.push(published);

  return { firs };
}
