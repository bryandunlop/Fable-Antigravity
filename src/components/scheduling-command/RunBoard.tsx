import { AlertTriangle, ArrowRight, Check, CheckCheck, OctagonAlert, CheckCircle2, Inbox, CalendarClock, Clock, Building2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { BoardTrip } from './adapter';
import { type RunBoardModel, type RunGroup, type RunTask } from './runBoardSelectors';
import { TRIP_STATUS_STYLES } from './tripStatus';
import type { TaskAction } from '../../scheduling/engine/tasks';

const GROUP_META: Record<RunGroup, { label: string; icon: React.ElementType; accent: string }> = {
  blocked: { label: 'Blocked', icon: OctagonAlert, accent: 'text-rose-600 bg-rose-50' },
  overdue: { label: 'Overdue', icon: AlertTriangle, accent: 'text-rose-600 bg-rose-50' },
  'due-today': { label: 'Due today', icon: Clock, accent: 'text-amber-600 bg-amber-50' },
  'next-48': { label: 'Coming up', icon: CalendarClock, accent: 'text-blue-600 bg-blue-50' },
};
const GROUP_ORDER: RunGroup[] = ['blocked', 'overdue', 'due-today', 'next-48'];

export type FunnelFilter = 'blocked' | 'inWork' | 'ready' | 'uninteracted';

/**
 * Cross-trip task inbox on the REAL task engine: funnel strip of trip states over the horizon,
 * then BLOCKED / OVERDUE / DUE TODAY / upcoming groups mixing per-trip and recurring office tasks.
 * Actions dispatch engine TaskActions (start/ack/complete/block/unblock) via the service — the
 * engine enforces ack-before-complete; the UI just surfaces the right button.
 */
export function RunBoard({
  model,
  trips,
  funnelFilters,
  onToggleFunnel,
  onAction,
  onRowClick,
}: {
  model: RunBoardModel;
  trips: BoardTrip[];
  funnelFilters: Set<FunnelFilter>;
  onToggleFunnel: (f: FunnelFilter) => void;
  onAction: (task: RunTask, action: TaskAction) => void;
  onRowClick: (task: RunTask) => void;
}) {
  const tripOf = new Map(trips.map(t => [t.tripNumber, t]));

  const funnelChips: { key: FunnelFilter; label: string; count: number; dot: string }[] = [
    { key: 'blocked', label: 'Blocked', count: model.funnel.blocked, dot: TRIP_STATUS_STYLES.blocked.dot },
    { key: 'inWork', label: 'In work', count: model.funnel.inWork, dot: TRIP_STATUS_STYLES['on-track'].dot },
    { key: 'ready', label: 'Ready', count: model.funnel.ready, dot: TRIP_STATUS_STYLES.ready.dot },
    { key: 'uninteracted', label: 'Untouched', count: model.funnel.uninteracted, dot: TRIP_STATUS_STYLES.uninteracted.dot },
  ];

  const matchesFunnel = (row: RunTask): boolean => {
    if (funnelFilters.size === 0 || row.office) return true;
    const trip = row.tripNumber ? tripOf.get(row.tripNumber) : undefined;
    if (!trip) return true;
    const isBlocked = !!trip.criticalBlocker;
    const isReady = trip.readinessScore === 100;
    const isUntouched = trip.readinessScore === 0 && !isBlocked;
    if (funnelFilters.has('blocked') && isBlocked) return true;
    if (funnelFilters.has('ready') && isReady) return true;
    if (funnelFilters.has('uninteracted') && isUntouched) return true;
    if (funnelFilters.has('inWork') && !isBlocked && !isReady && !isUntouched) return true;
    return false;
  };

  const totalShown = GROUP_ORDER.reduce((n, g) => n + model.groups[g].filter(matchesFunnel).length, 0);

  const actionBtn = (row: RunTask, action: TaskAction, label: string, Icon: React.ElementType, tone: string) => (
    <button key={label} onClick={() => onAction(row, action)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all active:scale-95 ${tone}`}>
      <Icon className="h-3 w-3" /> {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Funnel strip — trip states over the horizon; chips toggle-filter the task groups below */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">Trips in horizon · {model.funnel.total}</span>
        {funnelChips.map(c => (
          <button key={c.key} onClick={() => onToggleFunnel(c.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${funnelFilters.has(c.key) ? 'border-slate-900 bg-slate-900 text-white shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}>
            <span className={`w-2 h-2 rounded-full ${c.dot}`} />
            {c.label}
            <span className={funnelFilters.has(c.key) ? 'text-white' : 'text-slate-400'}>{c.count}</span>
          </button>
        ))}
      </div>

      {GROUP_ORDER.map(g => {
        const meta = GROUP_META[g];
        const rows = model.groups[g].filter(matchesFunnel);
        const Icon = meta.icon;
        return (
          <div key={g} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <span className={`p-2 rounded-xl ${meta.accent}`}><Icon className="h-4 w-4" /></span>
              <h3 className="text-lg font-black tracking-tight text-slate-900">{meta.label}</h3>
              <Badge className={`${rows.length ? meta.accent : 'bg-slate-100 text-slate-400'} font-black`}>{rows.length}</Badge>
            </div>
            {rows.length === 0 ? (
              <p className="px-6 py-5 text-sm font-bold text-slate-400">Nothing here.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map(row => {
                  const t = row.task;
                  const ackPending = t.requiresAck && t.ackState === 'pending';
                  return (
                    <div key={row.key} className="px-6 py-3.5 flex flex-wrap items-center gap-3 hover:bg-slate-50 transition-colors">
                      <button onClick={() => onRowClick(row)} className="flex-1 min-w-[240px] text-left group" disabled={row.office}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-bold text-sm text-slate-900 transition-colors ${row.office ? '' : 'group-hover:text-blue-600'}`}>{t.title}</span>
                          {ackPending && <Badge className="bg-amber-500 text-white text-[8px] px-1.5 h-4 font-black">ACK REQUIRED</Badge>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
                          {row.office ? (
                            <Badge className="bg-slate-800 text-white text-[9px] px-1.5 font-black"><Building2 className="h-2.5 w-2.5 mr-1" />OFFICE</Badge>
                          ) : (
                            <>
                              <span className="font-black text-slate-700">{row.tripNumber}</span>
                              <span>·</span><span>{row.route}</span>
                              <Badge className="bg-slate-100 text-slate-600 text-[9px] px-1.5 font-black">{row.tail}</Badge>
                            </>
                          )}
                          <span className="text-slate-400">{t.ownerRole}</span>
                          <span className={`font-black ${g === 'overdue' || g === 'blocked' ? 'text-rose-600' : g === 'due-today' ? 'text-amber-600' : 'text-blue-600'}`}>{row.dueLabel}</span>
                        </div>
                        {t.notes && (
                          <p className={`text-[11px] mt-1 ${t.status === 'blocked' ? 'text-rose-700 font-bold' : 'text-slate-500 italic'}`}>"{t.notes}"</p>
                        )}
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.status === 'blocked' && actionBtn(row, { kind: 'unblock' }, 'Unblock', ArrowRight, 'bg-blue-50 text-blue-600 hover:bg-blue-100')}
                        {t.status === 'open' && actionBtn(row, { kind: 'start' }, 'Start', ArrowRight, 'bg-blue-50 text-blue-600 hover:bg-blue-100')}
                        {(t.status === 'open' || t.status === 'in_progress') && ackPending &&
                          actionBtn(row, { kind: 'ack' }, 'Ack', CheckCheck, 'bg-amber-50 text-amber-600 hover:bg-amber-100')}
                        {(t.status === 'open' || t.status === 'in_progress') && !ackPending &&
                          actionBtn(row, { kind: 'complete' }, 'Complete', Check, 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')}
                        {(t.status === 'open' || t.status === 'in_progress') &&
                          actionBtn(row, { kind: 'block', reason: 'Issue flagged from run board' }, 'Flag', OctagonAlert, 'bg-rose-50 text-rose-500 hover:bg-rose-100')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {totalShown === 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 flex flex-col items-center gap-3 text-slate-400">
          {model.funnel.total === 0 ? <Inbox className="h-12 w-12 text-slate-300" /> : <CheckCircle2 className="h-12 w-12 text-emerald-300" />}
          <p className="font-black text-slate-500">{model.funnel.total === 0 ? 'No trips in this horizon.' : 'All caught up — nothing due.'}</p>
        </div>
      )}
    </div>
  );
}
