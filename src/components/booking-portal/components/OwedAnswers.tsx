// Scheduling's owed-answers list, and the two verbs that did not exist anywhere:
// assigning an aircraft, and countering with different days.
//
// The bands are who owes the next move, not what is urgent — the queue already answers
// urgency. Requests go wrong when each side believes the other is thinking about it, and
// the "waiting on nobody" band is deliberate: a confirmed trip nine months out is
// correctly waiting on no one, and a two-band list would silently swallow it.

import { useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { cn } from '../../ui/utils';
import { usePortal } from '../BookingPortalContext';
import { buildOwedBoard, OWED_LABELS, type OwedAnswer, type OwedBy } from '../engine/owedAnswers';
import { CORE_FLEET } from '../../../fleet/registry';
import { routeLabel } from '../engine/lifecycle';

function Row({ item, onOpen }: { item: OwedAnswer; onOpen: (id: string) => void }) {
  const r = item.request;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(r.id)}
        className="w-full rounded-md border px-2.5 py-2 text-left hover:bg-muted/40"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{routeLabel(r)}</span>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {item.ageDays === 0 ? 'today' : `${item.ageDays}d`}
          </span>
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {r.id} · {item.what}
          {r.assignedTail && ` · ${r.assignedTail}`}
        </span>
      </button>
    </li>
  );
}

export function OwedAnswers({ nowMs }: { nowMs: number }) {
  const { state, dispatch } = usePortal();
  const board = buildOwedBoard(state.requests, nowMs);
  const [openId, setOpenId] = useState<string | null>(null);
  const [counterDates, setCounterDates] = useState('');
  const [counterNote, setCounterNote] = useState('');

  const open = state.requests.find(r => r.id === openId) ?? null;

  const bands: OwedBy[] = ['me', 'them', 'nobody'];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        {bands.map(band => (
          <div key={band}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {OWED_LABELS[band]}
              <span className="ml-1.5 tabular-nums opacity-70">{board[band].length}</span>
            </p>
            {board[band].length === 0 ? (
              <p className="text-xs text-muted-foreground/70">
                {band === 'nobody' ? 'Nothing is parked.' : 'Nothing owed.'}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {board[band].map(item => (
                  <Row key={item.request.id} item={item} onOpen={setOpenId} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {open && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h3 className="text-base font-semibold">{routeLabel(open)}</h3>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{open.status}</span>
              <button
                type="button"
                className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setOpenId(null)}
              >
                Close
              </button>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Aircraft
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CORE_FLEET.map(a => (
                  <button
                    key={a.tail}
                    type="button"
                    onClick={() => dispatch({ type: 'ASSIGN_TAIL', id: open.id, tail: a.tail })}
                    aria-pressed={open.assignedTail === a.tail}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs',
                      open.assignedTail === a.tail
                        ? 'border-[var(--gfo-daylight,#0096FC)] bg-[color-mix(in_srgb,var(--gfo-daylight,#0096FC)_10%,transparent)] font-medium'
                        : 'text-muted-foreground hover:bg-muted/40',
                    )}
                  >
                    {a.tail} <span className="opacity-60">{a.type}</span>
                  </button>
                ))}
              </div>
              {!open.assignedTail && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Approving binds no aircraft. Until one is on here, this is a promise with
                  nothing behind it.
                </p>
              )}
            </div>

            <div className="border-t pt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Counter with other days
              </p>
              {open.counter && !open.counter.answeredAt ? (
                <p className="text-sm text-muted-foreground">
                  Offered {open.counter.dates.join(', ')} — waiting on her.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    aria-label="Counter dates"
                    className="min-w-[190px] flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                    placeholder="2026-10-05, 2026-10-07"
                    value={counterDates}
                    onChange={e => setCounterDates(e.target.value)}
                  />
                  <input
                    aria-label="Counter note"
                    className="min-w-[190px] flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                    placeholder="Why these days work better"
                    value={counterNote}
                    onChange={e => setCounterNote(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!counterDates.trim()}
                    onClick={() => {
                      dispatch({
                        type: 'COUNTER_OFFER',
                        id: open.id,
                        dates: counterDates.split(',').map(d => d.trim()).filter(Boolean),
                        note: counterNote,
                      });
                      setCounterDates('');
                      setCounterNote('');
                    }}
                  >
                    Offer these
                  </Button>
                </div>
              )}
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Keeps the request, its place and its thread. Declining and writing a
                paragraph makes her start again.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
