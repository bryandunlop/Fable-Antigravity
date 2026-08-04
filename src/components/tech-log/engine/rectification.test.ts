import { describe, it, expect } from 'vitest';
import { createRectificationCard, rectificationClosePush } from './rectification';
import { discrepancyTypeFor } from '../integration/pushMapping';
import type { Defect } from '../types';

const defect = (over: Partial<Defect> = {}): Defect => ({
  id: 'def-1', aircraftId: 'ac-1', ataChapter: '32', description: 'MLG downlock light flickering',
  status: 'OPEN', source: 'PIREP', reportedByOid: 'USR1',
  occurredAtUtc: '2026-06-25T00:00:00.000Z', reportedAtUtc: '2026-06-25T00:00:00.000Z',
  ...over,
} as Defect);

describe('createRectificationCard', () => {
  it('links the card to the defect and carries its ATA + aircraft', () => {
    const c = createRectificationCard(defect(), { cardId: 'wc-abcd' }, '2026-06-25T01:00:00.000Z');
    expect(c.linkedDefectId).toBe('def-1');
    expect(c.ataChapter).toBe('32');
    expect(c.aircraftId).toBe('ac-1');
    expect(c.cardNumber).toBe('WC-ABCD');
  });

  it('is an OPEN, in-house (MANUAL), corrective card', () => {
    const c = createRectificationCard(defect(), { cardId: 'wc-abcd' }, 'now');
    expect(c.status).toBe('OPEN');
    expect(c.source).toBe('MANUAL');
    expect(c.scheduled).toBe(false);
    expect(c.riiRequired).toBe(false);
  });

  /**
   * D68 — a raised card carries NO procedure of its own. It used to seed one step restating the
   * defect, which read as a task list while being a copy of the title; the procedure lives in the
   * AMM, and the tech records which reference they worked to.
   */
  it('carries the defect in its title and no procedure of its own', () => {
    const c = createRectificationCard(defect({ description: 'Pack 1 fault' }), { cardId: 'wc-abcd' }, 'now');
    expect(c.title).toContain('Pack 1 fault');
    expect(c.references ?? []).toHaveLength(0);
  });

  it('links the card to the deferral when a deferralId is given (traceability)', () => {
    const c = createRectificationCard(defect(), { cardId: 'wc-abcd' }, 'now', 'df-99');
    expect(c.linkedDeferralId).toBe('df-99');
    expect(c.linkedDefectId).toBe('def-1');
  });

  it('leaves linkedDeferralId undefined when raised straight from a defect (no deferral)', () => {
    const c = createRectificationCard(defect(), { cardId: 'wc-abcd' }, 'now');
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
