// ─── Shopping List Modal ──────────────────────────────────────────────────────
import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { ExternalLink, ClipboardCopy, ShoppingCart } from 'lucide-react';
import { useInventoryV2 } from '../InventoryV2Context';
import { formatCurrency } from '../commissaryUtils';
import { toast } from 'sonner';

interface ShoppingListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Map of itemId → ISO date the item was marked as ordered.
type OrderedMap = Record<string, string>;
const ORDERED_STORAGE_KEY = 'inv-v2-ordered-items';

// NOTE: "ordered" state is persisted per-device in localStorage, not in shared
// state. At the current team size (~7 users, single stockroom) this is a
// deliberate, accepted trade-off — no cross-device sync needed.
function readOrdered(): OrderedMap {
  try {
    const raw = localStorage.getItem(ORDERED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as OrderedMap) : {};
  } catch {
    return {};
  }
}

function writeOrdered(map: OrderedMap): void {
  try {
    localStorage.setItem(ORDERED_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* localStorage unavailable — non-fatal */
  }
}

const formatOrderedDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function ShoppingListModal({ open, onOpenChange }: ShoppingListModalProps) {
  const { state } = useInventoryV2();

  const [ordered, setOrdered] = useState<OrderedMap>(() => readOrdered());

  const stockroomItems = useMemo(
    () => state.stockroomItems.filter(si => si.stockroomId === 'sr-1'),
    [state.stockroomItems],
  );

  // Items below par
  const shoppingItems = useMemo(() => {
    return state.items
      .map(item => {
        const si = stockroomItems.find(s => s.itemId === item.id);
        if (!si || si.qtyOnHand >= si.parLevel) return null;
        return {
          ...item,
          qtyOnHand: si.qtyOnHand,
          parLevel: si.parLevel,
          qtyToOrder: si.parLevel - si.qtyOnHand,
        };
      })
      .filter(Boolean) as Array<typeof state.items[0] & { qtyOnHand: number; parLevel: number; qtyToOrder: number }>;
  }, [state.items, stockroomItems]);

  // On (re)compute: auto-clear "ordered" flags for items now back at/above par.
  // Those items have dropped out of shoppingItems, so any ordered entry not in
  // the current below-par set is stale (stock physically arrived).
  useEffect(() => {
    if (!open) return;
    setOrdered(prev => {
      const belowPar = new Set(shoppingItems.map(i => i.id));
      const next: OrderedMap = {};
      for (const [id, date] of Object.entries(prev)) {
        if (belowPar.has(id)) next[id] = date;
      }
      if (Object.keys(next).length !== Object.keys(prev).length) {
        writeOrdered(next);
        return next;
      }
      return prev;
    });
  }, [open, shoppingItems]);

  const toggleOrdered = (itemId: string) => {
    setOrdered(prev => {
      const next = { ...prev };
      if (next[itemId]) {
        delete next[itemId];
      } else {
        next[itemId] = new Date().toISOString();
      }
      writeOrdered(next);
      return next;
    });
  };

  // Group by vendor (items without vendor go in 'Other')
  const groups = useMemo(() => {
    const map: Record<string, typeof shoppingItems> = {};
    shoppingItems.forEach(item => {
      const vendor = item.vendor ?? 'Other';
      if (!map[vendor]) map[vendor] = [];
      map[vendor].push(item);
    });
    // Sort vendors: Amazon, Kroger, Instacart first, then alphabetical, Other last
    const priority = ['Amazon', 'Kroger', 'Instacart'];
    return Object.entries(map).sort(([a], [b]) => {
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [shoppingItems]);

  const handleCopyToClipboard = () => {
    const lines: string[] = [];
    groups.forEach(([vendor, items]) => {
      // Skip already-ordered items — the copied list is what's still to buy.
      const toOrder = items.filter(item => !ordered[item.id]);
      if (toOrder.length === 0) return;
      lines.push(`=== ${vendor} ===`);
      toOrder.forEach(item => {
        lines.push(
          `  ${item.itemName} — Order ${item.qtyToOrder} ${item.uom} (have ${item.qtyOnHand}, par ${item.parLevel})`,
        );
      });
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      toast.success('Shopping list copied to clipboard');
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            Shopping List
            <Badge className="ml-2 bg-amber-500/15 text-amber-400 border-0">
              {shoppingItems.length} items
            </Badge>
          </DialogTitle>
          <DialogDescription>Everything currently below par, grouped by vendor.</DialogDescription>
        </DialogHeader>

        {shoppingItems.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            All items are at or above par level
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 py-2">
              {groups.map(([vendor, items]) => {
                // Subtotal excludes items already ordered (they're on the way).
                const vendorSubtotal = items.reduce(
                  (sum, item) =>
                    ordered[item.id] ? sum : sum + item.qtyToOrder * (item.costPerUnit ?? 0),
                  0,
                );
                return (
                  <div key={vendor}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {vendor}
                      </span>
                      {vendorSubtotal > 0 && (
                        <span className="text-xs text-muted-foreground">
                          est. {formatCurrency(vendorSubtotal)}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {items.map(item => {
                        const isOrdered = Boolean(ordered[item.id]);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 transition-colors ${
                              isOrdered ? 'opacity-50' : 'hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <Checkbox
                                checked={isOrdered}
                                onCheckedChange={() => toggleOrdered(item.id)}
                                aria-label={`Mark ${item.itemName} as ordered`}
                                className="shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-foreground">{item.itemName}</span>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {isOrdered
                                    ? `ordered ${formatOrderedDate(ordered[item.id])}`
                                    : `Have ${item.qtyOnHand} · Par ${item.parLevel} · ${item.uom}`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <Badge className="bg-amber-500/15 text-amber-400 border-0 text-xs">
                                Order {item.qtyToOrder}
                              </Badge>
                              {item.costPerUnit !== undefined ? (
                                <span className="text-xs text-muted-foreground">
                                  est. {formatCurrency(item.qtyToOrder * item.costPerUnit)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">no cost set</span>
                              )}
                              {item.reorderUrl && (
                                <a
                                  href={item.reorderUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {(() => {
              // Grand total excludes ordered lines (already on the way).
              const grandTotal = groups.reduce(
                (sum, [, items]) =>
                  sum +
                  items.reduce(
                    (s, item) =>
                      ordered[item.id] ? s : s + item.qtyToOrder * (item.costPerUnit ?? 0),
                    0,
                  ),
                0,
              );
              // Count still-outstanding lines that carry no cost, so the total
              // can honestly disclose what it leaves out.
              const unpricedCount = shoppingItems.filter(
                item => !ordered[item.id] && item.costPerUnit === undefined,
              ).length;
              if (grandTotal <= 0 && unpricedCount === 0) return null;
              return (
                <div className="flex items-center justify-between px-1 pt-3 pb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Estimated total
                  </span>
                  <div className="text-right">
                    {grandTotal > 0 && (
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrency(grandTotal)}
                      </span>
                    )}
                    {unpricedCount > 0 && (
                      <div className="text-[11px] text-muted-foreground">
                        excludes {unpricedCount} unpriced item{unpricedCount > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            <div className="pt-4 border-t border-border/40">
              <Button variant="outline" className="w-full gap-2" onClick={handleCopyToClipboard}>
                <ClipboardCopy className="w-4 h-4" /> Copy to Clipboard
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
