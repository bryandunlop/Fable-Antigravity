// ─── Edit / Add Item Dialog ───────────────────────────────────────────────────
import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { useInventoryV2 } from '../InventoryV2Context';
import { SUPPLY_CATEGORIES, UOM_OPTIONS } from '../constants';
import { toast } from 'sonner';
import type { InventoryItemV2, SupplyCategory, UnitOfMeasure, StockroomItem } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditItemDialogProps {
  item: InventoryItemV2 | null; // null = add mode
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ItemFormState {
  itemName: string;
  supplyCategory: SupplyCategory;
  compartmentId: string;
  location: string;
  uom: UnitOfMeasure;
  g650Qty: string;
  g500Qty: string;
  costPerUnit: string;
  vendorItemNumber: string;
  vendor: string;
  reorderUrl: string;
  barcode: string;
  locationId: string;
  binLocation: string;
  parLevel: string;
  minimumLevel: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyForm(): ItemFormState {
  return {
    itemName: '',
    supplyCategory: 'miscellaneous',
    compartmentId: '',
    location: '',
    uom: 'ea',
    g650Qty: '',
    g500Qty: '',
    costPerUnit: '',
    vendorItemNumber: '',
    vendor: '',
    reorderUrl: '',
    barcode: '',
    locationId: '',
    binLocation: '',
    parLevel: '',
    minimumLevel: '',
  };
}

function itemToForm(item: InventoryItemV2, si?: StockroomItem): ItemFormState {
  return {
    itemName: item.itemName,
    supplyCategory: item.supplyCategory,
    compartmentId: item.compartmentId,
    location: item.location,
    uom: item.uom,
    g650Qty: item.defaultQuantities.G650 != null ? String(item.defaultQuantities.G650) : '',
    g500Qty: item.defaultQuantities.G500 != null ? String(item.defaultQuantities.G500) : '',
    costPerUnit: item.costPerUnit != null ? String(item.costPerUnit) : '',
    vendorItemNumber: item.vendorItemNumber ?? '',
    vendor: item.vendor ?? '',
    reorderUrl: item.reorderUrl ?? '',
    barcode: item.barcode ?? '',
    locationId: si?.locationId ?? '',
    binLocation: si?.binLocation ?? '',
    parLevel: si?.parLevel != null ? String(si.parLevel) : '',
    minimumLevel: si?.minimumLevel != null ? String(si.minimumLevel) : '',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditItemDialog({ item, open, onOpenChange }: EditItemDialogProps) {
  const { state, dispatch } = useInventoryV2();
  const [form, setForm] = useState<ItemFormState>(emptyForm());

  // Find existing stockroom item for this item
  const existingStockroomItem = useMemo(() => {
    if (!item) return undefined;
    return state.stockroomItems.find(si => si.itemId === item.id && si.stockroomId === 'sr-1');
  }, [item, state.stockroomItems]);

  // Populate form when item changes
  useEffect(() => {
    if (item) {
      setForm(itemToForm(item, existingStockroomItem));
    } else {
      setForm(emptyForm());
    }
  }, [item, existingStockroomItem, open]);

  const isAddMode = item === null;

  const handleSave = () => {
    if (!form.itemName.trim()) {
      toast.error('Item name is required');
      return;
    }

    // Validate numeric inputs
    const g650Parsed = form.g650Qty !== '' ? parseInt(form.g650Qty, 10) : undefined;
    const g500Parsed = form.g500Qty !== '' ? parseInt(form.g500Qty, 10) : undefined;
    const costParsed = form.costPerUnit !== '' ? parseFloat(form.costPerUnit) : undefined;
    const parParsed = form.parLevel !== '' ? parseInt(form.parLevel, 10) : 0;
    const minParsed = form.minimumLevel !== '' ? parseInt(form.minimumLevel, 10) : 0;

    if (g650Parsed !== undefined && (isNaN(g650Parsed) || g650Parsed < 0)) return;
    if (g500Parsed !== undefined && (isNaN(g500Parsed) || g500Parsed < 0)) return;
    if (costParsed !== undefined && (isNaN(costParsed) || costParsed < 0)) return;
    if (isNaN(parParsed) || parParsed < 0) return;
    if (isNaN(minParsed) || minParsed < 0) return;

    if (isAddMode) {
      // ── Add new item ──────────────────────────────────────────────────────
      const newItemId = `item-${Date.now()}`;
      const newItem: InventoryItemV2 = {
        id: newItemId,
        itemName: form.itemName.trim(),
        category: form.supplyCategory,
        supplyCategory: form.supplyCategory,
        compartmentId: form.compartmentId,
        location: form.location.trim(),
        uom: form.uom,
        vendorItemNumber: form.vendorItemNumber.trim() || undefined,
        vendor: form.vendor.trim() || undefined,
        costPerUnit: costParsed,
        reorderUrl: form.reorderUrl.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        defaultQuantities: {
          ...(g650Parsed !== undefined ? { G650: g650Parsed } : {}),
          ...(g500Parsed !== undefined ? { G500: g500Parsed } : {}),
        },
        currentQuantity: 0,
        requiredQuantity: 0,
        needsReplenishment: false,
        priority: 'low',
        alternateNames: [],
      };
      dispatch({ type: 'ADD_ITEM', payload: newItem });

      // Create a corresponding stockroom item for sr-1
      const newStockroomItem: StockroomItem = {
        itemId: newItemId,
        stockroomId: 'sr-1',
        qtyOnHand: 0,
        parLevel: parParsed,
        minimumLevel: minParsed,
        binLocation: form.binLocation.trim(),
        locationId: form.locationId || undefined,
      };
      dispatch({ type: 'UPDATE_STOCKROOM_ITEM', payload: newStockroomItem });
    } else {
      // ── Update existing item ──────────────────────────────────────────────
      const updatedItem: InventoryItemV2 = {
        ...item,
        itemName: form.itemName.trim(),
        category: form.supplyCategory,
        supplyCategory: form.supplyCategory,
        compartmentId: form.compartmentId,
        location: form.location.trim(),
        uom: form.uom,
        vendorItemNumber: form.vendorItemNumber.trim() || undefined,
        vendor: form.vendor.trim() || undefined,
        costPerUnit: costParsed,
        reorderUrl: form.reorderUrl.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        defaultQuantities: {
          ...(g650Parsed !== undefined ? { G650: g650Parsed } : {}),
          ...(g500Parsed !== undefined ? { G500: g500Parsed } : {}),
        },
      };
      dispatch({ type: 'UPDATE_ITEM', payload: updatedItem });

      // Update (or create) the stockroom item
      const updatedStockroomItem: StockroomItem = {
        ...(existingStockroomItem ?? {
          itemId: item.id,
          stockroomId: 'sr-1',
          qtyOnHand: 0,
        }),
        parLevel: parParsed,
        minimumLevel: minParsed,
        binLocation: form.binLocation.trim(),
        locationId: form.locationId || undefined,
      };
      dispatch({ type: 'UPDATE_STOCKROOM_ITEM', payload: updatedStockroomItem });
    }

    toast.success(isAddMode ? 'Item added' : 'Item saved');
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!item) return;
    dispatch({ type: 'REMOVE_ITEM', payload: item.id });
    toast.success('Item removed');
    onOpenChange(false);
  };

  const setField = <K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isAddMode ? 'Add Item' : 'Edit Item'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Item Name */}
          <div className="space-y-1.5">
            <Label>Item Name *</Label>
            <Input
              value={form.itemName}
              onChange={e => setField('itemName', e.target.value)}
              placeholder="e.g. Fiji Water 500ml"
            />
          </div>

          {/* Category + UOM */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.supplyCategory}
                onValueChange={(v: string) => setField('supplyCategory', v as SupplyCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLY_CATEGORIES.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Unit of Measure</Label>
              <Select
                value={form.uom}
                onValueChange={(v: string) => setField('uom', v as UnitOfMeasure)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UOM_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Default quantities */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>G650 Default Qty</Label>
              <Input
                type="number"
                min={0}
                value={form.g650Qty}
                onChange={e => setField('g650Qty', e.target.value)}
                placeholder="—"
              />
            </div>
            <div className="space-y-1.5">
              <Label>G500 Default Qty</Label>
              <Input
                type="number"
                min={0}
                value={form.g500Qty}
                onChange={e => setField('g500Qty', e.target.value)}
                placeholder="—"
              />
            </div>
          </div>

          {/* Cost per unit */}
          <div className="space-y-1.5">
            <Label>Cost per Unit (optional)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.costPerUnit}
              onChange={e => setField('costPerUnit', e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Vendor + Reorder URL */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vendor (optional)</Label>
              <Input
                value={form.vendor}
                onChange={e => setField('vendor', e.target.value)}
                placeholder="e.g. Amazon, Kroger"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reorder URL (optional)</Label>
              <Input
                value={form.reorderUrl}
                onChange={e => setField('reorderUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Barcode */}
          <div className="space-y-1.5">
            <Label>Barcode (optional)</Label>
            <Input
              value={form.barcode}
              onChange={e => setField('barcode', e.target.value)}
              placeholder="e.g. 0012345678901"
              className="font-mono"
            />
          </div>

          {/* Storage location divider */}
          <div className="pt-2 border-t border-border/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Stockroom
            </p>
          </div>

          {/* Storage Location + Bin */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Storage Location (optional)</Label>
              <Select
                value={form.locationId || '__none__'}
                onValueChange={(v: string) => setField('locationId', v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {state.storageLocations
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Bin Location (optional)</Label>
              <Input
                value={form.binLocation}
                onChange={e => setField('binLocation', e.target.value)}
                placeholder="e.g. A-3"
                className="font-mono"
              />
            </div>
          </div>

          {/* Par Level + Minimum Level */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Par Level</Label>
              <Input
                type="number"
                min={0}
                value={form.parLevel}
                onChange={e => setField('parLevel', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Minimum Level</Label>
              <Input
                type="number"
                min={0}
                value={form.minimumLevel}
                onChange={e => setField('minimumLevel', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

        </div>

        <DialogFooter className="flex items-center gap-2">
          {!isAddMode && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!form.itemName.trim()}>
            {isAddMode ? 'Add Item' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
