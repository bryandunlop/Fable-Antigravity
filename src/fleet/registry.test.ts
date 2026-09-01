import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FLEET, CORE_FLEET, CORE_TAILS, ALL_TAILS, FOREIGN_DEMO_TAIL, aircraftFor, isCoreTail, cabinFor } from './registry';
import { SEED_AIRCRAFT } from '../components/tech-log/mockData/fleet';
import { KNOWN_FLEET } from '../components/scheduling-command/fleet';

describe('the fleet register', () => {
  it('is four aeroplanes — two big cabins and two standard', () => {
    expect(CORE_TAILS).toEqual(['N1PG', 'N2PG', 'N5PG', 'N6PG']);
    expect(CORE_FLEET.filter(a => a.cabin === 'big')).toHaveLength(2);
    expect(CORE_FLEET.filter(a => a.cabin === 'standard')).toHaveLength(2);
  });

  it('never counts provisional or demo metal as bookable', () => {
    expect(isCoreTail('N3PG')).toBe(false); // G800, D195 content PENDING_FSDO
    expect(isCoreTail('N7PG')).toBe(false); // tech-log demo tail
    expect(aircraftFor('N3PG')?.provisional).toBe(true);
  });

  it('declares every tail exactly once', () => {
    expect(new Set(ALL_TAILS).size).toBe(ALL_TAILS.length);
  });

  it('answers cabin per tail, and nothing for a tail it does not know', () => {
    expect(cabinFor('N1PG')).toBe('big');
    expect(cabinFor('N5PG')).toBe('standard');
    expect(cabinFor('N650GS')).toBeUndefined();
  });
});

describe('the lists that used to disagree', () => {
  it('the tech-log seed is the register, tail for tail', () => {
    expect(SEED_AIRCRAFT.map(a => a.tailNumber).sort()).toEqual([...ALL_TAILS].sort());
    for (const ac of SEED_AIRCRAFT) {
      const reg = aircraftFor(ac.tailNumber)!;
      expect(ac.type).toBe(reg.type);
      expect(ac.serialNumber).toBe(reg.serialNumber);
    }
  });

  it('scheduling command’s KNOWN_FLEET is the register, and its phantom N650GS is gone', () => {
    expect(KNOWN_FLEET.map(a => a.tail)).not.toContain('N650GS');
    for (const row of KNOWN_FLEET) expect(aircraftFor(row.tail)).toBeDefined();
  });

  it('no seed names a tail the register has never heard of', () => {
    const root = join(__dirname, '..');
    const files = [
      'scheduling/store/seedTrips.ts',
      'services/todaysOpsMock.ts',
      'availability/data/downtimeFixtures.ts',
      'components/scheduling-command/fleet.ts',
      'components/tech-log/mockData/fleet.ts',
    ];
    // FOREIGN_DEMO_TAIL is declared not-ours in the register itself; anything else is drift.
    const known = new Set([...ALL_TAILS, FOREIGN_DEMO_TAIL]);
    for (const f of files) {
      const src = readFileSync(join(root, f), 'utf8');
      // Registration-shaped literals only: N + digits + 2-3 letters, the P&G house pattern.
      for (const tail of src.match(/\bN\d{1,3}[A-Z]{2,3}\b/g) ?? []) {
        expect(known.has(tail), `${f} names ${tail}, which is in no fleet register`).toBe(true);
      }
    }
  });

  it('has one aircraft-type vocabulary, not two — no bare G650', () => {
    expect(FLEET.map(a => a.type)).not.toContain('G650' as never);
    for (const a of FLEET) expect(['G650ER', 'G500', 'G800']).toContain(a.type);
  });

  it('the not-ours demo tail is never mistaken for fleet', () => {
    expect(aircraftFor(FOREIGN_DEMO_TAIL)).toBeUndefined();
    expect(isCoreTail(FOREIGN_DEMO_TAIL)).toBe(false);
    expect(KNOWN_FLEET.map(a => a.tail)).not.toContain(FOREIGN_DEMO_TAIL);
  });
});
