import { describe, it, expect } from 'vitest';
import type { Defect } from '../../tech-log/types';
import { getDefaultState } from '../../tech-log/mockData/scenarios';
import type { TechLogEvidenceSlice } from './timeline';
import {
  DEFAULT_FIR_SUGGESTION_CONFIG,
  buildDefectFirSuggestions,
  firAnchorsDefect,
} from './suggestions';

const NOW = '2026-07-13T00:00:00Z';

const defect = (over: Partial<Defect> = {}): Defect =>
  ({
    id: 'd1', aircraftId: 'ac1', source: 'PIREP', ataChapter: '32',
    description: 'LMLG unsafe indication',
    airworthinessAffecting: true, status: 'OPEN',
    reportedByOid: 'USR001',
    occurredAtUtc: '2026-07-11T00:00:00Z', reportedAtUtc: '2026-07-11T00:00:00Z', signatureId: 'sig1',
    ...over,
  }) as Defect;

const slice = (defects: Defect[]): TechLogEvidenceSlice => ({ defects, workCards: [], laborEntries: [] });

describe('firAnchorsDefect', () => {
  it('detects an existing FIR anchored to the defect', () => {
    const firs = [{ anchors: [{ kind: 'DEFECT' as const, refId: 'd1' }] }];
    expect(firAnchorsDefect(firs, 'd1')).toBe(true);
    expect(firAnchorsDefect(firs, 'd2')).toBe(false);
    expect(firAnchorsDefect([{ anchors: [] }], 'd1')).toBe(false);
  });
});

describe('buildDefectFirSuggestions', () => {
  const cfg = DEFAULT_FIR_SUGGESTION_CONFIG;

  it('suggests for a defect grounded past the downtime threshold', () => {
    // reported 2026-07-11, now 2026-07-13 → ~48 h > 24 h
    const out = buildDefectFirSuggestions(slice([defect()]), [], [], cfg, NOW);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ key: 'defect:d1', category: 'AOG', defectId: 'd1' });
    expect(out[0].anchor).toEqual({ kind: 'DEFECT', refId: 'd1' });
    expect(out[0].reason).toMatch(/grounded/i);
  });

  // D55 removed Defect.severity; the immediate-escalation trigger is now the RED CAS
  // annunciation (D57). The behavior these two assert is unchanged: the most urgent tier of
  // grounding defect nudges straight away, a routine one waits for the downtime threshold.
  it('suggests a RED-CAS grounding defect even below the downtime threshold', () => {
    const fresh = defect({ casMessage: 'L ENG FIRE', casColor: 'RED', reportedAtUtc: '2026-07-12T23:00:00Z' }); // 1 h old
    const out = buildDefectFirSuggestions(slice([fresh]), [], [], cfg, NOW);
    expect(out).toHaveLength(1);
    expect(out[0].reason).toMatch(/critical/i);
  });

  it('does not suggest a short, non-urgent downtime', () => {
    const fresh = defect({ casMessage: 'CABIN TEMP', casColor: 'AMBER', reportedAtUtc: '2026-07-12T22:00:00Z' }); // 2 h
    expect(buildDefectFirSuggestions(slice([fresh]), [], [], cfg, NOW)).toHaveLength(0);
  });

  it('does not suggest a short downtime with no CAS annunciation at all', () => {
    const fresh = defect({ casObserved: true, reportedAtUtc: '2026-07-12T22:00:00Z' }); // 2 h
    expect(buildDefectFirSuggestions(slice([fresh]), [], [], cfg, NOW)).toHaveLength(0);
  });

  it('only OPEN grounding defects trigger — deferred, watchlisted, rectified, closed, non-grounding, superseded all skip', () => {
    const nonGrounding = defect({ id: 'd2', airworthinessAffecting: false, casColor: 'RED' });
    const rectified = defect({ id: 'd3', status: 'RECTIFIED' });
    const closed = defect({ id: 'd4', status: 'CLOSED' });
    const deferred = defect({ id: 'd7', status: 'DEFERRED', casColor: 'RED' }); // dispatchable — not AOG
    const watchlisted = defect({ id: 'd8', status: 'WATCHLISTED', casColor: 'RED' }); // serviceability-neutral
    const oldRow = defect({ id: 'd5' });
    const newRow = defect({ id: 'd6', supersedesId: 'd5' }); // d5 is superseded by d6
    const out = buildDefectFirSuggestions(
      slice([nonGrounding, rectified, closed, deferred, watchlisted, oldRow, newRow]), [], [], cfg, NOW,
    );
    expect(out.map(s => s.defectId).sort()).toEqual(['d6']); // only the current OPEN grounding row
  });

  it('does not re-suggest a defect already anchored by an FIR', () => {
    const firs = [{ anchors: [{ kind: 'DEFECT' as const, refId: 'd1' }] }];
    expect(buildDefectFirSuggestions(slice([defect()]), firs, [], cfg, NOW)).toHaveLength(0);
  });

  it('respects dismissed keys', () => {
    expect(buildDefectFirSuggestions(slice([defect()]), [], ['defect:d1'], cfg, NOW)).toHaveLength(0);
  });
});

/**
 * The seeded demo world has to actually produce the nudge its own comment promises.
 *
 * It used to be N2PG: a ~6 h old AOG firing through the immediate-escalation path, which reads
 * `casColor === 'RED'`. On 2026-08-21 the demo fleet was rebalanced (three tails sat RED at once,
 * leaving one flyable aeroplane) and N2PG was rectified, so the nudge moved to **N1PG** and now
 * fires through the **downtime** path instead: N1PG has been AOG ~29 h waiting on an uplock sensor,
 * past the 24 h threshold.
 *
 * Why not simply move the RED CAS across: N1PG annunciates GEAR UNSAFE, and the D60 knowledge
 * article TK-901 is written around that being AMBER — `casKnowledgeSeeds.test.ts` pins the record
 * and the catalogue to agree, and it caught the attempt. Downtime is the better trigger anyway.
 *
 * This test still drives the real seed builder rather than a fixture, so pulling N1PG's timeline
 * back under 24 h — or rectifying it — fails here.
 */
describe('the seeded demo world fires the FIR nudge on N1PG', () => {
  const state = getDefaultState();
  const now = new Date().toISOString();
  const seedSlice: TechLogEvidenceSlice = {
    defects: state.defects, workCards: state.workCards, laborEntries: state.laborEntries,
  };

  it('d-n1pg is still an OPEN grounding defect — the nudge reads nothing else', () => {
    const d = state.defects.find(x => x.id === 'd-n1pg')!;
    expect(d.status).toBe('OPEN');
    expect(d.airworthinessAffecting).not.toBe(false); // still grounding
  });

  it('d-n1pg is seeded past the 24 h downtime threshold', () => {
    const d = state.defects.find(x => x.id === 'd-n1pg')!;
    const hours = (Date.parse(now) - Date.parse(d.reportedAtUtc)) / 3_600_000;
    expect(hours).toBeGreaterThan(DEFAULT_FIR_SUGGESTION_CONFIG.downtimeHours);
  });

  it('suggests an AOG FIR for d-n1pg on fresh seeds, via the downtime path', () => {
    const out = buildDefectFirSuggestions(seedSlice, [], [], DEFAULT_FIR_SUGGESTION_CONFIG, now);
    const n1 = out.find(s => s.defectId === 'd-n1pg');
    expect(n1).toBeDefined();
    expect(n1!.category).toBe('AOG');
    expect(n1!.reason).toMatch(/grounded/i); // the downtime path, not the RED-CAS fast path
    expect(n1!.anchor).toEqual({ kind: 'DEFECT', refId: 'd-n1pg' });
  });

  it('the rectified N2PG chip-detector defect does NOT suggest an FIR', () => {
    const out = buildDefectFirSuggestions(seedSlice, [], [], DEFAULT_FIR_SUGGESTION_CONFIG, now);
    expect(out.find(s => s.defectId === 'd-n2pg')).toBeUndefined();
  });
});
