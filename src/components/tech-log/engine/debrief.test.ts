import { describe, it, expect } from 'vitest';
import { buildDowntimeDebrief } from './debrief';
import type { Defect, LaborEntry, WorkCard } from '../types';

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

const labor: LaborEntry[] = [
  { id: 'lb-1', workCardId: 'wc-1', techOid: 'm1', hours: 2, dateUtc: '2026-07-07T22:00:00.000Z', description: 'Troubleshooting', category: 'TROUBLESHOOTING', note: 'Isolated to battery — 2 hrs with tech ops confirming load-test criteria' },
  { id: 'lb-2', workCardId: 'wc-1', techOid: 'm2', hours: 1, dateUtc: '2026-07-07T22:00:00.000Z', description: 'R&R prep', category: 'WRENCH' },
  { id: 'lb-x', workCardId: 'wc-other', techOid: 'm9', hours: 9, dateUtc: '2026-07-07T22:00:00.000Z', description: 'Unrelated card' },
];

const slice = (defects: Defect[], workCards: WorkCard[]) => ({ defects, workCards, laborEntries: labor });

describe('downtime debrief (QM5 — the C-suite "why and when" answer)', () => {
  const asOf = '2026-07-08T12:00:00.000Z';

  it('an ongoing event runs from report to asOf and is marked ongoing', () => {
    const d = buildDowntimeDebrief('def-1', slice([defect()], [card()]), asOf);
    expect(d.startUtc).toBe('2026-07-07T08:00:00.000Z');
    expect(d.ongoing).toBe(true);
    expect(d.elapsedHours).toBe(28);
  });

  it('decomposes elapsed time into attributed state-hours and an unattributed remainder', () => {
    const d = buildDowntimeDebrief('def-1', slice([defect()], [card()]), asOf);
    expect(d.stateHours.IN_WORK).toBe(3);        // 09:00 → 12:00
    expect(d.stateHours.WAITING_PARTS).toBe(24); // 12:00 → asOf
    expect(d.untaggedHours).toBe(1);             // 08:00 report → 09:00 card raised
  });

  it('tells the story chronologically: reported → card raised → tags (with notes)', () => {
    const d = buildDowntimeDebrief('def-1', slice([defect()], [card()]), asOf);
    expect(d.events.map(e => e.kind)).toEqual(['REPORTED', 'CARD_RAISED', 'TAG', 'TAG']);
    expect(d.events[3].note).toMatch(/GAC Savannah/);
  });

  it('rolls up labor for this event only (other cards excluded), with why-notes', () => {
    const d = buildDowntimeDebrief('def-1', slice([defect()], [card()]), asOf);
    expect(d.labor.totalHours).toBe(3);
    expect(d.labor.byCategory.find(c => c.category === 'TROUBLESHOOTING')?.hours).toBe(2);
    expect(d.labor.whyNotes).toHaveLength(1);
  });

  it('a cleared event ends at clearedTsUtc with a CLEARED closing entry', () => {
    const cleared = defect({ id: 'def-2', supersedesId: 'def-1', status: 'RECTIFIED', clearedTsUtc: '2026-07-08T10:00:00.000Z', clearedByOid: 'm1' });
    const done = card({ status: 'COMPLETED', completedAtUtc: '2026-07-08T10:00:00.000Z' });
    const d = buildDowntimeDebrief('def-1', slice([defect(), cleared], [done]), asOf);
    expect(d.ongoing).toBe(false);
    expect(d.endUtc).toBe('2026-07-08T10:00:00.000Z');
    expect(d.elapsedHours).toBe(26);
    expect(d.events[d.events.length - 1].kind).toBe('CLEARED');
  });

  it('follows the supersede chain: asking by the corrected head id still finds cards linked to the original', () => {
    const corrected = defect({ id: 'def-9', supersedesId: 'def-1' });
    const d = buildDowntimeDebrief('def-9', slice([defect(), corrected], [card()]), asOf);
    expect(d.stateHours.WAITING_PARTS).toBe(24);
    expect(d.labor.totalHours).toBe(3);
  });
});

describe('downtime debrief — D61 states and gap handling', () => {
  const asOf = '2026-07-08T12:00:00.000Z';

  it('picks up DIAGNOSING in the state decomposition without being told to', () => {
    const c = card({
      statusTags: [
        { tag: 'DIAGNOSING', atUtc: '2026-07-07T09:00:00.000Z', byOid: 'm1' },
        { tag: 'IN_WORK', atUtc: '2026-07-07T13:00:00.000Z', byOid: 'm1' },
      ],
    });
    const d = buildDowntimeDebrief('def-1', slice([defect()], [c]), asOf);
    expect(d.stateHours.DIAGNOSING).toBe(4);
    expect(d.stateHours.IN_WORK).toBe(23);
    expect(d.untaggedHours).toBe(1);
  });

  it('an INCLUDED gap is attributed to GAP, and the downtime figure is unchanged', () => {
    const c = card({
      statusTags: [
        { tag: 'IN_WORK', atUtc: '2026-07-07T09:00:00.000Z', byOid: 'm1' },
        { tag: 'GAP', atUtc: '2026-07-07T18:00:00.000Z', byOid: 'm1', gapReason: 'END_OF_SHIFT' },
        { tag: 'IN_WORK', atUtc: '2026-07-08T08:00:00.000Z', byOid: 'm1' },
      ],
    });
    const d = buildDowntimeDebrief('def-1', slice([defect()], [c]), asOf);
    expect(d.stateHours.GAP).toBe(14);
    expect(d.excludedGapHours).toBe(0);
    expect(d.countedDowntimeHours).toBe(d.elapsedHours);
  });

  it('an EXCLUDED gap comes off the counted downtime and does not resurface as unattributed time', () => {
    const c = card({
      statusTags: [
        { tag: 'IN_WORK', atUtc: '2026-07-07T09:00:00.000Z', byOid: 'm1' },
        { tag: 'GAP', atUtc: '2026-07-07T18:00:00.000Z', byOid: 'm1', gapReason: 'END_OF_SHIFT', includeInTotals: false },
        { tag: 'IN_WORK', atUtc: '2026-07-08T08:00:00.000Z', byOid: 'm1' },
      ],
    });
    const d = buildDowntimeDebrief('def-1', slice([defect()], [c]), asOf);
    expect(d.elapsedHours).toBe(28);          // the calendar is still the calendar
    expect(d.excludedGapHours).toBe(14);
    expect(d.countedDowntimeHours).toBe(14);
    expect(d.stateHours.GAP).toBe(0);
    expect(d.untaggedHours).toBe(1);          // still just the pre-triage hour — NOT 15
  });
});
