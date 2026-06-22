import type { Personnel, Signature } from '../types';

export function validateCrs(signer: Personnel): { ok: boolean; error?: string } {
  if (!signer.apCertificateNumber) {
    return { ok: false, error: 'CRS sign-off requires an A&P certificate number on file (14 CFR 91.417).' };
  }
  return { ok: true };
}

export function validateRii(
  performerOid: string,
  inspector: Personnel,
  ataChapter: string,
): { ok: boolean; error?: string } {
  if (performerOid === inspector.oid) {
    return { ok: false, error: 'RII inspector must differ from the performer.' };
  }
  if (!inspector.riiAuthorized || !inspector.riiAuthorizedAta.includes(ataChapter)) {
    return { ok: false, error: `Inspector is not RII-authorized for ATA ${ataChapter}.` };
  }
  return { ok: true };
}

// Tiny deterministic non-cryptographic digest (display-only — NOT real hashing).
function mockHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Deterministic 64-hex "SHA-256" for the demo (NOT real crypto). In production this is a true
 * SHA-256 over the attachment bytes; here we derive a stable 64-char hex from a description string
 * so attachments can be folded into the signed payload and shown as digests.
 */
export function mockSha256(input: string): string {
  let out = '';
  let seed = input;
  while (out.length < 64) {
    out += mockHash(seed + out.length);
    seed = out;
  }
  return out.slice(0, 64);
}

export function makeSignature(input: {
  id: string;
  signedEntity: Signature['signedEntity'];
  signedEntityId: string;
  signer: Personnel;
  intentStatement: string;
  signedAtUtc: string;
  certNumber?: string;
  payloadExtra?: string; // e.g. attachment SHA-256 digests — folded into the content hash
}): Signature {
  return {
    id: input.id,
    signedEntity: input.signedEntity,
    signedEntityId: input.signedEntityId,
    signerOid: input.signer.oid,
    signerName: input.signer.displayName,
    signerRole: input.signer.role,
    certNumber: input.certNumber ?? input.signer.apCertificateNumber,
    intentStatement: input.intentStatement,
    amr: ['pwd', 'mfa'],
    authTimeUtc: input.signedAtUtc,
    signedAtUtc: input.signedAtUtc,
    mockContentHash: mockHash(
      `${input.signedEntity}|${input.signedEntityId}|${input.signer.oid}|${input.signedAtUtc}` +
        (input.payloadExtra ? `|${input.payloadExtra}` : ''),
    ),
  };
}
