import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Clock, CalendarClock, CalendarDays, ChevronRight, CheckCircle2, Cloud, CloudDownload, RefreshCw, ClipboardList, Hammer } from 'lucide-react';
import { useTechLog, useCurrentUser, useDisplayZone } from '../TechLogContext';
import { formatRegulatoryCompact, type DisplayZoneMode } from '../util/displayZone';
import { useIntegration } from '../integration/useIntegration';
import type { CampForecastItem } from '../integration/campClient';
import { buildUpcomingBoard, createForecastCard, BUCKET_ORDER, type DueBucket, type UpcomingItem } from '../engine/upcomingBoard';
import { currentRows } from '../engine/supersede';
import { useRaiseFixFromDeferral } from '../useRectify';
import { newId } from '../util/id';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

const CAT_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  AD: 'destructive', SB: 'outline', INSPECTION: 'secondary', COMPONENT: 'outline', CHECK: 'outline',
};
const catVariant = (category?: string) =>
  category?.startsWith('MEL') ? 'secondary' : CAT_VARIANT[category ?? ''] ?? 'outline';

const SECTION: Record<DueBucket, { title: string; icon: React.ReactNode; accent?: string }> = {
  OVERDUE: { title: 'Overdue', icon: <AlertTriangle className="h-4 w-4 text-[var(--gfo-error-ink,#C81E2B)]" />, accent: 'border-[var(--gfo-error,#EF3340)]/50' },
  DUE_7D: { title: 'Due within 7 days', icon: <Clock className="h-4 w-4 text-[var(--gfo-warning-ink,#8A6200)]" />, accent: 'border-[var(--gfo-warning,#F1B434)]/50' },
  DUE_30D: { title: 'Due within 30 days', icon: <CalendarClock className="h-4 w-4" /> },
  HORIZON: { title: 'On the horizon (≤90 days)', icon: <CalendarDays className="h-4 w-4" /> },
};

function dueLabel(it: UpcomingItem, displayZone: DisplayZoneMode): string {
  const parts: string[] = [];
  if (it.dueDateUtc) {
    // D24: MEL repair-clock rows carry a governing zone and honor the display lens; CAMP/recurring
    // rows are external dates with no governing zone, so they render as plain local dates.
    const d = it.kind === 'DEFERRAL' && it.governingTimezone
      ? formatRegulatoryCompact(it.dueDateUtc, displayZone, it.governingTimezone)
      : new Date(it.dueDateUtc).toLocaleDateString();
    if (it.dueInDays != null && it.dueInDays < 0) parts.push(`${d} · overdue ${Math.abs(it.dueInDays)}d`);
    else if (it.dueInDays != null) parts.push(`${d} · ${it.dueInDays}d`);
    else parts.push(d);
  }
  if (it.dueHoursRemaining != null) parts.push(`${it.dueHoursRemaining}h left`);
  return parts.join(' · ');
}

export default function ComingDue() {
  const { state, dispatch } = useTechLog();
  const { displayZone } = useDisplayZone();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const integration = useIntegration();
  const raiseFix = useRaiseFixFromDeferral();
  const isMaint = user.role === 'MAINTENANCE';
  const now = new Date().toISOString();
  const [tailFilter, setTailFilter] = useState<string | null>(null);

  const dispatchable = state.aircraft.filter(a => !a.isProvisional);
  const forecastByAircraft = useMemo(
    () => Object.fromEntries(dispatchable.map(a => [a.id, integration.readForecast(a.id)])) as Record<string, CampForecastItem[]>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.aircraft],
  );
  const board = useMemo(() => buildUpcomingBoard(state, forecastByAircraft, now), [state, forecastByAircraft, now]);
  const total = BUCKET_ORDER.reduce((n, b) => n + board.totals[b], 0);
  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';

  const pullCard = (it: UpcomingItem) => {
    const item = (forecastByAircraft[it.aircraftId] ?? []).find(f => f.ref === it.refId);
    if (!item) return toast.error('CAMP returned no detail for that due-list item.');
    if (state.workCards.some(w => w.aircraftId === it.aircraftId && w.forecastRef === item.ref && w.status !== 'COMPLETED')) {
      return toast.error('That due-list item already has an open card.');
    }
    const nowUtc = new Date().toISOString();
    const card = createForecastCard(item, it.aircraftId, { cardId: newId('wc'), stepIds: [newId('st'), newId('st')] }, nowUtc);
    dispatch({ type: 'ADD_WORK_CARD', payload: card });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'WORKCARD_PULLED', entityType: 'WorkCard', entityId: card.id, atUtc: nowUtc, summary: `Pulled from CAMP due list ${item.ref} → ${card.cardNumber} (${it.tailNumber})` } });
    toast.success(`${card.cardNumber} ready to execute — ${item.description}.`);
    navigate(`/tech-log/work-cards/${card.id}`);
  };

  // Start the fix for a deferred item: raise a corrective card against the deferral's defect.
  const startFix = (it: UpcomingItem) => {
    const d = currentRows(state.deferrals).find(x => x.id === it.refId);
    if (!d) return toast.error('Deferral not found for that item.');
    raiseFix(d);
  };

  const rowNav = (it: UpcomingItem): (() => void) | null => {
    if (it.workCardId) return () => navigate(`/tech-log/work-cards/${it.workCardId}`);
    if (it.kind === 'DEFERRAL') return () => navigate(`/tech-log/aircraft/${tailOf(it.aircraftId)}?tab=deferrals`);
    if (it.kind === 'RECURRING_CHECK') return () => navigate(`/tech-log/aircraft/${tailOf(it.aircraftId)}?tab=overview`);
    return null; // forecast item without a card: the explicit Pull button is the only action
  };

  const Row = (it: UpcomingItem) => {
    const nav = rowNav(it);
    const body = (
      <>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{it.tailNumber}</span>
            <Badge variant={catVariant(it.category)}>{it.category}</Badge>
            {it.ataChapter && <Badge variant="outline">ATA {it.ataChapter}</Badge>}
            {it.grounding && <Badge variant="destructive">GROUNDING</Badge>}
          </div>
          <p className="mt-0.5 truncate text-sm">{it.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {dueLabel(it, displayZone)}
            {it.kind === 'DEFERRAL' ? ' · MEL repair clock' : it.kind === 'RECURRING_CHECK' ? ' · recurring check' : ' · CAMP due list'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {it.workCardId ? (
            <Button size="sm" variant="outline" className="h-7" onClick={e => { e.stopPropagation(); navigate(`/tech-log/work-cards/${it.workCardId}`); }}>
              <ClipboardList className="mr-1 h-3.5 w-3.5" /> Open {it.workCardNumber}
            </Button>
          ) : it.kind === 'CAMP_FORECAST' && isMaint ? (
            <Button size="sm" className="h-7" onClick={e => { e.stopPropagation(); pullCard(it); }}>
              <CloudDownload className="mr-1 h-3.5 w-3.5" /> Pull card from CAMP
            </Button>
          ) : it.kind === 'DEFERRAL' && isMaint ? (
            <Button size="sm" variant="outline" className="h-7" onClick={e => { e.stopPropagation(); startFix(it); }}>
              <Hammer className="mr-1 h-3.5 w-3.5" /> Start fix
            </Button>
          ) : nav ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null}
        </div>
      </>
    );
    // div, not <button>: rows can contain their own action Button and nested buttons are invalid DOM
    return (
      <div
        key={it.key}
        onClick={nav ?? undefined}
        role={nav ? 'button' : undefined}
        tabIndex={nav ? 0 : undefined}
        onKeyDown={nav ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(); } } : undefined}
        className={`flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left text-sm ${nav ? 'cursor-pointer hover:bg-accent/40' : ''}`}
      >
        {body}
      </div>
    );
  };

  return (
    <TechLogShell
      title="Coming Due — All Maintenance"
      subtitle="CAMP due list, MEL repair clocks, and recurring checks in one place — with the work card to do it."
      actions={
        <Button size="sm" variant="outline" onClick={() => dispatchable.forEach(a => integration.refreshAirworthiness(a.id))}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh from CAMP
        </Button>
      }
    >
      <Card className="mb-3 border-muted-foreground/30">
        <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
          <Cloud className="h-4 w-4 shrink-0" /> Due-list rows are a read-only view of <strong>CAMP</strong> (sandbox/mock in this demo) — CAMP stays the system of record. MEL repair clocks and recurring checks are derived by myGFO from the signed ledger.
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {board.perAircraft.map(a => (
            <button
              key={a.aircraftId}
              onClick={() => setTailFilter(t => (t === a.aircraftId ? null : a.aircraftId))}
              className={`rounded-md border p-2 text-left transition-colors hover:bg-accent/40 ${tailFilter === a.aircraftId ? 'border-primary bg-accent/40' : ''}`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">{a.tailNumber}</span>
                <span className="text-[11px] text-muted-foreground">{a.total} due</span>
              </div>
              <div className="mt-1 flex gap-3 text-sm font-semibold tabular-nums">
                <span className={a.counts.OVERDUE ? 'text-[var(--gfo-error-ink,#C81E2B)]' : 'text-muted-foreground/50'}>{a.counts.OVERDUE} over</span>
                <span className={a.counts.DUE_7D ? 'text-[var(--gfo-warning-ink,#8A6200)]' : 'text-muted-foreground/50'}>{a.counts.DUE_7D} ·7d</span>
                <span className={a.counts.DUE_30D ? '' : 'text-muted-foreground/50'}>{a.counts.DUE_30D} ·30d</span>
              </div>
            </button>
          ))}
        </div>

        {BUCKET_ORDER.map(bucket => {
          const items = board.buckets[bucket].filter(i => !tailFilter || i.aircraftId === tailFilter);
          return (
            <Card key={bucket} className={SECTION[bucket].accent}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {SECTION[bucket].icon} {SECTION[bucket].title}
                  <Badge variant={items.length ? 'secondary' : 'outline'}>{items.length}</Badge>
                  {tailFilter && <span className="text-xs font-normal text-muted-foreground">· {tailOf(tailFilter)} only</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.length === 0 ? <p className="text-sm text-muted-foreground">Nothing here.</p> : items.map(Row)}
              </CardContent>
            </Card>
          );
        })}

        {total === 0 && (
          <Card className="border-[var(--gfo-success,#00B140)]/40">
            <CardContent className="flex items-center gap-2 p-4 text-sm text-[var(--gfo-success-ink,#00803A)]">
              <CheckCircle2 className="h-4 w-4" /> Nothing coming due in the next 90 days.
            </CardContent>
          </Card>
        )}
      </div>
    </TechLogShell>
  );
}
