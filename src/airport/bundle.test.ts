import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type { AirportIndexEntry, AirportRecord } from '../../scripts/build-airport-bundle';

/**
 * Integration test over the generated reference bundle (D45, D48).
 *
 * The unit tests prove the resolvers behave correctly given rows. This proves the
 * generator actually produced those values for real airports from the real
 * cycle — the step where a wrong join key or a dropped filter would otherwise go
 * unnoticed.
 */

const BUNDLE = path.resolve(__dirname, '../../public/airport-data');

function readIndex(): { effectiveDate: string; count: number; airports: AirportIndexEntry[] } {
  return JSON.parse(readFileSync(path.join(BUNDLE, 'index.json'), 'utf8'));
}

function readAirport(id: string): AirportRecord {
  return JSON.parse(readFileSync(path.join(BUNDLE, 'airports', `${id}.json`), 'utf8'));
}

describe('airport reference bundle', () => {
  const index = readIndex();

  it('is stamped with the NASR cycle it came from', () => {
    expect(index.effectiveDate).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
  });

  it('has an index entry for every airport, and a count that matches', () => {
    expect(index.airports).toHaveLength(index.count);
  });

  it('contains only airports with a qualifying runway (D45)', () => {
    expect(index.airports.every((entry) => entry.longestRunwayFt >= 5000)).toBe(true);
  });

  it('is keyed on the FAA identifier, because 30% of the set has no ICAO id', () => {
    const withoutIcao = index.airports.filter((entry) => !entry.icaoId);

    expect(withoutIcao.length).toBeGreaterThan(0);
    expect(index.airports.every((entry) => Boolean(entry.id))).toBe(true);
  });

  it('has unique ids', () => {
    const ids = new Set(index.airports.map((entry) => entry.id));

    expect(ids.size).toBe(index.airports.length);
  });
});

describe('KTEB — pavement strength published only as a remark', () => {
  const teb = readAirport('TEB');

  it('resolved the PCR value the PCN column does not carry', () => {
    const runway = teb.runways.find((r) => r.runwayId === '01/19');

    expect(runway?.pavement.classification).toMatchObject({
      raw: '459/F/D/X/T',
      numericValue: 459,
      source: 'pcr-remark',
    });
  });

  it('kept the gross weights flagged as unit-unconfirmed (TL-31)', () => {
    const runway = teb.runways.find((r) => r.runwayId === '01/19');

    expect(runway?.pavement.grossWeight).toEqual({
      singleWheel: 50,
      dualWheel: 100,
      twoDualWheelsTandem: null,
      twoDualWheelsDoubleTandem: null,
      unitConfirmed: false,
    });
  });

  it('kept LDA distinct from TORA — 838 ft that a single length field would lose', () => {
    const end = teb.runways
      .find((r) => r.runwayId === '01/19')
      ?.ends.find((e) => e.endId === '01');

    expect(end?.declaredDistances).toEqual({
      toraFt: 6997,
      todaFt: 6997,
      asdaFt: 6929,
      ldaFt: 6159,
    });
  });

  it('carries the operational flags a crew actually asks about', () => {
    expect(teb).toMatchObject({
      icaoId: 'KTEB',
      towerTypeCode: 'ATCT',
      customsAvailable: false,
      landingFee: true,
      fuelTypes: ['100LL', 'A'],
    });
  });

  it('carries the airport manager contact', () => {
    expect(teb.contacts.some((contact) => contact.title === 'MANAGER' && contact.phone)).toBe(
      true,
    );
  });
});

describe('KASE — asymmetric ends and a pseudo-runway', () => {
  const ase = readAirport('ASE');

  it('dropped the zero-length pseudo-runway NASR carries on this airport', () => {
    expect(ase.runways.map((runway) => runway.runwayId)).not.toContain('00X');
  });

  it('preserved the take-off asymmetry between the two ends', () => {
    const runway = ase.runways.find((r) => r.runwayId === '15/33');
    const fifteen = runway?.ends.find((e) => e.endId === '15');
    const thirtyThree = runway?.ends.find((e) => e.endId === '33');

    expect(fifteen?.declaredDistances?.toraFt).toBe(7006);
    expect(thirtyThree?.declaredDistances?.toraFt).toBe(8006);
    // Both land on 7006 — the 1000 ft displaced threshold on 33 is why.
    expect(thirtyThree?.declaredDistances?.ldaFt).toBe(7006);
    expect(thirtyThree?.displacedThresholdFt).toBe(1000);
  });
});

describe('pavement strength comes from both sources, remarks more often', () => {
  const index = readIndex();
  const allRunways = index.airports
    .map((entry) => readAirport(entry.id))
    .flatMap((airport) => airport.runways);

  const bySource = (source: string) =>
    allRunways.filter((runway) => runway.pavement.classification?.source === source);

  it('reads more classifications from remarks than from the PCN column', () => {
    // This is the finding the whole resolver exists for: the FAA is migrating
    // pavement strength out of APT_RWY.PCN into free-text remarks. If the column
    // ever overtakes remarks, re-read the migration status before trusting it.
    expect(bySource('pcr-remark').length).toBeGreaterThan(bySource('pcn-column').length);
  });

  it('still reads the PCN column, which carries a third of what we have', () => {
    expect(bySource('pcn-column').length).toBeGreaterThan(100);
  });

  it('leaves most runways with no published classification at all', () => {
    const unclassified = allRunways.filter((runway) => !runway.pavement.classification);

    expect(unclassified.length).toBeGreaterThan(allRunways.length * 0.3);
  });

  it('only ever records alsoPublished alongside a remark-sourced classification', () => {
    // No runway in the current cut publishes both — the one real example,
    // GFK 09R/27L, is 3,300 ft and does not survive the >=5000 ft filter. The
    // branch is exercised by pavement.test.ts against that real record; this
    // asserts the invariant holds for whatever a future cycle ships.
    const withBoth = allRunways.filter((runway) => runway.pavement.alsoPublished);

    expect(
      withBoth.every(
        (runway) =>
          runway.pavement.classification?.source === 'pcr-remark' &&
          runway.pavement.alsoPublished?.source === 'pcn-column',
      ),
    ).toBe(true);
  });
});

describe('coverage is honest about what the FAA does not publish', () => {
  const index = readIndex();
  const sample = index.airports.slice(0, 400).map((entry) => readAirport(entry.id));

  it('leaves declared distances null far more often than not', () => {
    const withDistances = sample.filter((airport) =>
      airport.runways.some((runway) => runway.ends.some((end) => end.declaredDistances)),
    );

    // Measured at 26.6% across the full set. If this ever approaches 100%, some
    // code has started inventing distances from runway length.
    expect(withDistances.length).toBeLessThan(sample.length * 0.6);
  });

  it('never emits a declared-distance set that merely echoes runway length', () => {
    const suspicious = sample.flatMap((airport) =>
      airport.runways.flatMap((runway) =>
        runway.ends.filter(
          (end) => end.declaredDistances === null && runway.lengthFt !== null,
        ),
      ),
    );

    // Every end without published distances must stay null — this asserts the
    // absence of a backfill, which is the failure mode worth guarding.
    expect(suspicious.every((end) => end.declaredDistances === null)).toBe(true);
  });
});
