// CAMP integration reference constants — from the vendor docs (see CLAUDE.md "CAMP error taxonomy"
// / "CAMP status ladders" / Invariants, and docs/research/04). Used by the mock CAMP client.

export const CAMP_BASE_URLS = {
  gen: 'https://services.campsystems.com/campintegration/2_0_8/campintegrationGEN.asmx',
  sta: 'https://services.campsystems.com/campintegration/2_0_7/campintegrationSTA.asmx',
  wrk: 'https://services.campsystems.com/campintegration/2_0_8/campintegrationWRK.asmx',
} as const;

export const CAMP_ENV = 'sandbox'; // NEVER production in dev/test (CLAUDE.md Sandbox rule)

export const CAMP_ERROR = {
  SESSION_NOT_VALID: { code: -2147221404, msg: 'SESSION NOT VALID', handling: 're-login once then retry; if it recurs, fail + alert' },
  NO_MATCHING_RECORD: { code: -2147221373, msg: 'NO MATCHING RECORD FOUND', handling: 'treat as empty; do not retry' },
  INVALID_OPERATION: { code: -2147221372, msg: 'INVALID OPERATION', handling: 'log + fail; do not blind-retry' },
  LOGIN_INVALID: { code: 'L100', msg: 'INVALID USER NAME/PASSWORD', handling: 'STOP + alert (lockout risk); do not retry' },
  LOGIN_DISABLED: { code: 'L102', msg: 'ACCOUNT DISABLED', handling: 'STOP + alert' },
  APP_MAINTENANCE: { code: 'L103', msg: 'APPLICATION UNAVAILABLE FOR MAINTENANCE', handling: 'back off, retry later' },
} as const;

export const WO_ITEM_STATUS: Record<number, string> = { 5: 'OPEN', 15: 'IN WORK', 20: 'IN INSPECTION', 25: 'IN QC', 30: 'WORK COMPLETED', 35: 'COMPLIANCE POSTED', 40: 'COMPLIED WITH' };
export const WO_HEADER_STATUS: Record<number, string> = { 0: 'Complied With', 1: 'Open', 2: 'Cancelled', 3: 'Pending Post', 4: 'RTS-Update Pending', 5: 'RTS-Update Overdue', 6: 'Planned' };

export type DiscrepancyType = 'MEL' | 'DEFERRED-WATCHLIST' | 'NON-DEFERRED';
export type IntegrateMode = 'INSERT' | 'EDIT' | 'UPDATE';
export type MelFlag = 'A' | 'B' | 'C' | 'D';

export const DUE_LIST_CAP_MONTHS = 3; // hard cap (CLAUDE.md)

// Unit invariant: CAMP stores time as MINUTES; myGFO stores hours. Convert at the boundary.
export const hoursToCampMinutes = (h: number) => Math.round(h * 60);
export const campMinutesToHours = (m: number) => Math.round((m / 60) * 10) / 10;
