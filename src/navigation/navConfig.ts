// Canonical navigation manifest — single source of truth for routes.
// Consumed by BreadcrumbNav and CommandPalette (PR 1); Navigation and
// MobileBottomNav migrate to it in PR 2. When adding a route to App.tsx,
// add its entry here in the same commit.
import type { LucideIcon } from 'lucide-react';
import {
  Activity, AlertOctagon, AlertTriangle, Archive, ArrowRightLeft, BarChart3,
  BookOpen, Boxes, Building2, Calendar, CalendarCheck, Clipboard,
  ClipboardCheck, ClipboardList, Database, FileText, Fuel, HardDrive, HardHat,
  Home, Layers, MapPin, Monitor, Package, PackagePlus, Plane, Send, Settings,
  Shield, Sliders, Sparkles, Target, Upload, UserCheck, Users, Utensils,
  Warehouse, Wrench,
} from 'lucide-react';

export type Domain =
  | 'home' | 'flight-ops' | 'scheduling' | 'inflight' | 'inventory'
  | 'maintenance' | 'safety' | 'documents' | 'admin' | 'aviasync';

export const DOMAIN_LABELS: Record<Domain, string> = {
  'home': 'Home',
  'flight-ops': 'Flight Ops',
  'scheduling': 'Scheduling',
  'inflight': 'Inflight',
  'inventory': 'Inventory',
  'maintenance': 'Maintenance',
  'safety': 'Safety',
  'documents': 'Documents',
  'admin': 'Admin',
  'aviasync': 'AviaSync',
};

export interface NavEntry {
  path: string;
  label: string;
  domain: Domain;
  roles: string[];
  icon?: LucideIcon;
  href?: string;          // link target when it differs from path (query links)
  keywords?: string[];    // extra search terms for the command palette
  primary?: boolean;      // PR 2: false = behind the domain's "More" expander
  sidebar?: boolean;      // PR 2: false = never a sidebar item
  searchable?: boolean;   // false = excluded from the command-palette page index
  detailLabel?: string;   // breadcrumb leaf for sub-paths (e.g. trip detail)
}

export const NAV_ENTRIES: readonly NavEntry[] = [
  // ── Home ──────────────────────────────────────────────────────────────────
  { path: '/', label: 'Dashboard', domain: 'home', icon: Home, primary: true, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling', 'document-manager'] },
  { path: '/tasks-action-items', label: 'Tasks & Action Items', domain: 'home', icon: Target, primary: true, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling'] },
  { path: '/procedural-bulletins', label: 'Procedural Bulletins', domain: 'home', icon: BookOpen, primary: true, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling', 'document-manager'] },
  { path: '/currency-dashboard', label: 'Currency Dashboard', domain: 'home', icon: UserCheck, primary: true, keywords: ['currency', 'compliance', 'landings', '61.58'], roles: ['pilot', 'admin', 'lead', 'scheduling'] },
  { path: '/aog-management', label: 'AOG Management', domain: 'home', icon: AlertOctagon, primary: true, keywords: ['aog', 'aircraft on ground', 'emergency'], roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling'] },

  // ── Flight Ops ────────────────────────────────────────────────────────────
  { path: '/frat', label: 'Preflight Workflow', domain: 'flight-ops', icon: ClipboardList, primary: true, keywords: ['frat', 'risk', 'preflight'], roles: ['pilot', 'admin'] },
  { path: '/frat/standalone', label: 'Standalone FRAT', domain: 'flight-ops', icon: Shield, primary: true, roles: ['pilot', 'admin'] },
  { path: '/frat/my-submissions', label: 'My FRAT Submissions', domain: 'flight-ops', icon: FileText, primary: true, roles: ['pilot', 'admin'] },
  { path: '/airport-evaluations', label: 'Airport Information', domain: 'flight-ops', icon: MapPin, primary: true, roles: ['pilot', 'admin'] },
  { path: '/fuel-load-request', label: 'Fuel Load Request', domain: 'flight-ops', icon: Fuel, primary: true, roles: ['pilot', 'admin'] },
  { path: '/frat/review', label: 'FRAT Review', domain: 'flight-ops', icon: FileText, sidebar: false, roles: ['safety', 'admin'] },
  { path: '/flight-operations-center', label: 'Flight Operations Center', domain: 'flight-ops', icon: Monitor, sidebar: false, keywords: ['foc', 'ops center'], roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling'] },
  { path: '/aircraft', label: 'Aircraft Status', domain: 'flight-ops', icon: Plane, sidebar: false, keywords: ['fleet', 'tail number', 'status'], roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling'] },
  { path: '/fleet-map', label: 'Live Fleet Map', domain: 'flight-ops', icon: MapPin, sidebar: false, searchable: false, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling'] },
  { path: '/pilot/elb', label: 'Electronic Logbook', domain: 'flight-ops', icon: FileText, sidebar: false, searchable: false, roles: ['pilot', 'admin'] },

  // ── Scheduling ────────────────────────────────────────────────────────────
  { path: '/schedule', label: 'Schedule Calendar', domain: 'scheduling', icon: Calendar, primary: true, roles: ['pilot', 'admin'] },
  { path: '/scheduling-dashboard', label: 'Scheduling Dashboard', domain: 'scheduling', icon: Calendar, primary: true, roles: ['scheduling', 'admin'] },
  { path: '/trip-coordination', label: 'Trip Coordination', domain: 'scheduling', icon: MapPin, primary: true, roles: ['scheduling', 'admin'] },
  { path: '/crew-scheduling-workload', label: 'Crew Workload & Travel', domain: 'scheduling', icon: BarChart3, primary: true, roles: ['scheduling', 'admin', 'lead'] },
  { path: '/vacation-request', label: 'Vacation Request', domain: 'scheduling', icon: CalendarCheck, primary: true, roles: ['pilot', 'inflight', 'maintenance', 'admin', 'lead', 'scheduling', 'maintenance-coordinator', 'dom'] },
  { path: '/passenger-forms', label: 'Passenger Forms', domain: 'scheduling', icon: FileText, primary: false, roles: ['scheduling', 'admin'] },
  { path: '/booking-profile', label: 'Trip Management', domain: 'scheduling', icon: BookOpen, sidebar: false, searchable: false, roles: ['admin-assistant', 'admin', 'lead'] },
  { path: '/trip-builder', label: 'Trip Builder', domain: 'scheduling', icon: FileText, sidebar: false, searchable: false, roles: ['admin-assistant', 'admin', 'lead'] },
  { path: '/itinerary-builder', label: 'Itinerary Builder', domain: 'scheduling', icon: FileText, sidebar: false, searchable: false, roles: ['admin-assistant', 'admin', 'lead'] },

  // ── Inflight ──────────────────────────────────────────────────────────────
  { path: '/upcoming-flights', label: 'Upcoming Trips', domain: 'inflight', icon: Calendar, primary: true, keywords: ['flights', 'manifest'], roles: ['inflight', 'admin'] },
  { path: '/upcoming-flights', label: 'Flight Calendar', domain: 'inflight', icon: Calendar, primary: true, roles: ['pilot', 'admin'] },
  { path: '/passenger-database', label: 'Passenger Database', domain: 'inflight', icon: Users, primary: true, keywords: ['vip', 'preferences', 'allergies', 'guest'], roles: ['inflight', 'admin'] },
  { path: '/catering-tracker', label: 'Catering Tracker', domain: 'inflight', icon: Utensils, primary: true, roles: ['inflight', 'admin'] },
  { path: '/post-flight-checklist', label: 'Post-Flight Checklist', domain: 'inflight', icon: ClipboardCheck, primary: true, roles: ['inflight', 'admin'] },
  { path: '/aircraft-inventory', label: 'Aircraft Inventory', domain: 'inflight', icon: Package, primary: false, roles: ['inflight', 'admin'] },
  { path: '/aircraft-cleaning', label: 'Aircraft Cleaning', domain: 'inflight', icon: Sparkles, primary: false, roles: ['pilot', 'inflight', 'maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/catering-orders', label: 'Catering Orders', domain: 'inflight', icon: Utensils, sidebar: false, roles: ['inflight', 'admin'] },

  // ── Inventory ─────────────────────────────────────────────────────────────
  { path: '/inventory-v2/trips', label: 'Trips', domain: 'inventory', icon: Plane, primary: true, detailLabel: 'Trip', roles: ['inflight', 'admin', 'commissary-manager'] },
  { path: '/inventory-v2/inspections', label: 'Inspections', domain: 'inventory', icon: ClipboardCheck, primary: true, roles: ['inflight', 'admin', 'commissary-manager'] },
  { path: '/inventory-v2/commissary', label: 'Commissary', domain: 'inventory', icon: Warehouse, primary: true, keywords: ['stock', 'stockroom', 'par'], roles: ['inflight', 'admin', 'commissary-manager'] },
  { path: '/inventory-v2/replenish', label: 'Replenish', domain: 'inventory', icon: PackagePlus, primary: true, keywords: ['restock'], roles: ['inflight', 'admin'] },
  { path: '/inventory-v2/unit-requests', label: 'Unit Requests', domain: 'inventory', icon: Send, primary: true, roles: ['inflight', 'admin'] },
  { path: '/inventory-v2/settings', label: 'Settings', domain: 'inventory', icon: Settings, primary: false, keywords: ['par levels', 'fleet', 'items'], roles: ['admin', 'commissary-manager'] },
  { path: '/inventory-v2/alerts', label: 'Stock Alerts', domain: 'inventory', icon: AlertTriangle, sidebar: false, roles: ['commissary-manager', 'admin'] },
  { path: '/inventory-v2/activity-log', label: 'Activity Log', domain: 'inventory', icon: Activity, sidebar: false, roles: ['inflight', 'admin'] },
  { path: '/inventory-v2/recently-completed', label: 'Recently Completed', domain: 'inventory', icon: ClipboardCheck, sidebar: false, roles: ['inflight', 'admin'] },
  { path: '/inventory-v2/unit-request', label: 'New Unit Request', domain: 'inventory', icon: Send, sidebar: false, searchable: false, roles: ['inflight', 'admin'] },
  { path: '/inventory-v2/inspection', label: 'Inspection', domain: 'inventory', icon: ClipboardCheck, sidebar: false, searchable: false, detailLabel: 'Review', roles: ['inflight', 'admin'] },

  // ── Maintenance ───────────────────────────────────────────────────────────
  { path: '/maintenance-hub', label: 'Maintenance Hub', domain: 'maintenance', icon: Monitor, primary: true, roles: ['maintenance', 'admin', 'lead', 'maintenance-coordinator', 'dom'] },
  { path: '/tech-log', label: 'Tech Log', domain: 'maintenance', icon: FileText, primary: true, keywords: ['squawk'], roles: ['pilot', 'maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/work-orders', label: 'Work Orders', domain: 'maintenance', icon: ClipboardCheck, primary: true, roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/maintenance-dashboard', label: 'My Maintenance', domain: 'maintenance', icon: Clipboard, primary: true, roles: ['maintenance', 'maintenance-coordinator'] },
  { path: '/mel-cdl', label: 'MEL/CDL Management', domain: 'maintenance', icon: AlertTriangle, primary: true, keywords: ['mel', 'cdl', 'deferral'], roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/parts-inventory', label: 'Parts Inventory', domain: 'maintenance', icon: Boxes, primary: true, keywords: ['mycmp', 'procurement', 'stock'], roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/tech-work-analytics', label: 'Work Analytics', domain: 'maintenance', icon: BarChart3, primary: false, roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/mttr-dashboard', label: 'MTTR Dashboard', domain: 'maintenance', icon: Activity, primary: false, roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/maintenance-turnover', label: 'Maintenance Turnover', domain: 'maintenance', icon: ArrowRightLeft, primary: false, keywords: ['handover', 'shift'], roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/turndown-reports', label: 'Turndown Reports', domain: 'maintenance', icon: FileText, primary: false, roles: ['maintenance', 'admin', 'lead', 'maintenance-coordinator', 'dom'] },
  { path: '/turndown-form', label: 'Turndown Form', domain: 'maintenance', icon: ClipboardList, primary: false, roles: ['maintenance', 'maintenance-coordinator'] },
  { path: '/car-tracking', label: 'Car Tracking', domain: 'maintenance', icon: Package, primary: false, roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/airport-services', label: 'Airport Services', domain: 'maintenance', icon: Building2, primary: false, roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/fuel-farm', label: 'Fuel Farm Tracker', domain: 'maintenance', icon: Fuel, primary: false, roles: ['maintenance', 'maintenance-coordinator', 'dom'] },
  { path: '/maintenance', label: 'Maintenance Board', domain: 'maintenance', icon: Wrench, primary: false, roles: ['maintenance', 'admin', 'lead', 'maintenance-coordinator', 'dom'] },
  { path: '/grat/standalone', label: 'Standalone GRAT', domain: 'maintenance', icon: Shield, primary: false, roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/grat/review', label: 'GRAT Review', domain: 'maintenance', icon: Shield, sidebar: false, searchable: false, roles: ['safety', 'admin'] },
  { path: '/maintenance/technician', label: 'Technician Dashboard', domain: 'maintenance', icon: HardHat, sidebar: false, searchable: false, roles: ['maintenance', 'admin'] },

  // ── Safety ────────────────────────────────────────────────────────────────
  { path: '/safety', label: 'Safety Center', domain: 'safety', icon: Shield, primary: true, keywords: ['sms', 'hazard', 'asap', 'audit', 'waiver'], roles: ['pilot', 'inflight', 'maintenance', 'safety', 'admin', 'lead', 'scheduling', 'document-manager', 'admin-assistant'] },
  { path: '/safety', href: '/safety?tab=my-activity', label: 'My Safety Activity', domain: 'safety', icon: UserCheck, primary: true, roles: ['pilot', 'inflight', 'maintenance', 'safety', 'admin', 'lead', 'scheduling', 'document-manager', 'admin-assistant'] },
  { path: '/safety/hazards', label: 'Hazard Reporting', domain: 'safety', icon: AlertTriangle, sidebar: false, keywords: ['incident', 'report'], roles: ['pilot', 'inflight', 'maintenance', 'safety', 'admin', 'lead', 'scheduling', 'document-manager', 'admin-assistant'] },
  { path: '/safety/audits', label: 'Internal Audits', domain: 'safety', icon: ClipboardCheck, sidebar: false, searchable: false, roles: ['pilot', 'inflight', 'maintenance', 'safety', 'admin', 'lead', 'scheduling', 'document-manager', 'admin-assistant'] },
  { path: '/safety/compliance', label: 'Document Compliance', domain: 'safety', icon: FileText, sidebar: false, searchable: false, roles: ['pilot', 'inflight', 'maintenance', 'safety', 'admin', 'lead', 'scheduling', 'document-manager', 'admin-assistant'] },
  { path: '/safety/waivers', label: 'Waiver Management', domain: 'safety', icon: Shield, sidebar: false, searchable: false, roles: ['safety', 'admin'] },
  { path: '/safety/form-fields', label: 'Form Field Manager', domain: 'safety', icon: Sliders, sidebar: false, keywords: ['frat', 'grat', 'customize', 'scoring'], roles: ['safety', 'admin'] },
  { path: '/user-safety', label: 'My Safety Participation', domain: 'safety', icon: UserCheck, sidebar: false, keywords: ['cws', 'caught working safely', 'waiver request'], roles: ['pilot', 'inflight', 'maintenance', 'safety', 'admin', 'lead', 'scheduling', 'document-manager', 'admin-assistant'] },
  { path: '/asap-report', label: 'ASAP Report', domain: 'safety', icon: FileText, sidebar: false, searchable: false, roles: ['pilot', 'inflight', 'maintenance', 'safety', 'admin', 'lead', 'scheduling'] },

  // ── Documents ─────────────────────────────────────────────────────────────
  { path: '/documents', label: 'Document Center', domain: 'documents', icon: Archive, primary: true, keywords: ['manual', 'gom', 'library'], roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling', 'document-manager'] },
  { path: '/documents', label: 'Document Library', domain: 'documents', icon: Archive, primary: true, roles: ['dms-manager'] },
  { path: '/document-management', label: 'Document Management', domain: 'documents', icon: FileText, primary: true, keywords: ['publish', 'distribute'], roles: ['document-manager'] },
  { path: '/document-management', label: 'Document Request', domain: 'documents', icon: Send, primary: true, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling'] },
  { path: '/dms/offline', label: 'Offline Documents', domain: 'documents', icon: HardDrive, primary: true, roles: ['dms-manager', 'admin'] },
  { path: '/document-management/queue', label: 'Review Queue', domain: 'documents', icon: FileText, sidebar: false, searchable: false, roles: ['document-manager', 'dms-manager'] },

  // ── Admin ─────────────────────────────────────────────────────────────────
  { path: '/admin', label: 'Admin Panel', domain: 'admin', icon: Settings, primary: true, keywords: ['users', 'management'], roles: ['admin'] },
  { path: '/lead-dashboard', label: 'Lead Dashboard', domain: 'admin', icon: BarChart3, primary: true, roles: ['lead', 'admin'] },
  { path: '/manager-insights', label: 'Manager Insights', domain: 'admin', icon: Layers, primary: true, roles: ['lead', 'admin'] },
  { path: '/live-metrics', label: 'Live Metrics', domain: 'admin', icon: Activity, primary: true, keywords: ['kpi'], roles: ['lead', 'admin'] },
  { path: '/critical-functions', label: 'Critical Functions', domain: 'admin', icon: Shield, primary: true, roles: ['lead', 'admin'] },
  { path: '/admin/airport-evaluation-officer', label: 'Airport Evaluation Officer', domain: 'admin', icon: MapPin, primary: false, roles: ['airport-evaluator', 'admin'] },
  { path: '/foreflight-test-upload', label: 'ForeFlight Test Upload', domain: 'admin', icon: Upload, primary: false, keywords: ['foreflight'], roles: ['admin'] },
  { path: '/foreflight-diagnostics', label: 'ForeFlight Sync Diagnostics', domain: 'admin', icon: Database, primary: false, keywords: ['foreflight', 'sync'], roles: ['admin'] },
  { path: '/experimental/scheduling-command', label: 'Master Command Center', domain: 'admin', icon: Activity, primary: false, roles: ['admin'] },
  { path: '/experimental/unified-trip', label: 'Trip Sandbox (Beta)', domain: 'admin', icon: Sparkles, primary: false, roles: ['admin'] },
  { path: '/tax-compliance', label: 'Tax Compliance', domain: 'admin', icon: BarChart3, sidebar: false, roles: ['tax', 'admin'] },

  // ── AviaSync (exclusive to maintenance-workflow role; unchanged by PR 2) ──
  { path: '/maintenance-workflow', label: 'AviaSync Dashboard', domain: 'aviasync', icon: Monitor, primary: true, roles: ['maintenance-workflow'] },
  { path: '/maintenance-workflow/tech-log', label: 'Electronic Tech Log', domain: 'aviasync', icon: ClipboardList, primary: true, roles: ['maintenance-workflow'] },
  { path: '/maintenance-workflow/mel', label: 'MEL Management', domain: 'aviasync', icon: AlertTriangle, primary: true, roles: ['maintenance-workflow'] },
  { path: '/maintenance-workflow/work-orders', label: 'Work Order Board', domain: 'aviasync', icon: Wrench, primary: true, roles: ['maintenance-workflow'] },
  { path: '/maintenance-workflow/technician', label: 'Technician View', domain: 'aviasync', icon: HardHat, primary: true, roles: ['maintenance-workflow'] },
  { path: '/maintenance-workflow/handover', label: 'Shift Handover', domain: 'aviasync', icon: ArrowRightLeft, primary: true, roles: ['maintenance-workflow'] },
  { path: '/maintenance-workflow/analytics', label: 'Predictive Analytics', domain: 'aviasync', icon: BarChart3, primary: true, roles: ['maintenance-workflow'] },
];

/** Entries visible to a user, by role. Same semantics as Navigation.tsx filtering. */
export function entriesForRoles(userRole: string, additionalRoles: string[] = []): NavEntry[] {
  return NAV_ENTRIES.filter(
    e => e.roles.includes(userRole) || additionalRoles.some(r => e.roles.includes(r)),
  );
}

/**
 * Longest-prefix match of a pathname against the manifest.
 * '/' matches only exactly (the Dashboard must not match every route).
 * Prefix boundaries are segment-aware: '/inventory-v2/unit-request' does NOT
 * match '/inventory-v2/unit-requests'.
 * Among entries with the same path (role-variant labels), the first wins —
 * pass `entriesForRoles(...)` as `entries` to get role-correct labels.
 */
export function matchEntry(pathname: string, entries: readonly NavEntry[] = NAV_ENTRIES): NavEntry | undefined {
  let best: NavEntry | undefined;
  for (const e of entries) {
    if (e.path === '/') {
      if (pathname === '/' && !best) best = e;
      continue;
    }
    if (pathname === e.path || pathname.startsWith(`${e.path}/`)) {
      if (!best || e.path.length > best.path.length) best = e;
    }
  }
  return best;
}
