import { Wrench, CheckCircle2, Eye, Flag, Pencil, TriangleAlert, MoreHorizontal } from 'lucide-react';
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
const META: Record<DefectActionId, { label: string; icon: typeof Wrench; destructive?: boolean }> = {
  correct: { label: 'Correct', icon: Pencil },
  defer: { label: 'Defer (MEL)', icon: Wrench },
  rectify: { label: 'Rectify', icon: CheckCircle2 },
  quickCrs: { label: 'Quick CRS', icon: CheckCircle2 },
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
      {promoted.map((id, i) => {
        const { label, icon: Icon, destructive } = META[id];
        return (
          <Button
            key={id}
            size="sm"
            // The pair is deliberately not styled as primary + secondary: neither is recommended.
            variant={destructive ? 'destructive' : i === 0 ? 'secondary' : 'default'}
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
