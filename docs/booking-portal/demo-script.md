# Booking portal — demo script

A run sheet for showing the portal cold. The whole thing is fixtures: no myairops call exists
behind any screen, nothing persists, and **Reset portal data** (top right) puts every fixture back
the way it started — safe to press mid-demo if a path goes sideways.

## Before you start

1. Open the preview, or `npm run dev` and go to `/booking-portal`.
2. Demo password: `mygfo`. Sign in as **Scheduling** (that role sees both sides).
3. Sidebar → Scheduling → **Booking Portal**.
4. Press **Reset portal data** once so the fixtures are in their opening state.

The **persona toggle** in the header is the demo's main control: *Dana Whitfield · EA* is the
assistant arranging travel, *R. Calloway · Scheduling* is the person deciding. Switching it is how
you show both sides of the same event.

## The 6-minute run

### 1. Home — what an EA is allowed to see (30s)
Start on **Home**, as Dana. The week shows only flights that pass the confidentiality projection
for her principals: **gold** cards are trips her principals are on, **blue** cards are other
eligible flights reduced to route, times, aircraft and open seats — no passenger names, no trip
owner.

> The line to say: flights outside her eligibility don't render at all. There is no locked row and
> nothing redacted, because on a roster this small even initials would out an executive's travel.

Point at the as-of stamp: availability is advisory, never inventory.

### 2. Raise a request (90s)
**New trip request**. Build one leg, then:
- Tick two passengers and use **Set lead** — the manifest is per leg, not per trip, because people
  join and leave mid-trip.
- Change one passenger's purpose to **Personal** → the SIFL note appears inline.

> Purpose is captured per passenger per leg at request time, not reconstructed after the flight.
> That is a tax and SEC-disclosure requirement, and it is the thing every scheduling tool gets
> wrong by leaving it to the post-flight log.

Note the live planning estimate, then **Submit request**.

### 3. Scheduling decides (90s)
Flip the persona to **R. Calloway · Scheduling**, open **Queue**.

The queue is banded by urgency, and the top band is the argument for it: a **Tier 3** request
departing this week sits at **rank 1**, above a **Tier 1** that doesn't fly for a fortnight.

> Ranking policy is unchanged — organisational tier, then request time. Banding doesn't reorder
> anything inside a band; it stops a flat list from burying Friday's flight. NBAA expects a written
> bumping policy, and this is where it lives.

Click a request → the **drawer** opens over the queue. Approve or decline **in place**; a decline
demands a reason. Close it and you're exactly where you were in the ranked list.

Approve one → it drops to **Approved — awaiting placement** → **Place on schedule** → Confirmed.

> Approved and Confirmed are deliberately different states. Approved is a decision; Confirmed means
> it is on the schedule. Collapsing them is how you get trips that were "approved" and never flown.

### 4. The itinerary (45s)
Persona back to **Dana**, open **Trips**. The confirmed trip is now a real itinerary — legs, times,
tail, **FBO at both ends**, who is on which leg, and a plain statement of when the manifest locks
(24 h domestic, 72 h international, because the longer window protects the APIS filing).

> This is the newest part and the one most worth arguing with — the design note flags itinerary
> detail as the largest open question in v1.

### 5. Empty seats (60s)
**Empty seats** → **Ask for a seat** on the **KTEB → KPBI** flight (two days out, so its manifest is
still open — the first flight in the list departs tomorrow and shows as already locked, which is
worth a second visit but muddles the first pass). Choose **S. Reyes** and purpose **Personal**:
- the SIFL tax note fires,
- and because S. Reyes has never flown with GFO, the travel form auto-sends on approval.

Submit, flip to Scheduling → the ask is in the queue's **Seat asks** band. Confirm it, flip back,
and it appears in **Trips** as a seat itinerary showing **only the claimant** — the host trip's
manifest isn't theirs to see.

> A seat ask never bumps a trip request. And an offer is never a promise: every seat rides someone
> else's trip and stays conditional until departure.

**If you want the international beat:** claim the **KCVG → EGGW** seat instead. Its itinerary shows
the 72-hour lockout rather than 24 — the longer window exists to protect the APIS filing, since a
passenger change after filing means a refile.

### 6. Watches (45s)
**Watches** → press **Simulate: frees up** on the fleet hold. That button stands in for the mirror
noticing a cancellation. The watch goes to **Freed** and offers a one-click **pre-filled request**.

> A watch holds nothing, and it expires with its window — no zombie alerts. The same
> register/notify/claim mechanism serves both the seat waitlist and fleet-date holds, because they
> differ only in what frees up.

Finish on **Inbox**: action-needed on top (these are the only things that send instant email),
everything else batched into a daily digest.

## If someone asks

- **"Is this connected to myairops?"** No. Every screen runs on fixtures. The integration is
  gated behind stages 5–6 of the phase plan, and the write guard ships with zero grants.
- **"Where does passenger data live?"** Read through from CRM at view time, never mirrored. The
  flag/block verdicts and form states are myGFO workflow state keyed by external reference.
- **"Can it confirm a seat?"** Not against the vendor yet — that needs the concurrency answer
  (ASK 4). Until then "requested — pending confirmation" is a first-class state by design.
- **"Why can't the EA see everything?"** One projection serves both the calendar and the offer
  filter. Two filters would drift, and the one that drifts silently is the one that leaks a trip.

## Known stubs

Add to calendar / Send itinerary are buttons that do nothing. Queue reordering (a logged override)
is designed but not wired. There is no exec mobile view — v1 is EA-first desktop on purpose.

## Open questions worth raising in the room

The design note lists ten; these three benefit most from an audience:
1. **Host consent** — does the principal whose trip it is get a veto on who joins?
2. **The tier list** — the actual priority categories behind the queue ranking are scheduling's to
   define.
3. **Itinerary detail** — what else belongs on the trip page (ground transport, catering, crew,
   weather, documents)?
