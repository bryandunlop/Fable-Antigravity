import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PenLine, Radar, ScrollText } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { GfoEmptyState } from '../../gfo';
import { useDocuments } from '../DocumentsContext';
import { docReaderPath, docManagePath } from '../classes';
import {
  amendmentsInForce,
  outstandingWork,
  replacementSection,
  type OutstandingItem,
} from '../engine/amendments';
import { operatorTodayIso, formatDateOnly } from '../../../lib/operatorDate';

/**
 * The amendment inbox — one queue of what the manuals still owe (TL-46).
 *
 * Bulletins we published and Nimbl regulatory alerts share this list because they
 * answer the same question: *what has the manual not yet absorbed?* Splitting them
 * would give two screens that each look nearly empty while the drift accumulates
 * across both.
 *
 * The number on each row is DAYS OUTSTANDING, not a count. "104 days outstanding"
 * is the sentence that ends an annual revision cycle — a count of seven tells you
 * nothing about whether the manual is three weeks or three years behind.
 */

/** Past this, a row reads as drifting rather than in progress. */
const AGEING_DAYS = 60;

function SourceBadge({ item }: { item: OutstandingItem }) {
  if (item.source === 'external') {
    return (
      <Badge variant="outline" className="gap-1 border-accent/40 bg-secondary px-1.5 text-[10px] text-primary">
        <Radar className="h-3 w-3" /> {item.sourceDocId}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 px-1.5 text-[10px] text-muted-foreground">
      <ScrollText className="h-3 w-3" /> Our bulletin
    </Badge>
  );
}

function Row({
  item,
  onFoldIn,
  onDismiss,
}: {
  item: OutstandingItem;
  onFoldIn: (item: OutstandingItem) => void;
  onDismiss: (item: OutstandingItem) => void;
}) {
  const ageing = item.daysOutstanding >= AGEING_DAYS;
  const folding = item.state === 'folding';

  return (
    <li className="flex gap-3 border-b border-border py-4 last:border-b-0">
      <span
        aria-hidden="true"
        className={`w-[3px] shrink-0 rounded-sm ${item.source === 'external' ? 'bg-accent' : 'bg-chart-3'}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <SourceBadge item={item} />
          <span className="text-sm font-semibold">{item.title}</span>
          {ageing && !folding && (
            <Badge variant="outline" className="border-chart-3/50 px-1.5 text-[10px] text-chart-3">
              {item.daysOutstanding} days outstanding
            </Badge>
          )}
          {folding && (
            <Badge variant="outline" className="gap-1 border-accent/50 px-1.5 text-[10px] text-accent">
              <PenLine className="h-3 w-3" /> Folding in — draft open
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Affects{' '}
          {item.targetDocIds.map((id, i) => (
            <span key={id}>
              {i > 0 && ', '}
              <Link to={docReaderPath(id)} className="font-medium text-foreground hover:underline">
                {id}
              </Link>
            </span>
          ))}
          {' · since '}
          {formatDateOnly(item.since, { day: 'numeric', month: 'short', year: 'numeric' })}
          {!ageing && ` · ${item.daysOutstanding} days`}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        <Button size="sm" variant={folding ? 'outline' : 'default'} onClick={() => onFoldIn(item)}>
          {folding ? 'Open draft' : 'Fold in'}
        </Button>
        {!folding && (
          <Button size="sm" variant="outline" onClick={() => onDismiss(item)}>
            {item.source === 'external' ? 'Not ours' : 'Dismiss'}
          </Button>
        )}
      </div>
    </li>
  );
}

export function AmendmentInboxPanel({ userRole }: { userRole: string }) {
  const { state, resolveAmendment, foldAmendmentIntoDraft } = useDocuments();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'bulletin' | 'external'>('all');
  const today = operatorTodayIso();

  const all = useMemo(
    () =>
      outstandingWork(
        state.revisions,
        state.externalAlerts ?? [],
        state.amendmentResolutions ?? [],
        today,
      ),
    [state.revisions, state.externalAlerts, state.amendmentResolutions, today],
  );

  const shown = filter === 'all' ? all : all.filter((i) => i.source === filter);
  const ageing = all.filter((i) => i.daysOutstanding >= AGEING_DAYS).length;

  const onDismiss = (item: OutstandingItem) => {
    const note = window.prompt(
      item.source === 'external'
        ? 'Why is this not ours? (recorded against the alert)'
        : 'Why is this being dismissed? (recorded against the amendment)',
    );
    // A dismissal with no reason is exactly the silent disappearance this queue
    // exists to prevent, so cancelling the prompt cancels the action.
    if (!note?.trim()) return;
    resolveAmendment(item.id, {
      resolvedInRevisionId: '',
      resolvedBy: userRole,
      resolvedOn: today,
      note: note.trim(),
    });
  };

  /**
   * Fold in: stage the governing wording into the target's working draft and go
   * there. The amendment does NOT leave the queue yet — it reads "folding in"
   * until that draft publishes, because until then the manual still says the old
   * thing.
   */
  const onFoldIn = (item: OutstandingItem) => {
    if (item.state === 'folding') {
      navigate(docManagePath(item.targetDocIds[0], { tab: 'draft', section: item.targetSectionId }));
      return;
    }
    const targetDocId = item.targetDocIds[0];
    const am = amendmentsInForce(targetDocId, state.revisions, state.amendmentResolutions ?? []).find(
      (a) => a.id === item.id,
    );
    // An external alert has no governing wording of its own — nothing has been
    // published. It opens the draft for the author to write the change themselves.
    const blocks = am ? replacementSection(am, state.revisions)?.blocks : undefined;
    if (!am || !blocks?.length || !item.targetSectionId) {
      // No wording to stage — open the draft so the author writes it themselves,
      // still at the right section where we know which one it is.
      navigate(docManagePath(targetDocId, { tab: 'draft', section: item.targetSectionId }));
      return;
    }
    const draftId = foldAmendmentIntoDraft(
      { id: am.id, targetDocId, targetSectionId: item.targetSectionId, sourceDocId: am.sourceDocId },
      blocks,
      userRole,
    );
    if (draftId) navigate(docManagePath(targetDocId, { tab: 'draft', section: item.targetSectionId }));
  };

  if (all.length === 0) {
    return (
      <GfoEmptyState message="Every bulletin and regulatory alert has been folded into its document, or set aside with a reason." />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Changes the manuals have not yet absorbed — our own bulletins and Nimbl&rsquo;s regulatory
          alerts in one queue. Folding one in retires its source; setting one aside records why.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
            All {all.length}
          </Button>
          <Button
            size="sm"
            variant={filter === 'bulletin' ? 'default' : 'outline'}
            onClick={() => setFilter('bulletin')}
          >
            Bulletins {all.filter((i) => i.source === 'bulletin').length}
          </Button>
          <Button
            size="sm"
            variant={filter === 'external' ? 'default' : 'outline'}
            onClick={() => setFilter('external')}
          >
            Reg watch {all.filter((i) => i.source === 'external').length}
          </Button>
        </div>
      </div>

      {ageing > 0 && (
        <p className="border-y border-border py-2.5 text-xs text-chart-3">
          <strong className="text-sm">{ageing}</strong> outstanding for more than {AGEING_DAYS} days.
          The oldest has been waiting <strong>{all[0].daysOutstanding}</strong> days.
        </p>
      )}

      <ul>
        {shown.map((item) => (
          <Row key={item.id} item={item} onFoldIn={onFoldIn} onDismiss={onDismiss} />
        ))}
      </ul>

      <p className="pt-1 text-xs text-muted-foreground">
        Folding in stages the governing wording into the target&rsquo;s working draft and opens it. The
        amendment stays here, marked <em>folding in</em>, until that revision publishes — because until
        then the manual still says the old thing.
      </p>
    </div>
  );
}
