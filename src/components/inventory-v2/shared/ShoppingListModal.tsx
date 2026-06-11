// ─── Shopping List Modal ──────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ExternalLink, ClipboardCopy, ShoppingCart } from 'lucide-react';
import { useInventoryV2 } from '../InventoryV2Context';
import { toast } from 'sonner';

interface ShoppingListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShoppingListModal({ open, onOpenChange }: ShoppingListModalProps) {
  const { state } = useInventoryV2();

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
      lines.push(`=== ${vendor} ===`);
      items.forEach(item => {
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
        </DialogHeader>

        {shoppingItems.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            All items are at or above par level
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 py-2">
              {groups.map(([vendor, items]) => {
                const vendorSubtotal = items.reduce(
                  (sum, item) => sum + item.qtyToOrder * (item.costPerUnit ?? 0),
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
                          est. ${vendorSubtotal.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground">{item.itemName}</span>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Have {item.qtyOnHand} · Par {item.parLevel} · {item.uom}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <Badge className="bg-amber-500/15 text-amber-400 border-0 text-xs">
                              Order {item.qtyToOrder}
                              {item.costPerUnit !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  {' '}· est. ${(item.qtyToOrder * item.costPerUnit).toFixed(2)}
                                </span>
                              )}
                            </Badge>
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
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {(() => {
              const grandTotal = groups.reduce(
                (sum, [, items]) =>
                  sum + items.reduce((s, item) => s + item.qtyToOrder * (item.costPerUnit ?? 0), 0),
                0,
              );
              return grandTotal > 0 ? (
                <div className="flex items-center justify-between px-1 pt-3 pb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Estimated total
                  </span>
                  <span className="text-sm font-medium text-foreground">${grandTotal.toFixed(2)}</span>
                </div>
              ) : null;
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
