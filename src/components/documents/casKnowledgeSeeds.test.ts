import { describe, it, expect } from 'vitest';
import { getSeedState, casKnowledgeSeed } from './mockData';
import { STORED_STATE_MIGRATIONS, migrateStoredState } from './engine/migrations';
import { DATA_VERSION } from './DocumentsContext';
import { casCatalog, fleetArticles, isCasEntry, catalogEntryForMessage, CAS_KNOWLEDGE_CLASS_ID } from './engine/casKnowledge';
import { currentRevision, nextDocId } from './engine/revisions';
import { classFor } from './classes';
import { SEED_AIRCRAFT } from '../tech-log/mockData/fleet';
import { getDefaultState } from '../tech-log/mockData/scenarios';
import { currentRows } from '../tech-log/engine/supersede';
import type { AircraftType } from '../tech-log/types';
import type { DocumentsState } from './types';

/**
 * D60 seed guard.
 *
 * The rendering tests use their own fixtures, so they would stay green while the DEMO went silently
 * empty — the trap the D57 slice hit with its seeded RED `casColor` and the trap the task-5 slice hit
 * by seeding a CMC code into the exact state that suppressed the feature. So this file asserts
 * PROPERTIES of the seeds, derived from the fleet and the seeded defects, not the literal strings I
 * happened to write:
 *
 *  1. **Every fleet type that exists has non-empty knowledge.** Adding a type to `SEED_AIRCRAFT`
 *     fails this test until someone curates for it — which is the right failure: a Reference tab that
 *     opens empty on a real tail teaches the reader that the feature is dead.
 *  2. **At least one CAS message on a CURRENT seeded defect is curated for that defect's own fleet
 *     type.** That is the property that makes the picker and the "what maintenance knows" deep link
 *     demonstrable at all. Containment of a particular string is not the invariant; reachability is.
 *  3. **Where a message is curated AND seeded on a defect, the colours agree.** A catalog that
 *     disagreed with the record would be teaching the wrong tier, which is worse than no catalog.
 *  4. The migration reaches an existing store, is idempotent, and never overwrites a curator's own
 *     edit to a seeded entry.
 */

const FLEET_TYPES = [...new Set(SEED_AIRCRAFT.map((a) => a.type))] as AircraftType[];

const seededDefectsWithCas = () => {
  const tl = getDefaultState();
  const byId = new Map(tl.aircraft.map((a) => [a.id, a]));
  return currentRows(tl.defects)
    .filter((d) => !!d.casMessage)
    .map((d) => ({ defect: d, type: byId.get(d.aircraftId)?.type }))
    .filter((x): x is { defect: (typeof tl.defects)[number]; type: AircraftType } => !!x.type);
};

describe('D60 CAS knowledge seeds', () => {
  const seed = getSeedState();

  it('the fleet has more than one type — otherwise the type filter proves nothing', () => {
    expect(FLEET_TYPES.length).toBeGreaterThan(1);
  });

  it('every fleet type has at least one curated CAS entry and one article', () => {
    for (const type of FLEET_TYPES) {
      expect(casCatalog(seed.docs, seed.revisions, type), `CAS catalog for ${type}`).not.toHaveLength(0);
      expect(fleetArticles(seed.docs, seed.revisions, type), `articles for ${type}`).not.toHaveLength(0);
    }
  });

  it('every seeded knowledge entry is published, fleet-tagged, and one kind or the other', () => {
    for (const doc of casKnowledgeSeed().docs) {
      expect(currentRevision(doc.id, seed.revisions), `${doc.id} has a published revision`).toBeDefined();
      expect(doc.fleetTypes?.length, `${doc.id} names at least one fleet type`).toBeGreaterThan(0);
      expect(doc.classId).toBe('tribal-knowledge');
      // A structured entry carries a message; an article carries none. Nothing in between.
      if (isCasEntry(doc)) expect(doc.casMeta?.casMessage.trim()).toBeTruthy();
      else expect(doc.casMeta).toBeUndefined();
    }
  });

  it('a CAS message on a current seeded defect is reachable from that tail’s own catalog', () => {
    const withCas = seededDefectsWithCas();
    expect(withCas.length, 'the tech-log seeds put a CAS message on at least one defect').toBeGreaterThan(0);

    const reachable = withCas.filter(({ defect, type }) =>
      catalogEntryForMessage(casCatalog(seed.docs, seed.revisions, type), defect.casMessage!),
    );
    // This is the property that makes the picker + deep link demonstrable on a fresh load: a pilot
    // correcting or re-reporting a seeded defect finds the curated entry for it.
    expect(reachable.length, 'at least one seeded CAS message is curated for its own fleet type').toBeGreaterThan(0);
  });

  it('where a seeded defect’s message is curated, the curated colour matches the record', () => {
    for (const { defect, type } of seededDefectsWithCas()) {
      const entry = catalogEntryForMessage(casCatalog(seed.docs, seed.revisions, type), defect.casMessage!);
      if (!entry) continue; // not curated yet is fine — the catalog is allowed to be incomplete
      expect(entry.casColor, `${defect.casMessage} on ${type}`).toBe(defect.casColor);
    }
  });

  it('articles link config values rather than restating a number', () => {
    const articleBodies = casKnowledgeSeed()
      .revisions.filter((r) => !casKnowledgeSeed().docs.find((d) => d.id === r.docId)?.casMeta)
      .map((r) => r.sections.flatMap((s) => s.blocks.map((b) => b.md)).join('\n'));
    expect(articleBodies.length).toBeGreaterThan(0);
    for (const body of articleBodies) {
      expect(body).toMatch(/standbyFuelLoadLb/);
      // D60: never restate the number in prose. The fleet seeds use 6,000 and 8,000 lb.
      expect(body).not.toMatch(/\b[68],?000\s*lb/i);
    }
  });
});

describe('D60 seed migration', () => {
  function emptyStore(): DocumentsState {
    return {
      docs: [],
      revisions: [],
      acknowledgments: [],
      comments: [],
      suggestions: [],
      suggestionReplies: [],
      reviews: [],
      signatures: [],
    };
  }

  it('ships a step for the current DATA_VERSION (every bump must)', () => {
    expect(STORED_STATE_MIGRATIONS.some((m) => m.to === DATA_VERSION)).toBe(true);
  });

  it('injects the knowledge into a store created before this slice', () => {
    const before = emptyStore();
    const after = migrateStoredState(before, '2026-07-14-safety-reads-v1');
    for (const type of FLEET_TYPES) {
      expect(casCatalog(after.docs, after.revisions, type), `catalog for ${type}`).not.toHaveLength(0);
    }
  });

  it('is idempotent — a second run adds nothing', () => {
    const once = migrateStoredState(emptyStore(), '2026-07-14-safety-reads-v1');
    const twice = migrateStoredState(once, '2026-07-14-safety-reads-v1');
    expect(twice.docs).toHaveLength(once.docs.length);
    expect(twice.revisions).toHaveLength(once.revisions.length);
  });

  it('lands every seed on a store where a curator already used the low TK ids', () => {
    // The regression: seeds shipped as TK-003…TK-010, and `nextDocId` hands the FIRST
    // curator-created tribal-knowledge entry exactly TK-003 (the pre-slice seeds stop at TK-002).
    // The migration adds a seed only when its id is absent, so a curator who had written one entry
    // silently lost seed TK-003 — and with it the catalog entry the seeded GEAR UNSAFE defect on
    // N1PG resolves to. Two prior entries swallowed TK-004 as well.
    const curatorDoc = {
      id: nextDocId(classFor(CAS_KNOWLEDGE_CLASS_ID), [{ id: 'TK-001' }, { id: 'TK-002' }]),
      classId: CAS_KNOWLEDGE_CLASS_ID,
      title: 'A curator wrote this before the seeds shipped',
      category: 'Aircraft Quirks',
      roles: ['all'],
      ownerUserId: 'USR008',
      ownerName: 'Tom Parker',
      tags: [],
      isPinned: false,
      isArchived: false,
      createdDate: '2026-07-01',
    };
    // Guard the premise of this test rather than trusting the comment above it.
    expect(curatorDoc.id).toBe('TK-003');

    const store: DocumentsState = { ...emptyStore(), docs: [curatorDoc] };
    const after = migrateStoredState(store, '2026-07-14-safety-reads-v1');

    for (const seeded of casKnowledgeSeed().docs) {
      expect(after.docs.find((d) => d.id === seeded.id), `seed ${seeded.id} landed`).toBeDefined();
      expect(
        after.revisions.find((r) => r.docId === seeded.id),
        `seed ${seeded.id} kept its revision`,
      ).toBeDefined();
    }
    // The curator's own entry is untouched, and every fleet type still has knowledge.
    expect(after.docs.find((d) => d.id === 'TK-003')?.title).toBe(curatorDoc.title);
    for (const type of FLEET_TYPES) {
      expect(casCatalog(after.docs, after.revisions, type), `catalog for ${type}`).not.toHaveLength(0);
    }
  });

  it('never overwrites a curator’s own edit to a seeded entry', () => {
    const seeded = casKnowledgeSeed();
    const edited = seeded.docs[0];
    const store: DocumentsState = {
      ...emptyStore(),
      docs: [{ ...edited, title: 'Curator retitled this', isArchived: true }],
      revisions: seeded.revisions.filter((r) => r.docId === edited.id),
    };
    const after = migrateStoredState(store, '2026-07-14-safety-reads-v1');
    const kept = after.docs.find((d) => d.id === edited.id)!;
    expect(kept.title).toBe('Curator retitled this');
    expect(kept.isArchived).toBe(true);
    // …and it is present exactly once.
    expect(after.docs.filter((d) => d.id === edited.id)).toHaveLength(1);
  });
});
