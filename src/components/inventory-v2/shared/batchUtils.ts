// src/components/inventory-v2/shared/batchUtils.ts

import type { StockBatch } from '../types';

interface DeductResult {
  updatedBatches: StockBatch[];
  depletedBatchIds: string[];
}

export function deductFromBatches(
  allBatches: StockBatch[],
  itemId: string,
  stockroomId: string,
  qty: number
): DeductResult {
  if (qty <= 0) return { updatedBatches: allBatches, depletedBatchIds: [] };

  const itemBatches = allBatches
    .filter(b => b.itemId === itemId && b.stockroomId === stockroomId)
    .sort((a, b) => {
      if (!a.expirationDate && !b.expirationDate) return 0;
      if (!a.expirationDate) return 1;
      if (!b.expirationDate) return -1;
      return a.expirationDate.localeCompare(b.expirationDate);
    });

  let remaining = qty;
  const depletedBatchIds: string[] = [];
  const updatedItemBatches = new Map<string, StockBatch>();

  for (const batch of itemBatches) {
    if (remaining <= 0) {
      updatedItemBatches.set(batch.id, batch);
      continue;
    }
    const deduct = Math.min(remaining, batch.quantity);
    remaining -= deduct;
    const newQty = batch.quantity - deduct;
    if (newQty <= 0) {
      depletedBatchIds.push(batch.id);
    } else {
      updatedItemBatches.set(batch.id, { ...batch, quantity: newQty });
    }
  }

  const updatedBatches = allBatches
    .filter(b => !depletedBatchIds.includes(b.id))
    .map(b => updatedItemBatches.get(b.id) ?? b);

  return { updatedBatches, depletedBatchIds };
}
