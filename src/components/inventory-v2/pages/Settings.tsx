import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../ui/alert-dialog';
import { ScrollArea } from '../../ui/scroll-area';
import { Switch } from '../../ui/switch';
import { useInventoryV2 } from '../InventoryV2Context';
import { SUPPLY_CATEGORIES, UOM_OPTIONS } from '../constants';
import { V2Badge } from '../shared/V2Badge';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon, Plus, Trash2, Pencil, Check, X,
  Plane, Package, Layers, SlidersHorizontal, ArrowUp, ArrowDown, Lightbulb,
} from 'lucide-react';
import type { FleetAircraft, InventoryItemV2, CompartmentDefinition } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Fleet Tab ───────────────────────────────────────────────────────────────

function FleetTab() {
  const { state, dispatch } = useInventoryV2();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FleetAircraft | null>(null);
  const [form, setForm] = useState({ tailNumber: '', type: 'G650' as 'G650' | 'G500', displayName: '' });

  const openAdd = () => {
    setForm({ tailNumber: '', type: 'G650', displayName: '' });
    setEditTarget(null);
    setAddOpen(true);
  };

  const openEdit = (unit: FleetAircraft) => {
    setForm({ tailNumber: unit.tailNumber, type: unit.type, displayName: unit.displayName });
    setEditTarget(unit);
    setAddOpen(true);
  };

  const handleSave = () => {
    if (!form.tailNumber.trim()) { toast.error('Tail number is required'); return; }
    const unit: FleetAircraft = {
      tailNumber: form.tailNumber.trim().toUpperCase(),
      type: form.type,
      displayName: form.displayName.trim() || `${form.tailNumber.trim().toUpperCase()} (${form.type})`,
    };
    if (editTarget) {
      dispatch({ type: 'UPDATE_FLEET_UNIT', payload: unit });
      toast.success('Aircraft updated');
    } else {
      if (state.fleet.some(f => f.tailNumber === unit.tailNumber)) {
        toast.error('Tail number already exists');
        return;
      }
      dispatch({ type: 'ADD_FLEET_UNIT', payload: unit });
      toast.success('Aircraft added');
    }
    setAddOpen(false);
  };

  const handleRemove = (tailNumber: string) => {
    dispatch({ type: 'REMOVE_FLEET_UNIT', payload: tailNumber });
    toast.success('Aircraft removed');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{state.fleet.length} aircraft in fleet</p>
        <Button size="sm" onClick={openAdd} className="btn-aviation-primary">
          <Plus className="w-4 h-4 mr-1" /> Add Aircraft
        </Button>
      </div>

      <div className="space-y-2">
        {state.fleet.map(unit => (
          <div key={unit.tailNumber} className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <Plane className="w-4 h-4 text-primary" />
              <div>
                <span className="font-medium">{unit.tailNumber}</span>
                <Badge variant="outline" className="ml-2 text-xs">{unit.type}</Badge>
              </div>
              <span className="text-sm text-muted-foreground">{unit.displayName}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(unit)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {unit.tailNumber}?</AlertDialogTitle>
                    <AlertDialogDescription>This removes the aircraft from the fleet. Existing inspections referencing this tail number are unaffected.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleRemove(unit.tailNumber)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
        {state.fleet.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">No aircraft in fleet</div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Aircraft' : 'Add Aircraft'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Tail Number</Label>
              <Input
                value={form.tailNumber}
                onChange={e => setForm(f => ({ ...f, tailNumber: e.target.value }))}
                placeholder="N1PG"
                disabled={!!editTarget}
              />
            </div>
            <div className="space-y-1">
              <Label>Aircraft Type</Label>
              <Select value={form.type} onValueChange={(v: 'G650' | 'G500') => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="G650">G650</SelectItem>
                  <SelectItem value="G500">G500</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Display Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="Auto-generated if blank"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="btn-aviation-primary">
              <Check className="w-4 h-4 mr-1" /> {editTarget ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Compartments Tab ─────────────────────────────────────────────────────────

const ICON_OPTIONS = ['Droplets', 'Coffee', 'Armchair', 'UtensilsCrossed', 'Package', 'Snowflake', 'Luggage', 'Wine', 'Pill', 'BookOpen', 'Shield', 'Layers'];
const COLOR_OPTIONS = [
  { label: 'Cyan', value: 'text-cyan-400' },
  { label: 'Amber', value: 'text-amber-400' },
  { label: 'Blue', value: 'text-blue-400' },
  { label: 'Orange', value: 'text-orange-400' },
  { label: 'Purple', value: 'text-primary' },
  { label: 'Emerald', value: 'text-emerald-400' },
  { label: 'Sky', value: 'text-sky-400' },
  { label: 'Indigo', value: 'text-indigo-400' },
  { label: 'Rose', value: 'text-rose-400' },
];

function CompartmentsTab() {
  const { state, dispatch } = useInventoryV2();
  const [selectedType, setSelectedType] = useState<'G650' | 'G500'>('G650');
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CompartmentDefinition | null>(null);
  const [form, setForm] = useState({ label: '', icon: 'Package', color: 'text-primary' });

  const config = state.compartmentConfigs.find(c => c.aircraftType === selectedType);
  const compartments = [...(config?.compartments ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const updateConfigs = (newCompartments: CompartmentDefinition[]) => {
    const updated = state.compartmentConfigs.map(c =>
      c.aircraftType === selectedType ? { ...c, compartments: newCompartments } : c
    );
    dispatch({ type: 'SET_COMPARTMENT_CONFIGS', payload: updated });
  };

  const moveCompartment = (id: string, dir: 'up' | 'down') => {
    const idx = compartments.findIndex(c => c.id === id);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === compartments.length - 1) return;
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    const reordered = compartments.map((c, i) => {
      if (i === idx) return { ...compartments[swap], sortOrder: c.sortOrder };
      if (i === swap) return { ...compartments[idx], sortOrder: compartments[swap].sortOrder };
      return c;
    });
    updateConfigs(reordered);
  };

  const openAdd = () => {
    setForm({ label: '', icon: 'Package', color: 'text-primary' });
    setEditTarget(null);
    setAddOpen(true);
  };

  const openEdit = (c: CompartmentDefinition) => {
    setForm({ label: c.label, icon: c.icon, color: c.color });
    setEditTarget(c);
    setAddOpen(true);
  };

  const handleSave = () => {
    if (!form.label.trim()) { toast.error('Label is required'); return; }
    if (editTarget) {
      updateConfigs(compartments.map(c => c.id === editTarget.id ? { ...c, ...form } : c));
      toast.success('Compartment updated');
    } else {
      const newComp: CompartmentDefinition = {
        id: newId(),
        label: form.label.trim(),
        icon: form.icon,
        color: form.color,
        sortOrder: (compartments[compartments.length - 1]?.sortOrder ?? 0) + 1,
      };
      updateConfigs([...compartments, newComp]);
      toast.success('Compartment added');
    }
    setAddOpen(false);
  };

  const handleDelete = (id: string) => {
    updateConfigs(compartments.filter(c => c.id !== id));
    toast.success('Compartment removed');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['G650', 'G500'] as const).map(t => (
            <Button
              key={t}
              variant={selectedType === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(t)}
              className={selectedType === t ? 'btn-aviation-primary' : ''}
            >
              {t}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={openAdd} className="btn-aviation-primary">
          <Plus className="w-4 h-4 mr-1" /> Add Section
        </Button>
      </div>

      <div className="space-y-2">
        {compartments.map((comp, idx) => (
          <div key={comp.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveCompartment(comp.id, 'up')} disabled={idx === 0}>
                  <ArrowUp className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveCompartment(comp.id, 'down')} disabled={idx === compartments.length - 1}>
                  <ArrowDown className="w-3 h-3" />
                </Button>
              </div>
              <div className={`w-2 h-8 rounded-full ${comp.color.replace('text-', 'bg-')}`} />
              <span className="font-medium">{comp.label}</span>
              <span className="text-xs text-muted-foreground">{comp.icon}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(comp)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {comp.label}?</AlertDialogTitle>
                    <AlertDialogDescription>Items assigned to this compartment will no longer appear under it during inspections.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(comp.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
        {compartments.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">No compartments defined for {selectedType}</div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Compartment' : 'Add Compartment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Label</Label>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Forward Galley" />
            </div>
            <div className="space-y-1">
              <Label>Icon</Label>
              <Select value={form.icon} onValueChange={(v: string) => setForm(f => ({ ...f, icon: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <Select value={form.color} onValueChange={(v: string) => setForm(f => ({ ...f, color: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className={`${c.value} font-medium`}>{c.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="btn-aviation-primary">
              <Check className="w-4 h-4 mr-1" /> {editTarget ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Item Catalog Tab ─────────────────────────────────────────────────────────

const BLANK_ITEM = (): Omit<InventoryItemV2, 'id'> => ({
  itemName: '',
  description: '',
  category: '',
  supplyCategory: 'miscellaneous',
  compartmentId: '',
  location: '',
  uom: 'ea',
  vendorItemNumber: '',
  internalItemNumber: '',
  costPerUnit: 0,
  defaultQuantities: {},
  currentQuantity: 0,
  requiredQuantity: 0,
  needsReplenishment: false,
  priority: 'low',
  alternateNames: [],
});

function ItemCatalogTab() {
  const { state, dispatch } = useInventoryV2();
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<InventoryItemV2 | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Omit<InventoryItemV2, 'id'>>(BLANK_ITEM());

  const filtered = state.items.filter(i => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return i.itemName.toLowerCase().includes(q) ||
      i.internalItemNumber?.toLowerCase().includes(q) ||
      i.vendorItemNumber?.toLowerCase().includes(q);
  });

  const openAdd = () => {
    setForm(BLANK_ITEM());
    setEditItem(null);
    setFormOpen(true);
  };

  const openEdit = (item: InventoryItemV2) => {
    setForm({ ...item });
    setEditItem(item);
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.itemName.trim()) { toast.error('Item name is required'); return; }
    if (editItem) {
      dispatch({ type: 'UPDATE_ITEM', payload: { ...form, id: editItem.id } as InventoryItemV2 });
      toast.success('Item updated');
    } else {
      dispatch({ type: 'ADD_ITEM', payload: { ...form, id: `item-${newId()}` } as InventoryItemV2 });
      toast.success('Item added');
    }
    setFormOpen(false);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
    toast.success('Item removed');
  };

  // All compartment options from all aircraft types
  const compartmentOptions = state.compartmentConfigs.flatMap(c =>
    c.compartments.map(comp => ({ id: comp.id, label: `${c.aircraftType} — ${comp.label}` }))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{filtered.length} items</span>
          <Button size="sm" onClick={openAdd} className="btn-aviation-primary">
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_80px_80px_40px_40px] gap-3 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 rounded sticky top-0">
            <span>Name</span>
            <span>Category</span>
            <span>Internal #</span>
            <span className="text-center">Cost</span>
            <span></span>
            <span></span>
          </div>
          {filtered.map(item => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_100px_80px_80px_40px_40px] gap-3 px-3 py-2 rounded items-center text-sm hover:bg-muted/30"
            >
              <div>
                <p className="font-medium truncate">{item.itemName}</p>
                {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
              </div>
              <Badge variant="outline" className="text-[10px] truncate">{item.supplyCategory}</Badge>
              <span className="text-xs text-muted-foreground">{item.internalItemNumber || '—'}</span>
              <span className="text-center text-xs">${(item.costPerUnit ?? 0).toFixed(2)}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                <Pencil className="w-3 h-3" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove "{item.itemName}"?</AlertDialogTitle>
                    <AlertDialogDescription>This item will be removed from the catalog. Existing inspections are unaffected.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">No items found</div>
          )}
        </div>
      </ScrollArea>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Item Name *</Label>
                  <Input value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} placeholder="e.g. Fiji Water 500ml" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Description</Label>
                  <Input value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
                </div>
                <div className="space-y-1">
                  <Label>Supply Category</Label>
                  <Select value={form.supplyCategory} onValueChange={(v: InventoryItemV2['supplyCategory']) => setForm(f => ({ ...f, supplyCategory: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUPPLY_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>UOM</Label>
                  <Select value={form.uom} onValueChange={(v: InventoryItemV2['uom']) => setForm(f => ({ ...f, uom: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UOM_OPTIONS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Compartment</Label>
                  <Select value={form.compartmentId} onValueChange={(v: string) => setForm(f => ({ ...f, compartmentId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {compartmentOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Cost Per Unit ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.costPerUnit ?? 0}
                    onChange={e => setForm(f => ({ ...f, costPerUnit: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Vendor Item #</Label>
                  <Input value={form.vendorItemNumber ?? ''} onChange={e => setForm(f => ({ ...f, vendorItemNumber: e.target.value }))} placeholder="e.g. VND-001" />
                </div>
                <div className="space-y-1">
                  <Label>Internal Item #</Label>
                  <Input value={form.internalItemNumber ?? ''} onChange={e => setForm(f => ({ ...f, internalItemNumber: e.target.value }))} placeholder="e.g. INT-001" />
                </div>
                <div className="space-y-1">
                  <Label>Bin Location</Label>
                  <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. A-14" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Default Quantities by Aircraft Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">G650</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Leave blank if N/A"
                      value={form.defaultQuantities.G650 ?? ''}
                      onChange={e => {
                        const val = e.target.value === '' ? undefined : parseInt(e.target.value) || 0;
                        setForm(f => ({ ...f, defaultQuantities: { ...f.defaultQuantities, G650: val } }));
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">G500</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Leave blank if N/A"
                      value={form.defaultQuantities.G500 ?? ''}
                      onChange={e => {
                        const val = e.target.value === '' ? undefined : parseInt(e.target.value) || 0;
                        setForm(f => ({ ...f, defaultQuantities: { ...f.defaultQuantities, G500: val } }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="btn-aviation-primary">
              <Check className="w-4 h-4 mr-1" /> {editItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Par & Min Levels Tab ─────────────────────────────────────────────────────

function ParLevelsTab() {
  const { state, dispatch } = useInventoryV2();
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState<Record<string, { par?: number; min?: number }>>({});

  const stockroomItems = state.stockroomItems.filter(
    si => si.stockroomId === 'sr-1'
  );

  const filteredItems = state.items.filter(item => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return item.itemName.toLowerCase().includes(q) ||
      item.internalItemNumber?.toLowerCase().includes(q);
  });

  const getPar = (itemId: string) => {
    if (edits[itemId]?.par !== undefined) return edits[itemId].par!;
    return stockroomItems.find(si => si.itemId === itemId)?.parLevel ?? 0;
  };

  const getMin = (itemId: string) => {
    if (edits[itemId]?.min !== undefined) return edits[itemId].min!;
    return stockroomItems.find(si => si.itemId === itemId)?.minimumLevel ?? 0;
  };

  const setEdit = (itemId: string, field: 'par' | 'min', value: number) => {
    setEdits(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  };

  const changedCount = Object.keys(edits).length;

  const handleSave = () => {
    const updates = Object.entries(edits).map(([itemId, changes]) => {
      const existing = stockroomItems.find(si => si.itemId === itemId);
      if (!existing) return null;
      return {
        ...existing,
        parLevel: changes.par ?? existing.parLevel,
        minimumLevel: changes.min ?? existing.minimumLevel,
      };
    }).filter(Boolean) as typeof stockroomItems;

    if (updates.length > 0) {
      dispatch({ type: 'BULK_UPDATE_STOCKROOM', payload: updates });
    }
    setEdits({});
    toast.success(`Saved par/min levels for ${updates.length} item(s)`);
  };

  const parSuggestions = useMemo(() => {
    const completedTrips = state.trips.filter(t => t.status === 'completed');
    if (!completedTrips.length) return {} as Record<string, number>;
    const usageByItem: Record<string, number[]> = {};
    for (const trip of completedTrips) {
      const tripTotals: Record<string, number> = {};
      for (const leg of trip.legs) {
        for (const entry of leg.usageLog) {
          tripTotals[entry.itemId] = (tripTotals[entry.itemId] ?? 0) + entry.qtyUsed;
        }
      }
      for (const [itemId, qty] of Object.entries(tripTotals)) {
        if (!usageByItem[itemId]) usageByItem[itemId] = [];
        usageByItem[itemId].push(qty);
      }
    }
    const suggestions: Record<string, number> = {};
    for (const [itemId, usages] of Object.entries(usageByItem)) {
      const avg = usages.reduce((a, b) => a + b, 0) / usages.length;
      const suggested = Math.ceil(avg * 1.2);
      const currentPar = stockroomItems.find(si => si.itemId === itemId)?.parLevel ?? 0;
      if (suggested > currentPar) suggestions[itemId] = suggested;
    }
    return suggestions;
  }, [state.trips, stockroomItems]);

  const suggestionCount = Object.keys(parSuggestions).length;

  return (
    <div className="space-y-4">
      {suggestionCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-500">
          <Lightbulb className="w-4 h-4 shrink-0" />
          <span>{suggestionCount} item{suggestionCount > 1 ? 's have' : ' has'} a par level suggestion based on trip usage.</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <Button
          size="sm"
          disabled={changedCount === 0}
          onClick={handleSave}
          className="btn-aviation-primary disabled:opacity-50"
        >
          <Check className="w-4 h-4 mr-1" /> Save {changedCount > 0 ? `(${changedCount})` : ''}
        </Button>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_80px_100px_100px] gap-3 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 rounded sticky top-0">
            <span>Item</span>
            <span className="text-center">On Hand</span>
            <span className="text-center">Par Level</span>
            <span className="text-center">Min Level</span>
          </div>
          {filteredItems.map(item => {
            const si = stockroomItems.find(s => s.itemId === item.id);
            const onHand = si?.qtyOnHand ?? 0;
            const par = getPar(item.id);
            const min = getMin(item.id);
            const changed = edits[item.id] !== undefined;
            return (
              <div
                key={item.id}
                className={`grid grid-cols-[1fr_80px_100px_100px] gap-3 px-3 py-2 rounded items-center text-sm ${changed ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/30'}`}
              >
                <div>
                  <p className="font-medium truncate">{item.itemName}</p>
                  <p className="text-xs text-muted-foreground">{item.internalItemNumber}</p>
                  {parSuggestions[item.id] && (
                    <button
                      onClick={() => setEdit(item.id, 'par', parSuggestions[item.id])}
                      className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 mt-0.5"
                    >
                      <Lightbulb className="w-3 h-3" />
                      Suggest: {parSuggestions[item.id]}
                    </button>
                  )}
                </div>
                <span className={`text-center font-medium ${onHand < min ? 'text-red-400' : onHand < par ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {onHand}
                </span>
                <Input
                  type="number"
                  min={0}
                  value={par}
                  onChange={e => setEdit(item.id, 'par', parseInt(e.target.value) || 0)}
                  className="h-8 text-center"
                />
                <Input
                  type="number"
                  min={0}
                  value={min}
                  onChange={e => setEdit(item.id, 'min', parseInt(e.target.value) || 0)}
                  className="h-8 text-center"
                />
              </div>
            );
          })}
          {filteredItems.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">No items found</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── My Alerts Tab ───────────────────────────────────────────────────────────

function MyAlertsTab() {
  const { state, dispatch } = useInventoryV2();
  const [search, setSearch] = useState('');

  const userId = state.currentUser.id;

  const filteredItems = state.items.filter(item =>
    item.itemName.toLowerCase().includes(search.toLowerCase())
  );

  function getThreshold(itemId: string) {
    return state.alertThresholds.find(t => t.userId === userId && t.itemId === itemId);
  }

  function setThresholdValue(itemId: string, value: number) {
    if (!Number.isFinite(value) || value < 0) return;
    const existing = getThreshold(itemId);
    dispatch({
      type: 'ADD_ALERT_THRESHOLD',
      payload: {
        id: existing?.id ?? `thr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        userId,
        itemId,
        threshold: value,
        enabled: existing?.enabled ?? true,
      },
    });
  }

  function toggleEnabled(itemId: string, enabled: boolean) {
    const existing = getThreshold(itemId);
    if (!existing) return;
    dispatch({
      type: 'ADD_ALERT_THRESHOLD',
      payload: { ...existing, enabled },
    });
  }

  function removeThreshold(itemId: string) {
    const existing = getThreshold(itemId);
    if (!existing) return;
    dispatch({ type: 'REMOVE_ALERT_THRESHOLD', payload: existing.id });
  }

  const itemsWithThresholds = filteredItems.filter(i => getThreshold(i.id));
  const itemsWithout = filteredItems.filter(i => !getThreshold(i.id));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1">Alert Thresholds</h3>
        <p className="text-xs text-slate-400">You'll be alerted when stockroom quantity drops below your threshold.</p>
      </div>

      <Input
        placeholder="Search items…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {itemsWithThresholds.length === 0 && itemsWithout.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">No items match your search.</p>
      )}

      {itemsWithThresholds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Your Thresholds</p>
          {itemsWithThresholds.map(item => {
            const t = getThreshold(item.id)!;
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{item.itemName}</p>
                  <p className="text-xs text-slate-500">{item.uom}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Label className="text-xs text-slate-400 whitespace-nowrap">Alert below:</Label>
                  <Input
                    type="number"
                    min={0}
                    value={t.threshold}
                    onChange={e => setThresholdValue(item.id, Number(e.target.value))}
                    className="w-16 h-7 text-xs text-center"
                  />
                  <Switch
                    checked={t.enabled}
                    onCheckedChange={(enabled: boolean) => toggleEnabled(item.id, enabled)}
                  />
                  <button
                    onClick={() => removeThreshold(item.id)}
                    className="ml-1 text-xs text-slate-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {itemsWithout.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {itemsWithThresholds.length > 0 ? 'Add a Threshold' : 'Items — click to set a threshold'}
          </p>
          {itemsWithout.map(item => {
            const si = state.stockroomItems.find(
              s => s.itemId === item.id && s.stockroomId === 'sr-1'
            );
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/[0.05] px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">{item.itemName}</p>
                  <p className="text-xs text-slate-500">{item.uom} · {si?.qtyOnHand ?? 0} on hand</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setThresholdValue(item.id, si?.parLevel ?? 10)}
                >
                  + Set threshold
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function Settings() {
  const { state } = useInventoryV2();
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Settings</h1>
        <V2Badge variant="v2" size="md" />
      </div>

      <Tabs defaultValue="fleet">
        <TabsList className={`grid w-full max-w-lg ${state.currentUser.role === 'commissary-manager' ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="fleet" className="flex items-center gap-1.5">
            <Plane className="w-3.5 h-3.5" /> Fleet
          </TabsTrigger>
          <TabsTrigger value="compartments" className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Compartments
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" /> Items
          </TabsTrigger>
          <TabsTrigger value="par" className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Par Levels
          </TabsTrigger>
          {state.currentUser.role === 'commissary-manager' && (
            <TabsTrigger value="my-alerts">My Alerts</TabsTrigger>
          )}
        </TabsList>

        <Card className="mt-4">
          <CardContent className="pt-6">
            <TabsContent value="fleet">
              <FleetTab />
            </TabsContent>
            <TabsContent value="compartments">
              <CompartmentsTab />
            </TabsContent>
            <TabsContent value="items">
              <ItemCatalogTab />
            </TabsContent>
            <TabsContent value="par">
              <ParLevelsTab />
            </TabsContent>
            {state.currentUser.role === 'commissary-manager' && (
              <TabsContent value="my-alerts">
                <MyAlertsTab />
              </TabsContent>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
