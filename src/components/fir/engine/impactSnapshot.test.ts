import { describe, it, expect } from 'vitest';
import { buildImpactSnapshot, impactSegments, defectDebriefs } from './timeline';
import { firReducer } from '../reducer';
import type { FirState, FlightIrregularityReport } from '../types';
import type { Defect, WorkCard } from '../../tech-log/types';

/**
 * D63 — a published FIR revision freezes its impact/downtime figures at publication.
 *
 * The failure this prevents: D61 made the tech-log time history freely editable after the fact, so
 * without a snapshot a technician re-typing a start time at end of shift would silently rewrite the
 * headline number on a four-eyes-approved report, months later, with nobody told.
 */

const defect = (over: Partial<Defect> = {}): Defect => ({
  id: 'def-1', aircraftId: 'ac-1', source: 'PIREP', ataChapter: '24',
  description: 'Main battery will not hold charge',
  airworthinessAffecting: true, status: 'RECTIFIED', reportedByOid: 'p1',
  occurredAtUtc: '2026-07-07T08:00:00.000Z', reportedAtUtc: '2026-07-07T08:00:00.000Z',
  clearedTsUtc: '2026-07-08T08:00:00.000Z', clearedByOid: 'm1',
  signatureId: 'sig-1', ...over,
});

const card = (over: Partial<WorkCard> = {}): WorkCard => ({
  id: 'wc-1', cardNumber: 'WC-1001', aircraftId: 'ac-1', title: 'Replace main battery',
  ataChapter: '24', description: '', status: 'COMPLETED', source: 'MANUAL',
  headerStatusCode: 0, scheduled: false, riiRequired: false, linkedDefectId: 'def-1',
  createdAtUtc: '2026-07-07T09:00:00.000Z', completedAtUtc: '2026-07-08T08:00:00.000Z',
  statusTags: [
    { tag: 'DIAGNOSING', atUtc: '2026-07-07T09:00:00.000Z', byOid: 'm1' },
    { tag: 'IN_WORK', atUtc: '2026-07-07T13:00:00.000Z', byOid: 'm1' },
  ],
  ...over,
});

const fir = (over: Partial<FlightIrregularityReport> = {}): FlightIrregularityReport => ({
  id: 'fir-1', ref: 'FIR-2026-001', title: 'N1PG battery AOG', category: 'AOG', status: 'IN_REVIEW',
  openedByOid: 'l1', ownerOid: 'l1', openedAtUtc: '2026-07-08T09:00:00.000Z',
  eventStartUtc: '2026-07-07T08:00:00.000Z', eventEndUtc: '2026-07-08T08:00:00.000Z',
  aircraftId: 'ac-1', anchors: [{ kind: 'DEFECT', refId: 'def-1' }], narrative: '',
  impact: {}, manualTimeline: [], statements: [], relatedSafetyItems: [],
  pendingPublished: { summary: 'Battery AOG', whatHappened: 'The assigned technician…', timeline: [], lessons: [], ackLevel: 'none', includeImpactBar: true },
  reviewSubmittedByOid: 'l2',
  audit: [], ...over,
});

const slice = (cards: WorkCard[]) => ({ defects: [defect()], workCards: cards, laborEntries: [] });
const asOf = '2026-07-10T00:00:00.000Z';

describe('impactSegments — the shared stacked bar arithmetic', () => {
  it('carries a label with every number so a frozen copy can never be repainted by a rename', () => {
    const segs = impactSegments(defectDebriefs(fir(), slice([card()]), asOf));
    const diag = segs.find(s => s.key === 'DIAGNOSING')!;
    expect(diag.hours).toBe(4);
    expect(diag.label).toBe('Diagnosing (on aircraft)');
    expect(segs.find(s => s.key === 'UNTAGGED')!.hours).toBe(1);   // 08:00 report → 09:00 card raised
  });
});

describe('a published revision freezes its figures; a draft keeps recomputing', () => {
  const publish = (state: FirState, snapshot?: ReturnType<typeof buildImpactSnapshot>) =>
    firReducer(state, {
      type: 'APPROVE_PUBLISH',
      payload: { firId: 'fir-1', byOid: 'l1', byRoles: ['dom'], atUtc: '2026-07-09T09:00:00.000Z', impactSnapshot: snapshot },
    });

  it('stamps the snapshot handed in at approval onto the revision', () => {
    const debriefs = defectDebriefs(fir(), slice([card()]), asOf);
    const snap = buildImpactSnapshot(debriefs, 24, '2026-07-09T09:00:00.000Z');
    const next = publish({ firs: [fir()] }, snap);
    const rev = next.firs[0].publishedRevision!;
    expect(rev.impactSnapshot?.downtimeHours).toBe(24);
    expect(rev.impactSnapshot?.elapsedHours).toBe(24);
    expect(rev.impactSnapshot?.segments.find(s => s.key === 'IN_WORK')?.hours).toBe(19);
  });

  it('a later retrospective edit moves the LIVE derivation but not the published revision', () => {
    const debriefs = defectDebriefs(fir(), slice([card()]), asOf);
    const published = publish({ firs: [fir()] }, buildImpactSnapshot(debriefs, 24, '2026-07-09T09:00:00.000Z'));
    const frozen = published.firs[0].publishedRevision!.impactSnapshot!;

    // The technician writes up the day and logs the overnight as an excluded gap.
    const corrected = card({
      statusTags: [
        { tag: 'DIAGNOSING', atUtc: '2026-07-07T09:00:00.000Z', byOid: 'm1' },
        { tag: 'IN_WORK', atUtc: '2026-07-07T13:00:00.000Z', byOid: 'm1' },
        { tag: 'GAP', atUtc: '2026-07-07T18:00:00.000Z', byOid: 'm1', gapReason: 'END_OF_SHIFT', includeInTotals: false },
        { tag: 'IN_WORK', atUtc: '2026-07-08T06:00:00.000Z', byOid: 'm1' },
      ],
    });
    const live = defectDebriefs(published.firs[0], slice([corrected]), asOf);
    const liveCounted = live.reduce((s, d) => s + d.countedDowntimeHours, 0);

    expect(liveCounted).toBe(12);                       // 24 h elapsed less the 12 h excluded overnight
    expect(frozen.downtimeHours).toBe(24);              // the approved report does NOT move
    expect(published.firs[0].publishedRevision!.impactSnapshot!.downtimeHours).toBe(24);
  });

  it('the snapshot records the excluded gap hours too, so the set-aside time is visible on the record', () => {
    const withGap = card({
      statusTags: [
        { tag: 'IN_WORK', atUtc: '2026-07-07T13:00:00.000Z', byOid: 'm1' },
        { tag: 'GAP', atUtc: '2026-07-07T18:00:00.000Z', byOid: 'm1', gapReason: 'CONTRACT_MX_AWAY', includeInTotals: false },
        { tag: 'IN_WORK', atUtc: '2026-07-08T06:00:00.000Z', byOid: 'm1' },
      ],
    });
    const debriefs = defectDebriefs(fir(), slice([withGap]), asOf);
    const snap = buildImpactSnapshot(debriefs, 12, '2026-07-09T09:00:00.000Z');
    expect(snap.excludedGapHours).toBe(12);
    expect(snap.elapsedHours).toBe(24);        // the calendar is still on the record
    const rev = publish({ firs: [fir()] }, snap).firs[0].publishedRevision!;
    expect(rev.impactSnapshot?.excludedGapHours).toBe(12);
  });

  it('a revision published without a snapshot keeps the pre-D63 derived behaviour rather than a zero', () => {
    const next = publish({ firs: [fir()] });
    expect(next.firs[0].publishedRevision!.impactSnapshot).toBeUndefined();
  });

  it('the curator\'s choice to embed the bar rides into the revision (D61 §5)', () => {
    const next = publish({ firs: [fir()] }, buildImpactSnapshot([], undefined, '2026-07-09T09:00:00.000Z'));
    expect(next.firs[0].publishedRevision!.includeImpactBar).toBe(true);
  });

  it('four-eyes still governs: a self-approval publishes nothing, snapshot or not', () => {
    const debriefs = defectDebriefs(fir(), slice([card()]), asOf);
    const next = firReducer({ firs: [fir()] }, {
      type: 'APPROVE_PUBLISH',
      payload: {
        firId: 'fir-1', byOid: 'l2', byRoles: ['dom'], atUtc: '2026-07-09T09:00:00.000Z',
        impactSnapshot: buildImpactSnapshot(debriefs, 24, '2026-07-09T09:00:00.000Z'),
      },
    });
    expect(next.firs[0].publishedRevision).toBeUndefined();
    expect(next.firs[0].status).toBe('IN_REVIEW');
  });
});

/**
 * `FirAnchorKind` has always accepted 'WORK_CARD' and nothing resolved it, so a FIR anchored only
 * to a card produced no timeline and no bar — which is what D61 §5 asks the VP to embed.
 */
describe('a WORK_CARD anchor resolves to its defect chain', () => {
  it('produces the same debrief as anchoring the defect directly', () => {
    const byCard = defectDebriefs(fir({ anchors: [{ kind: 'WORK_CARD', refId: 'wc-1' }] }), slice([card()]), asOf);
    const byDefect = defectDebriefs(fir(), slice([card()]), asOf);
    expect(byCard).toHaveLength(1);
    expect(byCard[0].defectId).toBe(byDefect[0].defectId);
    expect(byCard[0].elapsedHours).toBe(byDefect[0].elapsedHours);
  });

  it('anchoring BOTH the card and its defect dedupes to one debrief, not two', () => {
    const both = defectDebriefs(
      fir({ anchors: [{ kind: 'DEFECT', refId: 'def-1' }, { kind: 'WORK_CARD', refId: 'wc-1' }] }),
      slice([card()]), asOf,
    );
    expect(both).toHaveLength(1);
  });

  it('a scheduled card with no linked defect contributes nothing rather than an invented event', () => {
    const scheduled = card({ id: 'wc-9', linkedDefectId: undefined, scheduled: true });
    const out = defectDebriefs(fir({ anchors: [{ kind: 'WORK_CARD', refId: 'wc-9' }] }), slice([scheduled]), asOf);
    expect(out).toEqual([]);
  });
});
