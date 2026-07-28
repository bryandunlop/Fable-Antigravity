/**
 * Runway-level facts from NASR APT_RWY and APT_RWY_END.
 *
 * Two things here exist to stop a specific mistake:
 *
 *  1. Declared distances are four separate numbers, published per runway END and
 *     genuinely asymmetric. KTEB 01 is TORA 6997 / LDA 6159 — collapsing those
 *     into one "runway length" throws away 838 ft of landing distance. KASE 15
 *     takes off on 7006 while KASE 33 takes off on 8006. Only 26.6% of the
 *     >=5,000 ft set publishes them at all, so null is the ordinary answer, and
 *     it must never be backfilled from RWY_LEN.
 *
 *  2. NASR carries pseudo-runway rows on real airports — KASE has RWY_ID '00X'
 *     with RWY_LEN 0 — which will render as a nonsense runway if not filtered.
 *
 * See D45.
 */

export interface DeclaredDistances {
  /** TORA — take-off run available (NASR TKOF_RUN_AVBL). */
  toraFt: number | null;
  /** TODA — take-off distance available (NASR TKOF_DIST_AVBL). */
  todaFt: number | null;
  /** ASDA — accelerate-stop distance available (NASR ACLT_STOP_DIST_AVBL). */
  asdaFt: number | null;
  /** LDA — landing distance available (NASR LNDG_DIST_AVBL). */
  ldaFt: number | null;
}

export interface RawRunwayEndDistances {
  tkofRunAvbl: string;
  tkofDistAvbl: string;
  acltStopDistAvbl: string;
  lndgDistAvbl: string;
}

export interface RawRunwayIdentity {
  rwyId: string;
  rwyLen: string;
  surfaceTypeCode: string;
}

/** Surfaces a G650ER-class aircraft can be dispatched to without qualification. */
const HARD_SURFACES = new Set(['ASPH', 'CONC', 'PEM']);

const MIN_RUNWAY_LENGTH_FT = 5000;

function parseFeet(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDeclaredDistances(raw: RawRunwayEndDistances): DeclaredDistances | null {
  const toraFt = parseFeet(raw.tkofRunAvbl);
  const todaFt = parseFeet(raw.tkofDistAvbl);
  const asdaFt = parseFeet(raw.acltStopDistAvbl);
  const ldaFt = parseFeet(raw.lndgDistAvbl);

  if (toraFt === null && todaFt === null && asdaFt === null && ldaFt === null) {
    return null;
  }

  return { toraFt, todaFt, asdaFt, ldaFt };
}

/**
 * True when the runway belongs in a jet airport directory: long enough, hard all
 * the way through, and not one of NASR's zero-length placeholder rows.
 *
 * Composite surfaces are judged by their worst component, not their first — an
 * ASPH-GRVL runway is a gravel runway wearing an asphalt label as far as
 * dispatch is concerned. Both '-' and '/' occur as separators in the real data.
 */
export function isPublishableRunway(raw: RawRunwayIdentity): boolean {
  const lengthFt = parseFeet(raw.rwyLen);
  if (lengthFt === null || lengthFt < MIN_RUNWAY_LENGTH_FT) return false;

  const surface = raw.surfaceTypeCode.trim().toUpperCase();
  if (!surface) return false;

  const components = surface.split(/[-/]/).filter(Boolean);
  return components.length > 0 && components.every((component) => HARD_SURFACES.has(component));
}
