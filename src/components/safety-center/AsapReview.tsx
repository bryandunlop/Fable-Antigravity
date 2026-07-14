import { useState } from 'react';
import { Sheet, SheetContent } from '../ui/sheet';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ShieldCheck, Lock } from 'lucide-react';
import { useAsapReports, type AsapReport, type AsapStatus } from './asapReports';

const TONE: Record<AsapStatus, string> = { 'Open': 'sc-amber', 'Under review': 'sc-accent', 'Resolved': 'sc-green' };
const FILTERS: (AsapStatus | 'All')[] = ['All', 'Open', 'Under review', 'Resolved'];

export function AsapReview() {
  const { reports, updateAsap } = useAsapReports();
  const [filter, setFilter] = useState<AsapStatus | 'All'>('All');
  const [sel, setSel] = useState<AsapReport | null>(null);
  const [feedback, setFeedback] = useState('');

  const shown = filter === 'All' ? reports : reports.filter((r) => r.status === filter);
  const current = sel ? reports.find((r) => r.id === sel.id) ?? sel : null;

  function openReport(r: AsapReport) { setSel(r); setFeedback(r.feedback ?? ''); }

  return (
    <div className="mt-4">
      <div className="rounded-[9px] px-3 py-2.5 text-[12.5px] leading-snug sc-accent mb-3 flex items-center gap-2">
        <Lock className="w-4 h-4 shrink-0" /> ASAP is confidential and non-punitive — reporter identity is never shown. De-identify before sharing any detail.
      </div>

      <div className="flex gap-1.5 flex-wrap mb-3">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/40'}`}>{f}</button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {shown.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm">No reports in this state.</div>}
        {shown.map((r) => (
          <button key={r.id} onClick={() => openReport(r)}
            className="text-left grid grid-cols-[auto_1fr_auto] gap-3 items-center bg-card border border-border rounded-[10px] px-4 py-3 hover:border-muted-foreground/40 hover:shadow-sm transition-all">
            <span className="text-[11px] text-muted-foreground font-semibold tabular-nums">{r.id}</span>
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-foreground truncate">{r.phase} · {r.airport}</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">{r.deidentified ? 'De-identified' : 'Contains raw detail'} · {new Date(r.submittedAt).toLocaleDateString()}</div>
            </div>
            <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${TONE[r.status]}`}>{r.status}</span>
          </button>
        ))}
      </div>

      <Sheet open={!!current} onOpenChange={(v: boolean) => { if (!v) setSel(null); }}>
        <SheetContent side="right" className="w-[460px] max-w-[92vw] p-0 flex flex-col gap-0">
          {current && (
            <>
              <div className="px-6 pt-6 pb-4 border-b border-border">
                <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                  <span className="uppercase tracking-wide text-accent font-bold">ASAP</span>
                  <span>· confidential</span>
                  <span className="ml-auto tabular-nums">{current.id}</span>
                </div>
                <h2 className="text-lg font-semibold mt-2">{current.phase} · {current.airport}</h2>
                <div className="mt-2"><span className={`text-xs font-medium rounded-full px-2.5 py-1 ${TONE[current.status]}`}>{current.status}</span></div>
              </div>

              <div className="px-6 py-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 mb-5">
                  {[['Phase', current.phase], ['Airport', current.airport], ['Severity', current.severity], ['Submitted', new Date(current.submittedAt).toLocaleDateString()]].map(([l, v]) => (
                    <div key={l}><div className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold">{l}</div><div className="text-sm text-foreground mt-0.5">{v}</div></div>
                  ))}
                </div>
                <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">What happened</div>
                <p className="text-[13.5px] text-foreground leading-relaxed mb-4">{current.description}</p>
                {current.contributing && <>
                  <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Contributing factors</div>
                  <p className="text-[13.5px] text-muted-foreground leading-relaxed mb-4">{current.contributing}</p>
                </>}

                <button onClick={() => updateAsap(current.id, { deidentified: !current.deidentified })}
                  className={`w-full flex items-center gap-2 justify-center text-[13px] font-semibold rounded-lg px-3 py-2 border mb-4 ${current.deidentified ? 'sc-green border-[color:var(--gfo-success)]' : 'bg-card border-border text-muted-foreground'}`}>
                  <ShieldCheck className="w-4 h-4" /> {current.deidentified ? 'De-identified' : 'Mark de-identified'}
                </button>

                <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Feedback to the reporter (de-identified)</div>
                <Textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Closing feedback / trend note…" />
              </div>

              <div className="px-6 py-3.5 border-t border-border flex gap-2">
                {current.status !== 'Under review' && <Button variant="outline" className="flex-1" onClick={() => updateAsap(current.id, { status: 'Under review' })}>Under review</Button>}
                {current.status !== 'Resolved' && <Button className="flex-1" onClick={() => { updateAsap(current.id, { status: 'Resolved', feedback: feedback.trim() || undefined }); setSel(null); }}>Resolve</Button>}
                {current.status === 'Resolved' && <Button variant="outline" className="flex-1" onClick={() => updateAsap(current.id, { status: 'Open' })}>Reopen</Button>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
