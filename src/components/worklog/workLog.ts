/**
 * Work Log — pure logic. No React, no network, no product coupling.
 *
 * This module is deliberately standalone: the work log is a personal effort
 * tracker, not part of the myGFO product surface. It shares the app's database
 * and deploy because those already exist and already reach the phone, and
 * nothing else. Nothing in flight ops imports from here, and this imports
 * nothing from flight ops.
 *
 * Every date here is a plain 'YYYY-MM-DD' calendar string, and every function
 * below does string/number arithmetic on it rather than going through a local
 * Date. That is not fussiness: commits in this repo carry offsets from -0400 to
 * +0200, and a fiscal year computed via Date#getMonth() puts a 01 July 00:30
 * +0200 session in the previous FY. The day the work happened is the day it
 * counts against, wherever the laptop was.
 */

// ─── Fiscal year: 1 July → 30 June, labelled by the year it ends in ─────────

/** '2026-07-01' → 'FY27'; '2026-06-30' → 'FY26'. */
export function fiscalYearOf(localDate: string): string {
  const year = Number(localDate.slice(0, 4));
  const month = Number(localDate.slice(5, 7));
  const ending = month >= 7 ? year + 1 : year;
  return `FY${String(ending % 100).padStart(2, '0')}`;
}

/** Inclusive calendar bounds of a fiscal year label. */
export function fiscalYearRange(fy: string): { start: string; end: string } {
  const ending = 2000 + Number(fy.replace(/\D/g, ''));
  return { start: `${ending - 1}-07-01`, end: `${ending}-06-30` };
}

/** Human label for a FY, e.g. 'FY27 · Jul 2026 – Jun 2027'. */
export function fiscalYearLabel(fy: string): string {
  const { start, end } = fiscalYearRange(fy);
  return `${fy} · Jul ${start.slice(0, 4)} – Jun ${end.slice(0, 4)}`;
}

export function isInFiscalYear(localDate: string, fy: string): boolean {
  const { start, end } = fiscalYearRange(fy);
  return localDate >= start && localDate <= end;
}

// ─── Categories ─────────────────────────────────────────────────────────────
//
// Stored as free text rather than a pg enum on purpose. These will change —
// a category is a note to yourself about where time went, and needing a schema
// migration to add "vendor call" would mean the list just never grows.

export interface Category {
  id: string;
  label: string;
  /** Short label for the phone chips, where horizontal room is the constraint. */
  short: string;
  /** Assisted work is derived from git; everything else is logged by hand. */
  assisted?: boolean;
}

export const CATEGORIES: Category[] = [
  { id: 'assisted-build', label: 'Assisted build session', short: 'Build', assisted: true },
  { id: 'solo-build', label: 'Solo build / debugging', short: 'Solo build' },
  { id: 'design', label: 'Design & thinking', short: 'Design' },
  { id: 'stakeholder', label: 'Stakeholder & meetings', short: 'Meetings' },
  { id: 'testing', label: 'Device & field testing', short: 'Testing' },
  { id: 'research', label: 'Research & regulations', short: 'Research' },
  { id: 'spec', label: 'Spec & documentation', short: 'Spec' },
  { id: 'vendor', label: 'Vendor & integration', short: 'Vendor' },
  { id: 'admin', label: 'Admin & planning', short: 'Admin' },
  { id: 'other', label: 'Other', short: 'Other' },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryLabel(id: string): string {
  return CATEGORY_BY_ID.get(id)?.label ?? id;
}

/** Categories offered on the log form — the assisted one is derived, never typed. */
export const MANUAL_CATEGORIES = CATEGORIES.filter((c) => !c.assisted);

export type EntrySource = 'git' | 'manual' | 'timer';

export interface WorkLogEntry {
  id: string;
  /** The calendar day this time counts against, 'YYYY-MM-DD'. */
  localDate: string;
  minutes: number;
  category: string;
  source: EntrySource;
  note: string;
  startedAt?: string | null;
  endedAt?: string | null;
  commits?: number | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Calendar arithmetic on 'YYYY-MM-DD' ───────────────────────────────────
// Date.UTC is safe here precisely because these are calendar dates with no
// instant attached — no offset can shift them.

function toUtcMs(localDate: string): number {
  return Date.UTC(
    Number(localDate.slice(0, 4)),
    Number(localDate.slice(5, 7)) - 1,
    Number(localDate.slice(8, 10)),
  );
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(localDate: string, days: number): string {
  return fromUtcMs(toUtcMs(localDate) + days * 86_400_000);
}

/** Monday of the week containing localDate. */
export function weekStart(localDate: string): string {
  const dow = new Date(toUtcMs(localDate)).getUTCDay(); // 0=Sun
  return addDays(localDate, dow === 0 ? -6 : 1 - dow);
}

export function monthStart(localDate: string): string {
  return `${localDate.slice(0, 7)}-01`;
}

/** First day of the following month — the exclusive upper bound of a month. */
export function nextMonthStart(localDate: string): string {
  const y = Number(localDate.slice(0, 4));
  const m = Number(localDate.slice(5, 7));
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

/** Today as a local calendar date — the user's clock, not UTC. */
export function todayLocal(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// ─── Aggregation ────────────────────────────────────────────────────────────

export interface Bucket {
  key: string;
  minutes: number;
  entries: number;
}

function tally(entries: WorkLogEntry[], keyOf: (e: WorkLogEntry) => string): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const e of entries) {
    const key = keyOf(e);
    const b = map.get(key) ?? { key, minutes: 0, entries: 0 };
    b.minutes += e.minutes;
    b.entries += 1;
    map.set(key, b);
  }
  return [...map.values()];
}

export function byDate(entries: WorkLogEntry[]): Bucket[] {
  return tally(entries, (e) => e.localDate).sort((a, b) => b.key.localeCompare(a.key));
}

export function byCategory(entries: WorkLogEntry[]): Bucket[] {
  return tally(entries, (e) => e.category).sort((a, b) => b.minutes - a.minutes);
}

export function byFiscalYear(entries: WorkLogEntry[]): Bucket[] {
  return tally(entries, (e) => fiscalYearOf(e.localDate)).sort((a, b) => b.key.localeCompare(a.key));
}

/** Consecutive weeks from the first to the last entry, gaps included as zeroes. */
export function byWeek(entries: WorkLogEntry[]): Bucket[] {
  if (entries.length === 0) return [];
  const filled = tally(entries, (e) => weekStart(e.localDate));
  const index = new Map(filled.map((b) => [b.key, b]));
  const keys = [...index.keys()].sort();
  const out: Bucket[] = [];
  for (let w = keys[0]; w <= keys[keys.length - 1]; w = addDays(w, 7)) {
    out.push(index.get(w) ?? { key: w, minutes: 0, entries: 0 });
  }
  return out;
}

export interface Summary {
  totalMinutes: number;
  assistedMinutes: number;
  soloMinutes: number;
  entries: number;
  days: number;
  thisWeekMinutes: number;
  thisMonthMinutes: number;
  /** Mean over days actually worked, not over calendar days. */
  averageDayMinutes: number;
}

export function summarise(entries: WorkLogEntry[], today = todayLocal()): Summary {
  const total = entries.reduce((a, e) => a + e.minutes, 0);
  const assisted = entries
    .filter((e) => e.source === 'git' || CATEGORY_BY_ID.get(e.category)?.assisted)
    .reduce((a, e) => a + e.minutes, 0);
  const days = new Set(entries.map((e) => e.localDate)).size;
  // Both windows are bounded at BOTH ends. An open-ended `>= weekStart` counted
  // every later-dated row as "this week" — which is not hypothetical, because a
  // log that spans a whole fiscal year is mostly rows the current week is before.
  const wk = weekStart(today);
  const wkEnd = addDays(wk, 6);
  const mo = monthStart(today);
  const moEnd = nextMonthStart(today);
  const within = (from: string, toExclusiveOrOn: (d: string) => boolean) =>
    entries.filter((e) => e.localDate >= from && toExclusiveOrOn(e.localDate)).reduce((a, e) => a + e.minutes, 0);
  return {
    totalMinutes: total,
    assistedMinutes: assisted,
    soloMinutes: total - assisted,
    entries: entries.length,
    days,
    thisWeekMinutes: within(wk, (d) => d <= wkEnd),
    thisMonthMinutes: within(mo, (d) => d < moEnd),
    averageDayMinutes: days === 0 ? 0 : Math.round(total / days),
  };
}

// ─── Formatting ─────────────────────────────────────────────────────────────

/** 95 → '1h 35m'; 60 → '1h'; 45 → '45m'. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Decimal hours, the form a timesheet total wants. 95 → '1.6'. */
export function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

export function formatDayLabel(localDate: string, today = todayLocal()): string {
  if (localDate === today) return 'Today';
  if (localDate === addDays(today, -1)) return 'Yesterday';
  const d = new Date(toUtcMs(localDate));
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

// ─── Export ─────────────────────────────────────────────────────────────────

export function toCsv(entries: WorkLogEntry[]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = 'date,fiscal_year,hours,minutes,category,source,commits,note';
  const rows = [...entries]
    .sort((a, b) => a.localDate.localeCompare(b.localDate))
    .map((e) =>
      [
        e.localDate,
        fiscalYearOf(e.localDate),
        formatHours(e.minutes),
        e.minutes,
        categoryLabel(e.category),
        e.source,
        e.commits ?? '',
        e.note,
      ]
        .map(esc)
        .join(','),
    );
  return [header, ...rows].join('\n');
}
