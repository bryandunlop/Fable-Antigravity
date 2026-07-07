# Pilot trip view — two-phase (Prep / Day-of) — Design Spec (Slice 2)

- **Date:** 2026-07-06
- **Status:** Approved for planning (brainstorm complete)
- **Author:** Bryan Dunlop + Claude
- **Slice:** Slice 2 of the pilot trip-view redesign — the single-trip view. (Slice 1 = trip-prep visibility, shipped. Slice 3 = the My Flights list at scale, separate spec.)
- **Branch:** `feat/watchlist-scheduling-board` (Fable-Antigravity)
- **Nature of deliverable:** Prototype / reference implementation to hand off. Optimize for a clear, demonstrable, **iPad-first** reorganization of the existing pilot panels — not production hardening. No changes to the tech-log engines.

---

## 1. Background & problem

The pilot's single-trip view (`FlightHub.tsx`) is a **flat stack of six sections with no phases**: trip header + `ReadinessBar`, Trip prep (`TripBriefPanel`, reworked in Slice 1), aircraft acceptance (`AircraftAcceptancePanel`), an inline "Squawks to maintenance" box, `PreflightLegsPanel` (per-leg fuel + airport + FRAT), and `MessagesPanel`. Everything renders at once regardless of how far out the flight is, and three items (airport data, FRAT, the maintenance acceptance ceremony) only show thin summaries and link out to tech-log pages (`LegDetail`, the tech-log trip page).

Two realities this ignores:
- **Crew are always on an iPad**, touch-first, usually portrait. A long flat scroll of always-on panels is the wrong ergonomics.
- **Trips are multi-day and multi-leg at real scale.** Up to **6 legs in a day** (currency flights — 3 landings per pilot), usually ≤4; trips run **7–14 days with 8+ legs**. Per-leg work (fuel, airport review, FRAT) stacks badly in a flat view, and completed work buries what's still outstanding.

## 2. Goal

Reorganize the single-trip view into two touch-first phases — **Prep** (ahead of the day) and **Day-of** (near/on departure) — with a **day→leg stepper** that focuses the current leg, and an **outstanding-first** pattern that leads with what's still to do and collapses completed work. Keep the existing tech-log link-outs; change organization and ergonomics, not the underlying tech-log flows.

### Non-goals (out of scope for this slice)
- **The My Flights list at scale** (navigating a pilot's ~2 months of trips) — **Slice 3**.
- **Inlining tech-log rich UI.** Airport data, the full FRAT page, and the maintenance acceptance/sign ceremony keep their "open in tech-log ↗" links. (FRAT's existing inline *start* in the legs panel stays as-is.)
- Any change to the tech-log engines, FRAT scoring, airport DB, fuel logic, custody/acceptance, or the scheduling side.
- URL/deep-linking per trip (the view remains reached via in-memory selection, as today).

## 3. Resolved decisions (forks closed during brainstorming)

1. **Two tabs — Prep | Day-of — with a time-aware default.** Opens on the phase that fits proximity to departure (Prep when >~24h out; Day-of within 24h / once in progress); the pilot can switch freely.
2. **Day→leg stepper.** Legs group by day in a horizontally-scrollable strip; the **current leg** (next to fly) is focused by default; completed legs show ✓; tap any to jump. The selected leg is **shared across both tabs**.
3. **Outstanding-first.** The current leg's per-leg items and the trip-prep list lead with what's *outstanding*; completed items collapse under a "✓ N completed · tap to view" row.
4. **Split the per-leg panel.** Today's `PreflightLegsPanel` bundles fuel + airport + FRAT; fuel moves to **Prep**, airport + FRAT to **Day-of**, each scoped to the selected leg.
5. **Squawks + Messages live in an always-visible footer** below both tabs (not phase-specific).
6. **Keep tech-log link-outs** — re-group + ergonomics only, no inlining (that would be a later slice).
7. **iPad landscape-first, responsive to portrait, touch.** Primary target is iPad **landscape** — the active tab's cards lay out two-up and the leg strip shows more legs without scrolling. **Portrait** is a responsive fallback: a narrower single column with stacked cards. Same components throughout; large (≥44px) tap targets; the leg strip scrolls horizontally when it overflows.
8. **Tabs are organizing defaults, never gates — day-of items support fill-ahead + draft-then-submit.** Pilots often prepare a flight before the day, so any item can be worked at any time (the tab default just picks what leads). FRAT follows **fill → save draft → submit**: the existing `fratStatus` (not-started / in-progress-draft / completed) + `FratDraft` (`saveFratDraftOnLeg`) let a pilot draft a leg's FRAT days ahead, save it, and finalize it day-of via `completeFratOnLeg`. The final submit is the day-of action but is **not hard-gated** (see A6).

## 4. Design

### 4.1 Layout shell (`FlightHub`)
- **Always-visible header:** trip identity (tail · route · day-of-trip · INTL/DCA badge), the `ReadinessBar` (the merged scheduling + preflight verdict — this *is* the scheduling overview; no separate card), and the two tabs.
- **Tab body:** the active phase fills the width (single column on iPad portrait).
- **Always-visible footer:** "Report a squawk" (the existing inline squawks affordance, relocated) + a compact "Messages · N" entry point (`MessagesPanel`, which post-Slice-1 excludes `handoff:*` events).

### 4.2 Tab model
`Prep | Day-of`, selected in local component state. **Default** chosen by a pure rule: Day-of when the trip is `in_progress` **or** the current leg's ETD is within `TAB_DAYOF_THRESHOLD_HOURS` (24h); otherwise Prep. The pilot may switch and the choice sticks for the session.

### 4.3 Leg context (day→leg stepper)
A shared leg selector above the tab body:
- Legs are grouped by **departure day** (the leg's `departureTimeUtc`, office-local date), rendered as a horizontally-scrollable strip with small day labels.
- The **current leg** = the first leg not yet departed (`departureTimeUtc >= now`); if all have departed, the last leg. Completed/departed legs render with a ✓; the current leg is highlighted; future legs are plain. Tapping a leg selects it.
- The selected leg drives the per-leg cards in **both** tabs. Default selection = the current leg.

### 4.4 Prep tab
Leads with the pilot's outstanding prep action; keeps scheduling's completed work as collapsed reference:
- **Fuel requests** for the **selected leg** — the pilot's actionable prep item — lead. The existing fuel-farm submission (`preflightActions.submitFuelOnLeg`), shown only when that leg requires it (`requiresFuelFarmSubmission`); its 4h-before-ETD lock is unchanged. Once submitted it drops into the completed section.
- **Trip prep** (trip-level, from Slice 1) is scheduling's *completed* work — read-only. Since it is all done, it sits **collapsed by default** under "✓ N prep items done · tap to view", grouped by category when expanded. This preserves Slice 1's completed-only decision: no ack, and scheduling's still-open items are never shown to the pilot.

### 4.5 Day-of tab (selected leg)
- **FRAT** for the selected leg — **fill → save draft → submit**. The card reflects `fratStatus`: **Start FRAT** (not started) / **Resume FRAT · draft saved** (in progress) / **✓ submitted · score** (completed), backed by the existing `saveFratDraftOnLeg` (draft) and `completeFratOnLeg` (submit); the full page keeps its link-out. A saved-but-unsubmitted draft is flagged on that leg's chip in the stepper, so a pilot can see which future legs are already part-prepared. Submitting the final FRAT more than `FRAT_EARLY_SUBMIT_WARN_HOURS` (default 24h) before the leg's ETD raises a soft, confirmable warning (conditions may change) but is allowed (A6).
- **Airport review** for the selected leg (the existing `markAirportReviewedOnLeg` chip/action; airport *data* keeps its "open details ↗" link to `LegDetail`).
- **Maintenance handoff** (trip-level): the existing `AircraftAcceptancePanel` summary + "review & accept in tech-log ↗".
- Presented outstanding-first: not-yet-done items (FRAT not started, airport not reviewed, acceptance pending) lead; completed ones collapse.

### 4.6 Outstanding-first pattern
A single reusable presentation: given the pilot's actionable items each with a done/not-done state, render the not-done ones expanded and the done ones behind a collapsible "✓ N completed · tap to view". Applied to the current leg's Prep + Day-of actions (fuel, FRAT, airport review). The trip-prep list is a special case — all-completed scheduling reference — so it renders as a single collapsed "✓ N done · tap to view" block by default (§4.4).

### 4.7 Responsive layout (landscape-first)
Optimize for iPad **landscape** (~1024×768): the header sits in one row (identity · readiness · tabs), the leg strip shows more legs, and the active tab's cards flow into a **two-column grid**. **Portrait** (~768×1024) degrades via CSS to a single column with stacked cards. No orientation-specific components — a width-responsive grid (`repeat(auto-fit, minmax(...))` with a landscape breakpoint). Tap targets stay ≥44px in both.

## 5. Integration points
- `src/components/pilot-workspace/FlightHub.tsx` — the reorganization: header + tabs + leg stepper + footer; route panels into the two tabs.
- `src/components/pilot-workspace/PreflightLegsPanel.tsx` — split its per-leg concerns into a **fuel** section (Prep) and an **airport + FRAT** section (Day-of), each scoped to the selected leg. (Keep the existing actions/links; this is a re-slice, not a rewrite of the leg logic.)
- `src/components/pilot-workspace/panels/TripBriefPanel.tsx` — Prep tab; add the outstanding-first framing around the Slice-1 completed list.
- `src/components/pilot-workspace/panels/AircraftAcceptancePanel.tsx` — Day-of tab (unchanged internally).
- `src/components/pilot-workspace/panels/MessagesPanel.tsx` + the squawks affordance — relocate into the footer.
- `src/components/pilot-workspace/ReadinessBar.tsx` — header (unchanged).
- New pure helpers (unit-tested) — a leg-context module (e.g. `src/components/pilot-workspace/legContext.ts`): `currentLegIndex(legs, nowUtc)`, `groupLegsByDay(legs, officeTzOffsetMinutes)`, `defaultPhase(trip, currentLeg, nowUtc)` → `'prep' | 'day-of'`, `partitionOutstanding(items)`, and `fratEarlySubmitWarning(nowUtc, etdUtc, thresholdHours)` → boolean (the A6 soft warning). Data comes from the tech-log mirror trip's `TripLeg[]` (`fratStatus`, `airportReviewed`, `fuelRequestId`) already consumed by `PreflightLegsPanel`; the FRAT draft/submit actions (`saveFratDraftOnLeg`, `completeFratOnLeg`) are reused unchanged.

## 6. Testing (pure logic; UI verified by type-check + the app)
- `currentLegIndex`: next-not-departed selection; all-departed → last; single leg; boundary at exactly `now`.
- `groupLegsByDay`: multi-day grouping by office-local date; a 6-leg single day; day boundaries across the office TZ offset.
- `defaultPhase`: in-progress → day-of; within 24h → day-of; far out → prep.
- `partitionOutstanding`: leads with not-done, collapses done, counts correct; all-done and none-done edges.
- `fratEarlySubmitWarning`: warns beyond the threshold, no warn within it, boundary at exactly the threshold hours before ETD.
- Follow the existing pilot-workspace `selectors.test.ts` Vitest pattern.

## 7. Assumptions (confirm at plan review)
- **A1** Tab default threshold = 24h before the current leg's ETD (named constant). 
- **A2** Trip prep stays **completed-only** (Slice 1's decision) and renders collapsed-by-default as reference; this slice does **not** surface scheduling's still-open items to the pilot. The pilot's own actionable items (fuel / FRAT / airport) are what lead outstanding-first.
- **A3** "Current leg" = first not-yet-departed leg (vs. the leg currently airborne). 
- **A4** Day grouping keys on the leg's office-local departure date. 
- **A5** Tabs are local component state (no URL routing), consistent with today's `FlightHub`.
- **A6** (resolved) The final FRAT **submit** is not hard-gated. A **soft, confirmable warning** appears when submitting more than `FRAT_EARLY_SUBMIT_WARN_HOURS` (default **24h**) before the leg's ETD — "this FRAT is being submitted early; conditions may change" — the pilot confirms and proceeds. Drafting is always allowed. The exact hour threshold is a tunable constant to confirm at plan time.

## 8. Out of scope — Slice 3 (recorded, not built here)
**The My Flights list at scale.** A pilot holds ~2 months of trips at once (a few international planned far out, plus many domestic). The list (`MyFlightsPanel` / `selectPilotFlights`) needs grouping/filtering — by time horizon and international-vs-domestic — so the *entry point* across many trips stays navigable, mirroring the scheduling Upcoming board's forward-lane idea on the pilot side. Separate spec after Slice 2 ships.
