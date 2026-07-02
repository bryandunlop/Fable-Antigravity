# Canonical Maintenance Surface — eTechLog

_Last updated: 2026-06-25 · branch `feat/techlog-phase23`_

This repo contains **three overlapping maintenance experiences** that accreted during prototyping.
For the myGFO eTechLog work (Phase 1 + the Phase 2/3 CAMP/myairops + work-card build), there is **one
canonical surface**. This note records that decision so the team builds in the right place and a future
backend swap is surgical.

## Canonical (build here)

- **`src/components/tech-log/`** — the compliance-grade eTechLog module. Append-only ledger model,
  PL-25 MEL clock, serviceability projection, AC 120-78B e-signature, CRS A&P-cert gate, RII dual
  sign-off, WORKCARD sign-off that returns the aircraft to service and closes the defect/deferral.
  - **Integration layer:** `src/components/tech-log/integration/` — `campClient.ts` (the canonical
    faked CAMP SOAP client), `useIntegration.ts` (the single hook every page calls), `campTaxonomy.ts`,
    `myairopsClient.ts`. **All new CAMP/myairops contracts go here.** A live-client swap touches only
    `campClient.ts`/`myairopsClient.ts`.

## Legacy / duplicate (do NOT extend)

These are earlier maintenance prototypes that duplicate parts of the canonical module. Files are
**retained** (nothing deleted) but should not receive new feature work.

- **AviaSync app** — `src/components/maintenance-workflow/*` (its own tech log, MEL workflow, work-order
  board, technician view, shift handover, analytics) + the shadow REST CAMP client
  `maintenance-workflow/services/campApi.ts`. **Use `tech-log/integration/campClient.ts` instead.**
- **Legacy maintenance app** — `MaintenanceContext`-backed components sharing `components/WorkOrders/`
  (`WorkOrders.tsx`, `WorkOrderDetails.tsx`, `maintenance/JobCard.tsx`, `TechLog.tsx`, etc.).

## What this branch changed (nav/role trim only — reversible, no files deleted)

De-routed from the demo so maintenance users land on the canonical **Tech Log**:

| Removed from nav/login | Path | Reason |
|---|---|---|
| Work Orders | `/work-orders` | duplicate of Tech Log → Work Cards |
| Maintenance Board | `/maintenance` | duplicate of Tech Log fleet/board |
| Maintenance Turnover | `/maintenance-turnover` | duplicate of Tech Log handover (Briefing/Postflight) |
| AviaSync Workflow group + persona | `/maintenance-workflow/*` | full duplicate eTechLog |

Routes still exist in `App.tsx` (reachable by URL); only the nav links + the AviaSync login persona were
removed. Restore by reverting the breadcrumbed lines in `Navigation.tsx` / `LoginScreen.tsx`.

## Left in place — overlap Tech Log, pending a decision

Not removed in this pass (open question for the DOM/owner — keep as distinct functions, or trim too?):
`Maintenance Hub` (`/maintenance-hub`), `My Maintenance` (`/maintenance-dashboard`),
`Work Analytics` (`/tech-work-analytics`), `MTTR Dashboard` (`/mttr-dashboard`),
`MEL/CDL Management` (`/mel-cdl`), `Turndown Reports`/`Turndown Form`.
