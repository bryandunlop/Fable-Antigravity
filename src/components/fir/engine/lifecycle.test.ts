import { describe, it, expect } from 'vitest';
import type { FirPublishedDraft, FlightIrregularityReport } from '../types';
import {
  canCloseInternal,
  canCurate,
  canReopen,
  isDraftComplete,
  nextRevision,
  validateApprove,
  validateRequestChanges,
  validateSubmitForReview,
} from './lifecycle';

const draft = (over: Partial<FirPublishedDraft> = {}): FirPublishedDraft => ({
  summary: 'A gear indication grounded the aircraft.',
  whatHappened: 'The PIC returned to base; the technician isolated a sensor.',
  timeline: [],
  lessons: [],
  ackLevel: 'none',
  ...over,
});

const fir = (over: Partial<FlightIrregularityReport> = {}): FlightIrregularityReport =>
  ({
    id: 'f1', ref: 'FIR-2026-002', title: 't', category: 'AOG', status: 'OPEN',
    openedByOid: 'USR002', ownerOid: 'USR002', openedAtUtc: '2026-07-11T00:00:00Z',
    eventStartUtc: '2026-07-11T00:00:00Z', anchors: [], narrative: '', impact: {},
    manualTimeline: [], statements: [], relatedSafetyItems: [], audit: [],
    ...over,
  }) as FlightIrregularityReport;

const LEAD = ['chief-pilot'];
const CREW = ['pilot'];

describe('fir lifecycle — draft completeness', () => {
  it('requires both summary and whatHappened', () => {
    expect(isDraftComplete(undefined)).toBe(false);
    expect(isDraftComplete(draft({ summary: '' }))).toBe(false);
    expect(isDraftComplete(draft({ whatHappened: '  ' }))).toBe(false);
    expect(isDraftComplete(draft())).toBe(true);
  });
});

describe('fir lifecycle — nextRevision', () => {
  it('is 1 for a never-published FIR, else prior + 1', () => {
    expect(nextRevision(fir())).toBe(1);
    expect(nextRevision(fir({ publishedRevision: { ...draft(), revision: 2, approvedByOid: 'x', publishedAtUtc: 'z' } }))).toBe(3);
  });
});

describe('fir lifecycle — submit for review', () => {
  it('allows an OPEN FIR with a complete draft', () => {
    expect(validateSubmitForReview(fir({ pendingPublished: draft() })).ok).toBe(true);
  });
  it('blocks when the draft is incomplete', () => {
    const r = validateSubmitForReview(fir({ pendingPublished: draft({ whatHappened: '' }) }));
    expect(r.ok).toBe(false);
  });
  it('blocks when not OPEN', () => {
    expect(validateSubmitForReview(fir({ status: 'IN_REVIEW', pendingPublished: draft() })).ok).toBe(false);
  });
  it('canCurate only while OPEN', () => {
    expect(canCurate(fir())).toBe(true);
    expect(canCurate(fir({ status: 'IN_REVIEW' }))).toBe(false);
  });
});

describe('fir lifecycle — four-eyes approval', () => {
  const reviewing = fir({ status: 'IN_REVIEW', reviewSubmittedByOid: 'USR002', pendingPublished: draft() });

  it('allows a leadership decider who is not the submitter', () => {
    expect(validateApprove(reviewing, 'USR009', LEAD).ok).toBe(true);
  });
  it('blocks self-approval even for leadership', () => {
    const r = validateApprove(reviewing, 'USR002', LEAD);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/four-eyes/i);
  });
  it('blocks a non-leadership decider', () => {
    expect(validateApprove(reviewing, 'USR009', CREW).ok).toBe(false);
  });
  it('blocks unless IN_REVIEW', () => {
    expect(validateApprove(fir({ status: 'OPEN' }), 'USR009', LEAD).ok).toBe(false);
  });
});

describe('fir lifecycle — request changes', () => {
  const reviewing = fir({ status: 'IN_REVIEW', reviewSubmittedByOid: 'USR002' });
  it('requires leadership, IN_REVIEW, and a note', () => {
    expect(validateRequestChanges(reviewing, LEAD, 'strip the tail number').ok).toBe(true);
    expect(validateRequestChanges(reviewing, LEAD, '   ').ok).toBe(false);
    expect(validateRequestChanges(reviewing, CREW, 'note').ok).toBe(false);
    expect(validateRequestChanges(fir({ status: 'OPEN' }), LEAD, 'note').ok).toBe(false);
  });
});

describe('fir lifecycle — close internal + reopen', () => {
  it('owner or leadership may close an OPEN FIR internally', () => {
    expect(canCloseInternal(fir(), { oid: 'USR002', roles: CREW })).toBe(true); // owner
    expect(canCloseInternal(fir(), { oid: 'USR999', roles: LEAD })).toBe(true); // leadership
    expect(canCloseInternal(fir(), { oid: 'USR999', roles: CREW })).toBe(false);
    expect(canCloseInternal(fir({ status: 'PUBLISHED' }), { oid: 'USR002', roles: LEAD })).toBe(false);
  });
  it('only leadership reopens a published or closed FIR', () => {
    expect(canReopen(fir({ status: 'PUBLISHED' }), LEAD)).toBe(true);
    expect(canReopen(fir({ status: 'CLOSED_INTERNAL' }), LEAD)).toBe(true);
    expect(canReopen(fir({ status: 'PUBLISHED' }), CREW)).toBe(false);
    expect(canReopen(fir({ status: 'OPEN' }), LEAD)).toBe(false);
  });
});
