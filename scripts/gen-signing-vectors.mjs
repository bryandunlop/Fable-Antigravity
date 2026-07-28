/**
 * Generates the golden signing vectors handed to the production build team.
 *
 * The vectors pin RFC 8785 canonicalization + SHA-256 as a black-box contract: given `payload`,
 * any correct implementation in any language must produce exactly `canonical` and `sha256`. That
 * makes client/server hash agreement testable rather than reviewable, which matters because a
 * canonicalization mismatch is invisible until someone tries to verify an old signature.
 *
 *   node scripts/gen-signing-vectors.mjs          # write the fixture
 *   node scripts/gen-signing-vectors.mjs --check  # verify it is current (CI-safe, no write)
 *
 * Cases are chosen for the ways implementations actually diverge: key order, absent vs null,
 * non-ASCII, escaping, number formatting, and array order. Do not prune them — each one is a bug
 * somebody has shipped.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import canonicalize from 'canonicalize';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'tech-log', 'handover', 'signing-golden-vectors.json');

const hash = (s) => bytesToHex(sha256(new TextEncoder().encode(s)));

/** Mirrors buildSignedPayload in src/components/tech-log/engine/contentHash.ts. */
function build(i) {
  const p = { v: 1, entity: i.entity, entityId: i.entityId, signerOid: i.signerOid, intent: i.intent, signedAtUtc: i.signedAtUtc };
  if (i.certNumber !== undefined) p.certNumber = i.certNumber;
  if (i.attachmentSha256?.length) p.attachmentSha256 = [...i.attachmentSha256].sort();
  if (i.fields && Object.keys(i.fields).length > 0) p.fields = i.fields;
  if (i.payloadExtra !== undefined) p.payloadExtra = i.payloadExtra;
  return p;
}

const CASES = [
  {
    id: 'crs-release-basic',
    note: 'Baseline CRS sign-off with an A&P certificate number present.',
    input: {
      entity: 'MaintenanceRelease', entityId: 'REL-2026-0417', signerOid: '3f2a1b7c-9d4e-4a11-8c22-0b7d5e6f8a90',
      certNumber: 'A&P 3412887', intent: 'I certify this aircraft is approved for return to service with respect to the work performed.',
      signedAtUtc: '2026-07-14T16:32:05.000Z',
    },
  },
  {
    id: 'pilot-acceptance-no-cert',
    note: 'certNumber is OMITTED, not null. The absent-vs-null distinction changes the bytes — see the null-cert case.',
    input: {
      entity: 'FlightLog', entityId: 'FL-2026-1188', signerOid: '8c1d0e2f-4a5b-4c6d-9e70-1f2a3b4c5d6e',
      intent: 'I accept the aircraft for dispatch and acknowledge the open deferrals listed.',
      signedAtUtc: '2026-07-14T17:04:00.000Z',
    },
  },
  {
    id: 'deferral-with-fields',
    note: 'Record-specific fields folded in — MEL category, governing revision, computed due date.',
    input: {
      entity: 'Deferral', entityId: 'DEF-2026-0093', signerOid: '3f2a1b7c-9d4e-4a11-8c22-0b7d5e6f8a90',
      certNumber: 'A&P 3412887', intent: 'I defer this item under the approved MEL.',
      signedAtUtc: '2026-01-26T10:00:00.000Z',
      fields: {
        melCategory: 'C', melItemRef: '25-10-01a', governingMmelRevision: '2025-11-14',
        clockStartUtc: '2026-01-27T05:00:00.000Z', repairDueUtc: '2026-02-06T05:00:00.000Z',
        governingTimezone: 'America/New_York',
      },
    },
  },
  {
    id: 'defect-with-attachments',
    note: 'Attachment digests are sorted before hashing, so upload order cannot change the result.',
    input: {
      entity: 'Defect', entityId: 'DFT-2026-0451', signerOid: '8c1d0e2f-4a5b-4c6d-9e70-1f2a3b4c5d6e',
      intent: 'I report the defect described above.', signedAtUtc: '2026-07-14T09:15:30.000Z',
      attachmentSha256: [
        'ffb1c0d2e3f4a5b60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e',
        '0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9',
        '7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d',
      ],
    },
  },
  {
    id: 'unicode-signer-and-intent',
    note: 'Non-ASCII must survive as UTF-8, not \\u-escapes. A signer name with a diacritic and a non-Latin script.',
    input: {
      entity: 'MaintenanceRelease', entityId: 'REL-2026-0418', signerOid: 'a1b2c3d4-e5f6-4718-a293-a4b5c6d7e8f9',
      certNumber: 'A&P 2298104', intent: 'Signed by José Álvarez — 検査完了 — work verified.',
      signedAtUtc: '2026-07-15T08:00:00.000Z',
    },
  },
  {
    id: 'escaping-in-intent',
    note: 'Quote, backslash, newline, tab and a control character must use the RFC 8785 escape set exactly.',
    input: {
      entity: 'Defect', entityId: 'DFT-2026-0452', signerOid: 'a1b2c3d4-e5f6-4718-a293-a4b5c6d7e8f9',
      intent: 'Crew reported "bang\\thud" on rotation.\nRef: C:\\logs\\ata32\u0007 end.',
      signedAtUtc: '2026-07-15T08:30:00.000Z',
    },
  },
  {
    id: 'numeric-field-formatting',
    note: 'Numbers follow ES6 Number::toString — integers unsuffixed, no trailing zeros, exponent form above 1e21.',
    input: {
      entity: 'FlightLog', entityId: 'FL-2026-1189', signerOid: '8c1d0e2f-4a5b-4c6d-9e70-1f2a3b4c5d6e',
      intent: 'I certify the recorded times and cycles are correct.', signedAtUtc: '2026-07-15T12:00:00.000Z',
      fields: {
        airframeHours: 12034.5, cycles: 4821, blockMinutes: 137, fuelBurnLb: 8420.25,
        oilUpliftQt: 0.5, zeroValue: 0, negative: -1.75,
      },
    },
  },
  {
    id: 'payload-extra-covered',
    note: 'payloadExtra is opaque but IS covered by the hash — changing it changes the signature. Production should prefer structured `fields`.',
    input: {
      entity: 'FlightLog', entityId: 'FL-2026-1190', signerOid: '8c1d0e2f-4a5b-4c6d-9e70-1f2a3b4c5d6e',
      intent: 'I acknowledge the briefing disclosure shown.', signedAtUtc: '2026-07-15T15:00:00.000Z',
      payloadExtra: 'DEF-0093,DEF-0094|d41d8cd98f00b204e9800998ecf8427e',
    },
  },
  {
    id: 'null-cert-differs-from-absent',
    note: 'PAIRED WITH pilot-acceptance-no-cert. Same payload but certNumber explicitly null — canonicalize KEEPS null and DROPS undefined, so this hash MUST differ. An implementation that emits null for a missing cert will silently produce unverifiable signatures.',
    rawPayload: {
      v: 1, entity: 'FlightLog', entityId: 'FL-2026-1188', signerOid: '8c1d0e2f-4a5b-4c6d-9e70-1f2a3b4c5d6e',
      certNumber: null, intent: 'I accept the aircraft for dispatch and acknowledge the open deferrals listed.',
      signedAtUtc: '2026-07-14T17:04:00.000Z',
    },
  },
  {
    id: 'nested-and-empty-structures',
    note: 'Nested objects sort at every level; empty object and empty array are preserved distinctly.',
    rawPayload: {
      v: 1, entity: 'Deferral', entityId: 'DEF-2026-0094', signerOid: '3f2a1b7c-9d4e-4a11-8c22-0b7d5e6f8a90',
      intent: 'Nested structure case.', signedAtUtc: '2026-07-15T13:00:00.000Z',
      fields: {
        zulu: { yankee: 1, alpha: { delta: [3, 1, 2], bravo: 'x' } },
        emptyObject: {}, emptyArray: [], booleanFalse: false,
      },
    },
  },
  {
    id: 'key-sorting-utf16',
    note: 'RFC 8785 sorts by UTF-16 code unit, NOT by locale or code point. Uppercase sorts before lowercase; the astral character sorts by its surrogate pair.',
    rawPayload: {
      v: 1, entity: 'Defect', entityId: 'DFT-2026-0453', signerOid: 'a1b2c3d4-e5f6-4718-a293-a4b5c6d7e8f9',
      intent: 'Key ordering case.', signedAtUtc: '2026-07-15T14:00:00.000Z',
      fields: { b: 1, A: 2, a: 3, B: 4, 'é': 5, 'z': 6, '\u00fc': 7, '𝄞': 8, '1': 9, '': 10 },
    },
  },
];

const vectors = CASES.map((c) => {
  const payload = c.rawPayload ?? build(c.input);
  const canonical = canonicalize(payload);
  return { id: c.id, note: c.note, payload, canonical, sha256: hash(canonical) };
});

// Cross-case invariants, asserted at generation time so a broken fixture can never be written.
const byId = Object.fromEntries(vectors.map((v) => [v.id, v]));
if (byId['pilot-acceptance-no-cert'].sha256 === byId['null-cert-differs-from-absent'].sha256) {
  throw new Error('absent and null certNumber hashed identically — canonicalization is wrong');
}
const permuted = canonicalize({
  signedAtUtc: '2026-07-14T16:32:05.000Z',
  intent: 'I certify this aircraft is approved for return to service with respect to the work performed.',
  certNumber: 'A&P 3412887', signerOid: '3f2a1b7c-9d4e-4a11-8c22-0b7d5e6f8a90',
  entityId: 'REL-2026-0417', entity: 'MaintenanceRelease', v: 1,
});
if (hash(permuted) !== byId['crs-release-basic'].sha256) {
  throw new Error('key order changed the hash — canonicalization is wrong');
}

const extraA = hash(canonicalize(build({
  entity: 'FlightLog', entityId: 'FL-2026-1190', signerOid: '8c1d0e2f-4a5b-4c6d-9e70-1f2a3b4c5d6e',
  intent: 'I acknowledge the briefing disclosure shown.', signedAtUtc: '2026-07-15T15:00:00.000Z',
  payloadExtra: 'different',
})));
if (extraA === byId['payload-extra-covered'].sha256) {
  throw new Error('payloadExtra did not affect the hash — it is not actually covered');
}

const doc = {
  $comment: 'Golden signing vectors for the myGFO eTechLog. Any correct implementation must reproduce `canonical` and `sha256` byte-for-byte from `payload`. Regenerate with: node scripts/gen-signing-vectors.mjs',
  spec: { canonicalization: 'RFC 8785 (JCS)', digest: 'SHA-256', encoding: 'UTF-8', output: 'lowercase hex' },
  payloadVersion: 1,
  invariants: [
    'Object keys are sorted by UTF-16 code unit at every nesting level.',
    'An omitted optional field and an explicit null are DIFFERENT payloads with different hashes.',
    'Attachment digests are sorted ascending before hashing, so upload order is not covered.',
    'Non-ASCII is emitted as UTF-8, never as \\u escapes.',
    'The client hash and the server recomputation must match exactly; on mismatch the commit is rejected, never re-hashed.',
    'payloadExtra is opaque to a verifier but is covered by the hash; production should prefer structured fields.',
  ],
  vectors,
};

const json = JSON.stringify(doc, null, 2) + '\n';

if (process.argv.includes('--check')) {
  const current = readFileSync(OUT, 'utf8');
  if (current !== json) {
    console.error('signing-golden-vectors.json is out of date — run: node scripts/gen-signing-vectors.mjs');
    process.exit(1);
  }
  console.log(`signing vectors current (${vectors.length} cases)`);
} else {
  writeFileSync(OUT, json);
  console.log(`wrote ${vectors.length} vectors -> ${OUT}`);
}
