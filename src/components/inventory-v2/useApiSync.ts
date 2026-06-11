// useApiSync — wraps the reducer dispatch with background API persistence.
//
// Flow: dispatch(action) → reducer runs locally (optimistic UI) → API call fires in background.
// If the API call fails it's logged; the user can refresh to re-sync from /api/state.
// Local-only actions (UI prefs, fleet/PO config, internal counters) are not synced.
//
// For 4 testers this is sufficient. No optimistic rollback, no retry queue.

import { useCallback } from 'react';
import type { InventoryV2Action, InventoryV2State } from './types';
import { api } from './api-client';

export function useApiSync(
  dispatch: React.Dispatch<InventoryV2Action>,
  // Holds the latest committed state. Read synchronously inside the dispatch
  // wrapper (before React re-renders), so it reflects the PRE-dispatch state —
  // which the few multi-entity actions below need to compute their API calls.
  stateRef: React.MutableRefObject<InventoryV2State>
) {
  return useCallback(
    (action: InventoryV2Action) => {
      // Snapshot state before the optimistic update mutates anything downstream.
      const prevState = stateRef.current;

      // 1. Optimistic local update via the reducer
      dispatch(action);

      // 2. Background API persistence
      syncToApi(action, prevState).catch((err) => {
        console.error('[API Sync] Failed to persist action:', action.type, err);
      });
    },
    [dispatch, stateRef]
  );
}

async function syncToApi(action: InventoryV2Action, prevState: InventoryV2State): Promise<void> {
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
    case 'ADVANCE_TO_NEXT_LEG': {
      // Mirrors the reducer: complete the active leg, activate the next one.
      // The affected legs are derived from the pre-dispatch snapshot. Full leg
      // objects are sent so the absolute-set leg route doesn't null other fields.
      const trip = prevState.trips.find((t) => t.id === action.payload);
      if (!trip) return;
      const currentIdx = trip.legs.findIndex((l) => l.status === 'active');
      if (currentIdx === -1) return;
      const activeLeg = trip.legs[currentIdx];
      const nextLeg = trip.legs[currentIdx + 1];
      await api.trips.updateLeg(trip.id, activeLeg.id, {
        ...activeLeg,
        status: 'completed',
        phase: 'complete',
      });
      if (nextLeg) {
        await api.trips.updateLeg(trip.id, nextLeg.id, {
          ...nextLeg,
          status: 'active',
          phase: 'in_flight',
        });
      }
      return;
    }

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
    case 'DISPOSE_EXPIRED_BATCH': {
      // Deletes the batch AND persists the stockroom qty decrement. The full
      // stockroom item (from the pre-dispatch snapshot) is sent with the new qty
      // so the absolute-set route doesn't null parLevel/binLocation/locationId.
      const { batchId, itemId, stockroomId, qty } = action.payload;
      await api.stock.removeBatch(batchId);
      const si = prevState.stockroomItems.find(
        (s) => s.itemId === itemId && s.stockroomId === stockroomId
      );
      if (si) {
        await api.stockroom.updateItem({
          ...si,
          qtyOnHand: Math.max(0, si.qtyOnHand - qty),
        });
      }
      return;
    }

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
