// ─── Inventory V2 — React Context ───────────────────────────────────────────

import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { InventoryV2State, InventoryV2Action, StockroomItem, CommissaryAlert } from './types';
import { SYSTEM_USERS } from '../../lib/mockUsers';
import { ITEMS_V2, MOCK_INSPECTIONS, STOCKROOMS, STOCKROOM_ITEMS, MOCK_PICK_LIST, MOCK_RESTOCK_LIST, MOCK_UNIT_REQUESTS, MOCK_PURCHASE_ORDERS } from './mockData';
import { FLEET_V2 } from './constants';
import { loadCompartmentConfigs } from './compartmentConfig';

// ─── Storage Keys ───────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'inv-v2-';
const STORAGE_KEY = `${STORAGE_PREFIX}state`;

// ─── Initial State ──────────────────────────────────────────────────────────

function loadInitialState(): InventoryV2State {
  try {
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
    selectedStockroomId: 'sr-1',
    currentUser: {
      id: SYSTEM_USERS[0].id,
      name: SYSTEM_USERS[0].name,
      email: SYSTEM_USERS[0].email,
      role: SYSTEM_USERS[0].roles[0],
      roles: SYSTEM_USERS[0].roles,
      department: SYSTEM_USERS[0].department,
    },
    alertThresholds: [],
    alerts: [],
    pendingChanges: 0,
  };
}

// ─── Alert Helper ────────────────────────────────────────────────────────────

function generateAlertsAfterStockUpdate(
  state: InventoryV2State,
  newStockroomItems: StockroomItem[],
  changedItems: StockroomItem[]
): CommissaryAlert[] {
  let alerts = [...state.alerts];

  for (const changed of changedItems) {
    const relatedThresholds = state.alertThresholds.filter(
      t => t.enabled && t.itemId === changed.itemId
    );

    for (const threshold of relatedThresholds) {
      const qty = changed.qtyOnHand;
      const openAlert = alerts.find(
        a => a.itemId === threshold.itemId &&
             a.userId === threshold.userId &&
             !a.resolvedAt &&
             !a.dismissed
      );

      if (qty < threshold.threshold) {
        if (!openAlert) {
          alerts.push({
            id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            itemId: threshold.itemId,
            stockroomId: changed.stockroomId,
            userId: threshold.userId,
            threshold: threshold.threshold,
            currentQty: qty,
            triggeredAt: new Date().toISOString(),
            dismissed: false,
          });
        } else {
          alerts = alerts.map(a =>
            a === openAlert ? { ...a, currentQty: qty } : a
          );
        }
      } else if (openAlert) {
        alerts = alerts.map(a =>
          a === openAlert ? { ...a, resolvedAt: new Date().toISOString(), currentQty: qty } : a
        );
      }
    }
  }

  return alerts;
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
      const alerts = generateAlertsAfterStockUpdate(state, newStockroomItems, [action.payload]);
      return { ...state, stockroomItems: newStockroomItems, alerts, pendingChanges: state.pendingChanges + 1 };
    }

    case 'BULK_UPDATE_STOCKROOM': {
      const newStockroomItems = state.stockroomItems.map(si => {
        const updated = action.payload.find(
          u => u.itemId === si.itemId && u.stockroomId === si.stockroomId
        );
        return updated ?? si;
      });
      const alerts = generateAlertsAfterStockUpdate(state, newStockroomItems, action.payload);
      return { ...state, stockroomItems: newStockroomItems, alerts, pendingChanges: state.pendingChanges + 1 };
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

    case 'SET_SELECTED_STOCKROOM':
      return { ...state, selectedStockroomId: action.payload };

    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };

    case 'ADD_ALERT_THRESHOLD': {
      const existing = state.alertThresholds.findIndex(
        t => t.userId === action.payload.userId && t.itemId === action.payload.itemId
      );
      const updated = existing >= 0
        ? state.alertThresholds.map((t, i) => i === existing ? action.payload : t)
        : [...state.alertThresholds, action.payload];
      return { ...state, alertThresholds: updated };
    }

    case 'REMOVE_ALERT_THRESHOLD':
      return { ...state, alertThresholds: state.alertThresholds.filter(t => t.id !== action.payload) };

    case 'DISMISS_ALERT':
      return {
        ...state,
        alerts: state.alerts.map(a => a.id === action.payload ? { ...a, dismissed: true } : a),
      };

    case 'RESOLVE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map(a =>
          a.id === action.payload ? { ...a, resolvedAt: new Date().toISOString() } : a
        ),
      };

    case 'INCREMENT_PENDING_CHANGES':
      return { ...state, pendingChanges: state.pendingChanges + 1 };

    case 'RESET_PENDING_CHANGES':
      return { ...state, pendingChanges: 0 };

    case 'RESET_STATE':
      return action.payload;

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
}

export function InventoryV2Provider({ children, userRole }: InventoryV2ProviderProps) {
  const [state, dispatch] = useReducer(inventoryReducer, undefined, loadInitialState);

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
