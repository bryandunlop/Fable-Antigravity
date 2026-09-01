import { describe, expect, it } from 'vitest';
import { portalReducer } from '../BookingPortalContext';
import { initialPortalState } from '../mockData';
import type { RequestLeg } from '../types';

// Written against the real RequestLeg, not cast past it: the D100 branch reshaped this type
// (id/date/departLocal/flexHours/timing/passengers) while this test was on its own branch.
const LEGS: RequestLeg[] = [{
  id: 'L1',
  from: 'KCVG',
  to: 'KTEB',
  date: '2026-09-02',
  departLocal: '08:00',
  flexHours: 0,
  estMinutes: 105,
  estNm: 480,
  passengers: [{ passengerId: 'P-REYES', lead: true, purpose: 'business' }],
}];

function submit(over: { requestedTail?: string } = {}) {
  const state = portalReducer(initialPortalState(), {
    type: 'SUBMIT_REQUEST',
    legs: LEGS,
    principalId: 'P-REYES',
    extras: [],
    ...over,
  });
  return state.requests[0];
}

/**
 * The executive fleet week hands a tail to the request form in router state. It used to be
 * dropped: NewRequest's location.state type did not mention fromExecutive at all, so scheduling
 * never learned which aircraft prompted the ask (LG-311).
 */
describe('the requested tail survives submission', () => {
  it('lands on the request when the executive picked one', () => {
    expect(submit({ requestedTail: 'N2PG' }).requestedTail).toBe('N2PG');
  });

  it('is absent when the EA started from a blank form', () => {
    expect(submit().requestedTail).toBeUndefined();
  });

  it('does not disturb the rest of the request', () => {
    const withTail = submit({ requestedTail: 'N2PG' });
    const without = submit();
    expect(withTail.status).toBe(without.status);
    expect(withTail.legs).toEqual(without.legs);
    expect(withTail.principalId).toBe(without.principalId);
  });
});
