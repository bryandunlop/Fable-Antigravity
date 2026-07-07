// src/components/inventory-v2/pages/CommissaryLocation.tsx
// Photo grid of one storage location's items, with fast inline qty steppers.
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckSquare, Pencil, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { GfoPageHeader } from '../../gfo/GfoPageHeader';
import { Button } from '../../ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../ui/select';
import { useInventoryV2 } from '../InventoryV2Context';
import { buildCommissaryItems, COMMISSARY_STOCKROOM_ID, type CommissaryItem } from '../commissaryUtils';
import ItemCard from '../shared/ItemCard';
import LocationEditorDialog from '../shared/LocationEditorDialog';
import NewItemDialog from '../shared/NewItemDialog';
import type { StockBatch } from '../types';

export default function CommissaryLocation() {
  const { locationId } = useParams<{ locationId: string }>();
  const { state, dispatch } = useInventoryV2();
  const navigate = useNavigate();
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveTarget, setMoveTarget] = useState<string>('none'); // 'none' = Unassigned

  const isUnassigned = locationId === 'unassigned';
  const location = state.storageLocations.find((l) => l.id === locationId);

  const items = useMemo(() => {
    const liveLocationIds = new Set(state.storageLocations.map((l) => l.id));
    return buildCommissaryItems(state)
      .filter((ci) => {
        const locId = ci.stockroom?.locationId;
        // Orphaned locationIds (location deleted out-of-band) count as unassigned — matches CommissaryHome.
        const effective = locId && liveLocationIds.has(locId) ? locId : undefined;
        return isUnassigned ? effective === undefined : effective === locationId;
      })
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [state, locationId, isUnassigned]);

  const batchesByItem = useMemo(() => {
    const m = new Map<string, StockBatch[]>();
    for (const b of state.stockBatches) {
      if (b.stockroomId !== COMMISSARY_STOCKROOM_ID) continue;
      const arr = m.get(b.itemId) ?? [];
      arr.push(b);
      m.set(b.itemId, arr);
    }
    return m;
  }, [state.stockBatches]);

  const changeQty = (ci: CommissaryItem, newQty: number) => {
    if (!ci.stockroom) return;
    dispatch({ type: 'UPDATE_STOCKROOM_ITEM', payload: { ...ci.stockroom, qtyOnHand: newQty } });
  };

  const sortedLocations = useMemo(
    () => [...state.storageLocations].sort((a, b) => a.sortOrder - b.sortOrder),
    [state.storageLocations],
  );

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setMoveTarget('none');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const moveSelected = () => {
    // Mirror CommissaryItemDetail's saveEdit: send the full stockroom item with the new
    // locationId so nothing else gets nulled. 'none' → undefined (Unassigned).
    const newLocationId = moveTarget === 'none' ? undefined : moveTarget;
    const selected = items.filter((ci) => selectedIds.has(ci.id) && ci.stockroom);
    for (const ci of selected) {
      dispatch({
        type: 'UPDATE_STOCKROOM_ITEM',
        payload: { ...ci.stockroom!, locationId: newLocationId },
      });
    }
    const destName = newLocationId
      ? state.storageLocations.find((l) => l.id === newLocationId)?.name ?? 'location'
      : 'Unassigned';
    toast.success(`${selected.length} ${selected.length === 1 ? 'item' : 'items'} moved to ${destName}`);
    exitSelectMode();
  };

  if (!location && !isUnassigned) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Location not found.</p>
        <Button variant="outline" onClick={() => navigate('/inventory-v2/commissary')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to commissary
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/inventory-v2/commissary')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />Commissary
      </button>

      <GfoPageHeader
        title={isUnassigned ? 'Unassigned' : location!.name}
        description={`${items.length} ${items.length === 1 ? 'item' : 'items'}`}
        actions={
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              selectMode ? (
                <Button variant="outline" onClick={exitSelectMode}>
                  <X className="mr-2 h-4 w-4" />Cancel
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setSelectMode(true)}>
                  <CheckSquare className="mr-2 h-4 w-4" />Select
                </Button>
              )
            )}
            {!isUnassigned && (
              <Button variant="outline" onClick={() => setEditorOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />Edit location
              </Button>
            )}
            <Button onClick={() => setNewItemOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Add item here
            </Button>
          </div>
        }
      />

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          <p>No items in this location yet.</p>
          <Button className="mt-4" variant="outline" onClick={() => setNewItemOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Add the first item
          </Button>
        </div>
      ) : (
        <div
          className={`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${
            selectedIds.size > 0 ? 'pb-24' : ''
          }`}
        >
          {items.map((ci) => (
            <ItemCard
              key={ci.id}
              item={ci}
              batches={batchesByItem.get(ci.id) ?? []}
              onOpen={() => navigate(`/inventory-v2/commissary/item/${ci.id}`)}
              onQtyChange={(q: number) => changeQty(ci, q)}
              selectable={selectMode}
              selected={selectedIds.has(ci.id)}
              onToggleSelect={() => toggleSelect(ci.id)}
            />
          ))}
        </div>
      )}

      {selectMode && selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <Select value={moveTarget} onValueChange={(v: string) => setMoveTarget(v)}>
              <SelectTrigger className="h-10 min-w-[12rem] flex-1 sm:flex-none">
                <SelectValue placeholder="Move to…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {sortedLocations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="h-10" onClick={moveSelected}>Move</Button>
            <Button variant="outline" className="h-10" onClick={exitSelectMode}>Cancel</Button>
          </div>
        </div>
      )}

      <NewItemDialog
        open={newItemOpen}
        onOpenChange={setNewItemOpen}
        defaultLocationId={isUnassigned ? undefined : locationId}
      />
      {!isUnassigned && location && (
        <LocationEditorDialog
          open={editorOpen}
          onOpenChange={(o: boolean) => setEditorOpen(o)}
          location={location}
        />
      )}
    </div>
  );
}
