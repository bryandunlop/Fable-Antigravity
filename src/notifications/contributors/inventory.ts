import type { FeedItem } from '../types';
import { defaultStorage, type StorageLike } from '../storage';

const AUDIENCE = ['inflight', 'fa', 'lead-fa', 'commissary-manager', 'admin', 'lead'];

interface StoredInventoryState {
  items?: { id: string; itemName: string }[];
  stockroomItems?: { itemId: string; stockroomId: string; qtyOnHand: number; minimumLevel: number; parLevel: number }[];
  inspections?: { id: string; tailNumber: string; status: string }[];
  groceryLists?: { id: string; tailNumber?: string; generatedBy?: string; status: string; items?: unknown[] }[];
}

export function buildInventoryFeed(
  userRole: string,
  _nowUtc: string,
  storage: StorageLike | null = defaultStorage(),
): FeedItem[] {
  if (!AUDIENCE.includes(userRole) || !storage) return [];
  let state: StoredInventoryState;
  try {
    state = JSON.parse(storage.getItem('inv-v2-state') ?? 'null');
  } catch {
    return [];
  }
  if (!state) return [];

  const out: FeedItem[] = [];
  const itemName = (id: string) => state.items?.find(i => i.id === id)?.itemName ?? id;

  for (const si of state.stockroomItems ?? []) {
    if (si.qtyOnHand <= si.minimumLevel) {
      out.push({
        id: `inv-min:${si.stockroomId}:${si.itemId}`,
        severity: 'critical',
        title: `${itemName(si.itemId)} critically low`,
        detail: `${si.qtyOnHand} on hand (minimum: ${si.minimumLevel})`,
        module: 'Inventory',
        link: '/inventory-v2/commissary',
      });
    } else if (si.qtyOnHand < si.parLevel) {
      out.push({
        id: `inv-par:${si.stockroomId}:${si.itemId}`,
        severity: 'warn',
        title: `${itemName(si.itemId)} below par`,
        detail: `${si.qtyOnHand} on hand (par: ${si.parLevel})`,
        module: 'Inventory',
        link: '/inventory-v2/commissary',
      });
    }
  }

  for (const insp of state.inspections ?? []) {
    if (insp.status !== 'restocking_needed') continue;
    out.push({
      id: `inv-inspection:${insp.id}`,
      severity: 'warn',
      title: `Restocking needed on ${insp.tailNumber}`,
      detail: 'Inspection found items below par.',
      module: 'Inventory',
      link: '/inventory-v2/replenish',
    });
  }

  for (const gl of state.groceryLists ?? []) {
    if (!gl || gl.status !== 'sent') continue;
    const itemCount = gl.items?.length ?? 0;
    out.push({
      id: `inv-grocery:${gl.id}`,
      severity: 'info',
      title: `Grocery list from ${gl.generatedBy ?? 'FA'}${gl.tailNumber ? ` for ${gl.tailNumber}` : ''}`,
      detail: `${itemCount} item${itemCount !== 1 ? 's' : ''} requested`,
      module: 'Inventory',
      link: '/inventory-v2/commissary',
    });
  }

  return out;
}
