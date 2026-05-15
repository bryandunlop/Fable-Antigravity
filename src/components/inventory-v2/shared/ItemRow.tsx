// ─── Reusable Item Row ──────────────────────────────────────────────────────

import React from 'react';
import { Package, Minus, Plus, Flag } from 'lucide-react';
import { cn } from '../../ui/utils';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';
import type { InventoryItemV2, DisplaySettings } from '../types';

// ─── Props ──────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: InventoryItemV2;
  qtyValue: number;
  requiredQty: number;
  onQtyChange: (qty: number) => void;
  showDone?: boolean;
  doneChecked?: boolean;
  onDoneChange?: (checked: boolean) => void;
  showWorkOrder?: boolean;
  workOrderChecked?: boolean;
  onWorkOrderChange?: (checked: boolean) => void;
  showNotes?: boolean;
  notesValue?: string;
  onNotesChange?: (notes: string) => void;
  displaySettings?: DisplaySettings;
  readOnly?: boolean;
  minQty?: number;
  maxQty?: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ItemRow({
  item,
  qtyValue,
  requiredQty,
  onQtyChange,
  showDone = false,
  doneChecked = false,
  onDoneChange,
  showWorkOrder = false,
  workOrderChecked = false,
  onWorkOrderChange,
  showNotes = false,
  notesValue = '',
  onNotesChange,
  displaySettings,
  readOnly = false,
  minQty = 0,
  maxQty = 999,
}: ItemRowProps) {
  const hideNameOnPhone = displaySettings?.hideItemNamesOnPhone ?? false;
  const hideDesc = displaySettings?.hideDescriptions ?? false;

  function decrement() {
    if (!readOnly && qtyValue > minQty) onQtyChange(qtyValue - 1);
  }

  function increment() {
    if (!readOnly && qtyValue < maxQty) onQtyChange(qtyValue + 1);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/40 bg-card/40 p-3">
      {/* Main row */}
      <div className="flex items-center gap-3">
        {/* Done checkbox */}
        {showDone && (
          <Checkbox
            checked={doneChecked}
            onCheckedChange={(v: boolean) => onDoneChange?.(v === true)}
            disabled={readOnly}
            className="shrink-0"
          />
        )}

        {/* Thumbnail placeholder */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted/60">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.itemName}
              className="h-full w-full rounded-md object-cover"
            />
          ) : (
            <Package className="h-5 w-5 text-muted-foreground/60" />
          )}
        </div>

        {/* Name + description */}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-sm font-medium',
              hideNameOnPhone && 'hidden md:block',
            )}
          >
            {item.itemName}
          </p>
          {!hideDesc && item.description && (
            <p className="truncate text-xs text-muted-foreground">{item.description}</p>
          )}
        </div>

        {/* Required qty label */}
        <span className="shrink-0 text-xs text-muted-foreground">
          Req: {requiredQty}
        </span>

        {/* Qty stepper */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={decrement}
            disabled={readOnly || qtyValue <= minQty}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">
            {qtyValue}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={increment}
            disabled={readOnly || qtyValue >= maxQty}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* UOM badge */}
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {item.uom}
        </Badge>

        {/* Work order flag */}
        {showWorkOrder && (
          <Button
            variant={workOrderChecked ? 'default' : 'outline'}
            size="icon"
            className={cn('h-7 w-7 shrink-0', workOrderChecked && 'bg-amber-500 hover:bg-amber-600')}
            onClick={() => onWorkOrderChange?.(!workOrderChecked)}
            disabled={readOnly}
            title="Flag for work order"
          >
            <Flag className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Notes row */}
      {showNotes && (
        <Input
          placeholder="Notes..."
          value={notesValue}
          onChange={(e) => onNotesChange?.(e.target.value)}
          disabled={readOnly}
          className="h-8 text-xs"
        />
      )}
    </div>
  );
}
