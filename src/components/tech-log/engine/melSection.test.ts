import { describe, it, expect } from 'vitest';
import { SEED_MEL } from '../mockData/mel';
import { SEED_MEL_SECTIONS } from '../mockData/melSections';
import { casPaletteFor, hasRepairInterval, sectionOf } from './melSection';
import type { MelItem } from '../types';

const two = SEED_MEL_SECTIONS.filter(m => m.melSection === 'TWO');
const nef = SEED_MEL_SECTIONS.filter(m => m.melSection === 'NEF');

describe('MEL section discrimination', () => {
  it('reads a missing melSection as Section One, so the pre-existing catalog is untouched', () => {
    expect(SEED_MEL.every(m => m.melSection === undefined)).toBe(true);
    expect(SEED_MEL.every(m => sectionOf(m) === 'ONE')).toBe(true);
  });

  it('holds both new sections of both fleet MELs', () => {
    expect(two).toHaveLength(208);
    expect(nef).toHaveLength(287);
    expect(SEED_MEL_SECTIONS).toHaveLength(495);
    for (const type of ['G500', 'G650ER'] as const) {
      expect(two.filter(m => m.aircraftType === type).length).toBeGreaterThan(0);
      expect(nef.filter(m => m.aircraftType === type).length).toBeGreaterThan(0);
    }
  });

  it('gives every item a unique id across the whole catalog', () => {
    const all = [...SEED_MEL, ...SEED_MEL_SECTIONS];
    expect(new Set(all.map(m => m.id)).size).toBe(all.length);
  });
});

describe('Section Two — CAS Message Relief', () => {
  it('keys on the CAS message, not on ATA', () => {
    expect(two.every(m => m.ataReference === '')).toBe(true);
    expect(two.every(m => Boolean(m.casMessage?.trim()))).toBe(true);
    expect(two.every(m => m.casMessage === m.title)).toBe(true);
  });

  it('carries a repair category on every item, exactly like Section One', () => {
    expect(two.every(m => m.category !== null)).toBe(true);
    expect(two.every(m => ['A', 'B', 'C', 'D'].includes(m.category!))).toBe(true);
  });

  it('carries the annunciation colour AND its tier word on every item', () => {
    expect(two.every(m => Boolean(m.casColor))).toBe(true);
    expect(two.every(m => Boolean(m.casLevel))).toBe(true);
  });

  /**
   * The regression this pins: D57 defined the palette as the G500's four, so a G650ER CAS message
   * had nowhere to land — its deck annunciates advisories in Blue, and there is not one Cyan item
   * in its MEL. Reading the tier off the hue would also have made Blue and Cyan look like different
   * urgencies when both mean Advisory.
   */
  it('uses the colour its own fleet MEL prints, not one shared palette', () => {
    const colours = (t: 'G500' | 'G650ER') =>
      new Set(two.filter(m => m.aircraftType === t).map(m => m.casColor));
    expect(colours('G650ER').has('BLUE')).toBe(true);
    expect(colours('G650ER').has('CYAN')).toBe(false);
    expect(colours('G500').has('CYAN')).toBe(true);

    expect(casPaletteFor('G500')).toContain('CYAN');
    expect(casPaletteFor('G500')).not.toContain('BLUE');
    expect(casPaletteFor('G650ER')).toContain('BLUE');
    expect(casPaletteFor('G650ER')).not.toContain('CYAN');
  });

  it('names the same Advisory tier under both fleets’ advisory colours', () => {
    const levelOf = (c: string) =>
      new Set(two.filter(m => m.casColor === c).map(m => m.casLevel));
    expect(levelOf('BLUE')).toEqual(new Set(['ADVISORY']));
    expect(levelOf('CYAN')).toEqual(new Set(['ADVISORY']));
    expect(levelOf('AMBER')).toEqual(new Set(['CAUTION']));
  });

  it('lists no RED item, because Section Two lists only dispatchable relief', () => {
    expect(two.some(m => m.casColor === 'RED')).toBe(false);
  });
});

describe('NEF Deferral List', () => {
  it('carries no repair category — the program repairs "at the earliest opportunity"', () => {
    expect(nef.every(m => m.category === null)).toBe(true);
  });

  it('carries the placard rule and the flight-crew deferral authority on every item', () => {
    expect(nef.every(m => Boolean(m.placardText?.trim()))).toBe(true);
    expect(nef.every(m => m.flightCrewDeferral === true)).toBe(true);
  });

  it('groups every item under one of the MEL’s six cabin areas', () => {
    const areas = new Set(nef.map(m => m.nefArea));
    expect(areas.size).toBe(6);
    expect([...areas].every(a => /\(\d00\)$/.test(a!))).toBe(true);
    expect(nef.every(m => /^N\d{3}-\d+[A-Z]?$/.test(m.itemNumber))).toBe(true);
  });

  it('drops the blank write-in slots the paper NEF Checklist is signed into', () => {
    expect(nef.some(m => m.itemNumber.startsWith('N900'))).toBe(false);
  });
});

describe('which items carry a repair interval', () => {
  const item = (p: Partial<MelItem>): MelItem => ({
    id: 'm1', aircraftType: 'G500', mmelRevision: 'Rev 1', effectiveDate: '2025-09-26',
    approvalState: 'APPROVED', ataReference: '24', itemNumber: '24-01', subItemNumber: '24-01-01',
    title: 'x', category: 'C', numberInstalled: null, numberRequired: null, ...p,
  });

  it('Section One and Section Two both do, and defer identically', () => {
    expect(hasRepairInterval(item({}))).toBe(true);
    expect(hasRepairInterval(item({ melSection: 'TWO', ataReference: '', category: 'B' }))).toBe(true);
    expect(two.every(m => hasRepairInterval(m))).toBe(true);
  });

  /**
   * NEF is fully deferrable (D69) — placarded, tracked, and clockless. What it does NOT have is an
   * interval, which is the only thing this predicate is about: it guards the PL-25 math, not the
   * deferral.
   */
  it('NEF does not, because the program repairs at the earliest opportunity', () => {
    expect(nef.every(m => !hasRepairInterval(m))).toBe(true);
  });
});
