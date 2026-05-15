import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../ui/collapsible';
import { useInventoryV2 } from '../InventoryV2Context';
import { ITEMS_V2 } from '../mockData';
import { SUPPLY_CATEGORIES } from '../constants';
import { V2Badge } from '../shared/V2Badge';
import { toast } from 'sonner';
import { ListChecks, Plus, Minus, ChevronDown, ArrowUp, Package } from 'lucide-react';

export default function PickList() {
  const { state, dispatch } = useInventoryV2();
  const [unitFilter, setUnitFilter] = useState('all');
  const [localItems, setLocalItems] = useState(state.pickListItems);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const uniqueUnits = useMemo(() => {
    const units = new Set(state.pickListItems.map(p => p.unitTailNumber));
    return Array.from(units);
  }, [state.pickListItems]);

  const filteredItems = useMemo(() => {
    if (unitFilter === 'all') return localItems;
    return localItems.filter(p => p.unitTailNumber === unitFilter);
  }, [localItems, unitFilter]);

  const getItem = (itemId: string) => ITEMS_V2.find(i => i.id === itemId);
  const getStockroomQty = (itemId: string) => {
    const si = state.stockroomItems.find(s => s.itemId === itemId && s.stockroomId === state.selectedStockroomId);
    return si?.qtyOnHand ?? 0;
  };
  const getBinLocation = (itemId: string) => {
    const si = state.stockroomItems.find(s => s.itemId === itemId && s.stockroomId === state.selectedStockroomId);
    return si?.binLocation ?? '—';
  };

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    SUPPLY_CATEGORIES.forEach(cat => {
      const catItems = filteredItems.filter(pl => {
        const item = getItem(pl.itemId);
        return item?.supplyCategory === cat.id;
      });
      if (catItems.length > 0) groups[cat.id] = catItems;
    });
    return groups;
  }, [filteredItems]);

  const handleQtyChange = (id: string, delta: number) => {
    setLocalItems(prev => prev.map(pl => {
      if (pl.id !== id) return pl;
      const newQty = Math.max(0, Math.min(pl.qtyNeeded, pl.qtyTaken + delta));
      return { ...pl, qtyTaken: newQty };
    }));
  };

  const handleDoneChange = (id: string, done: boolean) => {
    setLocalItems(prev => prev.map(pl => pl.id === id ? { ...pl, done } : pl));
  };

  const handleUpdate = () => {
    localItems.forEach(pl => {
      dispatch({ type: 'UPDATE_PICK_ITEM', payload: pl });
    });
    toast.success('Pick list updated');
  };

  const toggleSection = (catId: string) => {
    setOpenSections(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <ListChecks className="w-6 h-6 text-purple-500" />
          <h1 className="text-2xl font-bold">Pick List</h1>
          <V2Badge />
        </div>
        <div className="flex items-center gap-3">
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

      <p className="text-sm text-muted-foreground">
        Pull items from stockroom for {filteredItems.length} pending item(s) across {uniqueUnits.length} unit(s).
      </p>

      {/* Category Sections */}
      <div className="space-y-3">
        {SUPPLY_CATEGORIES.map(cat => {
          const catItems = groupedByCategory[cat.id];
          if (!catItems || catItems.length === 0) return null;
          const isOpen = openSections[cat.id] !== false;

          return (
            <Collapsible key={cat.id} open={isOpen} onOpenChange={() => toggleSection(cat.id)}>
              <div id={`pick-${cat.id}`}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between bg-slate-800 text-white rounded-lg px-4 py-2.5 cursor-pointer hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                      <span className="font-bold text-sm">{cat.label}</span>
                      <Badge variant="outline" className="text-white/70 border-white/30 text-xs">
                        {catItems.length}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/70 hover:text-white hover:bg-white/10 h-7 px-2"
                      onClick={e => { e.stopPropagation(); document.getElementById(`pick-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' }); }}
                    >
                      Top ▲
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1 space-y-1">
                    {catItems.sort((a, b) => a.unitTailNumber.localeCompare(b.unitTailNumber)).map(pl => {
                      const item = getItem(pl.itemId);
                      if (!item) return null;
                      const stockQty = getStockroomQty(pl.itemId);
                      const insufficientStock = stockQty < pl.qtyNeeded;

                      return (
                        <div key={pl.id} className="grid grid-cols-[60px_40px_60px_1fr_80px_80px_100px_40px] gap-2 px-4 py-2 rounded items-center text-sm hover:bg-muted/30">
                          <Badge variant="outline" className="text-xs justify-center">{pl.unitTailNumber}</Badge>
                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="text-xs text-muted-foreground">{getBinLocation(pl.itemId)}</span>
                          <div className="min-w-0">
                            <span className="font-medium truncate block">
                              {item.itemName}
                              {insufficientStock && <span className="text-red-500 font-bold ml-1">*</span>}
                            </span>
                            <span className="text-xs text-muted-foreground">{item.internalItemNumber}</span>
                          </div>
                          <span className="text-center font-bold">{pl.qtyNeeded}</span>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQtyChange(pl.id, -1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center font-mono">{pl.qtyTaken}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQtyChange(pl.id, 1)}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="text-xs text-muted-foreground text-center">needed</span>
                          <Checkbox checked={pl.done} onCheckedChange={(c: boolean) => handleDoneChange(pl.id, !!c)} />
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

      {filteredItems.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No items in pick list. Complete an inspection with missing items to generate picks.
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      {filteredItems.length > 0 && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t pt-4 pb-2">
          <Button onClick={handleUpdate} className="bg-purple-500 hover:bg-purple-600 text-white">
            UPDATE
          </Button>
        </div>
      )}
    </div>
  );
}
