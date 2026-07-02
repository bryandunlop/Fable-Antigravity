import { describe, it, expect } from 'vitest';
import { completeFratOnLeg, markAirportReviewedOnLeg, submitFuelOnLeg, saveFratDraftOnLeg } from './preflightActions';
import type { Trip, TripLeg, TechLogAction } from './types';

const leg: TripLeg = {
  id: 'leg-1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
  departureTimeUtc: '2026-07-10T18:00:00.000Z', arrivalTimeUtc: '2026-07-10T20:00:00.000Z',
  fratStatus: 'NOT_STARTED', airportReviewed: false,
};
const trip: Trip = {
  id: 'trip-1', tripNumber: 'GFO-100', aircraftId: 'ac-1', name: 'Demo', status: 'OPEN',
  legs: [leg], flightLogIds: [], createdByOid: 'oid-sys', createdAtUtc: '2026-07-01T00:00:00.000Z',
} as Trip;

function collect() {
  const actions: TechLogAction[] = [];
  return { dispatch: (a: TechLogAction) => actions.push(a), actions };
}

describe('completeFratOnLeg', () => {
  it('dispatches EDIT_TRIP with the leg FRAT completed + an audit entry', () => {
    const { dispatch, actions } = collect();
    completeFratOnLeg({ dispatch, newId: (p) => `${p}-1`, trip, leg, actorOid: 'oid-pic', totalScore: 12 });
    const edit = actions.find((a) => a.type === 'EDIT_TRIP') as Extract<TechLogAction, { type: 'EDIT_TRIP' }>;
    const patched = edit.payload.legs!.find((l) => l.id === 'leg-1')!;
    expect(patched.fratStatus).toBe('COMPLETED');
    expect(patched.fratScore).toBe(12);
    expect(actions.some((a) => a.type === 'ADD_AUDIT')).toBe(true);
  });

  it('clears any saved draft on completion', () => {
    const drafted: TripLeg = {
      ...leg, fratStatus: 'IN_PROGRESS',
      fratDraft: { selections: [[true]], savedAtUtc: '2026-07-02T12:00:00.000Z' },
    };
    const { dispatch, actions } = collect();
    completeFratOnLeg({ dispatch, newId: (p) => `${p}-1`, trip: { ...trip, legs: [drafted] }, leg: drafted, actorOid: 'oid-pic', totalScore: 8 });
    const edit = actions.find((a) => a.type === 'EDIT_TRIP') as Extract<TechLogAction, { type: 'EDIT_TRIP' }>;
    const patched = edit.payload.legs!.find((l) => l.id === 'leg-1')!;
    expect(patched.fratStatus).toBe('COMPLETED');
    expect(patched.fratDraft).toBeUndefined();
  });
});

describe('saveFratDraftOnLeg', () => {
  it('stores the selection matrix and marks the leg IN_PROGRESS with an audit entry', () => {
    const { dispatch, actions } = collect();
    saveFratDraftOnLeg({
      dispatch, newId: (p) => `${p}-1`, trip, leg, actorOid: 'oid-pic',
      selections: [[true, false], [false]], mitigationNotes: 'wx watch',
      nowUtc: '2026-07-02T12:00:00.000Z',
    });
    const edit = actions.find((a) => a.type === 'EDIT_TRIP') as Extract<TechLogAction, { type: 'EDIT_TRIP' }>;
    const patched = edit.payload.legs!.find((l) => l.id === 'leg-1')!;
    expect(patched.fratStatus).toBe('IN_PROGRESS');
    expect(patched.fratDraft).toEqual({
      selections: [[true, false], [false]], mitigationNotes: 'wx watch',
      savedAtUtc: '2026-07-02T12:00:00.000Z',
    });
    expect(actions.some((a) => a.type === 'ADD_AUDIT')).toBe(true);
  });
});

describe('markAirportReviewedOnLeg', () => {
  it('sets airportReviewed true via EDIT_TRIP', () => {
    const { dispatch, actions } = collect();
    markAirportReviewedOnLeg({ dispatch, newId: (p) => `${p}-1`, trip, leg, actorOid: 'oid-pic' });
    const edit = actions.find((a) => a.type === 'EDIT_TRIP') as Extract<TechLogAction, { type: 'EDIT_TRIP' }>;
    expect(edit.payload.legs!.find((l) => l.id === 'leg-1')!.airportReviewed).toBe(true);
  });
});

describe('submitFuelOnLeg', () => {
  it('rejects when less than 4 hours to departure', () => {
    const near: TripLeg = { ...leg, departureTimeUtc: '2026-07-10T20:00:00.000Z' };
    const { dispatch } = collect();
    const r = submitFuelOnLeg({ dispatch, newId: (p) => `${p}-1`, trip: { ...trip, legs: [near] }, leg: near, actorOid: 'oid-pic', lbs: 5000, nowMs: Date.parse('2026-07-10T17:00:00.000Z') });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/4 hours/i) });
  });

  it('rejects a non-positive quantity', () => {
    const { dispatch } = collect();
    const r = submitFuelOnLeg({ dispatch, newId: (p) => `${p}-1`, trip, leg, actorOid: 'oid-pic', lbs: 0, nowMs: Date.parse('2026-07-09T00:00:00.000Z') });
    expect(r.ok).toBe(false);
  });

  it('accepts a valid request and stamps a fuelRequestId', () => {
    const { dispatch, actions } = collect();
    const r = submitFuelOnLeg({ dispatch, newId: (p) => `${p}-1`, trip, leg, actorOid: 'oid-pic', lbs: 5000, nowMs: Date.parse('2026-07-09T00:00:00.000Z') });
    expect(r.ok).toBe(true);
    const edit = actions.find((a) => a.type === 'EDIT_TRIP') as Extract<TechLogAction, { type: 'EDIT_TRIP' }>;
    expect(edit.payload.legs!.find((l) => l.id === 'leg-1')!.fuelRequestId).toBe('fr-1');
  });
});
