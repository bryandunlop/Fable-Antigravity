import type { PrintField, PrintSection } from './printRecord';
import type { WorkCard } from '../types';
import { formatReferences } from '../engine/workCardReferences';

/**
 * The work card's troubleshooting references (LG-98/99) as printed-CRS content.
 *
 * WHY THIS IS A HELPER AND NOT THREE INLINE LITERALS. There is exactly one CRS renderer
 * (`printSignedRecord`) but **three** screens that hand-build their own `sections[]` array against
 * it: `pages/WorkCardDetail.tsx` (the work-card CRS), `pages/Releases.tsx` (the release list) and
 * `pages/AircraftDetail.tsx` (the per-tail releases tab). They have already drifted once — the
 * TL-16/DM-3 fix that put the frozen certifying-tech name on the printed release landed in
 * `Releases` and never reached `AircraftDetail`, and nothing caught it because no test in the app
 * had ever asserted printed content. Adding a fourth hand-written copy of these two rows would
 * deepen exactly that fork, so the CONTENT lives here and each screen only chooses where to splice
 * it. `pages/crsPrintContent.test.tsx` pins all three.
 *
 * Both fields are hand-entered (D22) — no CAMP sourcing anywhere on this path.
 *
 * NOTE ON FRESHNESS. These read the live work card, exactly as the printed Steps / Parts / Labor
 * blocks already do. That is safe today because a card is locked at `COMPLETED`, which is the same
 * moment its release is signed — but it is a property of the completion lock, not of the print
 * path. If post-completion editing is ever unlocked, every one of those blocks starts repainting
 * signed releases, and the fix belongs to all of them at once rather than to these two rows.
 */
export function workCardReferenceFields(
  card?: Pick<WorkCard, 'references' | 'ammReference' | 'cmcFaultCodes'>,
): PrintField[] {
  const fields: PrintField[] = [];
  // D68 — reads BOTH shapes via `cardReferences`: a release signed before D68 points at a card
  // carrying the single `ammReference` string, and blanking it here would change what an already
  // printed CRS prints.
  const refs = card ? formatReferences(card) : '';
  if (refs) fields.push({ label: 'Worked to', value: refs });
  const codes = (card?.cmcFaultCodes ?? []).map(c => c.trim()).filter(Boolean);
  if (codes.length) fields.push({ label: 'CMC fault codes', value: codes.join(', ') });
  return fields;
}

/**
 * The same content as a spliceable section, so the three call sites stay structurally identical.
 * Empty when the card carries neither reference (or when there is no card behind the release at
 * all, e.g. a defect rectification or an (M)/placard discharge) — a CRS should not print a heading
 * over two em-dashes.
 */
export function workCardReferenceSections(
  card?: Pick<WorkCard, 'references' | 'ammReference' | 'cmcFaultCodes'>,
): PrintSection[] {
  const fields = workCardReferenceFields(card);
  return fields.length ? [{ heading: 'Troubleshooting references', fields }] : [];
}
