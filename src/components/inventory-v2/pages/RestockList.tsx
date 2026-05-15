import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../ui/collapsible';
import { useInventoryV2 } from '../InventoryV2Context';
import { V2Badge } from '../shared/V2Badge';
import { toast } from 'sonner';
import { PackagePlus, ChevronDown, Package, Check, X } from 'lucide-react';
import type { RestockListItem } from '../types';

export default function RestockList() {
  const { state, dispatch } = useInventoryV2();
  const [unitFilter, setUnitFilter] = useState('all');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // If restock list is empty, generate sample items from completed pick list items
  const restockItems = useMemo(() => {
    if (state.restockListItems.length > 0) return state.restockListItems;
    // Generate from pick list items that are done
    const donePicks = state.pickListItems.filter(p => p.done);
    return donePicks.map(pl => ({
      id: `restock-${pl.id}`,
      inspectionId: pl.inspectionId,
      unitTailNumber: pl.unitTailNumber,
      itemId: pl.itemId,
      qtyPicked: pl.qtyTaken,
      qtyNeeded: pl.qtyNeeded,
      done: false,
      cancelled: false,
    }));
  }, [state.restockListItems, state.pickListItems]);

  const [localItems, setLocalItems] = useState<RestockListItem[]>(restockItems);

  const uniqueUnits = useMemo(() => {
    const units = new Set(localItems.map(r => r.unitTailNumber));
    return Array.from(units);
  }, [localItems]);

  const filteredItems = useMemo(() => {
    if (unitFilter === 'all') return localItems;
    return localItems.filter(r => r.unitTailNumber === unitFilter);
  }, [localItems, unitFilter]);

  const groupedByUnit = useMemo(() => {
    const groups: Record<string, RestockListItem[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.unitTailNumber]) groups[item.unitTailNumber] = [];
      groups[item.unitTailNumber].push(item);
    });
    return groups;
  }, [filteredItems]);

  const getItem = (itemId: string) => state.items.find(i => i.id === itemId);

  const handleDoneChange = (id: string, done: boolean) => {
    setLocalItems(prev => prev.map(r => r.id === id ? { ...r, done } : r));
  };

  const handleCancelChange = (id: string, cancelled: boolean) => {
    setLocalItems(prev => prev.map(r => r.id === id ? { ...r, cancelled } : r));
  };

  const handleCheckAll = (unit: string, checked: boolean) => {
    setLocalItems(prev => prev.map(r =>
      r.unitTailNumber === unit ? { ...r, done: checked } : r
    ));
  };

  const handleUpdate = () => {
    dispatch({ type: 'SET_RESTOCK_LIST', payload: localItems });
    toast.success('Restock list updated');
  };

  const toggleSection = (unit: string) => {
    setOpenSections(prev => ({ ...prev, [unit]: !prev[unit] }));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <PackagePlus className="w-6 h-6 text-purple-500" />
          <h1 className="text-2xl font-bold">Restock List</h1>
          <V2Badge />
        </div>
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

      <p className="text-sm text-muted-foreground">
        Deliver picked items to each aircraft unit.
      </p>

      {/* Unit Sections */}
      <div className="space-y-3">
        {Object.entries(groupedByUnit).map(([unit, items]) => {
          const isOpen = openSections[unit] !== false;
          const allDone = items.every(i => i.done || i.cancelled);

          return (
            <Collapsible key={unit} open={isOpen} onOpenChange={() => toggleSection(unit)}>
              <div id={`restock-${unit}`}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between bg-slate-800 text-white rounded-lg px-4 py-2.5 cursor-pointer hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                      <span className="font-bold">{unit}</span>
                      <Badge variant="outline" className="text-white/70 border-white/30 text-xs">
                        {items.length} items
                      </Badge>
                      {allDone && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={items.every(i => i.done)}
                          onCheckedChange={(c: boolean) => handleCheckAll(unit, !!c)}
                          className="border-white/50"
                        />
                        <span className="text-xs text-white/70">Check All</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/70 hover:text-white hover:bg-white/10 h-7 px-2"
                        onClick={e => { e.stopPropagation(); document.getElementById(`restock-${unit}`)?.scrollIntoView({ behavior: 'smooth' }); }}
                      >
                        Top ▲
                      </Button>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1 space-y-0.5">
                    <div className="grid grid-cols-[40px_1fr_80px_60px_70px_60px_40px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50 rounded">
                      <span></span>
                      <span>Item</span>
                      <span>Item #</span>
                      <span className="text-center">Cancel</span>
                      <span className="text-center">Picked</span>
                      <span className="text-center">Needed</span>
                      <span className="text-center">Done</span>
                    </div>
                    {items.map(rl => {
                      const item = getItem(rl.itemId);
                      if (!item) return null;
                      return (
                        <div
                          key={rl.id}
                          className={`grid grid-cols-[40px_1fr_80px_60px_70px_60px_40px] gap-2 px-4 py-2 rounded items-center text-sm ${
                            rl.cancelled ? 'opacity-50 line-through' : rl.done ? 'bg-emerald-500/5' : 'hover:bg-muted/30'
                          }`}
                        >
                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium truncate">{item.itemName}</span>
                          <span className="text-xs text-muted-foreground">{item.internalItemNumber}</span>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={rl.cancelled}
                              onCheckedChange={(c: boolean) => handleCancelChange(rl.id, !!c)}
                            />
                          </div>
                          <Badge variant="outline" className="justify-center">{rl.qtyPicked}</Badge>
                          <span className="text-center">{rl.qtyNeeded}</span>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={rl.done}
                              onCheckedChange={(c: boolean) => handleDoneChange(rl.id, !!c)}
                              disabled={rl.cancelled}
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

      {localItems.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No items to restock. Complete picking first.
          </CardContent>
        </Card>
      )}

      {localItems.length > 0 && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t pt-4 pb-2">
          <Button onClick={handleUpdate} className="bg-purple-500 hover:bg-purple-600 text-white">
            UPDATE
          </Button>
        </div>
      )}
    </div>
  );
}
