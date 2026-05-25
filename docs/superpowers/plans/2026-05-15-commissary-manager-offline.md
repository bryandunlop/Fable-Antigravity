# Inventory V2 — Commissary Manager + Offline Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Commissary Manager role (alert-first home screen, restock threshold notifications) and an offline banner that communicates offline/sync state.

**Architecture:** Track 2 adds new types + context state, two new pages (CommissaryDashboard, AlertsPage), two new shared components (UserSwitcher, AlertBell, OfflineBanner), a new hook (useOnlineStatus), and extends the Login screen, mockUsers, and Settings. Track 3 (offline banner) is self-contained. All state stays in localStorage — no backend.

**Tech Stack:** React 18, TypeScript, React Router v6, Vite, Tailwind CSS, shadcn/ui (Badge, Button, Card, Dialog, Input, Label, ScrollArea, Select, Sheet, Switch, Tabs), Lucide React, Sonner (toasts)

---

## File Map

| File | Change |
|---|---|
| `src/components/inventory-v2/types.ts` | Add `UserV2`, `AlertThreshold`, `CommissaryAlert` types; extend `InventoryV2State`; add 6 new action types |
| `src/components/inventory-v2/InventoryV2Context.tsx` | Add reducer cases; alert auto-generation hook in `UPDATE_STOCKROOM_ITEM` + `BULK_UPDATE_STOCKROOM`; accept `userRole` prop; call `SET_CURRENT_USER` on mount |
| `src/lib/mockUsers.ts` | Add `commissary-manager` to `ROLE_CATEGORIES['Cabin']`; add to USR003 roles |
| `src/App.tsx` | Pass `userRole` prop to `InventoryV2Provider`; add new routes for `/inventory-v2/commissary` and `/inventory-v2/alerts` |
| `src/components/inventory-v2/shared/UserSwitcher.tsx` | **New** — dropdown showing all mock users, dispatches `SET_CURRENT_USER` |
| `src/components/inventory-v2/shared/AlertBell.tsx` | **New** — bell icon with active-alert badge, commissary-manager only |
| `src/components/inventory-v2/shared/useOnlineStatus.ts` | **New** — `navigator.onLine` hook returning `{ isOnline, pendingChanges }` |
| `src/components/inventory-v2/shared/OfflineBanner.tsx` | **New** — amber banner shown when offline |
| `src/components/inventory-v2/pages/CommissaryDashboard.tsx` | **New** — alert-first home screen for commissary-manager role |
| `src/components/inventory-v2/pages/AlertsPage.tsx` | **New** — active + history tabs for commissary alerts |
| `src/components/inventory-v2/pages/Settings.tsx` | Add 5th "My Alerts" tab (commissary-manager only) for threshold management |
| `src/components/inventory-v2/pages/InventoryV2Dashboard.tsx` | Add role-based redirect to `/inventory-v2/commissary` for commissary-manager |

---

## Task 1 — Types + Context State

Add all new types and state fields so subsequent tasks can import them. No UI changes yet.

**Files:**
- Modify: `src/components/inventory-v2/types.ts`
- Modify: `src/components/inventory-v2/InventoryV2Context.tsx`

- [ ] **Step 1.1 — Add `UserV2` type to `types.ts`**

At the end of the file, before the closing (after `InventoryV2Action` union), add:

```typescript
// ─── Users ──────────────────────────────────────────────────────────────────

export interface UserV2 {
  id: string;
  name: string;
  email: string;
  role: string;   // the active role selected at login (or overridden by UserSwitcher)
  roles: string[]; // full roles array from SYSTEM_USERS
  department: string;
}
```

- [ ] **Step 1.2 — Add `AlertThreshold` and `CommissaryAlert` types to `types.ts`**

After `UserV2`, add:

```typescript
// ─── Commissary Alerts ───────────────────────────────────────────────────────

export interface AlertThreshold {
  id: string;
  userId: string;
  itemId: string;
  threshold: number;
  enabled: boolean;
}

export interface CommissaryAlert {
  id: string;
  itemId: string;
  stockroomId: string;
  userId: string;
  threshold: number;
  currentQty: number;
  triggeredAt: string;
  resolvedAt?: string;
  dismissed: boolean;
}
```

- [ ] **Step 1.3 — Extend `InventoryV2State` in `types.ts`**

Find the `InventoryV2State` interface (around line 215). Add these fields after `displaySettings`:

```typescript
  currentUser: UserV2;
  alertThresholds: AlertThreshold[];
  alerts: CommissaryAlert[];
  pendingChanges: number;
```

- [ ] **Step 1.4 — Add new action types to `InventoryV2Action` union in `types.ts`**

Find the `InventoryV2Action` union (after the `RESET_STATE` action). Add:

```typescript
  | { type: 'SET_CURRENT_USER'; payload: UserV2 }
  | { type: 'ADD_ALERT_THRESHOLD'; payload: AlertThreshold }
  | { type: 'REMOVE_ALERT_THRESHOLD'; payload: string } // threshold id
  | { type: 'DISMISS_ALERT'; payload: string } // alert id
  | { type: 'RESOLVE_ALERT'; payload: string } // alert id
  | { type: 'INCREMENT_PENDING_CHANGES' }
  | { type: 'RESET_PENDING_CHANGES' }
```

- [ ] **Step 1.5 — Add new state fields to `getDefaultState()` in `InventoryV2Context.tsx`**

Find the `getDefaultState()` function. Import `SYSTEM_USERS` from `'../../lib/mockUsers'` at the top of the file:

```typescript
import { SYSTEM_USERS } from '../../lib/mockUsers';
```

Then in `getDefaultState()`, add after `selectedStockroomId`:

```typescript
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
```

- [ ] **Step 1.6 — Add new reducer cases to `inventoryReducer` in `InventoryV2Context.tsx`**

Find `case 'RESET_STATE':`. Add before it:

```typescript
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
```

- [ ] **Step 1.7 — Wire alert auto-generation into `UPDATE_STOCKROOM_ITEM` reducer case**

Find `case 'UPDATE_STOCKROOM_ITEM':` in the reducer. Replace it:

```typescript
    case 'UPDATE_STOCKROOM_ITEM': {
      const newStockroomItems = state.stockroomItems.map(si =>
        si.itemId === action.payload.itemId && si.stockroomId === action.payload.stockroomId
          ? action.payload
          : si
      );
      const alerts = generateAlertsAfterStockUpdate(state, newStockroomItems, [action.payload]);
      return { ...state, stockroomItems: newStockroomItems, alerts, pendingChanges: state.pendingChanges + 1 };
    }
```

- [ ] **Step 1.8 — Wire alert auto-generation into `BULK_UPDATE_STOCKROOM` reducer case**

Find `case 'BULK_UPDATE_STOCKROOM':`. Replace it:

```typescript
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
```

- [ ] **Step 1.9 — Add the `generateAlertsAfterStockUpdate` helper above the reducer**

Add this function between the `getDefaultState` function and `function inventoryReducer`:

```typescript
import type { StockroomItem, CommissaryAlert } from './types';

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
        // create alert only if none already open for this user+item
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
          // update currentQty on existing open alert
          alerts = alerts.map(a =>
            a === openAlert ? { ...a, currentQty: qty } : a
          );
        }
      } else if (openAlert) {
        // qty rose above threshold — auto-resolve
        alerts = alerts.map(a =>
          a === openAlert ? { ...a, resolvedAt: new Date().toISOString(), currentQty: qty } : a
        );
      }
    }
  }

  return alerts;
}
```

> Note: the `import type` at the top of this step is already handled by the existing imports in the file — `StockroomItem` and `CommissaryAlert` are already in scope. Don't add a duplicate import.

- [ ] **Step 1.10 — Update `InventoryV2Provider` to accept and bridge `userRole` prop**

Find `export function InventoryV2Provider({ children }: { children: ReactNode })`. Replace the signature and add the mount bridge:

```typescript
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
```

- [ ] **Step 1.11 — Commit**

```bash
git add src/components/inventory-v2/types.ts src/components/inventory-v2/InventoryV2Context.tsx
git commit -m "feat(inventory-v2): add UserV2, AlertThreshold, CommissaryAlert types and context state"
```

---

## Task 2 — mockUsers + Login Screen

Add `commissary-manager` as a selectable role at login.

**Files:**
- Modify: `src/lib/mockUsers.ts`

- [ ] **Step 2.1 — Add `commissary-manager` to `ROLE_CATEGORIES['Cabin']`**

Find the `'Cabin'` array in `ROLE_CATEGORIES` (around line 113). Add the third entry:

```typescript
'Cabin': [
  { value: 'inflight', label: 'Flight Attendant', description: 'Cabin crew member' },
  { value: 'fa-manager', label: 'Flight Attendant Manager', description: 'Manager of cabin services' },
  { value: 'commissary-manager', label: 'Commissary Manager', description: 'Stockroom and supply management' },
],
```

- [ ] **Step 2.2 — Add `commissary-manager` to Mike Johnson's (USR003) roles**

Find USR003's `roles` array (around line 29). Replace:

```typescript
    roles: ['inflight', 'lead-fa', 'fa-manager', 'commissary-manager'],
```

- [ ] **Step 2.3 — Commit**

```bash
git add src/lib/mockUsers.ts
git commit -m "feat(inventory-v2): add commissary-manager role to ROLE_CATEGORIES and USR003"
```

---

## Task 3 — UserSwitcher Component

Header dropdown for switching the active user during demo sessions.

**Files:**
- Create: `src/components/inventory-v2/shared/UserSwitcher.tsx`

- [ ] **Step 3.1 — Create `UserSwitcher.tsx`**

```tsx
import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Badge } from '../../ui/badge';
import { useInventoryV2 } from '../InventoryV2Context';
import { SYSTEM_USERS } from '../../../lib/mockUsers';

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  'inflight': { label: 'FLIGHT ATTENDANT', className: 'bg-cyan-500/20 text-cyan-300' },
  'fa-manager': { label: 'FA MANAGER', className: 'bg-cyan-500/20 text-cyan-300' },
  'lead-fa': { label: 'LEAD FA', className: 'bg-cyan-500/20 text-cyan-300' },
  'commissary-manager': { label: 'COMMISSARY', className: 'bg-indigo-500/20 text-indigo-300' },
  'admin': { label: 'ADMIN', className: 'bg-purple-500/20 text-purple-300' },
  'pilot': { label: 'PILOT', className: 'bg-blue-500/20 text-blue-300' },
  'chief-pilot': { label: 'CHIEF PILOT', className: 'bg-blue-500/20 text-blue-300' },
  'maintenance': { label: 'MAINTENANCE', className: 'bg-orange-500/20 text-orange-300' },
  'chief-inspector': { label: 'CHIEF INSPECTOR', className: 'bg-orange-500/20 text-orange-300' },
  'shift-lead': { label: 'SHIFT LEAD', className: 'bg-orange-500/20 text-orange-300' },
  'safety': { label: 'SAFETY', className: 'bg-red-500/20 text-red-300' },
  'lead': { label: 'LEAD', className: 'bg-slate-500/20 text-slate-300' },
  'vp': { label: 'VP', className: 'bg-slate-500/20 text-slate-300' },
};

function roleBadge(role: string) {
  return ROLE_BADGE[role] ?? { label: role.toUpperCase(), className: 'bg-slate-500/20 text-slate-300' };
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function UserSwitcher() {
  const { state, dispatch } = useInventoryV2();
  const { currentUser } = state;
  const badge = roleBadge(currentUser.role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
            {initials(currentUser.name)}
          </span>
          <span className="hidden sm:inline">{currentUser.name}</span>
          <span className={`hidden sm:inline rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}>
            {badge.label}
          </span>
          <ChevronDown className="h-3 w-3 text-slate-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {SYSTEM_USERS.map(user => {
          const primaryRole = user.roles[0];
          const b = roleBadge(primaryRole);
          return (
            <DropdownMenuItem
              key={user.id}
              className="flex items-center gap-3 py-2"
              onClick={() =>
                dispatch({
                  type: 'SET_CURRENT_USER',
                  payload: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: primaryRole,
                    roles: user.roles,
                    department: user.department,
                  },
                })
              }
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[11px] font-bold text-white">
                {initials(user.name)}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{user.name}</span>
                <span className={`text-[10px] font-semibold ${b.className}`}>{b.label}</span>
              </div>
              {currentUser.id === user.id && (
                <span className="ml-auto text-xs text-indigo-400">active</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3.2 — Verify `DropdownMenu` is available**

Check that the shadcn dropdown-menu component exists:

```bash
ls src/components/ui/dropdown-menu.tsx
```

If it doesn't exist, add it with the shadcn CLI:

```bash
npx shadcn@latest add dropdown-menu
```

- [ ] **Step 3.3 — Commit**

```bash
git add src/components/inventory-v2/shared/UserSwitcher.tsx
git commit -m "feat(inventory-v2): add UserSwitcher dropdown component"
```

---

## Task 4 — Wire `userRole` Prop + New Routes in App.tsx

Pass the app-level `userRole` into `InventoryV2Provider` so login-selected role flows into context. Add routes for the two new pages.

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 4.1 — Add new page imports to `App.tsx`**

After `import SettingsV2 from './components/inventory-v2/pages/Settings';`, add:

```typescript
import CommissaryDashboard from './components/inventory-v2/pages/CommissaryDashboard';
import AlertsPage from './components/inventory-v2/pages/AlertsPage';
```

- [ ] **Step 4.2 — Pass `userRole` to all `InventoryV2Provider` instances**

There are 13 inventory-v2 routes, each wrapping its page in `<InventoryV2Provider>`. Find every occurrence of `<InventoryV2Provider>` in App.tsx and add the `userRole` prop:

```tsx
// Before:
<InventoryV2Provider>

// After:
<InventoryV2Provider userRole={userRole}>
```

You can do this with a find-and-replace. There should be 13 occurrences — confirm the count:

```bash
grep -c "<InventoryV2Provider>" src/App.tsx
```

- [ ] **Step 4.3 — Add new routes after the existing inventory-v2 routes**

Find `<Route path="/inventory-v2/settings" ...`. Add after it:

```tsx
<Route path="/inventory-v2/commissary" element={<InventoryV2Provider userRole={userRole}><CommissaryDashboard /></InventoryV2Provider>} />
<Route path="/inventory-v2/alerts" element={<InventoryV2Provider userRole={userRole}><AlertsPage /></InventoryV2Provider>} />
```

- [ ] **Step 4.4 — Commit**

```bash
git add src/App.tsx
git commit -m "feat(inventory-v2): wire userRole prop to InventoryV2Provider, add commissary + alerts routes"
```

---

## Task 5 — CommissaryDashboard Page

The alert-first home screen shown to commissary-manager users.

**Files:**
- Create: `src/components/inventory-v2/pages/CommissaryDashboard.tsx`

- [ ] **Step 5.1 — Create `CommissaryDashboard.tsx`**

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Bell, Package, PackagePlus, ClipboardList, RefreshCw, Settings, CheckCircle2 } from 'lucide-react';
import { useInventoryV2 } from '../InventoryV2Context';
import { UserSwitcher } from '../shared/UserSwitcher';
import { AlertBell } from '../shared/AlertBell';
import { OfflineBanner } from '../shared/OfflineBanner';
import { Button } from '../../ui/button';
import { formatDistanceToNow } from 'date-fns';

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function SidebarLink({
  icon: Icon,
  label,
  to,
  active,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  to: string;
  active?: boolean;
  badge?: number;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
        active
          ? 'bg-indigo-600 text-white font-semibold'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Alert Row ───────────────────────────────────────────────────────────────

function AlertRow({
  alertId,
  itemName,
  currentQty,
  threshold,
  triggeredAt,
}: {
  alertId: string;
  itemName: string;
  currentQty: number;
  threshold: number;
  triggeredAt: string;
}) {
  const { dispatch } = useInventoryV2();
  const navigate = useNavigate();
  const ago = formatDistanceToNow(new Date(triggeredAt), { addSuffix: false });

  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{itemName}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {currentQty} on hand · Restock threshold: {threshold} · Triggered {ago} ago
        </p>
        <p className="mt-1 text-[10px] italic text-slate-500">
          Auto-resolves when qty goes above {threshold}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Button
          size="sm"
          className="h-7 bg-indigo-600 px-2.5 text-xs hover:bg-indigo-500"
          onClick={() => navigate(`/inventory-v2/receiving?itemId=${alertId}`)}
        >
          Restock →
        </Button>
        <button
          className="text-[10px] text-slate-500 underline hover:text-slate-300"
          onClick={() => dispatch({ type: 'DISMISS_ALERT', payload: alertId })}
        >
          dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CommissaryDashboard() {
  const { state } = useInventoryV2();
  const navigate = useNavigate();

  const activeAlerts = state.alerts.filter(
    a => a.userId === state.currentUser.id && !a.resolvedAt && !a.dismissed
  );
  const criticalAlerts = activeAlerts.filter(a => {
    const si = state.stockroomItems.find(
      s => s.itemId === a.itemId && s.stockroomId === a.stockroomId
    );
    return si && si.qtyOnHand <= si.minimumLevel;
  });
  const thresholdAlerts = activeAlerts.filter(a => !criticalAlerts.includes(a));

  const totalItems = state.stockroomItems.filter(si => si.stockroomId === state.selectedStockroomId).length;
  const okCount = totalItems - activeAlerts.length;

  function itemName(itemId: string) {
    return state.items.find(i => i.id === itemId)?.itemName ?? itemId;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0f1117]">
      <OfflineBanner />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/[0.06] bg-[#1a1d2e] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-sm">✈</div>
          <span className="text-sm font-semibold text-slate-200">myGFO Inventory</span>
        </div>
        <div className="flex items-center gap-3">
          <AlertBell />
          <UserSwitcher />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="flex w-44 shrink-0 flex-col gap-1 border-r border-white/[0.06] bg-[#131520] p-2">
          <SidebarLink icon={Home} label="Commissary Home" to="/inventory-v2/commissary" active />
          <SidebarLink icon={Bell} label="My Alerts" to="/inventory-v2/alerts" badge={activeAlerts.length} />
          <SidebarLink icon={Package} label="Stockroom Count" to="/inventory-v2/stockroom" />
          <SidebarLink icon={PackagePlus} label="Add to Stock" to="/inventory-v2/receiving" />
          <div className="my-1 border-t border-white/[0.06]" />
          <SidebarLink icon={ClipboardList} label="New Inspection" to="/inventory-v2/inspection" />
          <SidebarLink icon={RefreshCw} label="Pick List" to="/inventory-v2/pick-list" />
          <div className="my-1 border-t border-white/[0.06]" />
          <SidebarLink icon={Settings} label="Settings" to="/inventory-v2/settings" />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4">
          {/* Summary bar */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3">
              <span className="text-xl">🔴</span>
              <div>
                <p className="text-lg font-bold text-red-300">{criticalAlerts.length}</p>
                <p className="text-[10px] text-slate-400">Critical — at minimum</p>
              </div>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
              <span className="text-xl">🟡</span>
              <div>
                <p className="text-lg font-bold text-amber-300">{thresholdAlerts.length}</p>
                <p className="text-[10px] text-slate-400">Restock threshold</p>
              </div>
            </div>
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 flex items-center gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-lg font-bold text-green-300">{Math.max(okCount, 0)}</p>
                <p className="text-[10px] text-slate-400">Items OK</p>
              </div>
            </div>
          </div>

          {/* Alert sections */}
          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-400 mb-3" />
              <p className="text-sm font-medium text-slate-300">All items are above their restock thresholds.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {criticalAlerts.length > 0 && (
                <section>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400">
                    🔴 Critical — At or Below Minimum
                  </p>
                  <div className="overflow-hidden rounded-lg border border-red-500/40 bg-[#1a1d2e] divide-y divide-white/[0.05]">
                    {criticalAlerts.map(a => (
                      <AlertRow
                        key={a.id}
                        alertId={a.id}
                        itemName={itemName(a.itemId)}
                        currentQty={a.currentQty}
                        threshold={a.threshold}
                        triggeredAt={a.triggeredAt}
                      />
                    ))}
                  </div>
                </section>
              )}
              {thresholdAlerts.length > 0 && (
                <section>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    🟡 Restock Threshold
                  </p>
                  <div className="overflow-hidden rounded-lg border border-amber-500/30 bg-[#1a1d2e] divide-y divide-white/[0.05]">
                    {thresholdAlerts.map(a => (
                      <AlertRow
                        key={a.id}
                        alertId={a.id}
                        itemName={itemName(a.itemId)}
                        currentQty={a.currentQty}
                        threshold={a.threshold}
                        triggeredAt={a.triggeredAt}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
```

> Note: the `Restock →` button navigates to `/inventory-v2/receiving?itemId=<alertId>`. The Receiving/Add-to-Stock page should be updated in a follow-up to read this query param and pre-stage the item — document that as a polish note but don't block on it.

- [ ] **Step 5.2 — Verify `date-fns` is installed**

```bash
grep '"date-fns"' package.json
```

If missing:

```bash
npm install date-fns
```

- [ ] **Step 5.3 — Add role-based redirect in `InventoryV2Dashboard.tsx`**

Find `export default function InventoryV2Dashboard()` in `pages/InventoryV2Dashboard.tsx`. Add at the very top of the component body (before any other logic):

```typescript
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// inside the component:
const navigate = useNavigate();
const { state } = useInventoryV2();

useEffect(() => {
  if (state.currentUser.role === 'commissary-manager') {
    navigate('/inventory-v2/commissary', { replace: true });
  }
}, [state.currentUser.role, navigate]);
```

> Check if `useNavigate` is already imported in that file before adding the import.

- [ ] **Step 5.4 — Commit**

```bash
git add src/components/inventory-v2/pages/CommissaryDashboard.tsx src/components/inventory-v2/pages/InventoryV2Dashboard.tsx
git commit -m "feat(inventory-v2): add CommissaryDashboard page and role-based redirect"
```

---

## Task 6 — AlertBell Component

Bell icon in the header, commissary-manager only, with active alert count badge.

**Files:**
- Create: `src/components/inventory-v2/shared/AlertBell.tsx`

- [ ] **Step 6.1 — Create `AlertBell.tsx`**

```tsx
import React from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInventoryV2 } from '../InventoryV2Context';

export function AlertBell() {
  const { state } = useInventoryV2();
  const navigate = useNavigate();

  if (state.currentUser.role !== 'commissary-manager') return null;

  const count = state.alerts.filter(
    a => a.userId === state.currentUser.id && !a.resolvedAt && !a.dismissed
  ).length;

  return (
    <button
      onClick={() => navigate('/inventory-v2/alerts')}
      className="relative p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
      aria-label={`${count} active alerts`}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 6.2 — Commit**

```bash
git add src/components/inventory-v2/shared/AlertBell.tsx
git commit -m "feat(inventory-v2): add AlertBell component with active alert badge"
```

---

## Task 7 — AlertsPage

Full-page view of active and historical alerts.

**Files:**
- Create: `src/components/inventory-v2/pages/AlertsPage.tsx`

- [ ] **Step 7.1 — Create `AlertsPage.tsx`**

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { Button } from '../../ui/button';
import { useInventoryV2 } from '../InventoryV2Context';
import { formatDistanceToNow, format } from 'date-fns';

function StatusBadge({ alert }: { alert: { resolvedAt?: string; dismissed: boolean } }) {
  if (alert.dismissed) return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-slate-500/20 text-slate-400">Dismissed</span>;
  if (alert.resolvedAt) return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-green-500/20 text-green-400">Resolved</span>;
  return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-red-500/20 text-red-400">Active</span>;
}

export default function AlertsPage() {
  const { state, dispatch } = useInventoryV2();
  const navigate = useNavigate();

  const myAlerts = state.alerts
    .filter(a => a.userId === state.currentUser.id)
    .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());

  const active = myAlerts.filter(a => !a.resolvedAt && !a.dismissed);
  const history = myAlerts.filter(a => {
    if (!a.resolvedAt && !a.dismissed) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return new Date(a.triggeredAt) >= cutoff;
  });

  function itemName(itemId: string) {
    return state.items.find(i => i.id === itemId)?.itemName ?? itemId;
  }

  function stockroomName(stockroomId: string) {
    return state.stockrooms.find(s => s.id === stockroomId)?.name ?? stockroomId;
  }

  function AlertTable({ alerts }: { alerts: typeof myAlerts }) {
    if (alerts.length === 0) {
      return <p className="py-10 text-center text-sm text-slate-500">No alerts to show.</p>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-xs text-slate-500">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 font-medium">Stockroom</th>
              <th className="pb-2 font-medium text-right">On Hand</th>
              <th className="pb-2 font-medium text-right">Threshold</th>
              <th className="pb-2 font-medium">Triggered</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {alerts.map(a => (
              <tr key={a.id} className="text-slate-300">
                <td className="py-2.5 font-medium text-slate-100">{itemName(a.itemId)}</td>
                <td className="py-2.5 text-slate-400">{stockroomName(a.stockroomId)}</td>
                <td className="py-2.5 text-right">{a.currentQty}</td>
                <td className="py-2.5 text-right">{a.threshold}</td>
                <td className="py-2.5 text-xs text-slate-400">
                  {formatDistanceToNow(new Date(a.triggeredAt), { addSuffix: true })}
                </td>
                <td className="py-2.5"><StatusBadge alert={a} /></td>
                <td className="py-2.5">
                  <div className="flex gap-2">
                    {!a.resolvedAt && !a.dismissed && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="h-6 bg-indigo-600 px-2 text-[11px] hover:bg-indigo-500"
                          onClick={() => navigate(`/inventory-v2/receiving?itemId=${a.itemId}`)}
                        >
                          Restock →
                        </Button>
                        <button
                          className="text-[11px] text-slate-500 underline hover:text-slate-300"
                          onClick={() => dispatch({ type: 'DISMISS_ALERT', payload: a.id })}
                        >
                          dismiss
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory-v2/commissary')}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <Bell className="h-5 w-5 text-slate-400" />
          <h1 className="text-lg font-semibold text-slate-100">My Alerts</h1>
        </div>

        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">
              Active
              {active.length > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {active.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History (30d)</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <AlertTable alerts={active} />
          </TabsContent>
          <TabsContent value="history">
            <AlertTable alerts={history} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

- [ ] **Step 7.2 — Commit**

```bash
git add src/components/inventory-v2/pages/AlertsPage.tsx
git commit -m "feat(inventory-v2): add AlertsPage with active/history tabs"
```

---

## Task 8 — My Alert Settings Tab

Per-item threshold configuration in Settings, visible only to commissary-manager.

**Files:**
- Modify: `src/components/inventory-v2/pages/Settings.tsx`

- [ ] **Step 8.1 — Add `Switch` import to `Settings.tsx`**

Find the existing `import` block at the top of Settings.tsx. Add `Switch` to the shadcn imports if not already present:

```typescript
import { Switch } from '../../ui/switch';
```

Check if the Switch component exists first:

```bash
ls src/components/ui/switch.tsx
```

If missing: `npx shadcn@latest add switch`

- [ ] **Step 8.2 — Add the `MyAlertsTab` component to `Settings.tsx`**

Add this component after the last existing tab component (before the main `Settings` export):

```tsx
function MyAlertsTab() {
  const { state, dispatch } = useInventoryV2();
  const [search, setSearch] = useState('');

  const userId = state.currentUser.id;

  const filteredItems = state.items.filter(item =>
    item.itemName.toLowerCase().includes(search.toLowerCase())
  );

  function getThreshold(itemId: string) {
    return state.alertThresholds.find(t => t.userId === userId && t.itemId === itemId);
  }

  function setThresholdValue(itemId: string, value: number) {
    const existing = getThreshold(itemId);
    dispatch({
      type: 'ADD_ALERT_THRESHOLD',
      payload: {
        id: existing?.id ?? `thr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        userId,
        itemId,
        threshold: value,
        enabled: existing?.enabled ?? true,
      },
    });
  }

  function toggleEnabled(itemId: string, enabled: boolean) {
    const existing = getThreshold(itemId);
    if (!existing) return;
    dispatch({
      type: 'ADD_ALERT_THRESHOLD',
      payload: { ...existing, enabled },
    });
  }

  function removeThreshold(itemId: string) {
    const existing = getThreshold(itemId);
    if (!existing) return;
    dispatch({ type: 'REMOVE_ALERT_THRESHOLD', payload: existing.id });
  }

  const itemsWithThresholds = filteredItems.filter(i => getThreshold(i.id));
  const itemsWithout = filteredItems.filter(i => !getThreshold(i.id));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1">Alert Thresholds</h3>
        <p className="text-xs text-slate-400">You'll be alerted when stockroom quantity drops below your threshold.</p>
      </div>

      <Input
        placeholder="Search items…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {itemsWithThresholds.length === 0 && itemsWithout.length === 0 && (
        <p className="text-sm text-slate-500 py-6 text-center">No items match your search.</p>
      )}

      {itemsWithThresholds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Your Thresholds</p>
          {itemsWithThresholds.map(item => {
            const t = getThreshold(item.id)!;
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{item.itemName}</p>
                  <p className="text-xs text-slate-500">{item.uom}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Label className="text-xs text-slate-400 whitespace-nowrap">Alert below:</Label>
                  <Input
                    type="number"
                    min={0}
                    value={t.threshold}
                    onChange={e => setThresholdValue(item.id, Number(e.target.value))}
                    className="w-16 h-7 text-xs text-center"
                  />
                  <Switch
                    checked={t.enabled}
                    onCheckedChange={enabled => toggleEnabled(item.id, enabled)}
                  />
                  <button
                    onClick={() => removeThreshold(item.id)}
                    className="text-xs text-slate-500 hover:text-red-400 ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {itemsWithout.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {itemsWithThresholds.length > 0 ? 'Add a Threshold' : 'Items — click to set a threshold'}
          </p>
          {itemsWithout.map(item => {
            const si = state.stockroomItems.find(
              s => s.itemId === item.id && s.stockroomId === state.selectedStockroomId
            );
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/[0.05] px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">{item.itemName}</p>
                  <p className="text-xs text-slate-500">{item.uom} · {si?.qtyOnHand ?? 0} on hand</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setThresholdValue(item.id, si?.parLevel ?? 10)}
                >
                  + Set threshold
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8.3 — Add "My Alerts" tab to the Tabs component in `Settings.tsx`**

Find the `<TabsList>` in the Settings page export (it should have 4 tabs: Fleet, Compartments, Item Catalog, Par/Min Levels). Add a 5th tab:

```tsx
{state.currentUser.role === 'commissary-manager' && (
  <TabsTrigger value="my-alerts">My Alerts</TabsTrigger>
)}
```

And add the corresponding `TabsContent` after the last existing one:

```tsx
{state.currentUser.role === 'commissary-manager' && (
  <TabsContent value="my-alerts">
    <MyAlertsTab />
  </TabsContent>
)}
```

- [ ] **Step 8.4 — Add `state` to the Settings component's destructuring**

The Settings page may already destructure `state` from `useInventoryV2`. Confirm it has access to `state.currentUser.role` — if not, add:

```typescript
const { state, dispatch } = useInventoryV2();
```

> This is likely already present. Check before adding.

- [ ] **Step 8.5 — Commit**

```bash
git add src/components/inventory-v2/pages/Settings.tsx
git commit -m "feat(inventory-v2): add My Alerts threshold settings tab for commissary-manager"
```

---

## Task 9 — useOnlineStatus Hook + OfflineBanner (Track 3)

The offline banner is standalone — no dependency on commissary manager work.

**Files:**
- Create: `src/components/inventory-v2/shared/useOnlineStatus.ts`
- Create: `src/components/inventory-v2/shared/OfflineBanner.tsx`

- [ ] **Step 9.1 — Create `useOnlineStatus.ts`**

```typescript
import { useState, useEffect } from 'react';
import { useInventoryV2 } from '../InventoryV2Context';

export function useOnlineStatus() {
  const { state, dispatch } = useInventoryV2();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      dispatch({ type: 'RESET_PENDING_CHANGES' });
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  return { isOnline, pendingChanges: state.pendingChanges };
}
```

- [ ] **Step 9.2 — Create `OfflineBanner.tsx`**

```tsx
import React from 'react';
import { useOnlineStatus } from './useOnlineStatus';

export function OfflineBanner() {
  const { isOnline, pendingChanges } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
      <span>📡</span>
      <span>
        You're offline
        {pendingChanges > 0 && ` · ${pendingChanges} change${pendingChanges !== 1 ? 's' : ''} pending sync`}
      </span>
    </div>
  );
}
```

- [ ] **Step 9.3 — Add `OfflineBanner` to `CommissaryDashboard.tsx`**

Already included in the CommissaryDashboard created in Task 5. Verify the import at the top of that file includes:

```typescript
import { OfflineBanner } from '../shared/OfflineBanner';
```

- [ ] **Step 9.4 — Add `OfflineBanner` to `InventoryV2Dashboard.tsx`**

Find the top of the rendered JSX in `InventoryV2Dashboard` (the outermost `<div>`). Add `<OfflineBanner />` as the first child, and import it:

```typescript
import { OfflineBanner } from '../shared/OfflineBanner';
```

In the JSX:

```tsx
<div className="...">
  <OfflineBanner />
  {/* rest of dashboard */}
```

- [ ] **Step 9.5 — Commit**

```bash
git add src/components/inventory-v2/shared/useOnlineStatus.ts src/components/inventory-v2/shared/OfflineBanner.tsx src/components/inventory-v2/pages/InventoryV2Dashboard.tsx
git commit -m "feat(inventory-v2): add useOnlineStatus hook and OfflineBanner component (Track 3)"
```

---

## Task 10 — Smoke Test End-to-End

Manually verify the complete commissary manager flow in the browser.

**Files:** None — manual verification only.

- [ ] **Step 10.1 — Start dev server and verify login**

```bash
npm run dev
```

Navigate to `http://localhost:5173/login`. Select **Commissary Manager** from the Cabin category. Log in.

Expected: redirected to `/inventory-v2/commissary` (CommissaryDashboard, not the regular dashboard).

- [ ] **Step 10.2 — Verify UserSwitcher is visible and works**

In the CommissaryDashboard header, the UserSwitcher should show "Mike Johnson · COMMISSARY". Click it — other users should be listed. Switch to a different user. Confirm the header updates and the sidebar's "My Alerts" badge count reflects the new user's alerts (likely 0).

Switch back to Mike Johnson as commissary-manager.

- [ ] **Step 10.3 — Set a restock threshold and trigger an alert**

Navigate to `/inventory-v2/settings`. The 5th tab "My Alerts" should be visible only as commissary-manager. Click it. Pick any item and click "+ Set threshold". Set the threshold to a value **above** the current on-hand quantity of that item.

Navigate to `/inventory-v2/stockroom`. Find that item and lower its quantity in the stockroom count below your threshold (the Physical Count or direct edit).

Navigate back to `/inventory-v2/commissary`. An alert should appear in the Restock Threshold or Critical section.

- [ ] **Step 10.4 — Verify alert bell badge**

The bell icon in the header should now show a red badge with "1". Click it — should navigate to `/inventory-v2/alerts`.

- [ ] **Step 10.5 — Dismiss an alert and verify it disappears**

On the CommissaryDashboard, click "dismiss" on the alert. The alert should disappear from the main content. The bell badge should update.

- [ ] **Step 10.6 — Verify offline banner**

Open DevTools → Network → set to "Offline". The amber banner "📡 You're offline" should appear at the top of the CommissaryDashboard and InventoryV2Dashboard. Set back to "Online" — banner should disappear.

---

## Polish Note (Not Blocking)

The "Restock →" button on alert rows navigates to `/inventory-v2/receiving?itemId=<itemId>`. The Add-to-Stock (Receiving) page should be updated in a follow-up to read this query param and pre-stage the item in the staging table. This is a UX improvement but the alert flow works without it.
