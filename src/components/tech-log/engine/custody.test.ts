import { describe, it, expect } from 'vitest';
import { deriveCustody } from './custody';
import type { FlightBriefing, Postflight } from '../types';

const AC = 'ac1';
const brief = (p: Partial<FlightBriefing> = {}): FlightBriefing => ({
  id: 'brief1', aircraftId: AC, preparedByOid: 'm', createdAtUtc: '2026-06-20T00:00:00Z',
  status: 'DRAFT', checklist: [], ...p,
});
const postflight = (p: Partial<Postflight> = {}): Postflight => ({
  id: 'pf1', aircraftId: AC, performedByOid: 'm', performedAtUtc: '2026-06-22T00:00:00Z',
  checklist: [], gatheredDefectIds: [], signatureId: 's', ...p,
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
  it('WITH_CREW after the PIC acknowledges', () => {
    const b = brief({ status: 'ACKNOWLEDGED', releasedAtUtc: '2026-06-21T08:00:00Z', acknowledgedAtUtc: '2026-06-21T09:00:00Z' });
    expect(deriveCustody(AC, { briefings: [b], postflights: [] }, '2026-06-21T10:00:00Z').state).toBe('WITH_CREW');
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
});
