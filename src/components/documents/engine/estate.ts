/**
 * The document estate — every document-shaped thing on the platform, in one list.
 *
 * This is a REGISTER, not a store. It holds no content and owns no lifecycle: it
 * is the map you read before deciding anything, and the worksheet for the one
 * conversation this module has never had — *what does GFO actually use, and what
 * is missing?*
 *
 * ## The one-question test
 *
 * Every row is classified by a single question: **do you read it before you act,
 * or write it after?**
 *
 * - Read before → `document`. It tells you what to do. It has a current version,
 *   and someone can be out of date on it.
 * - Wrote after → `record`. It says what happened, once. It is never updated,
 *   only superseded.
 * - Neither → `report`. Assembled fresh from live data, so there is no blank to
 *   version and regenerating it changes the answer.
 *
 * Things that felt impossible to place are usually BOTH, at different moments: a
 * blank checklist is read before, a completed one was written after. The blank is
 * the document; the filled-in copy is the record. Each half gets its own row here.
 *
 * ## Why usage is almost all `unknown`
 *
 * What exists in this codebase is not evidence of what GFO does. Seeding a row as
 * `confirmed` on the strength of a component existing would be me asserting an
 * operational fact I have no source for — the exact failure this register exists
 * to expose. A row only reaches `confirmed` when Bryan says so, and it carries
 * `confirmedBy` when it does.
 */

/** The one-question verdict. */
export type EstateVerdict = 'document' | 'record' | 'report';

/** Where the thing lives today — not where it ought to. */
export type EstateHome =
  | 'document-centre' // a class on the documents engine
  | 'other-module' // somewhere else in myGFO, with its own machinery
  | 'nimbl' // the incumbent vendor — authored by them, delivered as PDF, read-and-initial in their system
  | 'sharepoint' // Bryan 2026-08-21: "most of the scattered stuff"
  | 'outside-mygfo' // deliberately not ours (an OEM holds it)
  | 'nowhere'; // no home at all — exists on paper, in a drive, or in someone's head

/** How sure we are that GFO actually uses this, in the real world, today. */
export type EstateUsage =
  | 'confirmed' // Bryan said so — `confirmedBy` records when
  | 'assumed' // inferred from the codebase or a prior decision; unverified
  | 'unknown'; // nobody has asked

/** A tri-state where "we have not established this" is a real answer. */
export type Tri = boolean | 'unknown';

export interface EstateEntry {
  id: string;
  name: string;
  verdict: EstateVerdict;
  home: EstateHome;
  /** Where exactly — a module, a route, a filing cabinet, an OEM portal. */
  homeDetail: string;
  /** The documents-engine class id, when it lives in the centre. */
  classId?: string;
  /** Does a change go through four-eyes before anyone reads it? */
  controlled: Tri;
  /** Is there a read receipt? */
  acknowledged: Tri;
  /** Can a crew reach it with no signal? */
  offline: Tri;
  /** Who owns the content. 'unknown' until a human says otherwise. */
  owner: string;
  usage: EstateUsage;
  /** Set only when `usage` is 'confirmed' — who said so, and when. */
  confirmedBy?: string;
  note?: string;
}

/** The verdict in the words of the test, so the page never teaches jargon. */
export function verdictLabel(verdict: EstateVerdict): string {
  switch (verdict) {
    case 'document':
      return 'Read before';
    case 'record':
      return 'Wrote after';
    case 'report':
      return 'Assembled live';
  }
}

/**
 * The test says this is a document, but it does not live in the document centre.
 *
 * `outside-mygfo` is deliberately NOT a gap: the QRH being Gulfstream's is the
 * correct answer, not a hole. Records and reports are never flagged — they are
 * not supposed to be in the centre in the first place.
 */
export function isMisplaced(entry: EstateEntry): boolean {
  if (entry.verdict !== 'document') return false;
  return (
    entry.home === 'other-module' ||
    entry.home === 'nowhere' ||
    entry.home === 'nimbl' ||
    entry.home === 'sharepoint'
  );
}

/** This row cannot be trusted until a human answers something about it. */
export function needsBryan(entry: EstateEntry): boolean {
  if (entry.usage !== 'confirmed') return true;
  return entry.owner === 'unknown';
}

export interface EstateGroup {
  verdict: EstateVerdict;
  entries: EstateEntry[];
}

const VERDICT_ORDER: EstateVerdict[] = ['document', 'record', 'report'];

/** Group by verdict in test order, dropping any verdict with nothing in it. */
export function estateGroups(entries: EstateEntry[]): EstateGroup[] {
  return VERDICT_ORDER.map((verdict) => ({
    verdict,
    entries: entries
      .filter((e) => e.verdict === verdict)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.entries.length > 0);
}

export function estateGaps(entries: EstateEntry[]): { misplaced: number; needsBryan: number } {
  return {
    misplaced: entries.filter(isMisplaced).length,
    needsBryan: entries.filter(needsBryan).length,
  };
}

const UNKNOWN_OWNER = 'unknown';

/** Everything Bryan confirmed in the 2026-08-21 document-centre session. */
const CONF = 'Bryan, 2026-08-21';

export const ESTATE: EstateEntry[] = [
  // ── In the document centre ────────────────────────────────────────────────
  {
    id: 'procedural-bulletin',
    name: 'Procedural Bulletins',
    verdict: 'document',
    home: 'document-centre',
    homeDetail: 'Documents — class PB',
    classId: 'procedural-bulletin',
    controlled: true,
    acknowledged: true,
    offline: true,
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
    note: 'Built. Initials by default, 7-day ack window.',
  },
  {
    id: 'flight-ops-bulletin',
    name: 'Flight Ops Bulletins',
    verdict: 'document',
    home: 'document-centre',
    homeDetail: 'Documents — class FOB',
    classId: 'flight-ops-bulletin',
    controlled: true,
    acknowledged: true,
    offline: true,
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
    note: 'Built.',
  },
  {
    id: 'sop',
    name: 'SOPs',
    verdict: 'document',
    home: 'document-centre',
    homeDetail: 'Documents — class SOP',
    classId: 'sop',
    controlled: true,
    acknowledged: true,
    offline: true,
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
    note: 'Built. Signature-level ack, fleet-scoped, 365-day review cycle.',
  },
  {
    id: 'manual',
    name: 'Manuals (GOM and similar)',
    verdict: 'document',
    home: 'document-centre',
    homeDetail: 'Documents — class GOM',
    classId: 'manual',
    controlled: true,
    acknowledged: true,
    offline: true,
    owner: UNKNOWN_OWNER,
    usage: 'unknown',
    note: 'Class exists and is empty. The real manuals live in Nimbl — see the separate row. Which manuals GFO holds has still never been enumerated.',
  },
  {
    id: 'received-document',
    name: 'Received documents',
    verdict: 'document',
    home: 'document-centre',
    homeDetail: 'Documents — class RCV',
    classId: 'received-document',
    controlled: true,
    acknowledged: true,
    offline: true,
    owner: UNKNOWN_OWNER,
    usage: 'unknown',
    note: 'D73. Class is built and the demo carries two seeded examples (RCV-001 MEL, RCV-002 IPC). GFO has ingested nothing real.',
  },
  {
    id: 'tribal-knowledge',
    name: 'Tribal Knowledge',
    verdict: 'document',
    home: 'document-centre',
    homeDetail: 'Documents — class TK',
    classId: 'tribal-knowledge',
    controlled: false,
    acknowledged: false,
    offline: true,
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
    note: 'Deliberately uncontrolled: direct publish, no ack. That is the point of the shelf.',
  },
  {
    id: 'cabin-knowledge',
    name: 'Cabin Knowledge',
    verdict: 'document',
    home: 'document-centre',
    homeDetail: 'Documents — class CK',
    classId: 'cabin-knowledge',
    controlled: true,
    acknowledged: false,
    offline: true,
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
    note: 'D75. Four-eyes without a required read.',
  },

  // ── Documents living somewhere else ───────────────────────────────────────
  {
    id: 'checklist-template',
    name: 'Checklist templates (blank)',
    verdict: 'document',
    home: 'other-module',
    homeDetail: 'Tech log — its own editor and engine',
    controlled: false,
    acknowledged: false,
    offline: 'unknown',
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
    note: 'Preflight, postflight, servicing. No four-eyes and no revision proof, so a completed run cannot say which version the crew saw.',
  },
  {
    id: 'form-template',
    name: 'Form templates — FRAT, GRAT, turnover, turndown',
    verdict: 'document',
    home: 'other-module',
    homeDetail: 'Standalone builders and a field manager',
    controlled: false,
    acknowledged: false,
    offline: 'unknown',
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
    note: 'A second content system. Risk weightings are policy but change without a controlled revision.',
  },
  {
    id: 'mel-d195',
    name: 'D195 MEL',
    verdict: 'document',
    home: 'document-centre',
    homeDetail: 'Documents — RCV-001 (demo seed only)',
    classId: 'received-document',
    controlled: true,
    acknowledged: true,
    offline: true,
    owner: UNKNOWN_OWNER,
    usage: 'unknown',
    note: 'Demo seeds RCV-001 at rev 15. GFO\u2019s real MEL lives outside Nimbl and outside myGFO (Bryan, 2026-08-21) \u2014 LG-267. D94 proposes one source, two views: the document a crew reads and the MelItem rows a deferral binds to are the same record.',
  },
  {
    id: 'fsdo-loa',
    name: 'FSDO Letter of Authorization',
    verdict: 'document',
    home: 'nowhere',
    homeDetail: 'Not in myGFO — see TL-25',
    controlled: 'unknown',
    acknowledged: 'unknown',
    offline: false,
    owner: UNKNOWN_OWNER,
    usage: 'unknown',
    note: '8900.1 ¶6-95D: MEL and LOA must both be on board.',
  },
  {
    id: 'airworthiness-instruments',
    name: 'Airworthiness certificate, registration, W&B, radio licence',
    verdict: 'document',
    home: 'nowhere',
    homeDetail: 'Not in myGFO',
    controlled: 'unknown',
    acknowledged: 'unknown',
    offline: false,
    owner: UNKNOWN_OWNER,
    usage: 'unknown',
    note: 'Must be producible onboard. Whether GFO wants them in myGFO at all is an open question.',
  },
  {
    id: 'training-material',
    name: 'Training and syllabus material',
    verdict: 'document',
    home: 'nowhere',
    homeDetail: 'Currency is tracked; the material behind it is not held',
    controlled: 'unknown',
    acknowledged: false,
    offline: false,
    owner: 'Training',
    usage: 'confirmed',
    confirmedBy: CONF,
    note: 'Training authors its own material (Bryan, 2026-08-21) and the G800 will generate more. Pilot currency exists with nothing behind it.',
  },
  {
    id: 'emergency-response-plan',
    name: 'Emergency Response Plan',
    verdict: 'document',
    home: 'nowhere',
    homeDetail: 'Unknown — may be paper, may be SharePoint',
    controlled: 'unknown',
    acknowledged: 'unknown',
    offline: false,
    owner: UNKNOWN_OWNER,
    usage: 'unknown',
    note: 'Not seen anywhere in the codebase. Listed because its absence is the kind of thing a register exists to surface.',
  },
  {
    id: 'international-ops-guides',
    name: 'International / country operating guides',
    verdict: 'document',
    home: 'nowhere',
    homeDetail: 'Unknown',
    controlled: 'unknown',
    acknowledged: 'unknown',
    offline: false,
    owner: UNKNOWN_OWNER,
    usage: 'unknown',
    note: 'Candidate only. Included so the question gets asked rather than assumed away.',
  },

  // ── Nimbl — the incumbent (Bryan, 2026-08-21) ─────────────────────────────
  {
    id: 'nimbl-gom',
    name: 'GOM / company operations manual',
    verdict: 'document',
    home: 'nimbl',
    homeDetail: 'Nimbl — authored by them, delivered as PDF',
    controlled: true,
    acknowledged: true,
    offline: 'unknown',
    owner: 'Nimbl (officially); GFO writes the substance',
    usage: 'confirmed',
    confirmedBy: CONF,
    note: 'GFO already writes the changes and tells Nimbl to make them. That round trip is the latency (D93). Read-and-initial happens in Nimbl. Annual revision cycle.',
  },
  {
    id: 'nimbl-adjacent',
    name: 'IOPM, SAFA, ERP, RVSM, EFVS, HAZMAT',
    verdict: 'document',
    home: 'nimbl',
    homeDetail: 'Nimbl — vendor-authored compliance documents',
    controlled: true,
    acknowledged: true,
    offline: 'unknown',
    owner: 'Nimbl',
    usage: 'unknown',
    note: 'Breadth a replacement takes on. Whether GFO holds all of these, and on which Nimbl tier, is unconfirmed — the tier decides whether Sky Brief reg-monitoring is included at all (LG-266).',
  },

  // ── The G800 content wave (Bryan, 2026-08-21) ─────────────────────────────
  {
    id: 'callouts-and-flows',
    name: 'Callouts and flows',
    verdict: 'document',
    home: 'nowhere',
    homeDetail: 'Standards and Training issue these; no home in myGFO',
    controlled: 'unknown',
    acknowledged: 'unknown',
    offline: false,
    owner: 'Standards / Training',
    usage: 'confirmed',
    confirmedBy: CONF,
    note: 'Pilots only. Bryan: "its own thing" — neither prose nor checklist, so it needs its own class and probably its own authoring surface. The G800 will generate a new set.',
  },
  {
    id: 'fa-procedures',
    name: 'Flight attendant procedures',
    verdict: 'document',
    home: 'nowhere',
    homeDetail: 'Changes with each type; no home today',
    controlled: 'unknown',
    acknowledged: 'unknown',
    offline: false,
    owner: 'Cabin',
    usage: 'confirmed',
    confirmedBy: CONF,
    note: 'Distinct from Cabin Knowledge (D75), which is know-how rather than procedure. The G800 brings its own set.',
  },

  // ── Deliberately outside myGFO ────────────────────────────────────────────
  {
    id: 'qrh',
    name: 'QRH',
    verdict: 'document',
    home: 'outside-mygfo',
    homeDetail: 'Gulfstream',
    controlled: 'unknown',
    acknowledged: false,
    offline: false,
    owner: 'Gulfstream',
    usage: 'confirmed',
    confirmedBy: 'Bryan, 2026-08-21',
    note: 'Lives inside Gulfstream. GFO does not manage it — no class, no registry entry, no pointer.',
  },
  {
    id: 'oem-technical-manuals',
    name: 'OEM technical manuals — AMM, CMM, SB, IPC',
    verdict: 'document',
    home: 'outside-mygfo',
    homeDetail: 'Gulfstream / vendor portals',
    controlled: 'unknown',
    acknowledged: false,
    offline: false,
    owner: 'Gulfstream',
    usage: 'assumed',
    note: 'D68 puts a reference list on the work card. Whether licensing permits caching bytes is unconfirmed — LG-151.',
  },

  // ── Records ───────────────────────────────────────────────────────────────
  {
    id: 'crs',
    name: 'Certificate of Release to Service',
    verdict: 'record',
    home: 'other-module',
    homeDetail: 'Tech log — signed ledger',
    controlled: true,
    acknowledged: false,
    offline: true,
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
    note: 'Append-only. Correct where it is.',
  },
  {
    id: 'journey-log',
    name: 'Journey log entries',
    verdict: 'record',
    home: 'other-module',
    homeDetail: 'Tech log — signed ledger',
    controlled: true,
    acknowledged: false,
    offline: true,
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
  },
  {
    id: 'deferral',
    name: 'MEL deferrals',
    verdict: 'record',
    home: 'other-module',
    homeDetail: 'Tech log — signed ledger',
    controlled: true,
    acknowledged: false,
    offline: true,
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
    note: 'Stamps its governing MEL revision at signing — the pattern a checklist run would copy.',
  },
  {
    id: 'checklist-run',
    name: 'Completed checklist runs',
    verdict: 'record',
    home: 'other-module',
    homeDetail: 'Tech log',
    controlled: 'unknown',
    acknowledged: false,
    offline: 'unknown',
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
    note: 'Records no template revision id, so it cannot prove which version of the checklist was run.',
  },
  {
    id: 'frat-submission',
    name: 'Submitted FRATs and GRATs',
    verdict: 'record',
    home: 'other-module',
    homeDetail: 'Safety',
    controlled: 'unknown',
    acknowledged: false,
    offline: 'unknown',
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
    note: 'Same gap as a checklist run: no template revision stamped.',
  },
  {
    id: 'fir',
    name: 'Flight Irregularity Reports',
    verdict: 'record',
    home: 'other-module',
    homeDetail: 'FIR module — own reader, redaction and ack loop',
    controlled: true,
    acknowledged: true,
    offline: 'unknown',
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
    note: 'D63 freezes its numbers at publication. Links to documents; does not become one.',
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  {
    id: 'trip-sheet',
    name: 'Trip sheets and passenger packets',
    verdict: 'report',
    home: 'other-module',
    homeDetail: 'Scheduling / ForeFlight',
    controlled: false,
    acknowledged: false,
    offline: 'unknown',
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
    note: 'Regenerates from live data. Nothing to version.',
  },
  {
    id: 'compliance-report',
    name: 'Compliance matrix and roster exports',
    verdict: 'report',
    home: 'document-centre',
    homeDetail: 'Documents — compliance dashboard',
    controlled: false,
    acknowledged: false,
    offline: 'unknown',
    owner: UNKNOWN_OWNER,
    usage: 'assumed',
  },
];
