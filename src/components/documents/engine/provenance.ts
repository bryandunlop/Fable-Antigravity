// D73 — where a document's content came from, and what myGFO is actually holding.
//
// myGFO is the system of record, not a cache of SharePoint. The routing test
// decides how a document is held: bytes if a signature depends on the content or
// it must be producible onboard; a pointer otherwise.
import type {
  Doc,
  DocAttachment,
  DocOriginKind,
  DocProvenance,
  DocRevision,
  DocSection,
} from '../types';
import { shortDigest } from './hashing';

/** Every revision written before provenance existed was authored here. */
export function originOf(rev: Pick<DocRevision, 'provenance'> | undefined): DocOriginKind {
  return rev?.provenance?.origin ?? 'authored';
}

/** True when myGFO holds this revision's actual bytes. */
export function isReceived(rev: Pick<DocRevision, 'provenance'> | undefined): boolean {
  return originOf(rev) === 'received-copy' && !!rev?.provenance?.attachment;
}

const ORIGIN_LABEL: Record<DocOriginKind, string> = {
  authored: 'Authored in myGFO',
  'received-copy': 'Received copy',
  'external-pointer': 'Link only',
};

export function originLabel(rev: Pick<DocRevision, 'provenance'> | undefined): string {
  return ORIGIN_LABEL[originOf(rev)];
}

/**
 * The plain-English "where this lives" line — written for a pilot or a mechanic,
 * not for an integration engineer. Each sentence says what myGFO is holding,
 * because that is what decides whether the document is readable on a ramp with
 * no connectivity.
 */
export function provenanceLabel(doc: Doc, rev: Pick<DocRevision, 'provenance'> | undefined): string {
  switch (originOf(rev)) {
    case 'received-copy': {
      const from = rev?.provenance?.sourceLabel ?? doc.source?.label;
      return `myGFO holds a frozen copy of this document${from ? `, received from ${from}` : ''}. It reads offline, and its digest is the one a signature attests.`;
    }
    case 'external-pointer': {
      const where = doc.source?.label ?? 'an external system';
      return `myGFO holds a link only. The file lives in ${where} and is opened there — it is not available offline.`;
    }
    default:
      return 'Written and revised in myGFO. This is the original, not a copy of anything.';
  }
}

/**
 * THE digest to show for a revision — and the only way any surface should get one.
 *
 * A received revision carries TWO: `mockChecksum` over a generated placeholder
 * (meaningless), and the SHA-256 myGFO computed over the real bytes (the one that
 * matters). Showing the wrong one is the single most likely way this feature
 * ships a lie, so no component picks between them.
 */
export function displayDigest(
  rev: Pick<DocRevision, 'mockChecksum' | 'provenance'>,
): { hex: string; short: string; label: string; real: boolean } {
  const sha = rev.provenance?.attachment?.sha256;
  return sha
    ? { hex: sha, short: shortDigest(sha), label: 'SHA-256', real: true }
    : { hex: rev.mockChecksum, short: shortDigest(rev.mockChecksum), label: 'digest (demo)', real: false };
}

const KB = 1024;
export function formatBytes(n: number): string {
  if (n < KB) return `${n} B`;
  if (n < KB * KB) return `${(n / KB).toFixed(0)} KB`;
  return `${(n / (KB * KB)).toFixed(1)} MB`;
}

/**
 * Generated stand-in sections for a received revision.
 *
 * `DocRevision.sections` is required, and every consumer of it — the diff, the
 * editor, the exports, `validateSubmit`'s non-empty-content rule — assumes
 * blocks. Rather than narrowing ~15 call sites for a feature that touches two,
 * a received revision carries a short human-readable stand-in that states what
 * myGFO is holding. It reads as an honest description, never as the document.
 */
export function receivedPlaceholderSections(
  docId: string,
  att: DocAttachment,
  prov: Pick<DocProvenance, 'sourceLabel' | 'ingestedAtUtc' | 'carriageReason'>,
): DocSection[] {
  const why =
    prov.carriageReason === 'signature-attested'
      ? 'myGFO holds the bytes because a signature attests this content.'
      : prov.carriageReason === 'required-onboard'
        ? 'myGFO holds the bytes because this document must be producible onboard.'
        : 'myGFO holds the bytes for this document.';
  const lines = [
    `**${att.filename}** — ${formatBytes(att.byteLength)}`,
    '',
    why,
    prov.sourceLabel ? `Received from ${prov.sourceLabel}.` : '',
    prov.ingestedAtUtc ? `Frozen ${prov.ingestedAtUtc.slice(0, 10)}.` : '',
    '',
    `SHA-256 computed by myGFO: \`${att.sha256}\``,
  ].filter(Boolean);
  return [
    {
      id: `${docId}::received`,
      level: 1,
      number: '',
      title: '',
      blocks: [{ id: `${docId}::received::b0`, type: 'paragraph', md: lines.join('\n') }],
    },
  ];
}
