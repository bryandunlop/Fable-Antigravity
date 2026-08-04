import type { WorkCard, WorkCardReference } from '../types';

/**
 * The documents a work card was worked to (D68).
 *
 * Reads BOTH shapes on purpose. Cards written before D68 carry a single `ammReference` string; new
 * ones carry `references`. A signed `MaintenanceRelease` points at its card by `linkedWorkCardId`
 * and the CRS print reads through to it, so dropping the old field would blank the reference on a
 * release that already printed it. Nothing writes `ammReference` any more — this is the only place
 * that still reads it.
 */
export function cardReferences(
  card: Pick<WorkCard, 'references' | 'ammReference'>,
): WorkCardReference[] {
  const list = (card.references ?? []).filter(r => r.ref.trim());
  if (list.length) return list;
  const legacy = card.ammReference?.trim();
  return legacy ? [{ id: 'legacy-amm', ref: legacy }] : [];
}

/** One-line rendering for a list row or a print header. Empty string when there is nothing. */
export function formatReferences(card: Pick<WorkCard, 'references' | 'ammReference'>): string {
  return cardReferences(card).map(r => r.ref.trim()).join(' · ');
}

/**
 * The reference prefix for CAMP's `CorrectiveActionNotes` (D68).
 *
 * CAMP's discrepancy object has **no manual-reference field** — not on the discrepancy, not on the
 * work-order line, which is read-only anyway (`ref-camp-discrepancy-writable-fields`). Its only
 * writable free-text carriers are `Description`, `CorrectiveActionNotes` and `Note`, so a reference
 * reaches CAMP as prose or not at all. Nothing here invents a field.
 *
 * Deliberately NOT mapped to CAMP's `FaultCode`, which is a two-value enum — `FAULT IDENTIFIED` /
 * `NO FAULT FOUND` — whose name invites exactly that mistake.
 */
export function correctiveActionNotes(
  card: Pick<WorkCard, 'references' | 'ammReference'>,
  workPerformed: string,
): string {
  const refs = cardReferences(card).map(r => r.ref.trim());
  const work = workPerformed.trim();
  if (!refs.length) return work;
  const prefix = refs.join('; ');
  return work ? `${prefix} — ${work}` : prefix;
}
