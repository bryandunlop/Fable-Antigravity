import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { buildOpsBoard, type OpsSnapshot, type BoardRow, type WaitingItem } from './opsBoard';

/**
 * /ops — the window (myGFO Work Ledger design §7).
 *
 * Read-only project board over the committed vault snapshot. Not linked from
 * any nav surface: the door is the "Created by Bryan Dunlop" credit on the
 * login screen. Registered hidden in NAV_ENTRIES so the route audit knows it
 * exists (finding #14's lesson: unregistered routes drift invisibly).
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

function WaitingCard({ item }: { item: WaitingItem }) {
  const isBryan = item.who === 'Bryan';
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex min-w-0 items-start gap-2">
        <IdChip id={item.id} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          {item.since ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              waiting {item.daysWaiting} {item.daysWaiting === 1 ? 'day' : 'days'} · since {item.since}
            </p>
          ) : null}
        </div>
      </div>
      <span
        className={
          'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
          (isBryan
            ? 'bg-gfo-sunrise/15 text-gfo-sunrise-deep dark:text-gfo-sunrise'
            : 'bg-muted text-muted-foreground')
        }
      >
        {item.who}
      </span>
    </div>
  );
}

function LaneRow({ row, detail }: { row: BoardRow; detail?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <IdChip id={row.id} />
        <p className="min-w-0 text-sm text-foreground">{row.title}</p>
      </div>
      {detail ? <p className="mt-1.5 pl-0.5 font-mono text-[11px] text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function Lane({
  title,
  dotClass,
  count,
  children,
  empty,
}: {
  title: string;
  dotClass: string;
  count: number;
  children: React.ReactNode;
  empty: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
          {title}
          <span className="ml-auto font-normal text-muted-foreground">{count}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {count === 0 ? <p className="text-xs text-muted-foreground">{empty}</p> : children}
      </CardContent>
    </Card>
  );
}

export default function OpsBoardPage() {
  const [snap, setSnap] = useState<OpsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

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
  if (!snap) {
    return <div className="min-h-screen bg-background" />;
  }

  const board = buildOpsBoard(snap, now);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
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

        <Card className="border-gfo-sunrise/40 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2 w-2 rounded-full bg-gfo-sunrise" />
              Waiting on a human
              <span className="ml-auto font-normal text-muted-foreground">{board.waiting.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 pt-0 sm:grid-cols-2">
            {board.waiting.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nobody is the bottleneck. Rare — enjoy it.</p>
            ) : (
              board.waiting.map((w) => <WaitingCard key={w.id} item={w} />)
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Lane title="In flight" dotClass="bg-gfo-daylight" count={board.inFlight.length} empty="No session holds a branch.">
            {board.inFlight.map((r) => (
              <LaneRow key={r.id} row={r} detail={`${r.branch}${r.session ? ` · ${r.session}` : ''} · ${r.daysWaiting}d`} />
            ))}
          </Lane>
          <Lane title="Captured" dotClass="bg-muted-foreground/60" count={board.captured.length} empty="The inbox is drained.">
            {board.captured.map((r) => (
              <LaneRow key={r.id} row={r} detail={`via ${r.source} · ${r.since}`} />
            ))}
          </Lane>
          <Lane title="Backlog (triaged)" dotClass="bg-gfo-midnight/50 dark:bg-gfo-daylight/50" count={board.backlog.length} empty="Nothing triaged and unclaimed.">
            {board.backlog.map((r) => (
              <LaneRow key={r.id} row={r} detail={r.refs.length ? `→ ${r.refs.join(', ')}` : undefined} />
            ))}
          </Lane>
          <Lane title="Landed" dotClass="bg-gfo-success" count={board.landed.length} empty="Nothing proven merged yet.">
            {board.landed.map((r) => (
              <LaneRow key={r.id} row={r} detail={`merge ${r.landedBy}`} />
            ))}
          </Lane>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2 w-2 rounded-full bg-gfo-warning" />
              Open gaps (register)
              <span className="ml-auto font-normal text-muted-foreground">{board.gaps.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 pt-0 sm:grid-cols-2">
            {board.gaps.map((g) => (
              <div key={g.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
                <div className="flex min-w-0 items-start gap-2">
                  <IdChip id={g.id} />
                  <p className="min-w-0 text-sm text-foreground">{g.title}</p>
                </div>
                <span
                  className={
                    'status-badge shrink-0 ' +
                    (g.severity === 'high' ? 'status-error' : g.severity === 'med' ? 'status-warning' : 'status-info')
                  }
                >
                  {g.severity ?? '?'}
                </span>
              </div>
            ))}
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
