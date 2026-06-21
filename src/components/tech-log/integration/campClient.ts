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

function sessionError<T>(): CampResult<T> {
  return { ok: false, errorCode: CAMP_ERROR.SESSION_NOT_VALID.code, errorMsg: CAMP_ERROR.SESSION_NOT_VALID.msg };
}

/** GEN LogIn -> encrypted security key (cached in memory for one run only). */
export function campLogin(): CampResult<{ key: string }> {
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
  if (!_sessionKey) return sessionError();
  return { ok: true, data: { serial, state: color } };
}

export const campMeta = { baseUrls: CAMP_BASE_URLS, env: CAMP_ENV, minutesToHours: campMinutesToHours };

function hashStr(x: string): number {
  let h = 0;
  for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) | 0;
  return h;
}
