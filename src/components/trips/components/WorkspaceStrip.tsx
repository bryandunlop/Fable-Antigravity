/**
 * The trip workspace's summary strip and tab bar (D109 slice 4, canvas Option A).
 *
 * Bryan picked tabs on 2026-09-02, from three working mockups, knowing the cost: a tab hides what is
 * behind it. These four cells and the counts on the tabs are the entire counter-measure. So the rule
 * for this component is that it must never go quiet about something someone has to act on — if a
 * number here is wrong or missing, the thing it stands for is invisible.
 *
 * The cells are read straight from `engine/workspaceSummary`, which is also what slice 5's queue
 * reads, so the page and the queue cannot disagree about who is holding a trip up.
 */

import { cn } from '../../ui/utils';
import { formatEt } from '../engine/cutoffs';
import { WAITING_LABEL, type WorkspaceSummary } from '../engine/workspaceSummary';

export type WorkspaceTab = 'itinerary' | 'people' | 'checklist' | 'record' | 'documents' | 'sheet' | 'ops';

export const TAB_LABEL: Record<WorkspaceTab, string> = {
  itinerary: 'Itinerary',
  people: 'People',
  checklist: 'Checklist',
  record: 'Messages',
  documents: 'Documents',
  sheet: 'Sheet & email',
  ops: 'Ops',
};

/** How long ago, in the words a scheduler uses. */
function since(iso: string | null, nowUtc: string): string {
  if (!iso) return '';
  const hours = (Date.parse(nowUtc) - Date.parse(iso)) / 3_600_000;
  if (!Number.isFinite(hours) || hours < 0) return '';
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.floor(hours)} h`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

function Cell({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'warn' }) {
  return (
    <div className="px-4 py-3">
      <div className="gfo-eyebrow text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
      {note && <div className={cn('text-xs', tone === 'warn' ? 'text-amber-800 dark:text-amber-400' : 'text-muted-foreground')}>{note}</div>}
    </div>
  );
}

export function WorkspaceStrip({
  summary, tab, onTab, tabs, nowUtc,
}: {
  summary: WorkspaceSummary;
  tab: WorkspaceTab;
  onTab: (t: WorkspaceTab) => void;
  /** Which tabs this viewer gets — Ops is scheduling's. */
  tabs: WorkspaceTab[];
  nowUtc: string;
}) {
  const { nextCutoff, people, freeze, waitingOn, counts } = summary;
  const waited = since(summary.waitingSinceUtc, nowUtc);

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="grid divide-y divide-border border-b border-border sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x">
        <Cell
          label="Next cutoff"
          value={nextCutoff ? nextCutoff.label : 'Nothing ahead'}
          note={nextCutoff ? formatEt(nextCutoff.dueUtc) : 'Give the first leg a date.'}
        />
        <Cell
          label="People"
          value={`${people.named} of ${people.seats} seat${people.seats === 1 ? '' : 's'} named`}
          note={people.gates > 0
            ? `${people.gates} document gate${people.gates === 1 ? '' : 's'} unresolved`
            : people.unnamed > 0 ? `${people.unnamed} still unnamed` : 'Everyone named'}
          tone={people.gates > 0 || people.unnamed > 0 ? 'warn' : undefined}
        />
        <Cell
          label={freeze?.frozen ? 'Sheet frozen' : 'Sheet freezes'}
          value={freeze ? formatEt(freeze.dueUtc) : '—'}
          note={freeze?.frozen ? 'Refreeze if the trip changes' : freeze?.blocked ? 'Blocked by documents' : undefined}
          tone={freeze?.blocked ? 'warn' : undefined}
        />
        <Cell
          label="Waiting on"
          value={WAITING_LABEL[waitingOn]}
          note={waitingOn === 'nobody' ? 'Nothing outstanding' : waited ? `since ${waited} ago` : undefined}
        />
      </div>

      <div className="flex flex-wrap gap-0 px-2" role="tablist" aria-label="Trip workspace">
        {tabs.map(t => {
          const count = counts[t];
          const active = t === tab;
          return (
            <button
              key={t}
              id={`trip-tab-${t}`}
              role="tab"
              aria-selected={active}
              aria-controls="trip-tab-panel"
              tabIndex={active ? 0 : -1}
              onKeyDown={e => {
                // Arrow keys move between tabs, as the tab pattern expects; without it a keyboard
                // user tabs through every tab button to reach the content.
                const i = tabs.indexOf(t);
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
                  onTab(next);
                  document.getElementById(`trip-tab-${next}`)?.focus();
                }
              }}
              onClick={() => onTab(t)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm transition-colors',
                active
                  ? 'border-primary font-semibold text-primary'
                  : 'border-transparent text-muted-foreground hover:text-primary',
              )}
            >
              {TAB_LABEL[t]}
              {count > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 text-[11px] font-semibold',
                  t === 'documents' ? 'bg-amber-500/15 text-amber-800 dark:text-amber-400' : 'bg-muted text-muted-foreground',
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
