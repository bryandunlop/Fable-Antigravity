// Real SHA-256 over real bytes.
//
// D73: when myGFO holds a received document, the digest must be one myGFO
// computed ITSELF. Microsoft Graph supplies no SHA-256 on a business tenant —
// only the proprietary quickXorHash, and that comes back null from /delta — so a
// vendor-reported hash is a change HINT, never an attestation.
//
// Distinct from `mockChecksum` (engine/blocks.ts), which is a demo digest over
// the block tree. This one is genuine, because it is what a signature would
// attest and what drift detection compares against.

/** SHA-256 of these exact bytes, lowercase hex. */
export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** First 12 hex characters, for display. Never for comparison. */
export function shortDigest(hex: string): string {
  return hex.slice(0, 12);
}
