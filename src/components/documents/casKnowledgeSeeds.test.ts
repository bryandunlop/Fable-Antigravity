import { describe, it, expect } from 'vitest';
import { getSeedState, casKnowledgeSeed } from './mockData';
import { STORED_STATE_MIGRATIONS, migrateStoredState } from './engine/migrations';
import { DATA_VERSION } from './DocumentsContext';
import {
  casCatalog, fleetArticles, isCasEntry, catalogEntryForMessage, duplicateCasMessages,
  CAS_KNOWLEDGE_CLASS_ID,
} from './engine/casKnowledge';
import { currentRevision, nextDocId } from './engine/revisions';
import { classFor } from './classes';
import { SEED_AIRCRAFT } from '../tech-log/mockData/fleet';
import { getDefaultState } from '../tech-log/mockData/scenarios';
import { currentRows } from '../tech-log/engine/supersede';
import type { AircraftType } from '../tech-log/types';
import type { Doc, DocAcknowledgment, DocCasMeta, DocComment, DocRevision, DocumentsState } from './types';

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
      // D65 — the facts ride the revision, so the published revision is where they are asserted.
      const rev = currentRevision(doc.id, seed.revisions);
      expect(rev, `${doc.id} has a published revision`).toBeDefined();
      expect(rev!.fleetTypes?.length, `${doc.id} names at least one fleet type`).toBeGreaterThan(0);
      expect(doc.classId).toBe('tribal-knowledge');
      // A structured entry carries a message; an article carries none. Nothing in between.
      if (isCasEntry(rev!)) expect(rev!.casMeta?.casMessage.trim()).toBeTruthy();
      else expect(rev!.casMeta).toBeUndefined();
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

  /**
   * The pre-existing tribal-knowledge entry predates D60's `fleetTypes` axis. It is plainly
   * G650-specific ("G650 APU cold-soak starts"), so without the tag it is invisible on the very tab
   * D60 built to surface fleet knowledge. `G650ER` is the canonical string; `G650` is not a type.
   */
  it('the pre-D60 G650 field-notes entry is fleet-typed, so it reaches the G650ER tab', () => {
    const tk2 = seed.docs.find((d) => d.id === 'TK-002');
    expect(tk2, 'TK-002 is still seeded').toBeDefined();
    expect(currentRevision('TK-002', seed.revisions)?.fleetTypes).toEqual(['G650ER']);
    expect(fleetArticles(seed.docs, seed.revisions, 'G650ER').map((d) => d.id)).toContain('TK-002');
    // ...and only there. A G500 crew must not be shown G650 APU notes.
    expect(fleetArticles(seed.docs, seed.revisions, 'G500').map((d) => d.id)).not.toContain('TK-002');
  });

  /** Generalises the above: a seeded entry that names a type in its tags must carry the axis the
   *  Reference tab actually filters on, or it is knowledge nobody can find. */
  it('no seeded tribal-knowledge entry names a fleet in its tags without carrying fleetTypes', () => {
    const TAG_TO_TYPE: Record<string, AircraftType> = { g650: 'G650ER', g500: 'G500', g800: 'G800' };
    for (const doc of seed.docs.filter((d) => d.classId === CAS_KNOWLEDGE_CLASS_ID)) {
      const implied = doc.tags.map((t) => TAG_TO_TYPE[t.toLowerCase()]).filter(Boolean);
      if (implied.length === 0) continue;
      const rev = currentRevision(doc.id, seed.revisions);
      expect(rev?.fleetTypes ?? [], `${doc.id} tags [${doc.tags.join(', ')}]`).toEqual(
        expect.arrayContaining(implied),
      );
    }
  });

  /**
   * D60's config clause is TWO claims: aircraft config "is displayed/linked by articles, **never
   * restated in prose**". This guard used to test a proxy for neither — it required EVERY freeform
   * body to name `standbyFuelLoadLb`, which D60 does not ask and which a correct future article
   * (nuisance CAS messages, a startup stack) would fail for having nothing to do with fuel.
   *
   * What is asserted now:
   *   1. **Universal** — no article restates a config number, with the numbers derived from
   *      `SEED_AIRCRAFT` rather than written here. A literal in a test agreeing with a literal in a
   *      seed is exactly how this batch has been burned before.
   *   2. **Conditional** — an article that RAISES the subject points at where the value lives.
   *   3. **Existential** — at least one does raise it, so claim 1 cannot pass vacuously.
   */
  const articleBodies = () =>
    casKnowledgeSeed()
      .revisions.filter((r) => !r.casMeta)
      .map((r) => r.sections.flatMap((s) => s.blocks.map((b) => b.md)).join('\n'));

  /** The `standbyFuelLoadLb` figures the fleet actually holds — derived, never typed. */
  const CONFIG_NUMBERS = [
    ...new Set(SEED_AIRCRAFT.map((a) => a.standbyFuelLoadLb).filter((n): n is number => typeof n === 'number')),
  ];

  it('the fleet actually carries the config value this clause is about', () => {
    expect(CONFIG_NUMBERS.length, 'SEED_AIRCRAFT sets standbyFuelLoadLb somewhere').toBeGreaterThan(0);
  });

  it('no article restates a config number in prose', () => {
    const bodies = articleBodies();
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      const digits = body.replace(/,/g, ''); // "8,000" and "8000" are the same restatement
      for (const n of CONFIG_NUMBERS) {
        expect(new RegExp(`(?<!\\d)${n}(?!\\d)`).test(digits), `an article restates ${n}`).toBe(false);
      }
    }
  });

  it('an article that raises the standby fuel load points at where the value lives', () => {
    const raising = articleBodies().filter((b) => /standby fuel|standbyFuelLoadLb/i.test(b));
    // Existential half: if nothing raises it, the rule above is passing vacuously.
    expect(raising.length, 'at least one seeded article discusses the config value').toBeGreaterThan(0);
    for (const body of raising) {
      expect(body, 'names the field it is pointing at').toMatch(/standbyFuelLoadLb/);
      expect(body, 'says where to read it').toMatch(/aircraft record|postflight/i);
    }
  });

  it('no fleet type has the same CAS message curated twice', () => {
    // A duplicate is a curation defect the engine deliberately does NOT resolve silently
    // (`duplicateCasMessages`), so the demo must not ship one — it would make the defect form's
    // deep link plural and leave the colour to the reporter for no good reason.
    for (const type of FLEET_TYPES) {
      expect(duplicateCasMessages(casCatalog(seed.docs, seed.revisions, type)), `duplicates on ${type}`).toEqual([]);
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

  /**
   * The TK-002 back-fill and the D65 move run in sequence for a store old enough to need both, so
   * these two assert the END STATE: the tag reaches the published revision, which is where the
   * Reference tab and the picker read it, whether it came from the back-fill or from a curator.
   *
   * `pre65TK002` builds the shape such a store ACTUALLY holds — the doc row carrying the CAS
   * fields — rather than the current seed shape, which is the post-move one.
   */
  const pre65TK002 = (fleetTypes?: AircraftType[]): DocumentsState => {
    const seedState = getSeedState();
    const doc = { ...seedState.docs.find((d) => d.id === 'TK-002')! } as Doc & { fleetTypes?: AircraftType[] };
    if (fleetTypes) doc.fleetTypes = fleetTypes;
    const rev = { ...seedState.revisions.find((r) => r.id === 'TK-002-r1')! };
    delete rev.fleetTypes; // pre-D65 stores carried nothing on the revision
    return { ...emptyStore(), docs: [doc], revisions: [rev] };
  };

  it('back-fills fleetTypes on the pre-D60 TK-002 and lands it on the published revision', () => {
    const after = migrateStoredState(pre65TK002(), '2026-07-29-cas-knowledge-v1');
    expect(currentRevision('TK-002', after.revisions)?.fleetTypes).toEqual(['G650ER']);
    expect(fleetArticles(after.docs, after.revisions, 'G650ER').map((d) => d.id)).toContain('TK-002');
  });

  it('leaves a curator’s own fleet tagging of TK-002 alone', () => {
    const after = migrateStoredState(pre65TK002(['G500']), '2026-07-29-cas-knowledge-v1');
    expect(currentRevision('TK-002', after.revisions)?.fleetTypes).toEqual(['G500']);
    expect(fleetArticles(after.docs, after.revisions, 'G500').map((d) => d.id)).toContain('TK-002');
  });
});

/**
 * D65 — the move from `Doc` to `DocRevision`, run against a store holding a curator's own work.
 *
 * A LOSSY migration here would be the worst defect this change could ship: surviving curated
 * knowledge is the entire reason D60 homed this in the documents store (which migrates forward)
 * rather than in tech-log (which wipes and re-seeds on a version bump). So this fixture is
 * deliberately a store that has been USED — two revisions, a comment thread, an acknowledgment, a
 * retitled seed and a draft in flight — and the assertions are about what survives, not only about
 * where the CAS fields ended up.
 */
describe('D65 — CAS meta moves onto the revision without losing curated content', () => {
  const CAS_META: DocCasMeta = { casMessage: 'L ENG BLEED', casColor: 'AMBER', cmcCodes: ['36-11-02'] };

  /** A tribal-knowledge entry a curator wrote and then revised, in the PRE-D65 stored shape. */
  const curatorDoc = {
    id: 'TK-500',
    classId: CAS_KNOWLEDGE_CLASS_ID,
    title: 'L ENG BLEED on a hot day — what the line actually sees',
    category: 'Aircraft Quirks',
    roles: ['all'],
    ownerUserId: 'USR008',
    ownerName: 'Tom Parker',
    tags: ['g650'],
    isPinned: true,
    isArchived: false,
    createdDate: '2026-06-01',
    fleetTypes: ['G650ER'] as AircraftType[],
    casMeta: CAS_META,
  };

  const curatorRev = (id: string, status: DocRevision['status']): DocRevision => ({
    id,
    docId: 'TK-500',
    revision: id.endsWith('r1') ? '1.0' : '2.0',
    status,
    sections: [{ id: 'TK-500::s1', level: 2, number: '', title: 'What we see', blocks: [
      { id: 'TK-500::s1::b1', type: 'paragraph', md: 'Nuisance above 35 C on the ground. Do not defer on this alone.' },
    ] }],
    changeSummary: '',
    effectiveDate: '2026-06-01',
    authorUserId: 'USR008',
    authorName: 'Tom Parker',
    requireAcknowledgment: false,
    ackLevel: 'none',
    mockChecksum: 'curated',
  });

  const comment: DocComment = {
    id: 'cmt-tk500-1',
    docId: 'TK-500',
    authorUserId: 'USR009',
    authorName: 'Night shift',
    role: 'maintenance',
    text: 'Seen it twice on N1PG, cleared on its own both times.',
    createdAtUtc: '2026-06-05T02:14:00.000Z',
  };

  /** A seeded entry the curator has since retitled — the "never overwrite an edit" case, in the
   *  pre-D65 shape (the seeds carried the CAS fields on the doc row back then). */
  const retitledSeed = () => {
    const s = casKnowledgeSeed();
    const seededRev = s.revisions.find((r) => r.docId === s.docs[0].id)!;
    const { fleetTypes, casMeta, ...revRest } = seededRev;
    return {
      doc: { ...s.docs[0], title: 'Curator retitled this seed', fleetTypes, casMeta },
      rev: revRest as DocRevision,
    };
  };

  const ack: DocAcknowledgment = {
    docId: 'TK-500', revisionId: 'TK-500-r2', revision: '2.0',
    userId: 'USR008', userName: 'Tom Parker', role: 'maintenance',
    level: 'initials', initials: 'TP', acknowledgedAtUtc: '2026-07-20T09:00:00.000Z',
  };
  const signature = {
    id: 'sig-tk500-ack', signedEntity: 'DOC_ACK', signedEntityId: 'TK-500-r2',
    signerOid: 'USR008', signerName: 'Tom Parker', signedAtUtc: '2026-07-20T09:00:00.000Z',
    intentStatement: 'seed', contentHash: 'deadbeef',
  } as unknown as DocumentsState['signatures'][number];

  function storedBeforeD65(): DocumentsState {
    const seedEdit = retitledSeed();
    return {
      docs: [curatorDoc as unknown as Doc, seedEdit.doc as unknown as Doc],
      revisions: [
        curatorRev('TK-500-r1', 'superseded'),
        curatorRev('TK-500-r2', 'published'),
        curatorRev('TK-500-r3', 'draft'),
        seedEdit.rev,
      ],
      // A real acknowledgment and its signature, because the docstring above claims this store has
      // been USED and a claim a fixture does not back is worse than no claim. They also close a
      // concrete gap: this step returns `{ ...s, docs, revisions }`, and a maintainer who later
      // rewrote it as a projection would silently drop every collection nobody asserts on.
      acknowledgments: [ack],
      comments: [comment],
      suggestions: [],
      suggestionReplies: [],
      reviews: [],
      signatures: [signature],
    };
  }

  const migrated = () => migrateStoredState(storedBeforeD65(), '2026-07-29-tk002-fleet-v1');

  it('loses nothing — every doc, revision and comment survives, with its own content intact', () => {
    const before = storedBeforeD65();
    const after = migrated();
    // SUPERSET, not equality. The test's claim is "loses nothing", and a later seed-injecting step
    // (D75's cabin knowledge) legitimately ADDS docs when the chain runs from this old version.
    // Asserting equality made this test fail on a step that lost nothing at all — it was checking
    // "the chain adds nothing ever", which is not a property this codebase has or wants.
    for (const id of before.docs.map((d) => d.id)) expect(after.docs.map((d) => d.id)).toContain(id);
    for (const id of before.revisions.map((r) => r.id)) expect(after.revisions.map((r) => r.id)).toContain(id);
    expect(after.comments).toEqual(before.comments);
    // The two collections the docstring claims and nothing previously checked.
    expect(after.acknowledgments).toEqual(before.acknowledgments);
    expect(after.signatures).toEqual(before.signatures);
    const kept = after.docs.find((d) => d.id === 'TK-500')!;
    expect(kept.title).toBe(curatorDoc.title);
    expect(kept.isPinned).toBe(true);
    expect(kept.ownerName).toBe('Tom Parker');
    expect(after.docs.find((d) => d.id === retitledSeed().doc.id)?.title).toBe('Curator retitled this seed');
    // The body of every PRE-EXISTING revision is untouched — this step only ever adds two keys.
    // Iterate `before`, not `after`: a later seed-injecting step adds revisions that by definition
    // have no counterpart in `before`, and looking those up threw rather than proving anything.
    for (const b of before.revisions) {
      expect(after.revisions.find((r) => r.id === b.id)!.sections).toEqual(b.sections);
    }
  });

  it('carries the curated CAS facts onto the revisions and off the doc row', () => {
    const after = migrated();
    for (const id of ['TK-500-r1', 'TK-500-r2', 'TK-500-r3']) {
      const r = after.revisions.find((x) => x.id === id)!;
      expect(r.fleetTypes, `${id} carries the applicability`).toEqual(['G650ER']);
      expect(r.casMeta, `${id} carries the annunciation`).toEqual(CAS_META);
    }
    // One home for the fact, not two: the doc row no longer answers.
    const kept = after.docs.find((d) => d.id === 'TK-500') as Doc & { fleetTypes?: unknown; casMeta?: unknown };
    expect(kept.fleetTypes).toBeUndefined();
    expect(kept.casMeta).toBeUndefined();
  });

  it('the curator’s entry is still offered by the catalog after the move', () => {
    const after = migrated();
    const entry = catalogEntryForMessage(casCatalog(after.docs, after.revisions, 'G650ER'), 'L ENG BLEED');
    expect(entry?.docId).toBe('TK-500');
    expect(entry?.casColor).toBe('AMBER');
    expect(entry?.cmcCodes).toEqual(['36-11-02']);
    // …and the entry resolves from its PUBLISHED revision, not from the draft or the superseded one.
    expect(entry?.revisionId).toBe('TK-500-r2');
  });

  it('every seeded entry still resolves for its own fleet type after the move', () => {
    const after = migrateStoredState(storedBeforeD65(), '2026-07-14-safety-reads-v1');
    for (const type of FLEET_TYPES) {
      expect(casCatalog(after.docs, after.revisions, type), `catalog for ${type}`).not.toHaveLength(0);
      expect(fleetArticles(after.docs, after.revisions, type), `articles for ${type}`).not.toHaveLength(0);
    }
  });

  it('is idempotent — a second pass changes nothing and overwrites no edit', () => {
    const once = migrated();
    const twice = migrateStoredState(once, '2026-07-29-tk002-fleet-v1');
    expect(twice).toEqual(once);
  });

  it('a doc with no revision at all keeps its legacy fields rather than losing them', () => {
    // Not reachable through the app (a doc is always created with a revision), but a delete with
    // nowhere to put the value is the one thing this step must never do.
    const orphan: DocumentsState = {
      ...storedBeforeD65(),
      docs: [curatorDoc as unknown as Doc],
      revisions: [],
    };
    const after = migrateStoredState(orphan, '2026-07-29-tk002-fleet-v1');
    expect((after.docs[0] as Doc & { casMeta?: DocCasMeta }).casMeta).toEqual(CAS_META);
  });
});
