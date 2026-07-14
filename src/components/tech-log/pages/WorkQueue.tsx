import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, AlertTriangle, Wrench, Clock, CalendarClock, ClipboardList, ChevronRight, CheckCircle2, UserCheck, Eye } from 'lucide-react';
import { useTechLog, useCurrentUser, useDisplayZone } from '../TechLogContext';
import { formatRegulatoryCompact } from '../util/displayZone';
import { currentRows } from '../engine/supersede';
import { buildWorkQueue } from '../engine/workqueue';
import { deriveServiceability } from '../engine/serviceability';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

const STATUS_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  OPEN: 'destructive', DEFERRED: 'secondary', RECTIFIED: 'outline', CLOSED: 'outline', WATCHLISTED: 'secondary',
};

export default function WorkQueue() {
  const { state } = useTechLog();
  const { displayZone } = useDisplayZone();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const isMaint = user.role === 'MAINTENANCE';
  const now = new Date().toISOString();
  const [riiOnly, setRiiOnly] = useState(false);
  const isRii = (w: { riiRequired: boolean; steps: { riiRequired?: boolean }[] }) => w.riiRequired || w.steps.some(s => s.riiRequired);

  const wq = useMemo(() => buildWorkQueue(state, now), [state, now]);
  // Glanceable fleet strip: the landing page answers "what's the state of the world"
  // (counts) above "what needs me" (the queue). Cards deep-link to the filtered board.
  const fleetCounts = useMemo(() => {
    const c = { RED: 0, AMBER: 0, GREEN: 0, PROV: 0 };
    for (const ac of state.aircraft) {
      if (ac.isProvisional) { c.PROV++; continue; }
      c[deriveServiceability(ac.id, state, now).status]++;
    }
    return c;
  }, [state, now]);
  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';
  const melOf = (id: string) => state.melItems.find(m => m.id === id);
  const open = (tail: string, q = '') => navigate(`/tech-log/aircraft/${tail}${q}`);

  // ── PILOT lens: "my reported squawks + status back" ──
  if (!isMaint) {
    const mine = currentRows(state.defects)
      .filter(d => d.reportedByOid === user.oid)
      .sort((a, b) => b.reportedAtUtc.localeCompare(a.reportedAtUtc));
    return (
      <TechLogShell title="Work Queue" subtitle="Squawks you reported and where maintenance has taken them.">
        <div className="space-y-3">
          {mine.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">You haven't reported any squawks. Report one from an aircraft's workspace.</CardContent></Card>}
          {mine.map(d => (
            <Card key={d.id} className="cursor-pointer transition-colors hover:bg-accent/40" onClick={() => open(tailOf(d.aircraftId), '?tab=defects')}>
              <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{tailOf(d.aircraftId)}</span>
                    <Badge variant="outline">ATA {d.ataChapter}</Badge>
                    <Badge variant={STATUS_VARIANT[d.status]}>{d.status === 'OPEN' ? 'AWAITING TRIAGE' : d.status === 'DEFERRED' ? 'DEFERRED (MEL)' : d.status === 'RECTIFIED' ? 'RECTIFIED' : d.status}</Badge>
                  </div>
                  <p className="mt-1">{d.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Reported {new Date(d.reportedAtUtc).toLocaleString()}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      </TechLogShell>
    );
  }

  // ── MAINTENANCE lens: the full cross-aircraft queue ──
  const Section = ({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base">{icon} {title} <Badge variant={count ? 'secondary' : 'outline'}>{count}</Badge></CardTitle></CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
  const Row = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left text-sm hover:bg-accent/40">
      <div className="min-w-0">{children}</div><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
  const empty = <p className="text-sm text-muted-foreground">Nothing here.</p>;

  return (
    <TechLogShell
      title="Work Queue"
      subtitle={`Everything that needs a human across the fleet · ${wq.counts.urgent} urgent`}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {([
            ['Grounded', fleetCounts.RED, 'RED', 'text-[var(--gfo-error,#EF3340)]'],
            ['MEL / restricted', fleetCounts.AMBER, 'AMBER', 'text-[var(--gfo-warning,#F1B434)]'],
            ['Serviceable', fleetCounts.GREEN, 'GREEN', 'text-[var(--gfo-success,#00B140)]'],
            ['Provisional', fleetCounts.PROV, 'PROV', 'text-muted-foreground'],
          ] as const).map(([label, n, f, cls]) => (
            <button key={f} onClick={() => navigate(`/tech-log/fleet?filter=${f}`)}
              className="rounded-md border p-2 text-left transition-colors hover:bg-accent/40">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className={`text-lg font-semibold ${cls}`}>{n}</div>
            </button>
          ))}
        </div>

        <Section icon={<Inbox className="h-4 w-4" />} title="New squawks — awaiting triage" count={wq.counts.newSquawks}>
          {wq.newSquawks.length === 0 ? empty : wq.newSquawks.map(d => (
            <Row key={d.id} onClick={() => open(tailOf(d.aircraftId), '?tab=defects')}>
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{tailOf(d.aircraftId)}</span><Badge variant="outline">ATA {d.ataChapter}</Badge><span className="text-xs text-muted-foreground">{d.severity} · {d.source}</span></div>
              <p className="mt-0.5 truncate">{d.description}</p>
            </Row>
          ))}
        </Section>

        <Section icon={<AlertTriangle className="h-4 w-4" />} title="Pending (M)/placard release — still grounded" count={wq.counts.pendingPlacard}>
          {wq.pendingPlacard.length === 0 ? empty : wq.pendingPlacard.map(d => (
            <Row key={d.id} onClick={() => open(tailOf(d.aircraftId), `?tab=deferrals&deferral=${d.id}&gating=1`)}>
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{tailOf(d.aircraftId)}</span><Badge variant="outline">MEL {melOf(d.melItemId)?.subItemNumber ?? '—'}</Badge><Badge variant="destructive">PENDING_PLACARD</Badge></div>
              <p className="mt-0.5 truncate text-muted-foreground">{melOf(d.melItemId)?.title} — sign the (M)/placard release to dispatch.</p>
            </Row>
          ))}
        </Section>

        <Section icon={<Clock className="h-4 w-4" />} title="Deferrals due / overdue" count={wq.counts.deferralsDue}>
          {wq.deferralsDue.length === 0 ? empty : wq.deferralsDue.map(({ deferral: d, dueState }) => (
            <Row key={d.id} onClick={() => open(tailOf(d.aircraftId), '?tab=deferrals')}>
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{tailOf(d.aircraftId)}</span><Badge variant="outline">MEL {melOf(d.melItemId)?.subItemNumber ?? '—'}</Badge><Badge variant={dueState === 'EXPIRED' ? 'destructive' : 'secondary'}>{dueState === 'EXPIRED' ? 'OVERDUE' : 'DUE SOON'}</Badge></div>
              <p className="mt-0.5 truncate text-muted-foreground">{d.repairDueDateUtc ? `due ${formatRegulatoryCompact(d.repairDueDateUtc, displayZone, d.governingTimezone)}` : ''} · {melOf(d.melItemId)?.title}</p>
            </Row>
          ))}
        </Section>

        <Section icon={<CalendarClock className="h-4 w-4" />} title="Expired recurring checks — grounding" count={wq.counts.expiredChecks}>
          {wq.expiredChecks.length === 0 ? empty : wq.expiredChecks.map(({ aircraftId, check }) => (
            <Row key={check.id} onClick={() => open(tailOf(aircraftId), '?tab=overview')}>
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{tailOf(aircraftId)}</span><Badge variant="destructive">EXPIRED</Badge></div>
              <p className="mt-0.5 truncate text-muted-foreground">{check.name} — accomplish &amp; sign to restore dispatch.</p>
            </Row>
          ))}
        </Section>

        <Section icon={<Eye className="h-4 w-4" />} title="Watch items — tracked, non-airworthiness" count={wq.counts.watchItems}>
          {wq.watchItems.length === 0 ? empty : wq.watchItems.map(d => (
            <Row key={d.id} onClick={() => open(tailOf(d.aircraftId), '?tab=defects')}>
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{tailOf(d.aircraftId)}</span><Badge variant="outline">ATA {d.ataChapter}</Badge><Badge variant="secondary"><Eye className="mr-1 h-3 w-3" />WATCH</Badge><span className="text-xs text-muted-foreground">{d.source}</span></div>
              <p className="mt-0.5 truncate text-muted-foreground">{d.description} · reported {new Date(d.reportedAtUtc).toLocaleDateString()}</p>
            </Row>
          ))}
        </Section>

        <Section icon={<ClipboardList className="h-4 w-4" />} title="Open work cards" count={(riiOnly ? wq.openWorkCards.filter(isRii) : wq.openWorkCards).length}>
          <div className="mb-1 flex justify-end">
            <Button size="sm" variant={riiOnly ? 'default' : 'outline'} className="h-7" onClick={() => setRiiOnly(v => !v)}>
              <UserCheck className="mr-1 h-3.5 w-3.5" /> RII only
            </Button>
          </div>
          {(() => {
            const cards = riiOnly ? wq.openWorkCards.filter(isRii) : wq.openWorkCards;
            return cards.length === 0 ? empty : cards.map(w => (
              <Row key={w.id} onClick={() => navigate(`/tech-log/work-cards/${w.id}`)}>
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{w.cardNumber}</span><span className="font-semibold">{tailOf(w.aircraftId)}</span><Badge variant="outline">ATA {w.ataChapter}</Badge><Badge variant={w.status === 'IN_WORK' ? 'secondary' : 'destructive'}>{w.status}</Badge>{isRii(w) && <Badge variant="outline"><UserCheck className="mr-1 h-3 w-3" />RII</Badge>}</div>
                <p className="mt-0.5 truncate text-muted-foreground">{w.title} · steps {w.steps.filter(s => s.done).length}/{w.steps.length}</p>
              </Row>
            ));
          })()}
        </Section>

        {wq.counts.urgent === 0 && (
          <Card className="border-[var(--gfo-success,#00B140)]/40">
            <CardContent className="flex items-center gap-2 p-4 text-sm text-[var(--gfo-success,#00B140)]"><CheckCircle2 className="h-4 w-4" /> Nothing urgent — the fleet is caught up.</CardContent>
          </Card>
        )}
      </div>
    </TechLogShell>
  );
}
