# myGFO — Manifesto

- **Status:** Draft 1 for discussion — 2026-10-22
- **Author:** Bryan Dunlop (vision) + Claude (structure)
- **Companion:** [`ROADMAP.md`](./ROADMAP.md) — the sequencing, gates and current scope line. This file is the *why*; it should change rarely. The roadmap is the *when*; it should change often.

---

## The one sentence

**myGFO is the nervous system of Global Flight Operations: every fact is entered once, flows to everyone who needs it, reaches them at the moment they need it, and stays silent for everyone else.**

## The problem we are solving

A corporate flight department is a dozen specialist teams — pilots, flight attendants, maintenance, scheduling, EAs, safety, document control, leadership — passing one thing between them: **the trip**, and the airplane that flies it.

Today that hand-off runs on retyping, email, phone calls, and memory. The same passenger is entered three times. A schedule change is noticed by whoever happens to look. A revised manual is "published" and nobody can say who has read it. A broken airplane is a phone call, then a text, then a log entry that may or may not match. The work gets done because good people carry it in their heads — and that does not scale to a growing fleet, and it does not survive turnover.

## What we believe

### 1. Enter once, flow everywhere
A fact has one home. A passenger's allergy entered by an EA is the same allergy the flight attendant reads, the caterer receives, and the trip sheet prints. If a person has to retype it, the system has failed.

### 2. Tell people what they need, when they need it — and nothing else
"People know when something happens, but only if they need to." Notifications are **derived from the state of the world**, not fired by whoever remembered to send one. When the condition clears, the alert clears itself. Every message has an audience and a moment; a message with neither is noise, and noise is how real alerts get missed.

### 3. Silence is never consent
If a document needs a signature, a status needs updating, or a checklist item needs closing, the system notices when it hasn't happened. It asks the person. Then it asks again. Then it tells their manager. Accountability is a ladder the system climbs, not a chase a manager runs.

### 4. Documents are alive
A manual lives in the present. Important changes go out immediately as bulletins that point at the section they amend. At the next revision the manual absorbs them and the bulletins retire. Readers can suggest changes straight to the owner. Nobody ever wonders which version is current, and nobody spends a month on a manual revision.

### 5. Every hand-off is a conversation with a record
The Tech Log is the model: a pilot and a mechanic talk about a broken airplane, and the conversation *is* the record — signed, timestamped, immutable. The same pattern carries to scheduling and EAs, scheduling and crew, crew and maintenance.

### 6. Systems of record stay where they belong
CAMP owns continuing airworthiness. myairops owns the flight-ops schedule. Workday owns people and HR. ForeFlight owns flight planning, performance and the cockpit. myGFO does not compete with them — it **connects** them, and it is the record of authority only at the moment of a myGFO electronic signature. We pull before we push, and we never write to another system without a gate.

### 7. Safety rules are code, not good intentions
An MEL clock, an A&P certificate check, an RII inspector who is not the performer — these are enforced by the software and tested, not left to training. The rules in `CLAUDE.md` are the floor every module stands on.

### 8. Machines prepare, humans decide
Automation and AI gather, check, draft and warn. A pilot decides whether the airplane can take off from that runway on that day. A scheduler decides whether the trip is feasible. An agent can answer "can we?" with evidence; it never answers "we will" on its own authority.

### 9. Privacy and security are default-deny
The people we fly are high-profile. Who is on a trip, where they are, and what they need is shared with the smallest audience that needs it, for the shortest time. A feature that broadcasts a principal's position needs a security sign-off, not just a good UX.

### 10. Every screen answers one question at a glance
The hangar wall, the scheduling wall, the lead's dashboard, the EA's home — each one exists to answer the question that room asks most often, without a click.

## The golden thread — one trip, end to end

This is the vision as a story. Each step names the capability it depends on, so the roadmap can be read against it.

1. **An EA asks.** "Can we take four people to Lunken Tuesday and back Thursday, and what will it cost?" An assistant answers from live fleet availability, trip feasibility and the cost model. *(EA space, availability engine, cost model, AI assistant, Airflow Trip Feasibility)*
2. **The request becomes a booking.** One click turns the answer into a scheduling request. Scheduling approves and assigns a tail and crew. *(EA ↔ scheduling space, booking engine)*
3. **The EA manages passengers.** The system checks each name against the passenger record: is it current, is the passport valid, have they had a pre-flight briefing and how long ago. Gaps become tasks for the right person. *(Passenger records, document currency, accountability engine)*
4. **The trip's checklist runs itself.** International permits, catering, FBO, hotels — each item has a due rule. When the trip changes, the affected items re-fire automatically and only the people who own them hear about it. *(Scheduling checklists, change re-fire, notification engine)*
5. **Crew see their part.** Items the crew care about appear checked off in the Flight Hub. Pilots plan with the airport's company page and ask the questions that matter: can the G500 depart that runway on a hot day with this fuel? *(Flight Hub, company pages, Airflow Ops Briefing, ForeFlight performance)*
6. **The night before, everyone gets their brief.** Crew get the ops brief. Passengers get the be-there time and the day as a timeline. *(Briefing engine, passenger email)*
7. **In the cockpit, it is already there.** The trip sheet, passenger documents and company pages are in ForeFlight. The current manuals are already synced. *(ForeFlight Files + Documents sync)*
8. **The airplane is broken? The Tech Log handles it.** Pilot squawks, maintenance defers or fixes, the release is signed, scheduling sees serviceability change, and the trip knows. *(Tech Log, CAMP sync)*
9. **Block out, and the passengers know.** "Estimated taxi time 12 minutes. Airborne 12:14, 1:36 en route. Estimated door open 14:02." *(FlightAware Foresight, notification engine)*
10. **After landing, the record closes itself.** Hours flow to CAMP, the journey log is signed, SIFL is computed from the manifest and purpose, and the trip's metrics feed the manager's view. *(Journey log, CAMP utilization, tax engine, analytics)*

When this thread runs end to end on a real trip, with no retyping and no phone call that exists only because a system did not tell someone, the vision is realized.

## What myGFO is not

- **Not a maintenance tracking system.** CAMP is.
- **Not a scheduling system of record** — unless and until we decide otherwise, deliberately (see Roadmap open questions).
- **Not a flight planner or a performance calculator.** ForeFlight and the AFM are. myGFO hands them the right inputs and surfaces their answers.
- **Not an HR system.** Workday is.
- **Not a surveillance tool.** Accountability is about the work, not about watching people.
