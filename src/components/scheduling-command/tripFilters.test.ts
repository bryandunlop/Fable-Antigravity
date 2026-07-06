import { describe, it, expect } from 'vitest';
import { matchesTripTypeFilter } from './tripFilters';
import type { TripType } from '../../scheduling/engine';

describe('matchesTripTypeFilter', () => {
  const set = (...v: TripType[]) => new Set<TripType>(v);

  it('shows every trip when nothing is selected', () => {
    expect(matchesTripTypeFilter('domestic', set())).toBe(true);
    expect(matchesTripTypeFilter('international', set())).toBe(true);
    expect(matchesTripTypeFilter('dca_dassp', set())).toBe(true);
  });

  it('matches only the selected type', () => {
    expect(matchesTripTypeFilter('international', set('international'))).toBe(true);
    expect(matchesTripTypeFilter('domestic', set('international'))).toBe(false);
  });

  it('unions across a multi-select', () => {
    const f = set('domestic', 'dca_dassp');
    expect(matchesTripTypeFilter('domestic', f)).toBe(true);
    expect(matchesTripTypeFilter('dca_dassp', f)).toBe(true);
    expect(matchesTripTypeFilter('international', f)).toBe(false);
  });
});
