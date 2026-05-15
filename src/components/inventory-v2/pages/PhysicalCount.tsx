import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../ui/alert-dialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../ui/collapsible';
import { useInventoryV2 } from '../InventoryV2Context';
import { SUPPLY_CATEGORIES } from '../constants';
import { V2Badge } from '../shared/V2Badge';
import { toast } from 'sonner';
import { ClipboardList, ChevronDown, Check, AlertTriangle } from 'lucide-react';

export default function PhysicalCount() {
  const navigate = useNavigate();
  const { state, dispatch } = useInventoryV2();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const stockroomItems = useMemo(() =>
    state.stockroomItems.filter(si => si.stockroomId === state.selectedStockroomId),
    [state.stockroomItems, state.selectedStockroomId]
  );

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof state.items> = {};
    SUPPLY_CATEGORIES.forEach(cat => {
      const catItems = state.items.filter(i => i.supplyCategory === cat.id);
      if (catItems.length > 0) groups[cat.id] = catItems;
    });
    return groups;
  }, [state.items]);

  const toggleSection = (catId: string) => {
    setOpenSections(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleComplete = () => {
    const updates = Object.entries(counts)
      .filter(([_, val]) => val !== '' && !isNaN(parseInt(val)))
      .map(([itemId, val]) => {
        const existing = stockroomItems.find(si => si.itemId === itemId);
        if (!existing) return null;
        return { ...existing, qtyOnHand: parseInt(val) };
      })
      .filter(Boolean) as typeof stockroomItems;

    if (updates.length > 0) {
      dispatch({ type: 'BULK_UPDATE_STOCKROOM', payload: updates });
    }
    toast.success(`Physical count complete. Updated ${updates.length} item(s).`);
    navigate('/inventory-v2/stockroom');
  };

  const filledCount = Object.values(counts).filter(v => v !== '').length;
  const totalItems = state.items.length;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-purple-500" />
          <h1 className="text-2xl font-bold">Physical Count</h1>
          <V2Badge />
        </div>
        <Badge variant="outline" className="text-sm">
          {filledCount} / {totalItems} counted
        </Badge>
      </div>

      {/* Info banner */}
      <Card className="border-purple-500/30 bg-purple-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">Fresh Count Mode</p>
            <p className="text-sm text-muted-foreground">
              Enter the quantities you physically count on the shelf. No pre-filled values are shown.
              When complete, this will overwrite current stockroom quantities.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Category Sections */}
      <div className="space-y-3">
        {SUPPLY_CATEGORIES.map(cat => {
          const catItems = groupedByCategory[cat.id];
          if (!catItems || catItems.length === 0) return null;
          const isOpen = openSections[cat.id] !== false;

          return (
            <Collapsible key={cat.id} open={isOpen} onOpenChange={() => toggleSection(cat.id)}>
              <div id={`pc-section-${cat.id}`}>
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
                        document.getElementById(`pc-section-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Top ▲
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1 space-y-0.5">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_80px_100px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50 rounded">
                      <span>Item</span>
                      <span>Bin</span>
                      <span className="text-center">Count</span>
                    </div>
                    {catItems.map(item => {
                      const si = stockroomItems.find(s => s.itemId === item.id);
                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-[1fr_80px_100px] gap-2 px-4 py-2 rounded items-center text-sm hover:bg-muted/30"
                        >
                          <div>
                            <span className="font-medium">{item.itemName}</span>
                            <span className="text-xs text-muted-foreground ml-2">{item.uom}</span>
                          </div>
                          <span className="text-muted-foreground text-xs">{si?.binLocation ?? '—'}</span>
                          <Input
                            type="number"
                            min={0}
                            placeholder="—"
                            value={counts[item.id] ?? ''}
                            onChange={e => setCounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="h-8 text-center"
                          />
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

      {/* Footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t pt-4 pb-2 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filledCount} items counted</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="bg-purple-500 hover:bg-purple-600 text-white" disabled={filledCount === 0}>
              <Check className="w-4 h-4 mr-1" /> COMPLETE
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Complete Physical Count?</AlertDialogTitle>
              <AlertDialogDescription>
                This will overwrite all stockroom quantities with your physical count values.
                {filledCount < totalItems && (
                  <span className="block mt-2 text-amber-500">
                    Warning: Only {filledCount} of {totalItems} items have been counted. Uncounted items will remain unchanged.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleComplete} className="bg-purple-500 hover:bg-purple-600">
                Confirm & Update
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
