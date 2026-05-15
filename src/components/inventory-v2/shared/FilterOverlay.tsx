import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { MOCK_USERS } from '../constants';
import { Filter } from 'lucide-react';

export interface FilterState {
  unitFilter: string;
  userFilter: string;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_FILTERS: FilterState = {
  unitFilter: '',
  userFilter: 'everyone',
  dateFrom: '',
  dateTo: '',
};

interface FilterOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export default function FilterOverlay({ open, onOpenChange, filters, onFiltersChange }: FilterOverlayProps) {
  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-purple-500" />
            Filters
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label htmlFor="unit-filter">Unit</Label>
            <Input
              id="unit-filter"
              placeholder="e.g. N5PG, N1PG-N2PG"
              value={filters.unitFilter}
              onChange={e => updateFilter('unitFilter', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Single unit, range (N1PG–N6PG), or comma-separated
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-filter">User</Label>
            <Select value={filters.userFilter} onValueChange={(v: string) => updateFilter('userFilter', v)}>
              <SelectTrigger id="user-filter">
                <SelectValue placeholder="Everyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                {MOCK_USERS.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-from">Date From</Label>
            <Input
              id="date-from"
              type="date"
              value={filters.dateFrom}
              onChange={e => updateFilter('dateFrom', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-to">Date To</Label>
            <Input
              id="date-to"
              type="date"
              value={filters.dateTo}
              onChange={e => updateFilter('dateTo', e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={handleReset}>
              Reset
            </Button>
            <Button
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
              onClick={() => onOpenChange(false)}
            >
              Apply
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
