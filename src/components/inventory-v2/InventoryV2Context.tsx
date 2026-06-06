// ─── Inventory V2 — React Context ───────────────────────────────────────────

import React, { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react';
import type { InventoryV2State, InventoryV2Action, StockroomItem } from './types';
import type { Notification } from '../contexts/NotificationContext';
import { SYSTEM_USERS } from '../../lib/mockUsers';
import { ITEMS_V2, MOCK_INSPECTIONS, STOCKROOMS, STOCKROOM_ITEMS, MOCK_PICK_LIST, MOCK_RESTOCK_LIST, MOCK_UNIT_REQUESTS, MOCK_PURCHASE_ORDERS, STOCK_BATCHES } from './mockData';
import { MOCK_TRIPS, MOCK_GROCERY_LISTS } from './mockTrips';
import { FLEET_V2 } from './constants';
import { loadCompartmentConfigs } from './compartmentConfig';
import { deductFromBatches } from './shared/batchUtils';

// ─── Storage Keys ───────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'inv-v2-';
const STORAGE_KEY = `${STORAGE_PREFIX}state`;
// Bump this string any time mock data changes to force a fresh load
const DATA_VERSION = '2026-06-03-v3';
const VERSION_KEY = `${STORAGE_PREFIX}data-version`;

// ─── Initial State ──────────────────────────────────────────────────────────

function loadInitialState(): InventoryV2State {
  try {
    // If the stored data version doesn't match, discard old state and reload from mock data
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== DATA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
      return getDefaultState();
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge stored state with defaults for any missing keys
      return {
        ...getDefaultState(),
        ...parsed,
      };
    }
  } catch {
    // fall through to defaults
  }
  return getDefaultState();
}

function getDefaultState(): InventoryV2State {
  return {
    fleet: FLEET_V2,
    items: ITEMS_V2,
    stockLog: [],
    inspections: MOCK_INSPECTIONS,
    stockrooms: STOCKROOMS,
    stockroomItems: STOCKROOM_ITEMS,
    pickListItems: MOCK_PICK_LIST,
    restockListItems: MOCK_RESTOCK_LIST,
    unitItemRequests: MOCK_UNIT_REQUESTS,
    purchaseOrders: MOCK_PURCHASE_ORDERS,
    compartmentConfigs: loadCompartmentConfigs(),
    displaySettings: {
      hideItemNamesOnPhone: false,
      hideDescriptions: false,
    },
    currentUser: {
      id: SYSTEM_USERS[0].id,
      name: SYSTEM_USERS[0].name,
      email: SYSTEM_USERS[0].email,
      role: SYSTEM_USERS[0].roles[0],
      roles: SYSTEM_USERS[0].roles,
      department: SYSTEM_USERS[0].department,
    },
    alertThresholds: [],
    pendingChanges: 0,
    trips: MOCK_TRIPS,
    groceryLists: MOCK_GROCERY_LISTS,
    stockBatches: STOCK_BATCHES,
  };
}

// ─── Reducer ────────────────────────────────────────────────────────────────

function inventoryReducer(state: InventoryV2State, action: InventoryV2Action): InventoryV2State {
  switch (action.type) {
    // ── Fleet ──
    case 'SET_FLEET':
      return { ...state, fleet: action.payload };
    case 'ADD_FLEET_UNIT':
      return { ...state, fleet: [...state.fleet, action.payload] };
    case 'UPDATE_FLEET_UNIT':
      return { ...state, fleet: state.fleet.map(f => f.tailNumber === action.payload.tailNumber ? action.payload : f) };
    case 'REMOVE_FLEET_UNIT':
      return { ...state, fleet: state.fleet.filter(f => f.tailNumber !== action.payload) };

    // ── Items ──
    case 'SET_ITEMS':
      return { ...state, items: action.payload };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    case 'UPDATE_ITEM':
      return { ...state, items: state.items.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.payload) };

    // ── Stock Log ──
    case 'ADD_STOCK_LOG':
      return { ...state, stockLog: [action.payload, ...state.stockLog].slice(0, 200) };

    case 'SET_INSPECTIONS':
      return { ...state, inspections: action.payload };

    case 'ADD_INSPECTION':
      return { ...state, inspections: [...state.inspections, action.payload] };

    case 'UPDATE_INSPECTION':
      return {
        ...state,
        inspections: state.inspections.map(i =>
          i.id === action.payload.id ? action.payload : i
        ),
      };

    case 'SET_STOCKROOM_ITEMS':
      return { ...state, stockroomItems: action.payload };

    case 'UPDATE_STOCKROOM_ITEM': {
      const newStockroomItems = state.stockroomItems.map(si =>
        si.itemId === action.payload.itemId && si.stockroomId === action.payload.stockroomId
          ? action.payload
          : si
      );
      return { ...state, stockroomItems: newStockroomItems, pendingChanges: state.pendingChanges + 1 };
    }

    case 'BULK_UPDATE_STOCKROOM': {
      const newStockroomItems = state.stockroomItems.map(si => {
        const updated = action.payload.find(
          u => u.itemId === si.itemId && u.stockroomId === si.stockroomId
        );
        return updated ?? si;
      });

      // FIFO batch deduction for items where qty decreased
      let updatedBatches = state.stockBatches;
      for (const updated of action.payload) {
        const original = state.stockroomItems.find(
          si => si.itemId === updated.itemId && si.stockroomId === updated.stockroomId
        );
        if (original && updated.qtyOnHand < original.qtyOnHand) {
          const deducted = original.qtyOnHand - updated.qtyOnHand;
          const result = deductFromBatches(updatedBatches, updated.itemId, updated.stockroomId, deducted);
          updatedBatches = result.updatedBatches;
        }
      }

      return { ...state, stockroomItems: newStockroomItems, stockBatches: updatedBatches, pendingChanges: state.pendingChanges + 1 };
    }

    case 'SET_PICK_LIST':
      return { ...state, pickListItems: action.payload };

    case 'UPDATE_PICK_ITEM':
      return {
        ...state,
        pickListItems: state.pickListItems.map(pl =>
          pl.id === action.payload.id ? action.payload : pl
        ),
      };

    case 'ADD_PICK_ITEMS':
      return { ...state, pickListItems: [...state.pickListItems, ...action.payload] };

    case 'SET_RESTOCK_LIST':
      return { ...state, restockListItems: action.payload };

    case 'UPDATE_RESTOCK_ITEM':
      return {
        ...state,
        restockListItems: state.restockListItems.map(rl =>
          rl.id === action.payload.id ? action.payload : rl
        ),
      };

    case 'ADD_UNIT_REQUEST':
      return { ...state, unitItemRequests: [...state.unitItemRequests, action.payload] };

    case 'UPDATE_UNIT_REQUEST':
      return {
        ...state,
        unitItemRequests: state.unitItemRequests.map(r =>
          r.id === action.payload.id ? action.payload : r
        ),
      };

    case 'SET_PURCHASE_ORDERS':
      return { ...state, purchaseOrders: action.payload };

    case 'UPDATE_PURCHASE_ORDER':
      return {
        ...state,
        purchaseOrders: state.purchaseOrders.map(po =>
          po.id === action.payload.id ? action.payload : po
        ),
      };

    case 'SET_COMPARTMENT_CONFIGS':
      return { ...state, compartmentConfigs: action.payload };

    case 'SET_DISPLAY_SETTINGS':
      return { ...state, displaySettings: action.payload };

    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };

    case 'ADD_ALERT_THRESHOLD': {
      const existing = state.alertThresholds.findIndex(
        t => t.userId === action.payload.userId && t.itemId === action.payload.itemId
      );
      const updatedThresholds = existing >= 0
        ? state.alertThresholds.map((t, i) => i === existing ? action.payload : t)
        : [...state.alertThresholds, action.payload];

      return { ...state, alertThresholds: updatedThresholds };
    }

    case 'REMOVE_ALERT_THRESHOLD':
      return { ...state, alertThresholds: state.alertThresholds.filter(t => t.id !== action.payload) };

    case 'INCREMENT_PENDING_CHANGES':
      return { ...state, pendingChanges: state.pendingChanges + 1 };

    case 'RESET_PENDING_CHANGES':
      return { ...state, pendingChanges: 0 };

    case 'RESET_STATE':
      return action.payload;

    // ── Trip lifecycle ──
    case 'ADD_TRIP':
      return { ...state, trips: [...state.trips, action.payload], pendingChanges: state.pendingChanges + 1 };

    case 'UPDATE_TRIP':
      return {
        ...state,
        trips: state.trips.map(t => t.id === action.payload.id ? action.payload : t),
        pendingChanges: state.pendingChanges + 1,
      };

    case 'COMPLETE_TRIP': {
      return {
        ...state,
        trips: state.trips.map(t =>
          t.id === action.payload
            ? { ...t, status: 'completed' as const, endDate: new Date().toISOString() }
            : t
        ),
        pendingChanges: state.pendingChanges + 1,
      };
    }

    // ── Leg lifecycle ──
    case 'UPDATE_LEG': {
      return {
        ...state,
        trips: state.trips.map(t =>
          t.id === action.payload.tripId
            ? { ...t, legs: t.legs.map(l => l.id === action.payload.leg.id ? action.payload.leg : l) }
            : t
        ),
        pendingChanges: state.pendingChanges + 1,
      };
    }

    case 'COMPLETE_LEG': {
      return {
        ...state,
        trips: state.trips.map(t =>
          t.id === action.payload.tripId
            ? {
                ...t,
                legs: t.legs.map(l =>
                  l.id === action.payload.legId ? { ...l, status: 'completed' as const } : l
                ),
              }
            : t
        ),
        pendingChanges: state.pendingChanges + 1,
      };
    }

    case 'ADVANCE_TO_NEXT_LEG': {
      return {
        ...state,
        trips: state.trips.map(t => {
          if (t.id !== action.payload) return t;
          const currentIdx = t.legs.findIndex(l => l.status === 'active');
          if (currentIdx === -1) return t;
          return {
            ...t,
            legs: t.legs.map((l, i) => {
              if (i === currentIdx) return { ...l, status: 'completed' as const, phase: 'complete' as const };
              if (i === currentIdx + 1) return { ...l, status: 'active' as const, phase: 'in_flight' as const };
              return l;
            }),
          };
        }),
        pendingChanges: state.pendingChanges + 1,
      };
    }

    case 'SET_LEG_PHASE': {
      return {
        ...state,
        trips: state.trips.map(t =>
          t.id === action.payload.tripId
            ? {
                ...t,
                legs: t.legs.map(l =>
                  l.id === action.payload.legId ? { ...l, phase: action.payload.phase } : l
                ),
              }
            : t
        ),
        pendingChanges: state.pendingChanges + 1,
      };
    }

    case 'ADD_LEG_TO_TRIP': {
      return {
        ...state,
        trips: state.trips.map(t =>
          t.id === action.payload.tripId
            ? { ...t, legs: [...t.legs, action.payload.leg] }
            : t
        ),
        pendingChanges: state.pendingChanges + 1,
      };
    }

    // ── Usage tracking ──
    case 'ADD_USAGE_LOG_ENTRY': {
      return {
        ...state,
        trips: state.trips.map(t =>
          t.id === action.payload.tripId
            ? {
                ...t,
                legs: t.legs.map(l =>
                  l.id === action.payload.legId
                    ? { ...l, usageLog: [...l.usageLog, action.payload.entry] }
                    : l
                ),
              }
            : t
        ),
        pendingChanges: state.pendingChanges + 1,
      };
    }

    case 'UPDATE_USAGE_LOG_ENTRY': {
      return {
        ...state,
        trips: state.trips.map(t =>
          t.id === action.payload.tripId
            ? {
                ...t,
                legs: t.legs.map(l =>
                  l.id === action.payload.legId
                    ? {
                        ...l,
                        usageLog: l.usageLog.map(e =>
                          e.id === action.payload.entry.id ? action.payload.entry : e
                        ),
                      }
                    : l
                ),
              }
            : t
        ),
        pendingChanges: state.pendingChanges + 1,
      };
    }

    case 'REMOVE_USAGE_LOG_ENTRY': {
      return {
        ...state,
        trips: state.trips.map(t =>
          t.id === action.payload.tripId
            ? {
                ...t,
                legs: t.legs.map(l =>
                  l.id === action.payload.legId
                    ? { ...l, usageLog: l.usageLog.filter(e => e.id !== action.payload.entryId) }
                    : l
                ),
              }
            : t
        ),
        pendingChanges: state.pendingChanges + 1,
      };
    }

    // ── Grocery lists ──
    case 'ADD_GROCERY_LIST':
      return { ...state, groceryLists: [...state.groceryLists, action.payload], pendingChanges: state.pendingChanges + 1 };

    case 'UPDATE_GROCERY_LIST':
      return {
        ...state,
        groceryLists: state.groceryLists.map(gl => gl.id === action.payload.id ? action.payload : gl),
        pendingChanges: state.pendingChanges + 1,
      };

    case 'SEND_GROCERY_LIST':
      return {
        ...state,
        groceryLists: state.groceryLists.map(gl =>
          gl.id === action.payload ? { ...gl, status: 'sent' as const } : gl
        ),
        pendingChanges: state.pendingChanges + 1,
      };

    case 'FULFILL_GROCERY_LIST':
      return {
        ...state,
        groceryLists: state.groceryLists.map(gl =>
          gl.id === action.payload ? { ...gl, status: 'fulfilled' as const } : gl
        ),
        pendingChanges: state.pendingChanges + 1,
      };

    // ── Trip notes ──
    case 'ADD_TRIP_NOTE': {
      const { tripId, note } = action.payload;
      return {
        ...state,
        trips: state.trips.map(t => {
          if (t.id !== tripId) return t;
          if (note.legId) {
            return {
              ...t,
              legs: t.legs.map(l =>
                l.id === note.legId ? { ...l, notes: [...l.notes, note] } : l
              ),
            };
          }
          return { ...t, notes: [...t.notes, note] };
        }),
        pendingChanges: state.pendingChanges + 1,
      };
    }

    // ── Stock batches ──
    case 'ADD_STOCK_BATCH':
      return { ...state, stockBatches: [...state.stockBatches, action.payload], pendingChanges: state.pendingChanges + 1 };

    case 'UPDATE_STOCK_BATCH':
      return {
        ...state,
        stockBatches: state.stockBatches.map(sb => sb.id === action.payload.id ? action.payload : sb),
        pendingChanges: state.pendingChanges + 1,
      };

    case 'REMOVE_STOCK_BATCH':
      return {
        ...state,
        stockBatches: state.stockBatches.filter(sb => sb.id !== action.payload),
        pendingChanges: state.pendingChanges + 1,
      };

    case 'DISPOSE_EXPIRED_BATCH': {
      const { batchId, itemId, stockroomId, qty } = action.payload;
      const newBatches = state.stockBatches.filter(sb => sb.id !== batchId);
      const newStockroomItems = state.stockroomItems.map(si =>
        si.itemId === itemId && si.stockroomId === stockroomId
          ? { ...si, qtyOnHand: Math.max(0, si.qtyOnHand - qty) }
          : si
      );
      return {
        ...state,
        stockBatches: newBatches,
        stockroomItems: newStockroomItems,
        pendingChanges: state.pendingChanges + 1,
      };
    }

    case 'ADD_TRIP_LOAD_ITEMS': {
      const { tripId, items } = action.payload;
      const commissaryItems = items.filter(li => li.source === 'commissary');
      // Update stockroom quantities for commissary-sourced loads
      let newStockroomItems = state.stockroomItems;
      if (commissaryItems.length > 0) {
        newStockroomItems = state.stockroomItems.map(si => {
          const loadQty = commissaryItems
            .filter(li => li.itemId === si.itemId)
            .reduce((sum, li) => sum + li.qty, 0);
          if (loadQty === 0) return si;
          return { ...si, qtyOnHand: Math.max(0, si.qtyOnHand - loadQty) };
        });
      }
      // Deduct from batches FIFO for items loaded from commissary
      let updatedBatches = state.stockBatches;
      for (const li of commissaryItems) {
        const result = deductFromBatches(updatedBatches, li.itemId, 'sr-1', li.qty);
        updatedBatches = result.updatedBatches;
      }

      const newTrips = state.trips.map(t =>
        t.id === tripId
          ? { ...t, loadItems: [...t.loadItems, ...items] }
          : t
      );
      return {
        ...state,
        trips: newTrips,
        stockroomItems: newStockroomItems,
        stockBatches: updatedBatches,
        pendingChanges: state.pendingChanges + 1,
      };
    }

    case 'ADD_TRIP_RETURN_ITEMS': {
      const { tripId, items, stockroomUpdates } = action.payload;
      const newStockroomItems = state.stockroomItems.map(si => {
        const updated = stockroomUpdates.find(
          u => u.itemId === si.itemId && u.stockroomId === si.stockroomId
        );
        return updated ?? si;
      });
      const newTrips = state.trips.map(t =>
        t.id === tripId
          ? { ...t, returnItems: [...t.returnItems, ...items] }
          : t
      );
      return {
        ...state,
        trips: newTrips,
        stockroomItems: newStockroomItems,
        pendingChanges: state.pendingChanges + 1,
      };
    }

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

interface InventoryV2ContextValue {
  state: InventoryV2State;
  dispatch: React.Dispatch<InventoryV2Action>;
}

const InventoryV2Context = createContext<InventoryV2ContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

interface InventoryV2ProviderProps {
  children: ReactNode;
  userRole?: string;
  addNotification?: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
}

export function InventoryV2Provider({ children, userRole, addNotification }: InventoryV2ProviderProps) {
  const [state, dispatch] = useReducer(inventoryReducer, undefined, loadInitialState);

  // Keep addNotification ref stable so useEffect deps don't change on every render
  const addNotifRef = useRef(addNotification);
  addNotifRef.current = addNotification;

  // Bridge app-level login role into context on mount
  useEffect(() => {
    if (!userRole) return;
    const match = SYSTEM_USERS.find(u => u.roles.includes(userRole));
    if (match) {
      dispatch({
        type: 'SET_CURRENT_USER',
        payload: {
          id: match.id,
          name: match.name,
          email: match.email,
          role: userRole,
          roles: match.roles,
          department: match.department,
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  // Persist state to localStorage on every change (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // storage full or unavailable — silently ignore
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [state]);

  // Fire global notifications when stockroom qty drops below thresholds
  const prevStockroomItemsRef = useRef<StockroomItem[]>(state.stockroomItems);

  useEffect(() => {
    const prev = prevStockroomItemsRef.current;
    prevStockroomItemsRef.current = state.stockroomItems;
    if (!addNotifRef.current) return;
    const addNotif = addNotifRef.current;

    for (const si of state.stockroomItems) {
      const prevSi = prev.find(p => p.itemId === si.itemId && p.stockroomId === si.stockroomId);
      if (!prevSi || si.qtyOnHand >= prevSi.qtyOnHand) continue; // only fire on qty decrease
      const item = state.items.find(i => i.id === si.itemId);
      if (!item) continue;
      if (si.qtyOnHand <= si.minimumLevel) {
        addNotif({
          type: 'inventory',
          priority: 'critical',
          title: `${item.itemName} critically low`,
          message: `${si.qtyOnHand} on hand (minimum: ${si.minimumLevel})`,
          module: 'Inventory',
          actionUrl: '/inventory-v2/commissary',
        });
      } else if (si.qtyOnHand < si.parLevel) {
        addNotif({
          type: 'inventory',
          priority: 'medium',
          title: `${item.itemName} below par`,
          message: `${si.qtyOnHand} on hand (par: ${si.parLevel})`,
          module: 'Inventory',
          actionUrl: '/inventory-v2/commissary',
        });
      }
    }
  }, [state.stockroomItems]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <InventoryV2Context.Provider value={{ state, dispatch }}>
      {children}
    </InventoryV2Context.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useInventoryV2() {
  const context = useContext(InventoryV2Context);
  if (!context) {
    throw new Error('useInventoryV2 must be used within an InventoryV2Provider');
  }
  return context;
}
