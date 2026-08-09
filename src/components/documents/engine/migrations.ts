// C5 — versioned migrations for the persisted documents store. A DATA_VERSION
// bump must transform the stored state forward, never wipe it: user-authored
// docs, acknowledgment history, and signature records survive upgrades.
//
// Every DATA_VERSION bump ships a step here (an identity step is fine). If a
// stored version has no matching step the state passes through unchanged —
// graceful degradation, never data loss. New seed content for existing stores
// is also a migration step's job (a fresh install gets it from the seeds).
import type { AircraftType } from '../../tech-log/types';
import type { Doc, DocCasMeta, DocRevision, DocumentsState, RevisionStatus } from '../types';
import { safetyReadSeed, casKnowledgeSeed, cabinKnowledgeSeed, TK_002_FLEET_TYPES } from '../mockData';

/**
 * The PRE-D65 doc shape: D60 hung the CAS facts off the mutable `Doc` identity row.
 *
 * Kept as a type here and nowhere else, because a migration step describes the shape of the era it
 * upgrades FROM — the '2026-07-29-tk002-fleet-v1' step below genuinely wrote a doc-level tag, and
 * rewriting history to pretend otherwise would make the step lie about the stores it produced.
 * Nothing outside this file may read these fields: the live shape is `DocRevision.fleetTypes` /
 * `DocRevision.casMeta`.
 */
type LegacyCasDoc = Doc & { fleetTypes?: AircraftType[]; casMeta?: DocCasMeta };

export interface StoredStateMigration {
  /** The DATA_VERSION this step upgrades TO. Steps run in ascending order. */
  to: string;
  migrate: (state: DocumentsState) => DocumentsState;
}

/** Ordered registry — version labels are date-prefixed so they sort lexicographically.
 * The '2026-07-11-blocks-v1' bump (content blob → sections) is handled by the
 * idempotent per-revision shape heal in the loader (`migrateRevisionForward`,
 * DocumentsContext) rather than a step here; register version-keyed steps for
 * later bumps whose transforms are not safely re-runnable, e.g.:
 *   { to: '2026-08-01-v2', migrate: (s) => ({ ...s, revisions: s.revisions.map(...) }) } */
export const STORED_STATE_MIGRATIONS: StoredStateMigration[] = [
  {
    // TL-6 / D29 — surface the safety-specific "SMS Manual — Revision G" required
    // read in stores created before it was seeded. New seed content otherwise
    // reaches only a fresh install (loadInitialState spreads persisted state over
    // the seeds). Idempotent: skips if the doc is already present; preserves all
    // existing docs/revisions/acks.
    to: '2026-07-14-safety-reads-v1',
    migrate: (s) => {
      const { doc, rev } = safetyReadSeed();
      if (s.docs.some((d) => d.id === doc.id)) return s;
      return { ...s, docs: [...s.docs, doc], revisions: [...s.revisions, rev] };
    },
  },
  {
    // D60 — the per-fleet CAS knowledge seeds. This is the whole reason the catalog is
    // homed in the documents store: an existing store is brought FORWARD to the new
    // content, where a tech-log DATA_VERSION bump would have wiped and re-seeded (and
    // taken any curated entry with it).
    //
    // Idempotent, and per-doc rather than all-or-nothing: an entry a curator has since
    // ARCHIVED or revised is left exactly as it is, and only genuinely absent ones are
    // added. Injecting the whole set on an id collision would silently overwrite a
    // curator's own edits to a seeded entry.
    to: '2026-07-29-cas-knowledge-v1',
    migrate: (s) => {
      const { docs, revisions } = casKnowledgeSeed();
      const missing = docs.filter((d) => !s.docs.some((x) => x.id === d.id));
      if (missing.length === 0) return s;
      const missingIds = new Set(missing.map((d) => d.id));
      return {
        ...s,
        docs: [...s.docs, ...missing],
        revisions: [...s.revisions, ...revisions.filter((r) => missingIds.has(r.docId))],
      };
    },
  },
  {
    // D60 fix pass — back-fill `fleetTypes` on `TK-002`, the tribal-knowledge entry that predates
    // the fleet axis. A fresh install gets it from the seed; an existing store would otherwise keep
    // a plainly G650-specific entry invisible on the Reference tab forever.
    //
    // Only fills an ABSENT value. A curator who has since tagged the entry (including tagging it for
    // a different type) keeps their edit — `undefined` means "never asked", and that is the only
    // state this step is entitled to write.
    to: '2026-07-29-tk002-fleet-v1',
    migrate: (s) => {
      const existing = s.docs.find((d) => d.id === 'TK-002') as LegacyCasDoc | undefined;
      if (!existing || existing.fleetTypes !== undefined) return s;
      return {
        ...s,
        docs: s.docs.map((d) =>
          d.id === 'TK-002' ? ({ ...d, fleetTypes: [...TK_002_FLEET_TYPES] } as Doc) : d,
        ),
      };
    },
  },
  {
    // D65 — move the CAS applicability/annunciation facts from the mutable `Doc` identity row
    // onto `DocRevision`, so `casCatalog` reaches them only through `currentRevision()` and
    // "the picker offers published knowledge only" becomes something the engine enforces
    // rather than something a dialog footer happens to imply.
    //
    // LOSSLESS BY CONSTRUCTION, which is the point — the curated content in this store is the
    // operator's own writing and the reason D60 homed it in documents rather than tech-log:
    //   * the value is COPIED ONTO EVERY REVISION of the doc that does not already carry it.
    //     Before this move there was exactly one value per doc and every revision carried it
    //     implicitly, so there is no revision this fact was not true of and no choosing which
    //     revision is "the" one — a doc whose published revision is r1 and whose draft is r2
    //     comes forward with both intact, and whichever ends up published offers what the
    //     curator wrote.
    //   * revisions that ALREADY carry a value are left alone, so re-running this (or running
    //     it over a store that has since been edited in the new shape) cannot overwrite a
    //     curator's edit.
    //   * only the two legacy KEYS are dropped from the doc row, and only once the value has
    //     somewhere to land: a doc with NO revisions at all keeps them where they are rather than
    //     having them deleted with nowhere to put them. Everything else on the doc — title, tags,
    //     owner, pin/archive state — and every comment, revision, draft, acknowledgment and
    //     signature in the store is passed through untouched.
    to: '2026-07-30-cas-on-revision-v1',
    migrate: (s) => {
      const hasRevision = new Set(s.revisions.map((r) => r.docId));
      const legacy = new Map<string, { fleetTypes?: AircraftType[]; casMeta?: DocCasMeta }>();
      const docs = s.docs.map((d) => {
        const { fleetTypes, casMeta, ...rest } = d as LegacyCasDoc;
        if (fleetTypes === undefined && casMeta === undefined) return d;
        if (!hasRevision.has(d.id)) return d;
        legacy.set(d.id, { fleetTypes, casMeta });
        return rest as Doc;
      });
      if (legacy.size === 0) return s;
      return {
        ...s,
        docs,
        revisions: s.revisions.map((r) => {
          const carried = legacy.get(r.docId);
          if (!carried) return r;
          const next = { ...r };
          if (next.fleetTypes === undefined && carried.fleetTypes !== undefined) {
            next.fleetTypes = carried.fleetTypes;
          }
          if (next.casMeta === undefined && carried.casMeta !== undefined) {
            next.casMeta = carried.casMeta;
          }
          return next;
        }),
      };
    },
  },
  {
    // D64 — the Ship Notes shelf's section vocabulary. 'Maintenance' and 'Cabin' are retired from
    // the tribal-knowledge class (a department is not a topic, per D64's ruling that headings are
    // what you're DOING), so stores written before this bump carry categories that now match no
    // section and would silently vanish from the tail page.
    //
    // Applies to every tribal-knowledge doc, not just fleet-scoped ones: the three names are
    // retired from the class outright, and a doc left on a category the picker no longer offers
    // cannot be edited back onto a valid one. 'Airports & FBOs' and 'Operations' survive, so
    // general-library content is untouched.
    to: '2026-07-30-ship-note-sections-v1',
    migrate: (s) => {
      const REMAP: Record<string, string> = {
        Maintenance: 'Messages & faults',
        Cabin: 'Cabin & connectivity',
        'Aircraft Quirks': 'Quirks & field notes',
      };
      return {
        ...s,
        docs: s.docs.map((d) => {
          if (d.classId !== 'tribal-knowledge') return d;
          const next = REMAP[d.category];
          return next ? { ...d, category: next } : d;
        }),
      };
    },
  },
  {
    // D75 — the cabin knowledge seeds. Same shape and same reason as the CAS step below: new seed
    // content reaches only a fresh install, because `loadInitialState` spreads persisted state OVER
    // the seeds. Without this step anyone whose browser already holds a documents store opens the
    // new Cabin knowledge tab to an empty shelf and concludes the feature does not work.
    //
    // Per-doc rather than all-or-nothing, so an entry a curator has since revised or archived is
    // left alone and only genuinely absent ones are added.
    to: '2026-08-03-cabin-knowledge-v1',
    migrate: (s) => {
      const { docs, revisions } = cabinKnowledgeSeed();
      const missing = docs.filter((d) => !s.docs.some((x) => x.id === d.id));
      if (missing.length === 0) return s;
      const missingIds = new Set(missing.map((d) => d.id));
      return {
        ...s,
        docs: [...s.docs, ...missing],
        revisions: [...s.revisions, ...revisions.filter((r) => missingIds.has(r.docId))],
      };
    },
  },
  {
    // The one-working-draft invariant. A store written before the CREATE_DRAFT
    // guard can hold two or more in-flight revisions on one doc; only one was
    // ever reachable (DocReader's find()), so the rest are invisible AND
    // uneditable — the exact orphan the guard exists to prevent.
    //
    // Extras are WITHDRAWN, not deleted. C7's tombstone ceremony already means
    // "a draft pulled before publication": the reason records why and the
    // author's words stay in the record. Deleting them would make this the only
    // step in this module that destroys authored content.
    //
    // Which one survives:
    //  - a 'pending-approval' revision always wins. It is already with an
    //    approver, and withdrawing it out from under them is not a migration's
    //    business.
    //  - otherwise the highest '-rN'. That is what DocReader was actually
    //    showing, so a returning user's visible draft is the one that survives.
    //
    // Deliberately NOT done: backfilling `resolvedIntoRevisionId` on suggestions
    // accepted before that field existed. Nothing in the store links them, and a
    // guess would be a fabricated provenance claim on a compliance surface. They
    // read as 'accepted' with no revision link, which is honest.
    to: '2026-08-08-single-draft-v1',
    migrate: (s) => {
      const IN_FLIGHT: RevisionStatus[] = ['draft', 'rejected', 'pending-approval'];
      const seq = (r: DocRevision): number => {
        const m = /-r(\d+)$/.exec(r.id);
        return m ? parseInt(m[1], 10) : 0;
      };
      const keep = new Map<string, DocRevision>(); // docId -> surviving revision
      for (const r of s.revisions) {
        if (!IN_FLIGHT.includes(r.status)) continue;
        const held = keep.get(r.docId);
        if (!held) { keep.set(r.docId, r); continue; }
        if (held.status === 'pending-approval') continue;
        if (r.status === 'pending-approval' || seq(r) > seq(held)) keep.set(r.docId, r);
      }
      let changed = false;
      const revisions = s.revisions.map((r) => {
        if (!IN_FLIGHT.includes(r.status) || keep.get(r.docId)?.id === r.id) return r;
        changed = true;
        return {
          ...r,
          status: 'withdrawn' as const,
          withdrawnAtUtc: new Date().toISOString(),
          withdrawnByName: 'myGFO (data upgrade)',
          withdrawalReason:
            'Withdrawn automatically: this document held more than one open draft, which the '
            + 'single-working-draft rule no longer allows. Its content is preserved here.',
        };
      });
      return changed ? { ...s, revisions } : s;
    },
  },
];

/** Apply every step newer than the stored version. `fromVersion === null`
 * (unknown provenance) applies all steps. */
export function migrateStoredState(
  stored: DocumentsState,
  fromVersion: string | null,
  steps: StoredStateMigration[] = STORED_STATE_MIGRATIONS,
): DocumentsState {
  return steps
    .filter((m) => fromVersion === null || m.to > fromVersion)
    .reduce((acc, m) => m.migrate(acc), stored);
}
