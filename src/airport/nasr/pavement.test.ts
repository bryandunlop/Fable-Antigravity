import { describe, expect, it } from 'vitest';

import { resolveRunwayPavement } from './pavement';

// Every fixture below is a verbatim row from the real FAA NASR 09 Jul 2026 cycle
// (09_Jul_2026_APT_CSV.zip). Nothing here is invented — the point of this suite is
// that the resolver survives what the FAA actually publishes, not what a tidy
// schema would suggest it publishes.

const emptyGrossWeights = {
  grossWtSw: '',
  grossWtDw: '',
  grossWtDtw: '',
  grossWtDdtw: '',
};

const noColumnPcn = {
  pcn: '',
  pavementTypeCode: '',
  subgradeStrengthCode: '',
  tirePresCode: '',
  dtrmMethodCode: '',
};

describe('resolveRunwayPavement — classification source', () => {
  it('reads the classification from a PCR remark when the PCN column is blank (KTEB 01/19)', () => {
    const result = resolveRunwayPavement({
      ...noColumnPcn,
      ...emptyGrossWeights,
      grossWtSw: '50',
      grossWtDw: '100',
      pcnRemarks: ['PCR VALUE: 459/F/D/X/T'],
    });

    expect(result.classification).toEqual({
      raw: '459/F/D/X/T',
      numericValue: 459,
      pavementTypeCode: 'F',
      subgradeStrengthCode: 'D',
      tirePressureCode: 'X',
      evaluationMethodCode: 'T',
      source: 'pcr-remark',
    });
  });

  it('assembles the classification from the five PCN columns when there is no remark (ANB 05/23)', () => {
    const result = resolveRunwayPavement({
      pcn: '10',
      pavementTypeCode: 'F',
      subgradeStrengthCode: 'C',
      tirePresCode: 'X',
      dtrmMethodCode: 'T',
      ...emptyGrossWeights,
      grossWtDw: '43.5',
      pcnRemarks: [],
    });

    expect(result.classification).toEqual({
      raw: '10/F/C/X/T',
      numericValue: 10,
      pavementTypeCode: 'F',
      subgradeStrengthCode: 'C',
      tirePressureCode: 'X',
      evaluationMethodCode: 'T',
      source: 'pcn-column',
    });
  });

  it('prefers the PCR remark but keeps the disagreeing column value (GFK 09R/27L)', () => {
    // The real record: column reads 10/R/C/W/T, remark reads 150/R/C/W/T — a 15x
    // disagreement. Silently picking either one would publish a number nobody chose.
    const result = resolveRunwayPavement({
      pcn: '10',
      pavementTypeCode: 'R',
      subgradeStrengthCode: 'C',
      tirePresCode: 'W',
      dtrmMethodCode: 'T',
      ...emptyGrossWeights,
      pcnRemarks: ['PCR VALUE: 150/R/C/W/T'],
    });

    expect(result.classification?.numericValue).toBe(150);
    expect(result.classification?.source).toBe('pcr-remark');
    expect(result.alsoPublished?.numericValue).toBe(10);
    expect(result.alsoPublished?.source).toBe('pcn-column');
  });

  it('leaves alsoPublished null when only one source published a classification', () => {
    const result = resolveRunwayPavement({
      ...noColumnPcn,
      ...emptyGrossWeights,
      pcnRemarks: ['PCR VALUE: 459/F/D/X/T'],
    });

    expect(result.alsoPublished).toBeNull();
  });

  it('returns no classification when neither source published one — the majority case', () => {
    // Pavement strength is published for only 41.1% of the >=5000 ft set. "Not
    // published" is the ordinary answer and must not be confused with zero.
    const result = resolveRunwayPavement({
      ...noColumnPcn,
      ...emptyGrossWeights,
      grossWtSw: '50',
      grossWtDw: '100',
      pcnRemarks: [],
    });

    expect(result.classification).toBeNull();
    expect(result.alsoPublished).toBeNull();
    expect(result.grossWeight).not.toBeNull();
  });
});

describe('resolveRunwayPavement — remarks that are not classifications', () => {
  // All three are real REF_COL_NAME='PCN' remarks. Only one of them is even about
  // pavement, and none is a PCR value.
  it.each([
    ['PCN 18 DRG FROST CONDS.', 'GOV 05/23'],
    ['156 IS PCR.', 'GPH 18/36'],
    ['NSTD TPA SING ENG 500 FT AGL.', '5OK6 17/35'],
  ])('ignores %s (%s)', (remark) => {
    const result = resolveRunwayPavement({
      ...noColumnPcn,
      ...emptyGrossWeights,
      pcnRemarks: [remark],
    });

    expect(result.classification).toBeNull();
  });

  it('finds the PCR value among unrelated remarks on the same runway', () => {
    const result = resolveRunwayPavement({
      ...noColumnPcn,
      ...emptyGrossWeights,
      pcnRemarks: ['NSTD TPA SING ENG 500 FT AGL.', 'PCR VALUE: 459/F/D/X/T'],
    });

    expect(result.classification?.numericValue).toBe(459);
  });
});

describe('resolveRunwayPavement — gross weight capacity', () => {
  it('parses the four gear configurations, including decimal values', () => {
    const result = resolveRunwayPavement({
      ...noColumnPcn,
      grossWtSw: '50',
      grossWtDw: '43.5',
      grossWtDtw: '',
      grossWtDdtw: '595',
      pcnRemarks: [],
    });

    expect(result.grossWeight).toEqual({
      singleWheel: 50,
      dualWheel: 43.5,
      twoDualWheelsTandem: null,
      twoDualWheelsDoubleTandem: 595,
      unitConfirmed: false,
    });
  });

  it('marks the unit unconfirmed — no FAA document in the bundle states it (TL-31)', () => {
    const result = resolveRunwayPavement({
      ...noColumnPcn,
      ...emptyGrossWeights,
      grossWtDw: '100',
      pcnRemarks: [],
    });

    // A 1000x error in the permissive direction on a weight-bearing field puts an
    // aircraft on a ramp that cannot carry it. Until a primary source states the
    // unit, the value travels verbatim and carries this flag with it.
    expect(result.grossWeight?.unitConfirmed).toBe(false);
  });

  it('returns null gross weight when no gear configuration was published', () => {
    const result = resolveRunwayPavement({
      ...noColumnPcn,
      ...emptyGrossWeights,
      pcnRemarks: [],
    });

    expect(result.grossWeight).toBeNull();
  });
});
