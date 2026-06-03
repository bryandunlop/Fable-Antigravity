import React, { useState, useMemo } from 'react';
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
import { PackagePlus, ChevronDown, Camera } from 'lucide-react';
import type { PickListItem, RestockListItem } from '../types';

export default function Replenish() {
  const { state, dispatch } = useInventoryV2();
  const [unitFilter, setUnitFilter] = useState('all');
  const [localPickItems, setLocalPickItems] = useState<PickListItem[]>(state.pickListItems);
  const [localRestockItems, setLocalRestockItems] = useState<RestockListItem[]>(state.restockListItems);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [scannerOpen, setScannerOpen] = useState(false);

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
      s => s.itemId === itemId && s.stockroomId === state.selectedStockroomId
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
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
