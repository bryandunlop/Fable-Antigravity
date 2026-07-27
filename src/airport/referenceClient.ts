/**
 * Reads the static airport reference bundle (D48).
 *
 * The index is small enough (340 KB, 80 KB gzipped) to load once and search in
 * memory; per-airport detail is fetched on demand. There is no API call here on
 * purpose — the reference layer must keep working while TL-18 and TL-15 are open.
 */

import type { AirportIndex, AirportIndexEntry, AirportRecord } from './types';

const BUNDLE_BASE = '/airport-data';

export class AirportReferenceClient {
  private index: AirportIndex | null = null;
  private indexRequest: Promise<AirportIndex> | null = null;
  private readonly airports = new Map<string, Promise<AirportRecord | null>>();

  async loadIndex(): Promise<AirportIndex> {
    if (this.index) return this.index;

    // Share one in-flight request so a burst of callers on first render does not
    // fetch the index several times over.
    this.indexRequest ??= (async () => {
      const response = await fetch(`${BUNDLE_BASE}/index.json`);
      if (!response.ok) {
        throw new Error(
          `Airport reference index unavailable (${response.status} ${response.statusText}).`,
        );
      }
      const loaded = (await response.json()) as AirportIndex;
      this.index = loaded;
      return loaded;
    })();

    return this.indexRequest;
  }

  async loadAirport(id: string): Promise<AirportRecord | null> {
    const cached = this.airports.get(id);
    if (cached) return cached;

    const request = (async () => {
      const response = await fetch(`${BUNDLE_BASE}/airports/${encodeURIComponent(id)}.json`);
      if (!response.ok) return null;
      return (await response.json()) as AirportRecord;
    })();

    this.airports.set(id, request);
    return request;
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
