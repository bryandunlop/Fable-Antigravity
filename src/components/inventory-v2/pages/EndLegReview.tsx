import React, { useState, useMemo } from 'react';
import { ChevronLeft, ShoppingCart } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { cn } from '../../ui/utils';
import { toReviewRows } from '../tripLedger';
import type { LedgerRow, ReviewRow } from '../tripLedger';
import type { Trip, TripLeg, InventoryItemV2 } from '../types';

/**
 * Closing a leg (D86).
 *
 * Was `/inventory-v2/trips/:tripId/reconcile` — a route of its own, with its own
 * page furniture, a read-only table, and a free-text box as the only way to say
 * "that number is wrong". Now it is a state of the same ledger: same rows, same
 * steppers, still live. A miscount is corrected in place; the discrepancy note
 * stays for what a correction cannot express.
 *
 * Filtered to what moved this leg, because that is what the crew is checking,
 * with an escape to the full list.
 */
export function EndLegReview({
  trip,
  leg,
  rows,
  isLastLeg,
  discrepancy,
  onDiscrepancyChange,
  onIncrement,
  onDecrement,
  onGenerateGroceryList,
  onComplete,
  onBack,
}: {
  trip: Trip;
  leg: TripLeg;
  rows: LedgerRow[];
  isLastLeg: boolean;
  discrepancy: string;
  onDiscrepancyChange: (value: string) => void;
  onIncrement: (item: InventoryItemV2) => void;
  onDecrement: (item: InventoryItemV2) => void;
  onGenerateGroceryList: () => void;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const legIndex = trip.legs.findIndex(l => l.id === leg.id);
  const prevLegId = legIndex > 0 ? trip.legs[legIndex - 1].id : null;

  const reviewRows = useMemo(() => toReviewRows(rows, trip, prevLegId), [rows, trip, prevLegId]);
  const moved = useMemo(() => reviewRows.filter(r => r.used > 0), [reviewRows]);
  const visible: ReviewRow[] = showAll ? reviewRows : moved;
  const totalUsed = moved.reduce((n, r) => n + r.used, 0);
  const emptied = moved.filter(r => r.remaining <= 0);

  return (
    <div className="-m-6 -mb-20 flex flex-col h-[calc(100dvh-9.125rem)] md:h-[calc(100dvh-4.5625rem)] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-background border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1"
        >
          <ChevronLeft size={16} />
          Back to leg {leg.legNumber}
        </button>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold">
              Closing leg {leg.legNumber} &mdash;{' '}
              <span className="font-mono">
                {leg.origin || '—'} &rarr; {leg.destination || '—'}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              {leg.paxCount} passenger{leg.paxCount === 1 ? '' : 's'} &middot;{' '}
              {showAll ? 'showing everything on board' : 'showing only what moved this leg'}
            </p>
          </div>
          <button
            onClick={() => setShowAll(v => !v)}
            className="shrink-0 text-xs px-3 py-2 rounded-full border border-border bg-card hover:bg-muted transition-colors"
          >
            {showAll ? 'Only what moved' : `Show all ${reviewRows.length}`}
          </button>
        </div>
      </div>

      {/* The ledger, in review columns */}
      <div className="flex-1 overflow-y-auto p-4 bg-muted/20">
        <Card className="max-w-3xl mx-auto overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/40">
            <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Item</span>
            <span className="w-24 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Started with</span>
            <span className="w-12 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Used</span>
            <span className="w-20 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Remaining</span>
            <span className="w-[88px]" />
          </div>

          {visible.map(row => (
            <div
              key={row.item.id}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 border-b border-border/60 last:border-0',
                row.used === 0 && 'opacity-70',
              )}
            >
              <span className="flex-1 min-w-0 text-sm font-semibold truncate">{row.item.itemName}</span>
              <span className="w-24 text-right text-sm text-muted-foreground tabular-nums">{row.startedWith}</span>
              <span
                className={cn(
                  'w-12 text-right text-sm tabular-nums',
                  row.used > 0 ? 'text-primary font-bold' : 'text-muted-foreground',
                )}
              >
                {row.used > 0 ? row.used : '—'}
              </span>
              <span
                className={cn(
                  'w-20 text-right text-sm font-semibold tabular-nums',
                  row.remaining <= 0 && 'text-destructive',
                )}
              >
                {row.remaining}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onDecrement(row.item)}
                  disabled={row.used === 0}
                  className="w-9 h-9 rounded-md bg-muted border border-border flex items-center justify-center text-lg disabled:opacity-30"
                  aria-label={`One fewer ${row.item.itemName}`}
                >
                  −
                </button>
                <button
                  onClick={() => onIncrement(row.item)}
                  className="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-lg"
                  aria-label={`One more ${row.item.itemName}`}
                >
                  +
                </button>
              </div>
            </div>
          ))}

          {visible.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing was logged on this leg.
            </p>
          )}

          <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 border-t border-border">
            {emptied.length > 0 ? (
              <span className="text-xs text-destructive font-semibold">
                Finished the leg at zero: {emptied.map(r => r.item.itemName).join(', ')}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Nothing ran out this leg.</span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              tap any row to correct it &mdash; the count is still live
            </span>
          </div>
        </Card>

        {/* Discrepancy — for what a correction cannot express */}
        <Card className="max-w-3xl mx-auto mt-4 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Anything not adding up?</span>
            <span className="text-xs text-muted-foreground">
              optional &middot; becomes a leg note tagged as a discrepancy
            </span>
          </div>
          <textarea
            className="w-full min-h-[64px] bg-background border border-border rounded-md px-3 py-2 text-sm resize-none"
            placeholder="e.g. 2 Fiji Waters missing — not sure where they went"
            value={discrepancy}
            onChange={e => onDiscrepancyChange(e.target.value)}
          />
        </Card>
      </div>

      {/* Footer */}
      <div className="shrink-0 bg-card border-t border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <Button variant="outline" size="sm" onClick={onGenerateGroceryList} className="gap-2">
            <ShoppingCart size={14} />
            Grocery list from this leg
          </Button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold hidden sm:inline">
              {totalUsed} item{totalUsed === 1 ? '' : 's'} logged this leg
            </span>
            <Button onClick={onComplete}>
              {isLastLeg ? 'Complete leg · close trip' : `Complete leg · start leg ${leg.legNumber + 1}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EndLegReview;
