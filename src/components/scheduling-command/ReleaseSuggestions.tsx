import { useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { overlayFromSuggestion } from '../../availability/engine/suggestions';
import type { ReleaseSuggestion, SchedulerOverlay } from '../../availability/types';

const TRIGGER_LABEL: Record<ReleaseSuggestion['trigger'], string> = {
  'downtime-ended-early': 'Back early',
  'hold-unclaimed': 'Unclaimed hold',
  'crew-resolvable': 'Crew could be rejigged',
  'trip-cancelled': 'Trip cancelled',
};

/**
 * The engine proposes, scheduling approves (Bryan, 2026-08-31).
 *
 * Nothing here applies itself. Approving appends a `release` overlay carrying the suggestion's id;
 * dismissing appends a `dismissal` so it stops resurfacing. Both are attributed and append-only,
 * so the board keeps a record of who published which day and why.
 *
 * Approval asks for the public sentence before it commits, pre-filled from the suggestion — a
 * released day appears to executives as inventory with a reason, not as a silently-changed cell.
 */
export function ReleaseSuggestions({
  suggestions,
  nowUtc,
  actor,
  canApprove,
  onDecide,
}: {
  suggestions: ReleaseSuggestion[];
  nowUtc: string;
  actor: { name: string; role: string };
  /** Release authority is scheduling's (Bryan, 2026-08-31). Others see the queue, read-only. */
  canApprove: boolean;
  onDecide: (overlay: SchedulerOverlay) => void;
}) {
  const [labels, setLabels] = useState<Record<string, string>>({});

  if (suggestions.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
        Nothing to release. The engine raises a suggestion when a maintenance window ends early, a
        hold goes unclaimed, a trip cancels, or a crewless day could be resolved by reassignment.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {suggestions.map(s => {
        const label = labels[s.id] ?? s.proposedPublicLabel;
        return (
          <div key={s.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" aria-hidden />
              <span className="text-sm font-medium text-primary">{s.tail}</span>
              <span className="text-xs text-muted-foreground">
                {s.fromDateUtc}{s.toDateUtc !== s.fromDateUtc ? ` → ${s.toDateUtc}` : ''}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {TRIGGER_LABEL[s.trigger]}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.rationale}</p>

            {canApprove && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Input
                  aria-label={`What executives will see for ${s.tail}`}
                  className="h-8 max-w-[280px] text-sm"
                  value={label}
                  onChange={e => setLabels({ ...labels, [s.id]: e.target.value })}
                />
                <Button
                  size="sm"
                  onClick={() => onDecide(overlayFromSuggestion(s, 'approve', actor, nowUtc, label))}
                >
                  <Check className="mr-1 h-3.5 w-3.5" /> Release
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDecide(overlayFromSuggestion(s, 'dismiss', actor, nowUtc))}
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Dismiss
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
