import { FileLock2, Link2, PenLine } from 'lucide-react';
import { Badge } from '../../ui/badge';
import type { Doc, DocRevision } from '../types';
import { originLabel, originOf, provenanceLabel } from '../engine/provenance';

const ICON = {
  authored: PenLine,
  'received-copy': FileLock2,
  'external-pointer': Link2,
} as const;

const TONE = {
  authored: 'border-border text-muted-foreground',
  'received-copy': 'border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200',
  'external-pointer': 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
} as const;

/**
 * Where this document came from, and what myGFO is actually holding.
 *
 * "Link only" gets the amber tone deliberately: it is the one origin that is
 * NOT available on a ramp with no connectivity, and that is the fact a crew
 * needs to know before they need it.
 */
export function OriginBadge({
  rev,
  className = '',
}: {
  rev?: Pick<DocRevision, 'provenance'>;
  className?: string;
}) {
  const kind = originOf(rev);
  // Authored is the overwhelming default; badging it everywhere would be noise.
  if (kind === 'authored') return null;
  const Icon = ICON[kind];
  return (
    <Badge variant="outline" className={`gap-1 border px-1.5 text-[10px] ${TONE[kind]} ${className}`}>
      <Icon className="h-3 w-3" /> {originLabel(rev)}
    </Badge>
  );
}

/** The plain-English "where this lives" line, for a document header or registry row. */
export function OriginLine({ doc, rev }: { doc: Doc; rev?: Pick<DocRevision, 'provenance'> }) {
  if (originOf(rev) === 'authored') return null;
  return <p className="text-xs text-muted-foreground">{provenanceLabel(doc, rev)}</p>;
}
