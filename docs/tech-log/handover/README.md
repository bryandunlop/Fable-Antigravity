# eTechLog handover pack

Artifacts handed to the team building the production eTechLog, alongside the module source.
They exist to make "correct" **objectively checkable** rather than a matter of review.

Everything here is a contract the production build must satisfy. None of it is advisory.

---

## 1. `signing-golden-vectors.json` — signature content hashing

**Status: complete.**

11 vectors pinning RFC 8785 (JCS) canonicalization + SHA-256 as a black-box contract. Given
`payload`, any correct implementation — any language, any stack — must produce exactly `canonical`
and `sha256`.

### Why this matters more than it looks

A signature is only worth something if its covered bytes can be reproduced later by a different
implementation. `JSON.stringify` cannot do that — key order follows insertion order, so two
structurally identical payloads built by different code paths hash differently. Sorting keys by
hand doesn't fix it either: it says nothing about number formatting, string escaping, or how `é` is
encoded.

A canonicalization mismatch between the iPad client and the server is **invisible until someone
tries to verify an old signature** — which, for a 14 CFR 91.417 record, is exactly the moment it
must not fail.

### The cases, and why each one is there

| Vector | Pins |
|---|---|
| `crs-release-basic` | Baseline CRS sign-off with an A&P certificate |
| `pilot-acceptance-no-cert` | Optional field **omitted** |
| `null-cert-differs-from-absent` | **Paired with the above.** Same payload, `certNumber: null`. The hashes MUST differ — `canonicalize` keeps null and drops undefined. An implementation that emits `null` for a missing cert silently produces unverifiable signatures |
| `deferral-with-fields` | Record-specific fields — MEL category, governing MMEL revision, computed due date |
| `defect-with-attachments` | Attachment digests sorted before hashing, so upload order can't change the result |
| `unicode-signer-and-intent` | Non-ASCII emitted as UTF-8, never `\u` escapes |
| `escaping-in-intent` | Quote, backslash, newline, tab, control char — the exact RFC 8785 escape set |
| `numeric-field-formatting` | ES6 `Number::toString` — no trailing zeros, integers unsuffixed |
| `payload-extra-covered` | `payloadExtra` is opaque to a verifier but **is** covered by the hash |
| `nested-and-empty-structures` | Keys sort at every nesting level; empty object ≠ empty array |
| `key-sorting-utf16` | Sorting is by **UTF-16 code unit**, not locale or code point — uppercase before lowercase, astral chars by surrogate pair |

### Verifying an implementation

```bash
npm run signing-vectors:check   # confirms the fixture matches the generator
npx vitest run src/components/tech-log/engine/contentHash.test.ts
```

The test suite loads this fixture and checks the TypeScript module against it. Because the fixture
is produced by a *separate* plain-JS generator (`scripts/gen-signing-vectors.mjs`), a green run
proves two independent implementations agree — the same property the production build has to
demonstrate between client and server.

Regenerate with `npm run signing-vectors`. The generator asserts its own invariants before writing,
so a broken fixture cannot be committed.

### Reference implementation

`src/components/tech-log/engine/contentHash.ts` — `buildSignedPayload`, `canonicalPayloadString`,
`computeContentHash`, `verifyContentHash`. Dependencies are `canonicalize` (RFC 8785) and
`@noble/hashes` (sync SHA-256, identical in Node and browser).

### Carried into production unchanged

- The **server recomputes** the hash at commit and **rejects** a mismatch — it never re-hashes and
  accepts.
- The **server timestamp is authoritative**. `signedAtUtc` in the payload is server-stamped; a
  client clock is advisory only.
- `SIGNED_PAYLOAD_VERSION` is stamped into every payload as `v`. Adding a covered field is a
  version bump — historical signatures keep their original version so old records stay verifiable.

---

## 2. `ledger-schema-contract.md` — storage design

**Status: complete. Must be agreed before any table is created.**

Ledger tables are forward-only: no dropped columns, no retypes, no reverted migrations. This is the
last cheap moment to disagree with the schema, which is why it ships before the build starts rather
than alongside it.

Covers:

- **Platform constraints** — ledger is unsupported on elastic pools (serverless single database
  required), digests need immutable-tier GRS/ZRS Blob, and the two managed identities need
  different grants.
- **Table classification** — which tables are append-only (`UPDATE`/`DELETE` rejected by the
  engine) versus updatable ledger, and why the distinction decides whether `UPDATE` is even legal.
- **The supersede pattern** — including the unique partial index on `supersedes_id` that prevents a
  forked chain. The application already checks this, but two concurrent requests can both pass an
  application check and both insert; only the index actually prevents it.
- **Column conventions** — UUIDv7 client-minted keys, UTC-only `DATETIME2(3)`, idempotency keys,
  `NVARCHAR` throughout, and the nullable-`BIT` rule for `airworthinessAffecting` where **null is
  treated as grounding** (`blockers.ts`, `analytics.ts`) and collapsing it to `NOT NULL DEFAULT 0`
  would silently un-ground aircraft.
- **Detail for the four riskiest tables** — `signature` (snapshot signer identity, `payload_version`),
  `deferral` (the frozen point-in-time MEL columns), `maintenance_release` (CRS and RII constraints),
  `audit_trail`.
- **Rules currently enforced only in the UI** — notably the DRAFT/PENDING_FSDO deferral block, which
  is a picker filter in the prototype with no engine guard behind it. Nothing to port; production
  writes it from scratch.
- **Ten acceptance assertions** for UAT.
- **Four open decisions** needing an owner before table creation.

---

## 3. Still to be produced

Described in the Phase 2 scope request (section 3).

| Artifact | Purpose | Priority |
|---|---|---|
| **Negative-path acceptance checklist** | The section 8 assertions as runnable tests: UPDATE against a ledger table, CRS without an A&P cert, deferral against an unapproved MEL item, same person as performer and RII inspector | High — these fail silently when wrong |
| **Compliance conformance pack** | The ~81 compliance cases as language-neutral fixtures | Only needed if the rule engines are **rewritten** rather than ported — the 503 tests travel with the TypeScript |
| **CAMP fixture pack** | Error taxonomy with required handling per code, minutes↔hours conversion, increase-only guard, tail/serial exact-match | Medium — `integration/campTaxonomy.ts` already covers much of it |

---

## Known gap in the prototype

`attachmentSha256()` in `engine/signing.ts` uses a **real** SHA-256, but over a
`name|size|lastModified` descriptor rather than the file's bytes — this prototype has no file
storage. Production must hash the actual bytes. Same function, real input.
