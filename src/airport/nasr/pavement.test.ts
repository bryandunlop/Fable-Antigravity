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
  it('converts the four gear configurations from thousands of pounds to pounds', () => {
    const result = resolveRunwayPavement({
      ...noColumnPcn,
      grossWtSw: '50',
      grossWtDw: '43.5',
      grossWtDtw: '',
      grossWtDdtw: '595',
      pcnRemarks: [],
    });

    // NASR publishes thousands of pounds — IAC 8 §5.1.4.3.11, and the FAA's own
    // NFDC display renders KTEB's SW=50 as "50,000 lbs" (TL-31).
    expect(result.grossWeight).toEqual({
      singleWheelLb: 50_000,
      dualWheelLb: 43_500,
      twoDualWheelsTandemLb: null,
      twoDualWheelsDoubleTandemLb: 595_000,
      unit: 'lb',
    });
  });

  it('reports KTEB dual-wheel as 100,000 lb, matching what the FAA publishes', () => {
    const result = resolveRunwayPavement({
      ...noColumnPcn,
      ...emptyGrossWeights,
      grossWtSw: '50',
      grossWtDw: '100',
      pcnRemarks: [],
    });

    // KTEB's own NASR remark reads "ACFT CAPABLE OF OPERATING ABV 100,000 POUNDS
    // MUST SUBMIT CERTIFICATION TO AMGR" — the same figure, in words.
    expect(result.grossWeight?.dualWheelLb).toBe(100_000);
  });

  it('leaves an unpublished gear configuration null — a blank is not a zero', () => {
    const result = resolveRunwayPavement({
      ...noColumnPcn,
      ...emptyGrossWeights,
      grossWtDw: '210',
      pcnRemarks: [],
    });

    // IAC 8: "Blank spaces after S or D indicate that the runway has weight
    // bearing capacity ... but definite figures are not available." KJFK's
    // single-wheel field is blank on a runway that plainly accepts them, so a
    // null must never read as "cannot accept".
    expect(result.grossWeight?.singleWheelLb).toBeNull();
    expect(result.grossWeight?.dualWheelLb).toBe(210_000);
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
