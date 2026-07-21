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

Rules (from the project working agreement):
- **Pull-only.** myGFO never writes to myairops. The vendor APIs do expose writes; we do not call
  them. Any future write path requires an explicit recorded decision (see LG-21/LG-23) — do not add
  one here.
- The **core Flight.SaltashApi is deliberately absent**: its access model (Bearer/OAuth2,
  vendor-internal) is unresolved — Open Question 2. Do not generate types for it or design against
  it until myairops confirms the supported surface.
- No credentials in this repo, ever. The demo runs entirely on fixtures.
