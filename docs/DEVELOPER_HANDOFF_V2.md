# v2 Developer Handoff — Tech Log, Scheduling, Pilot Workspace, Inventory v2

**Audience:** the engineering team taking this over for production build-out (backend, real integrations, deployment hardening).
**As of:** 2026-07-06, branch `feat/watchlist-scheduling-board`, commit `a753496`.

## Where this lives

- **Repo:** `github.com/bryandunlop/Fable-Antigravity`
- **Live demo:** https://antigravity-v2-fable.vercel.app (auto-deploys from this repo's `feat/watchlist-scheduling-board` branch via the Vercel GitHub integration — that branch, not `main`, is what Vercel treats as production for this project)
- **Stack:** Vite + React 18 + TypeScript + Tailwind v4 + shadcn/Radix, client-side SPA (`react-router`), no server
- **Legacy repo — frozen, do not push here:** `Antigravity-Aviation-Management-System` (Vercel project renamed `antigravity-v1`). This repo (`Fable-Antigravity`) is a confirmed strict superset of it via `git merge-base` — no code migration needed, it was purely a Vercel project split.

## Running it

```
npm i
npm run dev        # vite dev server
npx vitest run      # 498/498 passing as of this handoff
npx tsc --noEmit    # 264 pre-existing errors — all in vendored shadcn/ui files with
                    # version-pinned imports (e.g. `@radix-ui/react-toggle@1.1.2`);
                    # none introduced by the work described here, safe to triage separately
```

## The one thing to understand before anything else

**Everything described below is a demo.** There is no real backend. State lives in `useReducer` + `localStorage` (versioned, with a "Reset demo" control) or, for Scheduling, an in-memory store. The code was written so a dev can swap the persistence/API layer without rewriting the UI:

- **Tech Log** — API calls are shaped to match the real CAMP (SOAP) and myairops (OData/webhook) contracts, but the responses are faked. See `src/components/tech-log/integration/`.
- **Scheduling** — already has *two* store implementations behind one `SchedulingStore` interface: an in-memory one (used today) and a real Drizzle/Postgres adapter (`docs/scheduling` has the runbook). Swapping is mostly picking the adapter, not rewriting call sites.
- **Pilot Workspace / Inventory v2** — pure client state; no persistence contract has been designed yet. Treat these as UI/UX references, not API specs.

---

## Module 1: Tech Log (electronic tech log / maintenance ledger)

- **Route:** `/tech-log/*` (`TechLogRoutes`, `src/components/tech-log/`)
- **Design spec:** `docs/tech-log/` + vault `02-Platform/Tech Log/`
- **Governing rules:** `CLAUDE.md` in the myGFO spec project — MEL clock math (PL-25), append-only ledger, serviceability derivation, CAMP sandbox-only, etc. Treat those NEVER/ALWAYS rules as binding even though this repo is a demo; they're what the real build must satisfy.

**What's built** (9 phases, all with vitest coverage in `engine/`):
1. Regulatory engine foundations (pure functions: `pl25.ts`, serviceability §14.2, supersede, signing gates)
2. Fleet Status board + Aircraft Detail
3. Defects (pilot capture → RED, maintenance triage)
4. MEL Deferrals — real D195 picker (984 real MEL items, G500/G650ER), PL-25 clock, provisional-G800 block, (M)/placard gating (`PENDING_PLACARD` → `ACTIVE`), extension rules (A/D blocked, B/C once)
5. Maintenance Release — CRS + A&P-cert gate + RII dual sign-off
6. Journey Log — OOOI, crew-distinct/monotonicity/required-field gates
7. Admin reference-data editing (Fleet/Personnel/MEL), now behind a **four-eyes approval queue** (`PendingApprovalsPanel`) — no more single-click edits to signer-critical fields
8. Audit/ledger + supersede UX, with **fork detection**: a second correction attempt on an already-superseded record is rejected and routed to reconciliation instead of silently creating a duplicate "current" row
9. Watch-list defect disposition (`WATCHLISTED`) — its own sign ceremony, work-queue bucket, and CAMP `DEFERRED-WATCHLIST` mapping, kept serviceability-neutral

Plus a simulated CAMP/myairops integration layer (`tech-log/integration/`): session/error-taxonomy handling (re-login-once, stop-on-lockout), `GetAircraftDiscrepancies` read-back, supersede → `IntegrateDiscrepancies` EDIT/UPDATE mapping, a hard block on the undocumented utilization-push endpoint, a human-gated sandbox→production promotion guard, and a myairops webhook receiver simulator (CloudEvents + HMAC). Also: AOG tracked escalation, out-of-service→run-cards→return-to-service spine, per-step RII sign-off at scale, closed-WO history, MTBUR roll-up by ATA.

**Blocked / needs the DOM or CAMP vendor before real build:**
- CAMP utilization-push SOAP operation is undocumented — do not guess it (OQ1)
- myairops OData entity shapes/auth method unconfirmed (OQ2)
- Supersede-authorization model (who may correct whose record) needs a Chief Pilot/DOM ruling (OQ5)
- 14 CFR 91.407(b) maintenance check-flight gate has **no code yet** — flagged as a real gap in the 2026-07-03 audit, needs a DOM ruling on trigger conditions before schema freeze (OQ10)
- Full list of open questions lives in the myGFO project's `CLAUDE.md` — resolve there before building the corresponding backend piece.

---

## Module 2: Scheduling Command

- **Route:** `/scheduling-command` (this is now the single front door; `/scheduling-workspace` and `/experimental/scheduling-command` both redirect here)
- **Design docs:** `docs/scheduling/`

**Architecture (already closer to production-shaped than Tech Log):**
- `src/scheduling/` — the rules engine, built test-first: due-date computation, condition evaluation (`routeTouchesCountry`/ICAO→country geo for international rules), time-trigger + ack-escalation, audited task transitions, trip-readiness derivation
- Data layer: `SchedulingStore` interface with an in-memory implementation and a **real Drizzle/Postgres adapter** (developer-run migration path documented in the scheduling runbook), composed via `SchedulingService`
- `src/components/scheduling-command/` — the UI: tail × time **Plan Board** (CSS-only Gantt with real window/lane-conflict math), **Run Board** (due-horizon task inbox), Trips panel, Templates (no-code checklist editor: due-rule builder, ALL/ANY condition builder, versioned publish with instance pinning — publishing v2 doesn't retroactively change an in-flight trip's v1 checklist), Handoff Inbox, ForeFlight document push (myairops pull → match flight → push files)

**Current caveat:** as of the last rebuild (2026-07-03), the Command Center's boards run against a **mock adapter**, not the production `src/scheduling/` engine — that wiring was deliberately deferred (Bryan's call: iterate the mock first). Confirm current state before assuming the real engine is live; this is the kind of detail that goes stale fast in this repo.

**Also built:** international/country-conditional + DASSP T-minus checklists; a preflight bridge to Tech Log (project a scheduling trip into preflight, release-to-preflight, deep link back); a maintenance handoff loop-closer that surfaces Tech Log's downstream status back on the scheduling trip; deterministic seeded demo data (`seedVolumeTrips`) for repeatable month-scale demos.

---

## Module 3: Pilot Workspace (preflight workflow)

- **Route:** `/pilot-workspace`
- Reuses the Tech Log FRAT form and its write helpers (`370f852` extracted shared preflight leg-write helpers) rather than forking the preflight logic — worth preserving that reuse in the real build.

**What's built:**
- Flight Hub shell with a **composite readiness bar** and a my-flights list (pure selectors, unit-tested)
- Trip brief panel with acknowledgment, driven over a shared in-memory event bus
- Aircraft & acceptance panel — surfaces serviceability, custody, and MEL status, with a deep-link accept action
- Preflight panel — the shared FRAT form, with save-draft/resume
- Messages panel (pilot-targeted events)
- Squawk & nuisance-item entry points reachable from Flight Hub, Trip Workspace, and pilot nav

No persistence contract exists for this module yet — it's the newest of the four and hasn't been through an integration-design pass the way Tech Log and Scheduling have.

---

## Module 4: Inventory v2

- **Routes:** `/inventory-v2/*` (inspections, inspection detail/review, recently-completed, replenish, unit-request(s), settings, commissary + per-location/per-item detail, trips + grocery-list + leg-reconciliation, activity-log)
- Most recent addition: post-trip restock redesigned with usage vs. full-count modes.
- This module predates the Tech Log/Scheduling integration-design work and doesn't yet have the same API-contract-shaped mock layer — treat it as UI reference more than a backend spec.

---

## Cross-cutting

- **Navigation & GFO design system:** manifest-driven nav (`src/navigation/navConfig.ts`) — 9 workspace-first domains, role-based front doors at login, sidebar "More" expanders with persisted collapse, unified command palette, breadcrumbs, a real 404, mobile "More" sheet + bottom nav. Brand chrome (Midnight/Daylight/Sunrise) applied across login, sidebar, dashboard, mobile nav — see `docs/` chrome plan docs and vault note "GFO design conformance." **Important:** the custody gold/blue axis (maintenance↔pilot handover) is deliberately kept visually distinct from CAMP green/yellow/red RAG status — don't let a future redesign merge those palettes.
- **Demo password gate:** `/login` now requires the password `mygfo` before reaching the role picker (`PasswordGate.tsx`), unlocked once per browser via `localStorage` — purely a demo-access convenience, not a real auth boundary. Real auth is Entra ID per the myGFO spec.
- **Testing state:** 498/498 vitest passing, 264 pre-existing TypeScript errors (all vendored `ui/` component version-pin issues, not from this work).
- **Full code-review findings:** an 8-angle adversarial code review of `main...feat/watchlist-scheduling-board` found 31 confirmed issues; the top 5 are fixed (commits `7b4c8e3`..`3851f47`). Findings 6–31 are still open — see vault `02-Platform/Tech Log/Watchlist-Scheduling Board Code Review.md` for the ranked list before starting production hardening.

## Suggested order of attack for a production build-out

1. Resolve the open regulatory/DOM questions (check-flight gate, supersede authorization, RII ATA list) — they change schema, and ledger schema changes are one-way.
2. Stand up the real Postgres/Drizzle backend using Scheduling's adapter as the template — it's the module closest to production-shaped already.
3. Wire Tech Log's integration layer to real CAMP sandbox + myairops once the two undocumented-API open questions are answered by the vendor/DOM.
4. Design a persistence contract for Pilot Workspace and Inventory v2 (neither has one yet) before their UI expectations calcify further.
5. Work through the remaining code-review findings (6–31) alongside whichever module you touch first, rather than as a separate pass.
