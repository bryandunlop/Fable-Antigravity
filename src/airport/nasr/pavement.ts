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
  singleWheel: number | null;
  dualWheel: number | null;
  twoDualWheelsTandem: number | null;
  twoDualWheelsDoubleTandem: number | null;
  /**
   * Always false, and deliberately not optional.
   *
   * No FAA document in the 28-day bundle states the unit for GROSS_WT_*:
   * APT_DATA_LAYOUT gives only a prose field name and APT_CSV_DATA_STRUCTURE
   * gives only NUMBER(5,1). The value distribution (261 distinct values, 30-250
   * typical, 595 max) implies thousands of pounds, but that is an inference and
   * a 1000x error here in the permissive direction puts an aircraft on a ramp
   * that cannot carry it.
   *
   * So the number travels verbatim, carrying this flag, and callers must not
   * scale it, label it with a unit, or compare it against aircraft weight.
   * Tracked as TL-31; promote it by reading a primary source, not by reasoning
   * from the distribution.
   */
  unitConfirmed: false;
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

function resolveGrossWeight(raw: RawRunwayPavement): GrossWeightCapacity | null {
  const singleWheel = parseWeight(raw.grossWtSw);
  const dualWheel = parseWeight(raw.grossWtDw);
  const twoDualWheelsTandem = parseWeight(raw.grossWtDtw);
  const twoDualWheelsDoubleTandem = parseWeight(raw.grossWtDdtw);

  const published =
    singleWheel !== null ||
    dualWheel !== null ||
    twoDualWheelsTandem !== null ||
    twoDualWheelsDoubleTandem !== null;
  if (!published) return null;

  return {
    singleWheel,
    dualWheel,
    twoDualWheelsTandem,
    twoDualWheelsDoubleTandem,
    unitConfirmed: false,
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
