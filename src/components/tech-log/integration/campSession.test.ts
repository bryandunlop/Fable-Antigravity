import { describe, it, expect, vi } from 'vitest';
import { runWithSession } from './campSession';
import { CAMP_ERROR } from './campTaxonomy';
import type { CampResult } from './campClient';

const ok = <T>(data: T): CampResult<T> => ({ ok: true, data });
const err = (code: number | string, msg = ''): CampResult<any> => ({ ok: false, errorCode: code, errorMsg: msg });
const login = () => ok({ key: 'k' });

describe('runWithSession — CAMP session discipline', () => {
  it('happy path: login, call, logoff; no re-login', () => {
    const logoff = vi.fn();
    const out = runWithSession({ login, call: () => ok('state'), logoff });
    expect(out.kind).toBe('OK');
    if (out.kind === 'OK') { expect(out.reLoggedIn).toBe(false); expect(out.data.data).toBe('state'); }
    expect(logoff).toHaveBeenCalledTimes(1);
  });

  it('SESSION_NOT_VALID re-logs in exactly once, then succeeds', () => {
    let calls = 0, logins = 0;
    const out = runWithSession({
      login: () => { logins++; return ok({ key: 'k' }); },
      call: () => { calls++; return calls === 1 ? err(CAMP_ERROR.SESSION_NOT_VALID.code) : ok('state'); },
      logoff: () => {},
    });
    expect(out.kind).toBe('OK');
    if (out.kind === 'OK') expect(out.reLoggedIn).toBe(true);
    expect(logins).toBe(2);
    expect(calls).toBe(2);
  });

  it('SESSION_NOT_VALID that persists after one re-login is FATAL — no third attempt', () => {
    let calls = 0;
    const out = runWithSession({ login, call: () => { calls++; return err(CAMP_ERROR.SESSION_NOT_VALID.code); }, logoff: () => {} });
    expect(out.kind).toBe('FATAL');
    expect(calls).toBe(2); // initial + exactly one retry, then stop
  });

  it('L100 invalid login is FATAL immediately — the call never runs (lockout risk)', () => {
    const call = vi.fn(() => ok('state'));
    const out = runWithSession({ login: () => err(CAMP_ERROR.LOGIN_INVALID.code), call, logoff: () => {} });
    expect(out.kind).toBe('FATAL');
    expect(call).not.toHaveBeenCalled();
  });

  it('L102 disabled account is FATAL', () => {
    const out = runWithSession({ login: () => err(CAMP_ERROR.LOGIN_DISABLED.code), call: () => ok('x'), logoff: () => {} });
    expect(out.kind).toBe('FATAL');
  });

  it('L103 maintenance is TRANSIENT (back off, retry later) — not fatal', () => {
    const out = runWithSession({ login: () => err(CAMP_ERROR.APP_MAINTENANCE.code), call: () => ok('x'), logoff: () => {} });
    expect(out.kind).toBe('TRANSIENT');
  });

  it('always logs off, even on a fatal login', () => {
    const logoff = vi.fn();
    runWithSession({ login: () => err(CAMP_ERROR.LOGIN_INVALID.code), call: () => ok('x'), logoff });
    expect(logoff).toHaveBeenCalledTimes(1);
  });
});
