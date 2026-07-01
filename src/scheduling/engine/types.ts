// Engine-wide types. Pure declarations, no logic. Extended (append-only) by later tasks.

export type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export type DueRule =
  | { kind: 'dayOfTimeLocal'; time: string /* 'HH:MM' 24h, office-local */ }
  | { kind: 'weekday'; day: Weekday; period?: 'AM' | 'PM' }
  | { kind: 'dayOfMonth'; day: number; when: 'before' | 'onOrBefore' | 'around' }
  | { kind: 'quarterWeek'; week: number /* 1 = first week of the quarter */ }
  | { kind: 'annualDate'; month: number /* 1-12 */; day: number }
  | { kind: 'hoursBeforeEtd'; hours: number }
  | { kind: 'businessDaysBeforeEtd'; days: number }
  | { kind: 'monthsBeforeEtd'; months: number };

export interface DueContext {
  /** Reference "now" (ISO UTC). For recurring tasks this is the duty day being generated. */
  nowUtc: string;
  /** Earliest departure / ETD (ISO UTC). Required for *BeforeEtd rules. */
  etdUtc?: string;
  /** Scheduling office local offset in minutes vs UTC for the reference date (e.g. -240 for EDT). */
  officeTzOffsetMinutes: number;
}
