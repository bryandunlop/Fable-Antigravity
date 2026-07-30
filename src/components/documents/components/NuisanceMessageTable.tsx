import { useMemo, useState } from 'react';
import { Info, Search } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import type { DocCmcRow } from '../types';
import { cmcRowsByAta } from '../engine/shipNotes';

/** Chapter names for the ATA chapters the known-nuisance lists actually use. An unlisted chapter
 *  shows its number alone rather than a guess — inventing a chapter name in an airworthiness
 *  product is exactly the kind of plausible-sounding fabrication to avoid. */
const ATA_NAMES: Record<string, string> = {
  '23': 'Communications',
  '31': 'Indicating / recording',
  '32': 'Landing gear',
  '34': 'Navigation',
  '38': 'Water / waste',
  '42': 'Integrated modular avionics',
  '44': 'Cabin systems',
  '45': 'Central maintenance system',
};

const STATUS_TEXT: Record<DocCmcRow['vendorStatus'], string> = {
  'being-worked': 'being worked',
  accepted: 'known',
  superseded: 'superseded',
};

/**
 * D64 — maintenance's known-nuisance CMC list, grouped by ATA chapter and searchable.
 *
 * A table rather than cards because the real list is ~55 rows and the real use is "I am holding a
 * TOD report, is this one known?". ATA is the grouping because it is how a technician thinks and
 * how the source document is organised.
 *
 * **Informational, never suppressive (D64 / Q19).** Nothing here says a write-up is unnecessary,
 * and nothing reads this to gate or filter the defect path. Status is rendered as TEXT, never in a
 * CAS colour — those colours belong to real flight-deck annunciations, and colouring a maintenance
 * message like one would blur exactly the distinction this list depends on.
 */
export function NuisanceMessageTable({ rows, fleetType }: { rows: DocCmcRow[]; fleetType: string }) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => cmcRowsByAta(rows, query), [rows, query]);
  const shown = groups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Messages maintenance already knows about on the {fleetType} and is tracking, with the
          vendor reference. This is <strong>information, not a decision</strong> — it does not mean a
          message should go unreported. Raise a defect exactly as you normally would.
        </span>
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
          aria-label="Search known nuisance messages"
          placeholder="Search a message or maintenance code…"
        />
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No known message matches “{query}”. That does not mean it is not known — ask maintenance.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {shown} of {rows.length} message{rows.length === 1 ? '' : 's'}
          </p>
          <div className="space-y-2">
            {groups.map((g) => (
              <details key={g.ataChapter} open={!!query} className="rounded-md border border-border">
                <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium">
                  ATA {g.ataChapter}
                  {ATA_NAMES[g.ataChapter] ? ` · ${ATA_NAMES[g.ataChapter]}` : ''}
                  <span className="ml-1.5 text-muted-foreground">({g.rows.length})</span>
                </summary>
                <ul className="border-t border-border">
                  {g.rows.map((r) => (
                    <li
                      key={`${r.ataChapter}-${r.messageName}`}
                      data-cmc-row={r.maintCode || r.messageName}
                      className="flex flex-col gap-1 border-b border-border px-3 py-2 last:border-b-0 md:flex-row md:items-baseline md:gap-3"
                    >
                      <span className="min-w-0 flex-1 font-mono text-xs">{r.messageName}</span>
                      {r.maintCode && (
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{r.maintCode}</span>
                      )}
                      <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {r.vendorRefs.map((ref) => (
                          <Badge key={ref} variant="outline" className="font-mono text-[10px]">{ref}</Badge>
                        ))}
                        <span className="text-[11px] text-muted-foreground">{STATUS_TEXT[r.vendorStatus]}</span>
                      </span>
                      {r.supersededNote && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">{r.supersededNote}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
