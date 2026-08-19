import { describe, it, expect } from 'vitest';
import { chainNodes } from './ChainStrip';
import type { ApprovalRequest, ApprovalStep, RequestStatus } from './approvalRequests';

const req = (chain: ApprovalStep[], currentStep = 0, status: RequestStatus = 'pending'): ApprovalRequest => ({
  id: 'AR-X', formKind: 'waiver', formLabel: 'Waiver', subjectTitle: 'A waiver',
  values: {}, fieldLabels: {},
  requestedByRole: 'pilot', requestedByName: 'Capt. Dunlop', requestedAt: '2026-08-01T00:00:00Z',
  chain, currentStep, status,
});

describe('chainNodes', () => {
  it('always opens with the requester, already done', () => {
    const n = chainNodes(req([{ role: 'safety', status: 'pending' }]));
    expect(n[0]).toMatchObject({ who: 'Capt. Dunlop', state: 'done' });
  });

  it('marks the current step "now" and later ones "waiting"', () => {
    const n = chainNodes(req([
      { role: 'safety', status: 'approved' },
      { role: 'lead', status: 'pending' },
    ], 1));
    expect(n.map((x) => x.state)).toEqual(['done', 'done', 'now']);
  });

  it('names the PERSON when a step is addressed to one', () => {
    const n = chainNodes(req([{ role: 'lead', status: 'pending', assigneeName: 'Priya Raman' }]));
    // "Lead Team" would misdescribe who can act — only Priya can.
    expect(n[1].who).toBe('Priya Raman');
  });

  it('falls back to the role label when the step is role-wide', () => {
    const n = chainNodes(req([{ role: 'lead', status: 'pending' }]));
    expect(n[1].who).toBe('Lead Team');
  });

  it('shows a denial as denied, and does not mark anything "now" after it', () => {
    const n = chainNodes(req([
      { role: 'safety', status: 'denied', decidedByName: 'J. Kerr' },
      { role: 'lead', status: 'pending' },
    ], -1, 'denied'));
    expect(n[1].state).toBe('denied');
    expect(n[2].state).toBe('waiting');
    expect(n.some((x) => x.state === 'now')).toBe(false);
  });

  it('calls the last pending step "Final approval"', () => {
    const n = chainNodes(req([
      { role: 'safety', status: 'pending' },
      { role: 'lead', status: 'pending' },
    ], 0));
    expect(n[2].sub).toBe('Final approval');
  });

  it('attributes a completed step to whoever decided it', () => {
    const n = chainNodes(req([
      { role: 'safety', status: 'approved', decidedByName: 'J. Kerr (Safety)' },
      { role: 'lead', status: 'pending' },
    ], 1));
    expect(n[1].sub).toBe('Approved · J. Kerr (Safety)');
  });

  it('marks every step done once the request is fully approved', () => {
    const n = chainNodes(req([
      { role: 'safety', status: 'approved' },
      { role: 'lead', status: 'approved' },
    ], -1, 'approved'));
    expect(n.every((x) => x.state === 'done')).toBe(true);
  });
});
