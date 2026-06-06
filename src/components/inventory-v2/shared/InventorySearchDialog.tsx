import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plane, ClipboardCheck, FileText } from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '../../ui/command';
import { useInventoryV2 } from '../InventoryV2Context';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function InventorySearchDialog({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { state } = useInventoryV2();

  function go(path: string) {
    navigate(path);
    onClose();
  }

  return (
    <CommandDialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <CommandInput placeholder="Search items, trips, inspections, requests..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Items">
          {state.items
            .filter(i => i.itemName)
            .slice(0, 8)
            .map(item => (
              <CommandItem
                key={item.id}
                value={item.itemName}
                onSelect={() => go('/inventory-v2/stockroom')}
              >
                <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{item.itemName}</span>
                <span className="ml-auto text-xs text-muted-foreground">{item.supplyCategory}</span>
              </CommandItem>
            ))}
        </CommandGroup>

        <CommandGroup heading="Trips">
          {state.trips
            .filter(t => t.status === 'active')
            .map(t => (
              <CommandItem
                key={t.id}
                value={`${t.tailNumber} ${t.tripName ?? ''}`}
                onSelect={() => go(`/inventory-v2/trips/${t.id}`)}
              >
                <Plane className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{t.tailNumber}</span>
                {t.tripName && <span className="ml-1 text-muted-foreground">— {t.tripName}</span>}
                <span className="ml-auto text-xs text-amber-400">Active</span>
              </CommandItem>
            ))}
        </CommandGroup>

        <CommandGroup heading="Inspections">
          {state.inspections.slice(0, 5).map(i => (
            <CommandItem
              key={i.id}
              value={`${i.tailNumber} ${i.reportedBy}`}
              onSelect={() => go(`/inventory-v2/inspection/${i.id}/review`)}
            >
              <ClipboardCheck className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{i.tailNumber}</span>
              <span className="ml-1 text-muted-foreground">— {i.reportedBy}</span>
              <span className="ml-auto text-xs text-muted-foreground">{i.date}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Requests">
          {state.unitItemRequests
            .filter(r => r.status === 'open' || r.status === 'in_progress')
            .slice(0, 5)
            .map(r => {
              const firstItemName = r.items.length > 0
                ? (state.items.find(i => i.id === r.items[0].itemId)?.itemName ?? r.items[0].itemId)
                : 'Request';
              const label = r.items.length > 1 ? `${firstItemName} +${r.items.length - 1} more` : firstItemName;
              return (
                <CommandItem
                  key={r.id}
                  value={`${label} ${r.unitTailNumber}`}
                  onSelect={() => go('/inventory-v2/unit-requests')}
                >
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{label}</span>
                  <span className="ml-1 text-muted-foreground">— {r.unitTailNumber}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">{r.status}</span>
                </CommandItem>
              );
            })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function useInventorySearch() {
  const [open, setOpen] = React.useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(prev => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { open, setOpen };
}
