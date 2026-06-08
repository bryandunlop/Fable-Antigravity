// useApiSync — wraps the reducer dispatch with background API persistence.
//
// Flow: dispatch(action) → reducer runs locally (optimistic UI) → API call fires in background.
// If the API call fails it's logged; the user can refresh to re-sync from /api/state.
// Local-only actions (UI prefs, fleet/PO config, internal counters) are not synced.
//
// For 4 testers this is sufficient. No optimistic rollback, no retry queue.

import { useCallback } from 'react';
import type { InventoryV2Action } from './types';
import { api } from './api-client';

export function useApiSync(dispatch: React.Dispatch<InventoryV2Action>) {
  return useCallback(
    (action: InventoryV2Action) => {
      // 1. Optimistic local update via the reducer
      dispatch(action);

      // 2. Background API persistence
      syncToApi(action).catch((err) => {
        console.error('[API Sync] Failed to persist action:', action.type, err);
      });
    },
    [dispatch]
  );
}

async function syncToApi(action: InventoryV2Action): Promise<void> {
  switch (action.type) {
    // ── Items ─────────────────────────────────────────────────────────────
    case 'ADD_ITEM':
      await api.items.create(action.payload);
      return;
    case 'UPDATE_ITEM':
      await api.items.update(action.payload.id, action.payload);
      return;
    case 'REMOVE_ITEM':
      await api.items.delete(action.payload);
      return;
    case 'SET_ITEMS':
      // Full replace — only used for initial load; skip API sync
      return;

    // ── Stockroom ─────────────────────────────────────────────────────────
    case 'UPDATE_STOCKROOM_ITEM':
      await api.stockroom.updateItem(action.payload);
      return;
    case 'BULK_UPDATE_STOCKROOM':
      await api.stockroom.bulkUpdate(action.payload);
      return;
    case 'SET_STOCKROOM_ITEMS':
      return;

    // ── Inspections ───────────────────────────────────────────────────────
    case 'ADD_INSPECTION':
      await api.inspections.create(action.payload);
      return;
    case 'UPDATE_INSPECTION':
      await api.inspections.update(action.payload.id, action.payload);
      return;
    case 'SET_INSPECTIONS':
      return;

    // ── Pick & Restock ────────────────────────────────────────────────────
    case 'ADD_PICK_ITEMS':
      await api.pickRestock.addPickItems(action.payload);
      return;
    case 'UPDATE_PICK_ITEM':
      await api.pickRestock.updatePickItem(action.payload.id, action.payload);
      return;
    case 'SET_PICK_LIST':
      return;
    case 'SET_RESTOCK_LIST':
      await api.pickRestock.setRestockList(action.payload);
      return;
    case 'UPDATE_RESTOCK_ITEM':
      await api.pickRestock.updateRestockItem(action.payload.id, action.payload);
      return;

    // ── Requests ──────────────────────────────────────────────────────────
    case 'ADD_UNIT_REQUEST':
      await api.requests.create(action.payload);
      return;
    case 'UPDATE_UNIT_REQUEST':
      await api.requests.update(action.payload.id, action.payload);
      return;

    // ── Activity log ──────────────────────────────────────────────────────
    case 'ADD_ACTIVITY_LOG':
      await api.activity.add(action.payload);
      return;

    // ── Trips ─────────────────────────────────────────────────────────────
    case 'ADD_TRIP':
      await api.trips.create(action.payload);
      return;
    case 'UPDATE_TRIP':
      await api.trips.update(action.payload.id, action.payload);
      return;
    case 'COMPLETE_TRIP':
      await api.trips.complete(action.payload);
      return;
    case 'REOPEN_TRIP':
      await api.trips.reopen(action.payload);
      return;

    // ── Legs ──────────────────────────────────────────────────────────────
    case 'UPDATE_LEG':
      await api.trips.updateLeg(
        action.payload.tripId,
        action.payload.leg.id,
        action.payload.leg
      );
      return;
    case 'COMPLETE_LEG':
      await api.trips.updateLeg(action.payload.tripId, action.payload.legId, {
        status: 'completed',
      });
      return;
    case 'SET_LEG_PHASE':
      await api.trips.setLegPhase(
        action.payload.tripId,
        action.payload.legId,
        action.payload.phase
      );
      return;
    case 'ADD_LEG_TO_TRIP':
      await api.trips.addLeg(action.payload.tripId, action.payload.leg);
      return;
    case 'ADVANCE_TO_NEXT_LEG':
      // Modifies multiple legs in one reducer pass. State will be correct on next /api/state load.
      console.warn('[API Sync] ADVANCE_TO_NEXT_LEG — not synced; reconcile on reload');
      return;

    // ── Usage tracking ────────────────────────────────────────────────────
    case 'ADD_USAGE_LOG_ENTRY':
      await api.trips.addUsageEntry(
        action.payload.tripId,
        action.payload.legId,
        action.payload.entry
      );
      return;
    case 'UPDATE_USAGE_LOG_ENTRY':
      await api.trips.updateUsageEntry(
        action.payload.tripId,
        action.payload.legId,
        action.payload.entry.id,
        action.payload.entry
      );
      return;
    case 'REMOVE_USAGE_LOG_ENTRY':
      await api.trips.removeUsageEntry(
        action.payload.tripId,
        action.payload.legId,
        action.payload.entryId
      );
      return;

    // ── Grocery lists ─────────────────────────────────────────────────────
    case 'ADD_GROCERY_LIST':
      await api.grocery.create(action.payload);
      return;
    case 'UPDATE_GROCERY_LIST':
      await api.grocery.update(action.payload.id, action.payload);
      return;
    case 'SEND_GROCERY_LIST':
      await api.grocery.send(action.payload);
      return;
    case 'FULFILL_GROCERY_LIST':
      await api.grocery.fulfill(action.payload);
      return;

    // ── Trip notes ────────────────────────────────────────────────────────
    case 'ADD_TRIP_NOTE':
      await api.trips.addNote(action.payload.tripId, action.payload.note);
      return;

    // ── Stock batches ─────────────────────────────────────────────────────
    case 'ADD_STOCK_BATCH':
      await api.stock.addBatch(action.payload);
      return;
    case 'UPDATE_STOCK_BATCH':
      await api.stock.updateBatch(action.payload.id, action.payload);
      return;
    case 'REMOVE_STOCK_BATCH':
      await api.stock.removeBatch(action.payload);
      return;
    case 'DISPOSE_EXPIRED_BATCH':
      // Deletes batch + decrements stockroom qty. Only the batch delete is synced here;
      // the local reducer adjusts stockroom qty optimistically and will reconcile on reload.
      await api.stock.removeBatch(action.payload.batchId);
      return;

    // ── Trip load & return ────────────────────────────────────────────────
    case 'ADD_TRIP_LOAD_ITEMS':
      await api.trips.addLoadItems(action.payload.tripId, action.payload.items);
      return;
    case 'ADD_TRIP_RETURN_ITEMS':
      await api.trips.addReturnItems(action.payload.tripId, action.payload.items);
      if (action.payload.stockroomUpdates?.length) {
        await api.stockroom.bulkUpdate(action.payload.stockroomUpdates);
      }
      return;

    // ── Alert thresholds ──────────────────────────────────────────────────
    case 'ADD_ALERT_THRESHOLD':
      await api.stock.addAlertThreshold(action.payload);
      return;
    case 'REMOVE_ALERT_THRESHOLD':
      await api.stock.removeAlertThreshold(action.payload);
      return;

    // ── Storage locations ─────────────────────────────────────────────────
    case 'ADD_STORAGE_LOCATION':
      await api.storageLocations.create(action.payload);
      return;
    case 'UPDATE_STORAGE_LOCATION':
      await api.storageLocations.update(action.payload.id, action.payload);
      return;
    case 'REMOVE_STORAGE_LOCATION':
      await api.storageLocations.delete(action.payload);
      return;
    case 'REORDER_STORAGE_LOCATIONS':
      await api.storageLocations.reorder(action.payload);
      return;

    // ── Local-only (no API persistence) ───────────────────────────────────
    case 'SET_FLEET':
    case 'ADD_FLEET_UNIT':
    case 'UPDATE_FLEET_UNIT':
    case 'REMOVE_FLEET_UNIT':
    case 'SET_COMPARTMENT_CONFIGS':
    case 'SET_DISPLAY_SETTINGS':
    case 'SET_CURRENT_USER':
    case 'SET_PURCHASE_ORDERS':
    case 'UPDATE_PURCHASE_ORDER':
    case 'INCREMENT_PENDING_CHANGES':
    case 'RESET_PENDING_CHANGES':
    case 'RESET_STATE':
    case 'TOGGLE_FAVORITE_ITEM':
    case 'SET_QUICK_ADD_ITEMS':
      // Fleet is seeded once and rarely changes; POs are descoped; favorites and quick-add are local UI.
      // RESET_STATE is fired by the provider on initial /api/state load.
      return;

    default: {
      // Exhaustiveness check: TypeScript flags any unhandled action type.
      const _exhaustive: never = action;
      console.warn('[API Sync] Unhandled action type:', (_exhaustive as InventoryV2Action).type);
    }
  }
}
