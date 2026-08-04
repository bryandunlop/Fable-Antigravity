/**
 * /worklog — personal effort tracker. Not part of the myGFO product.
 *
 * Deliberately outside the app shell: no sidebar, no breadcrumb, no nav entry,
 * no role gate, nothing in flight ops imports it. It is registered hidden in
 * NAV_ENTRIES only so the route audit knows the path exists. Same posture as
 * /ops — the door is the URL.
 *
 * Built phone-first because that is the point of it. Assisted build hours are
 * derived from git by scripts/derive-work-sessions.ts and arrive already
 * logged; everything else gets tapped in here, in the two or three seconds
 * anyone will actually spend recording a meeting they just walked out of.
 */

import { useEffect, useMemo, useState } from 'react';
import { Trash2, Play, Square, Plus, Download, CloudOff, RefreshCw } from 'lucide-react';

import { useWorkLog } from './useWorkLog';
import {
  CATEGORIES,
  MANUAL_CATEGORIES,
  byCategory,
  byDate,
  byWeek,
  categoryLabel,
  fiscalYearLabel,
  fiscalYearOf,
  formatDayLabel,
  formatDuration,
  formatHours,
  isInFiscalYear,
  summarise,
  toCsv,
  todayLocal,
  type WorkLogEntry,
} from './workLog';

const TIMER_KEY = 'worklog.timer.v1';
const QUICK_MINUTES = [15, 30, 45, 60, 90, 120, 180];

/**
 * Point the document at the work log's own manifest while this page is mounted.
 *
 * Without this, "Add to Home Screen" on iOS reads the app manifest, whose
 * start_url is "/" — so the icon you just made to log time opens the flight-ops
 * dashboard instead. Safari reads the manifest link from the live DOM at the
 * moment you add it, so swapping the href here is enough. Restored on unmount,
 * and scoped entirely to this route: no product file is touched.
 */
function useWorkLogManifest() {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;
    const original = link.getAttribute('href');
    link.setAttribute('href', '/worklog-manifest.json');
    const title = document.title;
    document.title = 'Work Log';
    return () => {
      if (original) link.setAttribute('href', original);
      document.title = title;
    };
  }, []);
}

// ─── Small presentational pieces ────────────────────────────────────────────

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2 text-center">
      <div className="text-lg font-semibold tabular-nums leading-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        // 44px min height: this is a thumb target, not a mouse target.
        'min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground active:bg-muted',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/** Horizontal bar, width proportional to the largest value in the set. */
function Bar({ minutes, max }: { minutes: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((minutes / max) * 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Weekly hours, drawn as divs — a chart library is heavier than this needs. */
function WeeklyChart({ entries }: { entries: WorkLogEntry[] }) {
  const weeks = byWeek(entries);
  if (weeks.length === 0) return null;
  const max = Math.max(...weeks.map((w) => w.minutes), 1);
  const recent = weeks.slice(-16);

  return (
    <div>
      {/* Bars are DIRECT children of the fixed-height row. They used to sit in a
          flex-col wrapper, and a percentage height resolves against the parent's
          height — which, under `items-end`, is content-sized and therefore zero.
          Every bar computed to nothing and the chart rendered blank. */}
      <div className="flex h-24 items-end gap-1">
        {recent.map((w) => (
          <div
            key={w.key}
            className="min-w-0 flex-1 rounded-t bg-primary/80"
            style={{ height: `${Math.max((w.minutes / max) * 100, w.minutes > 0 ? 4 : 1)}%` }}
            title={`Week of ${w.key}: ${formatHours(w.minutes)} h`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{recent[0]?.key.slice(5)}</span>
        <span>week of {recent[recent.length - 1]?.key.slice(5)}</span>
      </div>
    </div>
  );
}

// ─── Running timer ──────────────────────────────────────────────────────────

interface TimerState {
  startedAt: string;
  category: string;
}

function useTimer() {
  const [timer, setTimer] = useState<TimerState | null>(() => {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      return raw ? (JSON.parse(raw) as TimerState) : null;
    } catch {
      return null;
    }
  });
  const [, tick] = useState(0);

  // Re-render once a second only while something is running.
  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const start = (category: string) => {
    const next = { startedAt: new Date().toISOString(), category };
    localStorage.setItem(TIMER_KEY, JSON.stringify(next));
    setTimer(next);
  };

  const clear = () => {
    localStorage.removeItem(TIMER_KEY);
    setTimer(null);
  };

  const elapsedSeconds = timer
    ? Math.max(0, Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000))
    : 0;

  return { timer, start, clear, elapsedSeconds };
}

function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function WorkLogPage() {
  useWorkLogManifest();
  const { entries, loading, pending, offline, addEntry, deleteEntry, refresh } = useWorkLog();
  const today = todayLocal();

  const [fy, setFy] = useState(() => fiscalYearOf(today));
  const [category, setCategory] = useState(MANUAL_CATEGORIES[0].id);
  const [minutes, setMinutes] = useState<number>(30);
  const [customMinutes, setCustomMinutes] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { timer, start, clear, elapsedSeconds } = useTimer();

  // Every FY the log touches, newest first, with the current one always offered
  // even when it is still empty.
  const years = useMemo(() => {
    const set = new Set(entries.map((e) => fiscalYearOf(e.localDate)));
    set.add(fiscalYearOf(today));
    return [...set].sort().reverse();
  }, [entries, today]);

  const inYear = useMemo(
    () => entries.filter((e) => isInFiscalYear(e.localDate, fy)),
    [entries, fy],
  );

  const summary = useMemo(() => summarise(inYear, today), [inYear, today]);
  const categories = useMemo(() => byCategory(inYear), [inYear]);
  const days = useMemo(() => byDate(inYear), [inYear]);
  const entriesByDate = useMemo(() => {
    const map = new Map<string, WorkLogEntry[]>();
    for (const e of inYear) {
      if (!map.has(e.localDate)) map.set(e.localDate, []);
      map.get(e.localDate)!.push(e);
    }
    return map;
  }, [inYear]);

  const effectiveMinutes = customMinutes ? Number(customMinutes) : minutes;
  const canLog = Number.isFinite(effectiveMinutes) && effectiveMinutes > 0;

  const logIt = () => {
    if (!canLog) return;
    addEntry({ minutes: Math.round(effectiveMinutes), category, note: note.trim(), localDate: date });
    setNote('');
    setCustomMinutes('');
  };

  const stopTimer = () => {
    if (!timer) return;
    const mins = Math.max(1, Math.round(elapsedSeconds / 60));
    addEntry({
      minutes: mins,
      category: timer.category,
      note: note.trim(),
      localDate: todayLocal(),
      source: 'timer',
      startedAt: timer.startedAt,
      endedAt: new Date().toISOString(),
    });
    setNote('');
    clear();
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(inYear)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worklog-${fy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxCategory = Math.max(...categories.map((c) => c.minutes), 1);

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl bg-background px-4 pb-24 pt-5 text-foreground">
      {/* Header */}
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Work Log</h1>
          <p className="text-xs text-muted-foreground">{fiscalYearLabel(fy)}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={fy}
            onChange={(e) => setFy(e.target.value)}
            aria-label="Fiscal year"
            className="min-h-[44px] rounded-md border border-border bg-background px-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border active:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {(offline || pending > 0) && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <CloudOff className="h-3.5 w-3.5 shrink-0" />
          {pending > 0
            ? `${pending} ${pending === 1 ? 'entry' : 'entries'} saved on this device, waiting to sync.`
            : 'Offline — showing the copy stored on this device.'}
        </div>
      )}

      {/* Totals */}
      <section className="mb-6">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums">
            {formatHours(summary.totalMinutes)}
          </span>
          <span className="text-lg text-muted-foreground">hours</span>
        </div>
        <div className="mb-3 flex gap-2">
          <Stat value={formatHours(summary.thisWeekMinutes)} label="this week" />
          <Stat value={formatHours(summary.thisMonthMinutes)} label="this month" />
          <Stat value={String(summary.days)} label="days" />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex-1">
            <div className="mb-1 flex justify-between">
              <span className="text-muted-foreground">With Claude</span>
              <span className="tabular-nums">{formatHours(summary.assistedMinutes)} h</span>
            </div>
            <Bar minutes={summary.assistedMinutes} max={summary.totalMinutes || 1} />
          </div>
          <div className="flex-1">
            <div className="mb-1 flex justify-between">
              <span className="text-muted-foreground">On my own</span>
              <span className="tabular-nums">{formatHours(summary.soloMinutes)} h</span>
            </div>
            <Bar minutes={summary.soloMinutes} max={summary.totalMinutes || 1} />
          </div>
        </div>
      </section>

      {/* Log time — the reason this page exists */}
      <section className="mb-6 rounded-xl border border-border p-4">
        {timer ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-3xl font-semibold tabular-nums">{clock(elapsedSeconds)}</div>
              <div className="text-xs text-muted-foreground">{categoryLabel(timer.category)}</div>
            </div>
            <button
              type="button"
              onClick={stopTimer}
              className="flex min-h-[52px] items-center gap-2 rounded-lg bg-destructive px-5 font-medium text-destructive-foreground active:opacity-90"
            >
              <Square className="h-4 w-4" /> Stop &amp; log
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => start(category)}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg border border-border font-medium active:bg-muted"
          >
            <Play className="h-4 w-4" /> Start timer
          </button>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              What
            </div>
            <div className="flex flex-wrap gap-2">
              {MANUAL_CATEGORIES.map((c) => (
                <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                  {c.short}
                </Chip>
              ))}
            </div>
          </div>

          {!timer && (
            <>
              <div>
                <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  How long
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_MINUTES.map((m) => (
                    <Chip
                      key={m}
                      active={!customMinutes && minutes === m}
                      onClick={() => {
                        setMinutes(m);
                        setCustomMinutes('');
                      }}
                    >
                      {formatDuration(m)}
                    </Chip>
                  ))}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="min"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    aria-label="Custom minutes"
                    className="min-h-[44px] w-20 rounded-full border border-border bg-background px-3 text-center text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label="Date"
                  className="min-h-[44px] rounded-md border border-border bg-background px-3 text-sm"
                />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note (optional)"
                  aria-label="Note"
                  className="min-h-[44px] flex-1 rounded-md border border-border bg-background px-3 text-sm"
                />
              </div>

              <button
                type="button"
                onClick={logIt}
                disabled={!canLog}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground disabled:opacity-40 active:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Log {canLog ? formatDuration(Math.round(effectiveMinutes)) : 'time'}
                {date !== today ? ` on ${date.slice(5)}` : ''}
              </button>
            </>
          )}
        </div>
      </section>

      {/* Trend */}
      {inYear.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hours per week
          </h2>
          <WeeklyChart entries={inYear} />
        </section>
      )}

      {/* Where the time went */}
      {categories.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Where the time went
          </h2>
          <div className="space-y-2.5">
            {categories.map((c) => (
              <div key={c.key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{categoryLabel(c.key)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatHours(c.minutes)} h
                  </span>
                </div>
                <Bar minutes={c.minutes} max={maxCategory} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* The log */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {summary.entries} {summary.entries === 1 ? 'entry' : 'entries'}
          </h2>
          {inYear.length > 0 && (
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-1.5 text-xs text-muted-foreground active:text-foreground"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          )}
        </div>

        {inYear.length === 0 && !loading && (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing logged in {fy} yet. Tap a category and a duration above, or run{' '}
            <code className="text-xs">npx tsx scripts/derive-work-sessions.ts --seed</code> to pull
            in the assisted sessions from git.
          </p>
        )}

        <div className="space-y-4">
          {days.map((day) => (
            <div key={day.key}>
              <div className="mb-1.5 flex items-baseline justify-between border-b border-border pb-1">
                <span className="text-sm font-medium">{formatDayLabel(day.key, today)}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatHours(day.minutes)} h
                </span>
              </div>
              <ul className="space-y-1">
                {(entriesByDate.get(day.key) ?? []).map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                      className="flex w-full items-start gap-2 rounded-md px-1 py-2 text-left active:bg-muted"
                    >
                      <span className="w-16 shrink-0 text-sm tabular-nums text-muted-foreground">
                        {formatDuration(e.minutes)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm">{categoryLabel(e.category)}</span>
                        {e.note && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {e.note}
                          </span>
                        )}
                      </span>
                      {e.source === 'git' && (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {e.commits ?? 0}c
                        </span>
                      )}
                    </button>

                    {expanded === e.id && (
                      <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
                        <span className="text-muted-foreground">
                          {e.source === 'git'
                            ? 'Derived from git history'
                            : e.source === 'timer'
                              ? 'Timed'
                              : 'Logged by hand'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            deleteEntry(e.id);
                            setExpanded(null);
                          }}
                          className="flex min-h-[36px] items-center gap-1.5 rounded-md px-2 text-destructive active:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-10 text-center text-[11px] leading-relaxed text-muted-foreground">
        Assisted hours are derived from commit history and are a floor, not a total —
        <br />
        work that produced no commit is not in them.
        <br />
        {CATEGORIES.length} categories · {entries.length} entries across all years
      </footer>
    </div>
  );
}
