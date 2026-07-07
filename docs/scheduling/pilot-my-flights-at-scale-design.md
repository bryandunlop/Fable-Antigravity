# Pilot My Flights list at scale — Design Spec (Slice 3)

- **Date:** 2026-07-07
- **Status:** Approved for planning (brainstorm complete)
- **Author:** Bryan Dunlop + Claude
- **Slice:** Slice 3 (final) of the pilot trip-view redesign — the My Flights *list* (the entry point across many trips). Slice 1 (trip-prep visibility) and Slice 2 (two-phase single-trip view) are shipped.
- **Branch:** `feat/watchlist-scheduling-board` (Fable-Antigravity)
- **Nature of deliverable:** Prototype / reference implementation. iPad landscape-first. No changes to the single-trip view (Slice 2) or the tech-log engines.

---

## 1. Background & problem

`MyFlightsPanel.tsx` renders the pilot's trips as a **flat card list**, sorted by soonest departure, via `selectPilotFlights(trips, nowUtc)` (active status ∈ {planning, confirmed, in_progress}, excludes `volume-seed` filler). Each card shows tail/route/ETD + a composed `PilotReadiness` badge.

That is fine for a handful of trips but not at real scale: a pilot holds **~2 months of trips at once** — a few international (planned far out), plus many domestic (nearer, less involved). A flat list of dozens of trips makes it hard to (a) find a specific trip and (b) see which trips actually need the pilot's prep.

## 2. Goal

Reorganize the My Flights list so ~2 months of trips stay navigable: **time-grouped sections** with the **in-progress trip pinned**, a **Domestic / International / DASSP filter**, and a **"needs prep only" toggle** — each card flagged when it needs the pilot's prep. Tapping a card opens that trip's two-phase view (Slice 2). This is the pilot-side analog of the scheduling Upcoming board's time-banded, filterable approach.

### Non-goals
- The single-trip view (Slice 2) — unchanged; this slice only changes the list that leads into it.
- Tech-log engine changes; the scheduling side; the readiness composition.
- Replacing `selectPilotFlights` — it is **extended** (grouping + flags + filters layered on its output), not rewritten.

## 3. Resolved decisions (forks closed during brainstorming)

1. **Time-grouped sections + a "needs prep only" toggle** (a hybrid, mirroring the scheduling board's chronological-plus-action-toggle model) — serves both "find a trip" and "what's outstanding."
2. **In-progress trip pinned** at the top (accent), above the time sections.
3. **Time bands** (by earliest-leg departure vs now): `This week` (≤7d) · `Next 2 weeks` (8–14d) · `Later this month` (15–30d) · `Next month` (31d and beyond). Soonest-first within each. Boundaries are 7 / 14 / 30 days, inclusive at the lower band; anything past 30d lands in `Next month`.
4. **Filters:** three-way **Domestic / International / DASSP** (multi-select chips, same as the scheduling board) + a **"needs prep only"** toggle. Both compose with the grouping.
5. **"Needs prep"** = a trip released to preflight (has a tech-log mirror) with an **outstanding pilot action** on any leg: FRAT not `COMPLETED`, or airport not reviewed, or **leg-one** fuel-farm submission not made. Trips not yet released to preflight are **not** flagged (nothing to prep yet); an aircraft *serviceability* block is **not** "needs prep" (that is maintenance's problem, shown via the readiness dot, not the prep flag).
6. **Fuel = leg one only.** The hangar has its own fuel farm; the fuel-farm submission applies only to the leg departing the hangar (home base) — leg one. Every other leg's fuel is crew-managed and never links into the hangar system, so it is never part of "needs prep." (Consistent with Slice 2's `requiresFuelFarmSubmission` home-base gate.)
7. **Tap a card → the trip's Slice-2 two-phase view.** iPad landscape-first (single-column list; wider gutters in landscape).

## 4. Design

### 4.1 Layout (`MyFlightsPanel`)
- **Filter row:** Domestic / Int'l / DASSP chips + a "Needs prep only" toggle.
- **In-progress pin:** any `in_progress` trip rendered first in an accent card (route, day-of-trip, and its most-pressing outstanding item if any).
- **Time sections:** `This week` / `Next 2 weeks` / `Later this month` / `Next month`, each a labeled group of trip cards (soonest-first), rendered only when non-empty.
- **Trip card:** a readiness dot from `PilotReadiness` (emerald `READY` / amber `NOT_READY` / red `BLOCKED` — this is the dispatch/airworthiness-aligned axis and keeps its RAG palette), tail · route · departure date, an INTL/DASSP badge, and a **"needs prep"** flag when `tripNeedsPrep` is true. Tapping calls the existing `onOpen(trip)` → Slice-2 `FlightHub`.
- **"Needs prep" flag colour:** the flag is a *workflow* signal (you have outstanding actions), not an airworthiness one, so it must be visually **distinct from CAMP RAG (green/amber/red)** and from the custody gold/blue axis — a neutral, non-RAG pill. This is a hard GFO design-conformance constraint (the custody/RAG axes must never be brand-washed together); the exact treatment is tuned live. The RAG-aligned signal on the card is the readiness *dot*, not this flag.
- **Empty states:** "No trips match this filter." / (with the toggle on) "Nothing needs your prep right now."

### 4.2 Filtering + grouping order
Apply in this order to `selectPilotFlights(trips, now)`'s output: (1) trip-type filter (reuse the Slice-1 `matchesTripTypeFilter` predicate on `trip.tripType`); (2) needs-prep filter if the toggle is on; (3) `groupTripsByHorizon` the survivors into five buckets — `inProgress` (any `status === 'in_progress'`, pinned) plus the four time bands. In-progress is a bucket of the one grouping function, not a separate pass, so there is a single contract to test.

### 4.3 "Needs prep" derivation
`tripNeedsPrep` reads the trip's tech-log mirror (`state.trips.find(x => x.tripNumber === trip.tripNumber)`) and its aircraft. A trip needs prep when the mirror exists and any leg has: `fratStatus !== 'COMPLETED'`, **or** `!airportReviewed`, **or** (`requiresFuelFarmSubmission(leg, aircraft)` and no `fuelRequestId`) — the fuel clause is true only for the home-base/leg-one departure. No mirror → not flagged.

## 5. Integration points
- `src/components/pilot-workspace/MyFlightsPanel.tsx` — the sectioned list + filter row + toggle + in-progress pin (replaces the flat `.map`).
- `src/components/pilot-workspace/selectors.ts` — keep `selectPilotFlights`; add the grouping/flag helpers here or in a sibling `myFlights.ts`.
- New pure helpers (unit-tested): `groupTripsByHorizon(trips, nowUtc)` → `{ inProgress, thisWeek, next2Weeks, laterThisMonth, nextMonth }` (in-progress is one of the five buckets); `tripNeedsPrep(tlTrip | null, aircraft | undefined)` → boolean. Reuse `matchesTripTypeFilter` from `scheduling-command/tripFilters` (or lift a copy) for the type filter; reuse `requiresFuelFarmSubmission` from `tech-log/engine/fuel`, and `PilotReadiness` for the dot.
- Data: scheduling `TripRecord` (`status`, `tripType`, `legs`) + the tech-log mirror trip's `TripLeg[]` (`fratStatus`, `airportReviewed`, `fuelRequestId`) already consumed by the pilot workspace.

## 6. Testing (pure logic; UI verified by type-check + the app)
- `groupTripsByHorizon`: an `in_progress` trip lands in `inProgress` regardless of its departure; band boundaries at exactly 7 / 14 / 30 days; a trip beyond 30d lands in `nextMonth`; soonest-first ordering within a band; every band present as a (possibly empty) array.
- `tripNeedsPrep`: no mirror → false; a leg with FRAT not COMPLETED / airport not reviewed → true; leg-one fuel not submitted (home base) → true; an outstation leg's missing fuel does **not** flag; a fully-prepped released trip → false.
- Type/needs-prep filter predicates: none-selected = all; combinations; toggle behavior.
- Follow the existing pilot-workspace `selectors.test.ts` Vitest pattern (fixed `NOW`, `trip()` helper).

## 7. Assumptions (confirm at plan review)
- **A1** Band boundaries 7 / 14 / 30 days (named constants); `Next month` is open-ended above 30d.
- **A2** "Needs prep" = outstanding pilot action on a released leg (FRAT/airport/leg-one-fuel); serviceability blocks are the readiness dot, not the prep flag.
- **A3** Fuel-farm submission is leg-one (home-base) only; a rare mid-trip return-to-hangar leg is not separately modeled (the `requiresFuelFarmSubmission` home-base gate would also flag it — acceptable for the demo).
- **A4** In-progress = scheduling `status === 'in_progress'`; pinned above the time bands.
- **A5** Grouping keys on the earliest leg departure (the existing `firstDeparture` in `selectors.ts`).

## 8. Out of scope
This is the final slice of the pilot trip-view redesign. No further slices are planned; future enhancements (inlining tech-log rich UI into Slice 2, crew-assignment when trips carry a crew list) are separate initiatives.
