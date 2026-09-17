# CLAUDE.md — myGFO eTechLog Project Working Agreement

This file governs how Claude Code works in this repository. Read it at the start of every session. `PHASE1_BUILD_SPEC.md` defines *what* to build; this file defines *how* to build it safely and the hard rules that must never be violated.

---

## What this project is
The eTechLog / AOG / maintenance job-card module of **myGFO** — an Azure PWA (+ Capacitor iPad wrapper, Entra ID, Azure SQL) for P&G Global Flight Operations (Part 91, Gulfstream G650ER/G500, G800s incoming). myGFO is the **authoritative record at the moment of electronic signature**; CAMP is the continuing-airworthiness system of record; myairops is a pull-only flight-ops source. We are building **Phase 1** now (offline journey log + defects + D195 MEL deferrals + e-signature + maintenance release). CAMP/myairops integration is Phase 2.

---

## NEVER (hard stops)
- **NEVER** issue UPDATE or DELETE against an append-only ledger table. Corrections are **superseding inserts** only. If a task seems to require editing a signed record, stop and surface it — do not work around immutability.
- **NEVER** push, write, or POST anything to CAMP using **production** credentials during development or testing. **All CAMP calls use the sandbox** (see Sandbox rule). Production CAMP writes a real squawk into a real aircraft's airworthiness record.
- **NEVER** write anything back to **myairops**. It is pull-only. There is no write path. (The vendor APIs *do* publish one — 100 of 176 captured operations mutate vendor state — and the planned booking portal will need it. That conflict is Open Question 5, not a licence to write: `src/integration/myairops/capability.ts` refuses every mutating call and ships with zero grants.)
- **NEVER** put secrets (CAMP API user/pass, webhook secrets, OData token, connection strings) in code, config files, or commits. They live in **Azure Key Vault**, accessed via **managed identity**.
- **NEVER** log raw request bodies, full signed payloads, the CAMP security key, webhook secrets, or PII. Log identifiers + outcomes only.
- **NEVER** allow a Certificate of Release to Service (CRS) sign-off to commit if the signer has no **A&P certificate number** on file (14 CFR 91.417 requirement).
- **NEVER** allow a deferral against an MEL item whose `approval_state` is `DRAFT` or `PENDING_FSDO` (the G800 provisional case). Return 409/422.
- **NEVER** allow the same person to be both the performer and the RII inspector on an RII-required sign-off.
- **NEVER** use `JSON.stringify` (even with sorted keys) to produce the bytes that get hashed for a signature. Use the **RFC 8785 (JCS)** `canonicalize` library on both client and server.
- **NEVER** invent a CAMP function name. If a needed CAMP operation is not in the GEN/STA/WRK docs (notably the utilization push), stop and flag it as an Open Question — do not guess an endpoint.

## ALWAYS
- **ALWAYS** read `PHASE1_BUILD_SPEC.md` and this file before starting work; if they conflict, this file's NEVER rules win and you should flag the conflict.
- **ALWAYS** treat the e-signature service as a shared component used by both pilot and maintenance signing. Build it once; configure behavior per signing type.
- **ALWAYS** make ingestion idempotent: dedupe on the client-supplied **idempotency key** (UUIDv7) and store the outcome so a retried request returns the identical response (no duplicate rows on lost ACKs).
- **ALWAYS** re-stamp server-authoritative UTC timestamps and **recompute the content hash server-side** at commit. Client timestamps are advisory.
- **ALWAYS** persist a signed record to durable storage (native SQLite on iPad) the instant it is signed, before attempting sync.
- **ALWAYS** convert units at the system boundary (see Invariants) and validate exact tail/serial format at data entry.
- **ALWAYS** write a test for any immutability, idempotency, hashing, or MEL-clock logic you touch.

---

## Sandbox rule (CAMP)
A CAMP **sandbox tenant exists** and is the only environment for development and testing. Concretely:
- CAMP endpoint base URLs and credentials are environment-scoped config (`CAMP__BaseUrl*`, `CAMP__*` secrets — see Config). Dev/test resolve to **sandbox**; production credentials are never present in dev/test environments.
- Any code path that calls `IntegrateDiscrepancies` or a (future, TBC) utilization push must be gated so it **cannot** run against production outside an explicit, reviewed production promotion.
- A promotion to production CAMP is a deliberate, human-gated step — never a default, never automatic.

---

## Invariants (enforce in code, at the boundary)
- **Hours are MINUTES in CAMP, hours in myGFO.** Store canonical units in myGFO as documented in the spec's data dictionary; multiply x60 when sending to CAMP, divide /60 when reading. Never let a raw CAMP minute value flow into a myGFO "hours" field or vice versa.
- **CAMP utilization is increase-only.** Totals sent to CAMP can only increase; a lower value is rejected by CAMP. Guard for this before any push (Phase 2).
- **CAMP due-list projection is capped at 3 months**, and the projection filter should use calendar units (DAYS or MOS); CAMP auto-projects other units from calendar input. (Phase 2.)
- **Exact tail/serial match.** `Aircraft.tail_number` and `Aircraft.serial_number` must match CAMP exactly, including hyphens and capitalization. This is the documented #1 CAMP integration failure mode. Validate format at entry in Phase 1.
- **Append-only = immutable.** Signed regulatory records (FlightLog, Defect, Deferral, MaintenanceRelease, Signature, AuditTrail) are append-only ledger tables. Reference data (AircraftType, Aircraft, MelItem, Personnel) is updatable ledger (versioned history preserved).
- **MEL clock math is PL-25.** Day of discovery excluded; clock starts midnight after. Cat B = 3 calendar-days, Cat C = 10, Cat D = 120; Cat A per proviso. B/C extendable once with justification; A/D never.
- **Point-in-time MEL.** Capture `governing_mmel_revision` + `governing_effective_date` on the deferral at signing; a deferral signed under revision N must read correctly after revision N+1 ships.

---

## Config & secrets contract
Environment-scoped. Secret **values** live only in Key Vault; the names below are the contract. Use Key Vault references in app settings or `DefaultAzureCredential` + `SecretClient` in code. The API's managed identity holds **Key Vault Secrets User**; the SQL server's managed identity holds **Storage Blob Data Contributor** on the digest account.

**Key Vault secret names (no values here):**
- `Camp--ApiUsername`, `Camp--ApiPassword` (Phase 2; **sandbox** values in dev/test)
- `Myairops--WebhookSecret` (Phase 2)
- `Myairops--ODataToken` (Phase 2; TBC auth method)
- `Sql--ConnectionString` (prefer Entra/managed-identity auth to Azure SQL where possible)

**App settings / config keys (non-secret):**
- `Camp__BaseUrlGen` = `https://services.campsystems.com/campintegration/2_0_8/campintegrationGEN.asmx`
- `Camp__BaseUrlSta` = `https://services.campsystems.com/campintegration/2_0_7/campintegrationSTA.asmx`
- `Camp__BaseUrlWrk` = `https://services.campsystems.com/campintegration/2_0_8/campintegrationWRK.asmx`
- `Camp__Environment` = `sandbox` | `production` (must be `sandbox` in dev/test)
- `Camp__DueListProjectionMonths` = `3` (hard cap)
- `Myairops__ODataBaseUrl` (Phase 2; TBC)
- `ServiceBus__FullyQualifiedNamespace` (identity-based; Phase 2 for CAMP/webhook queues)
- `Storage__DigestContainerUri`, `Storage__SignedDocsContainerUri` (Blob WORM)
- `Entra__TenantId`, `Entra__ApiClientId`, `Entra__SpaClientId`
- `Signing__MaxAuthAgeSeconds` = `300` (step-up freshness window)
- `Signing__RequireStepUpForCrs` = `true`
- `Signing__RequireStepUpForPilot` = `configurable` (Open Question)

> Phase 1 needs only the Entra, SQL, Storage, and Signing keys. The CAMP/myairops/ServiceBus keys are declared now so naming is stable, but are not wired until Phase 2.

---

## CAMP error taxonomy (handle as named constants — Phase 2)
From the CAMP vendor docs. Define these as an enum with explicit handling; do not let raw codes leak.

**Session/operation (all endpoints):**
- `-2147221404` SESSION NOT VALID -> re-login **once**, then retry the call; if it recurs, fail the run and alert.
- `-2147221373` NO MATCHING RECORD FOUND -> not necessarily an error (empty result); handle as empty, do not retry.
- `-2147221372` INVALID OPERATION -> log + fail the call; do not retry blindly (likely a payload/argument problem).

**Login (GEN):**
- `L100` INVALID USER NAME/PASSWORD -> **stop**, alert; do **not** retry (lockout risk).
- `L102` ACCOUNT DISABLED -> **stop**, alert; do not retry.
- `L103` APPLICATION UNAVAILABLE FOR MAINTENANCE -> back off and retry later (transient).

**Lockout discipline:** the account locks out after a configured number of failed logins. Never retry `LogIn` in a tight loop. On any auth failure, fail the run and alert — a human investigates.

**Session lifecycle:** `LogIn` (-> encrypted security key) -> calls (pass key in each) -> `LogOff` in a `finally`. Keep runs short enough that the inter-request gap never exceeds the customer-level key-timeout. Cache the key in memory for one run only; never persist it.

---

## CAMP status ladders (reference — Phase 2/3)
**ezSign work-order item status:** 5=OPEN, 15=IN WORK, 20=IN INSPECTION, 25=IN QC, 30=WORK COMPLETED, 35=COMPLIANCE POSTED, 40=COMPLIED WITH.
**Work-order header status:** 0=Complied With, 1=Open, 2=Cancelled, 3=Pending Post, 4=RTS-Update Pending, 5=RTS-Update Overdue, 6=Planned.
**WO detail line type:** S = squawk, T = task.
**`IntegrateDiscrepancies` modes:** INSERT, EDIT, UPDATE. **discrepancyType:** MEL / DEFERRED-WATCHLIST / NON-DEFERRED. **melFlag:** A/B/C/D. Carries RIIitem (Y/N), DoubleInspection, restriction, nextDue, melLogbookDate, extension, CorrectiveActionNotes, technician, inspector, ata, applies-to, NEFFlag.

---

## Tech stack & libraries
- **Frontend:** Next.js (`output: 'export'`, static), React, Tailwind. Client-only — no Server Actions/Route Handlers/Image Optimization in the WebView build.
- **iPad wrapper:** Capacitor (current major); `@capacitor-community/sqlite` for durable native storage (encrypted). Disable the service worker in the Capacitor build; bundle assets natively. Keep the pure-PWA build for desktop maintenance users.
- **Hashing/canonicalization:** `canonicalize` (RFC 8785) on client + server; SHA-256.
- **Auth:** MSAL.js (SPA) + Entra; `auth_time` optional claim + `clientCapabilities: ["CP1"]`; step-up via `max_age` claims challenge.
- **API:** App Service / Container Apps (or Functions). Validate Entra access tokens (JWKS, aud/iss/exp, scp/roles).
- **DB:** Azure SQL **serverless single database** (ledger unsupported on elastic pools). Append-only + updatable ledger tables; auto digest upload to Blob WORM (GRS/ZRS, not LRS).
- **Phase 2 integration:** `soap` (or `strong-soap`) + `wsdl-tsclient` for CAMP SOAP; Service Bus (PeekLock, DLQ, identity-based) for outbound pushes and webhook fan-out; OData client TBC.

---

## Conventions
- **Migrations:** versioned, forward-only for ledger tables (you cannot revert a ledger table; plan schema before creating). Added columns to ledger tables must be nullable.
- **Branches/PRs:** feature branches off `main`; PRs require the relevant tests (immutability/idempotency/hash/clock) green. Keep commits scoped and described.
- **Don't watch PRs.** Open the pull request, report the link, stop. Do not subscribe to PR activity, schedule check-ins, or poll a PR for CI, review or merge-state changes — review here is a human's job, and the weekday digest routine already reports `verify` and ship-it state. Spend the effort *before* the push instead: `npm run type-check:baseline`, `npm test` and `npm run build` are exactly what CI's `verify` job runs, so a clean local run is a green check.
- **Tests first for correctness-critical logic:** immutability rejection, idempotent ingestion, client-vs-server hash equality, PL-25 clock, provisional-MEL block, CRS A&P-cert enforcement, RII performer/inspector separation.
- **Idempotency keys:** UUIDv7, client-generated at the moment of the mutation, immutable across retries.
- **UTC everywhere** in storage; convert for display only.
- **Surface, don't suppress:** if a requirement seems to conflict with a NEVER rule, or a CAMP capability is undocumented, stop and raise it rather than improvising.

---

## Open Questions (resolve before the dependent work; do not guess)
1. **CAMP utilization-push function** — exact SOAP operation/endpoint is undocumented. Confirm with CAMP under **sandbox** credentials before building any utilization push. Blocks Phase 2 utilization sync.
2. **myairops OData** — entity/field names, OData version (v2 vs v4), and auth method are TBC against the live connection. Blocks Phase 2 pre-population.
3. **RII ATA-chapter list** — the DOM must supply the operator-defined required-inspection-item list before RII enforcement is meaningful.
4. **Pilot-signing step-up** — confirm whether crew acceptance needs biometric/PIN re-confirm or whether the authenticated session suffices (`Signing__RequireStepUpForPilot`).
5. **myairops write-back for the booking portal** — the planned booking portal and passenger app require writing to myairops (a seat booking is `POST /api/TripLegs/{id}/passengerbookings`), which **directly conflicts with the NEVER rule above**. The rule is not worked around: `src/integration/myairops/capability.ts` refuses every mutating call and ships with zero grants. Amending the rule is a deliberate decision, and it is blocked on ASK 1 (can myairops issue scoped/read-only keys? today one `x-api-key` grants full read *and* write per API) and ASK 8 (is there a sandbox tenant?) in `docs/vendor/myairops-integration-asks.md`. Do not add a write grant until both are answered.
6. **myairops passenger PII residency** — whether passenger passport/visa/allergy data from CRM is mirrored into myGFO or read through on demand. Default until decided: **read through, mirror nothing**. Blocks the passenger app's identity model. See `docs/booking-portal/architecture.md`.

When one of these is answered, update this file and the build spec rather than scattering the decision across code.
