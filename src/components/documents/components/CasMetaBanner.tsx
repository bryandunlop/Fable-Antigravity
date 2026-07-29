import { Info } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { CasChip } from '../../tech-log/components/CasChip';
import type { Doc } from '../types';

/**
 * D60 — reads a tribal-knowledge entry's CAS metadata back to the reader.
 *
 * Without this the fleet tagging and the curated codes would be a write-only field: a curator could
 * enter them, the picker and the tail tab would filter on them, and no one could ever see on the
 * entry itself which fleets it covers or which codes it relates to.
 *
 * The reference-only sentence is the labelling D60 requires. It sits on the entry, not just on the
 * tail page, because `/documents/<id>` is reachable directly from search, a link or a comment
 * notification — the reader may never pass through the tail page's banner.
 */
export function CasMetaBanner({ doc }: { doc: Doc }) {
  if (!doc.casMeta && !doc.fleetTypes?.length) return null;
  const codes = doc.casMeta?.cmcCodes ?? [];
  return (
    <div data-testid="cas-meta-banner" className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {doc.casMeta && <CasChip message={doc.casMeta.casMessage} color={doc.casMeta.casColor} />}
        {doc.fleetTypes?.map((t) => (
          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
        ))}
        {codes.map((c) => (
          <Badge key={c} variant="outline" className="font-mono text-[10px]">{c}</Badge>
        ))}
      </div>
      <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Reference only — curated field knowledge, not an airworthiness record. Any CMC codes listed
          are hand-curated relations, not a diagnosis of a specific defect.
        </span>
      </p>
    </div>
  );
}
