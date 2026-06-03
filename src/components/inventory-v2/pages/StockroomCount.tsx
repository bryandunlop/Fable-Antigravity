import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../ui/collapsible';
import { useInventoryV2 } from '../InventoryV2Context';
import { SUPPLY_CATEGORIES, V2_THEME } from '../constants';
import { V2Badge } from '../shared/V2Badge';
import BulkAdjustModal from '../shared/BulkAdjustModal';
import { Search, Plus, Minus, ChevronDown, ArrowUp, Warehouse, Layers, ExternalLink } from 'lucide-react';

export default function StockroomCount() {
  const { state, dispatch } = useInventoryV2();
  const [search, setSearch] = useState('');
  const [hideZero, setHideZero] = useState(false);
  const [showBelowPar, setShowBelowPar] = useState(false);
  const [bulkAdjustOpen, setBulkAdjustOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const stockroomItems = useMemo(() =>
    state.stockroomItems.filter(si => si.stockroomId === state.selectedStockroomId),
    [state.stockroomItems, state.selectedStockroomId]
  );

  const getStockroomItem = (itemId: string) =>
    stockroomItems.find(si => si.itemId === itemId);

  const filteredItems = useMemo(() => {
    let items = state.items.map(item => ({
      ...item,
      stockroom: getStockroomItem(item.id),
    }));

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.itemName.toLowerCase().includes(q) ||
        i.internalItemNumber?.toLowerCase().includes(q) ||
        i.vendorItemNumber?.toLowerCase().includes(q)
      );
    }

    if (hideZero) {
      items = items.filter(i => (i.stockroom?.qtyOnHand ?? 0) > 0);
    }

    if (showBelowPar) {
      items = items.filter(i => {
        const si = i.stockroom;
        return si && si.qtyOnHand < si.parLevel;
      });
    }

    return items;
  }, [search, hideZero, showBelowPar, stockroomItems, state.items]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    SUPPLY_CATEGORIES.forEach(cat => {
      const catItems = filteredItems.filter(i => i.supplyCategory === cat.id);
      if (catItems.length > 0) groups[cat.id] = catItems;
    });
    return groups;
  }, [filteredItems]);

  const handleQtyChange = (itemId: string, delta: number) => {
    const si = getStockroomItem(itemId);
    if (!si) return;
    const newQty = Math.max(0, si.qtyOnHand + delta);
    dispatch({
      type: 'UPDATE_STOCKROOM_ITEM',
      payload: { ...si, qtyOnHand: newQty },
    });
  };

  const toggleSection = (catId: string) => {
    setOpenSections(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const currentStockroom = state.stockrooms.find(s => s.id === state.selectedStockroomId);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Warehouse className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Stockroom Count</h1>
          <V2Badge />
        </div>
        <Button
          onClick={() => setBulkAdjustOpen(true)}
          className="btn-aviation-primary"
        >
          <Layers className="w-4 h-4 mr-1" /> Bulk Adjust
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Stockroom</Label>
              <Select
                value={state.selectedStockroomId}
                onValueChange={(v: string) => dispatch({ type: 'SET_SELECTED_STOCKROOM', payload: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.stockrooms.map(sr => (
                    <SelectItem key={sr.id} value={sr.id}>{sr.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Find item..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2">
                <Switch id="hide-zero" checked={hideZero} onCheckedChange={setHideZero} />
                <Label htmlFor="hide-zero" className="text-sm">Hide zero-qty</Label>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2">
                <Switch id="below-par" checked={showBelowPar} onCheckedChange={setShowBelowPar} />
                <Label htmlFor="below-par" className="text-sm">Below-par only</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Sections */}
      <div className="space-y-3">
        {SUPPLY_CATEGORIES.map(cat => {
          const catItems = groupedByCategory[cat.id];
          if (!catItems || catItems.length === 0) return null;
          const isOpen = openSections[cat.id] !== false; // default open

          return (
            <Collapsible key={cat.id} open={isOpen} onOpenChange={() => toggleSection(cat.id)}>
              <div id={`section-${cat.id}`}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between bg-slate-800 dark:bg-slate-800 text-white rounded-lg px-4 py-2.5 cursor-pointer hover:bg-slate-700 transition-colors">
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
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById(`section-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Top ▲
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1 space-y-0.5">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_80px_90px_90px_120px_60px_60px_28px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50 rounded">
                      <span>Item</span>
                      <span>Bin</span>
                      <span>Vendor #</span>
                      <span>Internal #</span>
                      <span className="text-center">Qty On Hand</span>
                      <span className="text-center">Par</span>
                      <span className="text-center">Min</span>
                      <span />
                    </div>
                    {catItems.map(item => {
                      const si = item.stockroom;
                      const qty = si?.qtyOnHand ?? 0;
                      const par = si?.parLevel ?? 0;
                      const min = si?.minimumLevel ?? 0;
                      const isBelowPar = qty < par;
                      const isAtMin = qty <= min;
                      const batches = si
                        ? state.stockBatches.filter(
                            b => b.itemId === item.id && b.stockroomId === si.stockroomId
                          )
                        : [];
                      const isExpanded = expandedItemId === item.id;

                      return (
                        <React.Fragment key={item.id}>
                          <div
                            className={`grid grid-cols-[1fr_80px_90px_90px_120px_60px_60px_28px] gap-2 px-4 py-2 rounded items-center text-sm ${
                              isBelowPar ? 'bg-blue-100 dark:bg-blue-900/20' : 'hover:bg-muted/30'
                            }`}
                          >
                            <span className="font-medium truncate flex items-center gap-1.5">
                              {item.itemName}
                              {isBelowPar && item.reorderUrl && (
                                <a
                                  href={item.reorderUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 transition-colors shrink-0"
                                  title="Reorder from vendor"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </span>
                            <span className="text-muted-foreground text-xs">{si?.binLocation ?? '—'}</span>
                            <span className="text-muted-foreground text-xs truncate">{item.vendorItemNumber ?? '—'}</span>
                            <span className="text-muted-foreground text-xs truncate">{item.internalItemNumber ?? '—'}</span>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleQtyChange(item.id, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center font-mono font-bold">
                                {qty}
                                {isAtMin && <span className="text-red-500 font-bold ml-0.5">*</span>}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleQtyChange(item.id, 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <span className="text-center text-muted-foreground">{par}</span>
                            <span className="text-center text-muted-foreground">{min}</span>
                            <div className="flex items-center justify-center">
                              {batches.length > 0 && (
                                <button
                                  className="p-0.5 rounded hover:bg-muted/50 transition-colors"
                                  onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                                  title={isExpanded ? 'Hide batches' : 'Show batches'}
                                >
                                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                              )}
                            </div>
                          </div>
                          {isExpanded && batches.map(batch => {
                            const isExpired = batch.expirationDate
                              ? new Date(batch.expirationDate) < new Date()
                              : false;
                            const isExpiringSoon = batch.expirationDate
                              ? new Date(batch.expirationDate) < new Date(Date.now() + 14 * 86_400_000)
                              : false;

                            return (
                              <div key={batch.id} className="flex items-center justify-between px-6 py-1.5 bg-slate-950/40 text-xs">
                                <span className="text-muted-foreground">{batch.batchLabel ?? 'Batch'}</span>
                                <span className="text-muted-foreground">Qty: {batch.quantity}</span>
                                {batch.expirationDate ? (
                                  <span className={isExpired ? 'text-red-400 line-through' : isExpiringSoon ? 'text-amber-400' : 'text-muted-foreground'}>
                                    {isExpired ? 'Expired' : `Exp: ${new Date(batch.expirationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}`}
                                    {isExpiringSoon && !isExpired && ' ⚠'}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">No expiry</span>
                                )}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {Object.keys(groupedByCategory).length === 0 && (
        <p className="text-center text-muted-foreground py-12">No items match your filters</p>
      )}

      <BulkAdjustModal open={bulkAdjustOpen} onOpenChange={setBulkAdjustOpen} />
    </div>
  );
}
