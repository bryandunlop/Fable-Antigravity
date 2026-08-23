import { useMemo, useState } from 'react';
import { AlertTriangle, CircleHelp, MapPin } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  ESTATE,
  estateGaps,
  estateGroups,
  isMisplaced,
  needsBryan,
  verdictLabel,
  type EstateEntry,
  type Tri,
} from '../engine/estate';

/**
 * The document estate — the register.
 *
 * This page holds no content and changes nothing. It answers one question that
 * has never had a single answer: *what document-shaped things exist, where do
 * they live, and which of them do we actually use?*
 *
 * Two flags do all the work. **Misplaced** means the one-question test calls it a
 * document and it does not live in the document centre. **Needs Bryan** means the
 * row rests on an assumption nobody has confirmed — which is most of them, by
 * design: what exists in the codebase is not evidence of what GFO does.
 */

function TriCell({ value }: { value: Tri }) {
  if (value === 'unknown') {
    return <span className="text-muted-foreground/70" title="Not established">—</span>;
  }
  return value ? (
    <span className="font-medium">Yes</span>
  ) : (
    <span className="text-muted-foreground">No</span>
  );
}

const HOME_LABEL: Record<EstateEntry['home'], string> = {
  'document-centre': 'Document centre',
  'other-module': 'Another module',
  nimbl: 'Nimbl',
  sharepoint: 'SharePoint',
  'outside-mygfo': 'Outside myGFO',
  nowhere: 'No home',
};

function EstateRow({ entry }: { entry: EstateEntry }) {
  const misplaced = isMisplaced(entry);
  const unconfirmed = needsBryan(entry);

  return (
    <tr className="border-b border-border align-top last:border-b-0">
      <td className="py-3 pr-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium">{entry.name}</span>
          {misplaced && (
            <Badge variant="outline" className="gap-1 border-amber-500/50 px-1.5 text-[10px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" /> Misplaced
            </Badge>
          )}
          {unconfirmed && (
            <Badge variant="outline" className="gap-1 px-1.5 text-[10px] text-muted-foreground">
              <CircleHelp className="h-3 w-3" /> Unconfirmed
            </Badge>
          )}
        </div>
        {entry.note && <p className="mt-1 max-w-prose text-xs text-muted-foreground">{entry.note}</p>}
      </td>
      <td className="py-3 pr-3 text-xs">
        <div className="font-medium">{HOME_LABEL[entry.home]}</div>
        <div className="text-muted-foreground">{entry.homeDetail}</div>
      </td>
      <td className="py-3 pr-3 text-center text-xs"><TriCell value={entry.controlled} /></td>
      <td className="py-3 pr-3 text-center text-xs"><TriCell value={entry.acknowledged} /></td>
      <td className="py-3 pr-3 text-center text-xs"><TriCell value={entry.offline} /></td>
      <td className="py-3 pr-3 text-xs">
        {entry.owner === 'unknown' ? (
          <span className="text-muted-foreground/70">—</span>
        ) : (
          entry.owner
        )}
      </td>
      <td className="py-3 text-xs">
        {entry.usage === 'confirmed' ? (
          <span className="font-medium">Confirmed{entry.confirmedBy ? ` · ${entry.confirmedBy}` : ''}</span>
        ) : entry.usage === 'assumed' ? (
          <span className="text-muted-foreground">Assumed</span>
        ) : (
          <span className="text-muted-foreground/70">Unknown</span>
        )}
      </td>
    </tr>
  );
}

export function DocumentEstate() {
  const [search, setSearch] = useState('');
  const [onlyGaps, setOnlyGaps] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ESTATE.filter((e) => {
      if (onlyGaps && !isMisplaced(e) && !needsBryan(e)) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.homeDetail.toLowerCase().includes(q) ||
        (e.note ?? '').toLowerCase().includes(q)
      );
    });
  }, [search, onlyGaps]);

  const groups = useMemo(() => estateGroups(filtered), [filtered]);
  const gaps = useMemo(() => estateGaps(ESTATE), []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every document-shaped thing on the platform, sorted by one question: do you read it before
          you act, or write it after? Read before is a document. Wrote after is a record. A blank
          checklist and a completed one are both here, because they are different things.
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter the estate"
            className="h-9 w-56"
          />
          <Button
            variant={onlyGaps ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOnlyGaps((v) => !v)}
          >
            Needs attention
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 border-y border-border py-2.5 text-xs">
        <span>
          <strong className="text-sm">{ESTATE.length}</strong> things registered
        </span>
        <span className="text-amber-700 dark:text-amber-400">
          <strong className="text-sm">{gaps.misplaced}</strong> documents living outside the centre
        </span>
        <span className="text-muted-foreground">
          <strong className="text-sm">{gaps.needsBryan}</strong> resting on an unconfirmed assumption
        </span>
      </div>

      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nothing matches that filter.</p>
      ) : (
        groups.map((group) => (
          <section key={group.verdict} className="space-y-1">
            <div className="flex items-baseline gap-2 pt-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{verdictLabel(group.verdict)}</h3>
              <span className="text-xs text-muted-foreground">
                {group.verdict === 'document'
                  ? 'It tells you what to do. It has a current version.'
                  : group.verdict === 'record'
                    ? 'It says what happened, once. It is never updated.'
                    : 'Assembled fresh from live data — nothing to version.'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">What it is</th>
                    <th className="py-2 pr-3 font-semibold">Where it lives</th>
                    <th className="py-2 pr-3 text-center font-semibold">Four-eyes</th>
                    <th className="py-2 pr-3 text-center font-semibold">Read receipt</th>
                    <th className="py-2 pr-3 text-center font-semibold">Offline</th>
                    <th className="py-2 pr-3 font-semibold">Owner</th>
                    <th className="py-2 font-semibold">Do we use it?</th>
                  </tr>
                </thead>
                <tbody>
                  {group.entries.map((entry) => (
                    <EstateRow key={entry.id} entry={entry} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
        Almost every row reads “assumed” or “unknown” on purpose. What exists in this codebase is not
        evidence of what GFO does — a row only reads “confirmed” once a person says so.
      </p>
    </div>
  );
}
