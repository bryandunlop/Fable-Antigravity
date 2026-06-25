import { describe, it, expect } from 'vitest';
import { createRectificationCard } from './rectification';
import type { Defect } from '../types';

const defect = (over: Partial<Defect> = {}): Defect => ({
  id: 'def-1', aircraftId: 'ac-1', ataChapter: '32', description: 'MLG downlock light flickering',
  status: 'OPEN', severity: 'HIGH', source: 'PIREP', reportedByOid: 'USR1',
  reportedAtUtc: '2026-06-25T00:00:00.000Z',
  ...over,
} as Defect);

describe('createRectificationCard', () => {
  it('links the card to the defect and carries its ATA + aircraft', () => {
    const c = createRectificationCard(defect(), { cardId: 'wc-abcd', stepId: 'st-1' }, '2026-06-25T01:00:00.000Z');
    expect(c.linkedDefectId).toBe('def-1');
    expect(c.ataChapter).toBe('32');
    expect(c.aircraftId).toBe('ac-1');
    expect(c.cardNumber).toBe('WC-ABCD');
  });

  it('is an OPEN, in-house (MANUAL), corrective card', () => {
    const c = createRectificationCard(defect(), { cardId: 'wc-abcd', stepId: 'st-1' }, 'now');
    expect(c.status).toBe('OPEN');
    expect(c.source).toBe('MANUAL');
    expect(c.scheduled).toBe(false);
    expect(c.riiRequired).toBe(false);
  });

  it('seeds exactly one (incomplete) step so the card is completable', () => {
    const c = createRectificationCard(defect({ description: 'Pack 1 fault' }), { cardId: 'wc-abcd', stepId: 'st-1' }, 'now');
    expect(c.steps).toHaveLength(1);
    expect(c.steps[0].text).toContain('Pack 1 fault');
    expect(c.steps[0].done).toBe(false);
  });
});
