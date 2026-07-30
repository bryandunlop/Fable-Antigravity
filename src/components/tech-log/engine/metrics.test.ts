import { describe, it, expect } from 'vitest';
import { timeToDiagnose, partsLeadTimes, installTime, fleetMetrics, median } from './metrics';
import type { PartsOrder, StatusTagEvent, WorkCard } from '../types';

const ev = (tag: StatusTagEvent['tag'], atUtc: string, over: Partial<StatusTagEvent> = {}): StatusTagEvent =>
  ({ tag, atUtc, byOid: 'm1', ...over });

const card = (over: Partial<WorkCard> = {}): WorkCard => ({
  id: 'wc-1', cardNumber: 'WC-1001', aircraftId: 'ac-1', title: 'Replace main battery',
  ataChapter: '24', description: '', steps: [], status: 'IN_WORK', source: 'MANUAL',
  headerStatusCode: 1, scheduled: false, riiRequired: false,
  createdAtUtc: '2026-07-07T08:00:00.000Z',
  ...over,
});

const order = (over: Partial<PartsOrder> = {}): PartsOrder => ({
  id: 'po-1', description: 'Main battery', vendor: 'Gulfstream',
  orderedAtUtc: '2026-07-07T12:00:00.000Z', ...over,
});

describe('timeToDiagnose — card raised → the moment diagnosis ended', () => {
  it('measures from the card being raised to the first transition OUT of diagnosing', () => {
    const c = card({
      statusTags: [ev('DIAGNOSING', '2026-07-07T09:00:00.000Z'), ev('IN_WORK', '2026-07-07T14:00:00.000Z')],
    });
    // Deliberately includes the hour between the card being raised and anyone starting: "how long
    // did it take to work out what was wrong" is asked from when the job landed, not from the
    // moment somebody happened to tag it.
    expect(timeToDiagnose(c)).toBe(6);
  });

  it('is null when the card was never diagnosed', () => {
    expect(timeToDiagnose(card({ statusTags: [ev('IN_WORK', '2026-07-07T09:00:00.000Z')] }))).toBeNull();
    expect(timeToDiagnose(card())).toBeNull();
  });

  it('is null while still diagnosing — an unfinished diagnosis is not a duration', () => {
    expect(timeToDiagnose(card({ statusTags: [ev('DIAGNOSING', '2026-07-07T09:00:00.000Z')] }))).toBeNull();
  });

  it('closes at the FIRST exit, so a later relapse into diagnosing does not extend it', () => {
    const c = card({
      statusTags: [
        ev('DIAGNOSING', '2026-07-07T09:00:00.000Z'),
        ev('IN_WORK', '2026-07-07T12:00:00.000Z'),
        ev('DIAGNOSING', '2026-07-07T18:00:00.000Z'),
        ev('IN_WORK', '2026-07-07T20:00:00.000Z'),
      ],
    });
    expect(timeToDiagnose(c)).toBe(4);
  });

  it('subtracts an excluded gap that fell inside the diagnosis window', () => {
    const c = card({
      statusTags: [
        ev('DIAGNOSING', '2026-07-07T09:00:00.000Z'),
        ev('GAP', '2026-07-07T18:00:00.000Z', { gapReason: 'END_OF_SHIFT', includeInTotals: false }),
        ev('DIAGNOSING', '2026-07-08T08:00:00.000Z'),
        ev('IN_WORK', '2026-07-08T10:00:00.000Z'),
      ],
    });
    // 08:00 raised → 10:00 next day = 26 h, less the 14 h overnight the tech chose not to count.
    expect(timeToDiagnose(c)).toBe(12);
  });
});

describe('partsLeadTimes — how long the vendor took', () => {
  it('reports ordered → received per order', () => {
    const c = card({ partsOrders: [order({ receivedAtUtc: '2026-07-09T12:00:00.000Z' })] });
    const [lead] = partsLeadTimes(c, '2026-07-20T00:00:00.000Z');
    expect(lead).toMatchObject({ orderId: 'po-1', vendor: 'Gulfstream', open: false, hours: 48 });
  });

  it('an open order reports elapsed-so-far and is flagged open, never counted as delivered', () => {
    const c = card({ partsOrders: [order()] });
    const [lead] = partsLeadTimes(c, '2026-07-08T12:00:00.000Z');
    expect(lead.open).toBe(true);
    expect(lead.hours).toBe(24);
  });

  it('returns nothing for a card with no orders', () => {
    expect(partsLeadTimes(card(), '2026-07-08T12:00:00.000Z')).toEqual([]);
  });
});

describe('installTime — the wrench hours', () => {
  it('is the IN_WORK total, so a logged overnight does not inflate it', () => {
    const c = card({
      statusTags: [
        ev('IN_WORK', '2026-07-07T09:00:00.000Z'),
        ev('GAP', '2026-07-07T18:00:00.000Z', { gapReason: 'END_OF_SHIFT' }),
        ev('IN_WORK', '2026-07-08T08:00:00.000Z'),
      ],
      status: 'COMPLETED', completedAtUtc: '2026-07-08T11:00:00.000Z',
    });
    expect(installTime(c, '2026-07-20T00:00:00.000Z')).toBe(12);
  });
});

describe('median', () => {
  it('is the middle value for an odd count and the mean of the middle two for an even one', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('fleetMetrics — per tail and fleet rollups', () => {
  const cards: WorkCard[] = [
    card({
      id: 'wc-a', cardNumber: 'WC-A', aircraftId: 'ac-1', createdAtUtc: '2026-07-01T08:00:00.000Z',
      statusTags: [ev('DIAGNOSING', '2026-07-01T09:00:00.000Z'), ev('IN_WORK', '2026-07-01T12:00:00.000Z')],
      status: 'COMPLETED', completedAtUtc: '2026-07-01T16:00:00.000Z',
      partsOrders: [order({ id: 'po-a', vendor: 'Gulfstream', orderedAtUtc: '2026-07-01T10:00:00.000Z', receivedAtUtc: '2026-07-02T10:00:00.000Z' })],
    }),
    card({
      id: 'wc-b', cardNumber: 'WC-B', aircraftId: 'ac-1', createdAtUtc: '2026-07-05T08:00:00.000Z',
      statusTags: [ev('DIAGNOSING', '2026-07-05T08:00:00.000Z'), ev('IN_WORK', '2026-07-05T16:00:00.000Z')],
      status: 'COMPLETED', completedAtUtc: '2026-07-05T18:00:00.000Z',
      partsOrders: [order({ id: 'po-b', vendor: 'Gulfstream', orderedAtUtc: '2026-07-05T09:00:00.000Z', receivedAtUtc: '2026-07-08T09:00:00.000Z' })],
    }),
    card({
      id: 'wc-c', cardNumber: 'WC-C', aircraftId: 'ac-2', createdAtUtc: '2026-07-06T08:00:00.000Z',
      statusTags: [ev('IN_WORK', '2026-07-06T08:00:00.000Z')],
      status: 'COMPLETED', completedAtUtc: '2026-07-06T11:00:00.000Z',
      partsOrders: [order({ id: 'po-c', vendor: 'Duncan Aviation', orderedAtUtc: '2026-07-06T09:00:00.000Z', receivedAtUtc: '2026-07-06T21:00:00.000Z' })],
    }),
  ];
  const window = { fromUtc: '2026-06-30T00:00:00.000Z', toUtc: '2026-07-31T00:00:00.000Z', asOfUtc: '2026-07-31T00:00:00.000Z' };

  it('groups by tail and reports the card ids behind every number', () => {
    const m = fleetMetrics(cards, window);
    expect(m.byAircraft.map(a => a.aircraftId)).toEqual(['ac-1', 'ac-2']);
    expect(m.byAircraft[0].cardIds).toEqual(['wc-a', 'wc-b']);
  });

  it('reports median and average time-to-diagnose per tail', () => {
    const m = fleetMetrics(cards, window);
    const ac1 = m.byAircraft[0];
    expect(ac1.diagnoseHours).toEqual([4, 8]);     // wc-a: 08:00→12:00, wc-b: 08:00→16:00
    expect(ac1.medianDiagnoseHours).toBe(6);
    expect(ac1.avgDiagnoseHours).toBe(6);
  });

  it('a tail that never diagnosed reports null rather than zero', () => {
    const m = fleetMetrics(cards, window);
    expect(m.byAircraft[1].medianDiagnoseHours).toBeNull();
  });

  it('rolls parts lead time up by vendor across the fleet', () => {
    const m = fleetMetrics(cards, window);
    const gac = m.byVendor.find(v => v.vendor === 'Gulfstream')!;
    expect(gac.orders).toBe(2);
    expect(gac.medianLeadHours).toBe(48);          // 24 h and 72 h
    expect(gac.openOrders).toBe(0);
    expect(m.byVendor.find(v => v.vendor === 'Duncan Aviation')!.medianLeadHours).toBe(12);
  });

  it('excludes cards raised outside the window', () => {
    const m = fleetMetrics(cards, { ...window, fromUtc: '2026-07-04T00:00:00.000Z' });
    expect(m.cards).toBe(2);
    expect(m.byAircraft.flatMap(a => a.cardIds)).toEqual(['wc-b', 'wc-c']);
  });

  it('an empty window reports zeroes and nulls, not NaN', () => {
    const m = fleetMetrics(cards, { ...window, fromUtc: '2027-01-01T00:00:00.000Z', toUtc: '2027-02-01T00:00:00.000Z' });
    expect(m.cards).toBe(0);
    expect(m.byAircraft).toEqual([]);
    expect(m.medianDiagnoseHours).toBeNull();
    expect(m.totalInstallHours).toBe(0);
  });

  it('surfaces excluded gap hours at fleet level so an exclusion is visible, not vanished', () => {
    const withGap = card({
      id: 'wc-d', aircraftId: 'ac-3', createdAtUtc: '2026-07-10T08:00:00.000Z',
      statusTags: [
        ev('IN_WORK', '2026-07-10T08:00:00.000Z'),
        ev('GAP', '2026-07-10T18:00:00.000Z', { gapReason: 'CONTRACT_MX_AWAY', includeInTotals: false }),
        ev('IN_WORK', '2026-07-13T08:00:00.000Z'),
      ],
      status: 'COMPLETED', completedAtUtc: '2026-07-13T10:00:00.000Z',
    });
    const m = fleetMetrics([...cards, withGap], window);
    expect(m.excludedGapHours).toBe(62);
    expect(m.byAircraft.find(a => a.aircraftId === 'ac-3')!.excludedGapHours).toBe(62);
  });
});
