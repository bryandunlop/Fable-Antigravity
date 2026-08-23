# Booking portal — phase plan

Status: phase plan — scoping only. No stage in this document is authorized to start until its
gates are met and a PR-sized plan is written for it (house format, under
`docs/booking-portal/plans/plan-N-<slug>.md`).

**Goal:** an EA-facing booking portal — trip requests with approval, passenger profiles and
documents, availability watches, and (later) empty-seat asks — built on the myairops mirror,
replacing the vendor's portal after an interim dual-portal period.

**Design:** [`portal-design.md`](./portal-design.md) (agreed frames + decisions).
**Integration spec:** `architecture.md` — lands with PR #23
(`claude/myairops-api-exploration-sosbj7`); until merged, read it on that branch. Related on the
same branch: `docs/vendor/myairops-ask-list.md`, `myairops-integration-asks.md`,
`src/integration/myairops/capability.ts` (the write guard), and the CLAUDE.md amendments adding
Open Questions 5 (myairops write-back) and 6 (passenger PII residency).

## Provenance

A prototype was built in a prior session, never pushed, and is lost; nothing is salvaged from it.
This plan supersedes it (vault decision **D67**, stubbed vault-side, to be completed by Bryan —
note D68/D69 are now taken, D67 remains reserved for this). Design-before-code was deliberate:
the expensive-to-reverse decisions (PII residency, vendor write-back) are still unmade, and the
frames existed precisely so they could be argued with before anything was built.

## Global constraints (hold across every stage)

- **Pull-only stands.** `capability.ts` ships `PULL_ONLY_POLICY` — zero grants — until Stage 6's
  gates clear. Adding a grant is a reviewed diff, which is the decision record (CLAUDE.md OQ 5).
- **No passenger PII mirrored.** CRM is read-through; myGFO owns process state keyed by
  `externalReference`, myairops owns record state (OQ 6; default until decided).
- **No vendor shapes past the adapter**; units convert at the boundary only.
- **No fabricated seat counts** — a leg the adapter cannot map is parked, not guessed. A
  fabricated count sells a seat that doesn't exist.
- **Availability is advisory everywhere** — every seat/schedule number carries its as-of time;
  re-read the leg at write time (Stage 6).
- **Confidentiality is default-deny projection over the mirror**, applied server-side, one rule
  for both the portal view and the offer filter. Never a generic CRM pass-through endpoint.

## Stage map

| Stage | Deliverable | Hard gates | Soft gates |
| --- | --- | --- | --- |
| 0 | Prerequisites (no code) | — | — |
| 1 | Seat data in the mirror | none (pure pull) | — |
| 2 | Availability index + search | — | Schedule API spec (ASK 5) |
| 3 | Eligibility + confidentiality projection | — | rule shape decided |
| 4 | Portal v1: requests, approval queue, watches, profiles, inbox | trip-page + admin-config designs | scheduling inputs (tiers, windows) |
| 5 | CRM read-through façade + passenger identity | OQ 6 decided | ASK 15 answered |
| 6 | Gated write-back (seat booking only) | ASK 1, ASK 4, ASK 8; CLAUDE.md amendment (OQ 5); capability grant | — |

### Stage 0 — Prerequisites (no code)

Merge PR #23 (write guard, architecture note, ask docs, CLAUDE.md OQ 5/6). Send the vendor ask
list (Bryan). Vault follow-ups (Bryan): complete D67; the research refs
`ref-cfd-trip-request-portals` and `ref-nbaa-scheduler-workflow-guidance` already exist
vault-side; add an ops-ledger row for the prototype disposition.
**Success:** #23 on main, asks sent, D67 recorded.

### Stage 1 — Seat data in the mirror

Extend `src/integration/myairops/bookingAdapter.ts` to carry `numberOfSeats` / `remainingSeats`
on mirrored legs. **Must not:** invent a count when `bookedAircraft` is absent — park the record.
**Success:** adapter tests cover present/absent/degenerate seat data; existing mirror behavior
unchanged.

### Stage 2 — Availability index + search

Pure functions over mirrored legs: date window, route, `remainingSeats > n`. Fixture-testable; no
vendor calls in this layer; consumes myGFO domain records only. **Soft gate:** the unspecced
Schedule API (ASK 5) is the cheapest thing that could invalidate this — chase the spec first;
fall back to the mirror if the vendor is silent past a window Bryan sets.
**Success:** index answers Frame A/G queries on fixtures; as-of time flows through every result.

### Stage 3 — Eligibility + confidentiality projection

One projection, two audiences: what an EA may see (calendar, seats list) and who an offer may
reach. Server-side, default-deny; flights that fail it do not render. **Open before build:** rule
shape — per-trip, per-passenger, or per-principal ("anything with X aboard") — these are
different models and the schema must express whichever is chosen.
**Success:** projection tests prove an out-of-scope trip is absent from every surface, including
counts and digests.

### Stage 4 — Portal v1 (the frames, minus empty seats)

The agreed frames A–F, H–I: request form (per-leg manifest, purpose per passenger-leg, estimates,
extras), lifecycle + ranked approval queue with logged overrides, EA↔scheduling message board,
watches with **Freed** → pre-filled draft, document states + form review loop, EA authority
levels, action-needed/FYI inbox with email tiering. **Gates before its plan is written:** the
trip-page-after-Confirmed design and the admin/config surface (open decisions 1 and 5) — both add
screens; scheduling supplies real lockout windows and the tier list.
**Must not:** touch myairops beyond the mirror; every workflow state is myGFO-side.
**Success:** an EA can run the full request → decision → confirmed loop against mirror fixtures;
audit trail records acting-for on every EA action.

### Stage 5 — CRM read-through façade + passenger identity

**Hard gate: OQ 6 decided before any code** — identity provider question (Entra vs CRM as source
of truth), PII residency, the travel-document erasure collision, guest identity (open decision 3),
and ASK 15 (`externalReference` uniqueness/queryability on passengers).
**Must not:** mirror PII; expose pass-through endpoints; make email a stored join key.
**Success:** full profile renders from one `GET /api/Contact/{id}` read-through; masking applied
server-side; workflow rows keyed by `externalReference`.

### Stage 6 — Gated write-back

Narrowest useful path only: create a passenger booking on a leg (Frame G's confirmed ask).
**Hard gates:** ASK 1 (scoped keys), ASK 4 (concurrency/overbooking semantics), ASK 8 (sandbox
tenant), a deliberate CLAUDE.md amendment resolving OQ 5, and the capability grant diff. Re-read
the leg at write time; treat our allocation as provisional until the vendor write succeeds.
**Must not:** trip creation, cancellation, or CRM writes; never against the production tenant —
same discipline as CAMP.
**Success:** one grant enables exactly one operation; the write path fails gracefully into
"Flight changed — reconfirm".

## Explicit non-goals (this phase)

Vendor write-back beyond Stage 6's single path; PII mirroring; retiring the vendor portal before
the interim ends; the day-of-travel passenger app (externally hosted, not yet designed); exec
mobile surface (designed-for, not built).

## How stages become work

Each stage gets a PR-sized plan in the house format when its gates clear; this document is the
index and gatekeeper, updated when a gate answer arrives (per CLAUDE.md: update the file, don't
scatter the decision).
