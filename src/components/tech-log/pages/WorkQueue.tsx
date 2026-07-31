import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatReferences } from '../engine/workCardReferences';
import { Inbox, AlertTriangle, Clock, CalendarClock, ClipboardList, ChevronRight, CheckCircle2, UserCheck, Eye } from 'lucide-react';
import { useTechLog, useCurrentUser, useDisplayZone } from '../TechLogContext';
import { formatRegulatoryCompact } from '../util/displayZone';
import { DEFAULT_GOVERNING_TIMEZONE } from '../engine/pl25';
import { currentRows } from '../engine/supersede';
import { buildWorkQueue } from '../engine/workqueue';
import { deriveServiceability } from '../engine/serviceability';
import { TechLogShell } from '../components/TechLogShell';
import { CasChip } from '../components/CasChip';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';

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
  // D68 — RII is a card-level flag now. It used to be `card.riiRequired || any step flagged RII`;
  // with steps gone the card flag is the whole answer.
  const isRii = (w: { riiRequired: boolean }) => w.riiRequired;

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
                    <CasChip message={d.casMessage} color={d.casColor} observed={d.casObserved} />
                  </div>
                  <p className="mt-1">{d.description}</p>
                  {/* D56: the triage queue is where a defect gets deferred, so the occurrence time —
                      the instant that seeds the PL-25 clock — has to be visible here. */}
                  <p className="mt-0.5 text-xs text-muted-foreground">Noticed {formatRegulatoryCompact(d.occurredAtUtc, displayZone, DEFAULT_GOVERNING_TIMEZONE)} · reported {formatRegulatoryCompact(d.reportedAtUtc, displayZone, DEFAULT_GOVERNING_TIMEZONE)}</p>
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
  // D42: an empty section is noise — the band already says "nothing here" once. Rendering six
  // "Nothing here." cards made the queue longer the emptier it got. `keep` overrides this for the
  // work-card section, whose RII filter must stay reachable when it filters everything out.
  const Section = ({ icon, title, count, keep, children }: { icon: React.ReactNode; title: string; count: number; keep?: boolean; children: React.ReactNode }) => {
    if (!count && !keep) return null;
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base">{icon} {title} <Badge variant={count ? 'secondary' : 'outline'}>{count}</Badge></CardTitle></CardHeader>
        <CardContent className="space-y-2">{children}</CardContent>
      </Card>
    );
  };
  // D42: every row says what it will take you to do, so the queue reads as a list of next actions
  // rather than a list of records that happen to be clickable.
  const Row = ({ onClick, next, children }: { onClick: () => void; next?: string; children: React.ReactNode }) => (
    <button onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left text-sm hover:bg-accent/40">
      <div className="min-w-0">{children}</div>
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        {next}<ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
  const empty = <p className="text-sm text-muted-foreground">Nothing here.</p>;

  // D42: three priority bands. Previously six equal-weight sections gave no reading order, so
  // "grounding the fleet right now" sat visually level with "tracked, non-airworthiness".
  const Band = ({ title, hint, count, tone, children }: {
    title: string; hint: string; count: number; tone: 'stop' | 'soon' | 'track'; children: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2 border-b pb-1">
        <span className={cn('text-sm font-semibold',
          tone === 'stop' ? 'text-[var(--gfo-error,#EF3340)]'
          : tone === 'soon' ? 'text-[var(--gfo-warning,#F1B434)]'
          : 'text-muted-foreground')}>{title}</span>
        <Badge variant={count ? 'secondary' : 'outline'}>{count}</Badge>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      {children}
    </div>
  );

  // An open airworthiness-affecting defect grounds by default; a non-affecting one does not.
  const groundingSquawks = wq.newSquawks.filter(d => d.airworthinessAffecting !== false);
  const otherSquawks = wq.newSquawks.filter(d => d.airworthinessAffecting === false);
  const overdueDeferrals = wq.deferralsDue.filter(x => x.dueState === 'EXPIRED');
  const soonDeferrals = wq.deferralsDue.filter(x => x.dueState !== 'EXPIRED');
  const stopCount = groundingSquawks.length + wq.counts.pendingPlacard + wq.counts.expiredChecks + overdueDeferrals.length;
  const soonCount = soonDeferrals.length + otherSquawks.length;

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

        {/* ── Band 1: holding aircraft on the ground right now ── */}
        <Band title="Grounding the fleet now" hint="these tails cannot dispatch until cleared" count={stopCount} tone="stop">
          {stopCount === 0 && <p className="text-sm text-muted-foreground">Nothing is grounding the fleet.</p>}

          <Section icon={<Inbox className="h-4 w-4" />} title="New squawks — awaiting triage" count={groundingSquawks.length}>
            {groundingSquawks.length === 0 ? empty : groundingSquawks.map(d => (
              <Row key={d.id} next="Defer or fix" onClick={() => open(tailOf(d.aircraftId), '?tab=defects')}>
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{tailOf(d.aircraftId)}</span><Badge variant="outline">ATA {d.ataChapter}</Badge><CasChip message={d.casMessage} color={d.casColor} observed={d.casObserved} /><span className="text-xs text-muted-foreground">{d.source}</span></div>
                <p className="mt-0.5 truncate">{d.description}</p>
              </Row>
            ))}
          </Section>

          <Section icon={<AlertTriangle className="h-4 w-4" />} title="Pending (M)/placard release — still grounded" count={wq.counts.pendingPlacard}>
            {wq.pendingPlacard.length === 0 ? empty : wq.pendingPlacard.map(d => (
              <Row key={d.id} next="Sign the release" onClick={() => open(tailOf(d.aircraftId), `?tab=deferrals&deferral=${d.id}&gating=1`)}>
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{tailOf(d.aircraftId)}</span><Badge variant="outline">MEL {d.melSubItemNumber ?? 'not recorded'}</Badge><Badge variant="destructive">PENDING_PLACARD</Badge></div>
                <p className="mt-0.5 truncate text-muted-foreground">{d.melTitle ?? 'MEL item not recorded'} — sign the (M)/placard release to dispatch.</p>
              </Row>
            ))}
          </Section>

          <Section icon={<Clock className="h-4 w-4" />} title="Deferrals overdue — re-grounded" count={overdueDeferrals.length}>
            {overdueDeferrals.length === 0 ? empty : overdueDeferrals.map(({ deferral: d }) => (
              <Row key={d.id} next="Rectify to clear" onClick={() => open(tailOf(d.aircraftId), '?tab=deferrals')}>
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{tailOf(d.aircraftId)}</span><Badge variant="outline">MEL {d.melSubItemNumber ?? 'not recorded'}</Badge><Badge variant="destructive">OVERDUE</Badge></div>
                <p className="mt-0.5 truncate text-muted-foreground">{d.repairDueDateUtc ? `due ${formatRegulatoryCompact(d.repairDueDateUtc, displayZone, d.governingTimezone)}` : ''} · {d.melTitle ?? 'MEL item not recorded'}</p>
              </Row>
            ))}
          </Section>

          <Section icon={<CalendarClock className="h-4 w-4" />} title="Expired recurring checks" count={wq.counts.expiredChecks}>
            {wq.expiredChecks.length === 0 ? empty : wq.expiredChecks.map(({ aircraftId, check }) => (
              <Row key={check.id} next="Accomplish & sign" onClick={() => open(tailOf(aircraftId), '?tab=workspace')}>
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{tailOf(aircraftId)}</span><Badge variant="destructive">EXPIRED</Badge></div>
                <p className="mt-0.5 truncate text-muted-foreground">{check.name} — accomplish &amp; sign to restore dispatch.</p>
              </Row>
            ))}
          </Section>
        </Band>

        {/* ── Band 2: not grounding yet, but on a clock ── */}
        <Band title="On a clock" hint="dispatchable today, grounding if it runs out" count={soonCount} tone="soon">
          {soonCount === 0 && <p className="text-sm text-muted-foreground">Nothing due soon.</p>}

          <Section icon={<Clock className="h-4 w-4" />} title="Deferrals due soon" count={soonDeferrals.length}>
            {soonDeferrals.length === 0 ? empty : soonDeferrals.map(({ deferral: d }) => (
              <Row key={d.id} next="Rectify or extend" onClick={() => open(tailOf(d.aircraftId), '?tab=deferrals')}>
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{tailOf(d.aircraftId)}</span><Badge variant="outline">MEL {d.melSubItemNumber ?? 'not recorded'}</Badge><Badge variant="secondary">DUE SOON</Badge></div>
                <p className="mt-0.5 truncate text-muted-foreground">{d.repairDueDateUtc ? `due ${formatRegulatoryCompact(d.repairDueDateUtc, displayZone, d.governingTimezone)}` : ''} · {d.melTitle ?? 'MEL item not recorded'}</p>
              </Row>
            ))}
          </Section>

          <Section icon={<Inbox className="h-4 w-4" />} title="Non-airworthiness squawks — awaiting triage" count={otherSquawks.length}>
            {otherSquawks.length === 0 ? empty : otherSquawks.map(d => (
              <Row key={d.id} next="Triage" onClick={() => open(tailOf(d.aircraftId), '?tab=defects')}>
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{tailOf(d.aircraftId)}</span><Badge variant="outline">ATA {d.ataChapter}</Badge><CasChip message={d.casMessage} color={d.casColor} observed={d.casObserved} /><span className="text-xs text-muted-foreground">{d.source}</span></div>
                <p className="mt-0.5 truncate">{d.description}</p>
              </Row>
            ))}
          </Section>
        </Band>

        {/* ── Band 3: work in hand and things being watched ── */}
        <Band title="In hand" hint="work under way and items being tracked" count={wq.counts.openWorkCards + wq.counts.watchItems} tone="track">
          {wq.counts.openWorkCards + wq.counts.watchItems === 0 && <p className="text-sm text-muted-foreground">No open work cards or watch items.</p>}

          <Section icon={<ClipboardList className="h-4 w-4" />} title="Open work cards" keep={wq.counts.openWorkCards > 0} count={(riiOnly ? wq.openWorkCards.filter(isRii) : wq.openWorkCards).length}>
            <div className="mb-1 flex justify-end">
              <Button size="sm" variant={riiOnly ? 'default' : 'outline'} className="h-7" onClick={() => setRiiOnly(v => !v)}>
                <UserCheck className="mr-1 h-3.5 w-3.5" /> RII only
              </Button>
            </div>
            {(() => {
              const cards = riiOnly ? wq.openWorkCards.filter(isRii) : wq.openWorkCards;
              return cards.length === 0 ? empty : cards.map(w => (
                <Row key={w.id} next="Open card" onClick={() => navigate(`/tech-log/work-cards/${w.id}`)}>
                  <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{w.cardNumber}</span><span className="font-semibold">{tailOf(w.aircraftId)}</span><Badge variant="outline">ATA {w.ataChapter}</Badge><Badge variant={w.status === 'IN_WORK' ? 'secondary' : 'destructive'}>{w.status}</Badge>{isRii(w) && <Badge variant="outline"><UserCheck className="mr-1 h-3 w-3" />RII</Badge>}</div>
                  <p className="mt-0.5 truncate text-muted-foreground">{w.title}{formatReferences(w) ? ` · ${formatReferences(w)}` : ''}</p>
                </Row>
              ));
            })()}
          </Section>

          <Section icon={<Eye className="h-4 w-4" />} title="Watch items — tracked, non-airworthiness" count={wq.counts.watchItems}>
            {wq.watchItems.length === 0 ? empty : wq.watchItems.map(d => (
              <Row key={d.id} next="Review" onClick={() => open(tailOf(d.aircraftId), '?tab=defects')}>
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{tailOf(d.aircraftId)}</span><Badge variant="outline">ATA {d.ataChapter}</Badge><Badge variant="secondary"><Eye className="mr-1 h-3 w-3" />WATCH</Badge><CasChip message={d.casMessage} color={d.casColor} observed={d.casObserved} /><span className="text-xs text-muted-foreground">{d.source}</span></div>
                <p className="mt-0.5 truncate text-muted-foreground">{d.description} · reported {formatRegulatoryCompact(d.reportedAtUtc, displayZone, DEFAULT_GOVERNING_TIMEZONE)}</p>
              </Row>
            ))}
          </Section>
        </Band>

        {wq.counts.urgent === 0 && (
          <Card className="border-[var(--gfo-success,#00B140)]/40">
            <CardContent className="flex items-center gap-2 p-4 text-sm text-[var(--gfo-success,#00B140)]"><CheckCircle2 className="h-4 w-4" /> Nothing urgent — the fleet is caught up.</CardContent>
          </Card>
        )}
      </div>
    </TechLogShell>
  );
}
