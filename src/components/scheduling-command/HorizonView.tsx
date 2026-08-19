import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock, Inbox, Briefcase } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { TripIdentityLine } from './TripIdentity';
import { TaskActionButtons } from '../scheduling-workspace/taskRowHelpers';
import type { TaskAction } from '../../scheduling/engine/tasks';
import type { BoardTask } from './adapter';
import { deriveTripStatus, TRIP_STATUS_STYLES } from './tripStatus';
import { HORIZON_WINDOWS, type HorizonBand, type HorizonModel, type HorizonRow } from './horizonSelectors';

const DAY_MS = 86400000;
const PREVIEW = 6;

const fmtDay = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Band header ranges derived from the same window math the selector uses. */
function bandLabel(band: HorizonBand, nowMs: number, horizonDays: number): { label: string; range: string } {
  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfTodayMs = startOfToday.getTime() + DAY_MS - 1;
  switch (band) {
    case 'today':
      return { label: 'Today', range: new Date(nowMs).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) };
    case 'this-week':
      return { label: 'This week', range: `${fmtDay(endOfTodayMs + DAY_MS)} – ${fmtDay(endOfTodayMs + HORIZON_WINDOWS.thisWeekDays * DAY_MS)}` };
    case 'next-week':
      return { label: 'Next week', range: `${fmtDay(endOfTodayMs + (HORIZON_WINDOWS.thisWeekDays + 1) * DAY_MS)} – ${fmtDay(endOfTodayMs + HORIZON_WINDOWS.nextWeekDays * DAY_MS)}` };
    case 'later': {
      const laterEnd = endOfTodayMs + Math.min(HORIZON_WINDOWS.laterDays, horizonDays) * DAY_MS;
      return { label: 'Later', range: `${fmtDay(endOfTodayMs + (HORIZON_WINDOWS.nextWeekDays + 1) * DAY_MS)} – ${fmtDay(laterEnd)}` };
    }
  }
}

function Row({ row, nowMs, onOpenTrip }: { row: HorizonRow; nowMs: number; onOpenTrip: (id: string, taskId?: string) => void }) {
  const { trip, soonest, countInWindow, quiet } = row;
  const status = deriveTripStatus(trip, nowMs);
  const style = TRIP_STATUS_STYLES[status];
  return (
    <button
      onClick={() => onOpenTrip(trip.id, soonest?.key)}
      className={`w-full grid grid-cols-[10px_minmax(0,1.4fr)_8rem_minmax(0,1fr)] items-center gap-3 px-3.5 py-2 border-t text-left hover:bg-accent transition-colors ${quiet ? 'bg-muted/30' : 'bg-background'}`}
    >
      <span className={`w-2 h-2 rounded-full ${style.dot}`} title={style.label} />
      <TripIdentityLine trip={trip} />
      <span className="flex items-center gap-2">
        <Progress value={trip.readinessScore} className="h-1 flex-1" />
        <span className="text-[11px] font-medium text-muted-foreground w-8 text-right">{trip.readinessScore}%</span>
      </span>
      {trip.criticalBlocker ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--gfo-error,#EF3340)] min-w-0">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Blocked · {trip.criticalBlocker}</span>
        </span>
      ) : quiet ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--gfo-success,#00B140)]" /> nothing due yet
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium min-w-0">
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{soonest!.title} · {soonest!.dueLabel}{countInWindow > 1 ? ` · +${countInWindow - 1} more` : ''}</span>
        </span>
      )}
    </button>
  );
}

function Band({ band, rows, nowMs, horizonDays, laterByTail, onOpenTrip }: {
  band: HorizonBand;
  rows: HorizonRow[];
  nowMs: number;
  horizonDays: number;
  laterByTail?: { tail: string; count: number }[];
  onOpenTrip: (id: string, taskId?: string) => void;
}) {
  // Later starts collapsed to per-tail chips; the near bands preview a handful of rows.
  const [expanded, setExpanded] = useState(false);
  const { label, range } = bandLabel(band, nowMs, horizonDays);
  const loud = rows.filter(r => !r.quiet).length;

  const collapsedLater = band === 'later' && !expanded;
  const shown = collapsedLater ? [] : expanded ? rows : rows.slice(0, PREVIEW);
  const hidden = rows.length - shown.length;

  return (
    <div>
      <div className="flex items-baseline gap-2.5 px-3.5 pt-4 pb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {range} · {rows.length} trip{rows.length === 1 ? '' : 's'}
          {loud > 0 && loud < rows.length ? ` · ${loud} with work due` : ''}
        </span>
      </div>
      {shown.map(row => <Row key={row.trip.id} row={row} nowMs={nowMs} onOpenTrip={onOpenTrip} />)}
      {rows.length === 0 && <p className="text-xs text-muted-foreground px-3.5 py-2 border-t">Nothing here.</p>}
      {collapsedLater && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-3.5 py-2 border-t">
          {laterByTail?.map(({ tail, count }) => (
            <span key={tail} className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
              {tail} · {count} trip{count === 1 ? '' : 's'}
            </span>
          ))}
          <button onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--gfo-info,#2F80ED)] hover:underline">
            <ChevronRight className="h-3.5 w-3.5" /> Expand band
          </button>
        </div>
      )}
      {!collapsedLater && hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--gfo-info,#2F80ED)] border-t border-dashed py-1.5 hover:bg-accent transition-colors"
        >
          <ChevronDown className="h-3.5 w-3.5" /> {hidden} more
        </button>
      )}
    </div>
  );
}

/**
 * Horizon — the command center's home lens (D87): one forward time spine keyed by when work is
 * due. Today is its own band; quiet trips band by departure and stay muted; Later collapses to
 * per-tail chips. The overdue strip lives in the SHELL so it persists across every lens.
 * Clicking a row opens the trip drawer focused on its soonest action.
 */
export function HorizonView({ model, officeToday, nowMs, horizonDays, onOpenTrip, onOfficeAction }: {
  model: HorizonModel;
  officeToday: BoardTask[];
  nowMs: number;
  horizonDays: number;
  onOpenTrip: (tripId: string, taskId?: string) => void;
  onOfficeAction: (task: BoardTask, action: TaskAction) => void;
}) {
  const total = (['today', 'this-week', 'next-week', 'later'] as const).reduce((n, b) => n + model.bands[b].length, 0);

  return (
    <div className="flex flex-col gap-3">
      {officeToday.length > 0 && (
        <Card>
          <CardContent className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Office · due today</span>
            </div>
            {officeToday.map(task => (
              <div key={task.id} className="flex items-center gap-3 py-1.5 border-t first:border-t-0">
                <span className="text-sm flex-1 min-w-0 truncate">{task.title}</span>
                <TaskActionButtons instance={task} onAction={a => onOfficeAction(task, a)} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        {(['today', 'this-week', 'next-week', 'later'] as const).map(band => (
          <Band
            key={band}
            band={band}
            rows={model.bands[band]}
            nowMs={nowMs}
            horizonDays={horizonDays}
            laterByTail={band === 'later' ? model.laterByTail : undefined}
            onOpenTrip={onOpenTrip}
          />
        ))}
        <div className="pb-2" />
      </Card>

      {total === 0 && model.overdue.length === 0 && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
            {model.totalTrips === 0 ? <Inbox className="h-10 w-10 opacity-40" /> : <CheckCircle2 className="h-10 w-10 text-[var(--gfo-success,#00B140)] opacity-60" />}
            <p className="font-medium">{model.totalTrips === 0 ? 'No trips in this window — new trips arrive from myairops.' : 'Nothing coming up — all caught up.'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
