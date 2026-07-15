import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  buildOpsBoard,
  type OpsSnapshot,
  type BoardRow,
  type WaitingItem,
  type OpsGap,
} from './opsBoard';

/**
 * /ops — the window (myGFO Work Ledger design §7; v2 layout Bryan picked
 * 2026-07-15: PM-workspace presentation — bottleneck timeline + one grouped,
 * expandable table — over the same read-only snapshot).
 *
 * Not linked from any nav surface: the door is the "Created by Bryan Dunlop"
 * credit on the login screen. Registered hidden in NAV_ENTRIES so the route
 * audit knows it exists.
 */

function AgeLabel({ minutes }: { minutes: number }) {
  if (minutes < 0) return <span>age unknown</span>;
  if (minutes < 60) return <span>{minutes} min old</span>;
  const h = Math.floor(minutes / 60);
  return (
    <span>
      {h}h {minutes % 60}m old
    </span>
  );
}

function IdChip({ id }: { id: string }) {
  return (
    <span className="shrink-0 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
      {id}
    </span>
  );
}

function WhoPill({ who }: { who: string }) {
  const isBryan = who === 'Bryan';
  return (
    <span
      className={
        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
        (isBryan
          ? 'bg-gfo-sunrise/15 text-gfo-sunrise-deep dark:text-gfo-sunrise'
          : 'bg-muted text-muted-foreground')
      }
    >
      {who}
    </span>
  );
}

function SeverityBadge({ severity }: { severity?: string }) {
  return (
    <span
      className={
        'status-badge shrink-0 ' +
        (severity === 'high' ? 'status-error' : severity === 'med' ? 'status-warning' : 'status-info')
      }
    >
      {severity ?? '?'}
    </span>
  );
}

/** The bottleneck timeline: who has been the constraint, and for how long. */
function TimelineStrip({
  people,
  maxWaitDays,
}: {
  people: { who: string; items: WaitingItem[] }[];
  maxWaitDays: number;
}) {
  return (
    <Card className="border-gfo-sunrise/40 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="h-2 w-2 rounded-full bg-gfo-sunrise" />
          Waiting on a human — days as the bar
          <span className="ml-auto font-normal text-muted-foreground">
            {people.reduce((n, p) => n + p.items.length, 0)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {people.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nobody is the bottleneck. Rare — enjoy it.</p>
        ) : (
          people.map((lane) => (
            <div key={lane.who} className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3">
              <WhoPill who={lane.who} />
              <div className="min-w-0 space-y-1.5">
                {lane.items.map((item) => (
                  <div key={item.id} className="flex min-w-0 items-center gap-2" title={item.title}>
                    <div
                      className={
                        'h-3 min-w-[3px] shrink-0 rounded-sm ' +
                        (lane.who === 'Bryan'
                          ? 'bg-gfo-sunrise-deep dark:bg-gfo-sunrise'
                          : 'bg-gfo-daylight-deep dark:bg-gfo-daylight-light')
                      }
                      style={{ width: `${Math.max(2, Math.round((item.daysWaiting / maxWaitDays) * 60))}%` }}
                    />
                    <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      {item.id} · {item.daysWaiting}d
                    </span>
                    <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground sm:block">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

interface TableItem {
  id: string;
  title: string;
  who: string;
  detail: string;
  age: string;
  refs: string[];
  capturedFrom: string;
  body: string;
  severity?: string;
}

const rowToItem = (r: BoardRow, detail = ''): TableItem => ({
  id: r.id,
  title: r.title,
  who: '',
  detail,
  age: r.since ? `${r.daysWaiting}d` : '',
  refs: r.refs,
  capturedFrom: r.capturedFrom,
  body: r.body,
});

function ExpandableRow({ item }: { item: TableItem }) {
  const [open, setOpen] = useState(false);
  const hasMore = !!(item.refs.length || item.capturedFrom || item.body);
  return (
    <>
      <button
        type="button"
        onClick={() => hasMore && setOpen(!open)}
        aria-expanded={hasMore ? open : undefined}
        className={
        'grid w-full grid-cols-[20px_minmax(0,3fr)_minmax(0,1fr)_56px] items-center gap-2 border-t border-border px-2 py-2 text-left text-sm ' +
          (hasMore ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default')
        }
      >
        <span className="text-muted-foreground">
          {hasMore ? (open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : null}
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <IdChip id={item.id} />
          <span className="truncate text-foreground">{item.title}</span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          {item.who ? <WhoPill who={item.who} /> : null}
          {item.severity ? <SeverityBadge severity={item.severity} /> : null}
          {item.detail ? (
            <span className="truncate font-mono text-[11px] text-muted-foreground">{item.detail}</span>
          ) : null}
        </span>
        <span className="text-right text-xs text-muted-foreground">{item.age}</span>
      </button>
      {open ? (
        <div className="border-t border-dashed border-border bg-muted/30 px-9 py-3 text-sm">
          {item.capturedFrom ? (
            <p className="mb-2 text-muted-foreground">
              <span className="text-xs uppercase tracking-wide">captured as</span> “{item.capturedFrom}”
            </p>
          ) : null}
          {item.body ? <p className="mb-2 whitespace-pre-line text-foreground">{item.body}</p> : null}
          {item.refs.length ? (
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              became
              {item.refs.map((r) => (
                <IdChip key={r} id={r} />
              ))}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function Section({
  title,
  dotClass,
  items,
  total,
  empty,
}: {
  title: string;
  dotClass: string;
  items: TableItem[];
  total: number;
  empty?: string;
}) {
  // `empty` copy describes REALITY (total === 0), never a filter miss —
  // "The inbox is drained" must not appear just because the query matched
  // nothing in this section.
  if (total === 0 && !empty) return null;
  return (
    <div>
      <div className="flex items-center gap-2 px-2 py-2 text-sm font-semibold">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        {title}
        <span className="font-normal text-muted-foreground">
          {items.length === total ? total : `${items.length} of ${total}`}
        </span>
      </div>
      {items.length ? (
        items.map((i) => <ExpandableRow key={i.id} item={i} />)
      ) : (
        <p className="border-t border-border px-9 py-2 text-xs text-muted-foreground">
          {total === 0 ? empty : 'No matches for the current filter.'}
        </p>
      )}
    </div>
  );
}

export default function OpsBoardPage() {
  const [snap, setSnap] = useState<OpsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/ops-ledger.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => alive && setSnap(data))
      .catch((e) => alive && setError(String(e)));
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      alive = false;
      clearInterval(tick);
    };
  }, []);

  const board = useMemo(() => (snap ? buildOpsBoard(snap, now) : null), [snap, now]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <Card className="max-w-md shadow-sm">
          <CardContent className="space-y-2 p-6 text-sm">
            <p className="font-semibold">No snapshot available.</p>
            <p className="text-muted-foreground">
              The board reads <code>/ops-ledger.json</code>, generated from the vault by{' '}
              <code>scripts/snapshot.mjs</code> in the Tech Log working repo. ({error})
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!board) {
    return <div className="min-h-screen bg-background" />;
  }

  const q = query.trim().toLowerCase();
  const hit = (i: TableItem) =>
    !q || `${i.id} ${i.title} ${i.who} ${i.detail}`.toLowerCase().includes(q);

  const waitingItems = board.waiting
    .map((w) => ({
      id: w.id,
      title: w.title,
      who: w.who,
      detail: '',
      age: w.since ? `${w.daysWaiting}d` : '',
      refs: w.refs,
      capturedFrom: w.capturedFrom,
      body: w.body,
    }))
    .filter(hit);
  const inFlightItems = board.inFlight
    .map((r) => rowToItem(r, `${r.branch}${r.session ? ` · ${r.session}` : ''}`))
    .filter(hit);
  const capturedItems = board.captured.map((r) => rowToItem(r, `via ${r.source}`)).filter(hit);
  const backlogItems = board.backlog.map((r) => rowToItem(r)).filter(hit);
  const landedItems = board.landed.map((r) => rowToItem(r, `merge ${r.landedBy}`)).filter(hit);
  const gapItems = board.gaps
    .map((g: OpsGap & { area?: string }) => ({
      id: g.id,
      title: g.title,
      who: '',
      detail: g.area ?? '',
      age: '',
      refs: [],
      capturedFrom: '',
      body: '',
      severity: g.severity,
    }))
    .filter(hit);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Ops Ledger</h1>
            <p className="text-sm text-muted-foreground">
              The window — read-only. The vault is the desk; sessions are the hands.
            </p>
          </div>
          <Link to="/login" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            ← back to sign-in
          </Link>
        </header>

        <TimelineStrip people={board.people} maxWaitDays={board.maxWaitDays} />

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-1">
            <CardTitle className="text-sm font-semibold">Everything, one list</CardTitle>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by id, title, who…"
              className="h-8 max-w-56 text-sm"
            />
          </CardHeader>
          <CardContent className="pt-2">
            <Section title="Waiting on a human" dotClass="bg-gfo-sunrise" items={waitingItems} total={board.waiting.length} />
            <Section
              title="In flight"
              dotClass="bg-gfo-daylight"
              items={inFlightItems}
              total={board.inFlight.length}
              empty="No session holds a branch."
            />
            <Section
              title="Captured"
              dotClass="bg-muted-foreground/60"
              items={capturedItems}
              total={board.captured.length}
              empty="The inbox is drained."
            />
            <Section
              title="Backlog (triaged)"
              dotClass="bg-gfo-midnight/50 dark:bg-gfo-daylight/50"
              items={backlogItems}
              total={board.backlog.length}
            />
            <Section title="Landed" dotClass="bg-gfo-success" items={landedItems} total={board.landed.length} />
            <Section title="Open gaps (register)" dotClass="bg-gfo-warning" items={gapItems} total={board.gaps.length} />
          </CardContent>
        </Card>

        <footer className="pb-6 text-center text-xs text-muted-foreground">
          Snapshot generated {board.generatedAt} · <AgeLabel minutes={board.snapshotAgeMinutes} /> ·{' '}
          {board.totalRows} ledger rows · {board.parkedCount} parked · {board.droppedCount} dropped ·
          read-only window — capture happens by talking to Claude, in Obsidian, or from the phone inbox
        </footer>
      </div>
    </div>
  );
}
