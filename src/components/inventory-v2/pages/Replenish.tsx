import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import {
  PackagePlus, ChevronDown, Camera, ArrowDown, ArrowUp,
  Zap, Search, ClipboardCheck, CheckCircle2, Minus, Plus, PlaneTakeoff,
} from 'lucide-react';
import type { PickListItem, RestockListItem, TripReturnItem, StockroomItem } from '../types';

export default function Replenish() {
  const { state, dispatch } = useInventoryV2();
  const [unitFilter, setUnitFilter] = useState('all');
  const [localPickItems, setLocalPickItems] = useState<PickListItem[]>(state.pickListItems);
  const [localRestockItems, setLocalRestockItems] = useState<RestockListItem[]>(state.restockListItems);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [scannerOpen, setScannerOpen] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tailParam = searchParams.get('tail');

  // ── Post-trip restock state ──────────────────────────────────────────────
  // 'usage' = pull only what was tapped as used (fast path).
  // 'full'  = count every item on board (catches silent depletion).
  const [restockMode, setRestockMode] = useState<'usage' | 'full'>('usage');
  // Full-count manual counts (itemId -> counted on board). Falls back to expectedOnBoard.
  const [counts, setCounts] = useState<Record<string, number>>({});
  // Cosmetic "physically moved" ticks for usage mode (not persisted).
  const [checkedPull, setCheckedPull] = useState<Set<string>>(new Set());
  const [checkedReturn, setCheckedReturn] = useState<Set<string>>(new Set());

  // Most recent completed trip for this tail (whether or not already restocked).
  const restockTrip = useMemo(() => {
    if (!tailParam) return null;
    return (
      state.trips
        .filter(t => t.tailNumber === tailParam && t.status === 'completed')
        .sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''))
        [0] ?? null
    );
  }, [state.trips, tailParam]);

  const alreadyRestocked = !!restockTrip?.baselineConfirmedAt;

  // Per-item load + usage totals for the restock trip.
  const { loadByItem, usageByItem } = useMemo(() => {
    const load = new Map<string, number>();
    const usage = new Map<string, number>();
    if (restockTrip) {
      restockTrip.loadItems.forEach(li => load.set(li.itemId, (load.get(li.itemId) ?? 0) + li.qty));
      restockTrip.legs.forEach(leg =>
        leg.usageLog.forEach(e => usage.set(e.itemId, (usage.get(e.itemId) ?? 0) + e.qtyUsed))
      );
    }
    return { loadByItem: load, usageByItem: usage };
  }, [restockTrip]);

  const parOf = (itemId: string) => {
    const item = state.items.find(i => i.id === itemId);
    if (!item || !restockTrip) return 0;
    return item.defaultQuantities[restockTrip.aircraftType] ?? 0;
  };
  // What the system believes is on board: par + extras loaded − used.
  const expectedOnBoard = (itemId: string) =>
    parOf(itemId) + (loadByItem.get(itemId) ?? 0) - (usageByItem.get(itemId) ?? 0);
  const getCount = (itemId: string) => counts[itemId] ?? expectedOnBoard(itemId);
  const setCount = (itemId: string, value: number) =>
    setCounts(prev => ({ ...prev, [itemId]: Math.max(0, value) }));

  // Items that belong on this aircraft (have a par for its type), grouped by category.
  const aircraftItems = useMemo(() => {
    if (!restockTrip) return [];
    return state.items
      .filter(i => i.defaultQuantities[restockTrip.aircraftType] != null)
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [state.items, restockTrip]);

  const fullCountGroups = useMemo(() => {
    const groups: Record<string, typeof aircraftItems> = {};
    aircraftItems.forEach(it => {
      (groups[it.category] ??= []).push(it);
    });
    return groups;
  }, [aircraftItems]);

  // Items touched on the trip (loaded or used) — the usage-only working set.
  const touchedItemIds = useMemo(() => {
    const ids = new Set<string>();
    loadByItem.forEach((_, id) => ids.add(id));
    usageByItem.forEach((_, id) => ids.add(id));
    return Array.from(ids);
  }, [loadByItem, usageByItem]);

  type RestockRow = { itemId: string; par: number; counted: number; pull: number; ret: number };
  // Pull/return rows derived from the active mode. Usage mode trusts the usage math;
  // full mode trusts the FA's physical count.
  const restockRows: RestockRow[] = useMemo(() => {
    const ids = restockMode === 'full' ? aircraftItems.map(i => i.id) : touchedItemIds;
    return ids
      .filter(itemId => state.items.some(i => i.id === itemId))
      .map(itemId => {
        const par = parOf(itemId);
        const counted = restockMode === 'full' ? getCount(itemId) : expectedOnBoard(itemId);
        return {
          itemId,
          par,
          counted,
          pull: Math.max(0, par - counted),
          ret: Math.max(0, counted - par),
        };
      })
      .filter(r => r.pull > 0 || r.ret > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restockMode, aircraftItems, touchedItemIds, counts, loadByItem, usageByItem, state.items]);

  const pullRows = useMemo(() => restockRows.filter(r => r.pull > 0), [restockRows]);
  const returnRows = useMemo(() => restockRows.filter(r => r.ret > 0), [restockRows]);
  const nothingToDo = pullRows.length === 0 && returnRows.length === 0;

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

  function handleConfirmRestock() {
    if (!restockTrip) return;

    const stockroomUpdates: StockroomItem[] = state.stockroomItems
      .map(si => {
        const row = restockRows.find(r => r.itemId === si.itemId);
        if (!row) return null;
        return {
          ...si,
          qtyOnHand: Math.max(0, si.qtyOnHand - row.pull + row.ret),
        };
      })
      .filter((si): si is StockroomItem => si !== null);

    const returnItems: TripReturnItem[] = restockRows
      .filter(r => r.ret > 0)
      .map(r => ({
        id: `tr-${crypto.randomUUID()}`,
        itemId: r.itemId,
        qty: r.ret,
        returnedBy: state.currentUser.name,
        returnedAt: new Date().toISOString(),
      }));

    dispatch({
      type: 'ADD_TRIP_RETURN_ITEMS',
      payload: {
        tripId: restockTrip.id,
        items: returnItems,
        stockroomUpdates,
      },
    });
    setCounts({});
    setCheckedPull(new Set());
    setCheckedReturn(new Set());
    toast.success(`${restockTrip.tailNumber} restocked to par`);
  }

  // Hand off to the existing inspection workflow for this tail (resume if in progress).
  function handleFormalInspection() {
    if (!restockTrip) return;
    const inProgress = state.inspections.find(
      i => i.tailNumber === restockTrip.tailNumber && i.status === 'in_progress'
    );
    navigate(
      inProgress
        ? `/inventory-v2/inspection?resume=${inProgress.id}`
        : `/inventory-v2/inspection?tail=${restockTrip.tailNumber}`
    );
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

  // ── Post-trip Restock screen (reached from a completed trip via ?tail=) ─────
  if (tailParam) {
    // No completed trip for this tail — honest state, never the inspection empty view.
    if (!restockTrip) {
      return (
        <div className="max-w-2xl mx-auto p-6">
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-3 text-muted-foreground">
              <PlaneTakeoff className="h-8 w-8 mx-auto opacity-50" />
              <p>
                No recent completed trip for{' '}
                <span className="font-mono font-semibold text-foreground">{tailParam}</span> to restock.
              </p>
              <Button variant="outline" onClick={() => navigate('/inventory-v2/trips')}>
                Go to Trips
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    const segCls = (active: boolean) =>
      `flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
        active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`;

    return (
      <div className="max-w-2xl mx-auto space-y-4 pb-28">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackagePlus className="h-6 w-6 text-primary" />
            Restock {restockTrip.tailNumber}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {restockTrip.tripName || 'Trip'} · return the aircraft to par
          </p>
        </div>

        {alreadyRestocked && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">Already restocked to par</p>
              <p className="text-emerald-700/80 dark:text-emerald-400/80 text-xs">
                Confirmed {new Date(restockTrip.baselineConfirmedAt!).toLocaleDateString()}. Run a
                full count below if you want to check for silent losses.
              </p>
            </div>
          </div>
        )}

        {/* Mode switch */}
        <div className="grid grid-cols-3 gap-1.5 bg-muted rounded-xl p-1.5">
          <button onClick={() => setRestockMode('usage')} className={segCls(restockMode === 'usage')}>
            <Zap className="h-3.5 w-3.5" /> Usage only
          </button>
          <button onClick={() => setRestockMode('full')} className={segCls(restockMode === 'full')}>
            <Search className="h-3.5 w-3.5" /> Full count
          </button>
          <button onClick={handleFormalInspection} className={segCls(false)}>
            <ClipboardCheck className="h-3.5 w-3.5" /> Inspection
          </button>
        </div>

        {restockMode === 'usage' ? (
          <>
            <p className="text-xs text-muted-foreground">
              Items used this trip that are now below par. Tap ✓ as you physically move each one.
            </p>

            {/* Pull from Commissary */}
            {pullRows.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border-b border-border">
                  <ArrowDown className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Pull from Commissary</span>
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
                            if (checked) next.delete(row.itemId); else next.add(row.itemId);
                            return next;
                          })}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            checked ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                          }`}
                        >
                          {checked && <span className="text-xs">✓</span>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${checked ? 'line-through text-muted-foreground' : ''}`}>{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            used {usageByItem.get(row.itemId) ?? 0} · on board {row.counted} · par {row.par}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-primary bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1 shrink-0">
                          +{row.pull} {item.uom}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Return surplus */}
            {returnRows.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border-b border-border">
                  <ArrowUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Return Surplus</span>
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
                            if (checked) next.delete(row.itemId); else next.add(row.itemId);
                            return next;
                          })}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-border'
                          }`}
                        >
                          {checked && <span className="text-xs">✓</span>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${checked ? 'line-through text-muted-foreground' : ''}`}>{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">on board {row.counted} · par {row.par} — surplus</p>
                        </div>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-2.5 py-1 shrink-0">
                          −{row.ret} {item.uom}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Honest empty state for usage mode */}
            {nothingToDo && (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center space-y-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-7 w-7 mx-auto text-emerald-500" />
                  <p>Everything used this trip is still at par — nothing to pull from the usage log.</p>
                  <p className="text-xs">
                    Passengers sometimes take items without them being logged. Switch to a full count to
                    inspect every item.
                  </p>
                  <Button variant="outline" onClick={() => setRestockMode('full')}>
                    <Search className="mr-2 h-4 w-4" /> Switch to Full count
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Count every item on board. Each starts at what the system expects (par + loaded − used) —
              correct it to the actual count. Items off par become pull/return below.
            </p>
            {Object.entries(fullCountGroups).map(([category, items]) => (
              <div key={category} className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2 bg-muted/50 border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {category}
                </div>
                <div className="divide-y divide-border">
                  {items.map(item => {
                    const par = parOf(item.id);
                    const counted = getCount(item.id);
                    const diff = counted - par;
                    return (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            par {par} {item.uom}
                            {diff < 0 && <span className="text-primary font-semibold"> · pull {-diff}</span>}
                            {diff > 0 && <span className="text-emerald-600 font-semibold"> · return {diff}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCount(item.id, counted - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-7 text-center font-mono text-sm font-bold">{counted}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCount(item.id, counted + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Sticky confirm bar */}
        <div className="sticky bottom-0 -mx-1 bg-background/95 backdrop-blur border-t pt-3 pb-2 space-y-2">
          <p className="text-xs text-center text-muted-foreground">
            {pullRows.length > 0 && <span className="text-primary font-semibold">{pullRows.length} to pull</span>}
            {pullRows.length > 0 && returnRows.length > 0 && ' · '}
            {returnRows.length > 0 && <span className="text-emerald-600 font-semibold">{returnRows.length} to return</span>}
            {nothingToDo && 'Aircraft at par — nothing to move'}
          </p>
          <Button className="w-full" size="lg" onClick={handleConfirmRestock} disabled={nothingToDo}>
            Confirm restock — return {restockTrip.tailNumber} to par
          </Button>
        </div>
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
