# Slice 3 — International / DCA-DASSP — Design + Plan

> Execute subagent-driven. Engine extension is TDD'd; templates are seeded data validated by `parseTemplate`; flow through the existing per-trip checklist engine + workspace (no new UI). Prototype/dev-handoff.

**Goal:** Digitize the international-trip and Critical-DCA/DASSP checklists as **country-conditional per-trip templates** and a **T-minus countdown**, driven by the Slice-0 checklist engine. Creating an `international` or `dca_dassp` trip auto-instantiates the right country-specific + security tasks with ETD-relative due dates.

**Approach:** Slice 0 already gives ETD-relative dueRules (`hoursBeforeEtd`, `businessDaysBeforeEtd`, `monthsBeforeEtd`, `annualDate`) and conditional task inclusion. What's missing for international is **route/country conditions**. Add `routeTouchesCountry` (+ `routeTouchesIcaoPrefix`) to the condition engine, derive `routeIcaos` on `TripContext`, and seed the international + DASSP templates. No new UI — the trips panel already renders per-trip checklists for any tripType, and Slice 2's Release-to-preflight already works for them.

## Scope decisions (autonomous, recorded)
- Country rules = seeded template tasks with `routeTouchesCountry` conditions (China 6-mo passport / arrival card, India military PPR lead, UK ETA, Mexico 180-day permit, Singapore SGAC, Philippines bio-pages, Canada eTA/CANPASS, Europe slots/disinsection). Prototype content faithful to the INTL Master; department edits later (D9).
- DASSP = a `dca_dassp` template = a T-minus countdown (7 biz days / 72h / 24h / 22h / 12h / 2h / 1.5h / 1h / on-board / post-flight) via `businessDaysBeforeEtd`/`hoursBeforeEtd`, with the security gates (ASO, TSA screening, ARO slot, FAA waiver, NCRCC release) as tasks. SSI sensitivity (never email the DASSP Authorization #) captured as a task **note**, not enforcement infra.
- **Deferred (documented follow-ons, NOT built):** passport/visa *readiness gating* (wiring `PassengerFormContext` docs to a trip's readiness); permits/APIS as first-class entities; real SSI suppression. These are noted in seed task descriptions.

## Global Constraints
- Engine stays pure/deterministic; UTC-based; no new deps. Tests: Vitest co-located; `npm test -- src/scheduling`. `parseTemplate` must accept the new condition kinds (validation boundary).

---

## Task 1: condition engine — route/country predicates

**Files:** `src/scheduling/engine/types.ts` (append), `src/scheduling/engine/conditions.ts`, `src/scheduling/engine/conditions.test.ts`; new `src/scheduling/engine/geo.ts` + `geo.test.ts`; `src/scheduling/store/mapping.ts` (populate `routeIcaos`); `src/scheduling/store/validate.ts` (accept new kinds) + its test.

- **`geo.ts`:** `export function countryForIcao(icao: string): string` — map by ICAO prefix to a country/region code, covering the checklist countries. Rules (first-letter / two-letter prefix): `K*`→`US`, `C*`→`CA` (Canada), `MM*`→`MX`, `EG*`→`GB` (UK), `LF`→`FR`,`LE`→`ES`,`LI`→`IT`,`LG`→`GR` (map these to `EU`), `Z*` (excluding ZK/ZM…)→`CN` (China — use prefix `Z` but not `ZK`(NZ)… keep simple: `ZB/ZG/ZS/ZU/ZP/ZL/ZH/ZY/ZW`→`CN`), `WS*`→`SG`, `RP*`→`PH`, else `` `OTHER:${icao.slice(0,2)}` ``. Keep it a small, documented lookup (prototype-scope; a real system uses an airport DB). Unit-test the covered prefixes.
- **`TripContext`** (types.ts): add `routeIcaos: string[]` (all leg departure+arrival ICAOs, upper-cased, deduped).
- **`Condition`** (types.ts): add `| { kind: 'routeTouchesCountry'; country: string }` and `| { kind: 'routeTouchesIcaoPrefix'; prefix: string }`.
- **`evaluateCondition`** (conditions.ts): `routeTouchesCountry` → `trip.routeIcaos.some(i => countryForIcao(i) === cond.country)`; `routeTouchesIcaoPrefix` → `trip.routeIcaos.some(i => i.startsWith(cond.prefix))`. Keep the exhaustive-default throw.
- **`toTripContext`** (store/mapping.ts): populate `routeIcaos` from `trip.legs` (dep+arr, upper, dedup).
- **`validate.ts` `parseCondition`:** add cases for the two new kinds (validate `country`/`prefix` are strings).

**Tests (TDD):** `geo.test.ts` (covered prefixes → expected countries; unknown → OTHER); `conditions.test.ts` add: `routeTouchesCountry('CN')` true when a leg is `ZBAA`, false otherwise; `routeTouchesIcaoPrefix('EG')` true for `EGLL`. Update the `TripContext` test fixtures across engine tests to include `routeIcaos: []` (optional-safe: make it required and fix fixtures, OR default in evaluate — prefer required + fixture updates for correctness). `mapping.test.ts`: `routeIcaos` derived + deduped. `validate` test: new kinds accepted; unknown still throws.

Commit: `feat(scheduling): add route/country conditions (routeTouchesCountry) + ICAO->country geo`.

---

## Task 2: seed International + DASSP templates

**Files:** `src/scheduling/store/seed.ts` (+ `seed.test.ts` assertions).

Add two published per-trip templates to `SEED_TEMPLATES`:
- **International** (`per_trip`/`international`): base E-docs tasks (GenDec/APIS cross-check, crew+pax passport confirm, trip-sheet to UV 1–2 months prior via `monthsBeforeEtd`, crew/pax info 2 weeks prior, international-captain confirm, duty/rest marks) + country-conditional tasks using `routeTouchesCountry`:
  - `CN`: "PAX complete China Arrival Card; verify 6-month passport validity" (condition CN).
  - `GB`: "Confirm UK ETA for pax & crew (unless transit only)" (condition GB).
  - `MX`: "Carry prior AIU landing permit if visited Mexico within 180 days" (condition MX).
  - `SG`: "Submit Singapore Arrival Card (SGAC) within 3 days of arrival" (condition SG).
  - `PH`: "Send passport bio pages to UV ≥24h before RPLL arrival" (condition PH; `hoursBeforeEtd: 24`).
  - `CA`: "Obtain eTA / CANPASS info" (condition CA).
  - India (ICAO prefix `VI`/`VA`… use `routeTouchesIcaoPrefix('VI')` or a country `IN` — add `VI/VA/VE/VO`→`IN` to geo): "Send India request to UV ASAP (7 biz days; 25 for military PPR)".
- **DASSP** (`per_trip`/`dca_dassp`): the T-minus countdown as tasks with ETD-relative dueRules + owner roles + ack where the paper escalates:
  - `businessDaysBeforeEtd: 7` "Submit initial TSA inspection service request"; `hoursBeforeEtd: 72` "Obtain ARO slot (goes in flight-plan remarks)"; `hoursBeforeEtd: 24` "Obtain DASSP Flight Authorization # (NOTE: never email/put in remarks — verbal to FDU only)" + "Contact gateway FBO (Signature DCA)"; `hoursBeforeEtd: 12` "Email crew ARO slot + Auth doc to TSA"; `hoursBeforeEtd: 2` "File ICAO IFR plan to Washington FDU (2–22h window)"; `hoursBeforeEtd: 1` (owner pilot, requiresAck) "TSA screening of AC/crew/pax" + handoffTarget pilot; "Call NCRCC to confirm aircraft release before departure". Add `description` notes flagging SSI where relevant.

Every task: valid `requiresAck` boolean, valid dueRule, valid condition, `ownerRole` (scheduling/pilot), `category` (customs/permits/security/crew/comms). All pass `parseTemplate` (the seed test already gates every template through it).

**Tests:** `seed.test.ts`: assert `SEED_TEMPLATES` now includes `per_trip:international` and `per_trip:dca_dassp`; each still passes `parseTemplate`; instantiate an international template against a China-touching trip context → the China-conditional task is included, and excluded for a domestic-only route.

Commit: `feat(scheduling): seed international (country-conditional) + DASSP T-minus checklists`.

---

## Task 3: verify + polish
- `npm test -- src/scheduling` green; `npm run build` clean; tsc clean.
- Browser: create an `international` trip routed through a China ICAO (e.g. ZBAA) → its checklist shows the base intl tasks + the China-conditional task; create a `dca_dassp` trip → the DASSP countdown appears with ETD-relative due dates; Release-to-preflight still works.
