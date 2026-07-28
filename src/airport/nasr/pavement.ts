/**
 * Resolves a runway's published pavement strength from the three places the FAA
 * actually puts it.
 *
 * NASR publishes pavement strength inconsistently, and the obvious column is the
 * wrong one to read alone. Measured against the 09 Jul 2026 cycle, across the
 * 2,610 airports with a >=5,000 ft runway:
 *
 *   - PCN column only ......... 519 airports
 *   - PCR remark only ......... 510 airports
 *   - both .................... 44 airports
 *   - union ................... 1,073 (41.1%)
 *
 * The two sources are near-disjoint: the FAA is migrating pavement strength out
 * of APT_RWY.PCN and into a free-text APT_RMK remark. Reading only the column
 * misses roughly half of everything published — KTEB and KASE both carry PCN=''
 * with the real value in a remark.
 *
 * Gross weight (GROSS_WT_*) is a separate, better-populated axis (50.5%) and is
 * what US ramp limits actually key off. It is NOT a classification and is never
 * folded into one.
 *
 * See D45 and ref-faa-nasr-airport-data.
 */

/** Where a classification came from. The two disagree often enough to matter. */
export type PavementClassificationSource = 'pcr-remark' | 'pcn-column';

export interface PavementClassification {
  /** The five-part value as published, e.g. '459/F/D/X/T'. */
  raw: string;
  /** The leading numeric strength. */
  numericValue: number;
  /** R = rigid, F = flexible. */
  pavementTypeCode: string;
  /** A (high) through D (ultra low) subgrade strength category. */
  subgradeStrengthCode: string;
  /** W (high) through Z (very low) allowable tire pressure. */
  tirePressureCode: string;
  /** T = technical evaluation, U = using-aircraft experience. */
  evaluationMethodCode: string;
  source: PavementClassificationSource;
}

export interface GrossWeightCapacity {
  /**
   * All four are in **POUNDS**, already scaled from the NASR value.
   *
   * NASR publishes these in thousands of pounds — confirmed from primary sources
   * (TL-31, ref-pavement-strength-reporting): IAC 8 §5.1.4.3.11 states "A weight
   * bearing capacity in thousands of pounds shall be shown for each runway",
   * FAA Form 5010-3 prints the fields as "(IN THSDS)", and the FAA's own NFDC
   * display renders KTEB's NASR row SW=50/DW=100 as 50,000 lbs / 100,000 lbs.
   *
   * Scaling happens here, once, at the boundary — so nothing downstream ever
   * holds an unlabelled number that could be read as pounds.
   */
  singleWheelLb: number | null;
  dualWheelLb: number | null;
  twoDualWheelsTandemLb: number | null;
  twoDualWheelsDoubleTandemLb: number | null;
  /**
   * Null means the FAA did not publish a figure — NEVER that the runway cannot
   * take that gear. IAC 8 §5.1.4.3.11: "Blank spaces after S or D indicate that
   * the runway has weight bearing capacity to sustain aircraft with the type
   * landing gear configuration shown, but definite figures are not available."
   * KJFK's single-wheel field is blank on a runway that plainly accepts them.
   */
  readonly unit: 'lb';
}

export interface RunwayPavement {
  /** The published classification, preferring the PCR remark. Null is the majority answer. */
  classification: PavementClassification | null;
  /** The other source's value, when both published one and they can disagree. */
  alsoPublished: PavementClassification | null;
  grossWeight: GrossWeightCapacity | null;
}

export interface RawRunwayPavement {
  /** APT_RWY.PCN — the numeric part only; the other four codes are separate columns. */
  pcn: string;
  pavementTypeCode: string;
  subgradeStrengthCode: string;
  tirePresCode: string;
  dtrmMethodCode: string;
  grossWtSw: string;
  grossWtDw: string;
  grossWtDtw: string;
  grossWtDdtw: string;
  /**
   * REMARK texts from APT_RMK rows where REF_COL_NAME='PCN', TAB_NAME='RUNWAY'
   * and ELEMENT matches this runway's RWY_ID. Most such remarks are not
   * classifications at all — real examples include 'PCN 18 DRG FROST CONDS.'
   * and 'NSTD TPA SING ENG 500 FT AGL.'
   */
  pcnRemarks: readonly string[];
}

/**
 * Matches only the canonical published form. All 1,096 PCR remarks in the
 * 09 Jul 2026 cycle match this exactly — zero failures — so a near-miss is a
 * remark about something else, not a value to salvage.
 */
const PCR_REMARK = /PCR VALUE:\s*(\d+)\/([RF])\/([ABCD])\/([WXYZ])\/([TU])/i;

function parsePcrRemark(remark: string): PavementClassification | null {
  const match = PCR_REMARK.exec(remark);
  if (!match) return null;

  const [, value, pavement, subgrade, tire, method] = match;
  return {
    raw: `${value}/${pavement}/${subgrade}/${tire}/${method}`.toUpperCase(),
    numericValue: Number(value),
    pavementTypeCode: pavement.toUpperCase(),
    subgradeStrengthCode: subgrade.toUpperCase(),
    tirePressureCode: tire.toUpperCase(),
    evaluationMethodCode: method.toUpperCase(),
    source: 'pcr-remark',
  };
}

function parsePcnColumns(raw: RawRunwayPavement): PavementClassification | null {
  const value = raw.pcn.trim();
  if (!value) return null;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;

  const pavement = raw.pavementTypeCode.trim().toUpperCase();
  const subgrade = raw.subgradeStrengthCode.trim().toUpperCase();
  const tire = raw.tirePresCode.trim().toUpperCase();
  const method = raw.dtrmMethodCode.trim().toUpperCase();

  return {
    raw: `${value}/${pavement}/${subgrade}/${tire}/${method}`,
    numericValue,
    pavementTypeCode: pavement,
    subgradeStrengthCode: subgrade,
    tirePressureCode: tire,
    evaluationMethodCode: method,
    source: 'pcn-column',
  };
}

function parseWeight(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** NASR publishes thousands of pounds; convert at the boundary, once. */
const THOUSANDS_OF_POUNDS = 1000;

function parseWeightLb(value: string): number | null {
  const thousands = parseWeight(value);
  return thousands === null ? null : thousands * THOUSANDS_OF_POUNDS;
}

function resolveGrossWeight(raw: RawRunwayPavement): GrossWeightCapacity | null {
  const singleWheelLb = parseWeightLb(raw.grossWtSw);
  const dualWheelLb = parseWeightLb(raw.grossWtDw);
  const twoDualWheelsTandemLb = parseWeightLb(raw.grossWtDtw);
  const twoDualWheelsDoubleTandemLb = parseWeightLb(raw.grossWtDdtw);

  const published =
    singleWheelLb !== null ||
    dualWheelLb !== null ||
    twoDualWheelsTandemLb !== null ||
    twoDualWheelsDoubleTandemLb !== null;
  if (!published) return null;

  return {
    singleWheelLb,
    dualWheelLb,
    twoDualWheelsTandemLb,
    twoDualWheelsDoubleTandemLb,
    unit: 'lb',
  };
}

export function resolveRunwayPavement(raw: RawRunwayPavement): RunwayPavement {
  const fromRemark = raw.pcnRemarks.reduce<PavementClassification | null>(
    (found, remark) => found ?? parsePcrRemark(remark),
    null,
  );
  const fromColumn = parsePcnColumns(raw);

  // The PCR remark wins because it is where the FAA is moving this data, but the
  // column is retained rather than discarded: GFK 09R/27L really does publish
  // 10/R/C/W/T in the column and 150/R/C/W/T in the remark, and picking one
  // silently would put a number on screen that nobody chose.
  const classification = fromRemark ?? fromColumn;
  const alsoPublished = fromRemark && fromColumn ? fromColumn : null;

  return {
    classification,
    alsoPublished,
    grossWeight: resolveGrossWeight(raw),
  };
}
