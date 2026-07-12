import { describe, it, expect } from 'vitest';
import { nextFirRef } from './refs';

describe('FIR reference numbers (FIR-YYYY-NNN, sequential per year)', () => {
  it('starts a fresh year at 001', () => {
    expect(nextFirRef([], '2026-07-11T12:00:00.000Z')).toBe('FIR-2026-001');
  });

  it('increments past the highest existing number for the same year', () => {
    expect(nextFirRef(['FIR-2026-001', 'FIR-2026-002'], '2026-07-11T12:00:00.000Z')).toBe('FIR-2026-003');
  });

  it('is gap-tolerant: uses max + 1, not count + 1', () => {
    expect(nextFirRef(['FIR-2026-001', 'FIR-2026-007'], '2026-07-11T12:00:00.000Z')).toBe('FIR-2026-008');
  });

  it('resets the sequence when the year rolls over', () => {
    expect(nextFirRef(['FIR-2025-014'], '2026-01-02T12:00:00.000Z')).toBe('FIR-2026-001');
  });

  it('ignores refs from other years and malformed refs', () => {
    expect(nextFirRef(['FIR-2025-014', 'garbage', 'FIR-2026-004'], '2026-07-11T12:00:00.000Z')).toBe('FIR-2026-005');
  });

  it('keeps counting past 999 without breaking the format', () => {
    expect(nextFirRef(['FIR-2026-999'], '2026-07-11T12:00:00.000Z')).toBe('FIR-2026-1000');
  });
});
