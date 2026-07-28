import { describe, expect, it } from 'vitest';

import { isPublishableRunway, parseDeclaredDistances } from './runway';

// Verbatim rows from the FAA NASR 09 Jul 2026 cycle.

const KTEB_01 = {
  tkofRunAvbl: '6997',
  tkofDistAvbl: '6997',
  acltStopDistAvbl: '6929',
  lndgDistAvbl: '6159',
};

const KASE_15 = {
  tkofRunAvbl: '7006',
  tkofDistAvbl: '7006',
  acltStopDistAvbl: '7006',
  lndgDistAvbl: '7006',
};

const KASE_33 = {
  tkofRunAvbl: '8006',
  tkofDistAvbl: '8006',
  acltStopDistAvbl: '8006',
  lndgDistAvbl: '7006',
};

const NOT_PUBLISHED = {
  tkofRunAvbl: '',
  tkofDistAvbl: '',
  acltStopDistAvbl: '',
  lndgDistAvbl: '',
};

describe('parseDeclaredDistances', () => {
  it('keeps the four distances as four distinct values (KTEB 01)', () => {
    // TORA 6997 but LDA 6159 — 838 ft of difference that a single "runway
    // length" field would silently discard.
    expect(parseDeclaredDistances(KTEB_01)).toEqual({
      toraFt: 6997,
      todaFt: 6997,
      asdaFt: 6929,
      ldaFt: 6159,
    });
  });

  it('preserves asymmetry between the two ends of one runway (KASE 15 vs 33)', () => {
    const fifteen = parseDeclaredDistances(KASE_15);
    const thirtyThree = parseDeclaredDistances(KASE_33);

    expect(fifteen?.toraFt).toBe(7006);
    expect(thirtyThree?.toraFt).toBe(8006);
    // Both ends land on the same 7006, but only one of them takes off on 8006.
    expect(fifteen?.ldaFt).toBe(7006);
    expect(thirtyThree?.ldaFt).toBe(7006);
  });

  it('returns null when nothing was published — the majority case', () => {
    // Only 26.6% of the >=5000 ft set publishes declared distances. Absent must
    // read as "the FAA did not publish this", never as zero and never as a
    // number derived from RWY_LEN.
    expect(parseDeclaredDistances(NOT_PUBLISHED)).toBeNull();
  });

  it('keeps a partially published set rather than discarding it', () => {
    expect(
      parseDeclaredDistances({
        ...NOT_PUBLISHED,
        tkofRunAvbl: '6997',
        lndgDistAvbl: '6159',
      }),
    ).toEqual({
      toraFt: 6997,
      todaFt: null,
      asdaFt: null,
      ldaFt: 6159,
    });
  });
});

describe('isPublishableRunway', () => {
  it('accepts a hard-surface runway at or above the 5000 ft threshold (KTEB 01/19)', () => {
    expect(
      isPublishableRunway({ rwyId: '01/19', rwyLen: '6997', surfaceTypeCode: 'ASPH' }),
    ).toBe(true);
  });

  it('rejects the zero-length pseudo-runway NASR carries on real airports (KASE 00X)', () => {
    expect(isPublishableRunway({ rwyId: '00X', rwyLen: '0', surfaceTypeCode: '' })).toBe(false);
  });

  it('rejects runways shorter than 5000 ft', () => {
    expect(
      isPublishableRunway({ rwyId: '07/25', rwyLen: '4999', surfaceTypeCode: 'ASPH' }),
    ).toBe(false);
  });

  it('rejects water surfaces — all 354 qualifying seaplane runways are WATER', () => {
    expect(
      isPublishableRunway({ rwyId: 'N/S', rwyLen: '10000', surfaceTypeCode: 'WATER' }),
    ).toBe(false);
  });

  // Every code below appears verbatim in the 09 Jul 2026 cycle on a >=5000 ft
  // runway. Counts in comments are that cycle's actual runway counts.
  it.each([
    ['ASPH', 2003],
    ['CONC', 543],
    ['ASPH-CONC', 160],
    ['PEM', 49],
  ])('accepts fully hard surface %s (%i runways in cycle)', (surfaceTypeCode) => {
    expect(isPublishableRunway({ rwyId: '01/19', rwyLen: '7000', surfaceTypeCode })).toBe(true);
  });

  it.each([['TURF'], ['GRVL'], ['GRAVEL'], ['DIRT'], ['PSP'], ['TRTD'], ['']])(
    'rejects soft or unstated surface %s',
    (surfaceTypeCode) => {
      expect(isPublishableRunway({ rwyId: '01/19', rwyLen: '7000', surfaceTypeCode })).toBe(
        false,
      );
    },
  );

  // Composite surfaces are only as good as their worst component, so a mixed
  // runway is rejected even though its primary component is hard. These are real
  // codes (both separators occur) and rare — 11 runways in total.
  it.each([['ASPH-DIRT'], ['ASPH-GRVL'], ['ASPH-TURF'], ['ASPH/GRVL'], ['CONC-GRVL'], ['ASPH-TRTD']])(
    'rejects part-hard composite surface %s',
    (surfaceTypeCode) => {
      expect(isPublishableRunway({ rwyId: '01/19', rwyLen: '7000', surfaceTypeCode })).toBe(
        false,
      );
    },
  );
});
