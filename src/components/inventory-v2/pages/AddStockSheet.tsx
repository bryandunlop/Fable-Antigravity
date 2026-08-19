import React, { useState, useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { useInventoryV2 } from '../InventoryV2Context';
import { getCompartmentsForAircraft } from '../compartmentConfig';
import { buildLedgerRows, groupByCompartment, groupByCategory } from '../tripLedger';
import type { LedgerRow } from '../tripLedger';
import type { Trip, TripLeg, TripLoadItem, TripViewMode } from '../types';

/**
 * Adding stock to the aircraft (D86).
 *
 * Replaces TripLoadExtras and TripRestoreStock, which were the same screen twice
 * — same header, same pills, same card grid, same footer — differing only in
 * where the stock came from and whether the commissary was decremented, a
 * distinction the user had to infer from a sub-headline. It is a switch now, and
 * it states its own consequence.
 *
 * Unlike the logging list this includes EQUIPMENT (LG-237): you do not use up a
 * set of dinner forks, but you certainly do load one.
 *
 * The load-item shape is unchanged on purpose — commissary loads carry no legId
 * and road loads carry the active leg's, exactly as the two old screens wrote
 * them. `getOnBoardQty` scopes on that field, so changing it here would quietly
 * move the on-board maths.
 */
export type StockSource = 'commissary' | 'road';

export function AddStockSheet({
  trip,
  leg,
  lens,
  initialSource = 'commissary',
  onBack,
}: {
  trip: Trip;
  leg: TripLeg | null;
  lens: TripViewMode;
  initialSource?: StockSource;
  onBack: () => void;
}) {
  const { state, dispatch } = useInventoryV2();
  const [source, setSource] = useState<StockSource>(initialSource);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    // Road loads are usually "I replaced what we drank", so start from this
    // leg's usage — the behaviour TripRestoreStock had, kept.
    if (initialSource !== 'road' || !leg) return {};
    const init: Record<string, number> = {};
    for (const e of leg.usageLog) {
      if (e.qtyUsed > 0) init[e.itemId] = (init[e.itemId] ?? 0) + e.qtyUsed;
    }
    return init;
  });

  const aircraftType = trip.aircraftType;
  const compartments = useMemo(
    () => getCompartmentsForAircraft(state.compartmentConfigs, aircraftType),
    [state.compartmentConfigs, aircraftType],
  );

  const stockroom = useMemo(
    () => new Map(state.stockroomItems.map(si => [si.itemId, si])),
    [state.stockroomItems],
  );

  // Everything stocked on this tail, equipment included.
  const rows = useMemo(
    () => buildLedgerRows({ items: state.items, trip, leg, aircraftType }),
    [state.items, trip, leg, aircraftType],
  );

  const groups = useMemo(
    () => (lens === 'compartment' ? groupByCompartment(rows, compartments) : groupByCategory(rows)),
    [lens, rows, compartments],
  );

  const [picked, setPicked] = useState<string | null>(null);
  const activeGroupId = groups.find(g => g.id === picked)?.id ?? groups[0]?.id;
  const activeGroup = groups.find(g => g.id === activeGroupId);

  const availableFor = (row: LedgerRow) => stockroom.get(row.item.id)?.qtyOnHand ?? 0;

  function bump(row: LedgerRow, delta: number) {
    setQuantities(prev => {
      const current = prev[row.item.id] ?? 0;
      let next = current + delta;
      if (next < 0) next = 0;
      // The commissary cannot give you what is not on the shelf. The road can.
      if (source === 'commissary') next = Math.min(next, availableFor(row));
      return { ...prev, [row.item.id]: next };
    });
  }

  const entries = Object.entries(quantities).filter(([, q]) => q > 0);
  const totalUnits = entries.reduce((n, [, q]) => n + q, 0);

  const belowParAfterPull = useMemo(() => {
    if (source !== 'commissary') return [];
    return entries
      .map(([itemId, qty]) => {
        const si = stockroom.get(itemId);
        const row = rows.find(r => r.item.id === itemId);
        if (!si || !row) return null;
        return si.qtyOnHand - qty < row.par ? row.item.itemName : null;
      })
      .filter((n): n is string => n !== null);
  }, [entries, source, stockroom, rows]);

  function handleConfirm() {
    if (entries.length === 0) return;
    const items: TripLoadItem[] = entries.map(([itemId, qty]) => ({
      id: `tl-${crypto.randomUUID()}`,
      itemId,
      qty,
      source,
      loadedBy: state.currentUser.name,
      loadedAt: new Date().toISOString(),
      ...(source === 'road' && leg ? { legId: leg.id } : {}),
    }));
    dispatch({ type: 'ADD_TRIP_LOAD_ITEMS', payload: { tripId: trip.id, items } });
    onBack();
  }

  return (
    <div className="-m-6 -mb-20 flex flex-col h-[calc(100dvh-9.125rem)] md:h-[calc(100dvh-4.5625rem)] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-background border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1"
        >
          <ChevronLeft size={16} />
          Back to {leg ? `leg ${leg.legNumber}` : 'trip'}
        </button>
        <h1 className="text-lg font-bold">Add stock &mdash; {trip.tailNumber}</h1>
      </div>

      {/* Source switch — the whole reason these were once two screens */}
      <div className="shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Where is this stock coming from?</p>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Changes what gets written &mdash; not what you tap
          </span>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setSource('commissary')}
            className={cn(
              'flex-1 text-left px-3.5 py-2.5 rounded-lg border transition-colors',
              source === 'commissary' ? 'border-primary border-2 bg-primary/5' : 'border-border bg-card',
            )}
          >
            <p className={cn('text-sm font-semibold', source === 'commissary' && 'text-primary')}>
              Commissary
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Deducts from the stockroom &middot; capped at what is on the shelf
            </p>
          </button>
          <button
            onClick={() => setSource('road')}
            className={cn(
              'flex-1 text-left px-3.5 py-2.5 rounded-lg border transition-colors',
              source === 'road' ? 'border-primary border-2 bg-primary/5' : 'border-border bg-card',
            )}
          >
            <p className={cn('text-sm font-semibold', source === 'road' && 'text-primary')}>Road</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bought out-station &middot; no commissary impact &middot; no cap
            </p>
          </button>
        </div>
      </div>

      {/* Group picker — the same lens they were just logging in */}
      <div className="shrink-0 px-4 py-2.5 border-b border-border overflow-x-auto bg-muted/30">
        <div className="flex gap-2 min-w-max">
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setPicked(g.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                g.id === activeGroupId
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground',
              )}
            >
              {g.label}
              <span className={cn('rounded-full px-1.5 text-[10px]', g.id === activeGroupId ? 'bg-white/20' : 'bg-muted')}>
                {g.rowCount}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto bg-muted/20">
        <div className="max-w-3xl mx-auto">
          {activeGroup?.sections.map(section => (
            <div key={section.key}>
              <div className="flex items-center justify-between px-4 py-1.5 bg-muted/70 border-y border-border">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">{section.label}</span>
                <span className="text-xs text-muted-foreground">{section.rows.length} items</span>
              </div>
              {section.rows.map(row => {
                const qty = quantities[row.item.id] ?? 0;
                const avail = availableFor(row);
                const atCap = source === 'commissary' && qty >= avail;
                return (
                  <div
                    key={row.item.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 bg-card border-b border-border/60',
                      qty > 0 && 'bg-primary/5',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{row.item.itemName}</p>
                      <p className="text-xs text-muted-foreground">
                        Par {row.par} {row.item.uom} &middot; {row.onBoard} on board
                        {row.isEquipment && ' · equipment'}
                      </p>
                    </div>
                    {source === 'commissary' && (
                      <span
                        className={cn(
                          'w-24 text-right text-xs shrink-0 tabular-nums',
                          avail === 0 ? 'text-destructive' : 'text-muted-foreground',
                        )}
                      >
                        {avail} in stock
                      </span>
                    )}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => bump(row, -1)}
                        disabled={qty === 0}
                        className="w-9 h-9 rounded-md bg-muted border border-border flex items-center justify-center text-lg disabled:opacity-30"
                        aria-label={`One fewer ${row.item.itemName}`}
                      >
                        −
                      </button>
                      <span
                        className={cn(
                          'w-8 text-center text-base font-bold tabular-nums',
                          qty > 0 ? 'text-primary' : 'text-muted-foreground',
                        )}
                      >
                        {qty}
                      </span>
                      <button
                        onClick={() => bump(row, 1)}
                        disabled={atCap}
                        className="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-lg disabled:opacity-30"
                        aria-label={`One more ${row.item.itemName}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {!activeGroup && (
            <p className="text-center text-sm text-muted-foreground py-16">Nothing stocked here.</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 bg-card border-t border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {entries.length === 0
                ? 'Nothing selected yet'
                : `${entries.length} item${entries.length === 1 ? '' : 's'} · ${totalUnits} unit${totalUnits === 1 ? '' : 's'}`}
            </p>
            {source === 'road' ? (
              <p className="text-xs text-muted-foreground">Road sourced &mdash; no commissary deduction</p>
            ) : belowParAfterPull.length > 0 ? (
              <p className="text-xs text-destructive truncate">
                Leaves the commissary below par: {belowParAfterPull.join(', ')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Deducts from the commissary on confirm</p>
            )}
          </div>
          <Button disabled={entries.length === 0} onClick={handleConfirm} className="shrink-0">
            {source === 'commissary'
              ? `Pull ${totalUnits || ''} from Commissary`.replace('  ', ' ')
              : 'Confirm restored stock'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AddStockSheet;
