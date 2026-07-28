/**
 * Content hashing for signed regulatory records — the real thing, not the demo digest.
 *
 * WHY THIS EXISTS. A signature is only worth anything if the bytes it covers can be reproduced
 * later, by a different implementation, and still hash to the same value. `JSON.stringify` cannot
 * do that: its key order follows insertion order, so two structurally identical payloads built by
 * different code paths serialize differently and hash differently. Sorting keys by hand is not a
 * fix either — it says nothing about number formatting, string escaping, or how `é` is encoded.
 *
 * So the canonical form is RFC 8785 (JSON Canonicalization Scheme) and the digest is SHA-256 over
 * its UTF-8 bytes. Both client and server MUST use this module (or a byte-compatible
 * reimplementation) so a hash computed on an iPad and a hash recomputed server-side at commit are
 * the same string.
 *
 * WHAT IS AND IS NOT COVERED. The hash covers `SignedPayload` and nothing else. Adding a field to
 * the payload changes every future hash, so the shape is versioned (`v`) — a verifier reads `v`
 * to know which field set it should be reconstructing. Fields absent from the payload are absent
 * from the hash, which is the point: display strings, UI state, and derived values must never be
 * folded in, or an innocuous rendering change would invalidate historical signatures.
 *
 * `undefined` and `null` are NOT interchangeable here. `canonicalize` drops undefined-valued keys
 * and keeps null-valued ones, so `{cert: undefined}` and `{cert: null}` produce different bytes
 * and different hashes. `buildSignedPayload` therefore omits optional fields rather than nulling
 * them — see the golden vectors, which pin this case explicitly.
 */
import canonicalize from 'canonicalize';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

/** Bump when the payload field set changes. Historical signatures keep their original version. */
export const SIGNED_PAYLOAD_VERSION = 1 as const;

/**
 * The exact field set covered by a signature. Order here is irrelevant — RFC 8785 sorts keys — but
 * presence is not. Anything added becomes part of the covered bytes for every signature after it.
 */
export interface SignedPayload {
  /** Payload schema version. */
  v: number;
  /** Entity kind being signed, e.g. 'Defect' | 'Deferral' | 'MaintenanceRelease' | 'FlightLog'. */
  entity: string;
  /** Identifier of the record being signed. */
  entityId: string;
  /** Entra object id of the signer. */
  signerOid: string;
  /** A&P certificate number, when the sign-off requires one. Omitted when not applicable. */
  certNumber?: string;
  /** The attestation text the signer was shown, verbatim. */
  intent: string;
  /** Server-authoritative signing instant, ISO 8601 UTC. */
  signedAtUtc: string;
  /** SHA-256 digests of attachments, ascending. Omitted when there are none. */
  attachmentSha256?: string[];
  /** Record-specific fields folded into the signature (e.g. MEL category, due date). */
  fields?: Record<string, unknown>;
  /**
   * Opaque extra bytes folded into the hash — the prototype's escape hatch for things like a
   * briefing-disclosure digest. Production should prefer structured `fields`; a free string cannot
   * be re-derived by a verifier that does not already know how it was built.
   */
  payloadExtra?: string;
}

export interface BuildSignedPayloadInput {
  entity: string;
  entityId: string;
  signerOid: string;
  certNumber?: string;
  intent: string;
  signedAtUtc: string;
  attachmentSha256?: string[];
  fields?: Record<string, unknown>;
  payloadExtra?: string;
}

/**
 * Build the canonical payload. Optional inputs that are absent are OMITTED, never nulled — see the
 * module note on undefined vs null. Attachment digests are sorted so that upload order, which is
 * incidental, cannot change the hash.
 */
export function buildSignedPayload(input: BuildSignedPayloadInput): SignedPayload {
  const payload: SignedPayload = {
    v: SIGNED_PAYLOAD_VERSION,
    entity: input.entity,
    entityId: input.entityId,
    signerOid: input.signerOid,
    intent: input.intent,
    signedAtUtc: input.signedAtUtc,
  };
  if (input.certNumber !== undefined) payload.certNumber = input.certNumber;
  if (input.attachmentSha256?.length) payload.attachmentSha256 = [...input.attachmentSha256].sort();
  if (input.fields && Object.keys(input.fields).length > 0) payload.fields = input.fields;
  if (input.payloadExtra !== undefined) payload.payloadExtra = input.payloadExtra;
  return payload;
}

/** The RFC 8785 canonical JSON for a payload — the exact string that gets hashed. */
export function canonicalPayloadString(payload: SignedPayload): string {
  const s = canonicalize(payload);
  if (s === undefined) {
    // canonicalize returns undefined only for a top-level undefined input, which the types forbid.
    throw new Error('canonicalize produced no output for the signed payload');
  }
  return s;
}

/** SHA-256 of a string's UTF-8 bytes, lowercase hex. */
export function sha256Hex(input: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(input)));
}

/** SHA-256 of the RFC 8785 canonical form, lowercase hex. This is the content hash. */
export function computeContentHash(payload: SignedPayload): string {
  return sha256Hex(canonicalPayloadString(payload));
}

/** Convenience: build then hash. */
export function hashSignedRecord(input: BuildSignedPayloadInput): string {
  return computeContentHash(buildSignedPayload(input));
}

/**
 * Recompute and compare. The server calls this at commit against the client-supplied hash; a
 * mismatch means the payload was altered in transit or the two sides disagree on canonicalization,
 * and the commit must be rejected rather than re-hashed.
 */
export function verifyContentHash(payload: SignedPayload, expectedHash: string): boolean {
  return computeContentHash(payload) === expectedHash.toLowerCase();
}
