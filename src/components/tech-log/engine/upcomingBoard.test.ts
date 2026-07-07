import { describe, it, expect } from 'vitest';
import { getDefaultState } from '../mockData/scenarios';
import { campForecast, type CampForecastItem } from '../integration/campClient';
import { buildUpcomingBoard, createForecastCard, BUCKET_ORDER } from './upcomingBoard';

const DAY_MS = 86400000;
const NOW_MS = Date.UTC(2026, 6, 3, 12, 0, 0); // fixed clock: 2026-07-03T12:00Z
const NOW = new Date(NOW_MS).toISOString();
const at = (days: number) => new Date(NOW_MS + days * DAY_MS).toISOString();

const fc = (over: Partial<CampForecastItem>): CampForecastItem => ({
  ref: 'FC-TEST', category: 'INSPECTION', ata: '05', description: 'Test item', dueDateUtc: at(10), ...over,
});

/** Seeded state + real campForecast for every dispatchable tail, on the fixed clock. */
function seededBoard() {
  const s = getDefaultState(NOW_MS); // seed on the same fixed clock we evaluate against
  const forecast = Object.fromEntries(
    s.aircraft
      .filter(a => !a.isProvisional)
      .map(a => [a.id, campForecast(a.serialNumber, { hours: a.airframeTotalHours, cycles: a.airframeTotalCycles }, NOW_MS)]),
  );
  return { s, forecast, board: buildUpcomingBoard(s, forecast, NOW) };
}

describe('buildUpcomingBoard — forecast bucketing', () => {
  const s = getDefaultState(NOW_MS);
  const n2 = s.aircraft.find(a => a.id === 'ac-n2pg')!;

  it('buckets by calendar days: overdue / ≤7d / ≤30d / horizon; >90d dropped', () => {
    const b = buildUpcomingBoard(s, {
      'ac-n2pg': [
        fc({ ref: 'F-PAST', dueDateUtc: at(-2) }),
        fc({ ref: 'F-5D', dueDateUtc: at(5) }),
        fc({ ref: 'F-12D', dueDateUtc: at(12) }),
        fc({ ref: 'F-80D', dueDateUtc: at(80) }),
        fc({ ref: 'F-120D', dueDateUtc: at(120) }),
      ],
    }, NOW);
    const bucketOfRef = (ref: string) =>
      BUCKET_ORDER.find(k => b.buckets[k].some(i => i.kind === 'CAMP_FORECAST' && i.refId === ref));
    expect(bucketOfRef('F-PAST')).toBe('OVERDUE');
    expect(bucketOfRef('F-5D')).toBe('DUE_7D');
    expect(bucketOfRef('F-12D')).toBe('DUE_30D');
    expect(bucketOfRef('F-80D')).toBe('HORIZON');
    expect(bucketOfRef('F-120D')).toBeUndefined(); // beyond CAMP's 3-month cap
  });

  it('escalates to at least DUE_7D when the hour clock is within 40 h of the airframe', () => {
    const b = buildUpcomingBoard(s, {
      'ac-n2pg': [fc({ ref: 'F-HRS', dueDateUtc: at(60), dueHours: n2.airframeTotalHours + 30 })],
    }, NOW);
    const item = b.buckets.DUE_7D.find(i => i.refId === 'F-HRS');
    expect(item).toBeDefined();
    expect(item!.dueHoursRemaining).toBe(30);
  });
});

describe('buildUpcomingBoard — MEL repair clocks', () => {
  it('surfaces the seeded N6PG ACTIVE deferral with its PL-25 due date (not grounding)', () => {
    const { s, board } = seededBoard();
    const df = s.deferrals.find(d => d.id === 'df-n6pg')!;
    const row = [...board.buckets.DUE_7D, ...board.buckets.DUE_30D].find(i => i.kind === 'DEFERRAL' && i.refId === 'df-n6pg');
    expect(row).toBeDefined();
    expect(row!.dueDateUtc).toBe(df.repairDueDateUtc);
    expect(row!.category).toBe(`MEL ${df.category}`);
    expect(row!.grounding).toBe(false);
  });

  it('an expired deferral lands in OVERDUE with grounding=true', () => {
    const { s, forecast } = seededBoard();
    const deferrals = s.deferrals.map(d => (d.id === 'df-n6pg' ? { ...d, repairDueDateUtc: at(-1) } : d));
    const b = buildUpcomingBoard({ ...s, deferrals }, forecast, NOW);
    const row = b.buckets.OVERDUE.find(i => i.refId === 'df-n6pg');
    expect(row).toBeDefined();
    expect(row!.grounding).toBe(true);
  });

  it('links a deferral row to the open corrective card via linkedDefectId', () => {
    const { s, forecast } = seededBoard();
    const df = s.deferrals.find(d => d.id === 'df-n6pg')!;
    const card = createForecastCard(fc({ ref: 'X' }), 'ac-n6pg', { cardId: 'wc-t1', stepIds: ['s1', 's2'] }, NOW);
    const linked = { ...card, forecastRef: undefined, linkedDefectId: df.defectId };
    const b = buildUpcomingBoard({ ...s, workCards: [...s.workCards, linked] }, forecast, NOW);
    const row = [...b.buckets.DUE_7D, ...b.buckets.DUE_30D].find(i => i.refId === 'df-n6pg');
    expect(row!.workCardId).toBe('wc-t1');
  });
});

describe('buildUpcomingBoard — recurring checks', () => {
  it('shows the N2PG altimeter check due soon; checks >90d out are excluded', () => {
    // Seed pins the N2PG altimeter accomplishment to 5d shy of its 24-month due (DUE_SOON),
    // deterministic because seededBoard seeds on the same fixed NOW the board evaluates against.
    const { board } = seededBoard();
    const alt = board.buckets.DUE_7D.find(i => i.kind === 'RECURRING_CHECK' && i.refId === 'rc-ac-n2pg-altstatic');
    expect(alt).toBeDefined();
    expect(alt!.grounding).toBe(false);
    const allChecks = BUCKET_ORDER.flatMap(k => board.buckets[k]).filter(i => i.kind === 'RECURRING_CHECK');
    expect(allChecks.some(i => i.refId === 'rc-ac-n2pg-elt')).toBe(false); // ~250d out
  });

  it('a back-dated accomplishment turns the check OVERDUE and grounding', () => {
    const { s, forecast } = seededBoard();
    const accs = s.recurringAccomplishments.map(a =>
      a.id === 'rca-ac-n2pg-altstatic' ? { ...a, accomplishedAtUtc: at(-800) } : a,
    );
    const b = buildUpcomingBoard({ ...s, recurringAccomplishments: accs }, forecast, NOW);
    const row = b.buckets.OVERDUE.find(i => i.refId === 'rc-ac-n2pg-altstatic');
    expect(row).toBeDefined();
    expect(row!.grounding).toBe(true);
  });
});

describe('buildUpcomingBoard — work-card linkage & demo spread', () => {
  it('N2PG FC-32-MLG links to seeded WC-1012; other tails have no card for it', () => {
    const { board } = seededBoard();
    const rows = BUCKET_ORDER.flatMap(k => board.buckets[k]).filter(i => i.refId === 'FC-32-MLG');
    const n2 = rows.find(r => r.aircraftId === 'ac-n2pg')!;
    expect(n2.workCardId).toBe('wc-2');
    expect(n2.workCardNumber).toBe('WC-1012');
    expect(rows.filter(r => r.aircraftId !== 'ac-n2pg').every(r => r.workCardId === undefined)).toBe(true);
  });

  it('the link disappears once the card is COMPLETED', () => {
    const { s, forecast } = seededBoard();
    const workCards = s.workCards.map(w => (w.id === 'wc-2' ? { ...w, status: 'COMPLETED' as const } : w));
    const b = buildUpcomingBoard({ ...s, workCards }, forecast, NOW);
    const row = BUCKET_ORDER.flatMap(k => b.buckets[k]).find(i => i.refId === 'FC-32-MLG' && i.aircraftId === 'ac-n2pg');
    expect(row!.workCardId).toBeUndefined();
  });

  it('perAircraft counts sum to totals, and the seeded fleet has an OVERDUE item (FC-28 spread)', () => {
    const { board } = seededBoard();
    for (const bucket of BUCKET_ORDER) {
      const sum = board.perAircraft.reduce((n, a) => n + a.counts[bucket], 0);
      expect(sum).toBe(board.totals[bucket]);
      expect(board.buckets[bucket]).toHaveLength(board.totals[bucket]);
    }
    // Deterministic hash spread: N6PG (S/N 72175) lands 1 day overdue on the wing anti-ice AD.
    const overdue = board.buckets.OVERDUE.find(i => i.refId === 'FC-28-AD-WAI');
    expect(overdue).toBeDefined();
    expect(overdue!.tailNumber).toBe('N6PG');
  });

  it('buckets are sorted most-urgent first (dueInDays ascending)', () => {
    const { board } = seededBoard();
    for (const bucket of BUCKET_ORDER) {
      const days = board.buckets[bucket].map(i => i.dueInDays ?? Number.MAX_SAFE_INTEGER);
      expect([...days].sort((a, b) => a - b)).toEqual(days);
    }
  });
});

describe('createForecastCard', () => {
  const item = fc({ ref: 'FC-27-AD2024-12', category: 'AD', ata: '27', description: 'AD 2024-12-05 flight-control rigging (recurring)' });
  const card = createForecastCard(item, 'ac-n1pg', { cardId: 'wc-abcd', stepIds: ['st-1', 'st-2'] }, NOW);

  it('creates an OPEN scheduled CAMP card carrying the forecastRef', () => {
    expect(card.status).toBe('OPEN');
    expect(card.source).toBe('CAMP');
    expect(card.scheduled).toBe(true);
    expect(card.forecastRef).toBe('FC-27-AD2024-12');
    expect(card.ataChapter).toBe('27');
    expect(card.headerStatusCode).toBe(1);
    expect(card.riiRequired).toBe(false);
  });

  it('is completable: has steps, none pre-done, and a display card number', () => {
    expect(card.steps.length).toBeGreaterThanOrEqual(1);
    expect(card.steps.every(s => !s.done)).toBe(true);
    expect(card.cardNumber).toMatch(/^WC-/);
  });
});
