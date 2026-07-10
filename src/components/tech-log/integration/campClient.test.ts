import { describe, it, expect } from 'vitest';
import {
  campLogin, campLogoff, integrateDiscrepancies, updateAircraftContactDate, getWODetails, listOpenWorkOrders,
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

describe('UpdateAircraftContactDate — the GEN heartbeat write (gated like every CAMP write)', () => {
  it('stamps the contact date in sandbox and reports rows affected', () => {
    revertToSandbox();
    campLogin();
    const res = updateAircraftContactDate('6051', '6051');
    campLogoff();
    expect(res.ok).toBe(true);
    expect(res.data?.rowsAffected).toBe(1);
  });

  it('refuses in production while the promotion gate is closed — it is a WRITE', () => {
    setEnvUnsafeForDemo('production');
    campLogin();
    const res = updateAircraftContactDate('6051', '6051');
    campLogoff();
    revertToSandbox();
    expect(res.ok).toBe(false);
    expect(String(res.errorCode)).toBe('PROD_GATE_CLOSED');
  });

  it('rejects a serial mismatch and a missing session', () => {
    revertToSandbox();
    campLogin();
    expect(updateAircraftContactDate('9999', '6051').ok).toBe(false);
    campLogoff();
    expect(updateAircraftContactDate('6051', '6051').ok).toBe(false);
  });
});

describe('WO detail carries parts, tools, consumables + header scheduling (WRK 2_0_8 fields)', () => {
  it('GetWODetails exposes per-line part numbers where the WO has them', () => {
    campLogin();
    const res = getWODetails('6051', 'WO-21-0231');
    campLogoff();
    expect(res.ok).toBe(true);
    const partLine = res.data?.lines.find(l => l.partNbr);
    expect(partLine?.partNbr).toBeTruthy();
  });

  it('GetWODetails exposes required tools (with calibration) and consumables (with qty)', () => {
    campLogin();
    const res = getWODetails('6051', 'WO-32-0455');
    campLogoff();
    expect(res.data?.requiredTools?.length).toBeGreaterThan(0);
    expect(res.data?.requiredTools?.[0].calibrationDueUtc).toBeTruthy();
    expect(res.data?.requiredConsumables?.[0].qty).toBeGreaterThan(0);
  });

  it('WO headers carry the scheduling block: in/out window, ICAO, service center, lead technician', () => {
    campLogin();
    const list = listOpenWorkOrders('6051');
    const detail = getWODetails('6051', 'WO-24-0188');
    campLogoff();
    const w = list.data?.[0];
    expect(w?.scheduledInUtc).toBeTruthy();
    expect(w?.scheduledOutUtc).toBeTruthy();
    expect(new Date(w!.scheduledOutUtc).getTime()).toBeGreaterThanOrEqual(new Date(w!.scheduledInUtc).getTime());
    expect(w?.icao).toBeTruthy();
    expect(detail.data?.serviceCenter).toBeTruthy();
    expect(detail.data?.leadTechnician).toBeTruthy();
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
