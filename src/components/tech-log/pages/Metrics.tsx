import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { Clock, PackageSearch, Stethoscope, Wrench, MoonStar } from 'lucide-react';
import { useTechLog } from '../TechLogContext';
import { fleetMetrics } from '../engine/metrics';
import { STATUS_TAG_LABELS } from '../engine/statusTags';
import { TechLogShell } from '../components/TechLogShell';
import { StatusHoursBar, segmentsFromStateHours } from '../components/StatusHoursBar';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

// GFO tokens — keep in sync with src/index.css --gfo-* (Analytics.tsx precedent)
const NAVY = '#142D7E';
const WARNING = '#F1B434';

const PERIODS = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
] as const;

const hrs = (n: number | null | undefined) => (n == null ? '—' : `${n} h`);

/**
 * LG-100 / D61 §5 — where the fleet's maintenance time went, rolled up per tail and per vendor.
 *
 * **Visible to everyone**, not maintenance-only, which is Bryan's call in D61 §5: *"I think all."*
 * That takes no code — `TechLogRoutes` applies no role gating at all — but it is not an accident
 * either, so do not add a gate here without going back to D61. (Nav visibility is a separate thing
 * in `engine/nav.ts`; hiding a link there does not block the URL.)
 *
 * Every number links back to the cards behind it. A rollup nobody can drill into is a number people
 * argue with rather than act on.
 */
export default function Metrics() {
  const { state } = useTechLog();
  const [days, setDays] = useState<number>(90);

  const now = useMemo(() => new Date().toISOString(), []);
  const fromUtc = useMemo(() => new Date(Date.now() - days * 86400000).toISOString(), [days]);
  const m = useMemo(
    () => fleetMetrics(state.workCards, { fromUtc, toUtc: now, asOfUtc: now }),
    [state.workCards, fromUtc, now],
  );

  const tailOf = (aircraftId: string) => state.aircraft.find(a => a.id === aircraftId)?.tailNumber ?? aircraftId;
  const cardsFor = (ids: string[]) => state.workCards.filter(c => ids.includes(c.id));

  const diagnoseChart = m.byAircraft
    .filter(a => a.medianDiagnoseHours != null)
    .map(a => ({ tail: tailOf(a.aircraftId), hours: a.medianDiagnoseHours as number }));

  const vendorChart = m.byVendor
    .filter(v => v.medianLeadHours != null)
    .map(v => ({ vendor: v.vendor, hours: v.medianLeadHours as number }));

  const Kpi = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
    <Card className="gfo-stat-rule">
      <CardContent className="p-4">
        <div className="gfo-eyebrow flex items-center gap-2">{icon} {label}</div>
        <div className="gfo-numeric mt-1 text-2xl">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );

  return (
    <TechLogShell
      title="Maintenance time"
      subtitle="How long to diagnose, how long the vendor takes, how long to install — from the timelines technicians write up after the event."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Period</span>
        <div className="inline-flex overflow-hidden rounded-md border border-border">
          {PERIODS.map(p => (
            <button key={p.days} type="button" onClick={() => setDays(p.days)}
              className={`px-3 py-1.5 text-sm ${days === p.days ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{m.cards} card{m.cards === 1 ? '' : 's'} raised in the period</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={<Stethoscope className="h-3.5 w-3.5" />} label="Time to diagnose (median)"
          value={hrs(m.medianDiagnoseHours)} sub={`avg ${hrs(m.avgDiagnoseHours)}`} />
        <Kpi icon={<PackageSearch className="h-3.5 w-3.5" />} label="Parts lead (median)"
          value={hrs(m.byVendor.length ? median(m.byVendor.map(v => v.medianLeadHours)) : null)}
          sub={`${m.byVendor.reduce((n, v) => n + v.orders, 0)} order(s), ${m.byVendor.reduce((n, v) => n + v.openOrders, 0)} open`} />
        <Kpi icon={<Wrench className="h-3.5 w-3.5" />} label="Install / wrench time"
          value={hrs(m.totalInstallHours)} sub="hands on the aircraft" />
        <Kpi icon={<MoonStar className="h-3.5 w-3.5" />} label="Excluded gap time"
          value={hrs(m.excludedGapHours)} sub="logged, then set aside by the enterer" />
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Where the fleet's hours went</CardTitle></CardHeader>
        <CardContent>
          {m.cards === 0 ? (
            <p className="text-sm text-muted-foreground">No work cards raised in this period.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {segmentsFromStateHours(m.stateHours).filter(s => s.hours > 0).map(s => (
                  <Badge key={s.key} variant="outline">{s.label} {s.hours} h</Badge>
                ))}
              </div>
              <StatusHoursBar segments={segmentsFromStateHours(m.stateHours)} />
              {m.excludedGapHours > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  A further {m.excludedGapHours} h of logged gap time was excluded from these totals by whoever
                  entered it — overnights, weekends, and stretches where a contract shop left with no replacement.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Median time to diagnose, by tail</CardTitle></CardHeader>
          <CardContent>
            {diagnoseChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">No card in this period recorded a completed diagnosis.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={diagnoseChart} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="tail" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => [`${v} h`, 'median']} />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                      {diagnoseChart.map((_, i) => <Cell key={i} fill={NAVY} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Median parts lead time, by vendor</CardTitle></CardHeader>
          <CardContent>
            {vendorChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">No delivered parts orders in this period.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vendorChart} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="vendor" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => [`${v} h`, 'median']} />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                      {vendorChart.map((_, i) => <Cell key={i} fill={i === 0 ? NAVY : WARNING} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">By tail</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {m.byAircraft.length === 0 && <p className="text-muted-foreground">Nothing to roll up in this period.</p>}
            {m.byAircraft.map(a => (
              <div key={a.aircraftId} className="rounded-md border p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/tech-log/aircraft/${tailOf(a.aircraftId)}`} className="font-medium underline-offset-2 hover:underline">
                    {tailOf(a.aircraftId)}
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline"><Stethoscope className="mr-1 h-3 w-3" />diagnose {hrs(a.medianDiagnoseHours)} median</Badge>
                    <Badge variant="outline"><Wrench className="mr-1 h-3 w-3" />install {a.installHours} h</Badge>
                    <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />{a.cards} card{a.cards === 1 ? '' : 's'}</Badge>
                    {a.openPartsOrders > 0 && (
                      <Badge variant="outline" className="border-dashed">{a.openPartsOrders} order(s) still open</Badge>
                    )}
                    {a.excludedGapHours > 0 && (
                      <Badge variant="outline" className="border-dashed">{a.excludedGapHours} h excluded</Badge>
                    )}
                  </div>
                </div>
                <div className="mt-2"><StatusHoursBar segments={segmentsFromStateHours(a.stateHours)} /></div>
                {/* Every number links back to its cards. */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cardsFor(a.cardIds).map(c => (
                    <Button key={c.id} asChild size="sm" variant="ghost" className="h-6 px-2 text-xs">
                      <Link to={`/tech-log/work-cards/${c.id}`}>{c.cardNumber}</Link>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Parts lead time, by vendor</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {m.byVendor.length === 0 && <p className="text-muted-foreground">No parts orders raised in this period.</p>}
            {m.byVendor.map(v => (
              <div key={v.vendor} className="rounded-md border p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{v.vendor}</span>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">median {hrs(v.medianLeadHours)}</Badge>
                    <Badge variant="outline">avg {hrs(v.avgLeadHours)}</Badge>
                    <Badge variant="outline">{v.orders} order{v.orders === 1 ? '' : 's'}</Badge>
                    {v.openOrders > 0 && <Badge variant="outline" className="border-dashed">{v.openOrders} still open</Badge>}
                  </div>
                </div>
                <div className="mt-1.5 space-y-1">
                  {v.leads.map(l => (
                    <div key={l.orderId} className="flex flex-wrap items-center justify-between gap-2 border-b py-1 text-xs last:border-0">
                      <span>
                        {l.description}
                        {l.partNumber && <span className="ml-1.5 font-mono text-muted-foreground">{l.partNumber}</span>}
                      </span>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {l.hours} h {l.open ? 'and counting' : 'lead'}
                        <Link to={`/tech-log/work-cards/${l.cardId}`} className="underline-offset-2 hover:underline">{l.cardNumber}</Link>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Elapsed wall-clock state, not man-hours. Two technicians working three hours is six man-hours
        ({STATUS_TAG_LABELS.IN_WORK.toLowerCase()} labor, recorded on the card) but three elapsed hours here.
      </p>
    </TechLogShell>
  );
}

/** Median of the per-vendor medians, ignoring vendors with nothing delivered yet. */
function median(xs: (number | null)[]): number | null {
  const s = xs.filter((x): x is number => x != null).sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return Math.round((s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2) * 10) / 10;
}
