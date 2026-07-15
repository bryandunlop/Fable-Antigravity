import { describe, it, expect } from 'vitest';
import { completeFratOnLeg, markAirportReviewedOnLeg, submitFuelOnLeg, saveFratDraftOnLeg, setPlannedFuelOnLeg, markFuelFinalOnLeg } from './preflightActions';
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

describe('setPlannedFuelOnLeg', () => {
  it('dispatches EDIT_TRIP with the leg planned fuel set', () => {
    const { dispatch, actions } = collect();
    setPlannedFuelOnLeg({ dispatch, newId: (p) => `${p}-1`, trip, leg, actorOid: 'oid-pic', lbs: 9400 });
    const edit = actions.find((a) => a.type === 'EDIT_TRIP') as Extract<TechLogAction, { type: 'EDIT_TRIP' }>;
    const patched = edit.payload.legs!.find((l) => l.id === 'leg-1')!;
    expect(patched.plannedFuelLb).toBe(9400);
    expect(actions.some((a) => a.type === 'ADD_AUDIT')).toBe(true);
  });
});

describe('markFuelFinalOnLeg', () => {
  it('dispatches EDIT_TRIP with the leg fuel finalized and stamps the actor', () => {
    const { dispatch, actions } = collect();
    markFuelFinalOnLeg({ dispatch, newId: (p) => `${p}-1`, trip, leg, actorOid: 'oid-pic', nowUtc: '2026-07-10T18:00:00.000Z' });
    const edit = actions.find((a) => a.type === 'EDIT_TRIP') as Extract<TechLogAction, { type: 'EDIT_TRIP' }>;
    const patched = edit.payload.legs!.find((l) => l.id === 'leg-1')!;
    expect(patched.fuelFinalizedByOid).toBe('oid-pic');
    expect(patched.fuelFinalizedAtUtc).toBe('2026-07-10T18:00:00.000Z');
  });
});

describe('completeFratOnLeg — the submitted record (Bryan, 2026-07-14)', () => {
  // Previously a COMPLETED FRAT retained fratStatus + fratScore and NOTHING else — the
  // submit actively wiped fratDraft, so the ticked items and the mitigation plan the form
  // hard-requires at 20-24 were erased at the moment of submission.
  const assessment = [
    {
      title: 'Flight/Duty',
      items: [
        { id: 'fd3', label: 'First leg today', score: 1, selected: true },
        { id: 'fd4', label: '2nd leg today', score: 2, selected: true },
        { id: 'fd8', label: 'Flight during Window of Circadian Low (WOCL)', score: 3, selected: false },
      ],
    },
  ];

  const complete = (over: Record<string, unknown> = {}) => {
    const { dispatch, actions } = collect();
    completeFratOnLeg({
      dispatch, newId: (p) => `${p}-1`, trip, leg, actorOid: 'oid-pic',
      totalScore: 3, assessment, mitigationNotes: 'Second-in-command to fly the approach.',
      additionalNotes: 'Ramp construction at KTEB.', nowUtc: '2026-07-10T12:00:00.000Z',
      ...over,
    });
    const edit = actions.find((a) => a.type === 'EDIT_TRIP') as Extract<TechLogAction, { type: 'EDIT_TRIP' }>;
    return edit.payload.legs!.find((l) => l.id === 'leg-1')!;
  };

  it('keeps the mitigation plan the form forced the pilot to write', () => {
    expect(complete().fratRecords![0].mitigationNotes).toBe('Second-in-command to fly the approach.');
  });

  it('keeps the additional notes', () => {
    expect(complete().fratRecords![0].additionalNotes).toBe('Ramp construction at KTEB.');
  });

  it('freezes each item as the pilot saw it — label and score, not an index', () => {
    // The FRAT template is editable in the builder. Storing selections[3][1] means a later
    // template edit silently changes what a historical record says. Same rule as the
    // point-in-time MEL revision: snapshot the value, never resolve it live.
    const items = complete().fratRecords![0].sections[0].items;
    expect(items).toContainEqual({ id: 'fd4', label: '2nd leg today', score: 2, selected: true });
  });

  it('records unticked items too, so "not selected" is distinguishable from "not asked"', () => {
    const wocl = complete().fratRecords![0].sections[0].items.find((i) => i.id === 'fd8');
    expect(wocl!.selected).toBe(false);
  });

  it('does not carry the template icon into the record', () => {
    const withIcon = [{ title: 'Flight/Duty', icon: () => null, items: assessment[0].items }];
    const section = complete({ assessment: withIcon }).fratRecords![0].sections[0];
    expect(section).not.toHaveProperty('icon');
  });

  it('stamps who submitted it and when', () => {
    const rec = complete().fratRecords![0];
    expect(rec.submittedByOid).toBe('oid-pic');
    expect(rec.submittedAtUtc).toBe('2026-07-10T12:00:00.000Z');
    expect(rec.score).toBe(3);
  });

  it('APPENDS on resubmission rather than replacing — both assessments stay readable', () => {
    const { dispatch, actions } = collect();
    const already: TripLeg = {
      ...leg,
      fratStatus: 'COMPLETED',
      fratScore: 22,
      fratRecords: [{
        score: 22, sections: [], mitigationNotes: 'Original plan.',
        submittedAtUtc: '2026-07-10T06:00:00.000Z', submittedByOid: 'oid-pic',
      }],
    };
    completeFratOnLeg({
      dispatch, newId: (p) => `${p}-2`, trip, leg: already, actorOid: 'oid-pic',
      totalScore: 14, assessment, mitigationNotes: 'Weather cleared.',
      nowUtc: '2026-07-10T12:00:00.000Z',
    });
    const edit = actions.find((a) => a.type === 'EDIT_TRIP') as Extract<TechLogAction, { type: 'EDIT_TRIP' }>;
    const patched = edit.payload.legs!.find((l) => l.id === 'leg-1')!;
    expect(patched.fratRecords).toHaveLength(2);
    expect(patched.fratRecords![0].score).toBe(22);
    expect(patched.fratRecords![1].score).toBe(14);
    // fratScore tracks the latest assessment
    expect(patched.fratScore).toBe(14);
  });

  it('still works when the caller supplies no assessment (older call sites)', () => {
    const { dispatch, actions } = collect();
    completeFratOnLeg({ dispatch, newId: (p) => `${p}-1`, trip, leg, actorOid: 'oid-pic', totalScore: 12 });
    const edit = actions.find((a) => a.type === 'EDIT_TRIP') as Extract<TechLogAction, { type: 'EDIT_TRIP' }>;
    const patched = edit.payload.legs!.find((l) => l.id === 'leg-1')!;
    expect(patched.fratStatus).toBe('COMPLETED');
    expect(patched.fratScore).toBe(12);
    expect(patched.fratRecords ?? []).toHaveLength(0);
  });
});
