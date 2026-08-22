import { describe, it, expect } from 'vitest';
import {
  fiscalYearOf,
  fiscalYearRange,
  isInFiscalYear,
  addDays,
  weekStart,
  monthStart,
  todayLocal,
  byWeek,
  byCategory,
  byFiscalYear,
  summarise,
  formatDuration,
  formatHours,
  formatDayLabel,
  toCsv,
  type WorkLogEntry,
} from './workLog';

function entry(over: Partial<WorkLogEntry> & { localDate: string; minutes: number }): WorkLogEntry {
  return {
    id: `e-${over.localDate}-${over.minutes}`,
    category: 'design',
    source: 'manual',
    note: '',
    createdAt: '2026-08-04T00:00:00Z',
    updatedAt: '2026-08-04T00:00:00Z',
    ...over,
  };
}

describe('fiscal year — 1 July to 30 June, labelled by the year it ends in', () => {
  it('puts 1 July in the FY that ends the following June', () => {
    expect(fiscalYearOf('2026-07-01')).toBe('FY27');
  });

  it('puts 30 June in the FY that ends that month', () => {
    expect(fiscalYearOf('2026-06-30')).toBe('FY26');
  });

  it('does not shift the boundary for a session logged just after midnight', () => {
    // The bug this guards: computing the FY from a Date built out of an ISO
    // instant put 2026-07-01T00:30+02:00 (22:30Z on 30 June) into FY26.
    // The calendar day the work happened on is the one that counts.
    expect(fiscalYearOf('2026-07-01')).toBe('FY27');
    expect(fiscalYearOf('2026-12-31')).toBe('FY27');
    expect(fiscalYearOf('2027-01-01')).toBe('FY27');
    expect(fiscalYearOf('2027-06-30')).toBe('FY27');
    expect(fiscalYearOf('2027-07-01')).toBe('FY28');
  });

  it('round-trips a label back to its bounds', () => {
    expect(fiscalYearRange('FY27')).toEqual({ start: '2026-07-01', end: '2027-06-30' });
  });

  it('bounds are inclusive at both ends', () => {
    expect(isInFiscalYear('2026-07-01', 'FY27')).toBe(true);
    expect(isInFiscalYear('2027-06-30', 'FY27')).toBe(true);
    expect(isInFiscalYear('2026-06-30', 'FY27')).toBe(false);
    expect(isInFiscalYear('2027-07-01', 'FY27')).toBe(false);
  });
});

describe('calendar arithmetic', () => {
  it('adds days across a month boundary', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
  });

  it('adds days across a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('subtracts across a month boundary', () => {
    expect(addDays('2026-08-01', -1)).toBe('2026-07-31');
  });

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('weekStart returns the Monday of the containing week', () => {
    // 2026-08-04 is a Tuesday.
    expect(weekStart('2026-08-04')).toBe('2026-08-03');
    expect(weekStart('2026-08-03')).toBe('2026-08-03');
  });

  it('weekStart treats Sunday as the END of its week, not the start', () => {
    // 2026-08-09 is a Sunday — it belongs to the week beginning Mon 3 Aug.
    expect(weekStart('2026-08-09')).toBe('2026-08-03');
    expect(weekStart('2026-08-10')).toBe('2026-08-10');
  });

  it('monthStart truncates to the first', () => {
    expect(monthStart('2026-08-04')).toBe('2026-08-01');
  });

  it('todayLocal uses the local clock, not UTC', () => {
    // A local time late on the 4th must not report the 5th just because UTC
    // has rolled over (or the 3rd, because it has not).
    const d = new Date(2026, 7, 4, 23, 30);
    expect(todayLocal(d)).toBe('2026-08-04');
  });
});

describe('aggregation', () => {
  const entries = [
    entry({ localDate: '2026-07-06', minutes: 360, category: 'assisted-build', source: 'git' }),
    entry({ localDate: '2026-07-06', minutes: 30, category: 'design' }),
    entry({ localDate: '2026-07-07', minutes: 120, category: 'stakeholder' }),
    entry({ localDate: '2026-07-27', minutes: 60, category: 'design' }),
  ];

  it('sums by category, largest first', () => {
    const cats = byCategory(entries);
    expect(cats[0]).toEqual({ key: 'assisted-build', minutes: 360, entries: 1 });
    expect(cats.find((c) => c.key === 'design')).toEqual({
      key: 'design',
      minutes: 90,
      entries: 2,
    });
  });

  it('splits assisted from solo time by source as well as category', () => {
    const s = summarise(entries, '2026-08-04');
    expect(s.totalMinutes).toBe(570);
    expect(s.assistedMinutes).toBe(360);
    expect(s.soloMinutes).toBe(210);
  });

  it('counts distinct days worked, not entries', () => {
    const s = summarise(entries, '2026-08-04');
    expect(s.entries).toBe(4);
    expect(s.days).toBe(3);
    expect(s.averageDayMinutes).toBe(190);
  });

  it('averages over days worked rather than dividing by zero on an empty log', () => {
    expect(summarise([], '2026-08-04').averageDayMinutes).toBe(0);
  });

  it('this-week and this-month totals are relative to the given day', () => {
    const s = summarise(entries, '2026-07-07');
    expect(s.thisWeekMinutes).toBe(510); // Mon 6 Jul + Tue 7 Jul, NOT 27 Jul
    expect(s.thisMonthMinutes).toBe(570);
  });

  it('this-week excludes later weeks, not just earlier ones', () => {
    // The window is bounded at both ends. An open-ended `>= weekStart` made
    // every future-dated row count as "this week", which in a log spanning a
    // fiscal year is most of them.
    const s = summarise(entries, '2026-07-20');
    expect(s.thisWeekMinutes).toBe(0);
  });

  it('this-month stops at the month boundary', () => {
    const s = summarise(
      [entry({ localDate: '2026-07-31', minutes: 60 }), entry({ localDate: '2026-08-01', minutes: 90 })],
      '2026-07-31',
    );
    expect(s.thisMonthMinutes).toBe(60);
  });

  it('buckets by fiscal year', () => {
    const rows = byFiscalYear([
      entry({ localDate: '2026-06-24', minutes: 30 }),
      entry({ localDate: '2026-07-06', minutes: 360 }),
    ]);
    expect(rows).toEqual([
      { key: 'FY27', minutes: 360, entries: 1 },
      { key: 'FY26', minutes: 30, entries: 1 },
    ]);
  });

  it('byWeek emits silent weeks as zeroes so a chart shows the gap', () => {
    // 6 Jul and 27 Jul are three weeks apart; the two idle weeks between them
    // are real information — collapsing them would draw a continuous grind.
    const weeks = byWeek(entries);
    expect(weeks.map((w) => w.key)).toEqual([
      '2026-07-06',
      '2026-07-13',
      '2026-07-20',
      '2026-07-27',
    ]);
    expect(weeks.map((w) => w.minutes)).toEqual([510, 0, 0, 60]);
  });

  it('byWeek on an empty log is empty, not a crash', () => {
    expect(byWeek([])).toEqual([]);
  });
});

describe('formatting', () => {
  it('formats durations the way you would say them', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(95)).toBe('1h 35m');
    expect(formatDuration(0)).toBe('0m');
  });

  it('formats decimal hours for totals', () => {
    expect(formatHours(95)).toBe('1.6');
    expect(formatHours(4884)).toBe('81.4');
  });

  it('labels today and yesterday by name', () => {
    expect(formatDayLabel('2026-08-04', '2026-08-04')).toBe('Today');
    expect(formatDayLabel('2026-08-03', '2026-08-04')).toBe('Yesterday');
    expect(formatDayLabel('2026-07-27', '2026-08-04')).toContain('Jul');
  });
});

describe('CSV export', () => {
  it('emits one row per entry, oldest first, with the FY resolved', () => {
    const csv = toCsv([
      entry({ localDate: '2026-07-07', minutes: 120, category: 'stakeholder' }),
      entry({ localDate: '2026-06-24', minutes: 30, category: 'design' }),
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('date,fiscal_year,hours,minutes,category,source,commits,note');
    expect(lines[1]).toBe('2026-06-24,FY26,0.5,30,Design & thinking,manual,,');
    expect(lines[2]).toBe('2026-07-07,FY27,2.0,120,Stakeholder & meetings,manual,,');
  });

  it('quotes a note containing a comma, quote or newline', () => {
    const csv = toCsv([
      entry({ localDate: '2026-07-07', minutes: 60, note: 'called DOM, said "no"' }),
    ]);
    expect(csv.split('\n')[1]).toContain('"called DOM, said ""no"""');
  });
});
