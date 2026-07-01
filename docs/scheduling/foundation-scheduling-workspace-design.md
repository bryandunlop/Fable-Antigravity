# Foundation + Scheduling Workspace — Design Spec

- **Date:** 2026-06-30
- **Status:** Approved for planning (brainstorm complete)
- **Author:** Bryan Dunlop + Claude
- **Slice:** 0 (Foundation) + 1 (Scheduling) of the myGFO department-workspaces initiative
- **Nature of deliverable:** A **prototype / reference implementation to hand off to a developer.** Optimize for a clear, coherent, *demonstrable* weave on a real-enough data spine — not production hardening. Production concerns (Entra, Azure SQL, Key Vault, real integrations) become annotated "productionize this" notes, not half-built code.

---

## 1. Background & problem

myGFO already contains ~150 feature components covering nearly every noun in the operator's vision (scheduling, FRAT, airport DB, fuel, ForeFlight upload, passenger forms, catering, maintenance turnover, a compliance-grade tech-log). The problem is **not missing features — it is fragmentation**:

- 4–5 incompatible "Trip" models, 3–4 "CrewMember" shapes, 4 "Passenger" shapes, 4–5 "Airport" models, 3 fuel flows — none referencing each other.
- The only real persistence is the `/api/trips` Hono+Drizzle/Neon server (used by inventory-v2) and the tech-log reducer (localStorage, append-only ledger). Everything else is mock/localStorage; "data flow" is largely illusory.
- Auth is a fake role dropdown; the person's identity/department is discarded. ~100 of ~120 routes are not access-gated.
- The one real cross-department mechanism (`NotificationContext`) cannot address a department or carry a payload.
- Two prior experiments ("Master Command Center" = `experimental/SchedulingCommandCenter.tsx`; "Trip Sandbox" = `experimental/UnifiedTripWorkspace.tsx`) prototyped the *UX* of the vision (one shared trip, role lenses, readiness/blocker model, the real INTL checklist taxonomy, cross-role nudge/ack/activity-log) but are mock-only and to be retired.

**The vision** (digitize the paper scheduler checklists + weave departments together with data flowing only where needed) is impossible until a spine exists: a canonical Trip, a real addressable event bus, and a checklist/task engine. This spec defines that foundation plus the first department workspace (Scheduling).

The nine source checklists driving this work: SCHEDULER DAILY / MONTHLY / QUARTERLY; Domestic Flight Checklist; Domestic Trip Changes inside 24 hours; International Trip Documents (E-Docs); INTL Checklist Master.xlsx; Critical DCA Trips – Ops Procedures; PROPOSED DASSP Checklist R2. They decompose into **recurring scheduler ops** (daily/monthly/quarterly time-driven ticklers) and **per-trip gates** (domestic suitability, the inside-24h ForeFlight-lock, international, DCA/DASSP).

---

## 2. Goal

Deliver a self-contained reference implementation in this repo of:

1. **The foundation** — a canonical Trip (a mirror of the MAO/myairops trip), a data-driven & editable **checklist/task engine**, an **addressable event bus**, and a **role-based workspace shell**.
2. **The Scheduling workspace** — built on the foundation, demonstrating both stated goals at once:
   - **Kill the paper** — the daily/monthly/quarterly scheduler checklists become a live, time-driven, auditable **run-board**.
   - **Start the weave** — a scheduler creates/mirrors a trip → its per-trip checklist + requirements + readiness auto-appear → handoff events flow to the right department's inbox.

Domestic per-trip content now; the engine is built so International and DCA/DASSP templates drop in cleanly in a later slice.

---

## 3. Resolved decisions (the forks we closed during brainstorming)

| # | Decision | Choice |
|---|----------|--------|
| D1 | First build | **Foundation + Scheduling** |
| D2 | Trip origin / myairops relationship | **MAO (myairops) is the authoritative origin; the myGFO trip is a *mirror*, never written back.** myairops pull is Phase 2; until then schedulers hand-enter the trip as a stand-in, keyed to the MAO trip ref for later reconciliation. |
| D3 | Information architecture | **Progressive migration** — department workspace becomes the front door; existing pages pulled in as lenses over time; flat sidebar retired slice by slice. |
| D4 | Data store | **Build on what runs** — extend the existing Hono + Drizzle + Neon Postgres server; keep data access portable so the Azure SQL migration is a later deployment step, not a rewrite. |
| D5 | Identity / auth | **Keep the dev role-switcher.** No real Entra/MSAL in this slice (it's a developer-handoff prototype). |
| D6 | Scheduling focus | **Both goals on one shared engine** (recurring run-board + per-trip checklists are the same machinery, two trigger sources). |
| D7 | Per-trip content scope | **Domestic now; engine ready** for International/DASSP in their later slice. |
| D8 | Architecture vs existing code | **Fresh build** — foundation not derived from the experiments' code or tech-log's ledger engine. Still this repo, still the Neon/Hono server. |
| D9 | Checklist editability | **Templates are editable data, role-gated, versioned, no-code** — the department changes its own checklists without a developer. |

---

## 4. Standing constraints (carry into every later slice)

1. **No write-back to MAO/myairops.** The myGFO trip is a one-way mirror. (Aligns with the project's pull-only NEVER rule.) The Phase-2 pull will reconcile onto the trip via `sourceTripRef`.
2. **One canonical Trip, not a 6th island.** The trip defined here is *the* canonical model. Later slices must reconcile tech-log's regulatory Trip and inventory-v2's Trip onto it (tracked debt, not optional). A fresh build is only safe under this discipline.
3. **Everything-is-data.** Checklist content, owner roles, distribution lists, report recipients, focus-item conditions — all data/config, seeded with real values, editable by authorized users. Nothing about *what's on a checklist* lives in source.
4. **Point-in-time templates.** A live or completed checklist instance is pinned to the template *version* it was created under; editing a template never mutates in-flight or historical instances. (Mirrors the spec's point-in-time MEL-revision discipline.)
5. **Regulatory ledgers untouched.** Scheduling data is mutable orchestration data. The append-only regulatory records (tech-log FlightLog/Defect/Deferral/MaintenanceRelease/Signature/AuditTrail) are out of scope here and must not be folded into the scheduling model.
6. **Prototype, not production.** Dev role-switch login; simulated clock; no secrets/Key Vault/Entra. All such gaps are documented as developer handoff notes (§13).

---

## 5. Architecture overview

```
                 ┌─────────────────────────────────────────────┐
                 │           Workspace shell (role-based)        │
                 │  Scheduling WS │ stub: Crew │ EA │ Preflight  │
                 └───────┬───────────────┬──────────────┬────────┘
                         │               │              │
        ┌────────────────▼───┐   ┌───────▼──────┐  ┌────▼─────────┐
        │ Checklist/Task     │   │ Event bus    │  │ Canonical    │
        │ engine (pure core) │◀─▶│ (addressable │◀▶│ Trip mirror  │
        │  + template store  │   │  handoffs +  │  │  + legs      │
        │  (versioned, data) │   │  inboxes)    │  │              │
        └─────────┬──────────┘   └──────┬───────┘  └──────┬───────┘
                  └─────────────────────┴─────────────────┘
                         Hono + Drizzle + Neon Postgres (extend existing /api)
```

- **Pure engine core** (framework-free, unit-tested): due-date computation, recurring & per-trip instantiation, conditional template selection, time-trigger/overdue/escalation evaluation, readiness derivation, template version pinning.
- **Server**: extend the existing Hono app and Drizzle schema. New/extended tables for trips (mirror+orchestration fields), checklist templates (versioned), task instances, and events.
- **Client**: a workspace shell + the Scheduling workspace + thin stub inboxes for other roles. State via a context that talks to the server (not localStorage).

---

## 6. Data model

> Implementation note: **extend the existing server `trips` / `trip_legs` tables** (already real, server-backed, used by inventory-v2) by adding the mirror/orchestration columns below, and declare them canonical — rather than creating a parallel trip table (which would be exactly the fragmentation we're fighting). Added columns are nullable so inventory-v2 keeps working. Alternative considered (a brand-new `trip` table) rejected as island-creating. Tech-log's Trip reconciles onto this in slice 2.

**Trip (canonical mirror)**
- `id`, `tripNumber`, `sourceSystem` (`'manual' | 'myairops'`), `sourceTripRef` (MAO trip number — reconciliation key), `tail`, `aircraftType`, `tripType` (`domestic | international | dca_dassp`), `status`, `priority`, `startDate`, `endDate`, `legs[]`, audit fields (`createdBy/At`, `lastEditedBy/At`).

**TripLeg**
- `id`, `sequence`, `departureIcao`, `arrivalIcao`, `departureTimeUtc`, `departureTimeLocal`, `arrivalTimeUtc`, `paxCount`, `filedStatus` (for the inside-24h ForeFlight-lock logic), and preflight slots present-but-unused until slice 2 (`fratStatus`, `airportReviewed`, `fuelRequestId`).

**ChecklistTemplate** (versioned, editable data)
- `id`, `name`, `triggerType` (`recurring | per_trip`), `scope` (`daily | monthly | quarterly` for recurring; a `tripType` for per-trip), `version` (int), `status` (`draft | published | archived`), `effectiveFrom`, `taskDefinitions[]`, audit fields.

**TaskDefinition** (a row within a template version)
- `id`, `title`, `description`, `ownerRole`, `category`, `order`,
- `dueRule` — a structured, parameterized rule (see §7 vocabulary), not a fixed date,
- `requiresAck` (bool), `escalationRule` (optional structured rule),
- `conditionalOn` (optional predicate over trip/calendar attributes),
- `handoffTarget` (optional: dept/role/vendor),
- `dependsOn` (optional task-def id).

**TaskInstance** (live)
- `id`, `templateId`, `templateVersion` (**pinned**), `taskDefId`, `tripId?` (null for recurring), `runDate?` (for recurring), `status` (`open | in_progress | blocked | done | n_a`), `owner` (resolved role/person), `dueAtUtc`, `ackState` (`n/a | pending | acked`), `ackedBy/At`, `completedBy/At`, `notes`, `auditTrail[]` (append-on-change: who/when/what).

**Event** (addressable handoff)
- `id`, `type`, `sourceDept`, `target` (`{ kind: 'role'|'dept'|'person', value }`), `entityRef` (`{ kind: 'trip'|'leg'|'task', id }`), `payload`, `actionUrl`, `ackable` (bool), `deliveredAt`, `ackState`, `ackedBy/At`.

---

## 7. The checklist/task engine

**Two trigger sources, one engine:**
- **Recurring** — a simulated, developer-swappable clock generates the daily run-board each duty day, and monthly/quarterly tasks as their windows open, computing concrete `dueAtUtc` from each `dueRule` + the calendar.
- **Per-trip** — on trip create/mirror, the engine selects the matching published template(s) by `tripType`, evaluates each task's `conditionalOn`, and instantiates the trip's checklist with `dueAtUtc` computed relative to ETD.

**`dueRule` vocabulary (structured, extensible — author picks a type + params):**
- `dayOfTimeLocal(HH:MM)` — e.g. crew brief "day-of 15:00"
- `weekday(MON|THU|FRI[, PM])` — e.g. "every Monday", "Friday PM"
- `dayOfMonth(n, beforeOrOn)` — e.g. "before the 15th", "around the 25th"
- `quarterWindow(rule)` — e.g. "1st week of each quarter"
- `relativeToEtd(offset)` — e.g. "T-24h", "T-72h", "1 business day prior", "Fri-for-Sun", "1–2 months prior"
- `annual(date)` — e.g. "by Mar 31"

**`conditionalOn` vocabulary (predicate over known attributes):** `tripType`, `paxCount`, `tail`/`aircraftType`, `routeTouchesCountry(x)` (for later intl), `isWeekendDeparture`, `dayOfWeek`, etc. (Powers the focus-item badges: WOCL, 7-pax G650/G550, HROC, etc.)

**`escalationRule`:** e.g. `ifNotAckedBy(dayOfTimeLocal(17:00)) -> emit Event to ownerRole`. (Digital form of "send by 1500, call at 1700 if no ACK.")

**Time-trigger evaluator** — a pure function `(now, instances) -> { due, approaching, overdue, escalationsToFire }`. The correctness-critical core.

**Readiness derivation** — a pure function over a trip's task instances + blockers → `READY | NOT_READY | BLOCKED` + the governing blocker. Fresh implementation (conceptually similar to tech-log's `deriveTripReadiness`, not reused).

---

## 8. Editable checklists (role-gated, versioned, no-code)

- **Templates are DB data, edited through the UI.** No checklist content in source.
- **Authorization:** a `checklist-admin` capability (held by e.g. scheduling-lead / admin) gates editing. Executors/viewers run checklists but cannot edit them. Modeled against the dev role-switch now; real-Entra-group-gated later.
- **Versioning + point-in-time:** publishing an edit creates a new template `version`. Live/historical `TaskInstance`s keep `templateVersion` pinned; new instantiations use the latest published version. In-progress trips never mutate under the scheduler.
- **No-code & safe:** the editor exposes the structured vocabularies in §7 as pickers (owner-role, category, due-rule type+params, condition, ack/escalation, handoff target) — never free-form code. The vocabulary is extensible by the developer.
- **In-repo precedent for the developer:** `src/components/FRATFormBuilder.tsx` and `src/components/FormTemplateEditor.tsx` already implement no-code authoring (FRAT fields, passenger-form templates). Point the developer there as the established pattern; build the checklist-template editor fresh.

---

## 9. The event bus (addressable handoffs)

Replace transient toasts with **addressed event records**. A scheduler action like "send trip sheet to EA" or "crew brief" emits an `Event` targeted at a role/dept/person, with delivery + ACK status, landing in that target's **inbox**. This is the literal "data flows to the department that needs it, when it's done" mechanism, and it carries an `entityRef` back to the trip/leg/task so the receiver can act in context.

Relationship to the existing `NotificationContext`: that context is the closest existing seam but lacks a target and payload. We build the event model fresh (server-backed); the legacy notification bell can later subscribe to it. (Do **not** extend the localStorage notification store as the bus.)

**Pluggable delivery channels.** An event's *delivery* is separate from its *record*. In the prototype, delivery = the in-app role **inbox**. The model carries a `channel` hint so the developer can route certain handoffs to **Microsoft Teams** and **email** via Microsoft Graph later (the org is already on Microsoft 365 / Entra). Concretely, **crew briefs are delivered/scheduled via Teams** in reality — the prototype's crew-inbox brief is the stand-in for that Teams message.

---

## 10. Workspace UX

**Role-based front door (dev role-switch):** log in → land in your department workspace.

**Scheduling workspace:**
1. **Run-board** (recurring) — today's daily tasks + due monthly/quarterly items, grouped by section, each with owner / due-time / status / ACK / escalation. Focus items (WOCL, 7-pax G650, HROC, passport validity) as **computed badges**. Shift-handover notes field (replaces the paper "NOTES / call-forward" handover).
2. **Trips** (per-trip) — board of mirrored trips; **Create / mirror trip** action (manual entry now, captures `sourceTripRef`); trip detail = the auto-instantiated per-trip checklist + requirements + computed readiness + the handoff events it has fired.
3. **Checklist Templates** — the role-gated no-code editor (authorized users only).

**Stub workspaces for other roles** — each non-scheduling role gets a minimal workspace = an **inbox of handoff events addressed to them**. Proves the weave without building those departments' depth (later slices).

**Progressive migration** — this becomes the `scheduling` role's front door; legacy scheduling pages stay reachable and are pulled in as lenses over time.

---

## 11. Cross-department handoffs wired in this slice

Two high-signal handoffs (plus one tee-up), drawn from the daily checklist:
1. **Crew brief + ACK + escalation** (scheduling → crew) — the richest single example: time-trigger ("send by 1500"), acknowledgement, escalation ("if unacked by 1700 → notify scheduler"). Crew stub shows the brief with an ACK button. (Real-world delivery channel is Microsoft Teams; the crew inbox is the prototype stand-in — see §9.)
2. **Trip sheet → EA** (scheduling → EA inbox) — a delivered, ackable handoff event.
3. **Tee-up:** creating a trip surfaces its legs into a **stub Preflight workspace** — sets up slice 2 (FRAT/airport/fuel driven off the trip) with zero rework.

---

## 12. Testing strategy

Unit-test the pure engine core (the UI is demonstrated, not unit-tested):
- Due-date computation for every `dueRule` type (weekday/Monday, before-the-15th, T-24h-before-ETD, Fri-for-Sun, annual Mar 31).
- Recurring instantiation (correct task set for a given duty day / month / quarter).
- Per-trip conditional template selection (right items appear for domestic vs 7-pax G650 etc.).
- Time-trigger evaluator: due / approaching / overdue classification and escalation firing.
- ACK state transitions.
- Readiness derivation (completion + blockers → status + governing blocker).
- **Template version pinning** (editing a template does not mutate existing instances).
- Audit-trail append on every state change.

---

## 13. Out of scope → "productionize this" handoff notes for the developer

- **Real Entra/MSAL auth** (replace dev role-switch). Identity model is threaded so this is a swap, not a rewrite. Precedent: `src/authConfig.ts`, `temp_user_settings.tsx` (MSAL+Graph scaffold).
- **Azure SQL + Key Vault + managed identity** migration (from Neon). Keep data access portable.
- **myairops pull** (Phase 2) — replaces manual trip entry; reconciles via `sourceTripRef`. Pull-only; never write back.
- **ForeFlight document push** (slice 4) — flight-scoped only: `POST /public/api/flights/files`, `file` in multipart body, `flightId`/`displayName`/`category` as query params, `category ∈ {General,LoadSheet,Notoc,SignatureReport}`. Existing FF client is broken (two clients, wrong host/contract, full-access key in localStorage) — fix per these facts; move the key server-side. Auth header (`Authorization: Bearer`?) is **unverified** — confirm against a live key.
- **International + DCA/DASSP checklist content** (slice 3) — engine already supports them; author the templates.
- **Microsoft Teams + email delivery via Graph** — route handoff events (notably crew briefs and their escalations) to Teams/email through Microsoft Graph. The event bus carries a `channel` hint for this; in-app inbox is the prototype stand-in. (Org is already on Microsoft 365 / Entra; `@microsoft/microsoft-graph-client` is already a dependency.)
- **Real vendor integrations** — FuelerLinx, FOS, Universal Weather (UVgo), Jet Professionals, caterer. Manual in the prototype.
- **Offline native SQLite** (Capacitor) — for crew/maintenance iPad use; schedulers are desktop.
- **Real scheduler/cron** — replaces the simulated clock for recurring instantiation.

---

## 14. Existing-code reuse & cleanup map (from the codebase deep-read)

**Reuse / learn from (do not rebuild):**
- Server trip schema & routes: `src/server/db/schema.ts` (`trips`, `tripLegs`), `src/server/routes/trips.ts` — extend as canonical.
- No-code authoring precedent: `FRATFormBuilder.tsx`, `FormTemplateEditor.tsx`.
- Real-data patterns worth keeping in later slices: `WeatherWidget.tsx` + `src/server/routes/weather.ts` (live METAR/TAF), `FuelRequestContext.tsx`, `FuelFarmTracker.tsx`, `StandaloneFRATForm.tsx`, the entire `tech-log/` engine (reconcile, not rebuild, in slice 5).
- `PassengerFormContext.tsx` — the international-docs nucleus (passport/visa + expiry + `entered-myairops` seam) for slice 3.

**Dead/duplicate to flag for separate cleanup (do not touch as part of this slice):**
- Repo-root `temp_nav.tsx`, `temp_nav_master.tsx`, `temp_app_old.tsx`, `temp_login_old.tsx`, `temp_user_settings.tsx`; `src/App.backup.tsx`.
- `ItineraryBuilder.tsx` (V1, unrouted), `EnhancedEventEditor.tsx` (transitively dead), `CrewResourceManagement.tsx` (orphan), `FRATForm.tsx` (imported, unrouted), `AirportEvaluation.tsx` singular (unrouted), `FuelLoadRequest.tsx` (superseded), `EmailNotificationSystem.tsx` (orphan), `InflightCalendarView.tsx`/`InflightUpcomingFlights.tsx` (stranded duplicates).
- The two experiments to retire after harvesting concepts: `experimental/SchedulingCommandCenter.tsx`, `experimental/UnifiedTripWorkspace.tsx`, `experimental/mockData.ts`.

---

## 15. Roadmap context (this is slices 0–1 of 6)

| Slice | Name | Status |
|---|---|---|
| **0** | Trip spine + workspace shell + event bus | **this spec** |
| **1** | Scheduling workspace + digital checklists (domestic) | **this spec** |
| 2 | Preflight weave (FRAT + airport + fuel + weather off the trip's legs) | later |
| 3 | International / DCA-DASSP (country-rules engine, passport/visa gating, permits/APIS, DASSP countdown) | later |
| 4 | ForeFlight document push | later |
| 5 | Maintenance handoff weave (completed trip → tech-log FlightLog/postflight; reconcile tech-log Trip onto canonical) | later |

Each later slice gets its own spec → plan → build.

---

## 16. Resolved questions / assumptions

- **A1 (confirmed):** Scheduling workspace is **desktop-first**. Crew is **iPad-first** (relevant to later slices, not this one).
- **A2 (confirmed):** All three recurring checklists (daily, monthly, quarterly) are seeded as editable templates in this slice.
- **Q1 (confirmed):** `checklist-admin` capability is held by **scheduling-lead** (+ `admin`).
- **Q2 (confirmed):** Crew briefs are delivered/scheduled via **Microsoft Teams** in reality. In the prototype the brief is a handoff event in the crew inbox (Teams stand-in); the unacked-by-1700 escalation notifies the **scheduler** (who follows up). Productionize note: deliver/escalate via Microsoft Teams + email through Graph (see §9, §13).
