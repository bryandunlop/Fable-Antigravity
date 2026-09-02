import { describe, expect, it } from 'vitest';
import {
  SEED_PLACES,
  resolvePlace,
  usualAirport,
  addPlace,
  addAirport,
  setUsual,
  SCHEDULING_DECIDES,
  type PlaceRecord,
} from './places';

describe('the places register — what an EA types becomes the airport we actually use', () => {
  it('"Seattle" offers Boeing Field as the usual field, with SeaTac and Paine as alternatives', () => {
    const hits = resolvePlace('seattle', SEED_PLACES);
    expect(hits[0].name).toBe('Seattle');
    const usual = usualAirport(hits[0]);
    expect(usual?.icao).toBe('KBFI');
    expect(hits[0].airports.map(a => a.icao)).toEqual(expect.arrayContaining(['KSEA', 'KPAE']));
  });

  it('a plant resolves by its own name and by an alias', () => {
    expect(usualAirport(resolvePlace('Mehoopany plant', SEED_PLACES)[0])?.icao).toBe('KAVP');
    expect(usualAirport(resolvePlace('mehoopany', SEED_PLACES)[0])?.icao).toBe('KAVP');
    expect(usualAirport(resolvePlace('Tabler Station', SEED_PLACES)[0])?.icao).toBe('KMRB');
  });

  it('typing an ICAO finds the place that uses it', () => {
    expect(resolvePlace('KBFI', SEED_PLACES)[0].name).toBe('Seattle');
  });

  it('an unknown place is an empty list, never a guess', () => {
    expect(resolvePlace('Atlantis', SEED_PLACES)).toEqual([]);
    expect(resolvePlace('', SEED_PLACES)).toEqual([]);
  });

  it('every seeded place has exactly one usual airport', () => {
    for (const p of SEED_PLACES) {
      expect(p.airports.filter(a => a.usual).length, p.name).toBe(1);
    }
  });

  it('scheduling adds a place and its airports; setting a new usual clears the old one', () => {
    let places: PlaceRecord[] = addPlace(SEED_PLACES, { name: 'Lima plant', kind: 'plant', aliases: ['Lima'] });
    const lima = places.find(p => p.name === 'Lima plant')!;
    places = addAirport(places, lima.id, { icao: 'KAOH', name: 'Lima Allen County', usual: true });
    places = addAirport(places, lima.id, { icao: 'KDAY', name: 'Dayton International', usual: false });
    places = setUsual(places, lima.id, 'KDAY');
    const after = places.find(p => p.id === lima.id)!;
    expect(after.airports.filter(a => a.usual).map(a => a.icao)).toEqual(['KDAY']);
  });

  it('the sentinel for "leave it to scheduling" is not an ICAO', () => {
    expect(SCHEDULING_DECIDES).not.toMatch(/^K[A-Z]{3}$/);
  });
});
