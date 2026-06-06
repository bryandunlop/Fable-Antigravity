import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../ui/collapsible';
import { useInventoryV2 } from '../InventoryV2Context';
import { V2Badge } from '../shared/V2Badge';
import { BarcodeScannerDialog } from '../shared/BarcodeScannerDialog';
import { toast } from 'sonner';
import { PackagePlus, ChevronDown, Camera, ArrowDown, ArrowUp } from 'lucide-react';
import type { PickListItem, RestockListItem, TripReturnItem, StockroomItem } from '../types';

export default function Replenish() {
  const { state, dispatch } = useInventoryV2();
  const [unitFilter, setUnitFilter] = useState('all');
  const [localPickItems, setLocalPickItems] = useState<PickListItem[]>(state.pickListItems);
  const [localRestockItems, setLocalRestockItems] = useState<RestockListItem[]>(state.restockListItems);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [scannerOpen, setScannerOpen] = useState(false);

  const [searchParams] = useSearchParams();
  const tailParam = searchParams.get('tail');

  // Find most recently completed trip for this tail that hasn't been returned yet
  const tripForBaseline = useMemo(() => {
    if (!tailParam) return null;
    return (
      state.trips
        .filter(t => t.tailNumber === tailParam && t.status === 'completed' && !t.baselineConfirmedAt)
        .sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''))
        [0] ?? null
    );
  }, [state.trips, tailParam]);

  // Compute per-item aircraft qty from trip data
  const baselineItems = useMemo(() => {
    if (!tripForBaseline) return [];

    type BaselineRow = {
      itemId: string;
      par: number;
      aircraftQty: number;
      pullQty: number;
      returnQty: number;
    };

    const rows: BaselineRow[] = [];
    const touchedItemIds = new Set<string>();

    tripForBaseline.loadItems.forEach(li => touchedItemIds.add(li.itemId));
    tripForBaseline.legs.forEach(leg =>
      leg.usageLog.forEach(e => touchedItemIds.add(e.itemId))
    );

    touchedItemIds.forEach(itemId => {
      const item = state.items.find(i => i.id === itemId);
      if (!item) return;
      const par = item.defaultQuantities[tripForBaseline.aircraftType] ?? 0;
      const loadTotal = tripForBaseline.loadItems
        .filter(li => li.itemId === itemId)
        .reduce((sum, li) => sum + li.qty, 0);
      const usageTotal = tripForBaseline.legs
        .flatMap(l => l.usageLog)
        .filter(e => e.itemId === itemId)
        .reduce((sum, e) => sum + e.qtyUsed, 0);
      const aircraftQty = par + loadTotal - usageTotal;
      const pullQty = Math.max(0, par - aircraftQty);
      const returnQty = Math.max(0, aircraftQty - par);
      if (pullQty > 0 || returnQty > 0) {
        rows.push({ itemId, par, aircraftQty, pullQty, returnQty });
      }
    });

    return rows;
  }, [tripForBaseline, state.items]);

  const pullRows = useMemo(() => baselineItems.filter(r => r.pullQty > 0), [baselineItems]);
  const returnRows = useMemo(() => baselineItems.filter(r => r.returnQty > 0), [baselineItems]);

  // Local checkbox state (not persisted — FA ticks off as they physically move items)
  const [checkedPull, setCheckedPull] = useState<Set<string>>(new Set());
  const [checkedReturn, setCheckedReturn] = useState<Set<string>>(new Set());

  const uniqueUnits = useMemo(() => {
    const units = new Set(localPickItems.map(p => p.unitTailNumber));
    return Array.from(units);
  }, [localPickItems]);

  const filteredPickItems = useMemo(() => {
    if (unitFilter === 'all') return localPickItems;
    return localPickItems.filter(p => p.unitTailNumber === unitFilter);
  }, [localPickItems, unitFilter]);

  const getItem = (itemId: string) => state.items.find(i => i.id === itemId);

  const getBinLocation = (itemId: string) => {
    const si = state.stockroomItems.find(
      s => s.itemId === itemId && s.stockroomId === 'sr-1'
    );
    return si?.binLocation ?? '—';
  };

  const getRestockItem = (pickItem: PickListItem): RestockListItem | undefined =>
    localRestockItems.find(
      r =>
        r.itemId === pickItem.itemId &&
        r.unitTailNumber === pickItem.unitTailNumber &&
        r.inspectionId === pickItem.inspectionId
    );

  const groupedByUnit = useMemo(() => {
    const groups: Record<string, PickListItem[]> = {};
    filteredPickItems.forEach(p => {
      if (!groups[p.unitTailNumber]) groups[p.unitTailNumber] = [];
      groups[p.unitTailNumber].push(p);
    });
    return groups;
  }, [filteredPickItems]);

  const totalItems = localPickItems.length;
  const pickedCount = localPickItems.filter(p => p.done).length;
  const loadedCount = localRestockItems.filter(r => r.done && !r.cancelled).length;

  const handleQtyChange = (id: string, delta: number) => {
    setLocalPickItems(prev =>
      prev.map(p => {
        if (p.id !== id) return p;
        const newQty = Math.max(0, Math.min(p.qtyNeeded, p.qtyTaken + delta));
        return { ...p, qtyTaken: newQty };
      })
    );
  };

  const ensureRestockItem = (pickItem: PickListItem): RestockListItem => {
    const existing = getRestockItem(pickItem);
    if (existing) return existing;
    const newItem: RestockListItem = {
      id: `restock-${pickItem.id}`,
      inspectionId: pickItem.inspectionId,
      unitTailNumber: pickItem.unitTailNumber,
      itemId: pickItem.itemId,
      qtyPicked: pickItem.qtyTaken,
      qtyNeeded: pickItem.qtyNeeded,
      done: false,
      cancelled: false,
    };
    setLocalRestockItems(prev => [...prev, newItem]);
    return newItem;
  };

  const handlePickedChange = (pickItem: PickListItem, picked: boolean) => {
    setLocalPickItems(prev =>
      prev.map(p => (p.id === pickItem.id ? { ...p, done: picked } : p))
    );
    if (picked) {
      ensureRestockItem(pickItem);
    }
  };

  const handleLoadedChange = (pickItem: PickListItem, loaded: boolean) => {
    const restockItem = getRestockItem(pickItem);
    if (!restockItem) return;
    setLocalRestockItems(prev =>
      prev.map(r => (r.id === restockItem.id ? { ...r, done: loaded } : r))
    );
  };

  const handleCancel = (pickItem: PickListItem, cancelled: boolean) => {
    const restockItem = getRestockItem(pickItem);
    if (!restockItem) {
      const newItem: RestockListItem = {
        id: `restock-${pickItem.id}`,
        inspectionId: pickItem.inspectionId,
        unitTailNumber: pickItem.unitTailNumber,
        itemId: pickItem.itemId,
        qtyPicked: pickItem.qtyTaken,
        qtyNeeded: pickItem.qtyNeeded,
        done: false,
        cancelled,
      };
      setLocalRestockItems(prev => [...prev, newItem]);
      return;
    }
    setLocalRestockItems(prev =>
      prev.map(r => (r.id === restockItem.id ? { ...r, cancelled } : r))
    );
  };

  const handleCheckAllPicked = (unit: string, checked: boolean) => {
    setLocalPickItems(prev =>
      prev.map(p => (p.unitTailNumber === unit ? { ...p, done: checked } : p))
    );
    if (checked) {
      const unitItems = localPickItems.filter(p => p.unitTailNumber === unit);
      unitItems.forEach(p => ensureRestockItem(p));
    }
  };

  const handleCheckAllLoaded = (unit: string, checked: boolean) => {
    const unitPicks = localPickItems.filter(p => p.unitTailNumber === unit && p.done);
    unitPicks.forEach(p => {
      const r = getRestockItem(p);
      if (!r) return;
      setLocalRestockItems(prev =>
        prev.map(ri => (ri.id === r.id ? { ...ri, done: checked } : ri))
      );
    });
  };

  function handleBaselineConfirm() {
    if (!tripForBaseline) return;

    const stockroomUpdates: StockroomItem[] = state.stockroomItems
      .map(si => {
        const pullRow = pullRows.find(r => r.itemId === si.itemId);
        const returnRow = returnRows.find(r => r.itemId === si.itemId);
        if (!pullRow && !returnRow) return null;
        const pullDelta = pullRow ? pullRow.pullQty : 0;
        const returnDelta = returnRow ? returnRow.returnQty : 0;
        return {
          ...si,
          qtyOnHand: Math.max(0, si.qtyOnHand - pullDelta + returnDelta),
        };
      })
      .filter((si): si is StockroomItem => si !== null);

    const returnItems: TripReturnItem[] = returnRows.map(r => ({
      id: `tr-${crypto.randomUUID()}`,
      itemId: r.itemId,
      qty: r.returnQty,
      returnedBy: state.currentUser.name,
      returnedAt: new Date().toISOString(),
    }));

    dispatch({
      type: 'ADD_TRIP_RETURN_ITEMS',
      payload: {
        tripId: tripForBaseline.id,
        items: returnItems,
        stockroomUpdates,
      },
    });
    toast.success('Baseline restored — aircraft back at par');
  }

  const handleScan = (itemId: string) => {
    const match = localPickItems.find(p => p.itemId === itemId && !p.done);
    if (!match) {
      toast.info('Item not found in pick list or already picked');
      setScannerOpen(false);
      return;
    }
    handlePickedChange(match, true);
    const item = getItem(match.itemId);
    toast.success(`Picked: ${item?.itemName ?? match.itemId}`);
    setScannerOpen(false);
  };

  const handleUpdate = () => {
    localPickItems.forEach(p => dispatch({ type: 'UPDATE_PICK_ITEM', payload: p }));
    dispatch({ type: 'SET_RESTOCK_LIST', payload: localRestockItems });

    // Flip inspections to 'restocked' when all their items are loaded
    const inspectionIds = new Set(localPickItems.map(p => p.inspectionId));
    inspectionIds.forEach(inspId => {
      const pickItemsForInsp = localPickItems.filter(p => p.inspectionId === inspId);
      const restockForInsp = localRestockItems.filter(r => r.inspectionId === inspId);
      const allDone =
        restockForInsp.length > 0 &&
        restockForInsp.length === pickItemsForInsp.length &&
        restockForInsp.every(r => r.done || r.cancelled);
      if (allDone) {
        const inspection = state.inspections.find(i => i.id === inspId);
        if (inspection && inspection.status !== 'restocked') {
          dispatch({ type: 'UPDATE_INSPECTION', payload: { ...inspection, status: 'restocked' } });
        }
      }
    });

    toast.success('Replenish list updated');
  };

  const toggleSection = (unit: string) => {
    setOpenSections(prev => ({ ...prev, [unit]: prev[unit] !== false ? false : true }));
  };

  if (tripForBaseline && baselineItems.length > 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 pb-8">
        <div>
          <h1 className="text-2xl font-bold">Return to Baseline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tripForBaseline.tailNumber} · {tripForBaseline.tripName || 'Trip'} ·{' '}
            Pull depleted items and return surplus
          </p>
        </div>

        {/* Pull from Commissary */}
        {pullRows.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border-b border-border">
              <ArrowDown className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Pull from Commissary
              </span>
              <span className="ml-auto text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                {pullRows.length} {pullRows.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="divide-y divide-border">
              {pullRows.map(row => {
                const item = state.items.find(i => i.id === row.itemId);
                if (!item) return null;
                const checked = checkedPull.has(row.itemId);
                return (
                  <div key={row.itemId} className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setCheckedPull(prev => {
                        const next = new Set(prev);
                        if (checked) next.delete(row.itemId);
                        else next.add(row.itemId);
                        return next;
                      })}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        checked ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                      }`}
                    >
                      {checked && <span className="text-xs">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${checked ? 'line-through text-muted-foreground' : ''}`}>
                        {item.itemName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Need {row.pullQty} to reach par {row.par}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-primary bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1 shrink-0">
                      +{row.pullQty} {item.uom}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Return to Commissary */}
        {returnRows.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border-b border-border">
              <ArrowUp className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Return to Commissary
              </span>
              <span className="ml-auto text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-full px-2 py-0.5">
                {returnRows.length} {returnRows.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="divide-y divide-border">
              {returnRows.map(row => {
                const item = state.items.find(i => i.id === row.itemId);
                if (!item) return null;
                const checked = checkedReturn.has(row.itemId);
                return (
                  <div key={row.itemId} className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setCheckedReturn(prev => {
                        const next = new Set(prev);
                        if (checked) next.delete(row.itemId);
                        else next.add(row.itemId);
                        return next;
                      })}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-border'
                      }`}
                    >
                      {checked && <span className="text-xs">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${checked ? 'line-through text-muted-foreground' : ''}`}>
                        {item.itemName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.returnQty} above par — loaded as overstock
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-2.5 py-1 shrink-0">
                      −{row.returnQty} {item.uom}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Button className="w-full" size="lg" onClick={handleBaselineConfirm}>
          Confirm &amp; Restore Baseline
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <PackagePlus className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Replenish</h1>
          <V2Badge />
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setScannerOpen(true)}
          >
            <Camera className="w-4 h-4" />
            Scan
          </Button>
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Units" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {uniqueUnits.map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary bar */}
      {totalItems > 0 && (
        <p className="text-sm text-muted-foreground">
          {totalItems} items — {pickedCount} picked, {loadedCount} loaded
        </p>
      )}

      {/* Sections by unit */}
      <div className="space-y-3">
        {Object.entries(groupedByUnit).map(([unit, pickItems]) => {
          const isOpen = openSections[unit] !== false;
          const unitLoadedCount = pickItems.filter(p => {
            const r = getRestockItem(p);
            return r?.done && !r.cancelled;
          }).length;
          const unitPickedCount = pickItems.filter(p => p.done).length;

          return (
            <Collapsible key={unit} open={isOpen} onOpenChange={() => toggleSection(unit)}>
              <div id={`replenish-${unit}`}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between bg-muted text-foreground rounded-lg px-4 py-2.5 cursor-pointer hover:bg-muted/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                      <span className="font-bold">{unit}</span>
                      <Badge variant="outline" className="text-white/70 border-white/30 text-xs">
                        {pickItems.length} items
                      </Badge>
                      <span className="text-xs text-white/60">
                        {unitPickedCount}/{pickItems.length} picked · {unitLoadedCount}/{pickItems.length} loaded
                      </span>
                    </div>
                    <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          checked={pickItems.every(p => p.done)}
                          onCheckedChange={(c: boolean) => handleCheckAllPicked(unit, !!c)}
                          className="border-white/50"
                        />
                        <span className="text-xs text-white/70">All Picked</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          checked={pickItems.filter(p => p.done).every(p => {
                            const r = getRestockItem(p);
                            return r?.done || r?.cancelled;
                          }) && pickItems.some(p => p.done)}
                          onCheckedChange={(c: boolean) => handleCheckAllLoaded(unit, !!c)}
                          className="border-white/50"
                        />
                        <span className="text-xs text-white/70">All Loaded</span>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1 space-y-0.5">
                    <div className="grid grid-cols-[60px_1fr_80px_80px_40px_40px_40px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50 rounded">
                      <span>Bin</span>
                      <span>Item</span>
                      <span className="text-center">Need</span>
                      <span className="text-center">Taken</span>
                      <span className="text-center">Picked</span>
                      <span className="text-center">Loaded</span>
                      <span className="text-center">Cancel</span>
                    </div>
                    {pickItems.map(pl => {
                      const item = getItem(pl.itemId);
                      if (!item) return null;
                      const restockItem = getRestockItem(pl);
                      const isCancelled = restockItem?.cancelled ?? false;
                      const isLoaded = restockItem?.done ?? false;

                      return (
                        <div
                          key={pl.id}
                          className={`grid grid-cols-[60px_1fr_80px_80px_40px_40px_40px] gap-2 px-4 py-2 rounded items-center text-sm ${
                            isCancelled
                              ? 'opacity-40 line-through'
                              : isLoaded
                              ? 'bg-emerald-500/5'
                              : 'hover:bg-muted/30'
                          }`}
                        >
                          <span className="text-xs text-muted-foreground">{getBinLocation(pl.itemId)}</span>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{item.itemName}</p>
                            <p className="text-xs text-muted-foreground">{item.uom}</p>
                          </div>
                          <span className="text-center font-bold">{pl.qtyNeeded}</span>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQtyChange(pl.id, -1)}
                              disabled={isCancelled}
                            >
                              <span className="text-xs">−</span>
                            </Button>
                            <span className="w-5 text-center font-mono text-xs">{pl.qtyTaken}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQtyChange(pl.id, 1)}
                              disabled={isCancelled}
                            >
                              <span className="text-xs">+</span>
                            </Button>
                          </div>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={pl.done}
                              onCheckedChange={(c: boolean) => handlePickedChange(pl, !!c)}
                              disabled={isCancelled}
                            />
                          </div>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={isLoaded}
                              onCheckedChange={(c: boolean) => handleLoadedChange(pl, !!c)}
                              disabled={!pl.done || isCancelled}
                            />
                          </div>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={isCancelled}
                              onCheckedChange={(c: boolean) => handleCancel(pl, !!c)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {/* Empty state */}
      {localPickItems.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No items to replenish. Complete an inspection with missing items to generate a replenish list.
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      {localPickItems.length > 0 && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t pt-4 pb-2">
          <Button onClick={handleUpdate} className="btn-aviation-primary">
            UPDATE
          </Button>
        </div>
      )}

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onItemScanned={handleScan}
      />
    </div>
  );
}
