import { describe, it, expect } from 'vitest';
import { airportTabsForRoles, activeAirportTab } from './AirportsShell';

describe('airportTabsForRoles', () => {
  it('gives a plain pilot only the directory — they cannot open the officer routes', () => {
    const tabs = airportTabsForRoles('pilot');
    expect(tabs.map((t) => t.label)).toEqual(['Directory']);
  });

  it('gives officers all four tabs', () => {
    for (const role of ['airport-evaluator', 'chief-pilot', 'admin']) {
      expect(airportTabsForRoles(role).map((t) => t.label)).toEqual([
        'Directory',
        'Needs review',
        'Proposals',
        'Rules & flags',
      ]);
    }
  });

  // The dev "Pilot" login carries additionalRoles [chief-pilot, airport-evaluator],
  // so an additional role must open the officer tabs or that user loses screens
  // they can legitimately reach.
  it('honours an officer role held as an additional role', () => {
    expect(airportTabsForRoles('pilot', ['airport-evaluator']).length).toBe(4);
  });
});

describe('activeAirportTab', () => {
  const officer = airportTabsForRoles('admin');

  it('lights the exact tab for each route', () => {
    expect(activeAirportTab('/airport-evaluations', officer)).toBe('/airport-evaluations');
    expect(activeAirportTab('/airport-evaluations/worklist', officer)).toBe('/airport-evaluations/worklist');
    expect(activeAirportTab('/airport-evaluations/flags', officer)).toBe('/airport-evaluations/flags');
  });

  // Directory is the shortest path, so a naive startsWith would claim every route.
  it('prefers the longest match so a sub-route does not fall back to Directory', () => {
    expect(activeAirportTab('/airport-evaluations/review', officer)).toBe('/airport-evaluations/review');
  });

  it('keeps the owning tab lit on a detail route beneath it', () => {
    expect(activeAirportTab('/airport-evaluations/worklist/KTEB', officer)).toBe(
      '/airport-evaluations/worklist',
    );
  });

  it('does not light a tab the role cannot see', () => {
    const crew = airportTabsForRoles('pilot');
    expect(activeAirportTab('/airport-evaluations/flags', crew)).toBeUndefined();
  });

  it('returns undefined away from the airport surfaces', () => {
    expect(activeAirportTab('/tech-log', officer)).toBeUndefined();
    // A sibling path that merely shares a prefix must not match.
    expect(activeAirportTab('/airport-services', officer)).toBeUndefined();
  });
});
