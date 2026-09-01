import { describe, expect, it } from 'vitest';
import { buildOwedBoard, owedFor, OWED_LABELS } from './owedAnswers';
import { portalReducer } from '../BookingPortalContext';
import { initialPortalState } from '../mockData';
import { holdDraft } from './likeOneOfThese';
import type { PortalState, RequestLeg, TripRequest } from '../types';

const NOW = Date.parse('2026-09-20T12:00:00.000Z');

const leg = (over: Partial<RequestLeg> = {}): RequestLeg => ({
  id: 'L1', from: 'KCVG', to: 'KTEB', date: '2026-10-10', departLocal: '08:00',
  flexHours: 0, estMinutes: 95, estNm: 480, passengers: [], ...over,
});

const req = (over: Partial<TripRequest> = {}): TripRequest => ({
  id: 'R-1', status: 'pending', tier: 1, principalId: 'P1', requestedBy: 'Dana (EA)',
  createdAt: '2026-09-18T12:00:00.000Z', legs: [leg()], extras: [], messages: [], ...over,
});

describe('who owes the next move', () => {
  it('an undecided request is mine', () => {
    expect(owedFor(req(), NOW).owedBy).toBe('me');
  });

  it('a declined one is hers to change or drop', () => {
    expect(owedFor(req({ status: 'declined' }), NOW).owedBy).toBe('them');
  });

  it('an approved request with no aircraft on it is MINE — approving binds nothing', () => {
    const o = owedFor(req({ status: 'approved' }), NOW);
    expect(o.owedBy).toBe('me');
    expect(o.what).toContain('no aircraft assigned');
  });

  it('a confirmed and placed trip is waiting on nobody, and is still shown', () => {
    const o = owedFor(req({ status: 'confirmed', assignedTail: 'N1PG' }), NOW);
    expect(o.owedBy).toBe('nobody');
    expect(o.what).toBe('Confirmed and placed');
  });

  it('a confirmed trip with NO aircraft is not "nobody" — it only looks settled', () => {
    expect(owedFor(req({ status: 'confirmed' }), NOW).owedBy).toBe('me');
  });

  it('an unanswered counter is hers, even though the request is still pending', () => {
    const o = owedFor(req({ counter: { dates: ['2026-10-12'], note: '', by: 'R. Calloway', atUtc: '2026-09-19T00:00:00Z' } }), NOW);
    expect(o.owedBy).toBe('them');
  });

  it('an answered counter hands it back', () => {
    const o = owedFor(req({ counter: { dates: ['2026-10-12'], note: '', by: 'R', atUtc: '2026-09-19T00:00:00Z', answeredAt: '2026-09-19T10:00:00Z', accepted: false } }), NOW);
    expect(o.owedBy).toBe('me');
  });

  it('an enquiry with no route is mine to answer, not hers to finish', () => {
    const held = holdDraft(['2026-10-05']).map((l, i) => leg({ id: `H${i}`, from: '', to: '', date: l.date }));
    expect(owedFor(req({ legs: held }), NOW).what).toContain('Enquiry');
    expect(owedFor(req({ legs: held }), NOW).owedBy).toBe('me');
  });
});

describe('the board', () => {
  it('keeps a deliberate "waiting on nobody" band rather than dropping it', () => {
    const board = buildOwedBoard([
      req({ id: 'R-1' }),
      req({ id: 'R-2', status: 'declined' }),
      req({ id: 'R-3', status: 'confirmed', assignedTail: 'N5PG' }),
    ], NOW);
    expect(board.me.map(o => o.request.id)).toEqual(['R-1']);
    expect(board.them.map(o => o.request.id)).toEqual(['R-2']);
    expect(board.nobody.map(o => o.request.id)).toEqual(['R-3']);
    expect(OWED_LABELS.nobody).toBe('Waiting on nobody');
  });

  it('is oldest first, because silence is what the list is for', () => {
    const board = buildOwedBoard([
      req({ id: 'NEW', createdAt: '2026-09-19T12:00:00.000Z' }),
      req({ id: 'OLD', createdAt: '2026-09-01T12:00:00.000Z' }),
    ], NOW);
    expect(board.me.map(o => o.request.id)).toEqual(['OLD', 'NEW']);
    expect(board.me[0].ageDays).toBe(19);
  });

  it('ages from the last message, not from when it was first asked', () => {
    const chatty = req({
      createdAt: '2026-09-01T12:00:00.000Z',
      messages: [{ id: 'M1', from: 'ea', author: 'Dana', at: '2026-09-19T12:00:00.000Z', text: 'any news?' }],
    });
    expect(owedFor(chatty, NOW).ageDays).toBe(1);
  });
});

function firstWithStatus(state: PortalState, status: TripRequest['status']): string {
  return state.requests.find(r => r.status === status)!.id;
}

describe('the two verbs that did not exist', () => {
  it('assigns an aircraft, which approving never did', () => {
    const base = initialPortalState();
    const id = firstWithStatus(base, 'approved');
    expect(base.requests.find(r => r.id === id)!.assignedTail).toBeUndefined();
    const next = portalReducer(base, { type: 'ASSIGN_TAIL', id, tail: 'N5PG' });
    expect(next.requests.find(r => r.id === id)!.assignedTail).toBe('N5PG');
  });

  it('refuses metal that is not one of the four', () => {
    const base = initialPortalState();
    const id = firstWithStatus(base, 'approved');
    expect(portalReducer(base, { type: 'ASSIGN_TAIL', id, tail: 'N650GS' })).toBe(base); // not fleet
    expect(portalReducer(base, { type: 'ASSIGN_TAIL', id, tail: 'N3PG' })).toBe(base);   // provisional G800
    expect(portalReducer(base, { type: 'ASSIGN_TAIL', id, tail: 'N7PG' })).toBe(base);   // demo-only
  });

  it('counters WITHOUT declining — the request keeps its id, place and thread', () => {
    const base = initialPortalState();
    const id = firstWithStatus(base, 'pending');
    const before = base.requests.find(r => r.id === id)!;
    const next = portalReducer(base, { type: 'COUNTER_OFFER', id, dates: ['2026-10-12'], note: 'Aircraft frees up' });
    const after = next.requests.find(r => r.id === id)!;
    expect(after.status).toBe(before.status);
    expect(after.status).not.toBe('declined');
    expect(after.counter!.dates).toEqual(['2026-10-12']);
    expect(after.messages.length).toBe(before.messages.length + 1);
  });

  it('moves the trip onto the offered days when she accepts', () => {
    const base = initialPortalState();
    const id = firstWithStatus(base, 'pending');
    const offered = portalReducer(base, { type: 'COUNTER_OFFER', id, dates: ['2026-10-12'], note: '' });
    const accepted = portalReducer(offered, { type: 'ANSWER_COUNTER', id, accept: true });
    const after = accepted.requests.find(r => r.id === id)!;
    expect(after.legs.every(l => l.date === '2026-10-12')).toBe(true);
    expect(after.counter!.accepted).toBe(true);
  });

  it('changes nothing about the trip when she declines the counter', () => {
    const base = initialPortalState();
    const id = firstWithStatus(base, 'pending');
    const dates = base.requests.find(r => r.id === id)!.legs.map(l => l.date);
    const offered = portalReducer(base, { type: 'COUNTER_OFFER', id, dates: ['2026-10-12'], note: '' });
    const declined = portalReducer(offered, { type: 'ANSWER_COUNTER', id, accept: false });
    const after = declined.requests.find(r => r.id === id)!;
    expect(after.legs.map(l => l.date)).toEqual(dates);
    expect(after.counter!.accepted).toBe(false);
  });

  it('cannot answer the same counter twice', () => {
    const base = initialPortalState();
    const id = firstWithStatus(base, 'pending');
    const offered = portalReducer(base, { type: 'COUNTER_OFFER', id, dates: ['2026-10-12'], note: '' });
    const once = portalReducer(offered, { type: 'ANSWER_COUNTER', id, accept: true });
    expect(portalReducer(once, { type: 'ANSWER_COUNTER', id, accept: false })).toBe(once);
  });
});
