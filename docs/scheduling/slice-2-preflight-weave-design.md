# Slice 2 — Preflight Weave (Scheduling ↔ tech-log reconcile) — Design Spec

- **Date:** 2026-07-01
- **Status:** Design — awaiting review before planning
- **Slice:** 2 of the department-workspaces roadmap (follows the completed Slices 0–1 foundation + scheduling workspace)
- **Nature:** Prototype / developer-handoff, consistent with Slices 0–1 (dev role-switch, in-memory scheduling store, tech-log's localStorage state).

---

## 1. Goal

Connect a scheduling-created trip to a trip-driven **preflight** (FRAT + airport review + fuel + readiness) **by reusing tech-log's existing, tested preflight** rather than rebuilding it — and in doing so, pay down the "one canonical Trip; reconcile tech-log's Trip onto it" debt the foundation spec deferred.

Concretely: a scheduler mirrors/creates a trip and works its scheduling checklist; when coordination is done they **"Release to preflight,"** which projects the trip into tech-log so the crew's per-leg FRAT/airport/fuel begins on the *same* trip. The scheduling trip shows a **preflight-readiness summary** and an **"Open preflight"** deep-link into tech-log's existing Trip Workspace / Leg Detail.

## 2. Why this is not greenfield

tech-log already implements trip-driven preflight (verified on this branch):
- `tech-log/pages/LegDetail.tsx` — per leg: embeds `StandaloneFRATForm` (writes `fratStatus`/`fratScore`), airport review (`airportReviewed`), home-base fuel-farm submission (`fuelRequestId` via `requiresFuelFarmSubmission`).
- `tech-log/engine/readiness.ts` `deriveTripReadiness` — gates a trip on serviceability + every leg FRAT-complete + airport-reviewed + fuel-submitted-where-required.
- `tech-log/pages/TripWorkspace.tsx` — the per-trip preflight surface.

It runs on **tech-log's own models**, which differ from the scheduling foundation's:

| Concept | Scheduling foundation (Slices 0–1) | tech-log |
|---|---|---|
| Trip | `TripRecord` (in `SchedulingStore`, in-memory) — `tripNumber, sourceSystem, sourceTripRef, tail, aircraftType, tripType, priority, status, legs, …` | `Trip` (in `TechLogContext` reducer, localStorage `tech-log-state`) — `id, tripNumber, aircraftId, name, status(OPEN/CLOSED), flightLogIds[], legs?` |
| Leg | `TripLegRecord` — `sequence, departureIcao, arrivalIcao, departureTimeUtc, paxCount, filedStatus?` | `TripLeg` — `sequence, departureIcao, arrivalIcao, departure/arrivalTimeUtc, fratStatus, fratScore?, airportReviewed, fuelRequestId?` |
| Aircraft | `tail` + `aircraftType` (free strings) | `Aircraft` registry — `id, tailNumber, type, serialNumber, status, isProvisional, homeBase, …` |
| Persistence | in-memory `SchedulingStore` (ephemeral) | reducer + `localStorage['tech-log-state']` (DATA_VERSION-gated) |

**Slice 2 = the bridge between these two trip-driven systems.**

## 3. Resolved decisions

| # | Decision | Choice |
|---|----------|--------|
| S2-D1 | Preflight trigger | **Explicit "Release to preflight"** on the scheduling trip (matches the scheduling→crew handoff; keeps in-progress trips out of preflight). |
| S2-D2 | Preflight surface | **Deep-link into tech-log's existing Trip Workspace / Leg Detail** for the same trip. Scheduling shows a preflight-readiness summary + the link. Two surfaces, one trip. |
| S2-D3 | Bridge direction | **One-way projection scheduling → tech-log.** Scheduling's `TripRecord` is the MAO-mirror origin; tech-log holds the preflight enrichment. No write-back from tech-log to the scheduling `TripRecord` (readiness is *read* back for display). |
| S2-D4 | Coupling location | The fragile coupling to tech-log's state shape lives **inside a tech-log bridge module**, giving scheduling a clean API. |

## 4. The bridge (core of the slice)

A new `src/components/tech-log/bridge.ts` (owned by tech-log, since it owns the state schema) exports:

```ts
// Projects a scheduling trip into tech-log's persisted state so the crew can preflight it.
// Idempotent by tripNumber. Returns the tech-log trip id to deep-link to.
export function releaseSchedulingTripToPreflight(input: SchedulingTripForPreflight): {
  techLogTripId: string;
  createdAircraft: boolean;
};

// Reads back a lightweight preflight-readiness summary for a released trip (by tripNumber),
// for the scheduling workspace to display without owning tech-log's state shape.
export function readPreflightSummary(tripNumber: string): PreflightSummary | null;
```

Where `SchedulingTripForPreflight` is a minimal, decoupled input (tripNumber, tail, aircraftType, legs[{sequence, departureIcao, arrivalIcao, departureTimeUtc}], createdBy) — NOT the full `TripRecord` (keeps tech-log independent of the scheduling store types).

**What `releaseSchedulingTripToPreflight` does:**
1. Read `localStorage['tech-log-state']` (respecting `DATA_VERSION` — if absent/mismatched, start from the default seeded state so we never wipe the fleet).
2. **Aircraft mapping (exact-tail-match invariant):** find the tech-log `Aircraft` whose `tailNumber === input.tail`. If none, create a minimal `Aircraft` (`type` from `aircraftType`, placeholder `serialNumber`/`homeBase`, `status: ACTIVE`, `isProvisional: false`) and flag `createdAircraft: true`. (Production note: this must reconcile against the real fleet/CAMP, not auto-create — see §7.)
3. **Idempotency:** if a `Trip` with `tripNumber === input.tripNumber` already exists, return its id (do not duplicate); optionally reconcile legs (out of scope for v1 — first release wins).
4. Map legs `TripLegRecord → TripLeg` (`fratStatus: 'NOT_STARTED'`, `airportReviewed: false`, `fuelRequestId: undefined`; `arrivalTimeUtc` defaulted if absent).
5. Append the `Trip` (+ `TRIP_CREATED` audit entry, matching `Trips.create()`), write state back to localStorage.
6. Return `{ techLogTripId, createdAircraft }`.

**Why write-through works:** `TechLogProvider` is route-scoped to `/tech-log/*` and loads state from `localStorage['tech-log-state']` on mount. Client-side navigating to the deep-link mounts the provider fresh → it reads the just-written state → the projected trip is there. (If the scheduling workspace and tech-log are ever co-mounted, replace the localStorage write with a direct `dispatch({type:'ADD_TRIP'})` — the bridge API stays the same.)

## 5. Scheduling-side changes

- **Trip record gains a link:** `TripRecord` (or a side-store map) records `preflightReleasedAt?: string` + `techLogTripId?: string` so the UI knows a trip is released and where to link. (Additive; the SchedulingStore already round-trips arbitrary fields.)
- **Trips panel / trip detail:**
  - If not released: a **"Release to preflight"** button → calls `releaseSchedulingTripToPreflight(...)`, stores the returned `techLogTripId` + timestamp, `bump()`. Guard: warn if `createdAircraft` (tail not in the fleet) so the scheduler knows a placeholder aircraft was made.
  - If released: an **"Open preflight ↗"** action that client-side navigates to `/tech-log/trips/<techLogTripId>` (react-router navigate — keeps auth), plus a **preflight-readiness summary** (per-leg FRAT/airport/fuel chips + overall state) from `readPreflightSummary(tripNumber)`, refreshed on `tick` / on focus.
- **Aircraft/tail alignment:** the create-trip form's tail input should surface tech-log's fleet tails (a datalist/select of known tails) so released trips map cleanly; free-typed tails still work but trigger the placeholder-aircraft path.

## 6. Readiness reconciliation (the visible weave)

The scheduling trip's overall readiness becomes a **composite**: its scheduling-checklist readiness (from `deriveSchedulingReadiness`, Slice 1) **plus** the preflight-readiness summary (from tech-log). The trip detail shows both: "Coordination: NOT_READY (2 tasks open)" and "Preflight: NOT_READY (leg 1 FRAT not started)". A trip is "ready to fly" only when both are READY. (v1: display both side-by-side; a single combined verdict is a small follow-up.)

## 7. Out of scope / productionize notes (developer handoff)

- **Real trip reconciliation** should key on a shared trip id / `sourceTripRef` in a real backend (Postgres), not a localStorage write-through. The bridge module is the seam to swap.
- **Aircraft registry:** auto-creating a placeholder Aircraft violates the exact-tail-match / real-fleet discipline; production must map to the real fleet (and CAMP), not invent aircraft. The `createdAircraft` flag surfaces this in the prototype.
- **Two-way sync / edits after release** (scheduling edits a released trip's legs) — v1 is first-release-wins; re-sync is a follow-up.
- Everything Slices 0–1 deferred still applies (Entra, Azure SQL, myairops pull, ForeFlight, Teams/Graph, DST).

## 8. Risks

1. **State-schema coupling** — the bridge writes tech-log's reducer state shape + honors `DATA_VERSION`. Contained inside `tech-log/bridge.ts`, but a tech-log schema change could break it. Mitigate with a focused unit test on the bridge's mapping + a shape guard.
2. **DATA_VERSION wipes** — tech-log clears `tech-log-state` on version change; a release written under an old version could be wiped. The bridge must write under the current `DATA_VERSION` and set the version key.
3. **Deep-link auth** — must be client-side navigation (react-router), not a hard reload (which would drop the in-memory scheduling session). Confirmed pattern.

## 9. Testability (no-DB, prototype)

- **Unit-testable (Vitest):** the bridge's pure mapping (`TripLegRecord[] → TripLeg[]`, aircraft-by-tail resolution, idempotency-by-tripNumber) — extract the mapping as pure functions taking `(state, input)` and returning the next state, tested without localStorage; the thin localStorage read/write wrapper is the only untested seam.
- **Browser-verified:** create a domestic trip in scheduling → Release to preflight → Open preflight → tech-log Trip Workspace shows the trip + legs → complete FRAT/airport/fuel in tech-log → back in scheduling, the preflight-readiness summary reflects it.

## 10. Roadmap impact

This slice **absorbs the trip-model reconciliation** that the foundation spec had pencilled for Slice 5 (maintenance handoff). Slice 5 now narrows to the postflight/maintenance side (completed trip → tech-log FlightLog/postflight), building on the bridge established here.
