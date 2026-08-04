// Canonical navigation manifest — single source of truth for routes.
// Consumed by Navigation (sidebar), BreadcrumbNav, CommandPalette, MobileBottomNav,
// and the login front-door redirect. When adding a route to App.tsx, add its entry
// here in the same commit — navConfig.test.ts audits every path against App.tsx.
//
// v2 (2026-07-02): workspace-first domains per
// docs/superpowers/specs/2026-07-02-nav-simplification-v2-gfo-chrome-design.md.
// Shape + helpers carried from the verified feat/nav-simplification PR-1 pass;
// entry DATA regenerated from Navigation.tsx/App.tsx on main @ 37426a0.
import type { LucideIcon } from 'lucide-react';
import {
  Activity, AlertOctagon, AlertTriangle, Archive, ArrowRightLeft, BarChart3,
  Boxes, Building2, Calendar, CalendarCheck, ClipboardCheck,
  ClipboardList, Database, FileText, Flag, Fuel, HardHat, Home, Layers,
  MapPin, Monitor, Package, PackagePlus, Plane, Send, Settings, Shield,
  Sliders, Sparkles, Target, Upload, UserCheck, Users, Utensils, Warehouse,
  Wrench,
} from 'lucide-react';

export type Domain =
  | 'home' | 'flight-ops' | 'scheduling' | 'inflight' | 'inventory'
  | 'maintenance' | 'safety' | 'documents' | 'admin';

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
};

export const DOMAIN_ORDER: Domain[] = [
  'home', 'flight-ops', 'scheduling', 'inflight', 'inventory',
  'maintenance', 'safety', 'documents', 'admin',
];

export interface NavEntry {
  path: string;
  label: string;
  domain: Domain;
  roles: string[];
  icon?: LucideIcon;
  href?: string;          // link target when it differs from path (query links)
  keywords?: string[];    // extra search terms for the command palette
  primary?: boolean;      // false = behind the domain's "More" expander
  sidebar?: boolean;      // false = never a sidebar item (breadcrumbs/⌘K only)
  searchable?: boolean;   // false = excluded from the command-palette page index
  detailLabel?: string;   // breadcrumb leaf for sub-paths (e.g. trip detail)
  hidden?: boolean;       // true = render NO link anywhere (sidebar + ⌘K), but the
                          // route stays registered and audited. "Hidden means render
                          // no link; it does not mean unknown to the system."
                          // (Work Ledger design §7 — the finding-#14 lesson.)
}

// Where each role lands right after login. Everyone else lands on '/' (Dashboard).
export const FRONT_DOORS: Record<string, string> = {
  'pilot': '/pilot-workspace',
  'chief-pilot': '/pilot-workspace',
  'scheduling': '/scheduling-command',
  'maintenance': '/tech-log',
  'maintenance-coordinator': '/tech-log',
  'dom': '/tech-log',
  'maintenance-workflow': '/maintenance-workflow',
};

// Sidebar domains open by default on first visit (everything else starts collapsed).
export const DEFAULT_OPEN_DOMAINS: Record<string, Domain[]> = {
  'pilot': ['flight-ops'],
  'chief-pilot': ['flight-ops'],
  'scheduling': ['scheduling'],
  'maintenance': ['maintenance'],
  'maintenance-coordinator': ['maintenance'],
  'dom': ['maintenance'],
  'inflight': ['inflight', 'inventory'],
  'commissary-manager': ['inventory'],
  'admin': ['home'],
  'lead': ['home'],
};

export const NAV_ENTRIES: readonly NavEntry[] = [
  // ── Home ──────────────────────────────────────────────────────────────────
  { path: '/', label: 'Dashboard', domain: 'home', icon: Home, primary: true, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling', 'document-manager'] },
  { path: '/tasks-action-items', label: 'Tasks & Action Items', domain: 'home', icon: Target, primary: true, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling'] },
  // Per-approver inbox (D39): requests awaiting your role's sign-off, plus what you filed.
  { path: '/approvals', label: 'Approvals', domain: 'home', icon: ClipboardCheck, primary: true, keywords: ['approve', 'waiver', 'sign-off', 'request'], roles: ['pilot', 'chief-pilot', 'inflight', 'fa-manager', 'maintenance', 'chief-inspector', 'shift-lead', 'safety', 'lead', 'scheduling', 'document-manager', 'admin', 'dom'] },
  // D66: Procedural Bulletins and Flight Ops Bulletins used to sit here and under
  // flight-ops as their own doors. They read in the Document Center now — one place,
  // all documents — so their keywords moved onto that entry rather than being lost.
  { path: '/currency-dashboard', label: 'Currency Dashboard', domain: 'home', icon: UserCheck, primary: true, keywords: ['currency', 'compliance', 'landings', '61.58'], roles: ['pilot', 'admin', 'lead', 'scheduling'] },
  // '/aog-management' and '/experimental/unified-trip' (Trip Sandbox) were REMOVED 2026-08-03:
  // the tech log owns AOG (`/tech-log/aog`), and the sandbox was a beta that never graduated.
  // The tech-log AOG page is maintenance-scoped, so this narrows who sees an AOG surface at all —
  // if inflight/safety/scheduling need one, widen '/tech-log' below rather than reviving the
  // standalone page.

  // ── Flight Ops — the Pilot Workspace is the front item; absorbed pages behind More ──
  { path: '/pilot-workspace', label: 'Pilot Workspace', domain: 'flight-ops', icon: CalendarCheck, primary: true, keywords: ['flight hub', 'my flights', 'preflight'], roles: ['pilot', 'chief-pilot', 'admin'] },
  { path: '/frat', label: 'Preflight Workflow', domain: 'flight-ops', icon: ClipboardList, primary: false, keywords: ['frat', 'risk', 'preflight'], roles: ['pilot', 'admin'] },
  { path: '/frat/standalone', label: 'Standalone FRAT', domain: 'flight-ops', icon: Shield, primary: false, roles: ['pilot', 'admin'] },
  { path: '/frat/my-submissions', label: 'My FRAT Submissions', domain: 'flight-ops', icon: FileText, primary: false, roles: ['pilot', 'admin'] },
  { path: '/airport-evaluations', label: 'Airport Information', domain: 'flight-ops', icon: MapPin, primary: false, roles: ['pilot', 'admin'] },
  // The mock-backed directory that /airport-evaluations replaced (D45, D48). Unlinked,
  // but still routed because it owns the propose/review/publish screens until those are
  // rewired onto real state (D46).
  { path: '/airport-evaluations/legacy', label: 'Airport Information (legacy mock)', domain: 'flight-ops', icon: MapPin, hidden: true, sidebar: false, searchable: false, roles: ['admin'] },
  { path: '/airport-evaluations/worklist', label: 'Airport Worklist', domain: 'flight-ops', icon: MapPin, primary: false, keywords: ['airport', 'worklist', 'review', 'stale', 'overdue', 'never reviewed'], roles: ['airport-evaluator', 'chief-pilot', 'admin'] },
  { path: '/airport-evaluations/review', label: 'Airport Page Review', domain: 'flight-ops', icon: MapPin, primary: false, keywords: ['airport', 'proposal', 'approve', 'company page'], roles: ['airport-evaluator', 'chief-pilot', 'admin'] },
  { path: '/airport-evaluations/flags', label: 'Airport Flags', domain: 'flight-ops', icon: MapPin, primary: false, keywords: ['flag', 'rule', 'short runway', 'noise abatement'], roles: ['airport-evaluator', 'chief-pilot', 'admin'] },
  { path: '/fuel-load-request', label: 'Fuel Load Request', domain: 'flight-ops', icon: Fuel, primary: false, roles: ['pilot', 'admin'] },
  { path: '/frat/review', label: 'FRAT Review', domain: 'flight-ops', icon: FileText, sidebar: false, roles: ['safety', 'admin'] },
  { path: '/flight-operations-center', label: 'Flight Operations Center', domain: 'flight-ops', icon: Monitor, sidebar: false, keywords: ['foc', 'ops center'], roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling'] },
  { path: '/aircraft', label: 'Aircraft Status', domain: 'flight-ops', icon: Plane, sidebar: false, keywords: ['fleet', 'tail number', 'status'], roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling'] },
  // FIR — retrospective ops explainability (docs/FIR_MODULE_DESIGN.md). Any role can open one (§7 bottom-up capture).
  { path: '/fir', label: 'Irregularity Reports', domain: 'flight-ops', icon: Flag, primary: false, detailLabel: 'FIR', keywords: ['fir', 'irregularity', 'aog report', 'delay', 'debrief', 'downtime', 'why'], roles: ['pilot', 'chief-pilot', 'inflight', 'maintenance', 'maintenance-coordinator', 'dom', 'lead', 'safety', 'scheduling', 'admin'] },
  { path: '/fleet-map', label: 'Live Fleet Map', domain: 'flight-ops', icon: MapPin, sidebar: false, searchable: false, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling'] },

  // ── Scheduling — the Scheduling Workspace leads ───────────────────────────
  { path: '/scheduling-command', label: 'Master Command Center', domain: 'scheduling', icon: CalendarCheck, primary: true, keywords: ['run board', 'checklist', 'handoff', 'plan board', 'trips', 'templates'], roles: ['scheduling', 'admin'] },
  { path: '/schedule', label: 'Schedule Calendar', domain: 'scheduling', icon: Calendar, primary: true, roles: ['pilot', 'admin'] },
  { path: '/crew-scheduling-workload', label: 'Crew Workload & Travel', domain: 'scheduling', icon: BarChart3, primary: true, roles: ['scheduling', 'admin', 'lead'] },
  { path: '/vacation-request', label: 'Vacation Request', domain: 'scheduling', icon: CalendarCheck, primary: true, roles: ['pilot', 'inflight', 'maintenance', 'admin', 'lead', 'scheduling', 'maintenance-coordinator', 'dom'] },
  { path: '/booking-portal', label: 'Booking Portal', domain: 'scheduling', icon: Send, primary: true, keywords: ['booking', 'empty seats', 'trip request', 'ea', 'watches', 'fleet hold'], roles: ['admin-assistant', 'scheduling', 'admin', 'lead'] },
  { path: '/scheduling-dashboard', label: 'Scheduling Dashboard', domain: 'scheduling', icon: Calendar, primary: false, roles: ['scheduling', 'admin'] },
  { path: '/trip-coordination', label: 'Trip Coordination', domain: 'scheduling', icon: MapPin, primary: false, roles: ['scheduling', 'admin'] },
  { path: '/passenger-forms', label: 'Passenger Forms', domain: 'scheduling', icon: FileText, primary: false, roles: ['scheduling', 'admin'] },
  { path: '/passenger-currency', label: 'Passenger Data Currency', domain: 'scheduling', icon: UserCheck, primary: false, keywords: ['passport', 'stale', 'outreach', 'manifest', 'crm'], roles: ['scheduling', 'admin'] },

  // ── Inflight ──────────────────────────────────────────────────────────────
  { path: '/upcoming-flights', label: 'Upcoming Trips', domain: 'inflight', icon: Calendar, primary: true, keywords: ['flights', 'manifest'], roles: ['inflight', 'admin'] },
  { path: '/upcoming-flights', label: 'Flight Calendar', domain: 'inflight', icon: Calendar, primary: true, roles: ['pilot'] },
  { path: '/passenger-database', label: 'Passenger Database', domain: 'inflight', icon: Users, primary: true, keywords: ['vip', 'preferences', 'allergies', 'guest'], roles: ['inflight', 'admin'] },
  { path: '/catering-tracker', label: 'Catering Tracker', domain: 'inflight', icon: Utensils, primary: true, roles: ['inflight', 'admin'] },
  { path: '/post-flight-checklist', label: 'Post-Flight Checklist', domain: 'inflight', icon: ClipboardCheck, primary: true, roles: ['inflight', 'admin'] },
  { path: '/aircraft-inventory', label: 'Aircraft Inventory', domain: 'inflight', icon: Package, primary: false, roles: ['inflight', 'admin'] },
  { path: '/aircraft-cleaning', label: 'Aircraft Cleaning', domain: 'inflight', icon: Sparkles, primary: false, roles: ['inflight', 'admin'] },
  { path: '/catering-orders', label: 'Catering Orders', domain: 'inflight', icon: Utensils, sidebar: false, roles: ['inflight', 'admin'] },

  // ── Inventory ─────────────────────────────────────────────────────────────
  { path: '/inventory-v2/trips', label: 'Trips', domain: 'inventory', icon: Plane, primary: true, detailLabel: 'Trip', roles: ['inflight', 'admin', 'commissary-manager'] },
  { path: '/inventory-v2/inspections', label: 'Inspections', domain: 'inventory', icon: ClipboardCheck, primary: true, roles: ['inflight', 'admin', 'commissary-manager'] },
  { path: '/inventory-v2/commissary', label: 'Commissary', domain: 'inventory', icon: Warehouse, primary: true, keywords: ['stock', 'stockroom', 'par'], roles: ['inflight', 'admin', 'commissary-manager'] },
  { path: '/inventory-v2/replenish', label: 'Replenish', domain: 'inventory', icon: PackagePlus, primary: true, keywords: ['restock'], roles: ['inflight', 'admin'] },
  { path: '/inventory-v2/unit-requests', label: 'Unit Requests', domain: 'inventory', icon: Send, primary: true, roles: ['inflight', 'admin'] },
  { path: '/inventory-v2/settings', label: 'Inventory Settings', domain: 'inventory', icon: Settings, primary: false, keywords: ['par levels', 'fleet', 'items'], roles: ['admin', 'commissary-manager'] },
  { path: '/inventory-v2/activity-log', label: 'Activity Log', domain: 'inventory', icon: Activity, sidebar: false, roles: ['inflight', 'admin'] },
  { path: '/inventory-v2/unit-request', label: 'New Unit Request', domain: 'inventory', icon: Send, sidebar: false, searchable: false, roles: ['inflight', 'admin'] },
  { path: '/inventory-v2/inspection', label: 'Inspection', domain: 'inventory', icon: ClipboardCheck, sidebar: false, searchable: false, detailLabel: 'Review', roles: ['inflight', 'admin'] },

  // ── Maintenance — trim-hard (2026-07-02): Tech Log + Parts primary; hub/dash/mel-cdl out of nav ──
  { path: '/tech-log', label: 'Tech Log', domain: 'maintenance', icon: FileText, primary: true, keywords: ['squawk', 'defect', 'deferral', 'mel', 'release', 'work card', 'aog', 'aircraft on ground'], roles: ['pilot', 'maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/parts-inventory', label: 'Parts Inventory', domain: 'maintenance', icon: Boxes, primary: true, keywords: ['mycmp', 'procurement', 'stock'], roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/tech-work-analytics', label: 'Work Analytics', domain: 'maintenance', icon: BarChart3, primary: false, roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/mttr-dashboard', label: 'MTTR Dashboard', domain: 'maintenance', icon: Activity, primary: false, roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/turndown-reports', label: 'Turndown Reports', domain: 'maintenance', icon: FileText, primary: false, roles: ['maintenance', 'admin', 'lead', 'maintenance-coordinator', 'dom'] },
  { path: '/turndown-form', label: 'Turndown Form', domain: 'maintenance', icon: ClipboardList, primary: false, roles: ['maintenance', 'maintenance-coordinator'] },
  { path: '/car-tracking', label: 'Car Tracking', domain: 'maintenance', icon: Package, primary: false, roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/airport-services', label: 'Airport Services', domain: 'maintenance', icon: Building2, primary: false, roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/fuel-farm', label: 'Fuel Farm Tracker', domain: 'maintenance', icon: Fuel, primary: false, roles: ['maintenance', 'maintenance-coordinator', 'dom'] },
  { path: '/grat/standalone', label: 'Standalone GRAT', domain: 'maintenance', icon: Shield, primary: false, roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/aircraft-cleaning', label: 'Aircraft Cleaning', domain: 'maintenance', icon: Sparkles, primary: false, roles: ['pilot', 'maintenance', 'maintenance-coordinator', 'dom'] },
  // Out of the nav (trim-hard) — routes stay reachable; breadcrumbs/⌘K still resolve them.
  { path: '/maintenance-hub', label: 'Maintenance Hub', domain: 'maintenance', icon: Monitor, sidebar: false, roles: ['maintenance', 'admin', 'lead', 'maintenance-coordinator', 'dom'] },
  { path: '/maintenance-dashboard', label: 'My Maintenance', domain: 'maintenance', icon: ClipboardList, sidebar: false, roles: ['maintenance', 'maintenance-coordinator'] },
  { path: '/mel-cdl', label: 'MEL/CDL Management', domain: 'maintenance', icon: AlertTriangle, sidebar: false, keywords: ['mel', 'cdl', 'deferral'], roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  // De-navved by techlog-phase23; routes remain registered (CANONICAL_MAINTENANCE_SURFACE.md).
  { path: '/work-orders', label: 'Work Orders (legacy)', domain: 'maintenance', icon: ClipboardCheck, sidebar: false, searchable: false, roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/maintenance-turnover', label: 'Maintenance Turnover (legacy)', domain: 'maintenance', icon: ArrowRightLeft, sidebar: false, searchable: false, roles: ['maintenance', 'admin', 'maintenance-coordinator', 'dom'] },
  { path: '/maintenance', label: 'Maintenance Board (legacy)', domain: 'maintenance', icon: Wrench, sidebar: false, searchable: false, roles: ['maintenance', 'admin', 'lead', 'maintenance-coordinator', 'dom'] },
  { path: '/maintenance/technician', label: 'Technician Dashboard (legacy)', domain: 'maintenance', icon: HardHat, sidebar: false, searchable: false, roles: ['maintenance', 'admin'] },
  { path: '/grat/review', label: 'GRAT Review', domain: 'maintenance', icon: Shield, sidebar: false, searchable: false, roles: ['safety', 'admin'] },

  // ── Safety ────────────────────────────────────────────────────────────────
  // One Safety entry (D38). The former "My Safety Activity" (dead ?tab= link) and
  // "My Safety Participation" (/user-safety) surfaces are retired.
  { path: '/safety', label: 'Safety', domain: 'safety', icon: Shield, primary: true, keywords: ['sms', 'hazard', 'asap', 'audit', 'waiver', 'cws', 'caught working safely', 'safety center'], roles: ['pilot', 'inflight', 'maintenance', 'safety', 'admin', 'lead', 'scheduling', 'document-manager', 'admin-assistant'] },
  { path: '/asap-report', label: 'ASAP Report', domain: 'safety', icon: FileText, sidebar: false, searchable: false, roles: ['pilot', 'inflight', 'maintenance', 'safety', 'admin', 'lead', 'scheduling'] },
  { path: '/safety/form-fields', label: 'Form Field Manager', domain: 'safety', icon: Sliders, sidebar: false, keywords: ['frat', 'grat', 'customize', 'scoring'], roles: ['safety', 'admin'] },

  // ── Documents ─────────────────────────────────────────────────────────────
  { path: '/documents', label: 'Document Center', domain: 'documents', icon: Archive, primary: true, detailLabel: 'Document', keywords: ['manual', 'gom', 'library', 'sop', 'compliance', 'read and initial', 'tribal knowledge', 'bulletin', 'bulletins', 'procedural bulletin', 'flight ops bulletin', 'pb', 'fob', 'interim', 'nonofficial', 'cabin knowledge', 'bedding', 'cabin lighting', 'wifi'], roles: ['pilot', 'inflight', 'lead-fa', 'fa-manager', 'commissary-manager', 'admin', 'lead', 'safety', 'maintenance', 'scheduling', 'document-manager', 'procedural-specialist'] },
  { path: '/documents', label: 'Document Library', domain: 'documents', icon: Archive, primary: true, roles: ['dms-manager'] },

  // ── Admin ─────────────────────────────────────────────────────────────────
  { path: '/admin', label: 'Admin Panel', domain: 'admin', icon: Settings, primary: true, keywords: ['users', 'management'], roles: ['admin'] },
  { path: '/lead-dashboard', label: 'Lead Dashboard', domain: 'admin', icon: BarChart3, primary: true, roles: ['lead', 'admin'] },
  { path: '/manager-insights', label: 'Manager Insights', domain: 'admin', icon: Layers, primary: true, roles: ['lead', 'admin'] },
  { path: '/live-metrics', label: 'Live Metrics', domain: 'admin', icon: Activity, primary: true, keywords: ['kpi'], roles: ['lead', 'admin'] },
  { path: '/critical-functions', label: 'Critical Functions', domain: 'admin', icon: Shield, primary: true, roles: ['lead', 'admin'] },
  { path: '/admin/airport-evaluation-officer', label: 'Airport Evaluation Officer', domain: 'admin', icon: MapPin, primary: false, roles: ['airport-evaluator', 'admin'] },
  { path: '/foreflight-test-upload', label: 'ForeFlight Test Upload', domain: 'admin', icon: Upload, primary: false, keywords: ['foreflight'], roles: ['admin'] },
  { path: '/foreflight-diagnostics', label: 'ForeFlight Sync Diagnostics', domain: 'admin', icon: Database, primary: false, keywords: ['foreflight', 'sync'], roles: ['admin'] },
  // The Work Ledger window (design §7). Hidden: the only door is the "Created by
  // Bryan Dunlop" credit on the login screen — project plumbing, not product.
  // It sits OUTSIDE the authenticated shell (public outer route) so the door
  // works pre-login; exposure is bounded by Vercel SSO, the demo's real gate.
  { path: '/ops', label: 'Ops Ledger', domain: 'admin', icon: Activity, hidden: true, sidebar: false, searchable: false, roles: ['admin'] },
];

/** Entries visible to a user, by role. Same semantics as Navigation.tsx filtering. */
export function entriesForRoles(userRole: string, additionalRoles: string[] = []): NavEntry[] {
  return NAV_ENTRIES.filter(
    e => e.roles.includes(userRole) || additionalRoles.some(r => e.roles.includes(r)),
  );
}

export interface DomainGroup {
  domain: Domain;
  label: string;
  primary: NavEntry[];
  more: NavEntry[];
}

/** Sidebar model: the role's visible entries grouped into ordered domains. */
export function domainsForRole(userRole: string, additionalRoles: string[] = []): DomainGroup[] {
  const visible = entriesForRoles(userRole, additionalRoles).filter((e) => e.sidebar !== false && !e.hidden);
  return DOMAIN_ORDER.map((domain) => {
    const in_ = visible.filter((e) => e.domain === domain);
    return {
      domain,
      label: DOMAIN_LABELS[domain],
      primary: in_.filter((e) => e.primary),
      more: in_.filter((e) => !e.primary),
    };
  }).filter((d) => d.primary.length + d.more.length > 0);
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
