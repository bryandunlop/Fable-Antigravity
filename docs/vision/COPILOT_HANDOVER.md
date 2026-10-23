# myGFO handover for GitHub Copilot

- **From:** Bryan Dunlop, prepared with Claude (Anthropic), 23 Oct 2026.
- **Written against:** Revision 7 of the vision.
- **Precedence:** if this file and the reference disagree, the reference wins. If either disagrees with `CLAUDE.md`, `CLAUDE.md` wins.

## 0. What is in this package

Bryan carries these four files into work and puts them in one folder in a private work repository, for example `docs/gfo-vision/`. They link to each other by file name, so keep them together.

| File | What it is | Audience |
|---|---|---|
| `COPILOT_HANDOVER.md` | This file: your instructions. | You |
| `myGFO-plan-and-glidepath.html` | The story page. Five department circles, the glidepath from H0 to the end goal, data flows, alerts, six example screens, and why it matters. | Leadership |
| `myGFO-reference.html` | The working reference: principles, platform, horizons and gates, designs, the ideas register, decisions and appendices. Section numbers in this file refer to it. | The myGFO committee and the developer |
| `airflow-briefing-for-gfo.html` | Bryan's briefing on Jeppesen ForeFlight Airflow: what it is, an assessment, use cases and questions for ForeFlight. Marked GFO Internal. | GFO, and the ForeFlight meeting |

Open the HTML files in a browser, or read the HTML directly. Example data in them is illustrative.

## Your job

myGFO lives in three places, and Bryan needs them fitted together:

1. **The sandbox repository**, `bryandunlop/Fable-Antigravity` on GitHub. A mock-data prototype Bryan used to work through rules, edge cases and designs. The vision pages also live there, on branch `claude/gfo-vision-roadmap` until PR #40 merges.
2. **Bryan's work mockups.** Newer screens built with Copilot in the P&G design system. They are the hand-off to the developer.
3. **The production repositories.** The real platform, built by the developer from those hand-offs. A lot of it exists.

You can see production and the sandbox. Claude cannot see production. Compare them and produce the report in section 6, so Bryan can update the vision and the developer's backlog from facts instead of memory.

## 1. Rules for this task

1. **The sandbox repository is public.** Anyone on the internet can read it. Never write production source code, internal hostnames, tenant or client IDs, connection strings, credentials, personal data or other P&G-internal detail into it. That includes commits, pull request comments and issues. **Never copy the Airflow briefing into it.** Your report goes where Bryan tells you, inside P&G.
2. **Read and report. Do not fix.** Change no code in either place unless Bryan asks for a specific change.
3. **Make no external calls.** No CAMP calls of any kind, no myairops calls, no vendor APIs, no Airflow. This is a reading exercise.
4. **`CLAUDE.md` binds production.** It lives at the root of the sandbox. Its NEVER rules are the floor. A production code path that breaks one is a finding with a file path. Never work around it.
5. **Do not pick a winner.** Where the vision, the sandbox and production disagree, list the disagreement as a question for Bryan.
6. **Cite everything.** Every claim about code names a repository and a file path. Mark anything you inferred as unverified.
7. **Run the real tests where you can.** Where production has tests for a rule in section 4, run them and report the result. Where the sandbox has tests for logic you recommend porting, name them.

## 2. How the three places relate

| | Sandbox | Work mockups | Production |
|---|---|---|---|
| What it is | Mock-data prototype on Vite, React, Hono and Drizzle on Neon, deployed to Vercel | Copilot-built screens in the P&G design system | The platform the developer builds |
| Trust it for | Rules, edge cases and tests worked through in code | Bryan's newest UI intent | What exists and runs |
| Do not trust it for | Production state, real data or the real stack | Rules and data | Bryan's intent where it has not caught up |

`CLAUDE.md` specifies this production stack: Next.js static export, Capacitor on iPad with native SQLite, Entra ID with MSAL, Azure SQL ledger tables, Key Vault with managed identity, and App Service, Container Apps or Functions. Report what production actually uses. The developer may have chosen differently.

Two documents referenced in the sandbox are not in it. `PHASE1_BUILD_SPEC.md` is named in `CLAUDE.md` as the build spec. `PRODUCTION_ROADMAP.md` is named in `docs/tech-log/HANDOFF.md`. Look for both in the production repositories and say whether you found them.

Commit messages cite decision IDs such as D111, which live in Bryan's Obsidian vault, and ticket keys such as LG-400 and TL-48, which live in Bryan's tracker. Ask Bryan if you need one.

## 3. Where to look in the sandbox

| Path | What it holds |
|---|---|
| `CLAUDE.md` | The working agreement: NEVER and ALWAYS rules, invariants, the config and secrets contract, the CAMP error taxonomy, and Open Questions OQ1 to OQ6. |
| `docs/vision/` | The same story page and reference as this package, as `index.html` and `reference.html`. |
| `docs/DEVELOPER_HANDOFF_V2.md` | Module hand-off from 6 Jul 2026: Tech Log, Scheduling, Pilot Workspace, Inventory v2, and what blocked each. |
| `docs/tech-log/HANDOFF.md`, `docs/tech-log-api/` | Tech Log build notes, plus an API sketch in `README.md`, `routes.ts` and `schema.sql`. Compare the schema with production's. |
| `docs/CANONICAL_MAINTENANCE_SURFACE.md` | Which of three overlapping maintenance surfaces is the real one. |
| `src/components/tech-log/engine/` | The pure regulatory engine and its tests: `pl25.ts`, `deferralClock.ts`, `extension.ts`, `supersede.ts`, `signing.ts`, `rii.ts`, `serviceability.ts`, `repetitive.ts` and more. |
| `src/components/tech-log/integration/` | The simulated CAMP and myairops layer: `campTaxonomy.ts`, `campSession.ts`, `campClient.ts`, `pushMapping.ts`, `reconcile.ts`. |
| `src/integration/myairops/capability.ts` | The myairops write guard. It refuses every mutating call and ships with zero grants. |
| `src/scheduling/` | Checklist rules engine in `engine/`, a store interface with memory and Postgres adapters in `store/`, and ForeFlight Files push in `foreflight/`. |
| `src/availability/engine/` | Fleet availability. `crewCoverage.ts` says plainly it is not a duty-time calculation. |
| `docs/booking-portal/` | EA booking portal: `architecture.md`, `phase-plan.md` and `portal-design.md`. |
| `docs/vendor/myairops-*.md` | Captured myairops API capabilities and the asks sent to the vendor. |
| `src/components/documents/engine/` | Living documents: `amendments.ts` for bulletins that amend a manual, `suggestions.ts`, `acknowledgments.ts`, `review.ts`, `revisions.ts`. |
| `docs/documents/2026-07-30-group-drives-document-control-design.md` | Draft design for SharePoint group drives under controlled and uncontrolled registers. |
| `src/airport/` | Company airport pages: `company/` holds proposals, approval routing, per-field confirmations and the worklist. `nasr/` holds FAA data parsing. |
| `src/notifications/`, `docs/notifications/` | The derived notification feed, which clears itself when the condition clears. |
| `src/components/booking-portal/engine/costModel.ts` | Trip cost model, including the 14 CFR 91.501(b)(5) ceiling. |
| `backend_designs/` | `TaxAnalystWorkflow.md` covers the SIFL analyst workflow and is UTF-16 encoded, so convert it before reading. `PilotCurrencyApiSpec.md` covers pilot currency. |
| `src/navigation/navConfig.ts` | Every route in the prototype and which roles see it. The quickest map of its surface. |

## 4. The hard rules, in short

`CLAUDE.md` is the source. In short, production must never:

- Issue UPDATE or DELETE against an append-only ledger table. Corrections are superseding inserts.
- Use production CAMP credentials in development or test. Promotion to production CAMP is a reviewed, human-gated step.
- Write anything to myairops. The write path stays closed until OQ5 is deliberately resolved.
- Keep secrets in code, config or commits. They live in Key Vault, reached by managed identity.
- Log raw request bodies, full signed payloads, the CAMP security key, webhook secrets or personal data.
- Commit a release to service when the signer has no A&P certificate number on file.
- Allow a deferral against an MEL item in `DRAFT` or `PENDING_FSDO`.
- Let the same person be both performer and RII inspector.
- Hash signed bytes produced by `JSON.stringify`. Use RFC 8785 canonicalization on client and server.
- Invent a CAMP operation name. The utilization push is undocumented (OQ1).

And production must always:

- Deduplicate ingestion on a client-generated UUIDv7 idempotency key, returning the stored outcome on retry.
- Re-stamp UTC and recompute the content hash on the server at commit.
- Persist a signed record to durable storage on the iPad the moment it is signed.
- Convert units at the boundary: CAMP counts minutes and myGFO counts hours.
- Match tail and serial numbers to CAMP exactly, including hyphens and case.
- Run the MEL clock per PL-25: the day of discovery is excluded, category B is 3 days, C is 10, D is 120, B and C may be extended once, and A and D never.
- Record the governing MMEL revision and effective date on a deferral at signing.
- Test any immutability, idempotency, hashing or MEL-clock logic.

## 5. Decisions so far

From reference section 14.

- Bryan designs and mocks up. A developer builds production.
- myairops stays the scheduling system of record and stays read only. GFO has its OData and REST APIs. Writing back is not decided (OQ5).
- CAMP stays the airworthiness system. myGFO is the record only at the moment of its own signature.
- ForeFlight Dispatch is in use. Jeppesen ForeFlight Airflow is not started and needs demos, use cases and a VP decision. The Airflow briefing in this package prepares the ForeFlight meeting.
- Aircraft trends start from what the Tech Log already records, such as repeat defects. Gulfstream Performance Analytics data is a hope, not a plan: whether Gulfstream will share it is not known.
- Crew should live in two apps, myGFO and ForeFlight.
- Passengers hear from GFO by email first, and get an app only if they ask.
- Crew legality stays in the app that checks it today. Training records stay in myairops. Flight data monitoring stays in FlightPulse. Boarding is confirmed in the myairops app.
- Live flight times come from FlightAware. Tails are unblocked as needed with Security's agreement, and satcom is the fallback.
- Company airport pages follow the Jeppesen 10-7 model, stay independent of Document Center, and do not exist in production yet.
- The FAA supplies only the US airport database and NAS status. NOTAMs and international data come from Jeppesen ForeFlight and Airflow.
- Document Center becomes the document-control system, on the level of Comply365: submit a revision, compare old and new, approve inside myGFO, read and sign.
- The vision is drawn as five department circles (pilots, flight attendants, EAs, scheduling, maintenance) tied together where they overlap, with safety, documents and leadership as a band around them.
- The roadmap shows sequence and gates only, no dates. The end point is five landing tests, listed at the end of the story page.
- Adopted for the roadmap: two escalation ladders, where urgent goes to on-call and overdue goes to the manager; delegates; joiner, mover and leaver checklists owned by the manager; an expiry engine; management of change in the lead team's view; flight times to drivers and the protection team; Outlook calendars; a daily ops brief; passenger feedback; a fatigue advisory in trip planning; a regulatory change watch; and the knowledge loop extended beyond airports.
- Needing more thought: disruption options with Airflow, and an agent gateway of MCP servers with parts blocked.
- To discuss: a separate emergency response app reachable without VPN, and actual trip costs from invoices, which goes to scheduling, the VP and the CPSO.
- The six leadership asks are in reference section 14.

## 6. What to produce

Produce one Markdown report with the headings A to H below, using the tables as given. Keep it inside P&G.

### A. Production inventory

| Area | Status | Where in production | How it differs from the sandbox or the vision | Confidence |
|---|---|---|---|---|

Status is one of: Live, In build, Not started, Different approach. Confidence is High, Medium or Low.

Rows, from reference section 2: Document Center, Tech Log, Scheduling checklists, EA booking and messages, Passenger records, Flight Hub, Airport company pages, ForeFlight Files, Notifications, Manager views and wall screens, SIFL and tax, FlightAware, Workday, Outlook, Airflow and AI agents.

Then the eight platform pieces from reference section 3, as their own rows: identity and people with the manager chain and delegates, the trip graph, events and notifications, the expiry engine, the integration hub, signature and audit, the insight data layer, and the agent gateway. For each piece, also say whether production builds it once and shares it, or repeats it per module.

### B. Rule compliance

| Rule | Where production enforces it | Test that proves it | Test result | Gap |
|---|---|---|---|---|

One row per item in section 4. An empty "where" or "test" cell is a finding. Fill "test result" only where you could run the test.

### C. Port candidates

| Sandbox path | What it does | Its tests | Production equivalent | Recommendation |
|---|---|---|---|---|

Recommendation is one of: Port logic and tests, Already covered, Not needed. Port the logic and its tests only. The sandbox's wiring, meaning Vite, Hono, Neon, localStorage and the mock stores, does not carry over. Start with:

- `src/components/tech-log/engine/pl25.ts`, `deferralClock.ts`, `extension.ts`: the MEL clock and extensions.
- `supersede.ts`: superseding corrections, and rejecting a second correction of an already-superseded record.
- `signing.ts`, `rii.ts`: signing gates, the A&P certificate check and RII separation.
- `serviceability.ts`: deriving serviceability from the ledger.
- `repetitive.ts`: repeat defects, meaning the same ATA chapter on the same tail three times in 30 days. This is the start of the aircraft-trends loop.
- `src/components/tech-log/integration/campTaxonomy.ts`, `campSession.ts`: CAMP error handling and session discipline.
- `src/integration/myairops/capability.ts`: the zero-grant write guard.
- `src/scheduling/engine/`: checklist due rules, conditions and escalation.
- `src/components/documents/engine/amendments.ts`, `suggestions.ts`, `acknowledgments.ts`, `revisions.ts`: living documents and revision control.
- `src/airport/company/`: airport page proposals, approval routing and per-field confirmations.
- `src/notifications/`: derived, self-clearing notifications.

### D. Horizon check

For each item in reference section 4, mark Done, In build, Ready or Blocked. Ready means its gates are clear. For Blocked, name the blocker. The gates to check are OQ1 for the CAMP utilization push, OQ2 for the myairops OData mapping, OQ5 for myairops write-back, OQ6 for passenger data residency, and the DOM rulings on the check-flight gate under 14 CFR 91.407(b), supersede authority and the RII ATA list.

### E. Integration reality

| System | What production uses | Auth method | Reads or writes | Matches the vision? |
|---|---|---|---|---|

Rows: myairops OData, REST and webhooks; CAMP SOAP; ForeFlight Files; ForeFlight Documents; the ForeFlight Dispatch API in both directions, including whether myairops already pushes flights to Dispatch; Airflow; Gulfstream Performance Analytics (expected: nothing, it is a hope); FlightAware; Microsoft Graph for Outlook, Teams and SharePoint; Workday; satcom; FAA NASR; Jeppesen.

### F. Ideas register

Reference section 13 lists 50 ideas. For each of the 21 marked "Not discussed", write one line: does production already have it, and where?

### G. Airflow readiness

Read `airflow-briefing-for-gfo.html`. It proposes Airflow as an adviser alongside myGFO, never a replacement. Then answer from production:

| Item from the briefing | Does production have it? | Where | Notes |
|---|---|---|---|

Rows:

- The data myGFO might share with Airflow: trips, aircraft availability, airport notes, MEL limits, the Lunken fuel price.
- The briefing's ground rules: Airflow never changes aircraft status, defects or signatures; Airflow content shown at signing is saved with the signature; safety management stays in myGFO; passenger names and destinations are not shared without P&G approval. For each, where would production enforce it?
- The GFO rules the briefing says have no home yet: crew duty and rest, crew currency and training, ops-manual operating limits, and P&G travel policy.
- The inputs for the lead use case, the pilot trip watch: trip schedule, aircraft type, open MEL items and airport notes, each by trip.
- An MCP server or any agent interface in production, and what it exposes.

Do not contact ForeFlight or call Airflow. The briefing's questions for ForeFlight are Bryan's to ask.

### H. Questions for Bryan

- Every disagreement between production and the vision.
- Everything production has that the vision does not mention, so the vision can absorb it.
- Any open question in reference section 14 or in `CLAUDE.md` that production already settles.

## 7. The Airflow briefing, in short

`airflow-briefing-for-gfo.html`, prepared 20 Oct 2026, nothing decided.

- **What it is.** An AI layer on ForeFlight's own aviation data. The AI routes the question to ForeFlight's certified calculators and explains the result. It does not do the maths itself.
- **What exists.** Two business aviation agents released in October 2026, Trip Feasibility and Ops Briefing, in limited beta with no published price.
- **Assessment.** Well designed but early. Worth a trial on a case with a known answer, not a purchase.
- **Control.** Four levels, from trusted advisor to autonomous. GFO would start at level 1 (AI suggests, a person decides) or level 2 (AI prepares, a person approves). The pilot in command stays responsible (14 CFR 91.3).
- **Lead use case.** A pilot trip watch three days out, the day before and the day of a trip. The main driver is a G500 leaving Lunken on a hot day with heavy fuel.
- **Other ideas.** First-line trip questions from EAs answered inside myGFO, with myGFO keeping the screen and the GFO rules; crew balancing suggestions approved by a scheduler; tanker-or-buy fuel advice; a weekly ops digest.
- **Two-way sharing.** Through MCP, if ForeFlight supports it. That is unconfirmed.
- **Questions for ForeFlight.** Cost, data privacy and training use, G500, G650ER and G800 coverage, MEL-aware feasibility, beta access, and more. They are in section 11 of the briefing.

## 8. The reference page's sections

Each section of `myGFO-reference.html` has an anchor.

| No. | Anchor | Section |
|---|---|---|
| 1 | `#principles` | Why myGFO exists, and the twelve principles |
| 2 | `#today` | Where we are, and what stays in other apps |
| 3 | `#platform` | The eight shared platform pieces and the dependency matrix |
| 4 | `#horizons` | Horizons H0 to H4 and their gates |
| 5 | `#scope` | Where the project ends |
| 6 | `#risks` | Risks |
| 7 | `#airports` | Airport knowledge loop |
| 8 | `#disruption` | Disruption options |
| 9 | `#agents` | Agent gateway |
| 10 | `#tax` | SIFL, SEC and related tax items |
| 11 | `#erp` | Emergency response app |
| 12 | `#airflow` | Airflow evaluation |
| 13 | `#ideas` | Ideas register, 50 ideas with status |
| 14 | `#questions` | Leadership asks, open questions and the decisions log |
| 15 | `#sources` | Sources |
| 16 | `#trip` | Appendix: one trip, end to end, by role |
| 17 | `#lanes` | Appendix: the roadmap by area |
| 18 | `#doccontrol` | Appendix: the document-control end state, mapped to sandbox engines |
| 19 | `#loops` | Appendix: data loops with myairops, ForeFlight, our aircraft data and Gulfstream |
| 20 | `#owners` | Appendix: the department circles and proposed owners |

## 9. Glossary

| Term | Meaning |
|---|---|
| A&P | The FAA airframe and powerplant mechanic certificate. |
| AOG | Aircraft on ground: grounded and unavailable. |
| Airflow | Jeppesen ForeFlight's AI agent platform. Its Trip Feasibility and Ops Briefing agents for business aviation sit in ForeFlight Dispatch. |
| APIS | The CBP electronic passenger manifest for international flights. |
| ATA chapter | The standard numbering of aircraft systems. |
| CAMP | The continuing-airworthiness tracking system of record. |
| CRS | Certificate of release to service: the maintenance release. |
| D195 | The FAA letter of authorization that lets a Part 91 operator use an MEL. |
| DASSP | The security program for flights into Washington Reagan National. |
| DOM | Director of Maintenance. |
| EA | An executive assistant who requests trips for executives. |
| FBO | Fixed-base operator: the ground facility a business jet uses. |
| FlightPulse | The flight data monitoring app GFO already uses. |
| Foresight | FlightAware's prediction service, including taxi-out estimates. |
| FRAT, GRAT | Flight and ground risk assessment tools. |
| GFO | P&G Global Flight Operations. |
| H0 to H4 | The five fixes on the glidepath. H0 is now: Document Center and the Tech Log. |
| LADD | The FAA program that limits public display of an aircraft's flight data. |
| MCP | Model Context Protocol, the standard way an AI agent calls outside tools. |
| MEL, MMEL | Minimum equipment list, and the manufacturer's master list it derives from. |
| myairops | The flight-ops scheduling system of record. Read only for myGFO. |
| NASR | FAA airport and airspace data, published on a 28-day cycle. |
| OOOI | Out, off, on and in times for a flight. |
| OQ1 to OQ6 | The Open Questions in `CLAUDE.md`. |
| PL-25 | The FAA MMEL policy letter the project follows for repair-interval clock math. |
| PPR | Prior permission required at an airport. |
| RII | Required inspection item: a task needing an inspector who did not perform it. |
| SIFL | Standard Industry Fare Level: the IRS method for valuing personal flights on company aircraft. |
| 10-7, 10-9 | Jeppesen page numbers. 10-7 pages are operator-specific. 10-9 is the airport chart. |

## 10. Caveats about the sandbox

- Everything in it runs on mock data. Nothing in it is an airworthiness record.
- `docs/DEVELOPER_HANDOFF_V2.md` dates from July 2026, and the last code commit was on 3 Sep 2026. Treat status claims in older docs as possibly stale.
- `typecheck-baseline.json` lists known TypeScript errors, mostly in vendored UI components, so new ones stand out.
- `docs/worklog.md` is Bryan's personal effort tracker, not part of the product.
- The prototype has several overlapping maintenance screens. `docs/CANONICAL_MAINTENANCE_SURFACE.md` says which is canonical.

## 11. A first prompt to paste

Replace the folder path if Bryan put the package somewhere else.

```
You can read the myGFO production repositories and Bryan's public sandbox repository, bryandunlop/Fable-Antigravity.
Read docs/gfo-vision/COPILOT_HANDOVER.md, then CLAUDE.md at the root of the sandbox (branch claude/gfo-vision-roadmap).
The other files in docs/gfo-vision/ are the story page, the reference and the Airflow briefing it describes.
Follow the rules in section 1 of the handover. Do Task A, the production inventory, and stop so I can check it before you continue with Tasks B to H.
Write nothing into the sandbox repository.
```
