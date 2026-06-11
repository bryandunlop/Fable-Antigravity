// src/components/inventory-v2/shared/NewItemDialog.tsx
// Minimal creation: name + category + UOM + location + starting qty/par.
// Everything else is edited on the item detail page afterwards.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../ui/select';
import { useInventoryV2 } from '../InventoryV2Context';
import { SUPPLY_CATEGORIES, UOM_OPTIONS } from '../constants';
import { COMMISSARY_STOCKROOM_ID } from '../commissaryUtils';
import type { SupplyCategory, UnitOfMeasure } from '../types';

interface NewItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLocationId?: string;
}

export default function NewItemDialog({ open, onOpenChange, defaultLocationId }: NewItemDialogProps) {
  const { state, dispatch } = useInventoryV2();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [supplyCategory, setSupplyCategory] = useState<SupplyCategory>('miscellaneous');
  const [uom, setUom] = useState<UnitOfMeasure>('ea');
  const [locationId, setLocationId] = useState<string | undefined>(defaultLocationId);
  const [qty, setQty] = useState(0);
  const [par, setPar] = useState(0);

  useEffect(() => {
    if (open) {
      setName('');
      setSupplyCategory('miscellaneous');
      setUom('ea');
      setLocationId(defaultLocationId);
      setQty(0);
      setPar(0);
    }
  }, [open, defaultLocationId]);

  const create = () => {
    if (!name.trim()) return;
    const id = `item-${Date.now()}`;
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        id,
        itemName: name.trim(),
        description: '',
        category: supplyCategory,
        supplyCategory,
        compartmentId: '',
        location: '',
        uom,
        defaultQuantities: {},
        currentQuantity: 0,
        requiredQuantity: 0,
        needsReplenishment: false,
        priority: 'low',
        alternateNames: [],
      },
    });
    dispatch({
      type: 'UPDATE_STOCKROOM_ITEM',
      payload: {
        itemId: id,
        stockroomId: COMMISSARY_STOCKROOM_ID,
        qtyOnHand: qty,
        parLevel: par,
        minimumLevel: 0,
        binLocation: '',
        locationId,
      },
    });
    onOpenChange(false);
    navigate(`/inventory-v2/commissary/item/${id}`);
  };

  const sortedLocations = [...state.storageLocations].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ni-name">Name</Label>
            <Input id="ni-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={supplyCategory} onValueChange={(v: string) => setSupplyCategory(v as SupplyCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPLY_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={uom} onValueChange={(v: string) => setUom(v as UnitOfMeasure)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UOM_OPTIONS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Select value={locationId ?? 'none'} onValueChange={(v: string) => setLocationId(v === 'none' ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {sortedLocations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ni-qty">Qty on hand</Label>
              <Input
                id="ni-qty"
                type="number"
                min={0}
                value={qty}
                onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ni-par">Par level</Label>
              <Input
                id="ni-par"
                type="number"
                min={0}
                value={par}
                onChange={(e) => setPar(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={!name.trim()}>Create &amp; open</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
