// MOCK CAMP SOAP client. Faithful to the documented surface (session lifecycle, units in MINUTES,
// increase-only utilization, EXACT serial match, error taxonomy) but returns FAKED data.
// Dev swaps this for a real `soap`/`strong-soap` client against the CAMP **sandbox** WSDL later.
import {
  CAMP_BASE_URLS, CAMP_ENV, CAMP_ERROR, hoursToCampMinutes, campMinutesToHours, DUE_LIST_CAP_MONTHS,
} from './campTaxonomy';
import type { IntegrateMode, DiscrepancyType, MelFlag } from './campTaxonomy';

export interface CampResult<T> { ok: boolean; data?: T; errorCode?: number | string; errorMsg?: string; }

let _sessionKey: string | null = null;
let _runCounter = 0;

// Demo error-injection — exercises the CAMP error taxonomy in the UI. One-shot: consumed by the next call.
let _injectLoginError: { code: number | string; msg: string } | null = null;
let _injectCallError: { code: number | string; msg: string } | null = null;
export function injectNextLoginError(code: number | string, msg: string) { _injectLoginError = { code, msg }; }
export function injectNextCallError(code: number | string, msg: string) { _injectCallError = { code, msg }; }

function sessionError<T>(): CampResult<T> {
  return { ok: false, errorCode: CAMP_ERROR.SESSION_NOT_VALID.code, errorMsg: CAMP_ERROR.SESSION_NOT_VALID.msg };
}

/** GEN LogIn -> encrypted security key (cached in memory for one run only). */
export function campLogin(): CampResult<{ key: string }> {
  if (_injectLoginError) { const e = _injectLoginError; _injectLoginError = null; return { ok: false, errorCode: e.code, errorMsg: e.msg }; }
  _sessionKey = `mock-key-${++_runCounter}`;
  return { ok: true, data: { key: _sessionKey } };
}

/** Always called in a finally — never leave a session open. */
export function campLogoff(): void {
  _sessionKey = null;
}

export interface DiscrepancyPush {
  serial: string; // must match CAMP exactly (incl. hyphens/caps)
  mode: IntegrateMode;
  discrepancyType: DiscrepancyType;
  melFlag?: MelFlag;
  ata: string;
  description: string;
  restriction?: string;
  nextDue?: string;
  melLogbookDate?: string;
  riiItem?: boolean;
  technician?: string;
  inspector?: string;
  existingDiscrepancyId?: string; // EDIT/UPDATE of a previously-pushed discrepancy
  status?: 'Open' | 'Closed';     // Open on INSERT/EDIT; Closed on UPDATE (rectification / clearance)
}

/** IntegrateDiscrepancies (STA). Mock returns a generated CAMP discrepancy id. */
export function integrateDiscrepancies(p: DiscrepancyPush, expectedSerial: string): CampResult<{ discrepancyId: string }> {
  if (!_sessionKey) return sessionError();
  if (p.serial !== expectedSerial) {
    return { ok: false, errorCode: CAMP_ERROR.INVALID_OPERATION.code, errorMsg: `serial mismatch '${p.serial}' vs CAMP '${expectedSerial}' (the #1 CAMP integration failure mode)` };
  }
  const id = p.existingDiscrepancyId ?? `CAMP-DISC-${p.ata}-${Math.abs(hashStr(p.serial + p.description)) % 100000}`;
  return { ok: true, data: { discrepancyId: id } };
}

// ──────────────────────────────────────────────────────────────────────────────
// UTILIZATION PUSH — OPEN QUESTION 1 (BLOCKED; do NOT implement a transport).
// The CAMP SOAP operation to push utilization (airframe hours/cycles/landings) is
// NOT in the GEN/STA/WRK WSDLs. Per CLAUDE.md hard rule we NEVER invent a function
// name. This placeholder validates the documented guards (exact-serial, increase-only)
// and prepares the minutes-converted payload, but REFUSES to transmit until the real
// operation is confirmed under the CAMP **sandbox**. Dev: wire the confirmed op here.
// ──────────────────────────────────────────────────────────────────────────────
export const UTILIZATION_PUSH_OPEN_QUESTION =
  'OQ1: CAMP utilization-push SOAP operation is undocumented — confirm under sandbox before implementing. Do not invent an endpoint.';

export interface UtilizationPush {
  serial: string;          // must match CAMP exactly (incl. hyphens/caps)
  airframeHours: number;   // myGFO hours; ×60 → CAMP minutes at the boundary
  cycles: number;
  landings: number;
}
export interface UtilizationPushResult {
  status: 'BLOCKED_UNDOCUMENTED';
  openQuestion: string;
  validation: { serialMatches: boolean; increaseOnly: boolean };
  /** What WOULD be sent once the real op is confirmed (minutes-converted) — never transmitted. */
  preparedPayload?: { serial: string; totalTimeMinutes: number; cycles: number; landings: number };
}

/**
 * Utilization push — intentionally BLOCKED pending Open Question 1.
 * Returns ok:false with the OQ message; validates exact-serial + increase-only and
 * prepares the minutes-converted payload for inspection, but NEVER transmits and
 * NEVER names a SOAP operation (CLAUDE.md: "NEVER invent a CAMP function name").
 */
export function pushUtilization_TODO_UNDOCUMENTED(
  p: UtilizationPush,
  expectedSerial: string,
  lastSentTotals?: { airframeHours: number; cycles: number; landings: number },
): CampResult<UtilizationPushResult> {
  const serialMatches = p.serial === expectedSerial;
  const increaseOnly = !lastSentTotals
    || (p.airframeHours >= lastSentTotals.airframeHours
      && p.cycles >= lastSentTotals.cycles
      && p.landings >= lastSentTotals.landings);
  const preparedPayload = serialMatches && increaseOnly
    ? { serial: p.serial, totalTimeMinutes: hoursToCampMinutes(p.airframeHours), cycles: p.cycles, landings: p.landings }
    : undefined;
  return {
    ok: false,
    errorCode: 'OQ1_UNDOCUMENTED',
    errorMsg: UTILIZATION_PUSH_OPEN_QUESTION,
    data: { status: 'BLOCKED_UNDOCUMENTED', openQuestion: UTILIZATION_PUSH_OPEN_QUESTION, validation: { serialMatches, increaseOnly }, preparedPayload },
  };
}

/** GetLatestAircraftTimes (read; CAMP returns MINUTES). */
export function getLatestAircraftTimes(serial: string, airframeHours: number, cycles: number): CampResult<{ serial: string; totalTimeMinutes: number; cycles: number }> {
  if (!_sessionKey) return sessionError();
  return { ok: true, data: { serial, totalTimeMinutes: hoursToCampMinutes(airframeHours), cycles } };
}

export interface CampDueItem { ata: string; description: string; dueDate: string; }
/** GetAircraftDueList (<= 3-month window). */
export function getAircraftDueList(serial: string, items: CampDueItem[]): CampResult<CampDueItem[]> {
  if (!_sessionKey) return sessionError();
  const cutoff = Date.now() + DUE_LIST_CAP_MONTHS * 30 * 86400000;
  return { ok: true, data: items.filter(i => new Date(i.dueDate).getTime() <= cutoff) };
}

/** GetAircraftState (cached Green/Yellow/Orange/Red read). */
export function getAircraftState(serial: string, color: 'Green' | 'Yellow' | 'Orange' | 'Red'): CampResult<{ serial: string; state: string }> {
  if (_injectCallError) { const e = _injectCallError; _injectCallError = null; return { ok: false, errorCode: e.code, errorMsg: e.msg }; }
  if (!_sessionKey) return sessionError();
  return { ok: true, data: { serial, state: color } };
}

export interface CampDiscrepancy {
  discrepancyId: string;
  ata: string;
  description: string;
  discrepancyType: DiscrepancyType;
  status: 'Open' | 'Closed';
  melFlag?: MelFlag;
  restriction?: string;
}

/**
 * GetAircraftDiscrepancies (STA, read). Mock returns everything CAMP holds for the tail:
 * the discrepancies myGFO previously pushed (echoed via `knownRefs`) PLUS discrepancies
 * entered directly in CAMP (e.g. at a contract service center) that myGFO has never seen.
 * The caller reconciles these against its off-ledger correlation table.
 */
export function getAircraftDiscrepancies(serial: string, knownRefs: string[] = []): CampResult<CampDiscrepancy[]> {
  if (!_sessionKey) return sessionError();
  const echoed: CampDiscrepancy[] = knownRefs.map(ref => ({
    discrepancyId: ref,
    ata: ref.split('-')[2] ?? '00',
    description: `Synced from myGFO (${ref})`,
    discrepancyType: 'NON-DEFERRED',
    status: 'Open',
  }));
  const s = Math.abs(hashStr(serial));
  const campDirect: CampDiscrepancy[] = [
    { discrepancyId: `CAMP-DISC-25-${s % 100000}`, ata: '25', description: 'Cabin seat 2L recline inoperative (entered at service center)', discrepancyType: 'DEFERRED-WATCHLIST', status: 'Open', melFlag: 'D' },
  ];
  return { ok: true, data: [...echoed, ...campDirect] };
}

// ── WRK: work-order details (Phase 3 task-card pull) ──
export type WoLineType = 'S' | 'T'; // S = squawk, T = task
export interface CampWoDetailLine {
  lineType: WoLineType;
  ata: string;
  description: string;
  itemStatusCode: number; // WO_ITEM_STATUS ladder
}
export interface CampWoDetails {
  woNumber: string;
  serial: string;
  title: string;
  ata: string;
  headerStatusCode: number; // WO_HEADER_STATUS ladder
  scheduled: boolean;
  riiRequired: boolean;
  lines: CampWoDetailLine[];
}

// Faked catalog of "open" CAMP work orders, keyed loosely so the demo can pull a few per aircraft.
const WO_CATALOG: Omit<CampWoDetails, 'serial' | 'headerStatusCode'>[] = [
  {
    woNumber: 'WO-32-0455', title: 'Main Landing Gear — 600-hr functional check', ata: '32', scheduled: true, riiRequired: true,
    lines: [
      { lineType: 'T', ata: '32', description: 'Perform MLG retraction test per AMM 32-30-00', itemStatusCode: 5 },
      { lineType: 'T', ata: '32', description: 'Inspect MLG actuator and downlock for leakage/wear', itemStatusCode: 5 },
      { lineType: 'T', ata: '32', description: 'Lubricate landing gear per CMM; record grease P/N', itemStatusCode: 5 },
    ],
  },
  {
    woNumber: 'WO-21-0231', title: 'Air conditioning pack valve replacement', ata: '21', scheduled: false, riiRequired: false,
    lines: [
      { lineType: 'S', ata: '21', description: 'PACK 1 FAULT CAS recurring — pack flow control valve suspect', itemStatusCode: 5 },
      { lineType: 'T', ata: '21', description: 'Remove and replace flow control valve P/N 1159SCB... ', itemStatusCode: 5 },
      { lineType: 'T', ata: '21', description: 'Operational test of pack 1 per AMM 21-50-00', itemStatusCode: 5 },
    ],
  },
  {
    woNumber: 'WO-24-0188', title: 'APU generator GCU inspection', ata: '24', scheduled: true, riiRequired: false,
    lines: [
      { lineType: 'T', ata: '24', description: 'Inspect APU GCU connectors and bonding', itemStatusCode: 5 },
      { lineType: 'T', ata: '24', description: 'Megger APU generator feeders; record values', itemStatusCode: 5 },
    ],
  },
  {
    woNumber: 'WO-27-0512', title: 'Flight control rigging check (RII)', ata: '27', scheduled: true, riiRequired: true,
    lines: [
      { lineType: 'T', ata: '27', description: 'Verify aileron rig pins and cable tension per AMM 27-10-00', itemStatusCode: 5 },
      { lineType: 'T', ata: '27', description: 'Independent inspection of control continuity (RII)', itemStatusCode: 5, },
    ],
  },
];

/** List the open CAMP work orders available to pull for a serial (faked). */
export function listOpenWorkOrders(serial: string): CampResult<{ woNumber: string; title: string; ata: string; scheduled: boolean; riiRequired: boolean }[]> {
  if (!_sessionKey) return sessionError();
  return { ok: true, data: WO_CATALOG.map(w => ({ woNumber: w.woNumber, title: w.title, ata: w.ata, scheduled: w.scheduled, riiRequired: w.riiRequired })) };
}

/** GetWODetails (WRK). Mock returns the catalog entry with task/squawk detail lines. */
export function getWODetails(serial: string, woNumber: string): CampResult<CampWoDetails> {
  if (!_sessionKey) return sessionError();
  const found = WO_CATALOG.find(w => w.woNumber === woNumber);
  if (!found) return { ok: false, errorCode: CAMP_ERROR.NO_MATCHING_RECORD.code, errorMsg: CAMP_ERROR.NO_MATCHING_RECORD.msg };
  return { ok: true, data: { ...found, serial, headerStatusCode: 1 } }; // 1 = Open
}

export const campMeta = { baseUrls: CAMP_BASE_URLS, env: CAMP_ENV, minutesToHours: campMinutesToHours };

function hashStr(x: string): number {
  let h = 0;
  for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) | 0;
  return h;
}

// ──────────────────────────────────────────────────────────────────────────────
// DEMO READ-VIEW DATA SOURCES (reskinning CAMP). These are deterministic MOCK
// generators that stand in for what CAMP would return on a read, so myGFO can
// present CAMP's data through a clean UI while CAMP remains the system of record.
// `GetAircraftDueList` and `GetLatestAircraftTimes` are documented CAMP functions;
// the AD/SB read below is NOT in the GEN/STA/WRK docs — it is flagged as an Open
// Question and must be confirmed before any real implementation (no invented endpoint).
// ──────────────────────────────────────────────────────────────────────────────
const _D = 86400000;

export type DueCategory = 'INSPECTION' | 'AD' | 'SB' | 'COMPONENT';
export interface CampForecastItem {
  category: DueCategory;
  ata: string;
  description: string;
  dueDateUtc?: string;   // calendar due (≤ 3-month projection cap)
  dueHours?: number;     // airframe-hours due
  dueCycles?: number;    // airframe-cycles due
}

/** Mock GetAircraftDueList (≤3-month projection, calendar units). Deterministic per serial. */
export function campForecast(serial: string, airframe: { hours: number; cycles: number }): CampForecastItem[] {
  const now = Date.now();
  const s = Math.abs(hashStr(serial));
  const at = (days: number) => new Date(now + days * _D).toISOString();
  return [
    { category: 'INSPECTION', ata: '05', description: 'Phase A inspection', dueDateUtc: at(12 + (s % 6)), dueHours: Math.round(airframe.hours + 38) },
    { category: 'AD', ata: '27', description: 'AD 2024-12-05 flight-control rigging (recurring)', dueDateUtc: at(5 + (s % 4)) },
    { category: 'INSPECTION', ata: '24', description: 'Battery capacity check', dueDateUtc: at(21) },
    { category: 'SB', ata: '21', description: 'SB 21-117 pack controller upgrade', dueDateUtc: at(45 + (s % 20)) },
    { category: 'COMPONENT', ata: '32', description: 'MLG overhaul (life-limited)', dueDateUtc: at(80), dueHours: Math.round(airframe.hours + 620), dueCycles: airframe.cycles + 410 },
  ];
}

export interface CampComponentTimes {
  serial: string;
  airframe: { hours: number; cycles: number };
  eng1: { hours: number; cycles: number };
  eng2: { hours: number; cycles: number };
  apu: { hours: number };
}
/** Mock GetLatestAircraftTimes broken out by major component (CAMP stores minutes; ÷60 here). */
export function campComponentTimes(serial: string, airframeHours: number, cycles: number): CampComponentTimes {
  const s = Math.abs(hashStr(serial));
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    serial,
    airframe: { hours: airframeHours, cycles },
    eng1: { hours: r1(airframeHours - 60 - (s % 30)), cycles: cycles - (20 + (s % 15)) },
    eng2: { hours: r1(airframeHours - 48 - (s % 25)), cycles: cycles - (15 + (s % 12)) },
    apu: { hours: r1(airframeHours * 0.48) },
  };
}

export interface CampAdSbItem {
  id: string;
  kind: 'AD' | 'SB';
  subject: string;
  recurrence: 'ONE_TIME' | 'RECURRING';
  status: 'OPEN' | 'COMPLIED';
  ata: string;
  nextDueUtc?: string;
}
export const CAMP_ADSB_OPEN_QUESTION =
  'OQ: the CAMP read function for AD/SB status is NOT in the GEN/STA/WRK docs — confirm under sandbox; do not invent an endpoint.';

/** Mock AD/SB status. ⚠ Undocumented CAMP read — see CAMP_ADSB_OPEN_QUESTION (Open Question; no invented endpoint). */
export function campAdSb(serial: string): CampAdSbItem[] {
  const now = Date.now();
  const s = Math.abs(hashStr(serial));
  const at = (days: number) => new Date(now + days * _D).toISOString();
  return [
    { id: 'AD-2024-12-05', kind: 'AD', subject: 'Flight-control rigging recurring inspection', recurrence: 'RECURRING', status: 'OPEN', ata: '27', nextDueUtc: at(5 + (s % 4)) },
    { id: 'AD-2023-08-11', kind: 'AD', subject: 'Fuel boost-pump wiring inspection', recurrence: 'ONE_TIME', status: 'COMPLIED', ata: '28' },
    { id: 'SB-650-32-117', kind: 'SB', subject: 'MLG actuator seal upgrade', recurrence: 'ONE_TIME', status: 'OPEN', ata: '32', nextDueUtc: at(40 + (s % 30)) },
    { id: 'SB-650-21-090', kind: 'SB', subject: 'Pack controller software load', recurrence: 'ONE_TIME', status: 'COMPLIED', ata: '21' },
  ];
}
