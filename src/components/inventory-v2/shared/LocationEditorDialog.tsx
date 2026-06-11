// src/components/inventory-v2/shared/LocationEditorDialog.tsx
import { useEffect, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
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
import { usePhotoUpload } from '../usePhotoUpload';
import type { StorageLocation, StorageLocationType } from '../types';

const LOCATION_TYPES: { value: StorageLocationType; label: string }[] = [
  { value: 'shelf', label: 'Shelf' },
  { value: 'cabinet', label: 'Cabinet' },
  { value: 'rack', label: 'Rack' },
  { value: 'closet', label: 'Closet' },
  { value: 'other', label: 'Other' },
];

interface LocationEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: StorageLocation; // undefined = create mode
}

export default function LocationEditorDialog({ open, onOpenChange, location }: LocationEditorDialogProps) {
  const { state, dispatch } = useInventoryV2();
  const [name, setName] = useState('');
  const [type, setType] = useState<StorageLocationType>('shelf');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(undefined);
  const { pick, uploading, input } = usePhotoUpload(setThumbnailUrl);

  useEffect(() => {
    if (open) {
      setName(location?.name ?? '');
      setType(location?.type ?? 'shelf');
      setThumbnailUrl(location?.thumbnailUrl);
    }
  }, [open, location]);

  const save = () => {
    if (!name.trim()) return;
    if (location) {
      dispatch({
        type: 'UPDATE_STORAGE_LOCATION',
        payload: { id: location.id, name: name.trim(), type, thumbnailUrl },
      });
    } else {
      dispatch({
        type: 'ADD_STORAGE_LOCATION',
        payload: {
          id: `loc-${Date.now()}`,
          name: name.trim(),
          type,
          sortOrder: state.storageLocations.length,
          thumbnailUrl,
        },
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{location ? 'Edit location' : 'New location'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="loc-name">Name</Label>
            <Input
              id="loc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Shelf A — Beverages"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v: string) => setType(v as StorageLocationType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Photo</Label>
            <div className="flex items-center gap-3">
              {thumbnailUrl && (
                <img src={thumbnailUrl} alt="" className="h-12 w-12 rounded-md border border-border object-cover" />
              )}
              <Button type="button" variant="outline" onClick={pick} disabled={uploading}>
                {uploading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Camera className="mr-2 h-4 w-4" />}
                {thumbnailUrl ? 'Replace photo' : 'Add photo'}
              </Button>
              {input}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!name.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
