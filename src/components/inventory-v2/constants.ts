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

export const STATUS_COLORS = {
  // Inspection statuses
  in_progress: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'In Progress' },
  submitted: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Completed' },
  restocking_needed: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Restock Needed' },
  restocked: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Restocked' },
  // Request statuses
  open: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Open' },
  in_progress_req: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'In Progress' },
  fulfilled: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Fulfilled' },
  cancelled: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'Cancelled' },
  // PO statuses
  outstanding: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Outstanding' },
  partially_received: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Partial' },
  fully_received: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Received' },
} as const;

export const TRIP_STATUS_COLORS = {
  active: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Active' },
  completed: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Completed' },
  cancelled: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'Cancelled' },
} as const;

export const LEG_STATUS_COLORS = {
  upcoming: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Upcoming' },
  active: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'In Flight' },
  completed: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Completed' },
} as const;

export const LEG_PHASE_COLORS = {
  pre_flight: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Pre-Flight' },
  in_flight: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'In Flight' },
  on_ground: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'On Ground' },
  complete: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Complete' },
} as const;

export const GROCERY_STATUS_COLORS = {
  draft: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Shopping List' },
  sent: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Sent' },
  fulfilled: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Complete' },
} as const;

// ─── Priority Colors ────────────────────────────────────────────────────────

export const PRIORITY_COLORS = {
  critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  medium: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  low: 'bg-slate-500/15 text-muted-foreground border border-slate-500/30',
} as const;

// ─── Readiness Helpers ──────────────────────────────────────────────────────

export function readinessColor(pct: number): string {
  if (pct >= 90) return 'text-emerald-400';
  if (pct >= 70) return 'text-yellow-400';
  return 'text-red-400';
}

export function readinessBg(pct: number): string {
  if (pct >= 90) return 'bg-emerald-500/15 border-emerald-500/30';
  if (pct >= 70) return 'bg-yellow-500/15 border-yellow-500/30';
  return 'bg-red-500/15 border-red-500/30';
}

export function stockBarColor(pct: number): string {
  if (pct >= 90) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

// ─── V2 Theme (Purple accent) ───────────────────────────────────────────────

export const V2_THEME = {
  accent: 'text-purple-500',
  accentBg: 'bg-purple-500',
  accentBgLight: 'bg-purple-500/10',
  accentBorder: 'border-purple-500/30',
  accentHover: 'hover:bg-purple-500/20',
  badge: 'bg-purple-500 text-white',
  badgeOutline: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
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
