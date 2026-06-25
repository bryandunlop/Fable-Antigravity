// CAMP session discipline (documented in CLAUDE.md "CAMP error taxonomy" / "Session lifecycle"):
//   LogIn → call → LogOff (always, in finally). Cache the key for one run only.
//   - SESSION_NOT_VALID on a call → re-login EXACTLY ONCE and retry; if it recurs, fail + alert.
//   - L100 (invalid user/pass) / L102 (disabled) on login → STOP, alert; never retry (lockout risk).
//   - L103 (app maintenance) / other login failure → TRANSIENT; back off and retry later.
// Pure with respect to the injected driver, so the retry/stop logic is unit-testable without module state.
import { CAMP_ERROR } from './campTaxonomy';
import type { CampResult } from './campClient';

const SESSION_NOT_VALID = CAMP_ERROR.SESSION_NOT_VALID.code;
const LOGIN_FATAL = new Set<number | string>([CAMP_ERROR.LOGIN_INVALID.code, CAMP_ERROR.LOGIN_DISABLED.code]);

export type SessionOutcome<T> =
  | { kind: 'OK'; data: CampResult<T>; reLoggedIn: boolean }
  | { kind: 'FATAL'; errorCode: number | string; errorMsg: string; alert: string }
  | { kind: 'TRANSIENT'; errorCode: number | string; errorMsg: string; alert: string };

export interface SessionDriver<T> {
  login: () => CampResult<{ key: string }>;
  call: () => CampResult<T>;
  logoff: () => void;
}

export function runWithSession<T>(d: SessionDriver<T>): SessionOutcome<T> {
  try {
    const login1 = d.login();
    if (!login1.ok) {
      return LOGIN_FATAL.has(login1.errorCode!)
        ? { kind: 'FATAL', errorCode: login1.errorCode!, errorMsg: login1.errorMsg ?? '', alert: 'CAMP login failed — STOP, do not retry (lockout risk). A human must investigate.' }
        : { kind: 'TRANSIENT', errorCode: login1.errorCode!, errorMsg: login1.errorMsg ?? '', alert: 'CAMP login transient failure — back off and retry later.' };
    }

    let res = d.call();
    let reLoggedIn = false;
    if (!res.ok && res.errorCode === SESSION_NOT_VALID) {
      const login2 = d.login(); // re-login exactly once
      reLoggedIn = true;
      if (!login2.ok && LOGIN_FATAL.has(login2.errorCode!)) {
        return { kind: 'FATAL', errorCode: login2.errorCode!, errorMsg: login2.errorMsg ?? '', alert: 'CAMP re-login failed — STOP (lockout risk).' };
      }
      res = d.call();
      if (!res.ok && res.errorCode === SESSION_NOT_VALID) {
        return { kind: 'FATAL', errorCode: SESSION_NOT_VALID, errorMsg: res.errorMsg ?? '', alert: 'CAMP session still invalid after one re-login — fail the run and alert.' };
      }
    }
    return { kind: 'OK', data: res, reLoggedIn };
  } finally {
    d.logoff();
  }
}
