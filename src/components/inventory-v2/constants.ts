// ─── Inventory V2 — Constants ───────────────────────────────────────────────

import type { SupplyCategory, UnitOfMeasure } from './types';

// ─── Supply Categories (15 standard categories) ────────────────────────────

export interface SupplyCategoryMeta {
  id: SupplyCategory;
  label: string;
  sortOrder: number;
}

export const SUPPLY_CATEGORIES: SupplyCategoryMeta[] = [
  { id: 'beverages', label: 'Beverages', sortOrder: 1 },
  { id: 'cleaning-supplies', label: 'Cleaning Supplies', sortOrder: 2 },
  { id: 'coffee', label: 'Coffee', sortOrder: 3 },
  { id: 'first-aid', label: 'First Aid', sortOrder: 4 },
  { id: 'kitchen-supplies', label: 'Kitchen Supplies', sortOrder: 5 },
  { id: 'linens', label: 'Linens', sortOrder: 6 },
  { id: 'medicine', label: 'Medicine', sortOrder: 7 },
  { id: 'miscellaneous', label: 'Miscellaneous', sortOrder: 8 },
  { id: 'paper-goods', label: 'Paper Goods', sortOrder: 9 },
  { id: 'self-care', label: 'Self-Care', sortOrder: 10 },
  { id: 'snacks', label: 'Snacks', sortOrder: 11 },
  { id: 'sweetener', label: 'Sweetener', sortOrder: 12 },
  { id: 'tea', label: 'Tea', sortOrder: 13 },
  { id: 'toiletries', label: 'Toiletries', sortOrder: 14 },
  { id: 'wine', label: 'Wine', sortOrder: 15 },
];

// ─── Units of Measure ───────────────────────────────────────────────────────

export const UOM_OPTIONS: { value: UnitOfMeasure; label: string }[] = [
  { value: 'ea', label: 'Each' },
  { value: 'bag', label: 'Bag' },
  { value: 'box', label: 'Box' },
  { value: 'pkg', label: 'Package' },
  { value: 'sleeve', label: 'Sleeve' },
  { value: 'case', label: 'Case' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'roll', label: 'Roll' },
  { value: 'pair', label: 'Pair' },
  { value: 'set', label: 'Set' },
];

// ─── Status Colors ──────────────────────────────────────────────────────────
// Use .className with the status-badge base class for rendering:
//   <span className={`status-badge ${s.className}`}>{s.label}</span>

export const STATUS_COLORS = {
  // Inspection statuses
  in_progress:        { className: 'status-info',    label: 'In Progress' },
  submitted:          { className: 'status-success', label: 'Completed' },
  restocking_needed:  { className: 'status-warning', label: 'Restock Needed' },
  restocked:          { className: 'status-success', label: 'Restocked' },
  // Request statuses
  open:               { className: 'status-info',    label: 'Open' },
  in_progress_req:    { className: 'status-warning', label: 'In Progress' },
  fulfilled:          { className: 'status-success', label: 'Fulfilled' },
  cancelled:          { className: 'status-error',   label: 'Cancelled' },
  // PO statuses
  outstanding:        { className: 'status-warning', label: 'Outstanding' },
  partially_received: { className: 'status-info',    label: 'Partial' },
  fully_received:     { className: 'status-success', label: 'Received' },
} as const;

export const TRIP_STATUS_COLORS = {
  active:    { className: 'status-success', label: 'Active' },
  completed: { className: 'status-info',    label: 'Completed' },
  cancelled: { className: 'status-error',   label: 'Cancelled' },
} as const;

export const LEG_STATUS_COLORS = {
  upcoming:  { className: 'status-badge bg-muted text-muted-foreground border-border', label: 'Upcoming' },
  active:    { className: 'status-warning', label: 'In Flight' },
  completed: { className: 'status-success', label: 'Completed' },
} as const;

export const LEG_PHASE_COLORS = {
  pre_flight: { className: 'status-badge bg-muted text-muted-foreground border-border', label: 'Pre-Flight' },
  in_flight:  { className: 'status-warning', label: 'In Flight' },
  on_ground:  { className: 'status-info',    label: 'On Ground' },
  complete:   { className: 'status-success', label: 'Complete' },
} as const;

export const GROCERY_STATUS_COLORS = {
  draft:     { className: 'status-warning', label: 'Shopping List' },
  sent:      { className: 'status-info',    label: 'Sent' },
  fulfilled: { className: 'status-success', label: 'Complete' },
} as const;

// ─── Priority Colors ────────────────────────────────────────────────────────

export const PRIORITY_COLORS = {
  critical: 'status-error',
  high:     'status-badge bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30',
  medium:   'status-warning',
  low:      'status-badge bg-muted text-muted-foreground border border-border',
} as const;

// ─── Readiness Helpers ──────────────────────────────────────────────────────

export function readinessColor(pct: number): string {
  if (pct >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function readinessBg(pct: number): string {
  if (pct >= 90) return 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30';
  if (pct >= 70) return 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30';
  return 'bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30';
}

export function stockBarColor(pct: number): string {
  if (pct >= 90) return 'bg-emerald-500 dark:bg-emerald-400';
  if (pct >= 60) return 'bg-amber-500 dark:bg-amber-400';
  return 'bg-red-500 dark:bg-red-400';
}

// ─── V2 Theme (Design system blue palette) ──────────────────────────────────

export const V2_THEME = {
  accent: 'text-primary',
  accentBg: 'bg-primary',
  accentBgLight: 'bg-primary/10',
  accentBorder: 'border-primary/30',
  accentHover: 'hover:bg-primary/20',
  badge: 'bg-primary text-primary-foreground',
  badgeOutline: 'bg-primary/10 text-primary border border-primary/30',
} as const;

// ─── Mock Users ─────────────────────────────────────────────────────────────

export const MOCK_USERS = [
  { id: 'u1', name: 'Sarah Mitchell', role: 'Lead Flight Attendant' },
  { id: 'u2', name: 'James Cooper', role: 'Flight Attendant' },
  { id: 'u3', name: 'Maria Rodriguez', role: 'Flight Attendant' },
  { id: 'u4', name: 'David Chen', role: 'Stockroom Manager' },
  { id: 'u5', name: 'Emily Parker', role: 'Flight Attendant' },
  { id: 'u6', name: 'Michael Brown', role: 'Lead Flight Attendant' },
  { id: 'u7', name: 'Lisa Johnson', role: 'Flight Attendant' },
  { id: 'u8', name: 'Robert Wilson', role: 'Stockroom Clerk' },
  { id: 'u9', name: 'Amanda Taylor', role: 'Flight Attendant' },
  { id: 'u10', name: 'Bryan Dunlop', role: 'Admin' },
  { id: 'u11', name: 'Chris Anderson', role: 'Flight Attendant' },
] as const;

// ─── Fleet (self-contained, no external imports) ────────────────────────────

export const FLEET_V2 = [
  { tailNumber: 'N1PG', type: 'G650' as const, displayName: 'N1PG — G650' },
  { tailNumber: 'N2PG', type: 'G650' as const, displayName: 'N2PG — G650' },
  { tailNumber: 'N5PG', type: 'G500' as const, displayName: 'N5PG — G500' },
  { tailNumber: 'N6PG', type: 'G500' as const, displayName: 'N6PG — G500' },
];

// ─── POS Categories (Quick Tap view) ────────────────────────────────────────

export interface POSCategory {
  id: string;
  label: string;
  icon: string;   // Lucide icon name (e.g., 'Coffee', 'GlassWater')
  color: string;   // Tailwind text color class for the icon
  /** Which supplyCategory values map into this POS group */
  supplyCategories: SupplyCategory[];
  sortOrder: number;
}

export const POS_CATEGORIES: POSCategory[] = [
  {
    id: 'hot-drinks',
    label: 'Hot Drinks',
    icon: 'Coffee',
    color: 'text-amber-400',
    supplyCategories: ['coffee', 'tea', 'sweetener'],
    sortOrder: 1,
  },
  {
    id: 'cold-drinks',
    label: 'Cold Drinks',
    icon: 'GlassWater',
    color: 'text-cyan-400',
    supplyCategories: ['beverages'],
    sortOrder: 2,
  },
  {
    id: 'snacks',
    label: 'Snacks & Food',
    icon: 'Cookie',
    color: 'text-orange-400',
    supplyCategories: ['snacks'],
    sortOrder: 3,
  },
  {
    id: 'wine-spirits',
    label: 'Wine & Spirits',
    icon: 'Wine',
    color: 'text-rose-400',
    supplyCategories: ['wine'],
    sortOrder: 4,
  },
  {
    id: 'paper-supplies',
    label: 'Paper & Supplies',
    icon: 'Scroll',
    color: 'text-slate-300',
    supplyCategories: ['paper-goods', 'linens'],
    sortOrder: 5,
  },
  {
    id: 'medicine-amenities',
    label: 'Medicine & Amenities',
    icon: 'Pill',
    color: 'text-emerald-400',
    supplyCategories: ['medicine', 'first-aid', 'toiletries', 'self-care'],
    sortOrder: 6,
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    icon: 'SprayCan',
    color: 'text-violet-400',
    supplyCategories: ['cleaning-supplies'],
    sortOrder: 7,
  },
];

export const DEFAULT_QUICK_ADD_ITEM_IDS: string[] = [
  '1',   // Perrier 330ml
  '2',   // Coca-Cola
  '3',   // Coke Zero
  '8',   // Liter Water Bottles
  '10',  // Nespresso Pods
  '124', // Cocktail Napkins
  '20',  // White Sugar Packets
  '44',  // Hot Towels
];
