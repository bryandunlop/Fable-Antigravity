// Amendments — how one document says something about another.
//
// Until now a document could only supersede its own prior revisions; no document
// could say anything about a different document (TL-46). That gap is why a
// bulletin and the manual it contradicts can both read "current" while
// disagreeing, and why an annual revision has no list of what to fold in.
//
// The model, in one line: a bulletin's PUBLISHED revision declares what it
// amends, and that declaration rides the four-eyes path as ordinary revision
// content. The manual is never edited because a bulletin exists — its published
// bytes and its content digest are untouched. An amendment is a pointer beside
// the manual, never a mutation of it.
import type { DocRevision, DocSection } from '../types';

/** One document's claim that it changes part of another. Lives on the amending revision. */
export interface DocAmendment {
  /** Stable within the revision: `<revisionId>::am<n>`. */
  id: string;
  /** The document being amended. */
  targetDocId: string;
  /** The section it lands at. Absent means document-wide — it shows in the header strip and sits at no section. */
  targetSectionId?: string;
  /** One line: what actually changed. Shown in the inbox row. */
  summary: string;
  /**
   * The section OF THE AMENDING BULLETIN that carries the replacement wording.
   *
   * A pointer, never a copy. The governing text a crew reads is the bulletin's own
   * published, four-eyes-approved, hash-covered content — resolved from its revision
   * at render time. Copying the words onto the amendment would create a second
   * artifact to keep in step, which is the drift this feature exists to remove.
   *
   * Absent means the bulletin amends the section without restating it (a procedural
   * note, a scope change). The manual's own text still governs and the chip is
   * informational.
   */
  replacementSectionId?: string;
}

/**
 * Something outside myGFO that says a document needs attention — today, a Nimbl
 * regulatory-watch alert (D93: Nimbl keeps the reg watch, we take day-to-day).
 *
 * It is NOT a DocAmendment: nothing has been published, nothing governs yet. It
 * is a piece of work, which is why it shares the inbox and not the reader.
 */
export interface ExternalAlert {
  id: string;
  /** Who raised it — 'Nimbl reg watch'. */
  origin: string;
  title: string;
  receivedOn: string;
  targetDocIds: string[];
  summary: string;
  ownerUserId?: string;
}

/**
 * The record that an amendment or alert has been dealt with.
 *
 * Two shapes, deliberately one type. Folding in carries the manual revision that
 * absorbed it (`resolvedInRevisionId`). Dismissing — "Nimbl authors the IOPM, not
 * ours" — carries an empty revision id and a `note` saying why. A dismissal must
 * leave a reason behind: an item vanishing from the queue with no record is the
 * failure this whole feature exists to prevent.
 */
export interface AmendmentResolution {
  amendmentId: string;
  resolvedInRevisionId: string;
  resolvedBy: string;
  resolvedOn: string;
  note?: string;
}

/** An amendment paired with the revision that declared it. */
export interface AmendmentInForce extends DocAmendment {
  sourceDocId: string;
  sourceRevisionId: string;
  /** When the amending revision took effect — the clock the inbox ages from. */
  effectiveDate: string;
}

/**
 * Only a PUBLISHED revision can amend anything.
 *
 * A draft or pending-approval bulletin has not been through four-eyes, so letting
 * it govern would be an unsigned publish path into a controlled manual. A
 * superseded revision is equally excluded — whatever superseded it carries its own
 * amendments, and honouring both would apply the change twice.
 */
function governs(rev: DocRevision): boolean {
  return rev.status === 'published';
}

/** Where an amendment has got to. */
export type AmendmentState = 'open' | 'folding' | 'resolved';

/**
 * Folding in is not finished until the draft that absorbs it PUBLISHES.
 *
 * Treating the click as the end would drop the amendment from the manual the
 * moment someone opened a draft — telling a crew the wording is fixed while the
 * section they read still says the old thing. So a fold-in that names a revision
 * only resolves once that revision is published; until then the amendment stays
 * in force and the inbox row reads `folding`.
 *
 * A DISMISSAL names no revision and resolves immediately — there is nothing to
 * wait for. It carries its reason instead (see `AmendmentResolution`).
 */
export function amendmentState(
  id: string,
  resolutions: AmendmentResolution[],
  revisions: DocRevision[],
): AmendmentState {
  const r = resolutions.find((x) => x.amendmentId === id);
  if (!r) return 'open';
  if (!r.resolvedInRevisionId) return 'resolved';
  const target = revisions.find((rev) => rev.id === r.resolvedInRevisionId);
  // A resolution naming a revision that does not exist must never hide a live
  // amendment — a stale record should fail open, not silently suppress.
  if (!target) return 'open';
  return governs(target) ? 'resolved' : 'folding';
}

function isResolvedIn(
  id: string,
  resolutions: AmendmentResolution[],
  revisions: DocRevision[],
): boolean {
  return amendmentState(id, resolutions, revisions) === 'resolved';
}

export function isResolved(
  id: string,
  resolutions: AmendmentResolution[],
  revisions: DocRevision[] = [],
): boolean {
  return isResolvedIn(id, resolutions, revisions);
}

export function resolutionFor(
  id: string,
  resolutions: AmendmentResolution[],
): AmendmentResolution | undefined {
  return resolutions.find((r) => r.amendmentId === id);
}

/** Every unresolved amendment in force against `targetDocId`. */
export function amendmentsInForce(
  targetDocId: string,
  revisions: DocRevision[],
  resolutions: AmendmentResolution[],
): AmendmentInForce[] {
  const out: AmendmentInForce[] = [];
  for (const rev of revisions) {
    if (!governs(rev)) continue;
    for (const am of rev.amendments ?? []) {
      if (am.targetDocId !== targetDocId) continue;
      if (isResolvedIn(am.id, resolutions, revisions)) continue;
      out.push({
        ...am,
        sourceDocId: rev.docId,
        sourceRevisionId: rev.id,
        effectiveDate: rev.effectiveDate,
      });
    }
  }
  return out;
}

/**
 * The amendments that sit at one section.
 *
 * A document-wide amendment (no `targetSectionId`) deliberately matches nothing
 * here — it has no anchor to attach to and belongs in the header strip instead.
 */
export function amendmentsForSection(
  sectionId: string,
  revisions: DocRevision[],
  resolutions: AmendmentResolution[],
): AmendmentInForce[] {
  const docId = sectionId.split('::')[0];
  return amendmentsInForce(docId, revisions, resolutions).filter(
    (a) => a.targetSectionId === sectionId,
  );
}

/**
 * Whole days an item has been outstanding, from the date it took effect.
 *
 * Both operands are parsed at UTC midnight and compared with UTC methods — the
 * convention `engine/review.ts` already uses. Parsing a date-only string as local
 * midnight on one side and UTC on the other is how a day-early read appears west
 * of Greenwich (LG-118), and this number is read as a compliance signal.
 *
 * An item whose effective date is in the future is 0, not negative: an approved
 * revision waiting for its date has not started ageing.
 */
export function daysOutstanding(effectiveDate: string, todayIso: string): number {
  const from = Date.parse(`${effectiveDate}T00:00:00Z`);
  const to = Date.parse(`${todayIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/**
 * The bulletin's own section that governs in place of the manual's.
 *
 * Resolved live from the amending revision — and that is correct rather than a
 * violation of the freeze rule, because the bulletin's revision is itself
 * published and immutable. The content cannot change under the reader; only a NEW
 * bulletin revision, through four-eyes, can change what governs.
 */
export function replacementSection(
  am: AmendmentInForce,
  revisions: DocRevision[],
): DocSection | undefined {
  if (!am.replacementSectionId) return undefined;
  const source = revisions.find((r) => r.id === am.sourceRevisionId);
  if (!source || !governs(source)) return undefined;
  return source.sections.find((sec) => sec.id === am.replacementSectionId);
}

/** One row of the amendment inbox, whichever source it came from. */
export interface OutstandingItem {
  id: string;
  source: 'bulletin' | 'external';
  /** For a bulletin, its doc id (PB-014). For an alert, its origin ('Nimbl reg watch'). */
  sourceDocId: string;
  title: string;
  summary: string;
  targetDocIds: string[];
  targetSectionId?: string;
  /** Effective date for a bulletin; received date for an alert. */
  since: string;
  daysOutstanding: number;
  ownerUserId?: string;
  state: AmendmentState;
  /** Set while `state` is 'folding' — the unpublished revision absorbing it. */
  foldingIntoRevisionId?: string;
}

/**
 * The inbox: one queue of what the manuals still owe, fed from both sides.
 *
 * Bulletins we published and alerts Nimbl raised answer the same question — *what
 * has the manual not yet absorbed?* — so they share a queue rather than living in
 * two places that each look empty.
 *
 * Sorted oldest first. Ageing is the point: "104 days outstanding" is the sentence
 * that ends an annual revision cycle, and burying it under a newer item would
 * defeat the feature.
 */
export function outstandingWork(
  revisions: DocRevision[],
  alerts: ExternalAlert[],
  resolutions: AmendmentResolution[],
  todayIso: string,
): OutstandingItem[] {
  const items: OutstandingItem[] = [];

  for (const rev of revisions) {
    if (!governs(rev)) continue;
    for (const am of rev.amendments ?? []) {
      if (isResolvedIn(am.id, resolutions, revisions)) continue;
      items.push({
        id: am.id,
        source: 'bulletin',
        sourceDocId: rev.docId,
        title: rev.docId,
        summary: am.summary,
        targetDocIds: [am.targetDocId],
        targetSectionId: am.targetSectionId,
        since: rev.effectiveDate,
        daysOutstanding: daysOutstanding(rev.effectiveDate, todayIso),
        state: amendmentState(am.id, resolutions, revisions),
        foldingIntoRevisionId: resolutions.find((r) => r.amendmentId === am.id)?.resolvedInRevisionId || undefined,
      });
    }
  }

  for (const al of alerts) {
    if (isResolvedIn(al.id, resolutions, revisions)) continue;
    items.push({
      id: al.id,
      source: 'external',
      sourceDocId: al.origin,
      title: al.title,
      summary: al.summary,
      // An alert against several documents stays ONE row. Splitting it per target
      // would make the reg watch look noisier than it is and invite the same item
      // to be dismissed three times.
      targetDocIds: al.targetDocIds,
      since: al.receivedOn,
      daysOutstanding: daysOutstanding(al.receivedOn, todayIso),
      ownerUserId: al.ownerUserId,
      state: amendmentState(al.id, resolutions, revisions),
      foldingIntoRevisionId: resolutions.find((r) => r.amendmentId === al.id)?.resolvedInRevisionId || undefined,
    });
  }

  return items.sort((a, b) => b.daysOutstanding - a.daysOutstanding || a.id.localeCompare(b.id));
}
