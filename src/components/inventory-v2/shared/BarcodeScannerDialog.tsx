// ─── Barcode Scanner Dialog (Simulated for Wireframe) ───────────────────────

import React, { useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../ui/dialog';
import { useInventoryV2 } from '../InventoryV2Context';
import type { InventoryItemV2 } from '../types';

// ─── Props ──────────────────────────────────────────────────────────────────

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemScanned: (itemId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onItemScanned,
}: BarcodeScannerDialogProps) {
  const { state } = useInventoryV2();
  const [scannedItem, setScannedItem] = useState<InventoryItemV2 | null>(null);

  function handleScan() {
    const randomIndex = Math.floor(Math.random() * state.items.length);
    const item = state.items[randomIndex];
    setScannedItem(item);
    onItemScanned(item.id);
  }

  function handleClose() {
    setScannedItem(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Barcode Scanner
          </DialogTitle>
          <DialogDescription>
            Point the camera at an item barcode to scan it.
          </DialogDescription>
        </DialogHeader>

        {/* Simulated viewfinder */}
        <div className="relative mx-auto aspect-[4/3] w-full max-w-[320px] overflow-hidden rounded-xl bg-zinc-900">
          {/* Corner brackets */}
          <div className="absolute inset-4 rounded-lg border-2 border-white/20" />

          {/* Animated scan line */}
          <div
            className="absolute left-4 right-4 h-0.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
            style={{
              animation: 'scanLine 2s ease-in-out infinite',
            }}
          />

          {/* Center crosshair text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-white/40 tracking-wider uppercase">
              Simulated Camera
            </span>
          </div>

          {/* Inline keyframes */}
          <style>{`
            @keyframes scanLine {
              0%, 100% { top: 16px; }
              50% { top: calc(100% - 16px); }
            }
          `}</style>
        </div>

        {/* Scan button */}
        {!scannedItem && (
          <Button onClick={handleScan} className="w-full">
            Scan Item
          </Button>
        )}

        {/* Scanned item info card */}
        {scannedItem && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1">
            <p className="text-sm font-semibold text-emerald-400">Item Scanned</p>
            <p className="text-sm font-medium">{scannedItem.itemName}</p>
            {scannedItem.vendorItemNumber && (
              <p className="text-xs text-muted-foreground">
                Vendor #: {scannedItem.vendorItemNumber}
              </p>
            )}
            {scannedItem.internalItemNumber && (
              <p className="text-xs text-muted-foreground">
                Internal #: {scannedItem.internalItemNumber}
              </p>
            )}
          </div>
        )}

        {/* Close button */}
        <Button variant="outline" onClick={handleClose} className="w-full">
          <X className="mr-2 h-4 w-4" />
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
