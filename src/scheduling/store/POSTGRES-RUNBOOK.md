# Postgres adapter runbook (developer-run)

`DrizzleSchedulingStore` (`postgres.ts`) is a `SchedulingStore` implementation backed by
Postgres via Drizzle, using the tables defined in `drizzle-schema.ts`. It was written and
`tsc`-checked in an environment with **no live database** — it has not been run against
Postgres. Follow these steps to provision and wire it up.

## 1. Set `DATABASE_URL`

Add a Neon (or any Postgres-compatible) connection string to `.env.local` at the repo root:

```
DATABASE_URL=postgres://<user>:<password>@<host>/<db>?sslmode=require
```

This is the same env var `src/server/db/index.ts#createDb` already reads — no new config key
is introduced by this adapter.

## 2. Push the new scheduling tables

The tables in `drizzle-schema.ts` (`checklist_templates`, `scheduling_trips`,
`scheduling_trip_legs`, `task_instances`, `scheduling_events`) are **not** part of
`src/server/db/schema.ts` and are not wired into the app's Drizzle config by this task. Before
running `db:push`, point Drizzle's schema glob/config at `drizzle-schema.ts` as well (or
temporarily point it there in isolation), then run:

```
npm run db:push
```

Verify in your Postgres client that the five tables above now exist alongside the inventory
tables, with no changes to `trips`, `aircraft_type`, or any other inventory table.

## 3. Swap the store implementation at the composition root

Wherever `InMemorySchedulingStore` is currently constructed (e.g. alongside `SchedulingService`
wiring), swap in `DrizzleSchedulingStore`, constructed with the same `db` client the Hono routes
use:

```ts
import { createDb } from '../server/db';
import { DrizzleSchedulingStore } from '../scheduling/store/postgres';

const db = createDb(); // reads DATABASE_URL
const store = new DrizzleSchedulingStore(db);
```

`DrizzleSchedulingStore` and `InMemorySchedulingStore` both implement `SchedulingStore`, so
`SchedulingService` and any route/handler code that depends on the interface needs no changes.

## 4. Additive, independent schema

These tables are new and additive:

- They do not modify, rename, or drop any inventory table (`trips`, `trip_legs`,
  `aircraft_type` enum, etc. in `src/server/db/schema.ts`).
- `scheduling_trips.aircraftType` is free text — deliberately **not** a foreign key to, or
  reuse of, the inventory `aircraft_type` enum (`G650` | `G500`), since the scheduling engine's
  `aircraftType` values (e.g. `G650ER`) are a superset/different vocabulary.
- `scheduling_trips` is a scheduling-side mirror of trip data (see `mapping.ts`
  `toTripContext`), not a replacement for the inventory `trips` table. The two tables can
  coexist and evolve independently; reconciling/joining them (if ever needed) is out of scope
  here.

## 5. Integration testing is out of scope for the no-DB build environment

This task shipped with no Vitest test for `postgres.ts` because there is no database available
in the build environment it was written in. Before relying on this adapter:

- Run the existing `memory.test.ts` suite as the semantic spec (`getTemplate`/
  `listPublishedTemplates` versioning behavior, instance/event filtering, etc.) and write an
  equivalent integration test file (e.g. `postgres.test.ts`) that runs the same assertions
  against a real (or locally-run) Postgres instance once `DATABASE_URL` is available.
- Exercise each `SchedulingStore` method at least once against a live DB — the `INSERT ...
  ON CONFLICT DO UPDATE` upsert paths, JSONB round-tripping (`taskDefinitions`, `auditTrail`,
  `handoffTarget`, `escalation`, `payload`), and the `getTemplate`/`listPublishedTemplates`
  "latest published version" query logic have only been reviewed by inspection against
  `InMemorySchedulingStore`'s behavior, not run.
- Confirm timestamp round-tripping: all `timestamp` columns are stored `withTimezone: true`
  and mapped back to ISO strings via `.toISOString()` on read; verify this survives a real
  Postgres round trip (timezone-naive input, DST edge cases) before trusting it in the MEL/
  scheduling clock paths.

**Validation note:** Any code that writes templates directly to `checklist_templates`
(bypassing `SchedulingService`) MUST first run `parseTemplate` from `./validate`. The
Postgres adapter's read-side JSONB casts are unchecked by design — validation happens on
write-in, not read-out.
