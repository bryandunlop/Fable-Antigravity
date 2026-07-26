import { describe, it, expect } from 'vitest';
import { buildRequest, applyDecision, type ApprovalRequest, type BuildInput } from './approvalRequests';
import { waiversOnly, isAwaitingRoles, clearedAt, waiverStats, OVERDUE_AFTER_MS } from './waiverConsole';

function input(over: Partial<BuildInput> = {}): BuildInput {
  return {
    formKind: 'waiver', formLabel: 'Waiver', subjectTitle: 'Duty-time extension',
    values: { request: '+1:30' }, fieldLabels: { request: 'What are you requesting?' },
    requestedByRole: 'pilot', requestedByName: 'Capt. Dunlop',
    chainRoles: ['safety', 'chief-pilot'],
    id: 'AR-1', requestedAt: '2026-07-21T00:00:00Z',
    ...over,
  };
}

const DAY = 24 * 60 * 60 * 1000;

describe('waiversOnly', () => {
  it('keeps only waiver-kind requests (hazards never route here anyway)', () => {
    const reqs: ApprovalRequest[] = [
      buildRequest(input({ id: 'W', formKind: 'waiver' })),
      buildRequest(input({ id: 'A', formKind: 'asap' })),
      buildRequest(input({ id: 'C', formKind: 'cws' })),
    ];
    expect(waiversOnly(reqs).map((r) => r.id)).toEqual(['W']);
  });
});

describe('isAwaitingRoles — who may action a step here', () => {
  it('is true only for the role currently on-step, mirroring the inbox', () => {
    const atSafety = buildRequest(input()); // step 0 = safety
    expect(isAwaitingRoles(atSafety, ['safety'])).toBe(true);
    expect(isAwaitingRoles(atSafety, ['chief-pilot'])).toBe(false); // can't approve someone else's step
    expect(isAwaitingRoles(atSafety, ['chief-pilot', 'safety'])).toBe(true);
  });

  it('is false once the request is finished', () => {
    const denied = applyDecision(buildRequest(input({ chainRoles: ['safety'] })), 'deny', 'J. Kerr', 'no', 't');
    expect(isAwaitingRoles(denied, ['safety'])).toBe(false);
  });
});

describe('clearedAt — terminal decision time', () => {
  it('is undefined while pending', () => {
    expect(clearedAt(buildRequest(input()))).toBeUndefined();
  });
  it('is the last decision time on an approved chain', () => {
    let r = buildRequest(input());
    r = applyDecision(r, 'approve', 'J. Kerr', undefined, '2026-07-21T10:00:00Z');
    r = applyDecision(r, 'approve', 'Capt. Vance', undefined, '2026-07-21T15:00:00Z');
    expect(clearedAt(r)).toBe('2026-07-21T15:00:00Z');
  });
  it('is the denial time on a denied chain', () => {
    const r = applyDecision(buildRequest(input()), 'deny', 'J. Kerr', 'no', '2026-07-21T09:00:00Z');
    expect(clearedAt(r)).toBe('2026-07-21T09:00:00Z');
  });
});

describe('waiverStats — the cockpit analytics', () => {
  const now = new Date('2026-07-22T00:00:00Z').getTime();

  function corpus(): ApprovalRequest[] {
    // pending, filed 3h ago (not overdue)
    const fresh = buildRequest(input({ id: 'P1', requestedAt: '2026-07-21T21:00:00Z' }));
    // pending, filed 3 days ago (overdue)
    const stale = buildRequest(input({ id: 'P2', requestedAt: '2026-07-19T00:00:00Z' }));
    // approved: filed T-21 00:00, cleared T-21 10:00 => 10h to clear
    let ok = buildRequest(input({ id: 'A1', chainRoles: ['safety'], requestedAt: '2026-07-21T00:00:00Z' }));
    ok = applyDecision(ok, 'approve', 'J. Kerr', undefined, '2026-07-21T10:00:00Z');
    // denied: filed T-21 00:00, cleared T-21 20:00 => 20h to clear
    let no = buildRequest(input({ id: 'D1', chainRoles: ['safety'], requestedAt: '2026-07-21T00:00:00Z' }));
    no = applyDecision(no, 'deny', 'J. Kerr', 'no', '2026-07-21T20:00:00Z');
    // a non-waiver that must be ignored entirely
    const asap = buildRequest(input({ id: 'X', formKind: 'asap' }));
    return [fresh, stale, ok, no, asap];
  }

  it('counts by terminal status over waivers only', () => {
    const s = waiverStats(corpus(), now);
    expect(s.total).toBe(4);      // asap excluded
    expect(s.pending).toBe(2);
    expect(s.approved).toBe(1);
    expect(s.denied).toBe(1);
  });

  it('flags pending waivers older than the overdue window', () => {
    const s = waiverStats(corpus(), now);
    expect(OVERDUE_AFTER_MS).toBe(2 * DAY);
    expect(s.overdue).toBe(1);    // only the 3-day-old one
  });

  it('averages clear time over finished waivers only (10h and 20h => 15h)', () => {
    const s = waiverStats(corpus(), now);
    expect(s.avgClearMs).toBe(15 * 60 * 60 * 1000);
  });

  it('reports avgClearMs null when nothing has cleared', () => {
    const onlyPending = [buildRequest(input({ id: 'P', requestedAt: '2026-07-21T21:00:00Z' }))];
    expect(waiverStats(onlyPending, now).avgClearMs).toBeNull();
  });
});
