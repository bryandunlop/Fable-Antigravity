import { describe, it, expect } from 'vitest';
import { defectDebriefs, deriveSystemEntries, impactDiverged, mergeTimeline } from './timeline';
import type { Defect, LaborEntry, WorkCard } from '../../tech-log/types';
import type { FirTimelineEntry, FlightIrregularityReport } from '../types';

const defect = (over: Partial<Defect> = {}): Defect => ({
  id: 'def-1', aircraftId: 'ac-1', source: 'PIREP', ataChapter: '24',
  description: 'Main battery will not hold charge',
  airworthinessAffecting: true, status: 'OPEN', reportedByOid: 'p1',
  occurredAtUtc: '2026-07-07T08:00:00.000Z', reportedAtUtc: '2026-07-07T08:00:00.000Z',
  signatureId: 'sig-1', ...over,
});

const card = (over: Partial<WorkCard> = {}): WorkCard => ({
  id: 'wc-1', cardNumber: 'WC-1001', aircraftId: 'ac-1', title: 'Replace main battery',
  ataChapter: '24', description: '', steps: [], status: 'IN_WORK', source: 'MANUAL',
  headerStatusCode: 1, scheduled: false, riiRequired: false, linkedDefectId: 'def-1',
  createdAtUtc: '2026-07-07T09:00:00.000Z',
  statusTags: [
    { tag: 'IN_WORK', atUtc: '2026-07-07T09:00:00.000Z', byOid: 'm1' },
    { tag: 'WAITING_PARTS', atUtc: '2026-07-07T12:00:00.000Z', byOid: 'm1', note: 'POO — battery from GAC Savannah, ETA Thu' },
  ],
  ...over,
});

const slice = (defects: Defect[], workCards: WorkCard[], laborEntries: LaborEntry[] = []) =>
  ({ defects, workCards, laborEntries });

const fir = (over: Partial<FlightIrregularityReport> = {}): FlightIrregularityReport => ({
  id: 'fir-1', ref: 'FIR-2026-001', title: 'Battery AOG', category: 'AOG', status: 'OPEN',
  openedByOid: 'USR002', ownerOid: 'USR002', openedAtUtc: '2026-07-07T10:00:00.000Z',
  eventStartUtc: '2026-07-07T08:00:00.000Z',
  anchors: [{ kind: 'DEFECT', refId: 'def-1' }], narrative: '', impact: {},
  manualTimeline: [], statements: [], relatedSafetyItems: [], audit: [], ...over,
});

const asOf = '2026-07-08T12:00:00.000Z';

describe('FIR evidence pull — defect anchors → downtime debriefs (§6)', () => {
  it('builds one debrief per DEFECT anchor', () => {
    const d = defectDebriefs(fir(), slice([defect()], [card()]), asOf);
    expect(d).toHaveLength(1);
    expect(d[0].stateHours.WAITING_PARTS).toBe(24);
  });

  it('dedupes anchors that resolve to the same supersede chain', () => {
    const corrected = defect({ id: 'def-9', supersedesId: 'def-1' });
    const f = fir({ anchors: [{ kind: 'DEFECT', refId: 'def-1' }, { kind: 'DEFECT', refId: 'def-9' }] });
    expect(defectDebriefs(f, slice([defect(), corrected], [card()]), asOf)).toHaveLength(1);
  });

  it('ignores anchors whose defect does not exist, and non-DEFECT anchors', () => {
    const f = fir({
      anchors: [
        { kind: 'DEFECT', refId: 'nope' },
        { kind: 'AIRCRAFT', refId: 'ac-1' },
        { kind: 'DEFECT', refId: 'def-1' },
      ],
    });
    expect(defectDebriefs(f, slice([defect()], [card()]), asOf)).toHaveLength(1);
  });

  it('caps evidence at the FIR event window: eventEndUtc bounds the debrief', () => {
    const f = fir({ eventEndUtc: '2026-07-07T12:00:00.000Z' });
    const d = defectDebriefs(f, slice([defect()], [card()]), asOf);
    expect(d[0].endUtc).toBe('2026-07-07T12:00:00.000Z');
    expect(d[0].stateHours.WAITING_PARTS).toBe(0);
  });
});

describe('FIR SYSTEM timeline — derived at render, never stored (§5)', () => {
  it('maps debrief events to SYSTEM entries carrying by/note and a DEBRIEF_EVENT sourceRef', () => {
    const entries = deriveSystemEntries(fir(), slice([defect()], [card()]), asOf);
    expect(entries.map(e => e.source)).toEqual(['SYSTEM', 'SYSTEM', 'SYSTEM', 'SYSTEM']);
    expect(entries[0].label).toMatch(/Defect reported/);
    expect(entries[3].note).toMatch(/GAC Savannah/);
    expect(entries[3].byOid).toBe('m1');
    expect(entries[0].sourceRef).toEqual({ kind: 'DEBRIEF_EVENT', refId: 'def-1' });
  });

  it('a late tech-log correction (superseding insert) is reflected automatically', () => {
    const corrected = defect({ id: 'def-9', supersedesId: 'def-1', description: 'Corrected description' });
    // The FIR still anchors the original id; the derived timeline follows the chain.
    const entries = deriveSystemEntries(fir(), slice([defect(), corrected], [card()]), asOf);
    expect(entries[0].label).toMatch(/Corrected description/);
  });
});

describe('FIR merged timeline (feed merge-and-sort pattern)', () => {
  const manual: FirTimelineEntry[] = [
    { source: 'MANUAL', atUtc: '2026-07-07T10:00:00.000Z', label: 'Vendor AOG desk engaged', byOid: 'USR002' },
  ];

  it('interleaves SYSTEM and MANUAL entries chronologically', () => {
    const system = deriveSystemEntries(fir(), slice([defect()], [card()]), asOf);
    const merged = mergeTimeline(system, manual);
    // system: reported 08:00, card raised 09:00, IN_WORK tag 09:00, WAITING_PARTS tag 12:00; manual: 10:00
    expect(merged.map(e => e.source)).toEqual(['SYSTEM', 'SYSTEM', 'SYSTEM', 'MANUAL', 'SYSTEM']);
    expect(merged.map(e => e.atUtc)).toEqual([...merged.map(e => e.atUtc)].sort());
  });

  it('on a timestamp tie, SYSTEM evidence renders before the MANUAL commentary on it', () => {
    const system: FirTimelineEntry[] = [{ source: 'SYSTEM', atUtc: '2026-07-07T10:00:00.000Z', label: 'sys' }];
    const tie: FirTimelineEntry[] = [{ source: 'MANUAL', atUtc: '2026-07-07T10:00:00.000Z', label: 'man' }];
    expect(mergeTimeline(system, tie).map(e => e.label)).toEqual(['sys', 'man']);
  });
});

/**
 * D63 divergence — review findings D/E.
 *
 * The rule must mean "somebody corrected the logged time", never "the clock moved". The first cut
 * fired on any report published while its event was still ongoing (elapsed climbs by itself, so the
 * notice appeared when nothing had been corrected) and compared the downtime SCALAR only, so a
 * re-labelling that shifted hours between states without changing the total went unreported.
 */
describe('impactDiverged — a correction, not the passage of time', () => {
  const snap = (segments: { key: string; hours: number }[], downtimeHours: number) => ({
    capturedAtUtc: '2026-07-20T00:00:00.000Z',
    downtimeHours,
    elapsedHours: downtimeHours,
    excludedGapHours: 0,
    segments: segments.map(s => ({ ...s, label: s.key })),
  });

  const PUBLISHED = snap([{ key: 'IN_WORK', hours: 6 }, { key: 'WAITING_PARTS', hours: 4 }], 10);

  it('stays silent when nothing changed', () => {
    const live = [{ key: 'IN_WORK', hours: 6 }, { key: 'WAITING_PARTS', hours: 4 }];
    expect(impactDiverged(PUBLISHED, live, 10, false)).toBe(false);
  });

  it('does NOT cry wolf on an ongoing event whose elapsed has merely advanced', () => {
    const live = [{ key: 'IN_WORK', hours: 6 }, { key: 'WAITING_PARTS', hours: 4 }];
    // Same composition, bigger scalar — that is the clock, not a correction.
    expect(impactDiverged(PUBLISHED, live, 25, true)).toBe(false);
  });

  it('reports a scalar change once the event is closed', () => {
    const live = [{ key: 'IN_WORK', hours: 6 }, { key: 'WAITING_PARTS', hours: 4 }];
    expect(impactDiverged(PUBLISHED, live, 12, false)).toBe(true);
  });

  it('reports a RE-LABELLING that moves hours between states without changing the total', () => {
    // 10 h either way — the scalar comparison alone saw nothing.
    const live = [{ key: 'IN_WORK', hours: 3 }, { key: 'WAITING_PARTS', hours: 4 }, { key: 'WAITING_CONTRACT_MX', hours: 3 }];
    expect(impactDiverged(PUBLISHED, live, 10, false)).toBe(true);
    // ...and it is caught even while the event is still running.
    expect(impactDiverged(PUBLISHED, live, 10, true)).toBe(true);
  });

  it('is false when there is no published revision to diverge from', () => {
    expect(impactDiverged(undefined, [{ key: 'IN_WORK', hours: 99 }], 99, false)).toBe(false);
  });
});
