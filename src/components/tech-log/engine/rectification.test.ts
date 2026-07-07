import { describe, it, expect } from 'vitest';
import { createRectificationCard, rectificationClosePush } from './rectification';
import { discrepancyTypeFor } from '../integration/pushMapping';
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

  it('links the card to the deferral when a deferralId is given (traceability)', () => {
    const c = createRectificationCard(defect(), { cardId: 'wc-abcd', stepId: 'st-1' }, 'now', 'df-99');
    expect(c.linkedDeferralId).toBe('df-99');
    expect(c.linkedDefectId).toBe('def-1');
  });

  it('leaves linkedDeferralId undefined when raised straight from a defect (no deferral)', () => {
    const c = createRectificationCard(defect(), { cardId: 'wc-abcd', stepId: 'st-1' }, 'now');
    expect(c.linkedDeferralId).toBeUndefined();
  });
});

describe('rectificationClosePush', () => {
  it('closes a WATCHLISTED defect in the CAMP watch lane (DEFERRED-WATCHLIST), not NON-DEFERRED', () => {
    const push = rectificationClosePush(defect({ status: 'WATCHLISTED' }), 'def-2', { technician: 'Sam Mechanic' });
    expect(push.defectStatus).toBe('WATCHLISTED');
    expect(discrepancyTypeFor(push.entityType, push.defectStatus)).toBe('DEFERRED-WATCHLIST');
  });

  it('closes an ordinary OPEN defect NON-DEFERRED, superseding the parent', () => {
    const push = rectificationClosePush(defect(), 'def-2', { technician: 'Sam Mechanic', riiItem: true, inspector: 'Pat Inspector' });
    expect(discrepancyTypeFor(push.entityType, push.defectStatus)).toBe('NON-DEFERRED');
    expect(push.intent).toBe('CLOSE');
    expect(push.supersedesEntityId).toBe('def-1');
    expect(push.entityId).toBe('def-2');
    expect(push.riiItem).toBe(true);
    expect(push.inspector).toBe('Pat Inspector');
  });
});
