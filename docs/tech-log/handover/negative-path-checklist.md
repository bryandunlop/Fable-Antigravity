# Negative-path acceptance checklist

**Status: contract. Proposed as the objective portion of Tech Log UAT.**

Every assertion here is a case that must **fail**. That is the point: these are the paths where a
wrong result is silent. A signature that verifies against the wrong bytes, an `UPDATE` that quietly
succeeds against a signed record, a deferral written against an MEL item the FAA never approved —
none of these produce an error a user would notice. They produce a record that looks correct and
is not.

Positive-path testing cannot find any of them.

---

## How to read this

Each row states the **layer** the control must live at. That matters more than it looks: several of
these are enforced today only in the UI of the module being handed over, which means the production
build is writing them from scratch rather than porting them.

| Layer | Meaning |
|---|---|
| `DB` | Enforced by the database engine — ledger table type, constraint, or index |
| `API` | Enforced server-side on the request path, before commit |
| `ENGINE` | Pure logic, portable from the handed-over module |
| `UI` | Enforced only by what the interface offers — **never sufficient on its own** |

The machine-readable form is `negative-path-checklist.json`, suitable for driving an automated
suite.

---

## 1. Immutability

| # | Assertion | Layer | Expected | Ports? |
|---|---|---|---|---|
| 1.1 | `UPDATE defect SET description = '…' WHERE id = <signed row>` | DB | Rejected by the engine | No — no backend exists |
| 1.2 | `DELETE FROM signature WHERE id = <any>` | DB | Rejected by the engine | No |
| 1.3 | `UPDATE deferral SET repair_due_date_utc = '…'` on a signed deferral | DB | Rejected | No |
| 1.4 | `UPDATE audit_trail …` | DB | Rejected | No |
| 1.5 | Ledger digest verification against Blob storage | DB | Verifies | No |

**1.5 is the one people skip.** An append-only table you never verify is a promise, not a proof.
Run the digest verification as part of UAT and on a schedule thereafter — that is the whole reason
the digests are uploaded to immutable storage.

## 2. Supersede integrity

| # | Assertion | Layer | Expected | Ports? |
|---|---|---|---|---|
| 2.1 | Insert a second row whose `supersedes_id` matches an existing row's | DB | Rejected by the unique partial index | Partly — `wouldFork()` is the app check |
| 2.2 | Concurrent double-supersede: two simultaneous requests, same parent | DB | Exactly one commits | **No** — app check cannot do this |
| 2.3 | On rejection, a `supersede_conflict` row and an `audit_trail` entry are written | API | Both present | Yes — `buildSupersedeConflict()` |
| 2.4 | Reading an entity with a 3-deep supersede chain | ENGINE | Returns only the head | Yes — `currentRows()`, `latestFor()` |

**2.2 is the assertion that matters and the one an application-layer test will pass falsely.** Two
requests can both call `wouldFork()`, both see no conflict, and both insert. Test it with genuine
concurrency against the real database, not with a sequential pair.

## 3. Sign-off authority

| # | Assertion | Layer | Expected | Ports? |
|---|---|---|---|---|
| 3.1 | CRS sign-off where the signer has no A&P certificate on file | API + DB | Rejected. 14 CFR 91.417 | Yes — `validateCrs()` |
| 3.2 | CRS insert with `ap_certificate_number` NULL, posted directly | DB | Rejected by `CHECK` | No |
| 3.3 | RII sign-off where inspector OID equals performer OID | API + DB | Rejected | Yes — `validateRii()` |
| 3.4 | RII sign-off by an inspector not authorized for that ATA chapter | API | Rejected | Yes — `validateRii()` |
| 3.5 | Deferral against an MEL item in `DRAFT` | API | Rejected, 409/422 | Yes — `validateMelDeferrable()` |
| 3.6 | Deferral against an MEL item in `PENDING_FSDO` — the G800 provisional case | API | Rejected, 409/422 | Yes — `validateMelDeferrable()` |
| 3.7 | Deferral against a `SUPERSEDED` MEL item | API | Rejected, pointing at the current item | Yes — `validateMelDeferrable()` |
| 3.8 | Second extension on a Cat B or C deferral | ENGINE + API | Rejected — extendable once | Yes — `extensionUsed` gate |
| 3.9 | Any extension on a Cat A or D deferral | ENGINE + API | Rejected — never extendable | Yes |

**3.5–3.7 changed status during this handover.** They previously existed only as a filter on the
MEL picker (`DeferralCreatePanel`), with no engine guard behind them — a payload arriving by any
other path was unchecked. `validateMelDeferrable()` has since been added to `engine/approvals.ts`
with tests, so the logic is now portable. It still must be enforced at the API: a client-side guard
is a better error message, not a control.

## 4. Signature integrity

| # | Assertion | Layer | Expected | Ports? |
|---|---|---|---|---|
| 4.1 | Commit a payload whose `content_hash` disagrees with the server recomputation | API | Rejected — **never re-hashed and accepted** | Yes — `verifyContentHash()` |
| 4.2 | Alter any covered field after signing, then verify | ENGINE | Verification fails | Yes |
| 4.3 | Emit `null` for a missing `certNumber` instead of omitting the key | ENGINE | Produces a **different** hash — see golden vector `null-cert-differs-from-absent` | Yes |
| 4.4 | Client and server, given the same payload, produce the same hash | API | Identical | Yes — golden vectors |
| 4.5 | Accept a client-supplied `signedAtUtc` as authoritative | API | Must not — server timestamp wins | No |
| 4.6 | Verify a signature written under an earlier `payload_version` | API | Still verifies, using that version's field set | No |

**4.1 has a specific wrong implementation to guard against:** recomputing the hash server-side and
storing the recomputed value. That always "succeeds" and silently destroys the client's attestation.
The server recomputes to *compare*, then rejects on mismatch.

## 5. Point-in-time MEL

| # | Assertion | Layer | Expected | Ports? |
|---|---|---|---|---|
| 5.1 | Edit a `mel_item`, then re-read a deferral signed under the prior revision | DB + API | Unchanged — frozen columns, no join | Yes — frozen columns exist |
| 5.2 | Remove the `(O)` procedure from a `mel_item`, then re-open a signed briefing | ENGINE | The PIC acknowledgment requirement is unchanged | Yes — `melOProcedure` frozen |
| 5.3 | Ship MMEL revision N+1, then render a deferral signed under revision N | API | Shows revision N's provision and identity | Yes |

**5.2 is a real defect that was found and fixed here, not a hypothetical.** `deferralsRequiringAck()`
used to read the live `MelItem.oProcedure`, so editing the MEL could make a mandatory crew
acknowledgment appear *or vanish* on an already-signed briefing — invisibly, because the change was
outside the disclosure digest. Found by adversarial review, 2026-07-26.

## 6. Idempotency and offline sync

| # | Assertion | Layer | Expected | Ports? |
|---|---|---|---|---|
| 6.1 | Replay a mutation with the same idempotency key | API | Identical response, **no second row** | No — no backend exists |
| 6.2 | Replay after a lost ACK (client never saw the first response) | API | Identical response, no duplicate | No |
| 6.3 | Same payload, *different* idempotency key | API | Creates a second row — keys are the identity | No |
| 6.4 | Sync a superseding row before its parent | API | Rejected by FK; client outbox must order by chain | No |
| 6.5 | Sign with no connectivity, then kill the app before sync | CLIENT | Signed record survives and syncs on relaunch | No |
| 6.6 | Two devices sign the same entity offline, then both sync | API | One commits; the other becomes a `supersede_conflict` | No |

**Section 6 ports nothing.** The prototype has no backend and no offline storage — its persistence
is a debounced whole-blob write to browser storage. Every row here is new construction, and 6.5 and
6.6 are the ones that decide whether the system is trustworthy at an airfield with no signal.

---

## Coverage summary

Counts below are generated from `negative-path-checklist.json`, not maintained by hand.

| Section | Assertions | Portable | Partial | New construction |
|---|---|---|---|---|
| 1. Immutability | 5 | 0 | 0 | 5 |
| 2. Supersede integrity | 4 | 2 | 1 | 1 |
| 3. Sign-off authority | 9 | 8 | 0 | 1 |
| 4. Signature integrity | 6 | 4 | 0 | 2 |
| 5. Point-in-time MEL | 3 | 3 | 0 | 0 |
| 6. Idempotency / offline | 6 | 0 | 0 | 6 |
| **Total** | **33** | **17** | **1** | **15** |

The split is worth carrying into the estimate conversation, and it is not evenly distributed.

**Sections 3, 4 and 5 are nearly all portable** — 15 of 18. The regulatory rules are largely
solved: sign-off authority, signature integrity, and the point-in-time MEL behavior all exist as
tested logic in the handover.

**Sections 1, 2 and 6 are nearly all new** — 12 of 15. Immutability, concurrent supersede safety,
and idempotent offline sync are infrastructure, and the prototype has none of it.

That is the shape of the remaining work: **the rules are done, the enforcement layer is not.** An
estimate built by walking the module will see the first group and undercount the second, because
the second group has nothing to look at.
