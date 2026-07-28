import { describe, expect, it } from 'vitest';

import { memoryStorage } from '../../notifications/storage';
import { PersistentCompanyAirportPageStore } from './persistence';
import type { CompanyAirportPageContent } from './pageStore';

const blank: CompanyAirportPageContent = {
  ppr: null,
  curfew: null,
  opsNotes: null,
  fboPreference: null,
  rampHandlingLimits: null,
  referenceAnnotations: [],
};

function content(overrides: Partial<CompanyAirportPageContent>): CompanyAirportPageContent {
  return { ...blank, ...overrides };
}

function makeStore(storage = memoryStorage()) {
  let n = 0;
  let t = 0;
  return {
    storage,
    store: new PersistentCompanyAirportPageStore(storage, {
      now: () => new Date(Date.UTC(2026, 6, 27, 12, 0, t++)).toISOString(),
      nextId: () => `id-${++n}`,
    }),
  };
}

describe('PersistentCompanyAirportPageStore', () => {
  it('writes a published version through immediately, with no debounce to outrun', () => {
    const { storage, store } = makeStore();

    store.publish({ icao: 'KASE', content: content({ ppr: 'PPR required' }), publishedBy: 'cp-1' });

    // A published company page is a record someone may be asked about. The repo's
    // own rule for regulated writes is synchronous persistence, so the bytes must
    // be in storage the instant publish() returns — not 300 ms later, by which
    // time a navigation may have cancelled the write.
    const raw = storage.getItem('airport-company-pages');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).versions).toHaveLength(1);
  });

  it('writes an acknowledgement through immediately', () => {
    const { storage, store } = makeStore();
    store.publish({ icao: 'KASE', content: blank, publishedBy: 'cp-1' });

    store.acknowledge({ icao: 'KASE', crewOid: 'crew-1', nasrCycleEffDate: '2026-07-09' });

    expect(JSON.parse(storage.getItem('airport-company-pages') as string).acknowledgements).toHaveLength(1);
  });

  it('restores published versions across a reload', () => {
    const storage = memoryStorage();
    const first = makeStore(storage);
    first.store.publish({
      icao: 'KASE',
      content: content({ ppr: 'PPR required 24h in advance' }),
      publishedBy: 'cp-1',
    });

    const reloaded = makeStore(storage);

    expect(reloaded.store.getLatest('KASE')?.content.ppr).toBe('PPR required 24h in advance');
  });

  it('keeps version numbering monotonic across a reload', () => {
    const storage = memoryStorage();
    makeStore(storage).store.publish({ icao: 'KASE', content: blank, publishedBy: 'cp-1' });

    const reloaded = makeStore(storage);
    const next = reloaded.store.publish({
      icao: 'KASE',
      content: content({ ppr: 'second' }),
      publishedBy: 'cp-1',
      basedOnVersion: 1,
    });

    // Restarting must not restart the count — a second version 1 would break the
    // pinning FK that D47 exists for.
    expect(next.version).toBe(2);
  });

  it('keeps an acknowledgement pinned to the right version across a reload', () => {
    const storage = memoryStorage();
    const first = makeStore(storage);
    first.store.publish({ icao: 'KASE', content: content({ ppr: 'v1 text' }), publishedBy: 'cp-1' });
    const ack = first.store.acknowledge({
      icao: 'KASE',
      crewOid: 'crew-1',
      nasrCycleEffDate: '2026-07-09',
    });

    const reloaded = makeStore(storage);
    reloaded.store.publish({
      icao: 'KASE',
      content: content({ ppr: 'v2 text' }),
      publishedBy: 'cp-1',
      basedOnVersion: 1,
    });

    expect(reloaded.store.getVersionById(ack.companyPageVersionId)?.content.ppr).toBe('v1 text');
  });

  it('starts empty rather than throwing when storage holds corrupt JSON', () => {
    const storage = memoryStorage();
    storage.setItem('airport-company-pages', '{ this is not json');

    const { store } = makeStore(storage);

    expect(store.getLatest('KASE')).toBeNull();
  });

  it('does not persist a rejected publish', () => {
    const { storage, store } = makeStore();
    store.publish({ icao: 'KASE', content: blank, publishedBy: 'cp-1' });

    expect(() =>
      store.publish({ icao: 'KASE', content: blank, publishedBy: 'cp-2' }),
    ).toThrow();

    expect(JSON.parse(storage.getItem('airport-company-pages') as string).versions).toHaveLength(1);
  });
});
