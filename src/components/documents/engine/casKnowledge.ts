// D60 — the per-fleet CAS catalog, derived from the tribal-knowledge class.
//
// WHY IT LIVES HERE AND NOT IN TECH-LOG STATE. The two stores have opposite
// disciplines on a version bump: the documents loader MIGRATES FORWARD
// (engine/migrations.ts), while tech-log WIPES AND RE-SEEDS on any DATA_VERSION
// mismatch (tech-log/persistence.ts). Curated knowledge is the operator's own
// writing — a fleet's accumulated "what this message actually means" — so it has
// to sit on the side that survives the next slice's schema bump.
//
// Pure derivation, no React and no storage: the catalog is never a stored list,
// it is a projection of whatever tribal-knowledge entries are published right
// now. Publishing a new entry makes it appear in the picker with no sync step.
//
// D65 — WHY EVERY LOOKUP HERE STARTS FROM A REVISION. The CAS facts hang off
// `DocRevision`, not off the `Doc` identity row, and this file reaches them only
// through `currentRevision()` (engine/revisions.ts), which returns a revision with
// `status === 'published'` or nothing. So "the picker only ever offers published
// knowledge" is not a filter this file applies and a future edit could drop — the
// unpublished value has no path into the catalog at all. That matters because the
// catalog feeds the intake form for a signed airworthiness record and the colour it
// offers is what the FIR safety fast path reads.
import type { AircraftType, CasColor } from '../../tech-log/types';
import type { Doc, DocRevision } from '../types';
import { currentRevision } from './revisions';

export const CAS_KNOWLEDGE_CLASS_ID = 'tribal-knowledge';

/** How many rows a picker shows at once — mirrors the MEL picker's cap
 *  (`DeferralCreatePanel`), which is the in-module precedent for a type-scoped
 *  filtered list. */
export const CAS_PICKER_LIMIT = 25;

/** One offerable CAS message: the curated fact plus the identity of the entry
 *  that explains it, so a picker can deep-link "what maintenance knows". */
export interface CasCatalogEntry {
  docId: string;
  revisionId: string;
  title: string;
  casMessage: string;
  casColor: CasColor;
  /** Normalized to `[]` when the entry curates none. */
  cmcCodes: string[];
  fleetTypes: AircraftType[];
}

/** A structured CAS entry (has `casMeta`) as opposed to a freeform article.
 *  Takes the REVISION: which kind an entry is can change from one revision to the
 *  next, and only the published answer counts. */
export function isCasEntry(rev: DocRevision): boolean {
  return !!rev.casMeta;
}

/** Fleet applicability as PUBLISHED. A revision with no `fleetTypes` is library
 *  content, not fleet knowledge, and is never offered under a fleet filter. */
export function appliesToFleet(rev: DocRevision, fleetType: AircraftType): boolean {
  return !!rev.fleetTypes?.includes(fleetType);
}

/** Tribal-knowledge entries for one fleet type that are live right now: correct
 *  class, not archived, and carrying a published revision that names the type.
 *
 *  The applicability test runs against the PUBLISHED revision, so re-scoping an
 *  entry to another fleet only takes effect when that edit publishes — the same
 *  boundary the message and colour get. */
function liveFleetEntries(
  docs: Doc[],
  revisions: DocRevision[],
  fleetType: AircraftType,
): { doc: Doc; rev: DocRevision }[] {
  const out: { doc: Doc; rev: DocRevision }[] = [];
  for (const doc of docs) {
    if (doc.classId !== CAS_KNOWLEDGE_CLASS_ID || doc.isArchived) continue;
    // A draft a curator is still writing is not knowledge yet, and a withdrawn or
    // superseded revision is not what the fleet is told to rely on today.
    const rev = currentRevision(doc.id, revisions);
    if (!rev) continue;
    if (!appliesToFleet(rev, fleetType)) continue;
    out.push({ doc, rev });
  }
  return out;
}

/**
 * The CAS messages a tail of this fleet type can be offered at intake.
 *
 * Ordered by message CASE-INSENSITIVELY, then by `docId`. The case-folding is not cosmetic: every
 * lookup in this file matches messages case-insensitively, so a raw `localeCompare` put
 * `r eng chip` and `R ENG CHIP` — the same annunciation as far as any caller is concerned — in an
 * order decided by locale tertiary weighting, and the `docId` tie-break below was then unreachable
 * for exactly the case `catalogEntryForMessage` documents it for. Fold first, and the stated rule
 * ("the earliest-curated entry wins") is the rule that actually runs.
 */
export function casCatalog(docs: Doc[], revisions: DocRevision[], fleetType: AircraftType): CasCatalogEntry[] {
  return liveFleetEntries(docs, revisions, fleetType)
    .filter(({ rev }) => isCasEntry(rev))
    .map(({ doc, rev }) => ({
      docId: doc.id,
      revisionId: rev.id,
      title: doc.title,
      casMessage: rev.casMeta!.casMessage,
      casColor: rev.casMeta!.casColor,
      cmcCodes: rev.casMeta!.cmcCodes ?? [],
      fleetTypes: rev.fleetTypes ?? [],
    }))
    .sort(
      (a, b) =>
        a.casMessage.trim().toLowerCase().localeCompare(b.casMessage.trim().toLowerCase()) ||
        a.docId.localeCompare(b.docId),
    );
}

/** The freeform reference articles for a fleet type — everything tagged for the
 *  type that is NOT a single-CAS entry (startup stacks, nuisance notes). */
export function fleetArticles(docs: Doc[], revisions: DocRevision[], fleetType: AircraftType): Doc[] {
  return liveFleetEntries(docs, revisions, fleetType)
    .filter(({ rev }) => !isCasEntry(rev))
    .map(({ doc }) => doc)
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || a.title.localeCompare(b.title));
}

/** Substring search over message, entry title and curated codes, capped like the
 *  MEL picker. An empty query returns the head of the list, not nothing. */
export function matchCasCatalog(
  entries: CasCatalogEntry[],
  query: string,
  limit: number = CAS_PICKER_LIMIT,
): CasCatalogEntry[] {
  const q = query.trim().toLowerCase();
  return entries
    .filter(
      (e) =>
        !q ||
        e.casMessage.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.cmcCodes.some((c) => c.toLowerCase().includes(q)),
    )
    .slice(0, limit);
}

/**
 * EVERY catalog entry curating a typed CAS message, in catalog order.
 *
 * **A CAS message is not a key here, and deliberately so.** Nothing stops two curators from writing
 * separate entries for `GEAR UNSAFE` on the same fleet — the class is uncontrolled direct-publish by
 * design (D60), so there is no approval step where a duplicate would be caught, and silently
 * dropping one would hide a curator's work behind an entry they cannot see is shadowing it. The
 * catalog therefore keeps both, the picker shows both, and callers that need a single answer say so
 * explicitly by calling `catalogEntryForMessage` and accepting its documented tie-break.
 *
 * Free text stays legal regardless (the catalog will be incomplete for a long time) — this is only
 * how a form knows whether it can offer "what maintenance knows about this message".
 */
export function catalogEntriesForMessage(entries: CasCatalogEntry[], message: string): CasCatalogEntry[] {
  const m = message.trim().toLowerCase();
  if (!m) return [];
  return entries.filter((e) => e.casMessage.trim().toLowerCase() === m);
}

/**
 * The single entry a typed CAS message resolves to, if any.
 *
 * **Tie-break, stated rather than inherited:** when more than one entry curates the message this
 * returns the one `casCatalog` orders first, which — since the sort's second key is `docId` — is the
 * LOWEST doc id, i.e. the earliest-curated entry. That is a real choice, not an accident of `find`:
 * the oldest entry is the one the fleet has had longest and is likeliest to have been linked to from
 * elsewhere. It is deterministic for a given catalog and pinned by test.
 *
 * A caller that would be MISLED by picking one of several — a deep link, or adopting a curated
 * colour onto a signed record — should use `catalogEntriesForMessage` and handle the plural case
 * rather than lean on this tie-break.
 */
export function catalogEntryForMessage(entries: CasCatalogEntry[], message: string): CasCatalogEntry | undefined {
  return catalogEntriesForMessage(entries, message)[0];
}

/**
 * The CAS messages this catalog curates more than once, lower-cased and sorted.
 *
 * Duplication is a curation defect, not a data-model feature: two entries for one annunciation mean
 * two places to look and a real chance they disagree on the colour. The engine will not resolve it
 * silently, so this is how a guard (or a future curator-facing warning) can surface it.
 */
export function duplicateCasMessages(entries: CasCatalogEntry[]): string[] {
  const seen = new Map<string, number>();
  for (const e of entries) {
    const k = e.casMessage.trim().toLowerCase();
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k).sort();
}
