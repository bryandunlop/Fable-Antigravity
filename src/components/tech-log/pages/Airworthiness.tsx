import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge, ClipboardList, RefreshCw, Cloud, Info, History } from 'lucide-react';
import { useTechLog } from '../TechLogContext';
import { useIntegration } from '../integration/useIntegration';
import { WO_HEADER_STATUS } from '../integration/campTaxonomy';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

// The 'forecast' view moved to ComingDue.tsx — the cross-fleet board merging the CAMP
// due list with myGFO's MEL repair clocks and recurring checks (same route).
type View = 'times' | 'adsb' | 'workorders';
const TITLES: Record<View, { title: string; subtitle: string }> = {
  times: { title: 'Aircraft Times', subtitle: 'Airframe / engine / APU times from CAMP (stored as minutes, shown in hours).' },
  adsb: { title: 'AD / SB Compliance', subtitle: 'Airworthiness directives & service bulletins from CAMP.' },
  workorders: { title: 'Work Orders', subtitle: 'CAMP work orders pulled into myGFO, by status.' },
};

const DAY = 86400000;

export default function Airworthiness({ view }: { view: View }) {
  const { state } = useTechLog();
  const navigate = useNavigate();
  const integration = useIntegration();
  const dispatchable = state.aircraft.filter(a => !a.isProvisional);
  const [tail, setTail] = useState(dispatchable[0]?.tailNumber ?? '');
  const ac = state.aircraft.find(a => a.tailNumber === tail) ?? dispatchable[0];
  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';
  const now = Date.now();

  const times = useMemo(() => (ac ? integration.readComponentTimes(ac.id) : null), [ac]);
  const adsb = useMemo(() => (ac ? integration.readAdSb(ac.id) : { items: [], unconfirmed: true, openQuestion: '' }), [ac]);
  const workOrders = useMemo(() => state.workCards.slice().sort((a, b) => a.headerStatusCode - b.headerStatusCode), [state.workCards]);
  const closedWos = useMemo(() => view === 'workorders' ? dispatchable.flatMap(a => integration.readClosedWorkOrders(a.id).map(w => ({ ...w, tail: a.tailNumber }))) : [], [view]);

  const perAircraft = view !== 'workorders';

  return (
    <TechLogShell
      title={TITLES[view].title}
      subtitle={TITLES[view].subtitle}
      actions={
        perAircraft ? (
          <div className="flex items-center gap-2">
            <Select value={tail} onValueChange={(v: string) => setTail(v)}>
              <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>{dispatchable.map(a => <SelectItem key={a.id} value={a.tailNumber}>{a.tailNumber}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => ac && integration.refreshAirworthiness(ac.id)}><RefreshCw className="mr-1.5 h-4 w-4" /> Refresh from CAMP</Button>
          </div>
        ) : undefined
      }
    >
      <Card className="mb-3 border-muted-foreground/30">
        <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
          <Cloud className="h-4 w-4" /> Read-only view of <strong>CAMP</strong> data (sandbox/mock in this demo). myGFO does not author these records — it presents CAMP's data through a cleaner UI and pushes defects/utilization back.
        </CardContent>
      </Card>

      {/* ===== TIMES ===== */}
      {view === 'times' && times && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Gauge className="h-4 w-4" /> {tail} component times</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {[
              { label: 'Airframe', h: times.airframe.hours, c: times.airframe.cycles },
              { label: 'Engine 1', h: times.eng1.hours, c: times.eng1.cycles },
              { label: 'Engine 2', h: times.eng2.hours, c: times.eng2.cycles },
              { label: 'APU', h: times.apu.hours, c: undefined },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between border-b py-2 last:border-0">
                <span className="font-medium">{r.label}</span>
                <span className="tabular-nums text-muted-foreground">{r.h} h{r.c != null ? ` · ${r.c} cyc` : ''}</span>
              </div>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">CAMP stores time in minutes; converted ÷60 at the boundary. Airframe reconciles with the myGFO journey log.</p>
          </CardContent>
        </Card>
      )}

      {/* ===== AD/SB ===== */}
      {view === 'adsb' && ac && (
        <div className="space-y-2">
          <Card className="border-[var(--gfo-warning,#F1B434)]/40">
            <CardContent className="flex items-start gap-2 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                {adsb.unconfirmed && <Badge variant="outline" className="border-[var(--gfo-warning,#F1B434)] text-[var(--gfo-warning-ink,#8A6200)]">OQ: CAMP read function unconfirmed</Badge>}
                <div>The CAMP read function for AD/SB status is not in the GEN/STA/WRK integration docs — treat as an <strong>Open Question</strong> to confirm before wiring the real read. Data below is mock.</div>
              </div>
            </CardContent>
          </Card>
          {adsb.items.map(it => {
            const days = it.nextDueUtc ? Math.floor((new Date(it.nextDueUtc).getTime() - now) / DAY) : null;
            return (
              <Card key={it.id}>
                <CardContent className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={it.kind === 'AD' ? 'destructive' : 'outline'}>{it.kind}</Badge>
                      <span className="font-mono text-sm font-medium">{it.id}</span>
                      <Badge variant="outline">ATA {it.ata}</Badge>
                      <Badge variant="outline">{it.recurrence === 'RECURRING' ? 'recurring' : 'one-time'}</Badge>
                      <Badge variant={it.status === 'OPEN' ? 'secondary' : 'outline'}>{it.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{it.subject}</p>
                  </div>
                  {it.nextDueUtc && <div className="shrink-0 text-right text-sm text-muted-foreground">next due {new Date(it.nextDueUtc).toLocaleDateString()}{days != null ? ` · ${days}d` : ''}</div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== WORK ORDERS ===== */}
      {view === 'workorders' && (
        <div className="space-y-2">
          {workOrders.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No work orders pulled. Pull one from CAMP on an aircraft's Work Cards tab.</CardContent></Card>}
          {workOrders.map(w => (
            <Card key={w.id} className="cursor-pointer transition-colors hover:bg-accent/40" onClick={() => navigate(`/tech-log/work-cards/${w.id}`)}>
              <CardContent className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{w.woNumber ?? w.cardNumber}</span>
                  <span className="font-semibold">{tailOf(w.aircraftId)}</span>
                  <Badge variant="outline">ATA {w.ataChapter}</Badge>
                  <span className="text-muted-foreground">{w.title}</span>
                </div>
                <Badge variant={w.headerStatusCode === 0 ? 'outline' : 'secondary'}>{WO_HEADER_STATUS[w.headerStatusCode] ?? w.headerStatusCode}</Badge>
              </CardContent>
            </Card>
          ))}
          {closedWos.length > 0 && (
            <Card className="mt-2">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Closed work orders (CAMP history)</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {closedWos.map((w, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 border-b py-1 text-xs last:border-0">
                    <span><span className="font-mono">{w.woNumber}</span> · {w.tail} · ATA {w.ata} — {w.title}</span>
                    <span className="text-muted-foreground">{new Date(w.closedDateUtc).toLocaleDateString()} · {WO_HEADER_STATUS[w.headerStatusCode] ?? w.headerStatusCode}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </TechLogShell>
  );
}
