import { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { Activity, AlertTriangle, Clock, Wrench, Package } from 'lucide-react';
import { useTechLog } from '../TechLogContext';
import { defectsByAta, dispatchReliability, deferralAging, aogStats, mtbur } from '../engine/analytics';
import { ATA_CHAPTERS } from '../constants';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

// GFO tokens — keep in sync with src/index.css --gfo-*
const SUCCESS = '#00B140';
const WARNING = '#F1B434';
const ERROR = '#EF3340';
const NAVY = '#142D7E';
const ataTitle = (code: string) => ATA_CHAPTERS.find(c => c.code === code)?.title ?? `ATA ${code}`;

export default function Analytics() {
  const { state } = useTechLog();
  const now = new Date().toISOString();

  const byAta = useMemo(() => defectsByAta(state).map(d => ({ ...d, label: `${d.ata}`, name: ataTitle(d.ata) })), [state]);
  const reliability = useMemo(() => dispatchReliability(state), [state]);
  const aging = useMemo(() => deferralAging(state, now), [state, now]);
  const aog = useMemo(() => aogStats(state, now), [state, now]);
  const mt = useMemo(() => mtbur(state), [state]);

  const reliabilityPie = [
    { name: 'On-time', value: reliability.total - reliability.techDelayed, fill: SUCCESS },
    { name: 'Tech delay', value: reliability.techDelayed, fill: ERROR },
  ];

  const Kpi = ({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: string }) => (
    <Card className="gfo-stat-rule">
      <CardContent className="p-4">
        <div className="gfo-eyebrow flex items-center gap-2">{icon} {label}</div>
        <div className="gfo-numeric mt-1 text-2xl" style={tone ? { color: tone } : undefined}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );

  return (
    <TechLogShell
      title="Reliability Analytics"
      subtitle="Fleet reliability derived from the signed eTechLog ledger (mock data). Phase 4."
    >
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi icon={<Activity className="h-3.5 w-3.5" />} label="Dispatch reliability" value={`${reliability.reliabilityPct}%`} sub={`${reliability.techDelayed} tech delay / ${reliability.total} dep`} tone={reliability.reliabilityPct >= 98 ? SUCCESS : reliability.reliabilityPct >= 95 ? WARNING : ERROR} />
        <Kpi icon={<AlertTriangle className="h-3.5 w-3.5" />} label="AOG events" value={String(aog.events)} sub={`${aog.ongoing} ongoing`} tone={aog.ongoing ? ERROR : undefined} />
        <Kpi icon={<Clock className="h-3.5 w-3.5" />} label="AOG downtime" value={`${aog.totalDowntimeH} h`} sub={`avg ${aog.avgDowntimeH} h`} />
        <Kpi icon={<Wrench className="h-3.5 w-3.5" />} label="Open deferrals" value={String(aging.reduce((a, b) => a + b.count, 0))} sub="across the fleet" />
        <Kpi icon={<Package className="h-3.5 w-3.5" />} label="MTBUR (fleet)" value={mt.mtburOverall != null ? `${mt.mtburOverall} h` : '—'} sub={`${mt.removals} unsched. removal(s)`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Defect trend by ATA chapter</CardTitle></CardHeader>
          <CardContent>
            {byAta.length === 0 ? <p className="text-sm text-muted-foreground">No defects recorded.</p> : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byAta} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <Tooltip formatter={(v: number) => [`${v} defect(s)`, '']} labelFormatter={(l: string) => `ATA ${l} — ${ataTitle(l)}`} />
                    <Bar dataKey="count" fill={NAVY} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Dispatch reliability</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={reliabilityPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                    {reliabilityPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-sm text-muted-foreground">{reliability.reliabilityPct}% of {reliability.total} departures dispatched without a technical delay.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Deferral aging</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aging} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="bucket" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip formatter={(v: number) => [`${v} deferral(s)`, '']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {aging.map((_, i) => <Cell key={i} fill={[SUCCESS, WARNING, WARNING, ERROR][i] ?? NAVY} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">MTBUR — unscheduled removals</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p className="mb-3 text-xs text-muted-foreground">
              Mean flight hours between unscheduled removals = fleet flight hours ({mt.fleetHours} h) ÷ removals. Derived from work-card part-removal events.
            </p>
            {mt.byPart.length === 0 ? (
              <p className="text-muted-foreground">No unscheduled removals recorded yet. Complete a work card with a part removal to populate MTBUR.</p>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between border-b pb-1 text-xs font-medium text-muted-foreground"><span>Removed part</span><span>Removals · MTBUR</span></div>
                {mt.byPart.map(p => (
                  <div key={p.partNumber} className="flex justify-between border-b py-1 last:border-0">
                    <span className="font-mono">{p.partNumber}</span>
                    <span>{p.removals} · {p.mtbur != null ? `${p.mtbur} h` : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Note: this reflects myGFO-signed records only. Work performed by outside MROs is recorded in CAMP and may not appear here.
      </p>
    </TechLogShell>
  );
}
