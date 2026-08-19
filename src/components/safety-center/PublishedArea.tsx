// Published = the safety communications hub. Groups the de-identified reports
// library, the periodic Safety Newsletter, and the CWS recognitions wall under
// one sub-nav so we don't add more top-level tabs. (Read-and-initial bulletins
// moved to the unified Documents module — authoring is at /documents; TL-6 / D29.)

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Award, Newspaper, Send } from 'lucide-react';
import { eventStore } from '../../notifications/events';
import { PublishedReports } from './PublishedReports';
import { useCws } from './cwsRecognitions';
import { useNewsletters, type Newsletter } from './newsletters';
import type { PublishedReport, SafetyView } from './types';

type Sub = 'reports' | 'newsletters' | 'recognitions';

export function PublishedArea({ view, reports }: { view: SafetyView; reports: PublishedReport[] }) {
  const isMgr = view === 'ops';
  const tabs: { key: Sub; label: string }[] = [
    { key: 'reports', label: 'Reports' },
    { key: 'newsletters', label: 'Newsletters' },
    { key: 'recognitions', label: 'Recognitions' },
  ];
  const [sub, setSub] = useState<Sub>('reports');

  return (
    <div className="mt-4">
      <div className="flex gap-2 flex-wrap mb-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`text-[14px] font-semibold px-4 py-2 min-h-[40px] rounded-full border transition-colors ${sub === t.key ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/40'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {sub === 'reports' && <PublishedReports reports={reports} />}
      {sub === 'newsletters' && <NewsletterPanel isMgr={isMgr} />}
      {sub === 'recognitions' && <RecognitionsWall />}
    </div>
  );
}

// ───────────────────────────────────────────────── Newsletters ───────────────
function NewsletterPanel({ isMgr }: { isMgr: boolean }) {
  const { newsletters, publishNewsletter } = useNewsletters();
  const [read, setRead] = useState<Newsletter | null>(null);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] text-muted-foreground">Periodic safety newsletter — published to the whole department.</p>
        {isMgr && <Button size="sm" onClick={() => setShowNew(true)} className="gap-1.5"><Newspaper className="w-4 h-4" /> Publish newsletter</Button>}
      </div>
      <div className="flex flex-col gap-2">
        {newsletters.map((n) => (
          <button key={n.id} onClick={() => setRead(n)}
            className="text-left bg-card border border-border rounded-lg p-4 hover:border-accent hover:shadow-sm transition-all">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}><Newspaper className="w-4 h-4 text-accent" /></div>
              <div className="text-[15px] font-medium text-foreground">{n.title}</div>
              <span className="text-[11px] text-muted-foreground ml-auto">{n.period}</span>
            </div>
            <div className="text-[12.5px] text-muted-foreground mt-2 leading-snug">{n.summary}</div>
            <div className="text-[11px] text-accent font-medium mt-2">Read →</div>
          </button>
        ))}
      </div>

      <Dialog open={!!read} onOpenChange={(v: boolean) => { if (!v) setRead(null); }}>
        <DialogContent className="sm:max-w-[560px] p-0 gap-0">
          {read && (
            <>
              <DialogHeader className="px-6 py-4 border-b border-border">
                <DialogDescription className="text-[11px] text-muted-foreground font-medium">{read.period}</DialogDescription>
                <DialogTitle className="text-[17px] mt-1">{read.title}</DialogTitle>
              </DialogHeader>
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                <p className="text-[14px] text-foreground font-medium mb-3">{read.summary}</p>
                <p className="text-[13.5px] text-muted-foreground leading-relaxed whitespace-pre-line">{read.body}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <PublishNewsletterDialog open={showNew} onOpenChange={setShowNew}
        onPublish={(d) => {
          const nl = publishNewsletter(d);
          eventStore.publish({
            id: `newsletter-${nl.id}`, severity: 'info',
            title: `New safety newsletter: ${nl.title}`, detail: nl.period,
            module: 'Safety', link: '/safety',
            audienceRoles: ['pilot', 'inflight', 'maintenance', 'safety', 'admin', 'lead', 'scheduling'],
          });
        }} />
    </div>
  );
}

function PublishNewsletterDialog({ open, onOpenChange, onPublish }: { open: boolean; onOpenChange: (v: boolean) => void; onPublish: (d: { title: string; period: string; summary: string; body: string }) => void }) {
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  function reset() { setTitle(''); setPeriod(''); setSummary(''); setBody(''); }
  function close() { onOpenChange(false); setTimeout(reset, 200); }
  const canPublish = title.trim() && body.trim();
  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-base">Publish safety newsletter</DialogTitle>
          <DialogDescription className="text-[12.5px] leading-snug">Goes out to every crew member and shows up in Safety Center.</DialogDescription>
        </DialogHeader>
        <div className="px-6 py-4 flex flex-col gap-3.5 max-h-[62vh] overflow-y-auto">
          <div className="flex gap-3">
            <div className="flex-1"><Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="July 2026 Safety Newsletter" /></div>
            <div className="w-40"><Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">Period</Label><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="July 2026" /></div>
          </div>
          <div><Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">Summary</Label><Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One line" /></div>
          <div><Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">Body</Label><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="The newsletter content…" /></div>
        </div>
        <DialogFooter className="px-6 py-3.5 border-t border-border flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button disabled={!canPublish} className="gap-1.5" onClick={() => { onPublish({ title: title.trim(), period: period.trim() || 'Latest', summary: summary.trim(), body: body.trim() }); close(); }}><Send className="w-4 h-4" /> Publish to all</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────── Recognitions ────────────────
function RecognitionsWall() {
  const { recognitions } = useCws();
  return (
    <div className="mt-4">
      <p className="text-[13px] text-muted-foreground mb-4">Caught Working Safely — peers recognizing peers. File one from the <b className="text-foreground font-medium">Report</b> button.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {recognitions.map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-lg p-4" style={{ borderColor: 'color-mix(in srgb, var(--gfo-sunrise) 45%, var(--border))' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full grid place-items-center shrink-0" style={{ background: 'color-mix(in srgb, var(--gfo-sunrise) 24%, transparent)' }}><Award className="w-4 h-4" style={{ color: 'var(--gfo-sunrise-deep, #B8913D)' }} /></div>
              <div className="text-[14px] font-medium text-foreground">{r.recognized}</div>
              <span className="text-[11px] text-muted-foreground ml-auto">{new Date(r.submittedAt).toLocaleDateString()}</span>
            </div>
            <div className="text-[13px] text-muted-foreground leading-snug">{r.forWhat}</div>
            <div className="text-[11.5px] text-muted-foreground/70 mt-2">recognized by {r.submittedBy}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
