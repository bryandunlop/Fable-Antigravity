import { describe, it, expect } from 'vitest';
import {
  campLogin, campLogoff, integrateDiscrepancies,
  pushUtilization_TODO_UNDOCUMENTED, UTILIZATION_PUSH_OPEN_QUESTION, CAMP_ADSB_OPEN_QUESTION,
  getCampEnv, promoteToProduction, revertToSandbox, setEnvUnsafeForDemo, PROMOTION_CONFIRM_PHRASE,
} from './campClient';
import { hoursToCampMinutes } from './campTaxonomy';

describe('campClient — session + exact-serial guards', () => {
  it('rejects a call with no open session', () => {
    campLogoff();
    const res = integrateDiscrepancies(
      { serial: '6051', mode: 'INSERT', discrepancyType: 'NON-DEFERRED', ata: '21', description: 'x' }, '6051');
    expect(res.ok).toBe(false);
  });

  it('rejects an exact-serial mismatch (the #1 CAMP failure mode)', () => {
    campLogin();
    const res = integrateDiscrepancies(
      { serial: '6051', mode: 'INSERT', discrepancyType: 'NON-DEFERRED', ata: '21', description: 'x' }, '6052');
    campLogoff();
    expect(res.ok).toBe(false);
    expect(String(res.errorMsg)).toMatch(/serial mismatch/i);
  });
});

describe('utilization push — BLOCKED guardrail (Open Question 1)', () => {
  it('never returns ok and always carries the OQ1 message (no invented endpoint)', () => {
    const res = pushUtilization_TODO_UNDOCUMENTED(
      { serial: '6051', airframeHours: 100, cycles: 50, landings: 60 }, '6051');
    expect(res.ok).toBe(false);
    expect(res.data?.status).toBe('BLOCKED_UNDOCUMENTED');
    expect(res.errorMsg).toBe(UTILIZATION_PUSH_OPEN_QUESTION);
    expect(UTILIZATION_PUSH_OPEN_QUESTION).toMatch(/OQ1|undocumented/i);
  });

  it('prepares the minutes-converted payload only when serial matches and totals are increase-only', () => {
    const ok = pushUtilization_TODO_UNDOCUMENTED(
      { serial: '6051', airframeHours: 100, cycles: 50, landings: 60 }, '6051',
      { airframeHours: 90, cycles: 48, landings: 55 });
    expect(ok.data?.validation).toEqual({ serialMatches: true, increaseOnly: true });
    expect(ok.data?.preparedPayload?.totalTimeMinutes).toBe(hoursToCampMinutes(100));
  });

  it('flags a serial mismatch and withholds the prepared payload', () => {
    const bad = pushUtilization_TODO_UNDOCUMENTED(
      { serial: '9999', airframeHours: 100, cycles: 50, landings: 60 }, '6051');
    expect(bad.data?.validation.serialMatches).toBe(false);
    expect(bad.data?.preparedPayload).toBeUndefined();
  });

  it('flags a decrease (CAMP utilization is increase-only) and withholds the payload', () => {
    const dec = pushUtilization_TODO_UNDOCUMENTED(
      { serial: '6051', airframeHours: 80, cycles: 50, landings: 60 }, '6051',
      { airframeHours: 90, cycles: 48, landings: 55 });
    expect(dec.data?.validation.increaseOnly).toBe(false);
    expect(dec.data?.preparedPayload).toBeUndefined();
  });
});

describe('AD/SB read is OQ-labelled (undocumented CAMP function)', () => {
  it('exposes an Open-Question marker for the AD/SB read', () => {
    expect(CAMP_ADSB_OPEN_QUESTION).toMatch(/AD\/SB|undocumented|OQ/i);
  });
});

describe('production promotion gate (Sandbox rule)', () => {
  it('defaults to sandbox', () => {
    revertToSandbox();
    expect(getCampEnv()).toBe('sandbox');
  });

  it('refuses to promote without the exact typed confirmation', () => {
    revertToSandbox();
    expect(promoteToProduction('promote')).toBe(false);
    expect(getCampEnv()).toBe('sandbox');
  });

  it('promotes only with the exact confirmation phrase', () => {
    expect(promoteToProduction(PROMOTION_CONFIRM_PHRASE)).toBe(true);
    expect(getCampEnv()).toBe('production');
    revertToSandbox();
    expect(getCampEnv()).toBe('sandbox');
  });

  it('refuses a production push when the gate is closed', () => {
    setEnvUnsafeForDemo('production'); // production env, gate NOT open
    campLogin();
    const res = integrateDiscrepancies({ serial: '6051', mode: 'INSERT', discrepancyType: 'NON-DEFERRED', ata: '21', description: 'x' }, '6051');
    campLogoff();
    expect(res.ok).toBe(false);
    expect(String(res.errorCode)).toBe('PROD_GATE_CLOSED');
    revertToSandbox();
  });

  it('allows the push in sandbox and once promoted (gate open)', () => {
    revertToSandbox();
    campLogin();
    expect(integrateDiscrepancies({ serial: '6051', mode: 'INSERT', discrepancyType: 'NON-DEFERRED', ata: '21', description: 'x' }, '6051').ok).toBe(true);
    promoteToProduction(PROMOTION_CONFIRM_PHRASE);
    expect(integrateDiscrepancies({ serial: '6051', mode: 'INSERT', discrepancyType: 'NON-DEFERRED', ata: '21', description: 'y' }, '6051').ok).toBe(true);
    campLogoff();
    revertToSandbox();
  });
});
