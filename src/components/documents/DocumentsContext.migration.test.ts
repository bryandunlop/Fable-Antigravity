import { describe, it, expect } from 'vitest';
import { documentsStateIsStale, DATA_VERSION } from './DocumentsContext';

describe('documentsStateIsStale', () => {
  it('flags a legacy revision that has content but no sections', () => {
    const legacy = { revisions: [{ id: 'SOP-001-r1', content: '# Old blob' }] };
    expect(documentsStateIsStale(legacy)).toBe(true);
  });

  it('accepts a current-shape state with a sections array', () => {
    const current = { revisions: [{ id: 'SOP-001-r1', sections: [] }] };
    expect(documentsStateIsStale(current)).toBe(false);
  });

  it('flags non-object / missing-revisions payloads', () => {
    expect(documentsStateIsStale(null)).toBe(true);
    expect(documentsStateIsStale({})).toBe(true);
    expect(documentsStateIsStale({ revisions: 'nope' })).toBe(true);
  });

  it('DATA_VERSION was bumped for this slice', () => {
    expect(DATA_VERSION).toBe('2026-07-11-blocks-v1');
  });
});
