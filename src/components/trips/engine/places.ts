// The places register — "Seattle" means Boeing Field, not SeaTac (D105, LG-317).
//
// EAs do not know airport identifiers, and sometimes not the city: they say "the Mehoopany
// plant" or "Seattle" and mean wherever this department actually goes. Scheduling knows.
// So this is a SCHEDULER-CURATED list: a place, the airports it has ever meant, and which
// one is usual. Bryan, 2026-09-01: "just have a list of airports for plants … that we
// typically would use. I think that would be the easiest." The learned-from-history and
// ask-then-seed options were considered and set aside.
//
// Pure: no React, no storage. The store is in data/placesStore.ts.

export type PlaceKind = 'city' | 'plant' | 'site';

export interface PlaceAirport {
  /** ICAO, exact — the same identifier scheduling and the tech log use. */
  icao: string;
  name: string;
  /** The field this department normally uses for this place. Exactly one per place. */
  usual: boolean;
  /** Operator note shown to the EA beside the alternative, e.g. "only if the plant is closed". */
  note?: string;
}

export interface PlaceRecord {
  id: string;
  name: string;
  kind: PlaceKind;
  /** Other things people type for this place: "SEA", "Mehoopany", "the plant". */
  aliases: string[];
  airports: PlaceAirport[];
}

/**
 * The EA's third choice besides the usual and an alternative: "leave it to scheduling —
 * scheduling knows better." Stored where an ICAO would be; never a real identifier.
 */
export const SCHEDULING_DECIDES = 'scheduling-decides';

export const SEED_PLACES: PlaceRecord[] = [
  {
    id: 'pl-cvg', name: 'Cincinnati', kind: 'city', aliases: ['Cincy', 'Lunken', 'home', 'CVG'],
    airports: [
      { icao: 'KLUK', name: 'Cincinnati Municipal (Lunken)', usual: true },
      { icao: 'KCVG', name: 'Cincinnati/Northern Kentucky', usual: false, note: 'only for airline connections' },
    ],
  },
  {
    id: 'pl-sea', name: 'Seattle', kind: 'city', aliases: ['SEA', 'Seattle plant'],
    airports: [
      { icao: 'KBFI', name: 'Boeing Field', usual: true },
      { icao: 'KSEA', name: 'Seattle-Tacoma', usual: false },
      { icao: 'KPAE', name: 'Paine Field (Everett)', usual: false, note: 'north-end sites' },
    ],
  },
  {
    id: 'pl-nyc', name: 'New York', kind: 'city', aliases: ['NYC', 'Manhattan', 'Teterboro'],
    airports: [
      { icao: 'KTEB', name: 'Teterboro', usual: true },
      { icao: 'KHPN', name: 'Westchester County', usual: false },
    ],
  },
  {
    id: 'pl-meh', name: 'Mehoopany plant', kind: 'plant', aliases: ['Mehoopany', 'Wilkes-Barre'],
    airports: [{ icao: 'KAVP', name: 'Wilkes-Barre/Scranton', usual: true }],
  },
  {
    id: 'pl-tab', name: 'Tabler Station plant', kind: 'plant', aliases: ['Tabler Station', 'Martinsburg', 'Inwood'],
    airports: [{ icao: 'KMRB', name: 'Eastern WV Regional (Martinsburg)', usual: true }],
  },
  {
    id: 'pl-bos', name: 'Boston', kind: 'city', aliases: ['BOS', 'Gillette'],
    airports: [
      { icao: 'KBED', name: 'Hanscom Field', usual: true },
      { icao: 'KBOS', name: 'Logan', usual: false },
    ],
  },
  {
    id: 'pl-lon', name: 'London', kind: 'city', aliases: ['LON', 'Weybridge'],
    airports: [
      { icao: 'EGLF', name: 'Farnborough', usual: true },
      { icao: 'EGGW', name: 'Luton', usual: false },
    ],
  },
];

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Places matching what the EA typed — by name, alias or one of the airports' ICAO/name.
 * Prefix matches first, then contains. Empty input is an empty list: no default place.
 */
export function resolvePlace(query: string, places: PlaceRecord[]): PlaceRecord[] {
  const q = norm(query);
  if (!q) return [];
  const score = (p: PlaceRecord): number => {
    const names = [p.name, ...p.aliases].map(norm);
    if (names.some(n => n === q)) return 3;
    if (names.some(n => n.startsWith(q))) return 2;
    if (names.some(n => n.includes(q))) return 1;
    if (p.airports.some(a => norm(a.icao) === q || norm(a.name).includes(q))) return 1;
    return 0;
  };
  return places
    .map(p => ({ p, s: score(p) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name))
    .map(x => x.p);
}

export const usualAirport = (place: PlaceRecord): PlaceAirport | undefined =>
  place.airports.find(a => a.usual);

export const placeById = (places: PlaceRecord[], id: string): PlaceRecord | undefined =>
  places.find(p => p.id === id);

let seq = 0;
const newId = () => `pl-${Date.now().toString(36)}-${(seq += 1)}`;

/** Scheduling's edits. Each returns a new list; nothing mutates. */
export function addPlace(
  places: PlaceRecord[],
  input: { name: string; kind: PlaceKind; aliases?: string[] },
): PlaceRecord[] {
  const name = input.name.trim();
  if (!name) return places;
  return [...places, { id: newId(), name, kind: input.kind, aliases: input.aliases ?? [], airports: [] }];
}

export function addAirport(places: PlaceRecord[], placeId: string, airport: PlaceAirport): PlaceRecord[] {
  return places.map(p => {
    if (p.id !== placeId) return p;
    const icao = airport.icao.trim().toUpperCase();
    if (!icao || p.airports.some(a => a.icao === icao)) return p;
    // The first airport on a place is the usual one whether or not the caller said so.
    const usual = airport.usual || p.airports.length === 0;
    const others = usual ? p.airports.map(a => ({ ...a, usual: false })) : p.airports;
    return { ...p, airports: [...others, { ...airport, icao, usual }] };
  });
}

export function setUsual(places: PlaceRecord[], placeId: string, icao: string): PlaceRecord[] {
  return places.map(p =>
    p.id === placeId ? { ...p, airports: p.airports.map(a => ({ ...a, usual: a.icao === icao })) } : p,
  );
}

/** Human label for a chosen airport code, or the sentinel. */
export function airportLabel(places: PlaceRecord[], icao: string): string {
  if (icao === SCHEDULING_DECIDES) return 'Scheduling decides';
  for (const p of places) {
    const a = p.airports.find(x => x.icao === icao);
    if (a) return `${a.name} · ${a.icao}`;
  }
  return icao;
}
