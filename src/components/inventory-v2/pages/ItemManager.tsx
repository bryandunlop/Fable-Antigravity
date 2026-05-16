// ─── Inventory V2 — Item Manager ────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { Search, Pencil, Trash2, Plus, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
import { useInventoryV2 } from '../InventoryV2Context';
import { OfflineBanner } from '../shared/OfflineBanner';
import { V2Badge } from '../shared/V2Badge';
import { SUPPLY_CATEGORIES, UOM_OPTIONS } from '../constants';
import { getCompartmentsForAircraft } from '../compartmentConfig';
import type { InventoryItemV2, SupplyCategory, UnitOfMeasure } from '../types';

// ─── Item Row ────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onEdit,
  onRemove,
}: {
  item: InventoryItemV2;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <tr className="border-b border-slate-800/50 last:border-0 hover:bg-slate-900/40 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium">{item.itemName}</div>
        {item.reorderUrl && (
          <a
            href={item.reorderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-0.5"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink size={10} /> Reorder
          </a>
        )}
      </td>
      <td className="px-3 py-3 hidden md:table-cell">
        <span className="px-2 py-0.5 bg-slate-700 rounded text-xs capitalize">
          {item.supplyCategory.replace('-', ' ')}
        </span>
      </td>
      <td className="px-3 py-3 text-center hidden lg:table-cell text-muted-foreground">
        {item.defaultQuantities.G650 ?? '—'}
      </td>
      <td className="px-3 py-3 text-center hidden lg:table-cell text-muted-foreground">
        {item.defaultQuantities.G500 ?? '—'}
      </td>
      <td className="px-3 py-3 text-center hidden lg:table-cell text-muted-foreground">
        {item.costPerUnit != null ? `$${item.costPerUnit.toFixed(2)}` : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onEdit}>
            <Pencil size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-red-400 hover:text-red-300"
            onClick={onRemove}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Default form state ───────────────────────────────────────────────────────

interface ItemFormState {
  itemName: string;
  supplyCategory: SupplyCategory;
  compartmentId: string;
  location: string;
  uom: UnitOfMeasure;
  g650Qty: string;
  g500Qty: string;
  costPerUnit: string;
  reorderUrl: string;
  vendorItemNumber: string;
}

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
    reorderUrl: '',
    vendorItemNumber: '',
  };
}

function itemToForm(item: InventoryItemV2): ItemFormState {
  return {
    itemName: item.itemName,
    supplyCategory: item.supplyCategory,
    compartmentId: item.compartmentId,
    location: item.location,
    uom: item.uom,
    g650Qty: item.defaultQuantities.G650 != null ? String(item.defaultQuantities.G650) : '',
    g500Qty: item.defaultQuantities.G500 != null ? String(item.defaultQuantities.G500) : '',
    costPerUnit: item.costPerUnit != null ? String(item.costPerUnit) : '',
    reorderUrl: item.reorderUrl ?? '',
    vendorItemNumber: item.vendorItemNumber ?? '',
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ItemManager() {
  const { state, dispatch } = useInventoryV2();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<InventoryItemV2 | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState<ItemFormState>(emptyForm());

  // ── Role guard ──────────────────────────────────────────────────────────────

  if (!['commissary-manager', 'admin'].includes(state.currentUser.role)) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <OfflineBanner />
        <div className="text-center py-12 space-y-2">
          <p className="text-lg font-semibold">Access Restricted</p>
          <p className="text-sm text-muted-foreground">
            Item management requires Commissary Manager or Admin role.
          </p>
        </div>
      </div>
    );
  }

  // ── Compartments (deduplicated across G650 + G500) ─────────────────────────

  const allCompartments = useMemo(() => {
    const g650 = getCompartmentsForAircraft(state.compartmentConfigs, 'G650');
    const g500 = getCompartmentsForAircraft(state.compartmentConfigs, 'G500');
    const seen = new Set<string>();
    const deduped: { id: string; label: string }[] = [];
    for (const c of [...g650, ...g500]) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        deduped.push({ id: c.id, label: c.label });
      }
    }
    return deduped;
  }, [state.compartmentConfigs]);

  // ── Filtered items ─────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    return state.items.filter(item => {
      if (search && !item.itemName.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== 'all' && item.supplyCategory !== categoryFilter) return false;
      return true;
    });
  }, [state.items, search, categoryFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openAddDialog() {
    setForm(emptyForm());
    setShowAddDialog(true);
  }

  function openEditDialog(item: InventoryItemV2) {
    setEditingItem(item);
    setForm(itemToForm(item));
  }

  function closeDialogs() {
    setShowAddDialog(false);
    setEditingItem(null);
    setForm(emptyForm());
  }

  function handleRemove(itemId: string) {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  }

  function handleAdd() {
    if (!form.itemName.trim()) return;
    const newItem: InventoryItemV2 = {
      id: `item-${Date.now()}`,
      itemName: form.itemName.trim(),
      category: form.supplyCategory,
      supplyCategory: form.supplyCategory,
      compartmentId: form.compartmentId,
      location: form.location.trim(),
      uom: form.uom,
      vendorItemNumber: form.vendorItemNumber.trim() || undefined,
      costPerUnit: form.costPerUnit !== '' ? parseFloat(form.costPerUnit) : undefined,
      reorderUrl: form.reorderUrl.trim() || undefined,
      defaultQuantities: {
        ...(form.g650Qty !== '' ? { G650: parseInt(form.g650Qty, 10) } : {}),
        ...(form.g500Qty !== '' ? { G500: parseInt(form.g500Qty, 10) } : {}),
      },
      currentQuantity: 0,
      requiredQuantity: 0,
      needsReplenishment: false,
      priority: 'low',
      alternateNames: [],
    };
    dispatch({ type: 'ADD_ITEM', payload: newItem });
    closeDialogs();
  }

  function handleUpdate() {
    if (!editingItem || !form.itemName.trim()) return;
    const updated: InventoryItemV2 = {
      ...editingItem,
      itemName: form.itemName.trim(),
      category: form.supplyCategory,
      supplyCategory: form.supplyCategory,
      compartmentId: form.compartmentId,
      location: form.location.trim(),
      uom: form.uom,
      vendorItemNumber: form.vendorItemNumber.trim() || undefined,
      costPerUnit: form.costPerUnit !== '' ? parseFloat(form.costPerUnit) : undefined,
      reorderUrl: form.reorderUrl.trim() || undefined,
      defaultQuantities: {
        ...(form.g650Qty !== '' ? { G650: parseInt(form.g650Qty, 10) } : {}),
        ...(form.g500Qty !== '' ? { G500: parseInt(form.g500Qty, 10) } : {}),
      },
    };
    dispatch({ type: 'UPDATE_ITEM', payload: updated });
    closeDialogs();
  }

  const isDialogOpen = showAddDialog || editingItem != null;
  const dialogTitle = editingItem ? 'Edit Item' : 'Add Item';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <OfflineBanner />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Item Manager</h1>
          <V2Badge variant="v2" size="md" />
        </div>
        <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
          <Plus size={15} />
          Add Item
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-9"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {SUPPLY_CATEGORIES.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Item count */}
      <p className="text-sm text-muted-foreground">
        {state.items.length} items
        {filteredItems.length !== state.items.length && ` (${filteredItems.length} filtered)`}
      </p>

      {/* Item table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Item Name</th>
                <th className="text-left px-3 py-3 font-medium hidden md:table-cell">Category</th>
                <th className="text-center px-3 py-3 font-medium hidden lg:table-cell">G650</th>
                <th className="text-center px-3 py-3 font-medium hidden lg:table-cell">G500</th>
                <th className="text-center px-3 py-3 font-medium hidden lg:table-cell">Cost</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onEdit={() => openEditDialog(item)}
                  onRemove={() => handleRemove(item.id)}
                />
              ))}
            </tbody>
          </table>
          {filteredItems.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground">
              No items match your filters.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={open => { if (!open) closeDialogs(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Item Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Item Name *</label>
              <Input
                value={form.itemName}
                onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))}
                placeholder="e.g. Fiji Water 500ml"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={form.supplyCategory}
                onValueChange={(v: string) => setForm(f => ({ ...f, supplyCategory: v as SupplyCategory }))}
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

            {/* Compartment */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Compartment</label>
              <Select
                value={form.compartmentId}
                onValueChange={(v: string) => setForm(f => ({ ...f, compartmentId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select compartment" />
                </SelectTrigger>
                <SelectContent>
                  {allCompartments.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <Input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Drawer A2"
              />
            </div>

            {/* UOM */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unit of Measure</label>
              <Select
                value={form.uom}
                onValueChange={(v: string) => setForm(f => ({ ...f, uom: v as UnitOfMeasure }))}
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

            {/* Default quantities */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">G650 Default Qty</label>
                <Input
                  type="number"
                  min={0}
                  value={form.g650Qty}
                  onChange={e => setForm(f => ({ ...f, g650Qty: e.target.value }))}
                  placeholder="—"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">G500 Default Qty</label>
                <Input
                  type="number"
                  min={0}
                  value={form.g500Qty}
                  onChange={e => setForm(f => ({ ...f, g500Qty: e.target.value }))}
                  placeholder="—"
                />
              </div>
            </div>

            {/* Cost Per Unit */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cost Per Unit (optional)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.costPerUnit}
                onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Reorder URL */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reorder URL (optional)</label>
              <Input
                value={form.reorderUrl}
                onChange={e => setForm(f => ({ ...f, reorderUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            {/* Vendor Item # */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Vendor Item # (optional)</label>
              <Input
                value={form.vendorItemNumber}
                onChange={e => setForm(f => ({ ...f, vendorItemNumber: e.target.value }))}
                placeholder="e.g. FJ-500-CS"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>
              Cancel
            </Button>
            <Button
              onClick={editingItem ? handleUpdate : handleAdd}
              disabled={!form.itemName.trim()}
            >
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
