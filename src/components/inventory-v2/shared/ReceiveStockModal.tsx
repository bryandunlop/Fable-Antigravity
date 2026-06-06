import React, { useState, useMemo } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../ui/collapsible';
import { ScrollArea } from '../../ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { useInventoryV2 } from '../InventoryV2Context';
import { SUPPLY_CATEGORIES, MOCK_USERS } from '../constants';
import { toast } from 'sonner';
import {
  PackagePlus, Search, Plus, Minus, ChevronDown, Check,
  User, Clock, ShoppingCart, X, Camera
} from 'lucide-react';
import { BarcodeScannerDialog } from './BarcodeScannerDialog';

interface StagedItem {
  qty: number;
  expirationDate?: string;
  batchLabel?: string;
}

interface ReceiveStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReceiveStockModal({ open, onOpenChange }: ReceiveStockModalProps) {
  const { state, dispatch } = useInventoryV2();

  // ── Who's adding ──
  const [addedBy, setAddedBy] = useState<string>(MOCK_USERS[0]?.name ?? '');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  // ── Staged additions: { itemId → StagedItem } ──
  const [staged, setStaged] = useState<Record<string, StagedItem>>({});

  // ── View mode ──
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [scannerOpen, setScannerOpen] = useState(false);

  const stockroomItems = useMemo(() =>
    state.stockroomItems.filter(si => si.stockroomId === 'sr-1'),
    [state.stockroomItems]
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

  const stagedCount = Object.values(staged).filter(s => s.qty > 0).length;
  const stagedItems = Object.entries(staged).filter(([, s]) => s.qty > 0);

  const adjustStaged = (itemId: string, delta: number) => {
    setStaged(prev => {
      const current = prev[itemId]?.qty ?? 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: { ...prev[itemId], qty: next } };
    });
  };

  const setStagedQty = (itemId: string, val: string) => {
    const n = parseInt(val);
    if (isNaN(n) || n < 0) return;
    if (n === 0) {
      setStaged(prev => { const { [itemId]: _, ...rest } = prev; return rest; });
    } else {
      setStaged(prev => ({ ...prev, [itemId]: { ...prev[itemId], qty: n } }));
    }
  };

  const handleScan = (itemId: string) => {
    const item = state.items.find(i => i.id === itemId);
    if (!item) {
      toast.error('Scanned item not found in inventory');
      setScannerOpen(false);
      return;
    }
    setStaged(prev => ({ ...prev, [itemId]: { ...prev[itemId], qty: (prev[itemId]?.qty ?? 0) + 1 } }));
    toast.success(`Added: ${item.itemName}`);
    setScannerOpen(false);
  };

  const handleSubmit = () => {
    if (stagedItems.length === 0) { toast.error('Add at least one item'); return; }
    if (!addedBy.trim()) { toast.error('Select who is adding stock'); return; }

    // Update stockroom quantities
    const updatedItems = stagedItems.map(([itemId, info]) => {
      const existing = stockroomItems.find(si => si.itemId === itemId);
      if (existing) {
        return { ...existing, qtyOnHand: existing.qtyOnHand + info.qty };
      }
      // Item not in this stockroom yet — create entry
      return {
        itemId,
        stockroomId: 'sr-1',
        qtyOnHand: info.qty,
        parLevel: 0,
        minimumLevel: 0,
        binLocation: '',
      };
    });

    dispatch({ type: 'BULK_UPDATE_STOCKROOM', payload: updatedItems });

    // Log the addition
    dispatch({
      type: 'ADD_ACTIVITY_LOG',
      payload: {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        timestamp: new Date().toISOString(),
        userId: state.currentUser.id,
        userName: addedBy,
        action: 'stock_added',
        module: 'stockroom',
        description: `Added stock: ${stagedItems.length} item type(s)${notes.trim() ? ` — ${notes.trim()}` : ''}`,
        metadata: Object.fromEntries(stagedItems.map(([itemId, info]) => [itemId, info.qty])),
      },
    });

    // Create stock batches for each staged item
    Object.entries(staged).forEach(([itemId, info]) => {
      if (info.qty > 0) {
        dispatch({
          type: 'ADD_STOCK_BATCH',
          payload: {
            id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            itemId,
            stockroomId: 'sr-1',
            quantity: info.qty,
            expirationDate: info.expirationDate,
            receivedDate: new Date().toISOString(),
            batchLabel: info.batchLabel || `LOT-${itemId.slice(-4)}-${new Date().toISOString().split('T')[0]}`,
          },
        });
      }
    });

    toast.success(`Stock updated — ${stagedItems.length} item${stagedItems.length > 1 ? 's' : ''} added`);
    setStaged({});
    setNotes('');
    onOpenChange(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-primary" /> Receive Stock
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] h-full">

              {/* ── Left: search + category-grouped item list ── */}
              <ScrollArea className="h-[calc(85vh-120px)] border-r border-border/40">
                <div className="p-4 space-y-3">

                  {/* Scan + Search row */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search items..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setScannerOpen(true)}
                      className="gap-1.5 shrink-0"
                    >
                      <Camera className="w-4 h-4" />
                      Scan
                    </Button>
                  </div>

                  {/* Items by category */}
                  <div className="space-y-2">
                    {SUPPLY_CATEGORIES.filter(cat => grouped[cat.id]).map(cat => {
                      const catItems = grouped[cat.id];
                      const isOpen = openSections[cat.id] ?? true;
                      const catStaged = catItems.filter(i => (staged[i.id]?.qty ?? 0) > 0).length;

                      return (
                        <Collapsible
                          key={cat.id}
                          open={isOpen}
                          onOpenChange={(open: boolean) => setOpenSections(prev => ({ ...prev, [cat.id]: open }))}
                        >
                          <div className="rounded-lg border border-border overflow-hidden">
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors bg-card">
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
                              <div className="border-t border-border">
                                {catItems.map(item => {
                                  const onHand = getOnHand(item.id);
                                  const adding = staged[item.id]?.qty ?? 0;
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
                                        {staged[item.id] && staged[item.id].qty > 0 && (
                                          <div className="flex gap-2 mt-1">
                                            <Input
                                              type="date"
                                              placeholder="Expiration"
                                              className="h-7 text-xs w-32"
                                              value={staged[item.id]?.expirationDate ?? ''}
                                              onChange={e => setStaged(prev => ({
                                                ...prev,
                                                [item.id]: { ...prev[item.id], expirationDate: e.target.value || undefined }
                                              }))}
                                            />
                                            <Input
                                              placeholder="Lot label"
                                              className="h-7 text-xs w-28"
                                              value={staged[item.id]?.batchLabel ?? ''}
                                              onChange={e => setStaged(prev => ({
                                                ...prev,
                                                [item.id]: { ...prev[item.id], batchLabel: e.target.value || undefined }
                                              }))}
                                            />
                                          </div>
                                        )}
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
                                          {onHand + adding}
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                    {Object.keys(grouped).length === 0 && (
                      <div className="border border-dashed rounded-lg">
                        <div className="py-10 text-center text-muted-foreground text-sm">
                          No items match your search
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* ── Right: cart + submit ── */}
              <div className="p-4 flex flex-col gap-4 overflow-y-auto">

                {/* Cart header */}
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold">Adding to Stock</span>
                  {stagedCount > 0 && (
                    <Badge className="ml-auto bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
                      {stagedCount} item{stagedCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {/* Staged list */}
                {stagedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Use the +/− controls to stage items
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {stagedItems.map(([itemId, info]) => {
                      const item = state.items.find(i => i.id === itemId);
                      return (
                        <div key={itemId} className="flex items-center justify-between text-sm">
                          <span className="truncate text-foreground">{item?.itemName ?? itemId}</span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">+{info.qty}</Badge>
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
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white mt-auto"
                  onClick={handleSubmit}
                  disabled={stagedCount === 0}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Confirm {stagedCount > 0 ? `(${stagedCount} item${stagedCount > 1 ? 's' : ''})` : ''}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onItemScanned={handleScan}
      />
    </>
  );
}
