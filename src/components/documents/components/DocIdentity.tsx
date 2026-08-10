import { Badge } from '../../ui/badge';
import { FileCheck2, PenLine } from 'lucide-react';
import type { Doc, DocRevision } from '../types';
import { classFor } from '../classes';
import { displayDigest } from '../engine/provenance';
import { OriginBadge } from './OriginBadge';
import { formatDateOnly } from '../../../lib/operatorDate';

// The one way a controlled document is identified everywhere: TITLE + doc number
// + revision + effective date (the TripIdentity pattern). Crews recognize "the
// stabilized approach SOP, rev 2" — the doc number is secondary reference text.

// This file had the LG-117 fix inline and was therefore correct, while print and the
// .docx export were not. One helper now, so "correct here, broken there" can't recur.
const fmtDate = (iso: string) =>
  formatDateOnly(iso, { month: 'short', day: 'numeric', year: 'numeric' });

/** Compact one-line identity for list rows. */
export function DocIdentityLine({ doc, rev }: { doc: Doc; rev?: DocRevision }) {
  const cfg = classFor(doc.classId);
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      <Badge variant="secondary" className="shrink-0 px-1.5 text-[10px] font-semibold">{cfg.label}</Badge>
      <span className="truncate font-medium text-foreground">{doc.title}</span>
      {rev && <span className="shrink-0 text-xs text-muted-foreground">rev {rev.revision} · eff {fmtDate(rev.effectiveDate)}</span>}
      <span className="shrink-0 text-[11px] text-muted-foreground/70">{doc.id}</span>
      <OriginBadge rev={rev} className="shrink-0" />
    </span>
  );
}

/** Large identity header for the reader — unmissable "this is the document and revision you're reading". */
export function DocIdentityHeader({ doc, rev }: { doc: Doc; rev: DocRevision }) {
  const cfg = classFor(doc.classId);
  return (
    <div className="min-w-0">
      <div className="gfo-eyebrow mb-1 flex items-center gap-2">
        <span>{cfg.label}</span>
        <span className="text-muted-foreground/60">·</span>
        <span className="text-muted-foreground">{doc.id}</span>
        <OriginBadge rev={rev} />
      </div>
      <h1 className="text-2xl font-semibold leading-tight text-primary">{doc.title}</h1>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <FileCheck2 className="h-3.5 w-3.5" /> Rev {rev.revision} · effective {fmtDate(rev.effectiveDate)}
        </span>
        {rev.requireAcknowledgment && rev.ackLevel !== 'none' && (
          <span className="inline-flex items-center gap-1">
            <PenLine className="h-3.5 w-3.5" />
            {rev.ackLevel === 'signature' ? 'Read & sign required' : 'Read & initial required'}
            {rev.ackDueDate ? ` by ${fmtDate(rev.ackDueDate)}` : ''}
          </span>
        )}
        {/* A received revision carries TWO digests — the placeholder checksum and
            the real SHA-256 over its bytes. displayDigest picks; nothing here does. */}
        {(() => {
          const d = displayDigest(rev);
          return (
            <span
              className="font-mono text-[11px] text-muted-foreground/70"
              title={d.real ? `SHA-256 computed by myGFO: ${d.hex}` : 'Content integrity digest (demo — not a real SHA-256 yet)'}
            >
              {d.label} {d.short}…
            </span>
          );
        })()}
      </div>
    </div>
  );
}
