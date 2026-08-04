import { describe, it, expect } from 'vitest';
import { isNefItem, isNefDeferral, openDays, byAgeDesc, repairIntervalLabel } from './nef';
import { isDeferralExpired } from './pl25';
import { canDeferDefect } from './disposition';
import { SEED_MEL_SECTIONS } from '../mockData/melSections';
import type { Deferral, MelItem, Personnel } from '../types';

const NOW = '2026-07-31T12:00:00.000Z';

const deferral = (p: Partial<Deferral> = {}) => ({
  clockStartDateUtc: NOW, dayOfDiscoveryUtc: NOW, category: 'C', ...p,
}) as Deferral;

describe('an NEF deferral is placarded and tracked, but never expires (D69)', () => {
  const nefItem = SEED_MEL_SECTIONS.find(m => m.melSection === 'NEF')!;

  it('every NEF catalog item carries the placard rule — the gate has something to require', () => {
    expect(isNefItem(nefItem)).toBe(true);
    expect(nefItem.placardText?.trim()).toBeTruthy();
    expect(SEED_MEL_SECTIONS.filter(m => m.melSection === 'NEF').every(m => m.placardText?.trim())).toBe(true);
  });

  /**
   * The clocklessness is a property of the DATA, not of a branch someone could delete. A deferral
   * with neither a due date nor a usage threshold is already never expired, so nothing had to be
   * special-cased to stop an NEF item grounding an aircraft — this pins that it stays that way.
   */
  it('never expires, at any distance from its start, because it has no due condition', () => {
    const nef = deferral({ category: null, nefProgram: true, repairDueDateUtc: undefined, usageDueThreshold: undefined });
    for (const asOf of ['2026-08-01T00:00:00.000Z', '2030-01-01T00:00:00.000Z']) {
      expect(isDeferralExpired(nef, asOf, { hours: 99999, cycles: 99999 })).toBe(false);
    }
  });

  it('an ordinary deferral still expires — the clocklessness is NEF-only', () => {
    const catC = deferral({ repairDueDateUtc: '2026-07-30T00:00:00.000Z' });
    expect(isDeferralExpired(catC, NOW, { hours: 0, cycles: 0 })).toBe(true);
  });

  it('reads its NEF status from the snapshot, not from the item it points at', () => {
    // The flag is frozen at signing (the `melOProcedure` / governing-revision rule). A later MEL
    // revision must not be able to change what an already-signed deferral says it was.
    expect(isNefDeferral(deferral({ nefProgram: true, category: null }))).toBe(true);
    expect(isNefDeferral(deferral({ category: null }))).toBe(false);
    expect(isNefDeferral(deferral({ category: 'C' }))).toBe(false);
  });

  it('labels the missing interval rather than rendering a blank category', () => {
    expect(repairIntervalLabel(deferral({ nefProgram: true, category: null }))).toBe('NEF — no repair interval');
    expect(repairIntervalLabel(deferral({ category: 'B' }))).toBe('Cat B');
  });
});

/**
 * Bryan, 2026-07-31: clockless, but surface age. An NEF deferral will never raise its own hand by
 * expiring, so if nothing sorts by age the oldest one is the one nobody ever sees — and "repaired at
 * the earliest opportunity" quietly becomes "never".
 */
describe('age is surfaced even though the clock is not', () => {
  it('counts whole days open from the day of discovery', () => {
    expect(openDays(deferral({ dayOfDiscoveryUtc: '2026-07-01T12:00:00.000Z' }), NOW)).toBe(30);
    expect(openDays(deferral({ dayOfDiscoveryUtc: NOW }), NOW)).toBe(0);
  });

  it('never reports negative age for a deferral discovered later than "now"', () => {
    expect(openDays(deferral({ dayOfDiscoveryUtc: '2026-08-10T12:00:00.000Z' }), NOW)).toBe(0);
  });

  it('sorts oldest first', () => {
    const rows = [
      deferral({ id: 'young', dayOfDiscoveryUtc: '2026-07-29T12:00:00.000Z' }),
      deferral({ id: 'oldest', dayOfDiscoveryUtc: '2026-01-01T12:00:00.000Z' }),
      deferral({ id: 'middle', dayOfDiscoveryUtc: '2026-06-01T12:00:00.000Z' }),
    ];
    expect(byAgeDesc(rows, NOW).map(r => r.id)).toEqual(['oldest', 'middle', 'young']);
  });
});

/**
 * TL-37 — the MEL marks every item `Flight Crew Deferral Item` YES/NO and ~41 across the fleet are
 * NO. `canDeferDefect` already refused the SIGNATURE; Bryan's ruling is a hard block, so the item is
 * not offered to a crew member at all. This pins the rule the picker filter calls.
 */
describe('who the MEL lets defer what', () => {
  const person = (p: Partial<Personnel> = {}): Personnel => ({
    oid: 'USR001', displayName: 'Capt', role: 'PILOT', riiAuthorized: false, riiAuthorizedAta: [],
    active: true, ...p,
  });
  const item = (p: Partial<MelItem> = {}) => ({ flightCrewDeferral: true, ...p }) as MelItem;

  it('maintenance may defer anything the catalog holds', () => {
    const mx = person({ role: 'MAINTENANCE' });
    expect(canDeferDefect(mx, item({ flightCrewDeferral: false }))).toBe(true);
    expect(canDeferDefect(mx, item({ flightCrewDeferral: undefined }))).toBe(true);
  });

  it('authorized crew may defer only an item the MEL marks flight-crew-deferrable', () => {
    const crew = person({ crewDeferralAuthorized: true });
    expect(canDeferDefect(crew, item({ flightCrewDeferral: true }))).toBe(true);
    expect(canDeferDefect(crew, item({ flightCrewDeferral: false }))).toBe(false);
  });

  it('fails closed on an item whose flag was never recorded', () => {
    // 76 Section One rows carry no flag at all. Absent must not read as permission.
    expect(canDeferDefect(person({ crewDeferralAuthorized: true }), item({ flightCrewDeferral: undefined }))).toBe(false);
  });

  it('unauthorized crew may defer nothing, however the item is marked', () => {
    expect(canDeferDefect(person(), item({ flightCrewDeferral: true }))).toBe(false);
  });

  it('NEF items are flight-crew-deferrable, per MEL item 25-22-01', () => {
    const nef = SEED_MEL_SECTIONS.filter(m => m.melSection === 'NEF');
    expect(nef.every(m => m.flightCrewDeferral === true)).toBe(true);
    expect(canDeferDefect(person({ crewDeferralAuthorized: true }), nef[0])).toBe(true);
  });
});
