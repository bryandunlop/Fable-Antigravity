import { describe, it, expect } from 'vitest';
import type { Personnel } from '../../tech-log/types';
import { applyRedaction, detectNames, hasUnredactedRosterNames, rolePhraseFor } from './redaction';

const person = (oid: string, displayName: string, role: string): Personnel =>
  ({ oid, displayName, role, active: true }) as Personnel;

const ROSTER: Personnel[] = [
  person('USR001', 'John Smith', 'PILOT'),
  person('USR008', 'Tom Parker', 'MAINTENANCE'),
  person('USR002', 'Sarah Wilson', 'DOM'),
];

describe('redaction — role phrases', () => {
  it('maps known roles to reader-facing phrases', () => {
    expect(rolePhraseFor('PILOT')).toBe('the PIC');
    expect(rolePhraseFor('MAINTENANCE')).toBe('the assigned technician');
    expect(rolePhraseFor('scheduling')).toBe('the scheduler');
  });
  it('falls back to a lower-cased role label', () => {
    expect(rolePhraseFor('LOADMASTER')).toBe('the loadmaster');
    expect(rolePhraseFor(undefined)).toBe('the individual');
  });
});

describe('redaction — roster detection', () => {
  it('finds roster names with their oid, role, and suggested phrase', () => {
    const hits = detectNames('John Smith returned; Tom Parker isolated the sensor.', ROSTER);
    expect(hits.map(h => h.text)).toEqual(['John Smith', 'Tom Parker']);
    expect(hits[0]).toMatchObject({ oid: 'USR001', role: 'PILOT', suggestion: 'the PIC', source: 'ROSTER' });
    expect(hits[1]).toMatchObject({ oid: 'USR008', suggestion: 'the assigned technician' });
  });

  it('returns matches in order of first appearance', () => {
    const hits = detectNames('Sarah Wilson briefed the crew after John Smith landed.', ROSTER);
    expect(hits.map(h => h.text)).toEqual(['Sarah Wilson', 'John Smith']);
  });

  it('does not flag ALL-CAPS tokens like tail numbers or airport codes', () => {
    expect(detectNames('N1PG returned to KTEB after an AOG at TEB.', ROSTER)).toHaveLength(0);
  });
});

describe('redaction — heuristic detection', () => {
  it('flags a hand-typed full name not on the roster (no oid)', () => {
    const hits = detectNames('The vendor rep Dave Kowalski quoted 48 hours.', ROSTER);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ text: 'Dave Kowalski', source: 'HEURISTIC', suggestion: 'the individual' });
    expect(hits[0].oid).toBeUndefined();
  });

  it('does not double-report a roster name as a heuristic hit', () => {
    const hits = detectNames('John Smith made the call.', ROSTER);
    expect(hits).toHaveLength(1);
    expect(hits[0].source).toBe('ROSTER');
  });
});

describe('redaction — submit gate + apply', () => {
  it('only roster names block submit; a heuristic-only text passes the roster gate', () => {
    expect(hasUnredactedRosterNames('John Smith made the call.', ROSTER)).toBe(true);
    expect(hasUnredactedRosterNames('Dave Kowalski quoted 48 hours.', ROSTER)).toBe(false);
    expect(hasUnredactedRosterNames('The PIC made the call.', ROSTER)).toBe(false);
  });

  it('applyRedaction replaces every occurrence of the name', () => {
    const out = applyRedaction('John Smith said John Smith would return.', 'John Smith', 'the PIC');
    expect(out).toBe('the PIC said the PIC would return.');
  });
});
