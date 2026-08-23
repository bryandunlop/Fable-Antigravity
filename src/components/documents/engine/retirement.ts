// Retiring a bulletin whose content now lives in the manual (TL-46).
//
// Without this the bulletin list only ever grows: PB-014 is folded into the GOM,
// the manual is correct, and PB-014 sits in the library forever saying the same
// thing twice. Eventually nobody reads the list, which is how the pressure-release
// valve for an annual revision cycle stops working.
//
// Three things retirement deliberately is NOT:
//
//  - It is not deletion. A published bulletin is an acknowledged record of what
//    crews were told on a date, and it stays readable with its acks intact.
//  - It does not touch the revision. Retirement is a state change on the `Doc`;
//    the published revision and its content digest are never rewritten.
//  - It is not archiving. `isArchived` is somebody choosing to hide a document.
//    Retirement is the system recording that the content moved. Conflating them
//    would make un-archiving look like un-retiring.
import type { Doc, DocRevision } from '../types';
import { amendmentState, type AmendmentResolution } from './amendments';

export interface DocRetirement {
  /** The document that absorbed this one's content. */
  intoDocId: string;
  /** The published revision that absorbed it. */
  intoRevisionId: string;
  retiredOn: string;
}

export function retirementFor(doc: Doc): DocRetirement | undefined {
  return doc.retirement;
}

/**
 * Retire every bulletin whose amendments have ALL been folded in and published.
 *
 * Two conditions, both load-bearing:
 *
 *  - **All of them.** A bulletin amending two documents is still the operative
 *    instruction for the second until that one lands too.
 *  - **Folded in, not dismissed.** A dismissal says "this does not need folding
 *    into the manual" — which leaves the bulletin standing as live guidance.
 *    Retiring on a dismissal would silently withdraw the only correct wording.
 *
 * Returns the original array unchanged when nothing retires, so callers can rely
 * on referential equality to skip work.
 */
export function applyRetirements(
  docs: Doc[],
  revisions: DocRevision[],
  resolutions: AmendmentResolution[],
  todayIso: string,
): Doc[] {
  // Which documents declare amendments at all, and where each one landed.
  const landedBy = new Map<string, { docId: string; revisionId: string } | null>();

  for (const rev of revisions) {
    if (!rev.amendments?.length) continue;
    if (rev.status !== 'published') continue;

    let allLanded = true;
    let landing: { docId: string; revisionId: string } | null = null;

    for (const am of rev.amendments) {
      const state = amendmentState(am.id, resolutions, revisions);
      const resolution = resolutions.find((r) => r.amendmentId === am.id);
      // 'resolved' covers both a published fold-in and a dismissal; only the
      // former retires, so the resolution has to name a revision.
      if (state !== 'resolved' || !resolution?.resolvedInRevisionId) {
        allLanded = false;
        break;
      }
      // Record the last landing as the pointer. Where a bulletin amended several
      // documents any of them is a truthful "its content now lives here"; the
      // amendments themselves carry the full picture.
      landing = { docId: am.targetDocId, revisionId: resolution.resolvedInRevisionId };
    }

    const prev = landedBy.get(rev.docId);
    // A document with several published revisions retires only if every one of
    // them has landed — `null` from any revision vetoes.
    landedBy.set(rev.docId, allLanded && landing && prev !== null ? landing : null);
  }

  let changed = false;
  const next = docs.map((d) => {
    if (d.retirement) return d; // already retired — keep the original record
    const landing = landedBy.get(d.id);
    if (!landing) return d;
    changed = true;
    return {
      ...d,
      retirement: {
        intoDocId: landing.docId,
        intoRevisionId: landing.revisionId,
        retiredOn: todayIso,
      },
    };
  });

  return changed ? next : docs;
}
