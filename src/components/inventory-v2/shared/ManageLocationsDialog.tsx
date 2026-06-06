import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { ChevronUp, ChevronDown, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useInventoryV2 } from '../InventoryV2Context';
import { toast } from 'sonner';
import type { StorageLocation, StorageLocationType } from '../types';

interface ManageLocationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageLocationsDialog({ open, onOpenChange }: ManageLocationsDialogProps) {
  const { state, dispatch } = useInventoryV2();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<StorageLocationType>('shelf');

  const sortedLocations = useMemo(() =>
    [...state.storageLocations].sort((a, b) => a.sortOrder - b.sortOrder),
    [state.storageLocations]
  );

  // Count items assigned to each location
  const itemCountByLocation = useMemo(() => {
    const map: Record<string, number> = {};
    state.storageLocations.forEach(l => { map[l.id] = 0; });
    state.stockroomItems.forEach(si => {
      if (si.locationId && map[si.locationId] !== undefined) {
        map[si.locationId]++;
      }
    });
    return map;
  }, [state.storageLocations, state.stockroomItems]);

  const startEdit = (loc: StorageLocation) => {
    setEditingId(loc.id);
    setEditingName(loc.name);
  };

  const saveEdit = () => {
    if (!editingId || !editingName.trim()) { setEditingId(null); return; }
    dispatch({ type: 'UPDATE_STORAGE_LOCATION', payload: { id: editingId, name: editingName.trim() } });
    toast.success('Location renamed');
    setEditingId(null);
    setEditingName('');
  };

  const cancelEdit = () => { setEditingId(null); setEditingName(''); };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const maxOrder = sortedLocations.length > 0
      ? Math.max(...sortedLocations.map(l => l.sortOrder))
      : -1;
    dispatch({
      type: 'ADD_STORAGE_LOCATION',
      payload: {
        id: `loc-${Date.now()}`,
        name: newName.trim(),
        type: newType,
        sortOrder: maxOrder + 1,
      },
    });
    toast.success(`Added: ${newName.trim()}`);
    setNewName('');
    setNewType('shelf');
  };

  const handleRemove = (loc: StorageLocation) => {
    const count = itemCountByLocation[loc.id] ?? 0;
    const confirmMsg = count > 0
      ? `Remove "${loc.name}"? ${count} item(s) will become unassigned.`
      : `Remove "${loc.name}"?`;
    if (!window.confirm(confirmMsg)) return;
    dispatch({ type: 'REMOVE_STORAGE_LOCATION', payload: loc.id });
    toast.success('Location removed');
  };

  const moveUp = (loc: StorageLocation) => {
    const idx = sortedLocations.findIndex(l => l.id === loc.id);
    if (idx <= 0) return;
    const newOrder = sortedLocations.map(l => l.id);
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    dispatch({ type: 'REORDER_STORAGE_LOCATIONS', payload: newOrder });
  };

  const moveDown = (loc: StorageLocation) => {
    const idx = sortedLocations.findIndex(l => l.id === loc.id);
    if (idx < 0 || idx >= sortedLocations.length - 1) return;
    const newOrder = sortedLocations.map(l => l.id);
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    dispatch({ type: 'REORDER_STORAGE_LOCATIONS', payload: newOrder });
  };

  const typeLabel = (t: StorageLocationType) =>
    ({ shelf: 'Shelf', cabinet: 'Cabinet', rack: 'Rack', closet: 'Closet', other: 'Other' })[t];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Locations</DialogTitle>
        </DialogHeader>

        {/* Existing locations list */}
        <div className="flex-1 overflow-y-auto space-y-1 py-2">
          {sortedLocations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No locations defined</p>
          )}
          {sortedLocations.map((loc, idx) => (
            <div
              key={loc.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              {/* Up/Down */}
              <div className="flex flex-col">
                <button
                  onClick={() => moveUp(loc)}
                  disabled={idx === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveDown(loc)}
                  disabled={idx === sortedLocations.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Name (editable) */}
              <div className="flex-1 min-w-0">
                {editingId === loc.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <button onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300"><Check className="w-4 h-4" /></button>
                    <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{loc.name}</span>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border shrink-0">
                      {typeLabel(loc.type)}
                    </Badge>
                    {(itemCountByLocation[loc.id] ?? 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border shrink-0">
                        {itemCountByLocation[loc.id]} items
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Edit + Remove */}
              {editingId !== loc.id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(loc)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemove(loc)}
                    className="text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new location */}
        <div className="border-t border-border/40 pt-4 space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Location</div>
          <div className="flex gap-2">
            <Input
              placeholder="Location name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              className="flex-1 h-8 text-sm"
            />
            <Select value={newType} onValueChange={(v: string) => setNewType(v as StorageLocationType)}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shelf">Shelf</SelectItem>
                <SelectItem value="cabinet">Cabinet</SelectItem>
                <SelectItem value="rack">Rack</SelectItem>
                <SelectItem value="closet">Closet</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="h-8 gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
