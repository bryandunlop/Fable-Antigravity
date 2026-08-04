# Booking portal — v1 design (frames + decisions)

Status: design record, agreed with Bryan 2026-08-04. The rendered frames live at
[`mockups/booking-portal-frames-v1.html`](./mockups/booking-portal-frames-v1.html) (self-contained,
open in any browser). This note is the text of record for *what* the portal is; the
[phase plan](./phase-plan.md) says *when and behind which gates* it gets built. Integration
constraints (mirror, CRM read-through, write guard) come from `architecture.md` (lands with PR #23)
and are not restated here.

## Who it's for

**EA-first, desktop web.** Executive assistants arranging travel for principals are the power
users; they get the dense workflows. Principals see outcomes (itineraries, confirmations), not
the machinery. A traveler/exec mobile surface is explicitly later — nothing in v1 may assume it,
nothing may preclude it.

Research grounding: Portside's owner portal treats admin assistants as first-class submitters;
Navan's delegate model (principal approves the EA relationship once, every action recorded as
"EA X acting for Exec Y", notifications dual-delivered) is the pattern for the authority layer.

## Locked decisions

| Area | Decision |
| --- | --- |
| Home view | Eligibility-filtered calendar: default-deny confidentiality projection; flights that fail it do not render at all. Seats-available flights are marked. |
| Request form | Per-leg passenger manifest with lead passenger; purpose per passenger-leg (business / personal-non-entertainment / entertainment / commuting — the SIFL/SEC capture, at request time, not post-flight); live flight-time estimate while building legs (labeled "planning estimate"); structured extras (catering, pets, baggage, ground, ± time flexibility). |
| Lifecycle | Draft → Requested → Pending approval → Approved → Confirmed. Approved ≠ Confirmed on purpose: approval is scheduling's decision, Confirmed means it's on the schedule. Declined always carries a reason and reopens the same request as a draft. |
| Contention | Interest accumulates; scheduling clears a system-ranked queue at a published time ("decisions by 14:00 ET"). Requesters see the decision time, never their position or competitors. |
| Message board | Per-request, EA ↔ scheduling only. Rejections, resubmissions, and post-lockout change requests all live in the thread. Principals see outcomes, not the thread. |
| Notifications | Email + in-portal inbox. Instant email only for action-needed events (watch freed, decision, flight changed — reconfirm); everything else in a daily digest. No push in v1. |
| Watches | One mechanism, two triggers: route-seat watch and fleet-date hold. A watch reserves nothing and self-expires after its window. When it comes through the state is **Freed** (not "fired") and the EA gets one click into a pre-filled draft request that flows the normal path. |
| Documents | Three states evaluated against travel dates, not today: Valid / Flag (expires < 6 months after last travel date, still bookable) / Block (expires before or during travel, reason stated). Per-country six-month entry rules can promote Flag to Block. Travel form is a review loop: submit → scheduling approves or rejects with reason → resubmit. |
| Mockups | Static frames first; myGFO brand chrome (Midnight sidebar, Daylight accent, Sunrise gold for the EA's own things, flat squares, Montserrat). |

## Provisional defaults (standing unless vetoed)

- **Queue ranking:** org tier, then request time (Space-A model). The tier list itself is an open
  policy input from Bryan/scheduling. Overrides are one click with a mandatory logged reason.
- **Trip cards for non-involved EAs:** route, times, aircraft, open-seat count — no passenger
  names, no trip owner. Position-without-identity: on a roster this small, even initials out an
  executive's travel.
- **Freed hold → pre-filled draft request**, not an auto-submitted one.
- **EA authority levels:** View / Book / Full, per EA-principal pair. (View: trips + itineraries.
  Book: + request, manifest, forms. Full: + profile, documents, standing preferences.)

## Empty seats (exploratory — Frame G)

Agreed shape, deferred build: a browsable list under the same eligibility projection as the
calendar, flattened by date. "Ask for a seat" joins the same ranked clear as trip requests and
never bumps one. The ask panel carries the interesting obligations at ask time:

- **Personal seats surface a tax note** (SIFL imputed income to the sponsoring principal), logged
  with the request.
- **First-time flyers** trigger the travel form automatically on approval.
- **Every seat rides someone else's trip** — conditional end to end; any change to the host flight
  puts the seat into "Flight changed — reconfirm"; a lock window freezes seat movement before
  departure.

Seat vocabulary reuses the trip vocabulary (Seat requested → Pending → Seat confirmed;
Withdrawn / Released) — one language, two paths.

## Vocabulary (chips as users see them)

- Trip: `Draft → Requested → Pending approval → Approved → Confirmed`, or `Declined — reason → Draft (resubmit)`
- Watch: `Watching → Freed → Requested`, or `Expired`
- Seat: `Seat requested → Pending — decision 14:00 → Seat confirmed`, or `Flight changed — reconfirm / Withdrawn / Released`
- Documents: `Valid / Flag — < 6 mo after travel / Block — expires before travel`

## Open design decisions (before or during build; owners in parentheses)

1. **The trip page after Confirmed** — itinerary, FBO details, calendar invite, day-of changes.
   Biggest known gap; every comparable product treats this as the heart of the app. Needs its own
   frame before Stage 4 builds. (design + Bryan)
2. **Host consent on empty seats** — does the host principal get a veto on who joins their
   flight, or is scheduling's clear the only gate? One arrow in the flow; changes who feels in
   control. (Bryan)
3. **Guest/family identity** — guests have no Entra account and no CRM record until someone
   creates one; who mints guest profiles, and does the travel form go to the guest or through the
   EA? (Bryan + scheduling; touches OQ 6)
4. **Cancellations and no-shows** — self-serve release, pre-departure reminders, whether no-show
   history feeds priority. Seats are free to the claimant; something must discourage hoarding.
   (scheduling)
5. **Admin/config surface** — tier list, lockout windows, clear time, form-currency window: all
   configurable by decision, so someone needs a settings screen and an owner. (Bryan/DOM)
6. **Principal notifications** — is the principal told when their EA books on their behalf?
   (Navan pattern: dual delivery.) (Bryan)
7. **International flow** — APIS anchors the lockout; visa checks are destination-dependent; an
   international request likely earns an extra step or banner. (scheduling)
8. **Repeat trips** — "re-book a previous mission" one-tap repeat; cheap, high-value for monthly
   runs. (design)
9. **Branding** — frames wear myGFO chrome; whether the EA-facing portal should look like its own
   product is an open call. (Bryan)
10. **Tier list contents** — the actual priority categories behind the queue ranking; NBAA expects
    an explicit bumping/priority policy in the scheduling SOP. (Bryan + scheduling)

## Research grounding (summary)

Landscape: FL3XX Owner App / Moove (the closest Part 91 seat-sharing product), Portside owner
portal + PFM shuttle ladder (book/waitlist/cancel with dispatcher override), BART per-user
visibility, SD Pro's Requester/Planner/Approver roles, Leon's status ladder, myairops' own
Booking API (their "portal" is the API — the corporate internal booking tool is their cited use
case). Mechanics: Space-A category-then-FIFO clearing, airline standby's visible-rank/human-clear,
Eventbrite offer cascades, Resy/OpenTable scoped watches, Vaunt's computed-priority waitlist,
TravelPerk/Concur approval state machines, notification-fatigue tiering. Vault refs (Bryan's
vault): `ref-cfd-trip-request-portals`, `ref-nbaa-scheduler-workflow-guidance`.
