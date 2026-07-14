import { describe, it, expect } from 'vitest';
import { deriveCustody, canRecordPostflight } from './custody';
import type { FlightBriefing, Postflight } from '../types';

const AC = 'ac1';
const brief = (p: Partial<FlightBriefing> = {}): FlightBriefing => ({
  id: 'brief1', aircraftId: AC, preparedByOid: 'm', createdAtUtc: '2026-06-20T00:00:00Z',
  status: 'DRAFT', ...p,
});
const postflight = (p: Partial<Postflight> = {}): Postflight => ({
  id: 'pf1', aircraftId: AC, performedByOid: 'm', performedAtUtc: '2026-06-22T00:00:00Z',
  gatheredDefectIds: [], signatureId: 's', ...p,
});

describe('deriveCustody §E', () => {
  it('defaults to IN_MAINTENANCE with no events', () => {
    expect(deriveCustody(AC, { briefings: [], postflights: [] }, '2026-06-22T12:00:00Z').state).toBe('IN_MAINTENANCE');
  });
  it('OFFERED after a released (not yet acked) briefing', () => {
    const b = brief({ status: 'RELEASED', releasedAtUtc: '2026-06-21T08:00:00Z' });
    const r = deriveCustody(AC, { briefings: [b], postflights: [] }, '2026-06-21T09:00:00Z');
    expect(r.state).toBe('OFFERED');
    expect(r.drivingBriefingId).toBe('brief1');
  });
  it('WITH_CREW after the PIC acknowledges, driving briefing id is set', () => {
    const b = brief({ status: 'ACKNOWLEDGED', releasedAtUtc: '2026-06-21T08:00:00Z', acknowledgedAtUtc: '2026-06-21T09:00:00Z' });
    const r = deriveCustody(AC, { briefings: [b], postflights: [] }, '2026-06-21T10:00:00Z');
    expect(r.state).toBe('WITH_CREW');
    expect(r.drivingBriefingId).toBe('brief1');
  });
  it('IN_MAINTENANCE after a postflight reclaims it', () => {
    const b = brief({ status: 'ACKNOWLEDGED', releasedAtUtc: '2026-06-21T08:00:00Z', acknowledgedAtUtc: '2026-06-21T09:00:00Z' });
    const p = postflight({ performedAtUtc: '2026-06-22T07:00:00Z', briefingId: 'brief1' });
    const r = deriveCustody(AC, { briefings: [b], postflights: [p] }, '2026-06-22T08:00:00Z');
    expect(r.state).toBe('IN_MAINTENANCE');
    expect(r.drivingPostflightId).toBe('pf1');
  });
  it('a new draft briefing does not flip custody away from WITH_CREW', () => {
    const acked = brief({ id: 'b1', status: 'ACKNOWLEDGED', releasedAtUtc: '2026-06-21T08:00:00Z', acknowledgedAtUtc: '2026-06-21T09:00:00Z' });
    const draft = brief({ id: 'b2', status: 'DRAFT', createdAtUtc: '2026-06-21T12:00:00Z' });
    expect(deriveCustody(AC, { briefings: [acked, draft], postflights: [] }, '2026-06-21T13:00:00Z').state).toBe('WITH_CREW');
  });
  it('respects asOfUtc — ignores future events', () => {
    const b = brief({ status: 'RELEASED', releasedAtUtc: '2026-06-25T00:00:00Z' });
    expect(deriveCustody(AC, { briefings: [b], postflights: [] }, '2026-06-22T00:00:00Z').state).toBe('IN_MAINTENANCE');
  });

  it('superseded postflight is excluded — only the replacement drives custody', () => {
    // P1 is superseded by P2; deriveCustody must use P2 (currentRows fold) and report P2's id.
    const p1 = postflight({ id: 'pf1', performedAtUtc: '2026-06-22T06:00:00Z' });
    const p2 = postflight({ id: 'pf2', performedAtUtc: '2026-06-22T07:00:00Z', supersedesId: 'pf1' });
    const r = deriveCustody(AC, { briefings: [], postflights: [p1, p2] }, '2026-06-22T08:00:00Z');
    expect(r.state).toBe('IN_MAINTENANCE');
    expect(r.drivingPostflightId).toBe('pf2');
  });

  it('events for a different aircraft do not affect ac1 custody', () => {
    // A briefing release + postflight for 'ac2' must be invisible to deriveCustody('ac1').
    const bOther = brief({ id: 'bOther', aircraftId: 'ac2', status: 'RELEASED', releasedAtUtc: '2026-06-21T08:00:00Z' });
    const pOther = postflight({ id: 'pfOther', aircraftId: 'ac2', performedAtUtc: '2026-06-22T07:00:00Z' });
    const r = deriveCustody(AC, { briefings: [bOther], postflights: [pOther] }, '2026-06-22T12:00:00Z');
    expect(r.state).toBe('IN_MAINTENANCE');
    expect(r.drivingBriefingId).toBeUndefined();
    expect(r.drivingPostflightId).toBeUndefined();
  });
});

describe('canRecordPostflight', () => {
  it('rejects a reclaim while custody is still IN_MAINTENANCE (no briefing offered yet)', () => {
    const r = canRecordPostflight(AC, { briefings: [], postflights: [] }, '2026-06-22T08:00:00Z');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/with the crew/i);
  });

  it('rejects a reclaim while custody is only OFFERED (crew has not yet accepted)', () => {
    const b = brief({ status: 'RELEASED', releasedAtUtc: '2026-06-21T08:00:00Z' });
    const r = canRecordPostflight(AC, { briefings: [b], postflights: [] }, '2026-06-21T09:00:00Z');
    expect(r.ok).toBe(false);
  });

  it('allows a reclaim once custody is WITH_CREW', () => {
    const b = brief({ status: 'ACKNOWLEDGED', releasedAtUtc: '2026-06-21T08:00:00Z', acknowledgedAtUtc: '2026-06-21T09:00:00Z' });
    const r = canRecordPostflight(AC, { briefings: [b], postflights: [] }, '2026-06-21T10:00:00Z');
    expect(r.ok).toBe(true);
    expect(r.reason).toBeUndefined();
  });

  it('rejects a second reclaim already back in maintenance custody', () => {
    const b = brief({ status: 'ACKNOWLEDGED', releasedAtUtc: '2026-06-21T08:00:00Z', acknowledgedAtUtc: '2026-06-21T09:00:00Z' });
    const p = postflight({ performedAtUtc: '2026-06-22T07:00:00Z', briefingId: 'brief1' });
    const r = canRecordPostflight(AC, { briefings: [b], postflights: [p] }, '2026-06-22T08:00:00Z');
    expect(r.ok).toBe(false);
  });
});
