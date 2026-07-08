import type { DueRule, DueContext, Weekday } from './types';

const WEEKDAY_INDEX: Record<Weekday, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};
const DAY_MS = 86_400_000;

/** Build an ISO-UTC string from an office-local wall clock (Y/M/D H:M) + offset. */
function localWallClockToUtc(
  year: number, month1: number, day: number, hh: number, mm: number, offsetMinutes: number,
): string {
  // Interpret the wall clock as if it were UTC, then remove the office offset to get true UTC.
  const asIfUtcMs = Date.UTC(year, month1 - 1, day, hh, mm, 0, 0);
  return new Date(asIfUtcMs - offsetMinutes * 60_000).toISOString();
}

/**
 * A Date whose UTC fields equal the office-local wall clock of `iso`.
 * ALL calendar math below reads UTC fields only (getUTC*, Date.UTC, ms arithmetic),
 * so results are independent of the machine/CI timezone. Do NOT introduce date-fns
 * local-tz helpers (startOfWeek, getDay, startOfQuarter, subMonths) here.
 */
function localClock(iso: string, offsetMinutes: number): Date {
  return new Date(new Date(iso).getTime() + offsetMinutes * 60_000);
}

function parseTime(t: string): { hh: number; mm: number } {
  const [hh, mm] = t.split(':').map(Number);
  return { hh, mm };
}

export function computeDueAtUtc(rule: DueRule, ctx: DueContext): string {
  const off = ctx.officeTzOffsetMinutes;
  const ref = localClock(ctx.nowUtc, off);
  const y = ref.getUTCFullYear();
  const m1 = ref.getUTCMonth() + 1;
  const d = ref.getUTCDate();

  const requireEtd = (): string => {
    if (!ctx.etdUtc) throw new Error(`DueRule '${rule.kind}' requires ctx.etdUtc`);
    return ctx.etdUtc;
  };

  switch (rule.kind) {
    case 'dayOfTimeLocal': {
      const { hh, mm } = parseTime(rule.time);
      return localWallClockToUtc(y, m1, d, hh, mm, off);
    }
    case 'weekday': {
      // Monday-based week containing the reference local date.
      const fromMonday = (ref.getUTCDay() + 6) % 7; // days since Monday
      const monday = new Date(ref.getTime() - fromMonday * DAY_MS);
      const offsetDays = (WEEKDAY_INDEX[rule.day] + 6) % 7; // Mon=0 .. Sun=6
      const target = new Date(monday.getTime() + offsetDays * DAY_MS);
      const hh = rule.period === 'PM' ? 17 : 9;
      return localWallClockToUtc(
        target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), hh, 0, off,
      );
    }
    case 'dayOfMonth': {
      const hh = rule.when === 'around' ? 12 : 17;
      return localWallClockToUtc(y, m1, rule.day, hh, 0, off);
    }
    case 'quarterWeek': {
      const qStartMonth1 = Math.floor((m1 - 1) / 3) * 3 + 1; // 1,4,7,10
      const qStart = new Date(Date.UTC(y, qStartMonth1 - 1, 1));
      const target = new Date(qStart.getTime() + (rule.week - 1) * 7 * DAY_MS);
      return localWallClockToUtc(
        target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), 17, 0, off,
      );
    }
    case 'annualDate':
      return localWallClockToUtc(y, rule.month, rule.day, 17, 0, off);
    case 'hoursBeforeEtd':
      return new Date(new Date(requireEtd()).getTime() - rule.hours * 3_600_000).toISOString();
    case 'daysBeforeEtd': {
      // Calendar days: subtract N days (weekends included), land at 12:00 office-local —
      // the same noon-local convention as businessDaysBeforeEtd, minus the weekend skipping.
      const target = new Date(localClock(requireEtd(), off).getTime() - rule.days * DAY_MS);
      return localWallClockToUtc(
        target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), 12, 0, off,
      );
    }
    case 'businessDaysBeforeEtd': {
      // Step back `days` business days from ETD, skipping Sat/Sun. A Sunday ETD
      // naturally lands on the preceding Friday for days=1 (the "Fri-for-Sun" rule).
      let cursor = localClock(requireEtd(), off);
      let remaining = rule.days;
      while (remaining > 0) {
        cursor = new Date(cursor.getTime() - DAY_MS);
        const dow = cursor.getUTCDay();
        if (dow !== 0 && dow !== 6) remaining -= 1;
      }
      return localWallClockToUtc(
        cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate(), 12, 0, off,
      );
    }
    case 'monthsBeforeEtd': {
      const etd = localClock(requireEtd(), off);
      // Date.UTC normalizes a negative/overflowing month, so month subtraction is safe.
      const target = new Date(Date.UTC(
        etd.getUTCFullYear(), etd.getUTCMonth() - rule.months, etd.getUTCDate(),
      ));
      return localWallClockToUtc(
        target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), 12, 0, off,
      );
    }
    default: {
      const _exhaustive: never = rule;
      throw new Error(`Unknown DueRule kind: ${String((rule as { kind?: unknown }).kind)}`);
    }
  }
}
