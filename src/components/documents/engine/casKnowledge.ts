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

/** A structured CAS entry (has `casMeta`) as opposed to a freeform article. */
export function isCasEntry(doc: Doc): boolean {
  return !!doc.casMeta;
}

/** Doc-level fleet applicability. An entry with no `fleetTypes` is library
 *  content, not fleet knowledge, and is never offered under a fleet filter. */
export function appliesToFleet(doc: Doc, fleetType: AircraftType): boolean {
  return !!doc.fleetTypes?.includes(fleetType);
}

/** Tribal-knowledge entries for one fleet type that are live right now:
 *  correct class, not archived, and carrying a published revision. */
function liveFleetEntries(
  docs: Doc[],
  revisions: DocRevision[],
  fleetType: AircraftType,
): { doc: Doc; rev: DocRevision }[] {
  const out: { doc: Doc; rev: DocRevision }[] = [];
  for (const doc of docs) {
    if (doc.classId !== CAS_KNOWLEDGE_CLASS_ID || doc.isArchived) continue;
    if (!appliesToFleet(doc, fleetType)) continue;
    const rev = currentRevision(doc.id, revisions);
    // A draft a curator is still writing is not knowledge yet, and a withdrawn or
    // superseded revision is not what the fleet is told to rely on today.
    if (!rev) continue;
    out.push({ doc, rev });
  }
  return out;
}

/**
 * The CAS messages a tail of this fleet type can be offered at intake, sorted by
 * message so the order does not depend on doc creation order.
 */
export function casCatalog(docs: Doc[], revisions: DocRevision[], fleetType: AircraftType): CasCatalogEntry[] {
  return liveFleetEntries(docs, revisions, fleetType)
    .filter(({ doc }) => isCasEntry(doc))
    .map(({ doc, rev }) => ({
      docId: doc.id,
      revisionId: rev.id,
      title: doc.title,
      casMessage: doc.casMeta!.casMessage,
      casColor: doc.casMeta!.casColor,
      cmcCodes: doc.casMeta!.cmcCodes ?? [],
      fleetTypes: doc.fleetTypes ?? [],
    }))
    .sort((a, b) => a.casMessage.localeCompare(b.casMessage) || a.docId.localeCompare(b.docId));
}

/** The freeform reference articles for a fleet type — everything tagged for the
 *  type that is NOT a single-CAS entry (startup stacks, nuisance notes). */
export function fleetArticles(docs: Doc[], revisions: DocRevision[], fleetType: AircraftType): Doc[] {
  return liveFleetEntries(docs, revisions, fleetType)
    .filter(({ doc }) => !isCasEntry(doc))
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
 * The catalog entry a typed CAS message corresponds to, if any. Free text stays
 * legal (the catalog will be incomplete for a long time) — this is only how the
 * form knows whether it can offer "what maintenance knows about this message".
 */
export function catalogEntryForMessage(entries: CasCatalogEntry[], message: string): CasCatalogEntry | undefined {
  const m = message.trim().toLowerCase();
  if (!m) return undefined;
  return entries.find((e) => e.casMessage.trim().toLowerCase() === m);
}
