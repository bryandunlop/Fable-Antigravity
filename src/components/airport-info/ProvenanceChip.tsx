import React from 'react';

import { SOURCE_LABEL, type FieldSource } from '../../airport/types';

/**
 * Says where a fact on the airport page came from.
 *
 * The page composes three layers with genuinely different authority: FAA NASR
 * reference data, myairops identity and vendor records, and operator-authored
 * company pages. A crew reading "PPR required" needs to know whether that is the
 * regulator, a vendor, or us — the three carry different weight and different
 * recourse when they are wrong.
 */

const STYLES: Record<FieldSource, string> = {
  reference: 'bg-slate-100 text-slate-700 border-slate-200',
  myairops: 'bg-violet-50 text-violet-700 border-violet-200',
  company: 'bg-amber-50 text-amber-800 border-amber-200',
};

interface ProvenanceChipProps {
  source: FieldSource;
  /** Extra qualifier, e.g. a NASR cycle date or 'fixture'. */
  detail?: string;
  className?: string;
}

export function ProvenanceChip({ source, detail, className = '' }: ProvenanceChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] leading-none ${STYLES[source]} ${className}`}
    >
      {SOURCE_LABEL[source]}
      {detail ? <span className="opacity-70">· {detail}</span> : null}
    </span>
  );
}

/**
 * The standard way to render something the source did not publish.
 *
 * Only 26.6% of qualifying airports publish declared distances and 41.1% publish
 * pavement strength, so this is not an edge case — it is most of the grid. It
 * must never read as zero, and it must never be filled in from a nearby number.
 */
export function NotPublished({ what = 'Not published' }: { what?: string }) {
  return <span className="text-muted-foreground italic text-sm">{what}</span>;
}
