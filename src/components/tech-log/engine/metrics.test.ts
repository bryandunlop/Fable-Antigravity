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

/**
 * D61 amendment, ratified by Bryan 2026-07-30: `timeToDiagnose` is the SUM of the `DIAGNOSING`
 * spans — hands-on time — not raised-to-first-transition wall clock. The accepted cost, recorded on
 * the decision so it is not rediscovered later as a bug, is that this measurement **hides the
 * queue**: a card nobody opened for three days now looks identical to one picked up immediately.
 * The waiting is still in the timeline as spans; it is simply not what this number reports.
 */
describe('timeToDiagnose — the hands-on diagnosis hours (D61 amendment)', () => {
  it('is the DIAGNOSING span itself, not wall clock from the card being raised', () => {
    const c = card({
      statusTags: [ev('DIAGNOSING', '2026-07-07T09:00:00.000Z'), ev('IN_WORK', '2026-07-07T14:00:00.000Z')],
    });
    // Hand-computed: the card was raised at 08:00, the technician started at 09:00 and stopped
    // diagnosing at 14:00. Hands-on = 09:00 → 14:00 = 5 h. The idle hour before anyone picked it up
    // is deliberately NOT in here — that is the queue, and the queue is not what this reports.
    expect(timeToDiagnose(c)).toBe(5);
  });

  it('the case that forced the amendment: raised Friday, picked up Monday, two hours on it', () => {
    const c = card({
      createdAtUtc: '2026-07-03T16:00:00.000Z',                  // Friday afternoon
      statusTags: [
        ev('DIAGNOSING', '2026-07-06T09:00:00.000Z'),            // Monday morning
        ev('IN_WORK', '2026-07-06T11:00:00.000Z'),
      ],
    });
    // Hand-computed: Fri 16:00 → Mon 11:00 is 67 h of wall clock, which the pre-amendment
    // measurement reported as a three-day diagnosis. Hands-on is Mon 09:00 → 11:00 = 2 h.
    expect(timeToDiagnose(c)).toBe(2);
  });

  it('is null when the card was never diagnosed', () => {
    expect(timeToDiagnose(card({ statusTags: [ev('IN_WORK', '2026-07-07T09:00:00.000Z')] }))).toBeNull();
    expect(timeToDiagnose(card())).toBeNull();
  });

  it('is null while still diagnosing — an unfinished diagnosis is not a duration', () => {
    expect(timeToDiagnose(card({ statusTags: [ev('DIAGNOSING', '2026-07-07T09:00:00.000Z')] }))).toBeNull();
  });

  it('a relapse into diagnosing ADDS to the total — both stretches were hands on the aircraft', () => {
    const c = card({
      statusTags: [
        ev('DIAGNOSING', '2026-07-07T09:00:00.000Z'),
        ev('IN_WORK', '2026-07-07T12:00:00.000Z'),
        ev('DIAGNOSING', '2026-07-07T18:00:00.000Z'),
        ev('IN_WORK', '2026-07-07T20:00:00.000Z'),
      ],
    });
    // Hand-computed: 09:00→12:00 = 3 h, plus 18:00→20:00 = 2 h, total 5 h. The six IN_WORK hours in
    // between are not diagnosis. (The pre-amendment rule closed at the first exit and said 4 h.)
    expect(timeToDiagnose(c)).toBe(5);
  });

  it('a gap inside the diagnosis contributes nothing — counted or not, a gap is not diagnosis', () => {
    const overnight = (include: boolean) => card({
      statusTags: [
        ev('DIAGNOSING', '2026-07-07T09:00:00.000Z'),
        ev('GAP', '2026-07-07T18:00:00.000Z', { gapReason: 'END_OF_SHIFT', includeInTotals: include }),
        ev('DIAGNOSING', '2026-07-08T08:00:00.000Z'),
        ev('IN_WORK', '2026-07-08T10:00:00.000Z'),
      ],
    });
    // Hand-computed: 09:00→18:00 = 9 h, plus 08:00→10:00 = 2 h, total 11 h either way. The gap is
    // its own span, so hands-on time needs no gap subtraction at all — the include/exclude choice
    // cannot move this number.
    expect(timeToDiagnose(overnight(false))).toBe(11);
    expect(timeToDiagnose(overnight(true))).toBe(11);
  });

  it('a diagnosis that ran right up to sign-off closes at completedAtUtc', () => {
    const c = card({
      status: 'COMPLETED', completedAtUtc: '2026-07-07T15:00:00.000Z',
      statusTags: [ev('DIAGNOSING', '2026-07-07T09:00:00.000Z')],
    });
    // Hand-computed: 09:00 → 15:00 = 6 h.
    expect(timeToDiagnose(c)).toBe(6);
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
    // Hand-computed hands-on diagnosis (D61 amendment): wc-a DIAGNOSING 09:00→12:00 = 3 h;
    // wc-b DIAGNOSING 08:00→16:00 = 8 h. wc-a was raised at 08:00, and that idle hour is the queue,
    // which this metric deliberately does not report.
    expect(ac1.diagnoseHours).toEqual([3, 8]);
    expect(ac1.medianDiagnoseHours).toBe(5.5);
    expect(ac1.avgDiagnoseHours).toBe(5.5);
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
