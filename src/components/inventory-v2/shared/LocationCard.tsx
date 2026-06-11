// src/components/inventory-v2/shared/LocationCard.tsx
import { Archive, ArrowDown, ArrowUp, Camera, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { StorageLocation } from '../types';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../../ui/dropdown-menu';

const TYPE_LABEL: Record<StorageLocation['type'], string> = {
  shelf: 'Shelf', cabinet: 'Cabinet', rack: 'Rack', closet: 'Closet', other: 'Storage',
};

interface LocationCardProps {
  location: StorageLocation;
  itemCount: number;
  lowCount: number;
  expiringCount: number;
  onOpen: () => void;
  // Management callbacks — omit all (e.g. for the Unassigned pseudo-folder) to hide the kebab.
  onEdit?: () => void;
  onSetPhoto?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
}

export default function LocationCard({
  location, itemCount, lowCount, expiringCount,
  onOpen, onEdit, onSetPhoto, onMoveUp, onMoveDown, onDelete,
}: LocationCardProps) {
  const manageable = !!(onEdit || onSetPhoto || onDelete);
  return (
    <div className="group relative rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex h-28 items-center justify-center overflow-hidden rounded-t-lg bg-muted">
          {location.thumbnailUrl ? (
            <img src={location.thumbnailUrl} alt={location.name} className="h-full w-full object-cover" />
          ) : (
            <Archive className="h-8 w-8 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="p-3">
          <div className="truncate font-medium text-foreground">{location.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
            {lowCount > 0 && (
              <span className="status-error rounded px-1.5 py-0.5 text-xs">{lowCount} low</span>
            )}
            {expiringCount > 0 && (
              <span className="status-warning rounded px-1.5 py-0.5 text-xs">{expiringCount} expiring</span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{TYPE_LABEL[location.type]}</div>
        </div>
      </button>
      {manageable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Manage ${location.name}`}
              className="absolute right-2 top-2 rounded-md bg-card/80 p-1.5 text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />Edit name &amp; type
              </DropdownMenuItem>
            )}
            {onSetPhoto && (
              <DropdownMenuItem onClick={onSetPhoto}>
                <Camera className="mr-2 h-4 w-4" />Set photo
              </DropdownMenuItem>
            )}
            {(onMoveUp || onMoveDown) && (onEdit || onSetPhoto) && <DropdownMenuSeparator />}
            {onMoveUp && (
              <DropdownMenuItem onClick={onMoveUp}>
                <ArrowUp className="mr-2 h-4 w-4" />Move up
              </DropdownMenuItem>
            )}
            {onMoveDown && (
              <DropdownMenuItem onClick={onMoveDown}>
                <ArrowDown className="mr-2 h-4 w-4" />Move down
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />Delete location
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
