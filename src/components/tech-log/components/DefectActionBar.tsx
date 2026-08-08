import { Wrench, CheckCircle2, Eye, Flag, Pencil, TriangleAlert, MoreHorizontal, ClipboardList } from 'lucide-react';
import type { DefectActionId, DefectActionLayout } from '../engine/defectActions';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../ui/dropdown-menu';

/**
 * LG-154 — renders whatever `defectActionLayout` decided. This component holds no policy: which
 * actions exist and which are promoted lives in the engine, so it is testable without a DOM and so
 * the two forks of the defect card cannot drift apart on the rules.
 */
// LG-208 — one vocabulary. These are the same words the tail workspace's blocker card and defect
// card use (ACTION_LABEL in pages/AircraftDetail.tsx); a technician meets this decision on three
// surfaces and must not have to re-learn it on each. "Quick CRS" was jargon for the exception path.
const META: Record<DefectActionId, { label: string; icon: typeof Wrench; destructive?: boolean }> = {
  correct: { label: 'Correct', icon: Pencil },
  defer: { label: 'Defer under MEL…', icon: Wrench },
  rectify: { label: 'Rectify — raise work card', icon: ClipboardList },
  quickCrs: { label: 'Rectify — sign release now (work already done)', icon: CheckCircle2 },
  watch: { label: 'Watch', icon: Eye },
  escalate: { label: 'Escalate', icon: TriangleAlert, destructive: true },
  fir: { label: 'Open FIR', icon: Flag },
};

export function DefectActionBar({
  layout,
  on,
}: {
  layout: DefectActionLayout;
  on: Record<DefectActionId, () => void>;
}) {
  const { promoted, overflow } = layout;
  if (promoted.length === 0 && overflow.length === 0) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {promoted.map(id => {
        const { label, icon: Icon, destructive } = META[id];
        return (
          <Button
            key={id}
            size="sm"
            // The pair is deliberately not styled as primary + secondary: neither is recommended.
            // LG-208 — it used to say that and then render secondary + default, which ranks them
            // anyway. Equal weight means the same variant, so the OPEN pair (defer + rectify) is
            // now outline + outline. `escalate` keeps its destructive red: on the WATCHLISTED pair
            // that is a severity signal (this re-grounds the aircraft), not a recommendation.
            variant={destructive ? 'destructive' : 'outline'}
            onClick={on[id]}
          >
            <Icon className="mr-1.5 h-4 w-4" /> {label}
          </Button>
        );
      })}

      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflow.map(id => {
              const { label, icon: Icon } = META[id];
              return (
                <DropdownMenuItem key={id} onSelect={on[id]}>
                  <Icon className="mr-2 h-4 w-4" /> {label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
