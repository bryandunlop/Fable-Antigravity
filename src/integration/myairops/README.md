# myairops integration layer (typed, pull-only)

Typed boundary between the real myairops tenant APIs and myGFO domain models.

- `schemas/` — the vendor's own OpenAPI documents, captured 2026-07-21 from the P&G tenant
  (`crm-api.` / `booking-api.` / `maintenance-api.pandg.flight.myairops.com`). Canonical archive +
  provenance: "Tech Log for myGFO" repo `docs/vendor/` and vault notes `ref-myairops-*`.
- `gen/` — TypeScript types generated from those schemas via `npm run gen:myairops`
  (openapi-typescript). Do not edit by hand; re-run the script if a schema is re-captured.
- Adapters (`bookingAdapter.ts`, `crmAdapter.ts`) — pure functions mapping vendor shapes into myGFO
  domain models. ALL unit conversion happens here (myairops leg times are **integer minutes**; myGFO
  uses hours — see `units.ts`) and nowhere else.
- `fixtures/` — demo data typed against `gen/` so every mock response is schema-faithful. When real
  credentials arrive (Phase 2), the fixtures swap for HTTP transport; adapters and consumers do not
  change.
- `capability.ts` — classifies every vendor operation by its effect on myairops state and refuses
  mutating calls unless a policy grant permits them. Ships with `PULL_ONLY_POLICY` (zero grants).
  The same classifier generates `docs/vendor/myairops-capability-matrix.md`
  (`npm run gen:myairops-matrix`), so the document and the runtime guard cannot disagree.

Rules (from the project working agreement):
- **Pull-only.** myGFO never writes to myairops. The vendor APIs do expose writes — 100 of the 176
  operations across the three captured specs mutate vendor state — and we do not call them. Any
  future write path requires an explicit recorded decision (see LG-21/LG-23) plus a grant in
  `capability.ts`; the guard refuses the call until then.
- **A single `x-api-key` per API, with no scopes.** There is no read-only credential: the key that
  reads trips can delete them. The guard in `capability.ts` is the only thing enforcing our posture
  until myairops can issue scoped keys — see ASK 1 in `docs/vendor/myairops-integration-asks.md`.
- The **core Flight.SaltashApi is deliberately absent**: its access model (Bearer/OAuth2,
  vendor-internal) is unresolved — Open Question 2. Do not generate types for it or design against
  it until myairops confirms the supported surface.
- No credentials in this repo, ever. The demo runs entirely on fixtures.
