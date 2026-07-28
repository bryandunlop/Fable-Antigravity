# eTechLog ledger schema contract

**Status: contract. Must be agreed before any table is created.**

Ledger tables are **forward-only**. You cannot drop a column, change a type, tighten a constraint,
or revert a migration on one. Every schema decision here is permanent from the moment the first
row lands, so this document is the last cheap moment to disagree with any of it.

This is the target-state schema for the production build. It is not a description of the
prototype — the prototype has no backend at all, and its Drizzle/Neon schema covers only inventory
and scheduling. The entity shapes below are derived from the module being handed over
(`src/components/tech-log/types.ts`).

---

## 1. Platform constraints

Per the project working agreement, storage is **Azure SQL ledger**. Three consequences that
change the design and are easy to discover too late:

1. **Ledger tables are unsupported on elastic pools.** The database must be a **serverless single
   database**. Choosing a pool for cost reasons forecloses ledger entirely.

2. **Digest storage must be immutable-tier Blob, and must not be LRS.** Use GRS or ZRS with a WORM
   (immutability) policy. Automatic digest upload is what makes the ledger independently
   verifiable; a digest you can rewrite proves nothing.

3. **The SQL server's managed identity needs `Storage Blob Data Contributor`** on the digest
   account, and the API's managed identity needs `Key Vault Secrets User`. These are separate
   identities with separate grants — a single over-broad identity is a finding waiting to happen.

### Column rules on ledger tables

- **Added columns must be nullable.** There is no backfill on a ledger table — rows written before
  the column existed will read `NULL` forever, and the application must treat `NULL` as "predates
  this field," never as a value. The module being handed over already follows this: see
  `Deferral.melSubItemNumber`, `melTitle`, and `melOProcedure`, each nullable for exactly this
  reason.
- **No column may be dropped or retyped.** Widen by adding a new nullable column and superseding.
- **Plan the full column set before creating the table.** Getting this wrong is not a migration,
  it is a table rebuild and a data-lineage break.

---

## 2. Table classification

Two kinds. The distinction is not stylistic — it decides whether `UPDATE` is legal.

### 2.1 Append-only ledger — `UPDATE` and `DELETE` are prohibited

Signed regulatory records. Corrections are **superseding inserts** (section 3).

| Table | Holds |
|---|---|
| `flight_log` | Journey log sector records |
| `defect` | Reported defects (PIREP/MAREP/cabin/structural/NEF) |
| `deferral` | MEL deferrals with their PL-25 clock |
| `maintenance_release` | CRS and other sign-offs |
| `signature` | Every electronic signature |
| `audit_trail` | Actor/action/entity event log |
| `supersede_conflict` | Rejected forked corrections (section 3.3) |
| `postflight` | Postflight records |
| `recurring_check_accomplishment` | Recurring-check completions |
| `doc_acknowledgment` | Read-and-understood acknowledgments |

**Enforce at the database, not only the application.** Azure SQL append-only ledger tables reject
`UPDATE`/`DELETE` at the engine. Application-layer immutability is not immutability — it is a
convention that survives exactly until someone writes a migration script or opens a query window.

### 2.2 Updatable ledger — history preserved automatically

Reference data that legitimately changes. Azure SQL retains prior versions in the history table.

| Table | Holds |
|---|---|
| `aircraft` | Tail, serial, type, status, airframe totals |
| `aircraft_type` | Type-level reference data |
| `mel_item` | MMEL items by revision |
| `personnel` | Signers, certificates, RII authorizations |
| `checklist_template` | Configurable checklists |

---

## 3. The supersede pattern

The correction mechanism for append-only records. Already implemented and tested in
`engine/supersede.ts` — this section specifies the **database** guarantees it needs.

### 3.1 Shape

Every append-only table carries a nullable self-reference:

```
supersedes_id   UNIQUEIDENTIFIER NULL   REFERENCES <same table>(id)
```

- A correcting row is a **complete new row**, not a delta. It carries every field, corrected.
- It sets `supersedes_id` to the row it replaces.
- The original row is never touched.
- The **current** row for an entity is the one no other row supersedes.

### 3.2 The unique constraint that must not be omitted

```sql
CREATE UNIQUE INDEX ux_<table>_supersedes
  ON <table>(supersedes_id)
  WHERE supersedes_id IS NOT NULL;
```

Without it, two rows can supersede the same parent and the chain **forks** — the entity then has
two equally valid "current" rows, and which one a reader sees depends on query order. For a
maintenance record, that is an unresolvable ambiguity about what the aircraft's actual state is.

The application already guards this (`wouldFork()`), but a concurrent pair of requests can both
pass an application check and both insert. **Only the unique index actually prevents it.** Treat
the application check as the friendly error path and the index as the guarantee.

A rejected fork is not an error to swallow: write a `supersede_conflict` row and an `audit_trail`
entry, and route it to reconciliation. `buildSupersedeConflict()` already constructs both.

### 3.3 `supersede_conflict`

| Column | Type | Null |
|---|---|---|
| `id` | UNIQUEIDENTIFIER | no |
| `entity_type` | NVARCHAR(32) | no |
| `attempted_row_id` | UNIQUEIDENTIFIER | no |
| `supersedes_id` | UNIQUEIDENTIFIER | no |
| `rejected_at_utc` | DATETIME2(3) | no |
| `rejected_actor_oid` | NVARCHAR(64) | no |

---

## 4. Cross-cutting column conventions

Applies to every table unless stated otherwise.

| Concern | Rule |
|---|---|
| **Primary keys** | `UNIQUEIDENTIFIER`. Client-generated **UUIDv7** so keys sort by creation time and index inserts stay sequential. Never `IDENTITY` — offline clients must mint ids before they can sync |
| **Timestamps** | `DATETIME2(3)`, **UTC only**. Column names end `_utc`. Convert for display only, never in storage |
| **Server authority** | Every signed record carries a server-stamped `committed_at_utc`. Client-supplied timestamps are advisory and must be stored in their own column if retained at all |
| **Idempotency** | Every ingestion endpoint takes a client-generated **UUIDv7 idempotency key**, unique-indexed, with the response stored so a retry returns the identical response rather than inserting a duplicate |
| **Text** | `NVARCHAR` throughout. Signer names and free text contain non-ASCII — the golden vectors include `José Álvarez` and `検査完了` deliberately |
| **Money/units** | No floats for regulated quantities. Airframe hours `DECIMAL(10,2)`; cycles `INT` |
| **Booleans that gate airworthiness** | Nullable `BIT` where the module models three states. `Defect.airworthinessAffecting` is `boolean \| null` and **null is treated as grounding** — collapsing it to `NOT NULL DEFAULT 0` silently un-grounds aircraft |
| **Enums** | `NVARCHAR` + `CHECK` constraint, not database enum types. A `CHECK` can be widened by adding a new nullable column and superseding; a retyped enum column cannot exist on a ledger table |

---

## 5. Table detail — the four that carry the most risk

Full column lists for the remaining tables follow the same derivation from `types.ts`. These four
are called out because each has a constraint that is invisible unless stated.

### 5.1 `signature`

| Column | Type | Null | Note |
|---|---|---|---|
| `id` | UNIQUEIDENTIFIER | no | UUIDv7 |
| `signed_entity` | NVARCHAR(32) | no | CHECK in the `SignedEntity` set |
| `signed_entity_id` | UNIQUEIDENTIFIER | no | |
| `signer_oid` | NVARCHAR(64) | no | Entra object id |
| `signer_name` | NVARCHAR(256) | no | Snapshot at signing, not a join |
| `signer_role` | NVARCHAR(64) | no | Snapshot at signing |
| `cert_number` | NVARCHAR(64) | **yes** | Present for CRS; **omitted, never null-as-empty-string** in the hashed payload |
| `intent_statement` | NVARCHAR(MAX) | no | The exact text shown to the signer |
| `amr` | NVARCHAR(128) | no | Auth methods, e.g. `pwd+mfa` |
| `auth_time_utc` | DATETIME2(3) | no | From the `auth_time` claim — drives step-up freshness |
| `signed_at_utc` | DATETIME2(3) | no | **Server-stamped** |
| `content_hash` | CHAR(64) | no | SHA-256 hex over the RFC 8785 canonical payload |
| `payload_version` | INT | no | `SIGNED_PAYLOAD_VERSION` at signing |

**`signer_name` and `signer_role` are snapshots on purpose.** Resolving them through `personnel`
at render time would let a later name change or role change repaint a historical signature. The
same reasoning already forced `melSubItemNumber` / `melTitle` / `melOProcedure` onto `deferral`.

**`payload_version` is not optional.** A verifier reads it to know which field set to reconstruct.
Without it, adding a covered field makes every prior signature unverifiable.

**On commit the server recomputes `content_hash` and rejects a mismatch.** It never re-hashes and
accepts. See `signing-golden-vectors.json`.

### 5.2 `deferral`

Carries the point-in-time MEL snapshot. The frozen columns are the contract:

| Column | Type | Null | Note |
|---|---|---|---|
| `governing_mmel_revision` | NVARCHAR(32) | no | Frozen at signing |
| `governing_effective_date` | DATE | no | Frozen at signing |
| `mel_sub_item_number` | NVARCHAR(32) | yes | Frozen display identity |
| `mel_title` | NVARCHAR(512) | yes | Frozen display identity |
| `mel_o_procedure` | NVARCHAR(MAX) | yes | **Not cosmetic** — see below |
| `governing_timezone` | NVARCHAR(64) | no | IANA zone anchoring the PL-25 clock |
| `governing_timezone_override_reason` | NVARCHAR(512) | yes | Set only when overriding the default |
| `day_of_discovery_utc` | DATETIME2(3) | no | |
| `clock_start_date_utc` | DATETIME2(3) | no | Midnight following, in `governing_timezone` |
| `repair_due_date_utc` | DATETIME2(3) | yes | Calendar-unit intervals |
| `usage_due_threshold` | DECIMAL(10,2) | yes | Usage-unit intervals |
| `extension_used` | BIT | no | Cat B/C once; A/D never |

`mel_item` is an **updatable** ledger row — editing it replaces it in place under the same id. Any
value resolved through `mel_item_id` at render time can therefore change under an already-signed
deferral. That is the exact failure the point-in-time MEL invariant exists to prevent.

`mel_o_procedure` matters most: `deferralsRequiringAck()` decides which items the PIC must
acknowledge before accepting the aircraft. When it read the live `MelItem.oProcedure`, editing the
MEL could make a mandatory crew acknowledgment appear **or silently vanish** from an already-signed
briefing — and the disclosure digest could not detect it, because the change was outside the
disclosure. Found by adversarial review, 2026-07-26. Freeze it.

### 5.3 `maintenance_release`

| Constraint | Rule |
|---|---|
| CRS requires a certificate | `signoff_type = 'MAINT_RELEASE'` ⇒ `ap_certificate_number IS NOT NULL`. Enforce as a `CHECK`, **and** at the API. 14 CFR 91.417 |
| RII separation | `rii_required = 1` ⇒ `rii_inspector_oid IS NOT NULL AND rii_inspector_oid <> certifying_tech_oid`. A `CHECK` covers the self-inspection case; ATA-scope authorization is an API check against `personnel` |
| WORM PDF | `pdf_blob_uri` points at immutable-tier Blob. The blob is the rendered artifact; the ledger row is the record |

### 5.4 Rules currently enforced only in the UI

Three airworthiness rules exist in the module being handed over, but **not all of them exist as
server-enforceable logic**. Where the prototype enforces a rule by shaping what the UI offers,
there is nothing to port — the production build is writing that enforcement from scratch.

| Rule | How the prototype enforces it | What production needs |
|---|---|---|
| No deferral against a `DRAFT` / `PENDING_FSDO` MEL item | **UI filter only.** `DeferralCreatePanel` filters the picker to `approvalState === 'APPROVED'`. There is no engine guard | API rejection, 409/422. A client that posts a deferral referencing an unapproved item must be refused |
| CRS requires an A&P certificate | `validateCrs()` in `engine/signing.ts` — real, portable logic | Same check server-side, plus the `CHECK` constraint |
| RII performer ≠ inspector | `validateRii()` — real, portable logic, also checks ATA-scope authorization | Same check server-side, plus the `CHECK` constraint |

The first row is the one to watch. The G800 provisional case is exactly the scenario it guards, and
a UI filter is defeated by any client that posts directly. This is not a criticism of the
prototype — a design reference reasonably enforces at the point of interaction. It does mean the
estimate should not assume the rule is already built.

### 5.5 `audit_trail`

Append-only, and the one table with no supersede chain — an audit entry is never corrected, only
followed by another entry. `id`, `actor_oid`, `action`, `entity_type`, `entity_id`, `at_utc`,
`summary`. Index `(entity_type, entity_id, at_utc)`.

---

## 6. Offline and sync

The client is an iPad with native SQLite. Constraints the server schema must accommodate:

- **Client-minted UUIDv7 primary keys**, so a record signed with no connectivity has its final
  identity immediately and does not get renumbered on sync.
- **Idempotency key per mutation**, unique-indexed server-side, with the stored response replayed
  on retry. A lost ACK must not produce a duplicate signed record.
- **Server timestamps are authoritative at commit.** Preserve the client's claimed time separately
  if it has evidentiary value; never let it become `signed_at_utc`.
- **Sync order follows supersede chains.** A superseding row cannot commit before the row it
  supersedes. The FK on `supersedes_id` enforces this, so the client must order its outbox
  accordingly rather than relying on retry.

---

## 7. Open decisions — needed before table creation

1. **`aircraft.airframe_total_hours` on an updatable ledger row.** Totals change constantly. Every
   change writes a history version, so the history table will dominate storage. Options: accept it,
   or move utilization to a separate append-only `utilization_snapshot` table and keep `aircraft`
   for slow-changing identity. **Recommendation: separate table.** It also matches the
   increase-only guard CAMP requires.

2. **Attachment storage.** `attachment` currently rides inside `defect` as a nested array. In SQL
   it should be its own append-only table keyed to the defect, with the blob in immutable storage
   and the SHA-256 in the row. Confirm whether attachments can be added after signing — if yes,
   the attachment set is *not* covered by the original signature and the UI must not imply it is.

3. **Retention.** How long must ledger history and digests be retained, and does anything ever get
   purged? On a ledger table the answer is effectively "never" — so this is a cost question that
   needs an owner before the first row, not after.

4. **`personnel` as updatable ledger vs. projection from Entra.** If Entra is authoritative for
   name and role, `personnel` may be a cache — but `ap_certificate_number` and `rii_authorized_ata`
   are operator-owned and must be versioned locally regardless.

---

## 8. Acceptance

These are the assertions that must hold against the delivered database. They belong in the
negative-path checklist and should be run as part of UAT.

| # | Assertion | Expected |
|---|---|---|
| 1 | `UPDATE defect SET description = 'x' WHERE id = <signed row>` | Rejected by the engine |
| 2 | `DELETE FROM signature WHERE id = <any>` | Rejected by the engine |
| 3 | Insert a second row with an existing `supersedes_id` | Rejected by unique index; `supersede_conflict` + `audit_trail` rows written |
| 4 | CRS insert with `ap_certificate_number` null | Rejected |
| 5 | RII sign-off with `rii_inspector_oid = certifying_tech_oid` | Rejected |
| 6 | Deferral against a `mel_item` with `approval_state` `DRAFT` or `PENDING_FSDO` | Rejected, 409/422 |
| 7 | Replay a mutation with the same idempotency key | Identical response, no second row |
| 8 | Commit a payload whose `content_hash` disagrees with the server recomputation | Rejected, not re-hashed |
| 9 | Edit a `mel_item`, then re-read a deferral signed under the prior revision | Unchanged — frozen columns, no join |
| 10 | Verify the ledger digest against Blob storage | Verifies |
