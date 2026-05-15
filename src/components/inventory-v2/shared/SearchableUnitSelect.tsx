// ─── Searchable Aircraft Unit Select ─────────────────────────────────────────

import React, { useState } from 'react';
import { Check, ChevronsUpDown, Plane } from 'lucide-react';
import { cn } from '../../ui/utils';
import { Button } from '../../ui/button';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from '../../ui/command';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '../../ui/popover';
import { FLEET_V2 } from '../constants';

interface SearchableUnitSelectProps {
  value: string;
  onValueChange: (tailNumber: string) => void;
}

export function SearchableUnitSelect({ value, onValueChange }: SearchableUnitSelectProps) {
  const [open, setOpen] = useState(false);

  const selected = FLEET_V2.find((a) => a.tailNumber === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[220px] justify-between"
        >
          <span className="flex items-center gap-2 truncate">
            <Plane className="h-4 w-4 shrink-0 opacity-60" />
            {selected ? selected.displayName : 'Select unit...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search aircraft..." />
          <CommandList>
            <CommandEmpty>No aircraft found.</CommandEmpty>
            <CommandGroup>
              {FLEET_V2.map((aircraft) => (
                <CommandItem
                  key={aircraft.tailNumber}
                  value={aircraft.displayName}
                  onSelect={() => {
                    onValueChange(aircraft.tailNumber);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === aircraft.tailNumber ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <Plane className="mr-2 h-4 w-4 opacity-60" />
                  <span>
                    <span className="font-medium">{aircraft.tailNumber}</span>
                    <span className="ml-1.5 text-muted-foreground">{aircraft.type}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
