# Nav Simplification v2 (workspace-first) + GFO Phase 1 Chrome — Design Spec

**Date:** 2026-07-02
**Status:** Approved by Bryan (approach B · 9-domain workspace-first table · workspace front doors · maintenance trim-hard · two PRs, chrome second)
**Branch:** `feat/nav-v2` (off `main` @ `37426a0` — includes PR #5 workflow-weave fixes)
**Supersedes:** `2026-06-10-nav-simplification-design.md` (the approved Model-A spec). Its Track-1 code shipped on `feat/nav-simplification`, now ~86 commits stale and **abandoned as a branch** — it predates both workspaces and would resurrect routes techlog-phase23 removed. Its principles and verified components carry forward per this spec.
**Related:** `docs/superpowers/plans/2026-06-11-gfo-redesign-phase-1-chrome.md` (PR B executes this, refreshed) · `docs/CANONICAL_MAINTENANCE_SURFACE.md` (the "pending a decision" list is decided here) · vault `scheduling/REVIEW-2026-07-02-workflow-and-techlog-ux.md` (findings this spec closes).

## Goal

One navigation system, workspace-first: each department's workspace is its domain's front item and its role's login landing; legacy pages the workspaces absorbed drop behind "More"; the sidebar consolidates 14 groups → 9 domains driven by a single tested route manifest. Then the GFO chrome restyles the finished structure once.

## Principles (carried from the 2026-06-10 spec, still locked)

1. **Roles and routes are untouched.** Every item keeps its `roles` array verbatim; `ProtectedRoute` gating unchanged; no route paths change; no pages deleted. Items leave the *nav*, never the router.
2. **One source of truth:** `src/navigation/navConfig.ts` drives sidebar, breadcrumbs, ⌘K, and mobile.
3. **Structure before chrome:** PR A restructures within current tokens; PR B restyles once.

New in v2:

4. **Workspace-first.** The workspace is the first item of its domain and its role's front door.
5. **The manifest is tested.** A vitest suite asserts every manifest path is registered in `App.tsx` (source-scan; prefix match for param/query paths). Route drift becomes a failing test, not a silent redirect.

## Approach (B — fresh data, salvaged components)

Regenerate all route/role DATA from today's `Navigation.tsx` + `App.tsx` on main. Mine `feat/nav-simplification` only for route-data-free pieces verified working in its PR-1 pass — the `NotFound` view, the `matchEntry` longest-prefix helper, the ⌘K palette shell (recents, role gating, sections) — each inspected before reuse, never bulk-ported. The old branch is then deletable.

---

## PR A — Nav v2

### A1. Route manifest — `src/navigation/navConfig.ts`

`NavEntry` shape from the old spec unchanged: `{ path, label, domain, roles, primary?, icon?, keywords? }`. Known data quirks to encode (all exist in today's `Navigation.tsx`):

- **Role-variant labels:** `/upcoming-flights` is "Upcoming Trips" (inflight) and "Flight Calendar" (pilot); `/document-management` is "Document Management" (document-manager) and "Document Request" (everyone else). Manifest supports per-role label variants (the old branch's solved pattern).
- **Query hrefs:** `/safety?tab=my-activity` — active-trail matching uses pathname only.
- **Param routes** (tech-log/inventory detail routes) get breadcrumb-only entries (`primary` absent, not listed in sidebar/⌘K), as in the old spec.

**Tests (new):** route-audit (every path in `App.tsx`), role filtering (per-role visible sets for pilot/scheduling/maintenance/inflight/admin), breadcrumb resolution (longest-prefix incl. `/` exact-only), duplicate-path label variants.

### A2. Nine domains — the v2 table

Items keep exact labels, hrefs, and roles. Bold = workspace-first anchors.

| Domain | Primary | Behind "More" | Out of nav (route kept) |
|---|---|---|---|
| Home | Dashboard, Tasks & Action Items, Procedural Bulletins, Currency Dashboard, AOG Management | Master Command Center, Trip Sandbox (Beta) | Settings `/settings` — **dead-link candidate, verify route at plan time; prune if unregistered** |
| Flight Ops | **Pilot Workspace** | Preflight Workflow, Standalone FRAT, My FRAT Submissions, Airport Information, Fuel Load Request | — |
| Scheduling | **Scheduling Workspace**, Schedule Calendar, Crew Workload & Travel, Vacation Request | Scheduling Dashboard, Trip Coordination, Passenger Forms | — |
| Inflight | Upcoming Trips / Flight Calendar, Passenger Database, Catering Tracker, Post-Flight Checklist | Aircraft Cleaning, Aircraft Inventory | — |
| Inventory | Trips, Inspections, Commissary, Replenish, Unit Requests | Inventory Settings | — |
| Maintenance | **Tech Log**, Parts Inventory | Work Analytics, MTTR Dashboard, Turndown Reports, Turndown Form, Car Tracking, Airport Services, Fuel Farm Tracker, Standalone GRAT, Aircraft Cleaning | Maintenance Hub `/maintenance-hub`, My Maintenance `/maintenance-dashboard`, MEL/CDL Management `/mel-cdl` (duplicates of tech-log surfaces — trim-hard decision 2026-07-02, resolving the CANONICAL_MAINTENANCE_SURFACE open question) |
| Safety | Safety Center, My Safety Activity | — | — |
| Documents | Document Center, Document Request | Document Management, Offline Documents, Document Library | — |
| Admin | Admin Panel, Lead Dashboard, Manager Insights, Live Metrics, Critical Functions | Airport Evaluation Officer, ForeFlight Test Upload, Sync Diagnostics | ForeFlight Settings `/foreflight-settings` — dead-link candidate, same verify-then-prune rule |

**Deviation from the approved conversation table, with rationale:** Master Command Center + Trip Sandbox moved from Admin-More to **Home-More**. Their `roles` arrays include every operational role; leaving them under Admin would make the Admin domain visible to everyone (violating "most roles see 4–6 domains"). Home is the everyone-domain, so they land there. Roles untouched.

- Aircraft Cleaning appears under both Inflight-More and Maintenance-More via **two role-scoped manifest entries for the same path** (`NavEntry.domain` stays single-valued): an Inflight entry with the inflight-side roles and a Maintenance entry with the maintenance-side roles, together covering today's role list exactly. Breadcrumbs/active-trail resolve by role, the same mechanism as the label variants (A1).
- AviaSync: gone from nav and login since techlog-phase23; not in the table; its routes remain registered.
- Maintenance headline: 4 groups / ~17 visible → 1 group / 2 visible. Pilots reach MEL inside the tech-log (Records → MEL); maintenance edits it under tech-log Admin → MEL admin.

### A3. Sidebar behavior

Collapsible domains persisted per role (`nav-collapsed-${role}`); existing drag-reorder retained, now over domains (stale `nav-order-*` values fall back gracefully). "More" expander renders when a domain has non-primary items visible to the role; expansion not persisted. Active trail = longest-prefix (exact-only for `/`). Default open: the role's home domain (pilot/chief-pilot → Flight Ops; scheduling → Scheduling; maintenance/maintenance-coordinator/dom → Maintenance; inflight → Inflight + Inventory; commissary-manager → Inventory; admin/lead and all others → Home).

### A4. Front doors

Post-login navigation (LoginScreen flow): pilot/chief-pilot → `/pilot-workspace` (today's behavior, mechanism may move), scheduling → `/scheduling-workspace`, maintenance / maintenance-coordinator / dom → `/tech-log`, all others → `/`. **`/` keeps rendering the Dashboard for every role** — plan-time note: today the `/` index element redirects pilots to the workspace (App.tsx ~217), which makes the sidebar Dashboard item a self-redirect for them; move that redirect into the login flow so Dashboard stays reachable for everyone. Roles/gating unchanged.

### A5. Breadcrumbs, ⌘K, 404 (Track 1 rebuilt on the v2 manifest)

- **Breadcrumbs:** `BreadcrumbNav` resolves `Home › {Domain} › {Page}` from the manifest by longest-prefix; hardcoded `routeLabels` map deleted. Param routes resolve their parent chain with generic leaf labels.
- **⌘K:** one palette — manifest pages filtered by role, recents (last 5 distinct section paths, `nav-recents`), live inventory search for entitled roles (lazy `GET /api/state`, session-cached), mock flight/passenger results deleted. `InventorySearchDialog.tsx` deleted after its logic moves.
- **404:** real NotFound view (attempted path + link home) replaces the `path="*"` silent redirect; unauthenticated `/login` redirect unchanged.

### A6. Mobile

`MobileBottomNav` keeps its 4 per-role items and gains a fifth "More" opening a bottom sheet with the full role-filtered domain menu, read from the manifest.

---

## PR B — GFO Phase 1 chrome (on the finished structure)

Executes `docs/superpowers/plans/2026-06-11-gfo-redesign-phase-1-chrome.md`, refreshed before execution:

- Content unchanged: light-mode sidebar tokens flip to Midnight **in the same commit** as the Navigation restyle (chrome is brand-constant in both modes); real GFO lockup header (`src/assets/gfo/`); branded top bar; Midnight login showpiece with circle motif; Dashboard eyebrow/`GfoPageHeader` pattern; new `GfoEmptyState` primitive. Premium rules in force: Sunrise gold only in nav-group eyebrows + featured callouts; 200ms `cubic-bezier(0.4,0,0.2,1)`; press darkens, never scales.
- Refresh needed: the plan predates the workspaces and the manifest-driven Navigation (its line numbers and component structure assume the old in-file arrays), and its verification model predates the test runner. New gates: 329+-test vitest suite green, `vite build` clean, no new tsc errors, visual pass light+dark.

## Verification (per PR)

- Full vitest (incl. the new manifest suites) · `npx vite build` · `npx tsc --noEmit` no new errors vs baseline.
- Browser pass per role (dev role-switch): correct domains/items and More contents; front door lands right; every sidebar item navigates (no silent redirects — 404 catches strays); breadcrumbs on every section; ⌘K role-filtered pages + recents + inventory; mobile More sheet. PR B adds the visual chrome checks in both modes.

## Out of scope

- Role/permission changes, auth, route path changes, page deletions or redesigns.
- The claude.ai/design GFO import (deferred to its own session — decision 2026-07-02).
- Tech-log's internal nav (`engine/nav.ts`) — already role-adaptive and just reworked in PR #5.
- Hub/landing-page redesigns beyond the front-door routing.
