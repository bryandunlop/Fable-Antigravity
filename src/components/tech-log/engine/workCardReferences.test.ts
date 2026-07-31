import { describe, it, expect } from 'vitest';
import { cardReferences, formatReferences, correctiveActionNotes } from './workCardReferences';
import type { WorkCard } from '../types';

const card = (p: Partial<WorkCard> = {}) => p as WorkCard;

describe('the documents a card was worked to (D68)', () => {
  it('reads the reference list', () => {
    const c = card({ references: [{ id: 'r1', ref: 'AMM 32-30-00' }, { id: 'r2', ref: 'CMM 32-41' }] });
    expect(cardReferences(c).map(r => r.ref)).toEqual(['AMM 32-30-00', 'CMM 32-41']);
    expect(formatReferences(c)).toBe('AMM 32-30-00 · CMM 32-41');
  });

  it('ignores blank rows rather than printing a stray separator', () => {
    const c = card({ references: [{ id: 'r1', ref: 'AMM 21-50-00' }, { id: 'r2', ref: '   ' }] });
    expect(formatReferences(c)).toBe('AMM 21-50-00');
  });

  it('has nothing to say about a card with no references', () => {
    expect(cardReferences(card({}))).toEqual([]);
    expect(formatReferences(card({}))).toBe('');
  });

  /**
   * The regression this pins: a signed release points at its card, and the CRS print reads the
   * reference through to it. A pre-D68 card carries the single `ammReference` string, so reading
   * only `references` would blank the reference on a release that already printed one.
   */
  it('still reads a pre-D68 card’s single ammReference', () => {
    expect(formatReferences(card({ ammReference: 'AMM 34-11-00' }))).toBe('AMM 34-11-00');
  });

  it('prefers the list when a card somehow carries both', () => {
    const c = card({ ammReference: 'AMM 00-00-00', references: [{ id: 'r1', ref: 'AMM 32-30-00' }] });
    expect(formatReferences(c)).toBe('AMM 32-30-00');
  });
});

/**
 * CAMP has no manual-reference field anywhere, so the ref rides in `CorrectiveActionNotes` as prose
 * (`ref-camp-discrepancy-writable-fields`). Phase 2 shape only — nothing pushes to CAMP today.
 */
describe('composing CorrectiveActionNotes for CAMP', () => {
  const c = card({ references: [{ id: 'r1', ref: 'AMM 32-30-00' }, { id: 'r2', ref: 'SB 32-114' }] });

  it('prefixes the references onto the work performed', () => {
    expect(correctiveActionNotes(c, 'Replaced the brake control unit.'))
      .toBe('AMM 32-30-00; SB 32-114 — Replaced the brake control unit.');
  });

  it('leaves the notes untouched when there is no reference', () => {
    expect(correctiveActionNotes(card({}), 'Replaced the seal.')).toBe('Replaced the seal.');
    expect(correctiveActionNotes(card({}), '')).toBe('');
  });

  it('emits no dangling separator when the work text is empty', () => {
    expect(correctiveActionNotes(c, '   ')).toBe('AMM 32-30-00; SB 32-114');
  });
});
