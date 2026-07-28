/**
 * Reads the static airport reference bundle (D48).
 *
 * The index is small enough (340 KB, 80 KB gzipped) to load once and search in
 * memory; per-airport detail is fetched on demand. There is no API call here on
 * purpose — the reference layer must keep working while TL-18 and TL-15 are open.
 */

import type { AirportIndex, AirportIndexEntry, AirportRecord } from './types';

const BUNDLE_BASE = '/airport-data';

/**
 * `fetch` rejects with a bare `TypeError: Failed to fetch` for every network-level
 * failure — server down, offline, DNS, blocked. That string tells a pilot nothing,
 * and it is what actually reached the screen the first time this broke.
 *
 * A non-OK HTTP status is left alone: the server answered, and its status is
 * genuinely useful.
 */
async function fetchOrExplain(url: string, what: string): Promise<Response> {
  try {
    return await fetch(url);
  } catch (cause) {
    throw new Error(
      `Airport reference data (${what}) could not be reached. The app is running but the ` +
        `server did not respond — check the connection, then try again.`,
      { cause },
    );
  }
}

export class AirportReferenceClient {
  private index: AirportIndex | null = null;
  private indexRequest: Promise<AirportIndex> | null = null;
  private readonly airports = new Map<string, Promise<AirportRecord | null>>();

  async loadIndex(): Promise<AirportIndex> {
    if (this.index) return this.index;

    // Share one in-flight request so a burst of callers on first render does not
    // fetch the index several times over.
    this.indexRequest ??= (async () => {
      const response = await fetchOrExplain(`${BUNDLE_BASE}/index.json`, 'index');
      if (!response.ok) {
        throw new Error(
          `Airport reference index unavailable (${response.status} ${response.statusText}).`,
        );
      }
      const loaded = (await response.json()) as AirportIndex;
      this.index = loaded;
      return loaded;
    })();

    // Do NOT leave a rejected promise memoised — that poisons the client for the
    // rest of the session and makes the failure unrecoverable without a page
    // reload. The app shell comes from a service worker, so it renders fine while
    // the network is down (an iPad on a ramp is the point), and the user's
    // instinct is to retry rather than reload.
    return this.indexRequest.catch((error) => {
      this.indexRequest = null;
      throw error;
    });
  }

  async loadAirport(id: string): Promise<AirportRecord | null> {
    const cached = this.airports.get(id);
    if (cached) return cached;

    const request = (async () => {
      const response = await fetchOrExplain(
        `${BUNDLE_BASE}/airports/${encodeURIComponent(id)}.json`,
        id,
      );
      if (!response.ok) return null;
      return (await response.json()) as AirportRecord;
    })();

    this.airports.set(id, request);
    return request.catch((error) => {
      this.airports.delete(id);
      throw error;
    });
  }

  /** The NASR cycle the loaded bundle came from, or null before it loads. */
  get effectiveDate(): string | null {
    return this.index?.effectiveDate ?? null;
  }

  /**
   * Identifier, name and city search over the loaded index.
   *
   * Exact identifier matches rank first — someone typing "ASE" wants Aspen, not
   * every airport with those letters somewhere in its name.
   */
  search(query: string): AirportIndexEntry[] {
    const airports = this.index?.airports ?? [];
    const needle = query.trim().toUpperCase();
    if (!needle) return airports;

    const scored = airports
      .map((entry) => ({ entry, score: scoreMatch(entry, needle) }))
      .filter((candidate) => candidate.score > 0);

    scored.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
    return scored.map((candidate) => candidate.entry);
  }
}

function scoreMatch(entry: AirportIndexEntry, needle: string): number {
  const icao = entry.icaoId?.toUpperCase() ?? '';
  const id = entry.id.toUpperCase();

  if (id === needle || icao === needle) return 4;
  if (id.startsWith(needle) || icao.startsWith(needle)) return 3;
  if (entry.name.toUpperCase().includes(needle)) return 2;
  if ((entry.city ?? '').toUpperCase().includes(needle)) return 1;
  return 0;
}

/** The app-wide instance. Constructed per-use in tests. */
export const airportReference = new AirportReferenceClient();
