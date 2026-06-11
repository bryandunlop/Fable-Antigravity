// src/components/inventory-v2/pages/CommissaryHome.tsx
// Locations-first commissary home: folder grid + attention strip + search + one "+" menu.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Archive, ChevronRight, PackagePlus, Plus,
  ScanBarcode, Search, ShoppingCart, SlidersHorizontal,
} from 'lucide-react';
import { GfoPageHeader } from '../../gfo/GfoPageHeader';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { useInventoryV2 } from '../InventoryV2Context';
import {
  buildCommissaryItems, formatCurrency, getAttentionEntries, getStockValue,
} from '../commissaryUtils';
import ItemThumbnail from '../shared/ItemThumbnail';
import LocationCard from '../shared/LocationCard';
import LocationEditorDialog from '../shared/LocationEditorDialog';
import NeedsAttentionSheet from '../shared/NeedsAttentionSheet';
import NewItemDialog from '../shared/NewItemDialog';
import ReceiveStockModal from '../shared/ReceiveStockModal';
import ShoppingListModal from '../shared/ShoppingListModal';
import BulkAdjustModal from '../shared/BulkAdjustModal';
import { BarcodeScannerDialog } from '../shared/BarcodeScannerDialog';
import type { StorageLocation } from '../types';

export default function CommissaryHome() {
  const { state, dispatch } = useInventoryV2();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [attentionOpen, setAttentionOpen] = useState(false);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [locationEditor, setLocationEditor] =
    useState<{ open: boolean; location?: StorageLocation }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<StorageLocation | null>(null);

  const commissaryItems = useMemo(() => buildCommissaryItems(state), [state]);
  const attention = useMemo(() => getAttentionEntries(state), [state]);
  const stockValue = useMemo(() => getStockValue(state), [state]);
  const locations = useMemo(
    () => [...state.storageLocations].sort((a, b) => a.sortOrder - b.sortOrder),
    [state.storageLocations],
  );

  const perLocation = useMemo(() => {
    const expiringItemIds = new Set(attention.expiring.map((e) => e.batch.itemId));
    const map = new Map<string, { count: number; low: number; expiring: number }>();
    for (const ci of commissaryItems) {
      const key = ci.stockroom?.locationId ?? 'unassigned';
      const entry = map.get(key) ?? { count: 0, low: 0, expiring: 0 };
      entry.count++;
      if (ci.stockroom && ci.stockroom.qtyOnHand < ci.stockroom.parLevel) entry.low++;
      if (expiringItemIds.has(ci.id)) entry.expiring++;
      map.set(key, entry);
    }
    return map;
  }, [commissaryItems, attention.expiring]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return commissaryItems
      .filter((ci) =>
        ci.itemName.toLowerCase().includes(q) ||
        ci.alternateNames.some((n) => n.toLowerCase().includes(q)) ||
        ci.vendor?.toLowerCase().includes(q) ||
        ci.barcode?.toLowerCase().includes(q) ||
        ci.vendorItemNumber?.toLowerCase().includes(q) ||
        ci.internalItemNumber?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [commissaryItems, search]);

  const moveLocation = (loc: StorageLocation, dir: -1 | 1) => {
    const ids = locations.map((l) => l.id);
    const idx = ids.indexOf(loc.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    dispatch({ type: 'REORDER_STORAGE_LOCATIONS', payload: ids });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    dispatch({ type: 'REMOVE_STORAGE_LOCATION', payload: deleteTarget.id });
    setDeleteTarget(null);
  };

  const unassigned = perLocation.get('unassigned');
  const attentionCount = attention.low.length + attention.expiring.length;
  const deleteCount = deleteTarget ? (perLocation.get(deleteTarget.id)?.count ?? 0) : 0;

  return (
    <div className="space-y-6">
      <GfoPageHeader
        eyebrow="Commissary"
        title="Stock room"
        description={`${commissaryItems.length} items · ${formatCurrency(stockValue)} on hand`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Scan barcode" onClick={() => setScanOpen(true)}>
              <ScanBarcode className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Add</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setReceiveOpen(true)}>
                  <PackagePlus className="mr-2 h-4 w-4" />Receive stock
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNewItemOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />New item
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocationEditor({ open: true })}>
                  <Archive className="mr-2 h-4 w-4" />New location
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShoppingOpen(true)}>
                  <ShoppingCart className="mr-2 h-4 w-4" />Shopping list
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBulkOpen(true)}>
                  <SlidersHorizontal className="mr-2 h-4 w-4" />Bulk adjust
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items, vendors, barcodes…"
          className="pl-9"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-md">
            {searchResults.map((ci) => (
              <button
                key={ci.id}
                type="button"
                onClick={() => { setSearch(''); navigate(`/inventory-v2/commissary/item/${ci.id}`); }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
              >
                <ItemThumbnail name={ci.itemName} url={ci.thumbnailUrl} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm">{ci.itemName}</span>
                <span className="text-xs text-muted-foreground">
                  {ci.stockroom?.qtyOnHand ?? 0} {ci.uom}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {attentionCount > 0 && (
        <button
          type="button"
          onClick={() => setAttentionOpen(true)}
          className="status-warning flex w-full items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>{attention.low.length} below par · {attention.expiring.length} expiring</span>
          <ChevronRight className="ml-auto h-4 w-4" />
        </button>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {locations.map((loc, i) => {
          const c = perLocation.get(loc.id) ?? { count: 0, low: 0, expiring: 0 };
          return (
            <LocationCard
              key={loc.id}
              location={loc}
              itemCount={c.count}
              lowCount={c.low}
              expiringCount={c.expiring}
              onOpen={() => navigate(`/inventory-v2/commissary/location/${loc.id}`)}
              onEdit={() => setLocationEditor({ open: true, location: loc })}
              onSetPhoto={() => setLocationEditor({ open: true, location: loc })}
              onMoveUp={i > 0 ? () => moveLocation(loc, -1) : undefined}
              onMoveDown={i < locations.length - 1 ? () => moveLocation(loc, 1) : undefined}
              onDelete={() => setDeleteTarget(loc)}
            />
          );
        })}
        {unassigned && unassigned.count > 0 && (
          <LocationCard
            location={{ id: 'unassigned', name: 'Unassigned', type: 'other', sortOrder: 999 }}
            itemCount={unassigned.count}
            lowCount={unassigned.low}
            expiringCount={unassigned.expiring}
            onOpen={() => navigate('/inventory-v2/commissary/location/unassigned')}
          />
        )}
      </div>

      <ReceiveStockModal open={receiveOpen} onOpenChange={setReceiveOpen} />
      <ShoppingListModal open={shoppingOpen} onOpenChange={setShoppingOpen} />
      <BulkAdjustModal open={bulkOpen} onOpenChange={setBulkOpen} />
      <NewItemDialog open={newItemOpen} onOpenChange={setNewItemOpen} />
      <NeedsAttentionSheet
        open={attentionOpen}
        onOpenChange={setAttentionOpen}
        onOpenShoppingList={() => { setAttentionOpen(false); setShoppingOpen(true); }}
      />
      <LocationEditorDialog
        open={locationEditor.open}
        onOpenChange={(o: boolean) => setLocationEditor((s) => ({ ...s, open: o }))}
        location={locationEditor.location}
      />
      <BarcodeScannerDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onItemScanned={(itemId) => { setScanOpen(false); navigate(`/inventory-v2/commissary/item/${itemId}`); }}
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={(o: boolean) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCount > 0
                ? `Its ${deleteCount} ${deleteCount === 1 ? 'item moves' : 'items move'} to Unassigned. No stock is lost.`
                : 'This location is empty.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
