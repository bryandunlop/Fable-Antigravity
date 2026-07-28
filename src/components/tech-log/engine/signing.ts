import type { Personnel, Signature } from '../types';
import { hashSignedRecord, sha256Hex } from './contentHash';

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

/**
 * True SHA-256 of a descriptor string, for attachment digests.
 *
 * NOTE FOR THE PRODUCTION BUILD: the algorithm here is real, but the INPUT is not. This prototype
 * has no file storage, so it hashes a `name|size|lastModified` descriptor rather than the file's
 * bytes. Production must hash the actual bytes — same function, real input.
 */
export function attachmentSha256(descriptor: string): string {
  return sha256Hex(descriptor);
}

export function makeSignature(input: {
  id: string;
  signedEntity: Signature['signedEntity'];
  signedEntityId: string;
  signer: Personnel;
  intentStatement: string;
  signedAtUtc: string;
  certNumber?: string;
  /** Attachment SHA-256 digests folded into the signed payload. */
  attachmentSha256?: string[];
  /** Record-specific fields covered by the signature (e.g. MEL category, due date). */
  fields?: Record<string, unknown>;
  /** Opaque extra bytes folded into the hash (e.g. a briefing-disclosure digest). */
  payloadExtra?: string;
}): Signature {
  const certNumber = input.certNumber ?? input.signer.apCertificateNumber;
  // RFC 8785 canonicalization + SHA-256 — see engine/contentHash.ts and the golden vectors in
  // docs/tech-log/handover/. The server recomputes this at commit and rejects a mismatch.
  const contentHash = hashSignedRecord({
    entity: input.signedEntity,
    entityId: input.signedEntityId,
    signerOid: input.signer.oid,
    certNumber,
    intent: input.intentStatement,
    signedAtUtc: input.signedAtUtc,
    attachmentSha256: input.attachmentSha256,
    fields: input.fields,
    payloadExtra: input.payloadExtra,
  });
  return {
    id: input.id,
    signedEntity: input.signedEntity,
    signedEntityId: input.signedEntityId,
    signerOid: input.signer.oid,
    signerName: input.signer.displayName,
    signerRole: input.signer.role,
    certNumber,
    intentStatement: input.intentStatement,
    amr: ['pwd', 'mfa'],
    authTimeUtc: input.signedAtUtc,
    signedAtUtc: input.signedAtUtc,
    contentHash,
    contentHashShort: contentHash.slice(0, 8),
  };
}
