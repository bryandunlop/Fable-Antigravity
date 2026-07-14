import { describe, it, expect } from 'vitest';
import { hasRevisionMedia } from './RevisionMedia';

describe('hasRevisionMedia (C13)', () => {
  it('is false with no media', () => {
    expect(hasRevisionMedia({})).toBe(false);
    expect(hasRevisionMedia({ images: [], videos: [], links: [] })).toBe(false);
  });
  it('is true when any media array is non-empty', () => {
    expect(hasRevisionMedia({ images: [{ url: 'x' }] })).toBe(true);
    expect(hasRevisionMedia({ videos: [{ url: 'x' }] })).toBe(true);
    expect(hasRevisionMedia({ links: [{ url: 'x', title: 't' }] })).toBe(true);
  });
});
