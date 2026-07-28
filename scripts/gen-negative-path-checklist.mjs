/**
 * Generates the machine-readable negative-path checklist.
 *
 * Every assertion here must FAIL when exercised — these are the paths where a wrong result is
 * silent, so positive-path testing cannot find any of them. The JSON is meant to drive an
 * automated suite against the production build.
 *
 *   node scripts/gen-negative-path-checklist.mjs          # write
 *   node scripts/gen-negative-path-checklist.mjs --check  # verify current (CI-safe)
 *
 * `layer` is the level the control must actually live at. `portable` records whether the logic
 * exists in the handed-over module — it is deliberately conservative: UI-only enforcement counts
 * as NOT portable, because a filter on a picker is not a control.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'tech-log', 'handover', 'negative-path-checklist.json');

const SECTIONS = [
  {
    id: 'immutability', title: 'Immutability',
    assertions: [
      ['1.1', 'UPDATE a signed defect row', 'DB', 'rejected', false, 'Append-only ledger rejects UPDATE at the engine.'],
      ['1.2', 'DELETE a signature row', 'DB', 'rejected', false, null],
      ['1.3', 'UPDATE repair_due_date_utc on a signed deferral', 'DB', 'rejected', false, null],
      ['1.4', 'UPDATE an audit_trail row', 'DB', 'rejected', false, null],
      ['1.5', 'Verify the ledger digest against Blob storage', 'DB', 'verifies', false, 'An append-only table you never verify is a promise, not a proof. Run on a schedule, not just at UAT.'],
    ],
  },
  {
    id: 'supersede', title: 'Supersede integrity',
    assertions: [
      ['2.1', 'Insert a second row with an existing supersedes_id', 'DB', 'rejected', 'partial', 'Unique partial index on supersedes_id. wouldFork() is the friendly error path only.'],
      ['2.2', 'Two concurrent requests supersede the same parent', 'DB', 'exactly one commits', false, 'An application check cannot do this — both requests can pass it and both insert. Test with real concurrency against the real database.'],
      ['2.3', 'A rejected fork writes supersede_conflict + audit_trail', 'API', 'both rows present', true, 'buildSupersedeConflict() constructs both.'],
      ['2.4', 'Read an entity with a 3-deep supersede chain', 'ENGINE', 'returns only the head', true, 'currentRows(), latestFor().'],
    ],
  },
  {
    id: 'signoff', title: 'Sign-off authority',
    assertions: [
      ['3.1', 'CRS sign-off with no A&P certificate on file', 'API+DB', 'rejected', true, '14 CFR 91.417. validateCrs().'],
      ['3.2', 'CRS insert with ap_certificate_number NULL, posted directly', 'DB', 'rejected', false, 'CHECK constraint — the API guard alone is defeated by a direct write.'],
      ['3.3', 'RII sign-off where inspector OID equals performer OID', 'API+DB', 'rejected', true, 'validateRii().'],
      ['3.4', 'RII sign-off by an inspector unauthorized for that ATA chapter', 'API', 'rejected', true, 'validateRii().'],
      ['3.5', 'Deferral against an MEL item in DRAFT', 'API', 'rejected 409/422', true, 'validateMelDeferrable(). Was UI-filter-only before this handover.'],
      ['3.6', 'Deferral against an MEL item in PENDING_FSDO', 'API', 'rejected 409/422', true, 'The G800 provisional case. validateMelDeferrable().'],
      ['3.7', 'Deferral against a SUPERSEDED MEL item', 'API', 'rejected, points at current item', true, 'validateMelDeferrable().'],
      ['3.8', 'Second extension on a Cat B or C deferral', 'ENGINE+API', 'rejected', true, 'Extendable once. extensionUsed gate.'],
      ['3.9', 'Any extension on a Cat A or D deferral', 'ENGINE+API', 'rejected', true, 'Never extendable.'],
    ],
  },
  {
    id: 'signature', title: 'Signature integrity',
    assertions: [
      ['4.1', 'Commit a payload whose content_hash disagrees with the server recomputation', 'API', 'rejected', true, 'WRONG IMPLEMENTATION TO GUARD AGAINST: recomputing and storing the recomputed value. That always succeeds and silently destroys the attestation. Recompute to COMPARE, then reject.'],
      ['4.2', 'Alter any covered field after signing, then verify', 'ENGINE', 'verification fails', true, null],
      ['4.3', 'Emit null for a missing certNumber instead of omitting the key', 'ENGINE', 'different hash', true, 'Golden vector null-cert-differs-from-absent.'],
      ['4.4', 'Client and server hash the same payload', 'API', 'identical', true, 'Golden vectors are the contract.'],
      ['4.5', 'Accept a client-supplied signedAtUtc as authoritative', 'API', 'must not — server timestamp wins', false, null],
      ['4.6', 'Verify a signature written under an earlier payload_version', 'API', 'verifies using that version field set', false, null],
    ],
  },
  {
    id: 'point-in-time-mel', title: 'Point-in-time MEL',
    assertions: [
      ['5.1', 'Edit a mel_item, re-read a deferral signed under the prior revision', 'DB+API', 'unchanged', true, 'Frozen columns, no join.'],
      ['5.2', 'Remove the (O) procedure from a mel_item, re-open a signed briefing', 'ENGINE', 'PIC acknowledgment requirement unchanged', true, 'A real defect found by adversarial review 2026-07-26: deferralsRequiringAck() read the live oProcedure, so editing the MEL could make a mandatory acknowledgment appear or vanish on a signed briefing, invisibly.'],
      ['5.3', 'Ship MMEL revision N+1, render a deferral signed under revision N', 'API', 'shows revision N', true, null],
    ],
  },
  {
    id: 'idempotency', title: 'Idempotency and offline sync',
    assertions: [
      ['6.1', 'Replay a mutation with the same idempotency key', 'API', 'identical response, no second row', false, null],
      ['6.2', 'Replay after a lost ACK', 'API', 'identical response, no duplicate', false, null],
      ['6.3', 'Same payload, different idempotency key', 'API', 'creates a second row', false, 'The key is the identity, not the payload.'],
      ['6.4', 'Sync a superseding row before its parent', 'API', 'rejected by FK', false, 'Client outbox must order by supersede chain.'],
      ['6.5', 'Sign offline, kill the app before sync', 'CLIENT', 'record survives and syncs on relaunch', false, 'Decides whether the system is trustworthy at an airfield with no signal.'],
      ['6.6', 'Two devices sign the same entity offline, then both sync', 'API', 'one commits, other becomes supersede_conflict', false, null],
    ],
  },
];

const sections = SECTIONS.map((s) => ({
  id: s.id,
  title: s.title,
  assertions: s.assertions.map(([id, assertion, layer, expected, portable, note]) => ({
    id, assertion, layer, expected, portable, ...(note ? { note } : {}),
  })),
}));

const all = sections.flatMap((s) => s.assertions);
const portableCount = all.filter((a) => a.portable === true).length;

// Guard against silent drift in the summary the markdown quotes.
if (all.length !== 33) throw new Error(`expected 33 assertions, found ${all.length}`);
const ids = all.map((a) => a.id);
if (new Set(ids).size !== ids.length) throw new Error('duplicate assertion id');

const doc = {
  $comment: 'Negative-path acceptance checklist for the myGFO eTechLog. EVERY assertion here must FAIL when exercised — these are the paths where a wrong result is silent. Regenerate with: node scripts/gen-negative-path-checklist.mjs',
  purpose: 'Objective portion of Tech Log UAT. Positive-path testing cannot find any of these.',
  layers: {
    DB: 'Enforced by the database engine — ledger table type, constraint, or index',
    API: 'Enforced server-side on the request path, before commit',
    ENGINE: 'Pure logic, portable from the handed-over module',
    CLIENT: 'Enforced on the device',
    UI: 'Enforced only by what the interface offers — never sufficient on its own',
  },
  summary: {
    total: all.length,
    portable: portableCount,
    partiallyPortable: all.filter((a) => a.portable === 'partial').length,
    newConstruction: all.filter((a) => a.portable === false).length,
  },
  sections,
};

const json = JSON.stringify(doc, null, 2) + '\n';

if (process.argv.includes('--check')) {
  if (readFileSync(OUT, 'utf8') !== json) {
    console.error('negative-path-checklist.json is out of date — run: node scripts/gen-negative-path-checklist.mjs');
    process.exit(1);
  }
  console.log(`negative-path checklist current (${all.length} assertions)`);
} else {
  writeFileSync(OUT, json);
  console.log(`wrote ${all.length} assertions (${portableCount} portable) -> ${OUT}`);
}
