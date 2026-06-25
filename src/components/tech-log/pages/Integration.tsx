import { useTechLog } from '../TechLogContext';
import { useIntegration } from '../integration/useIntegration';
import { CAMP_BASE_URLS, CAMP_ENV, CAMP_ERROR, DUE_LIST_CAP_MONTHS } from '../integration/campTaxonomy';
import { MYAIROPS_EVENT_TYPES, webhookVerificationSpec } from '../integration/myairopsClient';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Cloud, Webhook, RefreshCw, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { ReconcileResult } from '../integration/reconcile';

function ReconCol({ title, tone, items }: { title: string; tone: 'ok' | 'warn' | 'err'; items: string[] }) {
  const color = tone === 'ok' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : 'text-red-700';
  return (
    <div>
      <div className={`mb-0.5 font-medium ${color}`}>{title} ({items.length})</div>
      {items.length === 0
        ? <div className="text-xs text-muted-foreground">—</div>
        : <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>}
    </div>
  );
}

export default function Integration() {
  const { state } = useTechLog();
  const { refreshCampReads, pushUtilization, reconcile } = useIntegration();
  const [recon, setRecon] = useState<Record<string, (ReconcileResult & { tail: string }) | undefined>>({});

  return (
    <TechLogShell
      title="Integration — CAMP & myairops"
      subtitle="Phase-2 connectors (mock data, sandbox). Dev wires real SOAP/OData + Azure later."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cloud className="h-4 w-4" /> CAMP connector <Badge variant="destructive">{CAMP_ENV}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <div className="break-all"><span className="text-muted-foreground">GEN </span>{CAMP_BASE_URLS.gen}</div>
            <div className="break-all"><span className="text-muted-foreground">STA </span>{CAMP_BASE_URLS.sta}</div>
            <div className="break-all"><span className="text-muted-foreground">WRK </span>{CAMP_BASE_URLS.wrk}</div>
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-muted-foreground">
              <li>Session: LogIn → key → calls → LogOff (finally). Never hammer LogIn (lockout).</li>
              <li>Time is <strong>minutes</strong> in CAMP (×60 on push, ÷60 on read).</li>
              <li>Utilization is <strong>increase-only</strong>; serial must match <strong>exactly</strong>.</li>
              <li>Due list capped at <strong>{DUE_LIST_CAP_MONTHS} months</strong>.</li>
              <li>Push via <code>IntegrateDiscrepancies</code> (INSERT/EDIT/UPDATE).</li>
            </ul>
            <div className="pt-2">
              <div className="mb-1 text-muted-foreground">Read-backs (mock GetLatestAircraftTimes / GetAircraftState):</div>
              <div className="flex flex-wrap gap-2">
                {state.aircraft.filter(a => !a.isProvisional).map(a => (
                  <Button key={a.id} size="sm" variant="outline" onClick={() => refreshCampReads(a.id)}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />{a.tailNumber}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-md border border-amber-300/60 bg-amber-50/60 p-2">
              <div className="flex items-center gap-1.5 font-medium text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> Utilization push — blocked (OQ1)</div>
              <p className="mt-0.5 text-muted-foreground">The CAMP SOAP operation to push hours/cycles/landings is <strong>undocumented</strong> — not invented here. Validates exact-serial + increase-only and prepares the minutes payload, then refuses to transmit until confirmed under sandbox.</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {state.aircraft.filter(a => !a.isProvisional).map(a => (
                  <Button key={a.id} size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => pushUtilization(a.id)}>
                    Push {a.tailNumber} (blocked)
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="h-4 w-4" /> myairops connector <Badge variant="outline">pull-only</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <div className="text-muted-foreground">OData pull (crew, aircraft, times, movements) + CloudEvents webhooks. Never written back.</div>
            <div className="mt-1 font-medium">Webhook verification:</div>
            <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
              {Object.entries(webhookVerificationSpec()).map(([k, v]) => <li key={k}>{k}: {String(v)}</li>)}
            </ul>
            <div className="mt-2 font-medium">Event types:</div>
            <div className="flex flex-wrap gap-1">
              {MYAIROPS_EVENT_TYPES.map(t => <Badge key={t} variant="outline" className="font-mono text-[10px]">{t}</Badge>)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">CAMP discrepancy correlation (off-ledger, §18.1)</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {state.campCorrelation.length === 0 && <p className="text-muted-foreground">No pushes yet — sign a deferral to push it to CAMP.</p>}
          {state.campCorrelation.map(c => (
            <div key={c.mygfoEntityId} className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0">
              <div><Badge variant="outline" className="mr-2">{c.entityType}</Badge><span className="font-mono text-xs">{c.mygfoEntityId}</span></div>
              <div className="flex items-center gap-2">
                <Badge variant={c.pushState === 'PUSHED' ? 'secondary' : c.pushState === 'FAILED' ? 'destructive' : 'outline'}>{c.pushState}</Badge>
                {c.campDiscrepancyRef && <span className="font-mono text-xs text-muted-foreground">{c.campDiscrepancyRef}</span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">CAMP discrepancy reconciliation (GetAircraftDiscrepancies)</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-xs text-muted-foreground">Read CAMP's discrepancy list and diff it against the off-ledger correlation table — surfaces items entered directly in CAMP and pushes CAMP never acked.</p>
          <div className="flex flex-wrap gap-2">
            {state.aircraft.filter(a => !a.isProvisional).map(a => (
              <Button key={a.id} size="sm" variant="outline" onClick={() => setRecon(r => ({ ...r, [a.id]: reconcile(a.id) }))}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reconcile {a.tailNumber}
              </Button>
            ))}
          </div>
          {Object.entries(recon).filter(([, r]) => r).map(([id, r]) => r && (
            <div key={id} className="rounded-md border p-2">
              <div className="mb-1 font-medium">{r.tail}</div>
              <div className="grid gap-2 md:grid-cols-3">
                <ReconCol title="Matched" tone="ok" items={r.matched.map(d => `${d.ata} · ${d.description}`)} />
                <ReconCol title="CAMP-only (triage)" tone="warn" items={r.campOnly.map(d => `${d.ata} · ${d.description}`)} />
                <ReconCol title="myGFO-only (investigate)" tone="err" items={r.mygfoOnly.map(c => `${c.entityType} ${c.mygfoEntityId}${c.lastError ? ' — ' + c.lastError : ''}`)} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Integration log</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {state.integrationEvents.length === 0 && <p className="text-muted-foreground">No integration activity yet.</p>}
          {state.integrationEvents.slice(0, 40).map(e => (
            <div key={e.id} className="flex items-center justify-between gap-3 border-b py-1 last:border-0">
              <div><Badge variant="outline" className="mr-2">{e.system}</Badge><span className="text-muted-foreground">{e.op} — {e.summary}</span></div>
              <div className="flex items-center gap-2">
                <Badge variant={e.outcome === 'OK' ? 'secondary' : e.outcome === 'ERROR' ? 'destructive' : 'outline'}>{e.outcome}</Badge>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(e.atUtc).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" /> CAMP error taxonomy</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-xs">
          {Object.values(CAMP_ERROR).map(e => (
            <div key={String(e.code)} className="flex flex-col gap-0.5 border-b py-1 last:border-0 md:flex-row md:justify-between md:gap-3">
              <span><Badge variant="outline" className="mr-2 font-mono">{String(e.code)}</Badge>{e.msg}</span>
              <span className="shrink-0 text-muted-foreground">{e.handling}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </TechLogShell>
  );
}
