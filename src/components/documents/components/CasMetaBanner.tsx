import { Info } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { CasChip } from '../../tech-log/components/CasChip';
import type { DocRevision } from '../types';

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
 *
 * D65 — takes the REVISION, and `DocReader` hands it the CURRENT PUBLISHED one. So the banner shows
 * the same facts the picker offers, from the same source: a curator's unpublished re-tag is no more
 * visible here than it is on the defect form. `undefined` (a doc with nothing published) renders
 * nothing, which is the honest answer.
 */
export function CasMetaBanner({ rev }: { rev: DocRevision | undefined }) {
  if (!rev || (!rev.casMeta && !rev.fleetTypes?.length)) return null;
  const codes = rev.casMeta?.cmcCodes ?? [];
  return (
    <div data-testid="cas-meta-banner" className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {rev.casMeta && <CasChip message={rev.casMeta.casMessage} color={rev.casMeta.casColor} />}
        {rev.fleetTypes?.map((t) => (
          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
        ))}
        {codes.map((c) => (
          <Badge key={c} variant="outline" className="font-mono text-[10px]">{c}</Badge>
        ))}
      </div>
      <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {/* The CMC half is CONDITIONAL. The banner fires on `fleetTypes` alone, so it also renders
            on a fleet-scoped `sop` and on D75 cabin knowledge — neither of which has, or could
            have, a CMC code. Stating "any CMC codes listed…" on an entry about bedding is the
            banner describing a field the class does not own. */}
        <span>
          Reference only — curated field knowledge, not an airworthiness record.
          {codes.length > 0 &&
            ' Any CMC codes listed are hand-curated relations, not a diagnosis of a specific defect.'}
        </span>
      </p>
    </div>
  );
}
