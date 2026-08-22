import { beforeEach, describe, expect, it } from 'vitest';

import {
  emptyPageContent,
  InMemoryCompanyAirportPageStore,
  NotAnEditableFieldError,
  StaleBaseVersionError,
  type CompanyAirportPageContent,
} from './pageStore';

const blankContent: CompanyAirportPageContent = emptyPageContent();

function content(overrides: Partial<CompanyAirportPageContent>): CompanyAirportPageContent {
  return { ...blankContent, ...overrides };
}

describe('InMemoryCompanyAirportPageStore', () => {
  let store: InMemoryCompanyAirportPageStore;
  let now: number;

  beforeEach(() => {
    now = 0;
    store = new InMemoryCompanyAirportPageStore({
      now: () => new Date(Date.UTC(2026, 6, 27, 12, 0, now++)).toISOString(),
      nextId: (() => {
        let n = 0;
        return () => `id-${++n}`;
      })(),
    });
  });

  describe('publishing', () => {
    it('numbers versions from 1, monotonically per airport', () => {
      const first = store.publish({
        icao: 'KASE',
        content: content({ ppr: 'PPR required' }),
        publishedBy: 'evaluator-1',
      });
      const second = store.publish({
        icao: 'KASE',
        content: content({ ppr: 'PPR required 24h' }),
        publishedBy: 'evaluator-1',
        basedOnVersion: 1,
      });

      expect(first.version).toBe(1);
      expect(second.version).toBe(2);
    });

    it('numbers each airport independently', () => {
      store.publish({ icao: 'KASE', content: blankContent, publishedBy: 'evaluator-1' });
      const teb = store.publish({
        icao: 'KTEB',
        content: blankContent,
        publishedBy: 'evaluator-1',
      });

      expect(teb.version).toBe(1);
    });

    it('server-stamps the publish time rather than trusting a caller', () => {
      const version = store.publish({
        icao: 'KASE',
        content: blankContent,
        publishedBy: 'evaluator-1',
      });

      expect(version.publishedAtUtc).toBe('2026-07-27T12:00:00.000Z');
    });
  });

  describe('immutability', () => {
    it('leaves version 1 unchanged after version 2 publishes', () => {
      store.publish({
        icao: 'KASE',
        content: content({ opsNotes: 'Mountainous. Daytime VFR departures only.' }),
        publishedBy: 'evaluator-1',
      });
      store.publish({
        icao: 'KASE',
        content: content({ opsNotes: 'Superseded guidance.' }),
        publishedBy: 'evaluator-1',
        basedOnVersion: 1,
      });

      expect(store.getVersion('KASE', 1)?.content.opsNotes).toBe(
        'Mountainous. Daytime VFR departures only.',
      );
    });

    it('does not let a caller mutate stored content through the object it passed in', () => {
      const draft = content({ opsNotes: 'original' });
      store.publish({ icao: 'KASE', content: draft, publishedBy: 'evaluator-1' });

      draft.opsNotes = 'mutated after publish';

      expect(store.getVersion('KASE', 1)?.content.opsNotes).toBe('original');
    });

    it('does not let a caller mutate stored content through the object it read back', () => {
      store.publish({
        icao: 'KASE',
        content: content({ opsNotes: 'original' }),
        publishedBy: 'evaluator-1',
      });

      const readBack = store.getVersion('KASE', 1);
      if (readBack) readBack.content.opsNotes = 'mutated after read';

      expect(store.getVersion('KASE', 1)?.content.opsNotes).toBe('original');
    });
  });

  describe('concurrent publish', () => {
    it('rejects a publish based on a version that is no longer current', () => {
      store.publish({ icao: 'KASE', content: blankContent, publishedBy: 'evaluator-1' });
      store.publish({
        icao: 'KASE',
        content: content({ ppr: 'first writer wins' }),
        publishedBy: 'evaluator-1',
        basedOnVersion: 1,
      });

      // A second reviewer who loaded v1 at the same time now tries to publish.
      // Retrying with a recomputed version number would rebase their stale draft
      // onto content they never saw.
      expect(() =>
        store.publish({
          icao: 'KASE',
          content: content({ ppr: 'second writer, stale draft' }),
          publishedBy: 'evaluator-2',
          basedOnVersion: 1,
        }),
      ).toThrow(StaleBaseVersionError);
    });

    it('does not create a version when a stale publish is rejected', () => {
      store.publish({ icao: 'KASE', content: blankContent, publishedBy: 'evaluator-1' });
      store.publish({
        icao: 'KASE',
        content: blankContent,
        publishedBy: 'evaluator-1',
        basedOnVersion: 1,
      });

      try {
        store.publish({
          icao: 'KASE',
          content: blankContent,
          publishedBy: 'evaluator-2',
          basedOnVersion: 1,
        });
      } catch {
        // expected
      }

      expect(store.getLatest('KASE')?.version).toBe(2);
    });

    it('requires basedOnVersion once a page exists', () => {
      store.publish({ icao: 'KASE', content: blankContent, publishedBy: 'evaluator-1' });

      expect(() =>
        store.publish({ icao: 'KASE', content: blankContent, publishedBy: 'evaluator-2' }),
      ).toThrow(StaleBaseVersionError);
    });
  });

  describe('review acknowledgement pins a version (D47)', () => {
    it('pins the version that was current at the moment of review', () => {
      const v1 = store.publish({
        icao: 'KASE',
        content: content({ ppr: 'PPR required' }),
        publishedBy: 'evaluator-1',
      });

      const ack = store.acknowledge({
        icao: 'KASE',
        crewOid: 'crew-1',
        nasrCycleEffDate: '2026-07-09',
      });

      expect(ack.companyPageVersionId).toBe(v1.id);
    });

    it('still resolves the exact content the crew saw after a later version publishes', () => {
      store.publish({
        icao: 'KASE',
        content: content({ ppr: 'PPR required 24h in advance' }),
        publishedBy: 'evaluator-1',
      });
      const ack = store.acknowledge({
        icao: 'KASE',
        crewOid: 'crew-1',
        nasrCycleEffDate: '2026-07-09',
      });
      store.publish({
        icao: 'KASE',
        content: content({ ppr: 'PPR no longer required' }),
        publishedBy: 'evaluator-1',
        basedOnVersion: 1,
      });

      // This is the whole point of D47: reconstruction is a lookup, not an
      // inference from timestamps.
      expect(store.getVersionById(ack.companyPageVersionId)?.content.ppr).toBe(
        'PPR required 24h in advance',
      );
      expect(store.getLatest('KASE')?.content.ppr).toBe('PPR no longer required');
    });

    it('records the NASR cycle as an independent second clock', () => {
      store.publish({ icao: 'KASE', content: blankContent, publishedBy: 'evaluator-1' });

      const ack = store.acknowledge({
        icao: 'KASE',
        crewOid: 'crew-1',
        nasrCycleEffDate: '2026-07-09',
      });

      // The reference cycle is captured on the ack itself, not reachable only by
      // joining through the company version — the two clocks must never be
      // conflated.
      expect(ack.nasrCycleEffDate).toBe('2026-07-09');
    });

    it('server-stamps the acknowledgement time', () => {
      store.publish({ icao: 'KASE', content: blankContent, publishedBy: 'evaluator-1' });

      const ack = store.acknowledge({
        icao: 'KASE',
        crewOid: 'crew-1',
        nasrCycleEffDate: '2026-07-09',
      });

      expect(ack.acknowledgedAtUtc).toBe('2026-07-27T12:00:01.000Z');
    });

    it('records a re-review as a new acknowledgement, never an edit', () => {
      store.publish({ icao: 'KASE', content: blankContent, publishedBy: 'evaluator-1' });
      const first = store.acknowledge({
        icao: 'KASE',
        crewOid: 'crew-1',
        nasrCycleEffDate: '2026-07-09',
      });
      store.publish({
        icao: 'KASE',
        content: content({ ppr: 'changed' }),
        publishedBy: 'evaluator-1',
        basedOnVersion: 1,
      });
      const second = store.acknowledge({
        icao: 'KASE',
        crewOid: 'crew-1',
        nasrCycleEffDate: '2026-07-09',
      });

      expect(second.id).not.toBe(first.id);
      expect(store.acknowledgementsFor('KASE')).toHaveLength(2);
      expect(store.getVersionById(first.companyPageVersionId)?.version).toBe(1);
      expect(store.getVersionById(second.companyPageVersionId)?.version).toBe(2);
    });

    it('refuses to acknowledge an airport that has no published company page', () => {
      expect(() =>
        store.acknowledge({ icao: 'KKKK', crewOid: 'crew-1', nasrCycleEffDate: '2026-07-09' }),
      ).toThrow(/no published company page/i);
    });
  });

  describe('saveField (D96)', () => {
    it('creates the page when none exists, and confirms the field it wrote', () => {
      const { version, confirmation } = store.saveField({
        icao: 'KASE',
        field: 'onFieldCapability',
        value: 'None. No Part 145 station on the field is rated for our airframe class.',
        savedBy: 'tech-1',
        note: 'Phoned the airport manager.',
      });

      expect(version.version).toBe(1);
      expect(version.content.onFieldCapability).toMatch(/^None\./);
      expect(version.publishedBy).toBe('tech-1');
      expect(confirmation?.field).toBe('onFieldCapability');
      expect(confirmation?.confirmedBy).toBe('tech-1');
      expect(confirmation?.source).toBe('maintenance');
      expect(confirmation?.note).toBe('Phoned the airport manager.');
      // The confirmation must pin the version it wrote, not the one before it.
      expect(confirmation?.versionIdSeen).toBe(version.id);
    });

    it('leaves every other field exactly as it was', () => {
      store.publish({
        icao: 'KASE',
        content: content({ curfew: '2300-0700 local', groundKit: 'GPU yes, no air start' }),
        publishedBy: 'evaluator-1',
      });

      const { version } = store.saveField({
        icao: 'KASE',
        field: 'mobileResponse',
        value: 'Dispatched from KDEN, 3.5 hr road.',
        savedBy: 'tech-1',
        basedOnVersion: 1,
      });

      expect(version.content.curfew).toBe('2300-0700 local');
      expect(version.content.groundKit).toBe('GPU yes, no air start');
      expect(version.content.mobileResponse).toBe('Dispatched from KDEN, 3.5 hr road.');
    });

    it('writes the five older company-page fields direct as well', () => {
      // 2026-08-22: one card, one rule. A curfew used to be refused here and
      // sent round the approval route; it now saves like anything else.
      const { version, confirmation } = store.saveField({
        icao: 'KASE',
        field: 'curfew',
        value: '2300-0700 local.',
        savedBy: 'tech-1',
      });

      expect(version.content.curfew).toBe('2300-0700 local.');
      expect(confirmation?.field).toBe('curfew');
    });

    it('refuses reference annotations, which are not a text field', () => {
      // An annotation contradicts published FAA data. That is a different act
      // from writing down what we do, and it keeps its reviewer.
      expect(() =>
        store.saveField({
          icao: 'KASE',
          field: 'referenceAnnotations' as never,
          value: 'the FAA is wrong about this',
          savedBy: 'tech-1',
        }),
      ).toThrow(NotAnEditableFieldError);
      expect(store.getLatest('KASE')).toBeNull();
    });

    it('rejects a save drafted against a stale version, and writes nothing', () => {
      store.saveField({
        icao: 'KASE',
        field: 'groundKit',
        value: 'GPU yes, hangar no',
        savedBy: 'tech-1',
      });

      expect(() =>
        store.saveField({
          icao: 'KASE',
          field: 'partsAndAog',
          value: 'AOG desk [TBC]',
          savedBy: 'tech-2',
          // tech-2 was looking at the page before tech-1 saved.
          basedOnVersion: undefined,
        }),
      ).toThrow(StaleBaseVersionError);

      expect(store.versionsFor('KASE')).toHaveLength(1);
      expect(store.confirmationsFor('KASE')).toHaveLength(1);
    });

    it('publishes but records no confirmation when the save clears the field', () => {
      store.saveField({
        icao: 'KASE',
        field: 'localIndependent',
        value: 'Two A&Ps, piston only.',
        savedBy: 'tech-1',
      });

      const { version, confirmation } = store.saveField({
        icao: 'KASE',
        field: 'localIndependent',
        value: null,
        savedBy: 'tech-1',
        basedOnVersion: 1,
      });

      expect(version.content.localIndependent).toBeNull();
      // Confirming an empty field would assert that nothing is still nothing,
      // and would then age on the review list as if it were a fact.
      expect(confirmation).toBeNull();
      expect(store.confirmationsFor('KASE')).toHaveLength(1);
    });
  });

  describe('reads', () => {
    it('returns null for an unknown airport rather than throwing', () => {
      expect(store.getLatest('KKKK')).toBeNull();
      expect(store.getVersion('KKKK', 1)).toBeNull();
      expect(store.getVersionById('nope')).toBeNull();
    });
  });
});
