import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { useInventoryV2 } from '../InventoryV2Context';
import { Search, Package } from 'lucide-react';
import { toast } from 'sonner';

interface BulkAdjustModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BulkAdjustModal({ open, onOpenChange }: BulkAdjustModalProps) {
  const { state, dispatch } = useInventoryV2();
  const [search, setSearch] = useState('');
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  const stockroomItems = state.stockroomItems.filter(
    si => si.stockroomId === state.selectedStockroomId
  );

  const filteredItems = useMemo(() => {
    if (!search.trim()) return state.items.slice(0, 20);
    const q = search.toLowerCase();
    return state.items.filter(
      item =>
        item.itemName.toLowerCase().includes(q) ||
        item.internalItemNumber?.toLowerCase().includes(q) ||
        item.vendorItemNumber?.toLowerCase().includes(q)
    );
  }, [search, state.items]);

  const getStockroomQty = (itemId: string) => {
    const si = stockroomItems.find(s => s.itemId === itemId);
    return si?.qtyOnHand ?? 0;
  };

  const handleApply = () => {
    const updates = Object.entries(adjustments)
      .filter(([_, qty]) => !isNaN(qty))
      .map(([itemId, qty]) => {
        const existing = stockroomItems.find(s => s.itemId === itemId);
        if (!existing) return null;
        return { ...existing, qtyOnHand: qty };
      })
      .filter(Boolean) as typeof stockroomItems;

    if (updates.length > 0) {
      dispatch({ type: 'BULK_UPDATE_STOCKROOM', payload: updates });
      toast.success(`Updated ${updates.length} item(s)`);
    }
    setAdjustments({});
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Bulk Adjust Quantities
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items by name or number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 max-h-[400px]">
          {filteredItems.map(item => {
            const currentQty = getStockroomQty(item.id);
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.itemName}</p>
                  <p className="text-xs text-muted-foreground">{item.internalItemNumber}</p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  Current: {currentQty}
                </Badge>
                <Input
                  type="number"
                  min={0}
                  placeholder={String(currentQty)}
                  value={adjustments[item.id] ?? ''}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setAdjustments(prev => ({
                      ...prev,
                      [item.id]: isNaN(val) ? currentQty : val,
                    }));
                  }}
                  className="w-20"
                />
              </div>
            );
          })}
          {filteredItems.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No items found</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            className="btn-aviation-primary"
            disabled={Object.keys(adjustments).length === 0}
          >
            Apply Changes ({Object.keys(adjustments).length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
