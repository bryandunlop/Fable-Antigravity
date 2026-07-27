import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { ChevronUp, ChevronDown, Plus, Trash2, Search } from 'lucide-react';
import { useInventoryV2 } from '../InventoryV2Context';
import { toast } from 'sonner';

interface ManageQuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageQuickAddDialog({ open, onOpenChange }: ManageQuickAddDialogProps) {
  const { state, dispatch } = useInventoryV2();
  const [working, setWorking] = useState<string[]>(state.quickAddItemIds);
  const [search, setSearch] = useState('');

  // Reset the working copy whenever the dialog (re)opens.
  useEffect(() => {
    if (open) {
      setWorking(state.quickAddItemIds);
      setSearch('');
    }
  }, [open, state.quickAddItemIds]);

  // Currently-selected quick-add items, in stored order.
  const selected = useMemo(
    () => working
      .map(id => state.items.find(i => i.id === id))
      .filter((i): i is NonNullable<typeof i> => Boolean(i)),
    [working, state.items]
  );

  // Catalog items not yet in the list, filtered by the search box.
  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.items
      .filter(i => !working.includes(i.id))
      .filter(i => i.isConsumable !== false)
      .filter(i =>
        !q ||
        i.itemName.toLowerCase().includes(q) ||
        (i.category ?? '').toLowerCase().includes(q)
      )
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [state.items, working, search]);

  const add = (id: string) => setWorking(w => [...w, id]);
  const remove = (id: string) => setWorking(w => w.filter(x => x !== id));
  const move = (id: string, dir: -1 | 1) =>
    setWorking(w => {
      const idx = w.indexOf(id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= w.length) return w;
      const copy = [...w];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });

  const save = () => {
    dispatch({ type: 'SET_QUICK_ADD_ITEMS', payload: working });
    toast.success('Quick Add list updated');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Quick Add</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            These items appear in the Quick Tap grid on every trip. Reorder, remove,
            or add more from the catalog below.
          </DialogDescription>
        </DialogHeader>

        {/* Selected items, in display order */}
        <div className="space-y-1 py-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            In Quick Add ({selected.length})
          </div>
          {selected.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No quick-add items</p>
          )}
          {selected.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex flex-col">
                <button
                  onClick={() => move(item.id, -1)}
                  disabled={idx === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => move(item.id, 1)}
                  disabled={idx === selected.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">{item.itemName}</span>
                {item.category && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground border-border shrink-0">
                    {item.category}
                  </Badge>
                )}
              </div>
              <button
                onClick={() => remove(item.id)}
                className="text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add from catalog */}
        <div className="border-t border-border/40 pt-3 flex-1 min-h-0 flex flex-col">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Add Items
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search catalog..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-[120px]">
            {available.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No matching items</p>
            )}
            {available.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm text-foreground truncate">{item.itemName}</span>
                  {item.category && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border shrink-0">
                      {item.category}
                    </Badge>
                  )}
                </div>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => add(item.id)}>
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
