# Slice 6 — Pilot Workspace ("Flight Hub") — Design Spec

- **Date:** 2026-07-01
- **Status:** Design — awaiting review before planning
- **Slice:** 6 of the department-workspaces roadmap (follows Slices 0–5; first *pilot-side* front door)
- **Nature:** Prototype / developer-handoff, consistent with prior slices (dev role-switch, in-memory scheduling store, tech-log's localStorage state).

---

## 1. Goal

Give pilots a single **hub** — the pilot role's front door — that unifies the three things a pilot touches per flight into one trip-centric pane, while every panel **links back to the role that owns it**:

1. the **scheduling handoff** (the crew brief / trip sheet),
2. the **preflight workflow** (per-leg FRAT + airport review + fuel + readiness), and
3. the **tech-log / maintenance handoff** (aircraft serviceability, custody, open MEL/deferrals, acceptance).

Today there is **no pilot hub**. The pilot role logs in, lands in the tech-log (`PilotHome`), and hunts across scattered pages (`PreflightWorkflow`, standalone FRAT, airport evals, fuel load, currency). This slice makes the pilot's front door a purpose-built **Pilot workspace** — the pilot-side sibling of the Scheduling workspace — organized around the pilot's day: *receive the flight, get it ready.*

## 2. The pilot sits between two handoffs

A pilot's flight is the confluence of two inbound handoffs and one (out-of-scope-this-slice) outbound one:

```
  scheduling ──(crew brief / trip sheet)──▶  ┌───────────────┐
                                             │  PILOT / crew │──(preflight complete, readback)──▶ scheduling
  maintenance ─(aircraft + serviceability)─▶ │  "Flight Hub" │
                                             └───────┬───────┘
                                                     └──(postflight squawks — SLICE 5, links out)──▶ maintenance
```

**This slice covers the two *inbound* handoffs + the preflight in between.** The outbound postflight squawk-back stays with the already-built Slice 5 maintenance loop-closer and is reached by a link-out.

## 3. Resolved decisions (the forks closed during brainstorming)

| # | Decision | Choice |
|---|----------|--------|
| P6-D1 | Trip surface | **Embed inline — single pane of glass.** The pilot does everything inside the hub; no bouncing to separate tech-log pages. |
| P6-D2 | Embed method | **Fresh pilot panels over *shared state + shared rules*.** Purpose-built pilot UI, but it reads/writes the **same** tech-log state through the **same reducer/actions and the same readiness derivations** — no forked regulatory logic. This is the anti-island discipline (see §6). |
| P6-D3 | Slice scope | **Inbound + preflight.** Brief ACK (scheduling) + aircraft acceptance (maintenance) + full preflight (FRAT/airport/fuel) + one composite readiness. Postflight squawk-back links out to Slice 5. |
| P6-D4 | Shape | **A new first-class Pilot workspace** (`/pilot-workspace`), role-gated to `['pilot','chief-pilot','admin']`, becomes the pilot role's front door (progressive migration; tech-log stays reachable and is linked from the hub). |
| P6-D5 | "My Flights" without real crew identity | The canonical `TripRecord` has **no crew field** and the dev role-switch is retained, so **"my flights" = all trips in the preflight window** (released-to-preflight + upcoming). The dev pilot *is* the crew. A real crew-assignment field is a documented later step. |
| P6-D6 | FRAT form | **Reuse the existing FRAT form component**, don't rebuild it. Fresh panels for airport/fuel/readiness/brief; the FRAT *form + scoring* is reused, because re-implementing risk scoring would fork regulatory logic. |

## 4. Why this is (mostly) not greenfield

Almost all the underlying machinery already exists on this branch; this slice is **new presentation + one new shell**, not new engines:

- **Canonical trip + checklist + events** — `SchedulingService` / `SchedulingStore` / the event bus (Slices 0–1).
- **Preflight state + rules** — tech-log's `TripLeg` (`fratStatus` / `airportReviewed` / `fuelRequestId`), its reducer + append-only audit trail, `deriveTripReadiness` (serviceability + per-leg FRAT/airport/fuel), and the FRAT form (`StandaloneFRATForm`).
- **Scheduling↔preflight bridge** — `tech-log/bridge.ts` (`releaseSchedulingTripToPreflight`, `readPreflightSummary`) from Slice 2.
- **Composite readiness** — Slice 2 already composes scheduling readiness with preflight readiness; the pilot hub renders that composite as the pilot's single verdict.

New in this slice: the **Pilot workspace shell**, the **pilot-facing panels**, and a **"my flights" selector**.

## 5. Anatomy (two levels)

**A. My Flights** (landing) — the pilot's relevant trips (canonical `TripRecord`s in the preflight window) as cards, each with **one composite readiness** badge + the governing blocker. Replaces the tech-log Trips list as the pilot's starting point.

**B. Flight Hub** (a selected trip — the single pane) — a readiness bar over four panels, all bound to the *same* trip:

| Panel | Handoff | Reads from | Writes / acts through | Links back to |
|---|---|---|---|---|
| **Trip brief** | scheduling → pilot | the crew-brief **event** (event bus, target = crew/pilot) | ACK → flips the event's `ackState` (existing event update) | Scheduler's trip detail (scheduling workspace) |
| **Aircraft & acceptance** | maintenance → pilot | tech-log state: serviceability, custody, open MEL/deferrals, maintenance release / `FlightBriefing` | accept aircraft → the **existing tech-log acknowledge action** (do not fork any signature path) | tech-log `AircraftDetail` |
| **Preflight — by leg** | pilot does the work | tech-log `TripLeg` | FRAT (reused form) / airport review / fuel request → **dispatched through the existing tech-log actions** | tech-log `LegDetail` |
| **Messages** | any role → pilot | events targeted at pilot/crew | ack / open | the referenced entity (`entityRef`) |

**Two distinct "briefs" — do not conflate:** the *Trip brief* panel is the **scheduling** crew brief / trip-sheet event (simple ACK). The *Aircraft & acceptance* panel is the tech-log **`FlightBriefing`** maintenance release/acceptance (part of custody transfer, potentially e-signature-bearing). They are separate objects and separate panels.

**Readiness bar** = the composite already defined in Slice 2: `deriveSchedulingReadiness` (checklist) ∧ tech-log `deriveTripReadiness` (which itself already gates on serviceability + per-leg FRAT/airport/fuel). **No new readiness logic** — the pilot hub only *renders* it as one verdict + governing blocker.

## 6. "Shared state, fresh UI" — the anti-island mechanism (P6-D2)

The one risk with a purpose-built pilot preflight UI is that it becomes a *second copy* of the tech-log preflight over the same trip. This is contained by three rules:

1. **The Flight Hub trip view is mounted inside the real `TechLogProvider`.** Pilot preflight writes go through the **same reducer and the same append-only audit trail** the tech-log uses — the panels are new JSX; the state machine is not. (Requires a light refactor so the trip/leg views can be driven by props rather than only by the `/tech-log/:tripId/:legId` route params.)
2. **One implementation of every rule.** FRAT scoring = the reused FRAT form. Readiness = the existing derivations. Aircraft acceptance = the existing acknowledge action. Nothing regulatory is re-derived in `pilot-workspace/`.
3. **Canonical trip + events come from the existing scheduling service / event bus**, not a parallel store.

Net: **fresh presentation, single-sourced state and rules.** `pilot-workspace/` owns layout and interaction only.

## 7. "Links back to the other roles" — both directions

- **Out:** every panel deep-links (client-side react-router navigation) to the owning surface — scheduler's trip, tech-log `AircraftDetail`, airport DB, tech-log `LegDetail`.
- **Back (reusing existing plumbing, no new bus):**
  - the pilot's **brief ACK flips the event `ackState`** — which the scheduler already sees, and which cancels the scheduler's existing "unacked by 1700" escalation;
  - the scheduler's existing **`readPreflightSummary` readback** picks up preflight progress automatically, so the scheduling trip's composite readiness reflects the pilot's work with zero new wiring.

## 8. Proposed file layout (handoff clarity)

```
src/components/pilot-workspace/
  PilotWorkspace.tsx           // shell, role-gated; My Flights ↔ Flight Hub
  MyFlightsPanel.tsx           // trip cards + composite readiness
  FlightHub.tsx                // single-pane trip view; wraps panels in TechLogProvider
  panels/
    TripBriefPanel.tsx         // scheduling handoff: crew-brief event + ACK
    AircraftAcceptancePanel.tsx// maintenance handoff: serviceability/custody/MEL + accept
    PreflightLegsPanel.tsx     // per-leg: reused FRAT form / airport / fuel
    MessagesPanel.tsx          // pilot/crew-targeted events
  ReadinessBar.tsx             // composite readiness display
  usePilotFlights.ts           // pure-ish selector: preflight-window trips + composite readiness
```

Wiring: a nav entry + a `/pilot-workspace` route in `App.tsx` gated to `['pilot','chief-pilot','admin']`; the **pilot role's default landing moves from tech-log `PilotHome` to `/pilot-workspace`** (progressive migration — tech-log remains reachable and is linked from the hub). Precedent to mirror for the shell: `src/components/scheduling-workspace/SchedulingWorkspace.tsx`.

## 9. Out of scope / productionize notes (developer handoff)

- **Postflight squawk-back** (pilot → maintenance) — links out to the Slice 5 maintenance loop-closer; not built into the hub this slice.
- **Real crew identity / crew-assignment on the trip** — replaces the "all trips in the preflight window" stand-in; needs a crew field on the canonical trip + real Entra identity.
- **Real Teams / email delivery** of the brief (currently the in-app event is the Teams stand-in).
- Everything prior slices deferred still applies (Entra, Azure SQL, myairops pull, ForeFlight, DST).

## 10. Risks

1. **Duplication / competing surface** (the flagged risk of embed-inline + fresh panels) — mitigated by §6: shared `TechLogProvider`, one FRAT form, one readiness derivation, one acknowledge action.
2. **`TechLogProvider` outside `/tech-log`** — the provider and the trip/leg views currently assume the route context. The refactor to drive them by props (and to mount the provider under `/pilot-workspace`) is the main structural work; keep it a parameterization, not a fork.
3. **Append-only discipline** — preflight leg state (`fratStatus`/`airportReviewed`/`fuelRequestId`) is *mutable orchestration* and already mutated by `LegDetail` (fine). But **aircraft acceptance / `FlightBriefing`** may be signature-bearing — route it through the existing acknowledge action, never a new write path (NEVER-rule adjacency).
4. **Two-brief confusion** — the scheduling crew brief and the tech-log `FlightBriefing` are distinct; presenting them as one would misrepresent custody. Kept in separate panels (§5).

## 11. Testability (no-DB, prototype)

- **Unit-testable (Vitest):** the `usePilotFlights` "my flights" filter and the composite-readiness *composition* as pure functions over given trip/instance/state inputs. The underlying engines (scheduling readiness, tech-log readiness, FRAT scoring) are already unit-tested and are reused unchanged.
- **Browser-verified:** role-switch to `pilot` → land in `/pilot-workspace` → My Flights shows a released trip → open it → **ACK the brief** → **accept the aircraft** → complete **FRAT / airport / fuel** per leg → the readiness bar flips to READY → switch to `scheduling` and confirm the trip's brief shows acked and the preflight readback reflects the completed legs.

## 12. Roadmap impact

This is the **pilot-side front door** the roadmap implied but never scoped — a new Slice 6 built on the Slice 0–5 foundation. It does not change Slice 5's ownership of the postflight/maintenance return; it consumes Slice 2's bridge and readback as-is. After this slice, the two department front doors (Scheduling and Pilot) both stand on the one canonical trip + event bus, which is the initiative's whole thesis.
