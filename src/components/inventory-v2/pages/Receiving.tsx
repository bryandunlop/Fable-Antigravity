import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../ui/collapsible';
import { ScrollArea } from '../../ui/scroll-area';
import { useInventoryV2 } from '../InventoryV2Context';
import { SUPPLY_CATEGORIES, MOCK_USERS } from '../constants';
import { V2Badge } from '../shared/V2Badge';
import { toast } from 'sonner';
import {
  PackagePlus, Search, Plus, Minus, ChevronDown, Check,
  User, Clock, ShoppingCart, X, History, Camera
} from 'lucide-react';
import { BarcodeScannerDialog } from '../shared/BarcodeScannerDialog';

export default function Receiving() {
  const { state, dispatch } = useInventoryV2();

  // ── Who's adding ──
  const [addedBy, setAddedBy] = useState<string>(MOCK_USERS[0]?.name ?? '');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  // ── Staged additions: { itemId → qty to add } ──
  const [staged, setStaged] = useState<Record<string, number>>({});

  // ── View mode ──
  const [showHistory, setShowHistory] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [scannerOpen, setScannerOpen] = useState(false);

  const stockroomItems = useMemo(() =>
    state.stockroomItems.filter(si => si.stockroomId === state.selectedStockroomId),
    [state.stockroomItems, state.selectedStockroomId]
  );

  const getOnHand = (itemId: string) =>
    stockroomItems.find(si => si.itemId === itemId)?.qtyOnHand ?? 0;

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return state.items;
    const q = search.toLowerCase();
    return state.items.filter(i =>
      i.itemName.toLowerCase().includes(q) ||
      i.internalItemNumber?.toLowerCase().includes(q) ||
      i.vendorItemNumber?.toLowerCase().includes(q)
    );
  }, [search, state.items]);

  // Group filtered items by supply category
  const grouped = useMemo(() => {
    const out: Record<string, typeof state.items> = {};
    SUPPLY_CATEGORIES.forEach(cat => {
      const items = filteredItems.filter(i => i.supplyCategory === cat.id);
      if (items.length > 0) out[cat.id] = items;
    });
    return out;
  }, [filteredItems]);

  const stagedCount = Object.values(staged).filter(q => q > 0).length;
  const stagedItems = Object.entries(staged).filter(([, q]) => q > 0);

  const adjustStaged = (itemId: string, delta: number) => {
    setStaged(prev => {
      const current = prev[itemId] ?? 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const setStagedQty = (itemId: string, val: string) => {
    const n = parseInt(val);
    if (isNaN(n) || n < 0) return;
    if (n === 0) {
      setStaged(prev => { const { [itemId]: _, ...rest } = prev; return rest; });
    } else {
      setStaged(prev => ({ ...prev, [itemId]: n }));
    }
  };

  const handleScan = (itemId: string) => {
    const item = state.items.find(i => i.id === itemId);
    if (!item) {
      toast.error('Scanned item not found in inventory');
      setScannerOpen(false);
      return;
    }
    setStaged(prev => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }));
    toast.success(`Added: ${item.itemName}`);
    setScannerOpen(false);
  };

  const handleSubmit = () => {
    if (stagedItems.length === 0) { toast.error('Add at least one item'); return; }
    if (!addedBy.trim()) { toast.error('Select who is adding stock'); return; }

    // Update stockroom quantities
    const updatedItems = stagedItems.map(([itemId, qty]) => {
      const existing = stockroomItems.find(si => si.itemId === itemId);
      if (existing) {
        return { ...existing, qtyOnHand: existing.qtyOnHand + qty };
      }
      // Item not in this stockroom yet — create entry
      return {
        itemId,
        stockroomId: state.selectedStockroomId,
        qtyOnHand: qty,
        parLevel: 0,
        minimumLevel: 0,
        binLocation: '',
      };
    });

    dispatch({ type: 'BULK_UPDATE_STOCKROOM', payload: updatedItems });

    // Log the addition
    dispatch({
      type: 'ADD_STOCK_LOG',
      payload: {
        id: `log-${Date.now()}`,
        stockroomId: state.selectedStockroomId,
        addedBy,
        timestamp: new Date().toISOString(),
        items: stagedItems.map(([itemId, qtyAdded]) => ({ itemId, qtyAdded })),
        notes: notes.trim() || undefined,
      },
    });

    toast.success(`Stock updated — ${stagedItems.length} item${stagedItems.length > 1 ? 's' : ''} added`);
    setStaged({});
    setNotes('');
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const stockroomLog = state.stockLog.filter(l => l.stockroomId === state.selectedStockroomId);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <PackagePlus className="w-6 h-6 text-purple-500" />
          <h1 className="text-2xl font-bold">Add to Stock</h1>
          <V2Badge />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScannerOpen(true)}
            className="gap-1.5"
          >
            <Camera className="w-4 h-4" />
            Scan Item
          </Button>
          <Button
            variant={showHistory ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowHistory(h => !h)}
            className={showHistory ? 'bg-purple-500 hover:bg-purple-600 text-white' : ''}
          >
            <History className="w-4 h-4 mr-1" /> History {stockroomLog.length > 0 && `(${stockroomLog.length})`}
          </Button>
        </div>
      </div>

      {/* History view */}
      {showHistory && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              Recent Stock Additions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {stockroomLog.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No additions recorded yet</p>
                )}
                {stockroomLog.map(entry => (
                  <div key={entry.id} className="p-3 rounded-lg border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">{entry.addedBy}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTime(entry.timestamp)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.items.map(({ itemId, qtyAdded }) => {
                        const item = state.items.find(i => i.id === itemId);
                        return (
                          <Badge key={itemId} variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                            +{qtyAdded} {item?.itemName ?? itemId}
                          </Badge>
                        );
                      })}
                    </div>
                    {entry.notes && <p className="text-xs text-muted-foreground italic">{entry.notes}</p>}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* Left — browse items */}
        <div className="space-y-4">
          {/* Stockroom + search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select
                  value={state.selectedStockroomId}
                  onValueChange={(v: string) => dispatch({ type: 'SET_SELECTED_STOCKROOM', payload: v })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.stockrooms.map(sr => (
                      <SelectItem key={sr.id} value={sr.id}>{sr.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items by category */}
          <div className="space-y-2">
            {SUPPLY_CATEGORIES.filter(cat => grouped[cat.id]).map(cat => {
              const catItems = grouped[cat.id];
              const isOpen = openSections[cat.id] ?? true;
              const catStaged = catItems.filter(i => (staged[i.id] ?? 0) > 0).length;

              return (
                <Collapsible
                  key={cat.id}
                  open={isOpen}
                  onOpenChange={(open: boolean) => setOpenSections(prev => ({ ...prev, [cat.id]: open }))}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{cat.label}</span>
                          <span className="text-xs text-muted-foreground">({catItems.length})</span>
                          {catStaged > 0 && (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                              {catStaged} staged
                            </Badge>
                          )}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t">
                        {catItems.map(item => {
                          const onHand = getOnHand(item.id);
                          const adding = staged[item.id] ?? 0;
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 ${adding > 0 ? 'bg-emerald-500/5' : 'hover:bg-muted/20'} transition-colors`}
                            >
                              {/* Item info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.itemName}</p>
                                <p className="text-xs text-muted-foreground">
                                  On hand: <span className="font-medium text-foreground">{onHand}</span>
                                  {item.internalItemNumber && ` · ${item.internalItemNumber}`}
                                </p>
                              </div>

                              {/* Qty controls */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => adjustStaged(item.id, -1)}
                                  disabled={adding === 0}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min={0}
                                  value={adding === 0 ? '' : adding}
                                  placeholder="0"
                                  onChange={e => setStagedQty(item.id, e.target.value)}
                                  className="h-7 w-14 text-center text-sm"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => adjustStaged(item.id, 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>

                              {adding > 0 && (
                                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shrink-0 text-xs">
                                  → {onHand + adding}
                                </Badge>
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
            {Object.keys(grouped).length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  No items match your search
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right — cart + submit */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card className={stagedCount > 0 ? 'border-emerald-500/30' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                Adding to Stock
                {stagedCount > 0 && (
                  <Badge className="ml-auto bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    {stagedCount} item{stagedCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {/* Staged list */}
              {stagedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Use the +/− controls to stage items
                </p>
              ) : (
                <div className="space-y-1.5">
                  {stagedItems.map(([itemId, qty]) => {
                    const item = state.items.find(i => i.id === itemId);
                    return (
                      <div key={itemId} className="flex items-center justify-between text-sm">
                        <span className="truncate text-foreground">{item?.itemName ?? itemId}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">+{qty}</Badge>
                          <button
                            onClick={() => setStaged(p => { const { [itemId]: _, ...r } = p; return r; })}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Who's adding */}
              <div className="space-y-1.5">
                <Label className="text-xs">Added by</Label>
                <Select value={addedBy} onValueChange={(v: string) => setAddedBy(v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select person..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_USERS.map(u => (
                      <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs">Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Weekly Sysco delivery"
                  className="h-8 text-sm"
                />
              </div>

              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={handleSubmit}
                disabled={stagedCount === 0}
              >
                <Check className="w-4 h-4 mr-1" />
                Confirm {stagedCount > 0 ? `(${stagedCount} item${stagedCount > 1 ? 's' : ''})` : ''}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onItemScanned={handleScan}
      />
    </div>
  );
}
