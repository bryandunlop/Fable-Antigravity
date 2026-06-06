// ─── Commissary — Unified Command Center ──────────────────────────────────
import React, { useState, useMemo, useCallback } from 'react';
import {
  Warehouse, Search, Plus, Minus, ChevronDown, Pencil,
  PackagePlus, ShoppingCart, Settings2, AlertTriangle,
  ExternalLink, Trash2, Package, Clock,
} from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { toast } from 'sonner';
import { useInventoryV2 } from '../InventoryV2Context';
import { V2Badge } from '../shared/V2Badge';
import { SUPPLY_CATEGORIES } from '../constants';
import BulkAdjustModal from '../shared/BulkAdjustModal';
import ReceiveStockModal from '../shared/ReceiveStockModal';
import ShoppingListModal from '../shared/ShoppingListModal';
import EditItemDialog from '../shared/EditItemDialog';
import type { InventoryItemV2, StockroomItem, StorageLocation, StockBatch } from '../types';

// ─── Helper functions ───────────────────────────────────────────────────────

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getBatchStatus(expDate?: string): 'fresh' | 'expiring-soon' | 'expired' | 'none' {
  if (!expDate) return 'none';
  const now = Date.now();
  const exp = new Date(expDate).getTime();
  if (exp < now) return 'expired';
  if (exp - now < 14 * 24 * 60 * 60 * 1000) return 'expiring-soon';
  return 'fresh';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Commissary() {
  const { state, dispatch } = useInventoryV2();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'location' | 'category'>('location');
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [hideZero, setHideZero] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Modal states
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [bulkAdjustOpen, setBulkAdjustOpen] = useState(false);

  // Edit item dialog
  const [editItem, setEditItem] = useState<InventoryItemV2 | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // ─── Data + filtering ──────────────────────────────────────────────────────

  const stockroomItems = useMemo(
    () => state.stockroomItems.filter(si => si.stockroomId === 'sr-1'),
    [state.stockroomItems],
  );

  const getStockroomItem = useCallback(
    (itemId: string) => stockroomItems.find(si => si.itemId === itemId),
    [stockroomItems],
  );

  // Stats
  const criticalCount = useMemo(
    () => stockroomItems.filter(si => si.qtyOnHand <= si.minimumLevel).length,
    [stockroomItems],
  );
  const lowCount = useMemo(
    () => stockroomItems.filter(si => si.qtyOnHand > si.minimumLevel && si.qtyOnHand < si.parLevel).length,
    [stockroomItems],
  );

  // Activity log for history section (activityLog, not stockLog)
  const activityHistory = useMemo(
    () => state.activityLog.filter(l => l.module === 'stockroom').slice(0, 50),
    [state.activityLog],
  );

  // Filtered items (join item master + stockroom record)
  const filteredItems = useMemo(() => {
    let items = state.items.map(item => ({
      ...item,
      stockroom: getStockroomItem(item.id),
    }));

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        i =>
          i.itemName.toLowerCase().includes(q) ||
          i.vendorItemNumber?.toLowerCase().includes(q) ||
          i.internalItemNumber?.toLowerCase().includes(q) ||
          i.stockroom?.binLocation?.toLowerCase().includes(q) ||
          i.vendor?.toLowerCase().includes(q),
      );
    }

    if (showLowOnly) {
      items = items.filter(i => {
        const si = i.stockroom;
        return si && si.qtyOnHand < si.parLevel;
      });
    }

    if (hideZero) {
      items = items.filter(i => (i.stockroom?.qtyOnHand ?? 0) > 0);
    }

    return items;
  }, [search, showLowOnly, hideZero, stockroomItems, state.items, getStockroomItem]);

  // ─── Grouping logic ────────────────────────────────────────────────────────

  const groupedByLocation = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    const sortedLocations = [...state.storageLocations].sort((a, b) => a.sortOrder - b.sortOrder);

    sortedLocations.forEach(loc => {
      const locItems = filteredItems.filter(i => i.stockroom?.locationId === loc.id);
      if (locItems.length > 0) groups[loc.id] = locItems;
    });

    // Unassigned items
    const locationIds = new Set(state.storageLocations.map(l => l.id));
    const unassigned = filteredItems.filter(
      i => !i.stockroom?.locationId || !locationIds.has(i.stockroom.locationId),
    );
    if (unassigned.length > 0) groups['unassigned'] = unassigned;

    return groups;
  }, [filteredItems, state.storageLocations]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    SUPPLY_CATEGORIES.forEach(cat => {
      const catItems = filteredItems.filter(i => i.supplyCategory === cat.id);
      if (catItems.length > 0) groups[cat.id] = catItems;
    });
    return groups;
  }, [filteredItems]);

  const grouped = viewMode === 'location' ? groupedByLocation : groupedByCategory;

  const getGroupLabel = (key: string): string => {
    if (viewMode === 'location') {
      if (key === 'unassigned') return 'Unassigned';
      return state.storageLocations.find(l => l.id === key)?.name ?? key;
    }
    return SUPPLY_CATEGORIES.find(c => c.id === key)?.label ?? key;
  };

  const getGroupAlertCounts = (items: typeof filteredItems) => {
    let critical = 0;
    let low = 0;
    items.forEach(i => {
      const si = i.stockroom;
      if (!si) return;
      if (si.qtyOnHand <= si.minimumLevel) critical++;
      else if (si.qtyOnHand < si.parLevel) low++;
    });
    return { critical, low };
  };

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: prev[key] === false ? true : !prev[key] }));
  };

  const isSectionOpen = (key: string, idx: number) => {
    if (openSections[key] !== undefined) return openSections[key];
    return idx === 0; // first section open by default
  };

  const handleQtyChange = (itemId: string, delta: number) => {
    const si = getStockroomItem(itemId);
    if (!si) return;
    const newQty = Math.max(0, si.qtyOnHand + delta);
    dispatch({ type: 'UPDATE_STOCKROOM_ITEM', payload: { ...si, qtyOnHand: newQty } });
  };

  const getBatchesForItem = (itemId: string): StockBatch[] =>
    state.stockBatches.filter(b => b.itemId === itemId && b.stockroomId === 'sr-1');

  const handleDisposeBatch = (batch: StockBatch) => {
    const item = state.items.find(i => i.id === batch.itemId);
    dispatch({
      type: 'DISPOSE_EXPIRED_BATCH',
      payload: {
        batchId: batch.id,
        itemId: batch.itemId,
        stockroomId: batch.stockroomId,
        qty: batch.quantity,
      },
    });
    toast.success(`Disposed ${batch.quantity}x ${item?.itemName ?? 'item'} (${batch.batchLabel ?? 'batch'})`);
  };

  // ─── Qty color helper ──────────────────────────────────────────────────────

  const getQtyColor = (si: StockroomItem | undefined): string => {
    if (!si) return 'text-muted-foreground';
    if (si.qtyOnHand <= si.minimumLevel) return 'text-red-400';
    if (si.qtyOnHand < si.parLevel) return 'text-amber-400';
    return 'text-emerald-400';
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const groupEntries = Object.entries(grouped);

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6 animate-in fade-in duration-200">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Warehouse className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Commissary</h1>
          <V2Badge variant="new" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="btn-aviation-primary gap-2"
            onClick={() => setReceiveOpen(true)}
          >
            <PackagePlus className="w-4 h-4" />
            Receive Stock
          </Button>

          <Button
            variant="outline"
            className="gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
            onClick={() => setShoppingOpen(true)}
          >
            <ShoppingCart className="w-4 h-4" />
            Shopping List
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setAddItemOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Button>

          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setLocationsOpen(true)}
          >
            <Settings2 className="w-4 h-4" />
            Locations
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBulkAdjustOpen(true)}
          >
            Bulk Adjust
          </Button>

          <Button
            variant={showHistory ? 'default' : 'ghost'}
            className="gap-2"
            onClick={() => setShowHistory(h => !h)}
          >
            <Clock className="w-4 h-4" />
            History
            {activityHistory.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {activityHistory.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-premium glass-premium-hover cursor-default">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Critical</p>
                <p className="text-3xl font-bold text-red-400">{criticalCount}</p>
                <p className="text-xs text-muted-foreground mt-1">At or below minimum</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-premium glass-premium-hover cursor-default">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Low Stock</p>
                <p className="text-3xl font-bold text-amber-400">{lowCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Below par level</p>
              </div>
              <Package className="w-8 h-8 text-amber-400 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-premium glass-premium-hover cursor-default">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Total Items</p>
                <p className="text-3xl font-bold text-emerald-400">{state.items.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {state.storageLocations.length} locations
                </p>
              </div>
              <Warehouse className="w-8 h-8 text-emerald-400 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── History Panel ───────────────────────────────────────────────────── */}
      {showHistory && (
        <Card className="border border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm font-semibold text-foreground mb-3">Recent Stockroom Activity</p>
            {activityHistory.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                <Clock className="w-8 h-8 opacity-40" />
                <p className="text-sm">No stockroom activity yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activityHistory.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                  >
                    <span className="text-xs text-muted-foreground w-24 shrink-0 pt-0.5">
                      {formatDateShort(entry.timestamp)}
                    </span>
                    <span className="text-xs font-medium text-foreground w-28 shrink-0 truncate">
                      {entry.userName}
                    </span>
                    <span className="text-xs text-muted-foreground">{entry.description}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Controls Row ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search items, bins, vendors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          <button
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'location'
                ? 'bg-primary text-white'
                : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setViewMode('location')}
          >
            By Location
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'category'
                ? 'bg-primary text-white'
                : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setViewMode('category')}
          >
            By Category
          </button>
        </div>

        <Button
          variant={showLowOnly ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowLowOnly(v => !v)}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Low / Critical Only
        </Button>

        <Button
          variant={hideZero ? 'default' : 'outline'}
          size="sm"
          className="text-xs"
          onClick={() => setHideZero(v => !v)}
        >
          Hide Zero
        </Button>
      </div>

      {/* ── Item Groups ─────────────────────────────────────────────────────── */}
      {groupEntries.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground gap-3">
          <Package className="w-12 h-12 opacity-30" />
          <p className="text-base font-medium">No items match your filters</p>
          <p className="text-sm">Try adjusting the search or filter options above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupEntries.map(([groupKey, groupItems], idx) => {
            const open = isSectionOpen(groupKey, idx);
            const { critical, low } = getGroupAlertCounts(groupItems);
            const label = getGroupLabel(groupKey);

            return (
              <Collapsible
                key={groupKey}
                open={open}
                onOpenChange={() => toggleSection(groupKey)}
              >
                <Card className="glass-panel overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`}
                        />
                        <span className="font-semibold text-foreground text-sm">{label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {groupItems.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {critical > 0 && (
                          <Badge className="text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                            {critical} critical
                          </Badge>
                        )}
                        {low > 0 && (
                          <Badge className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {low} low
                          </Badge>
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="divide-y divide-border">
                      {groupItems.map(item => {
                        const si = item.stockroom;
                        const isCritical = si && si.qtyOnHand <= si.minimumLevel;
                        const isLow = si && !isCritical && si.qtyOnHand < si.parLevel;
                        const batches = getBatchesForItem(item.id);
                        const isExpanded = expandedItemId === item.id;

                        return (
                          <div key={item.id}>
                            {/* ── Item Row ─────────────────────────────────── */}
                            <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors">
                              {/* Left: bin + name + badges */}
                              <div className="flex-1 min-w-0 flex items-center gap-3">
                                {si?.binLocation && (
                                  <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                    {si.binLocation}
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <span className="text-sm font-medium text-foreground truncate block">
                                    {item.itemName}
                                  </span>
                                  {(isCritical || isLow) && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {isCritical && (
                                        <Badge className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 border border-red-500/30">
                                          CRITICAL
                                        </Badge>
                                      )}
                                      {isLow && (
                                        <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                          LOW
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Middle: meta */}
                              <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                                <span>Min {si?.minimumLevel ?? '—'}</span>
                                <span>Par {si?.parLevel ?? '—'}</span>
                                <span className="uppercase">{item.uom}</span>
                                {item.vendor && (
                                  <span className="flex items-center gap-1">
                                    {item.reorderUrl ? (
                                      <a
                                        href={item.reorderUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-0.5 text-primary hover:underline"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        {item.vendor}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ) : (
                                      item.vendor
                                    )}
                                  </span>
                                )}
                              </div>

                              {/* Right: qty controls + edit + expand */}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  className="w-7 h-7 flex items-center justify-center rounded-md border border-border hover:bg-accent text-muted-foreground transition-colors"
                                  onClick={() => handleQtyChange(item.id, -1)}
                                  disabled={!si}
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>

                                <span className={`w-10 text-center text-sm font-bold tabular-nums ${getQtyColor(si)}`}>
                                  {si?.qtyOnHand ?? '—'}
                                </span>

                                <button
                                  className="w-7 h-7 flex items-center justify-center rounded-md border border-border hover:bg-accent text-muted-foreground transition-colors"
                                  onClick={() => handleQtyChange(item.id, 1)}
                                  disabled={!si}
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-7 h-7 p-0"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setEditItem(item);
                                    setEditOpen(true);
                                  }}
                                  aria-label="Edit item"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>

                                {batches.length > 0 && (
                                  <button
                                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground transition-colors"
                                    onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                                    aria-label={isExpanded ? 'Collapse batches' : 'Expand batches'}
                                  >
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                                    />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* ── Batch Detail ──────────────────────────────── */}
                            {isExpanded && batches.length > 0 && (
                              <div className="px-4 pb-3 bg-muted/30">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-foreground">
                                      <th className="text-left py-1.5 font-medium pr-4">Lot / Label</th>
                                      <th className="text-left py-1.5 font-medium pr-4">Qty</th>
                                      <th className="text-left py-1.5 font-medium pr-4">Received</th>
                                      <th className="text-left py-1.5 font-medium pr-4">Expires</th>
                                      <th className="text-left py-1.5 font-medium" />
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {batches.map(batch => {
                                      const status = getBatchStatus(batch.expirationDate);
                                      const expColor =
                                        status === 'expired'
                                          ? 'text-red-400'
                                          : status === 'expiring-soon'
                                          ? 'text-amber-400'
                                          : 'text-muted-foreground';

                                      return (
                                        <tr key={batch.id}>
                                          <td className="py-2 pr-4 font-mono text-foreground">
                                            {batch.batchLabel ?? batch.id.slice(-6)}
                                          </td>
                                          <td className="py-2 pr-4 text-foreground">{batch.quantity}</td>
                                          <td className="py-2 pr-4 text-muted-foreground">
                                            {formatDateShort(batch.receivedDate)}
                                          </td>
                                          <td className={`py-2 pr-4 ${expColor}`}>
                                            {batch.expirationDate
                                              ? formatDateShort(batch.expirationDate)
                                              : '—'}
                                            {status === 'expired' && (
                                              <span className="ml-1 text-[10px] font-bold uppercase text-red-400">
                                                EXPIRED
                                              </span>
                                            )}
                                            {status === 'expiring-soon' && (
                                              <span className="ml-1 text-[10px] font-bold uppercase text-amber-400">
                                                SOON
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2">
                                            {status === 'expired' && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 gap-1"
                                                onClick={() => handleDisposeBatch(batch)}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                                Dispose
                                              </Button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <BulkAdjustModal open={bulkAdjustOpen} onOpenChange={setBulkAdjustOpen} />
      <ReceiveStockModal open={receiveOpen} onOpenChange={setReceiveOpen} />
      <ShoppingListModal open={shoppingOpen} onOpenChange={setShoppingOpen} />
      <EditItemDialog
        item={editItem}
        open={editOpen || addItemOpen}
        onOpenChange={v => {
          setEditOpen(v);
          setAddItemOpen(v);
          if (!v) setEditItem(null);
        }}
      />
      {/* <ManageLocationsDialog open={locationsOpen} onOpenChange={setLocationsOpen} /> — Task 8 */}
    </div>
  );
}
