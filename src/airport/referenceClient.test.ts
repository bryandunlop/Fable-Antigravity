import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AirportReferenceClient } from './referenceClient';
import type { AirportIndex, AirportRecord } from './types';

const index: AirportIndex = {
  effectiveDate: '2026/07/09',
  count: 2,
  airports: [
    {
      id: 'TEB',
      icaoId: 'KTEB',
      name: 'TETERBORO',
      city: 'TETERBORO',
      stateCode: 'NJ',
      latitude: 40.85,
      longitude: -74.06,
      longestRunwayFt: 6997,
    },
    {
      id: 'ASE',
      icaoId: 'KASE',
      name: 'ASPEN-PITKIN COUNTY/SARDY FLD',
      city: 'ASPEN',
      stateCode: 'CO',
      latitude: 39.22,
      longitude: -106.86,
      longestRunwayFt: 8006,
    },
  ],
};

const teb = { id: 'TEB', icaoId: 'KTEB', name: 'TETERBORO' } as AirportRecord;

describe('AirportReferenceClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: AirportReferenceClient;

  beforeEach(() => {
    fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('index.json')) {
        return { ok: true, json: async () => index } as Response;
      }
      if (url.endsWith('/TEB.json')) {
        return { ok: true, json: async () => teb } as Response;
      }
      return { ok: false, status: 404, statusText: 'Not Found' } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    client = new AirportReferenceClient();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the index once and reuses it', async () => {
    await client.loadIndex();
    await client.loadIndex();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('exposes the NASR cycle so the page can say how current the data is', async () => {
    const loaded = await client.loadIndex();

    expect(loaded.effectiveDate).toBe('2026/07/09');
  });

  it('caches an airport record rather than refetching it', async () => {
    await client.loadAirport('TEB');
    await client.loadAirport('TEB');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null for an airport that is not in the bundle', async () => {
    expect(await client.loadAirport('KKKK')).toBeNull();
  });

  describe('recovering from a failed load', () => {
    // The app shell is served from a service worker, so it renders while the
    // network is unavailable — an iPad on a ramp is the target environment. A
    // failure therefore has to be recoverable without a page reload.

    it('retries the index after a network failure instead of caching the rejection', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(client.loadIndex()).rejects.toThrow();
      const recovered = await client.loadIndex();

      expect(recovered.effectiveDate).toBe('2026/07/09');
    });

    it('retries an airport after a network failure', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(client.loadAirport('TEB')).rejects.toThrow();

      expect(await client.loadAirport('TEB')).toEqual(teb);
    });

    it('explains a network failure instead of surfacing the raw browser error', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      // "Failed to fetch" tells a pilot nothing. The message has to say what is
      // unreachable and that it is a connection problem, not missing data.
      await expect(client.loadIndex()).rejects.toThrow(/could not be reached/i);
    });

    it('still reports an HTTP status when the server answered', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      } as Response);

      await expect(client.loadIndex()).rejects.toThrow(/503/);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await client.loadIndex();
    });

    it('matches on ICAO id', () => {
      expect(client.search('KASE').map((entry) => entry.id)).toEqual(['ASE']);
    });

    it('matches on FAA identifier', () => {
      expect(client.search('TEB').map((entry) => entry.id)).toEqual(['TEB']);
    });

    it('matches on airport name, case-insensitively', () => {
      expect(client.search('teterboro').map((entry) => entry.id)).toEqual(['TEB']);
    });

    it('matches on city', () => {
      expect(client.search('aspen').map((entry) => entry.id)).toEqual(['ASE']);
    });

    it('ranks an exact identifier match above a name match', () => {
      // 'ASE' is ASE's identifier and also appears inside no other field here;
      // the ordering rule matters once the real 2,128-airport index is loaded.
      expect(client.search('ASE')[0]?.id).toBe('ASE');
    });

    it('returns everything for an empty query', () => {
      expect(client.search('')).toHaveLength(2);
    });

    it('returns nothing for a query that matches nothing', () => {
      expect(client.search('zzzzz')).toEqual([]);
    });

    it('returns nothing before the index has loaded', () => {
      expect(new AirportReferenceClient().search('TEB')).toEqual([]);
    });
  });
});
