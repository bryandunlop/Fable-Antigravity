
  # Aviation Management System

  This is a code bundle for Aviation Management System. The original project is available at https://www.figma.com/design/8Z1EKcsk4yH2Ahk9L0uk97/Aviation-Management-System.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Security Features

  ### Anonymous Hazard Reporting
  The system includes a fully anonymous hazard reporting feature that ensures reporter privacy:
  - When submitting a hazard report anonymously, the reporter's name is **never stored** in the database
  - The system stores "Anonymous" instead of any user identification
  - Safety Managers can review and de-identify reports before publishing
  - Demonstrates best practices for privacy-sensitive reporting systems

  ### Development Logging
  The application uses environment-aware logging for security:
  - Sensitive data logging is **disabled in production** builds
  - Development logging is available when running `npm run dev`
  - All development logs are prefixed with `[DEV]` for easy identification
  - Protects user data from exposure via browser console in production

  ## Demo Features
  This application is designed as a demonstration of aviation management workflows including:
  - Flight operations and scheduling
  - Safety reporting (ASAP and hazard reporting)
  - Maintenance tracking
  - Document management
  - Crew management

  ## What's new since v1
  This repo (v2) diverged from the original Aviation-Management-System build and has since grown several modules and a full design-system pass that weren't in v1.

  ### Tech Log (eTechLog / maintenance ledger)
  - Four-eyes approval workflow for reference-data edits (Personnel, MEL, Fleet) with a shared pending-approvals queue
  - Supersede-chain fork detection — forked corrections are rejected and routed to reconciliation instead of silently creating duplicate "current" records
  - Watch-list defect disposition (WATCHLISTED) with its own sign ceremony, work-queue bucket, and CAMP `DEFERRED-WATCHLIST` mapping
  - Simulated CAMP integration surface: error-taxonomy session handling, sandbox→production promotion guard, discrepancy read-back/reconciliation, supersede→`IntegrateDiscrepancies` mapping, and a block on the undocumented utilization push
  - Simulated myairops webhook receiver (CloudEvents + HMAC)
  - AOG tracked escalation with CAMP cross-check
  - Out-of-service → run-cards → return-to-service workflow, with per-step RII dual sign-off at scale
  - Closed work-order history, serial-keyed WO catalog, and MTBUR removals roll-up by ATA
  - Rectify action opens a corrective work card with steps pullable from CAMP
  - Maintenance nav consolidated onto one canonical Tech Log surface

  ### Scheduling (new module)
  - Rules engine built test-first: due-date computation, condition evaluation, time-trigger/ack escalation, audited task transitions, trip-readiness derivation
  - Data layer with an in-memory store plus a Drizzle/Postgres adapter behind a shared `SchedulingService`
  - Command Center scheduling hub — tail × time Plan Board (Gantt), Run Board, task inbox, trips panel, and a no-code checklist template editor with versioned publish
  - International/country-conditional checklists and DASSP T-minus countdowns
  - Preflight weave: bridges scheduling trips to Tech Log preflight status, release-to-preflight, and deep links
  - Maintenance handoff loop-closer — surfaces downstream Tech Log/maintenance status back on the scheduling trip
  - ForeFlight document push (myairops pull → match flight → push files)
  - Deterministic seeded demo data (month-scale volume generator) for repeatable demos

  ### Pilot workspace (new)
  - Flight Hub with a composite readiness bar, my-flights list, and per-leg panels
  - Trip brief panel with acknowledgment over a shared event bus
  - Aircraft & acceptance panel (serviceability, custody, MEL status) with deep-link accept
  - Shared FRAT preflight panel with save-draft/resume
  - Messages panel and squawk/nuisance-item entry points

  ### Navigation & GFO design system
  - Manifest-driven navigation: 9 workspace-first domains, sidebar with "More" expanders and persisted collapse, breadcrumbs, unified command palette, and a real 404 page
  - Role-based front doors at login; mobile "More" sheet and bottom nav
  - GFO brand chrome (Midnight/Daylight/Sunrise) applied across login, sidebar, dashboard, and mobile nav
  - Demo password gate in front of the role picker at `/login` (unlocks once per browser, so logging out to switch roles doesn't re-prompt)

  ### Inventory v2
  - Post-trip restock redesigned with usage and full-count modes
  