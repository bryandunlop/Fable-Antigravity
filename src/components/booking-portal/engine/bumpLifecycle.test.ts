import { describe, expect, it } from 'vitest';
import { portalReducer } from '../BookingPortalContext';
import { canTransition } from './lifecycle';
import { initialPortalState } from '../mockData';
import type { PortalState } from '../types';

function withApproved(): { state: PortalState; id: string } {
  const base = initialPortalState();
  const id = base.requests[0].id;
  const state = { ...base, requests: base.requests.map((r, i) => (i === 0 ? { ...r, status: 'approved' as const } : r)) };
  return { state, id };
}

describe('bumping an approved trip', () => {
  it('is a legal transition — approved goes back to pending, and only that way', () => {
    expect(canTransition('approved', 'pending')).toBe(true);
    expect(canTransition('confirmed', 'pending')).toBe(false);
    expect(canTransition('declined', 'pending')).toBe(false);
  });

  it('reverts the request to pending and records who authorised it', () => {
    const { state, id } = withApproved();
    const next = portalReducer(state, { type: 'BUMP_REQUEST', id, authorizedBy: 'M. Alvarez', reason: 'Board trip' });
    const r = next.requests.find(x => x.id === id)!;
    expect(r.status).toBe('pending');
    expect(r.bumpedBy?.authorizedBy).toBe('M. Alvarez');
  });

  it('refuses a bump with nobody’s name on it', () => {
    const { state, id } = withApproved();
    expect(portalReducer(state, { type: 'BUMP_REQUEST', id, authorizedBy: '   ', reason: 'Board trip' })).toBe(state);
  });

  it('keeps the reason unreadable until scheduling marks the call made', () => {
    const { state, id } = withApproved();
    const bumped = portalReducer(state, { type: 'BUMP_REQUEST', id, authorizedBy: 'M. Alvarez', reason: 'Board trip' });
    expect(bumped.requests.find(x => x.id === id)!.bumpedBy!.reasonVisibleAt).toBeNull();
    const told = portalReducer(bumped, { type: 'DISCLOSE_BUMP_REASON', id });
    expect(told.requests.find(x => x.id === id)!.bumpedBy!.reasonVisibleAt).not.toBeNull();
  });

  it('cannot bump something that was never approved', () => {
    const base = initialPortalState();
    const pendingId = base.requests.find(r => r.status === 'pending')?.id;
    if (!pendingId) return;
    expect(portalReducer(base, { type: 'BUMP_REQUEST', id: pendingId, authorizedBy: 'X', reason: 'y' })).toBe(base);
  });
});
