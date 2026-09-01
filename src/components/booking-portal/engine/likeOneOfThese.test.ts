import { describe, expect, it } from 'vitest';
import {
  pastTrips, cloneToDraft, holdDraft, isInquiry, inquiryLabel, tripShapeKey, spanDaysOf,
} from './likeOneOfThese';
import { routeLabel } from './lifecycle';
import { submitBlockers } from './requestReadiness';
import type { Passenger, RequestLeg, TripRequest } from '../types';

const leg = (over: Partial<RequestLeg> = {}): RequestLeg => ({
  id: 'L1', from: 'KCVG', to: 'KTEB', date: '2026-09-10', departLocal: '08:00',
  flexHours: 0, estMinutes: 95, estNm: 480, passengers: [], ...over,
});

const req = (over: Partial<TripRequest> = {}): TripRequest => ({
  id: 'R-1', status: 'confirmed', tier: 1, principalId: 'P1', requestedBy: 'Dana (EA)',
  createdAt: '2026-08-01T12:00:00.000Z', legs: [leg()], extras: [], messages: [], ...over,
});

describe('like one of these', () => {
  it('offers her own past trips, most-repeated first', () => {
    const options = pastTrips([
      req({ id: 'R-1', createdAt: '2026-07-01T00:00:00.000Z' }),
      req({ id: 'R-2', createdAt: '2026-08-01T00:00:00.000Z' }),
      req({ id: 'R-3', createdAt: '2026-08-10T00:00:00.000Z', legs: [leg({ to: 'KPBI' })] }),
    ]);
    expect(options[0].label).toBe('KCVG → KTEB');
    expect(options[0].timesAsked).toBe(2);
    expect(options[0].request.id).toBe('R-2'); // the newest of the repeated shape
  });

  it('does not offer a form she abandoned', () => {
    expect(pastTrips([req({ status: 'draft' })])).toHaveLength(0);
  });

  it('tells an out-and-back apart from a one-way', () => {
    const oneWay = req({ legs: [leg()] });
    const roundTrip = req({ legs: [leg(), leg({ id: 'L2', from: 'KTEB', to: 'KCVG' })] });
    expect(tripShapeKey(oneWay)).not.toBe(tripShapeKey(roundTrip));
    expect(pastTrips([oneWay, roundTrip])).toHaveLength(2);
  });
});

describe('re-dating a past trip', () => {
  const threeDay = req({
    legs: [leg({ date: '2026-09-10' }), leg({ id: 'L2', from: 'KTEB', to: 'KCVG', date: '2026-09-12' })],
  });

  it('keeps the shape — a two-night trip stays two nights wherever she moves it', () => {
    expect(spanDaysOf(threeDay)).toBe(2);
    const draft = cloneToDraft(threeDay, '2026-11-04');
    expect(draft.map(l => l.date)).toEqual(['2026-11-04', '2026-11-06']);
  });

  it('copies the route', () => {
    const draft = cloneToDraft(threeDay, '2026-11-04');
    expect(draft.map(l => `${l.from}>${l.to}`)).toEqual(['KCVG>KTEB', 'KTEB>KCVG']);
  });

  it('does NOT copy the people — who travelled last time is a fact about last time', () => {
    const withPax = req({ legs: [leg({ passengers: [{ passengerId: 'P-9', purpose: 'business' }] })] });
    expect(cloneToDraft(withPax, '2026-11-04')[0].extraPassengerIds).toEqual([]);
  });
});

describe('just hold some days', () => {
  const holdLegs = holdDraft(['2026-10-05', '2026-10-06', '2026-10-07']);

  it('is a request with no route, and that is what makes it an enquiry', () => {
    expect(isInquiry({ legs: holdLegs })).toBe(true);
    expect(holdLegs.every(l => l.from === '' && l.to === '')).toBe(true);
  });

  it('adds no new lifecycle state — it is read off the absence of a route', () => {
    const asRequest = req({ legs: holdLegs.map((l, i) => leg({ id: `H${i}`, from: '', to: '', date: l.date })) });
    expect(asRequest.status).toBe('confirmed'); // any ordinary status; nothing new was invented
    expect(routeLabel(asRequest)).toBe('Holding 2026-10-05 → 2026-10-07');
  });

  it('names a single held day without a spurious arrow', () => {
    expect(inquiryLabel({ legs: [{ date: '2026-10-05' }] })).toBe('Holding 2026-10-05');
  });

  it('can actually be sent — it is not blocked on airports it deliberately has not got', () => {
    const passengers: Passenger[] = [{ id: 'P1', name: 'A. Reyes', kind: 'principal', docs: [], hasFlown: true }];
    const blockers = submitBlockers({ legs: holdLegs, leadPassengerId: 'P1' }, passengers);
    expect(blockers.map(b => b.code)).not.toContain('route');
    expect(blockers.map(b => b.code)).not.toContain('timing');
  });

  it('still blocks a HALF-routed draft, which is a mistake rather than an enquiry', () => {
    const passengers: Passenger[] = [{ id: 'P1', name: 'A. Reyes', kind: 'principal', docs: [], hasFlown: true }];
    const half = [{ ...holdLegs[0], from: 'KCVG' }, holdLegs[1]];
    expect(submitBlockers({ legs: half, leadPassengerId: 'P1' }, passengers).map(b => b.code)).toContain('route');
  });

  it('still needs dates — days are the one thing a held-days request is made of', () => {
    const passengers: Passenger[] = [{ id: 'P1', name: 'A. Reyes', kind: 'principal', docs: [], hasFlown: true }];
    const undated = holdDraft(['']);
    expect(submitBlockers({ legs: undated, leadPassengerId: 'P1' }, passengers).map(b => b.code)).toContain('date');
  });
});
