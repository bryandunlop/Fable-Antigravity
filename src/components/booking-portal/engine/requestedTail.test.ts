import { describe, expect, it } from 'vitest';
import { portalReducer } from '../BookingPortalContext';
import { initialPortalState } from '../mockData';
import type { RequestLeg } from '../types';

const LEGS: RequestLeg[] = [{
  from: 'KCVG', to: 'KTEB', dateLocal: '2026-09-02', timeLocal: '08:00',
  estMinutes: 105, passengerIds: ['P-REYES'], leadId: 'P-REYES', purposes: {},
} as RequestLeg];

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
