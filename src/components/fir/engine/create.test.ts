import { describe, it, expect } from 'vitest';
import { buildFir } from './create';

const input = {
  id: 'fir-1',
  ref: 'FIR-2026-001',
  title: 'LMLG unsafe indication — AOG at KLUK',
  category: 'AOG' as const,
  openedBy: { oid: 'USR002', name: 'Sarah Wilson (DOM)' },
  atUtc: '2026-07-11T10:00:00.000Z',
  eventStartUtc: '2026-07-11T08:00:00.000Z',
};

describe('buildFir — opening an FIR (§4 lifecycle: OPEN, owner defaults to opener)', () => {
  it('opens in OPEN status with the opener as owner', () => {
    const f = buildFir(input);
    expect(f.status).toBe('OPEN');
    expect(f.ownerOid).toBe('USR002');
    expect(f.ownerName).toBe('Sarah Wilson (DOM)');
    expect(f.openedByOid).toBe('USR002');
  });

  it('records an OPENED audit event', () => {
    const f = buildFir(input);
    expect(f.audit).toHaveLength(1);
    expect(f.audit[0]).toMatchObject({ kind: 'OPENED', byOid: 'USR002', atUtc: input.atUtc });
  });

  it('defaults collections empty and narrative blank', () => {
    const f = buildFir(input);
    expect(f.anchors).toEqual([]);
    expect(f.manualTimeline).toEqual([]);
    expect(f.statements).toEqual([]);
    expect(f.relatedSafetyItems).toEqual([]);
    expect(f.narrative).toBe('');
    expect(f.impact).toEqual({});
  });

  it('carries anchors, aircraft, and event end when provided', () => {
    const f = buildFir({
      ...input,
      anchors: [{ kind: 'DEFECT', refId: 'd-n1pg' }],
      aircraftId: 'ac-n1pg',
      eventEndUtc: '2026-07-12T08:00:00.000Z',
    });
    expect(f.anchors).toEqual([{ kind: 'DEFECT', refId: 'd-n1pg' }]);
    expect(f.aircraftId).toBe('ac-n1pg');
    expect(f.eventEndUtc).toBe('2026-07-12T08:00:00.000Z');
  });
});
