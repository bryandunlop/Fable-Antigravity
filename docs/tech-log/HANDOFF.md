# eTechLog — Functional Build Handoff (continue from here)

> **For a fresh Claude Code session.** The myGFO eTechLog module's UI + regulatory logic are **built and verified**; the backend is **intentionally mocked**. Your job is to build the remaining **functionality** (the 12-item backlog in §5) on the mock store — in the existing patterns, keeping tests/build green. **Do NOT build the real backend** (database, Entra SSO, real CAMP/myairops SOAP/OData, Azure ledger) — that's a separate dev's later work (see `PRODUCTION_ROADMAP.md`). Owner: Bryan Dunlop, Captain at P&G GFO — technically fluent, be direct.

---

## ✅ STATUS — 2026-06-21: all 12 backlog items COMPLETE
All of §5 (Groups 1–3) is built on the mock store, verified in-browser, and green:
**tech-log tsc clean · 51 vitest passing (was 32) · `npx vite build` green.**

- **Group 1** — attachments (signed-by-digest), supersede/correction UX (journey logs + defects, SE-1 authz), journey-log fields (oil/de-ice/delay), structured defect location, PDF/print of CRS + journey logs (`util/printRecord.ts`), read-only MEL browser.
- **#11 Work cards** — pull mock CAMP WO (`getWODetails`/`listOpenWorkOrders`) → execute steps → parts (incl. removals for MTBUR) + labor → sign completion → MaintenanceRelease (+ defect rectification when linked).
- **#12 Analytics** — `engine/analytics.ts` + `pages/Analytics.tsx` (recharts): defect-by-ATA, dispatch reliability, deferral aging, AOG, MTBUR.
- **Group 2** — recurring dispatch-gating checks (wired into `serviceability.ts` **rule 3** — expired/never-done ⇒ RED; verified live RED→sign→GREEN), intermittent faults (no serviceability effect), repetitive-defect detection (`engine/repetitive.ts` + badges + group view), trip aggregate.

New engines: `authz`, `repetitive`, `recurringChecks`, `analytics` (all unit-tested). New pages: `MelBrowser`, `WorkCards`, `WorkCardDetail`, `Analytics`, `IntermittentFaults`, `Trips`. `DATA_VERSION` bumped to `2026-06-21-v3` (seed re-loads; richer history added for analytics). Phase-1 signer/reference snapshotting, append-only/supersede, and the NEVER/ALWAYS guardrails were preserved throughout.

---

## ✅ STATUS — 2026-06-21 (later): workflow-centric IA redesign COMPLETE
Reorganized from 16/12 entity tabs to a workflow-centric, **aircraft-hub** IA (plan: `~/.claude/plans/i-feel-like-there-logical-sedgewick.md`). **55 vitest passing · tech-log tsc clean · build green · verified in-browser (0 new render-phase warnings).**

- **Role-adaptive nav** (`TechLogShell.tsx`): pilot = `Fleet · Journey▾ (Journey Log·Trips) · Work Queue`; maintenance = `Fleet · Work Queue · Records▾ (MEL·Releases·Audit·Analytics·Trips·Intermittent) · Admin▾ (Fleet admin·Personnel·MEL admin·Integration)`. Live count badges: Fleet=RED count, Work Queue=urgent count.
- **Tail Workspace** = upgraded `AircraftDetail` with in-page tabs (Overview·Defects·Deferrals·Releases·Work Cards·Flights·Audit via `?tab=`). The whole defect lifecycle runs inline — the **(M)/placard double sign-off now happens on one screen** (sign #1 → PENDING_PLACARD → gating panel mounts inline → sign #2 → AMBER; chip steps RED→PENDING→AMBER, no route change). Verified live on N1PG.
- **Lifecycle panels extracted** to `components/panels/`: `DeferralCreatePanel`, `RectifyPanel`, `GatingReleasePanel`, `ReportDefectDialog` — reused by the standalone `/deferrals` `/releases` deep-link routes AND inline on the workspace. Engine/gate/dispatch logic byte-identical (no regulatory change).
- **Work Queue** (new `pages/WorkQueue.tsx` + `engine/workqueue.ts` selector + test): cross-tail inbox (new squawks / pending placards / deferrals due / expired checks / open WOs); rows deep-link into the owning tail workspace. Pilot lens = "my reports + status" (the visible pilot↔maint handoff).
- **De-dup:** AOG → Fleet "Grounded" filter (escalation reused inline); the two "MEL" tabs split by persona (read under Records, edit under Admin). Quick wins: WorkCardDetail → return-to-tail; Intermittent "Promote to defect" (prefilled report). Standalone `/defects` route still works but is no longer in the nav.

---

## ✅ STATUS — 2026-06-21 (later still): notifications + briefing + CAMP reskins COMPLETE
**59 vitest passing · tech-log tsc clean · build green · verified in-browser (0 new render-phase warnings).** `DATA_VERSION` → `2026-06-21-v4`.

- **Notifications** — `engine/notifications.ts` (role-filtered derived feed: maint = squawks/pending-placard/expiring-or-overdue deferrals/expired checks; pilot = briefing-ready/your-squawk-actioned[recent]/grounded) + dismissed-ids in state. Bell + badge + dropdown panel in `TechLogShell` (reuses the platform's pattern; deep-links to the relevant surface). Tested.
- **Preflight checklist → Flight Briefing** (`components/BriefingPanel.tsx`, Tail Workspace "Briefing" tab): maintenance completes a preflight checklist (`DEFAULT_PREFLIGHT_CHECKLIST` template) + fuel + notes → signs **"Release for flight"** → briefing auto-aggregates serviceability + active MELs + open defects + fuel + coming-due (CAMP) → **pilot acknowledges** (PIC sign). New entity `FlightBriefing` (DRAFT→RELEASED→ACKNOWLEDGED), seeded released on N2PG. Printable.
- **CAMP reskins** (maintenance "Airworthiness" nav group; `pages/Airworthiness.tsx`, read-only over mock CAMP): **Coming-Due forecast** (`campForecast`, ≤3mo, date+hrs/cycles), **Aircraft times** (airframe/eng1/eng2/APU, minutes→hours), **AD/SB** (`campAdSb` — flagged: real CAMP read fn is an Open Question), **Work-order board** (over pulled work cards + status ladder). "Refresh from CAMP" logs the read events. CAMP stays system of record.
- **Reset-demo fix:** `RESET_STATE` now preserves the signed-in persona instead of snapping back to the seed pilot.

---

## 1. Where everything is

**Code (build here):** `~/Antigravity/Fable-Antigravity`
- Branch: `feat/etechlog-module` (not pushed; ~12 commits). The app is the "Antigravity" aviation-management SPA; eTechLog is one module.
- Module: `src/components/tech-log/`. Live route: `/tech-log`.
- Stack: **Vite 6 + React 18 + TypeScript + Tailwind v4 + shadcn/Radix + react-router-dom**. Charts: `recharts`. PDF: `react-pdf` (both already installed).
- Tests: **vitest** — `npx vitest run src/components/tech-log` (32 passing).
- Build: `npx vite build`. Type-check: `npx tsc --noEmit` (NOTE: the whole app has ~288 *pre-existing* TS errors — only **your `tech-log` files** must be clean: `npx tsc --noEmit 2>&1 | grep tech-log`).
- Run it: `npm run dev` (port 3000), or the preview config in `.claude/launch.json` (port 5199). Log in by picking a **role** (pilot / maintenance / chief-inspector / etc.) → that *is* the identity.

**Spec, decisions, and prior analysis (read-only reference):** `~/Documents/Claude/Projects/Tech Log for myGFO/`
- `PHASE1_BUILD_SPEC.md` — the build spec. **§14** serviceability engine, **§15** deferral lifecycle/gating, **§16** validation gates, **§17** TrustFlight scope deltas (the source of several backlog items), **§18** schema-freeze hardening.
- `CLAUDE.md` — NEVER/ALWAYS guardrails, invariants, CAMP taxonomy. **Read it.**
- `docs/DECISION_LOG.md` (D1–D19), `docs/GAP_REGISTER.md`, `docs/COMPLIANCE_TRACEABILITY.md`, `docs/PRODUCTION_ROADMAP.md`, `docs/superpowers/specs/2026-06-21-etechlog-demo-design.md`.

---

## 2. Architecture & conventions (build exactly like this)

- **Mock-only data layer.** `TechLogContext.tsx` = `useReducer` + versioned `localStorage` + "Reset demo". No API/DB. To add an entity: add types to `types.ts` (state field + action variant), a reducer case in `TechLogContext.tsx`, seed it in `mockData/scenarios.ts`, and **bump `DATA_VERSION`** so the seed re-loads.
- **Pure-function engine** under `engine/`: `pl25.ts` (clock), `serviceability.ts` (§14.2 G/A/R projection), `supersede.ts` (current-state), `signing.ts` (CRS/RII gates + mock hash). All regulatory logic lives here and is **unit-tested** — add a test for any clock/immutability/gating change.
- **Immutability = append-only arrays + supersede.** Never mutate a signed record; push a new row with `supersedesId`; current state = `currentRows(rows)` (not-superseded). Serviceability is **always derived** via `deriveServiceability(...)`, never stored.
- **Identity from login.** `useCurrentUser()` (role → `SYSTEM_USERS` → `Personnel`). No persona switcher. Maintenance/admin gating: `user.role === 'MAINTENANCE'`.
- **E-signature.** `components/SignCeremonyDialog.tsx` (intent text + step-up + `makeSignature` mock hash). Reuse it for **every** new signed action; dispatch `ADD_SIGNATURE` + the entity + `ADD_AUDIT`.
- **Integration (mock CAMP/myairops).** `integration/` + `useIntegration()` → `pushDiscrepancy`, `refreshCampReads`, `prefillFlight`. Faked data; off-ledger `campCorrelation` + `integrationEvents`.
- **UI.** shadcn from `../../ui/*` (**relative** imports, not `@/`); `cn` from `../../ui/utils`; `lucide-react` icons (⚠ verify names — e.g. `PlaneOff` does NOT exist in this version). GFO tokens: `--gfo-success/#00B140`, `--gfo-warning/#F1B434`, `--gfo-error/#EF3340`. Every page wraps in `TechLogShell` (sub-nav + DemoBanner + reset + signed-in chip). **Register a new page** in `TechLogRoutes.tsx` (route) + `components/TechLogShell.tsx` `TABS`/`ADMIN_TABS` (nav).
- **Verify every change:** `tech-log` tsc clean + `npx vitest run src/components/tech-log` + `npx vite build`. Then check it renders at `/tech-log` (`npm run dev`).
- **Commits:** conventional (`feat(tech-log): …`), scoped, end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Don't push unless Bryan asks.

## 3. Hard rules (from CLAUDE.md — still apply to mock code)
- Never UPDATE/DELETE a signed record — **supersede only**.
- **PL-25 = end of the final day** (Cat C discovered Jan 26 → due **Feb 6** 00:00 UTC). SME-confirmed; the engine is correct — don't "fix" it back to Feb 5.
- CRS requires an **A&P cert**; RII inspector ≠ performer **and** RII-authorized for the ATA; a **provisional** MEL (`PENDING_FSDO`) **blocks** deferrals.
- CAMP is **sandbox/mock** only; myairops is **pull-only**; never log payloads/PII.
- Immutability is **app-enforced** (Azure SQL ledger is the later dev's substrate — do not build it).

---

## 4. Already built — DO NOT rebuild
Fleet status board · aircraft detail (drivers, clocks, governing rule) · defect capture + maintenance triage · MEL deferrals (PL-25 clock, provisional block, (M)/placard gating PENDING_PLACARD→ACTIVE, extension A/D-blocked B/C-once) · CRS maintenance release (A&P-cert gate + RII dual sign-off + rectification) · journey log (OOOI + crew-distinct/monotonicity/required-field validation) · serviceability engine (§14.2) · audit/ledger (+ supersede markers, signatures, Compliance/CFR tab) · admin reference-data editing (fleet/personnel/MEL + G800 activate) · AOG screen · crew acceptance (PIC) · CAMP + myairops mock connector + Integration page · 32 unit tests · full real 984-item G500/G650ER MEL seed.

---

## 5. Functional backlog — what to build

> All twelve are frontend/workflow features on the **mock store** — no backend. For each: what, why (spec ref), where it plugs in, and acceptance.

### Group 1 — finish Phase 1 (gaps in what should already exist)

**1. Defect photo/attachments.** Capture/upload photos on a defect; store `{uri, sha256, bytes, contentType}[]` on `Defect` (mock sha256 via the existing hash helper). Fold the attachment digests into the signed payload concept (show "signed incl. N attachments"). *Spec:* §3.1 location/photo refs; AC-120-78B attachments-signed-by-digest. *Where:* `pages/Defects.tsx` report dialog + show in `AircraftDetail.tsx`. *Accept:* attach a photo → it displays → sign ceremony notes attachments are covered.

**2. Correct-a-signed-record (supersede) UX.** A "Correct" action on **journey logs** and **defects** that opens a prefilled form and, on sign, creates a superseding row (`supersedesId` = original, fresh signature). Add `SUPERSEDE_FLIGHTLOG` action (defect supersede already exists). *Spec:* §3.3, §7 `POST /flights/{id}/supersede`. *Where:* `JourneyLog.tsx`, `Defects.tsx`; show original+correction in `AuditTrail.tsx`/detail. *Accept:* correct a signed flight log → original retained, correction is current, audit shows both.

**3. Journey-log fields the form omits.** Add **oil uplift**, **de-ice** (type/fluid/time), and **delay codes** (`delayCode`/`delayMinutes`/`delayAtaChapter`) to `FlightLog` + the new-entry form + list. *Spec:* §3.1 FlightLog. *Where:* `JourneyLog.tsx`, `types.ts`. *Accept:* fields captured, signed, displayed.

**4. Structured defect location.** Add a location section to defect capture: cabin LOPA seat (e.g. `12A`) / structural zone code (e.g. `WING-L-STA-340`) + freetext. (Drag-drop schematic UX is explicitly "later" — just structured entry.) *Spec:* §17.2. *Where:* `Defects.tsx`, `types.ts` (`zoneCode`, `locationFreetext`). *Accept:* capture a cabin/structural location on a defect.

**5. PDF rendering of signed records.** A "View / Print" action on CRS releases and journey logs that renders a formatted, printable document (use `react-pdf` or a styled `window.print()` view); set a mock `pdfBlobUri`. *Spec:* §3.1 `pdf_blob_uri`, §17.6. *Where:* `Releases.tsx`, `JourneyLog.tsx`. *Accept:* open a printable CRS + journey-log doc.

**6. Read-only MEL browser.** A page to browse the effective MEL by type / as-of date with search and item detail (category, provisos, (O)/(M), placard) — distinct from admin (no edit) and the deferral picker. *Spec:* §7 `GET /mel`. *Where:* new `pages/MelBrowser.tsx` + route `/tech-log/mel`. *Accept:* browse the effective MEL for a type.

### Group 2 — §17 scope-ruled functionality (Phase 1.x)

**7. Recurring dispatch-gating checks** *(spec flags this a genuine Part-91/IS-BAO gap, not a nicety).* An updatable `RecurringCheck` (per aircraft: definition, interval, last accomplishment) + append-only accomplishment sign-offs; current expiry is **derived**; an **expired check grounds the aircraft RED** — wire it into `serviceability.ts` rule 3 (currently inert). *Spec:* §17.4, §14.2 rule 3. *Where:* engine + a checks panel on `AircraftDetail.tsx` + accomplish/sign. *Accept:* an expired check → RED until re-accomplished and signed.

**8. Intermittent faults.** Separate `IntermittentFault` (updatable, `occurrenceCount`) + append-only `IntermittentFaultOccurrence`; **never** affects serviceability; a small "Intermittent faults" view. *Spec:* §17.1. *Accept:* log a fault, increment occurrences, no serviceability effect.

**9. Repetitive-defect detection/grouping.** Detect same-ATA + same-aircraft within N flights/days; group; show "repeat ×N" on defects; a group view. *Spec:* §3.1 `repetitive_defect_group_id`. *Accept:* 3 same-ATA defects flagged as a repeat group.

**10. Trip aggregate (optional).** A `Trip` parent grouping multiple journey-log sectors; trip summary view. Per-sector log stays authoritative. *Spec:* §17.5. *Accept:* group sectors into a trip with a summary.

### Group 3 — Phase 3 & 4 (big net-new functionality)

**11. Phase 3 — work-card execution + parts/labor** *(the "real prize", decision D10).* Pull a (mock) CAMP work order / task card → a `JobCard` with steps → perform → capture **parts** (P/N, serial, qty) + **labor** (tech, hours) → sign completion → maps to a `MaintenanceRelease`. *Spec:* §0 Phase 3, §4 `GetWODetails` + status ladders (`CLAUDE.md`). *Where:* new `pages/WorkCards.tsx` + `WorkCardDetail.tsx`, mock work orders in seed, reuse `SignCeremonyDialog`. *Accept:* execute a work card end-to-end, sign, parts/labor recorded, RTS produced.

**12. Phase 4 — reliability analytics dashboards.** An Analytics page (`recharts`) over the mock ledger: defect trend by ATA, dispatch reliability %, deferral aging, AOG frequency/duration, MTBUR (derive from part-removal events once #11 exists). *Spec:* §0 Phase 4, research/03. *Where:* new `pages/Analytics.tsx` + route. *Accept:* dashboards render from seeded/created data; mandatory-ATA capture makes them meaningful.

---

## 6. Recommended order
**Group 1** first (makes Phase 1 genuinely feature-complete) → **#11 work-cards** (biggest functional addition) → **#12 analytics** → **Group 2** deltas where they fit. Good warm-up first task: **#3 (journey-log fields)** or **#1 (attachments)** — small, self-contained, exercises the add-field/add-to-form pattern.

## 7. The screen recording
Bryan has a screen recording (`ScreenRecording_06-19-2026 23-53-38_1.MP4` in `~/Downloads/`). If it depicts target functionality, **watch it first** (the `watch` skill) and reconcile anything new against this backlog before building.

## 8. Definition of done (per item)
Types + reducer + seed updated · feature renders under `/tech-log` in the right persona · regulatory logic (if any) has a vitest test · `tech-log` tsc clean · `npx vitest run src/components/tech-log` green · `npx vite build` green · conventional commit. Verify visually with `npm run dev`.

## 9. Future additions (requested, not yet scheduled)

> Items Bryan has asked for that are not part of the §5 backlog. Capture them here as they come in; scope/spec them before building.

**F1. SAFA ramp checks — crew visibility.** (Requested 2026-07-22.) SAFA (Safety Assessment of Foreign Aircraft) ramp-check items live in CAMP today; pull them out of CAMP into myGFO so the pilot/crew can see them (natural homes: the Airworthiness coming-due view and/or the Flight Briefing panel — SAFA readiness is exactly what a crew wants in hand before an international leg). Open before building: (a) exact CAMP source — which record type holds these and which read function returns them is undocumented, so per the NEVER rule do not invent an endpoint; confirm with CAMP (same situation as the AD/SB read). (b) Read-only pull only — CAMP stays system of record. (c) Confirm scope with Bryan (which items count, per-tail vs fleet-wide, and whether they should feed dispatch gating or stay informational).
