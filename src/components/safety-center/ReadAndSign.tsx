import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { FileCheck, TriangleAlert, Check, Send, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { eventStore } from '../../notifications/events';
import {
  useRequiredReads, pendingForUser, compliance, DIST_GROUPS, type RequiredRead,
} from './requiredReads';

// Demo group → member / role resolution (production reads the personnel roster).
const GROUP_NAMES: Record<string, string[]> = {
  'All Staff': ['Capt. Dunlop', 'FO Marsh', 'Capt. Ellis', 'M. Cho', 'S. Wilson', 'T. Ward', 'R. Vance', 'K. Bell'],
  'Flight Crew': ['Capt. Dunlop', 'FO Marsh', 'Capt. Ellis'],
  'Cabin Crew': ['M. Cho'],
  'Ground Crew': ['T. Ward'],
  'Maintenance': ['T. Ward', 'S. Wilson'],
  'Management': ['R. Vance'],
  'Safety Team': ['K. Bell', 'J. Kerr'],
};
const GROUP_ROLES: Record<string, string[]> = {
  'All Staff': ['pilot', 'inflight', 'maintenance', 'safety', 'admin', 'lead'],
  'Flight Crew': ['pilot'], 'Cabin Crew': ['inflight'], 'Ground Crew': ['maintenance'],
  'Maintenance': ['maintenance'], 'Management': ['admin', 'lead'], 'Safety Team': ['safety'],
};

function resolveRecipients(groups: string[], individuals: string[]): string[] {
  const set = new Set<string>(individuals);
  groups.forEach((g) => (GROUP_NAMES[g] || []).forEach((n) => set.add(n)));
  return [...set];
}

// ─────────────────────────────────────────────── crew: read + initial ────────
export function ReadAndInitialInbox({ currentUser }: { currentUser: { id: string; name: string } }) {
  const { reads, acks, acknowledge } = useRequiredReads();
  const pending = pendingForUser(reads, acks, currentUser.name);
  const [active, setActive] = useState<RequiredRead | null>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  function closeReader() { setActive(null); setCode(''); setErr(''); }
  function submit() {
    if (!active) return;
    if (code.trim().toLowerCase() !== active.completionCode.toLowerCase()) {
      setErr("That code doesn't match the one printed in the document.");
      return;
    }
    acknowledge(active.id, currentUser.id, currentUser.name, code.trim());
    closeReader();
  }

  if (pending.length === 0) return null;

  return (
    <>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mt-5 mb-2 px-0.5 flex items-center gap-2">
        <span className="text-[color:var(--gfo-error)]">Needs your initials</span>
        <span className="sc-red text-[11px] font-semibold rounded-full px-2">{pending.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {pending.map((r) => (
          <button key={r.id} onClick={() => setActive(r)}
            className="text-left bg-card border border-border rounded-[10px] px-4 py-3 flex items-center gap-3 hover:border-accent hover:shadow-sm transition-all"
            style={{ borderColor: r.urgent ? 'var(--gfo-error)' : undefined }}>
            <div className="w-9 h-9 rounded-[9px] grid place-items-center shrink-0" style={{ background: r.urgent ? 'color-mix(in srgb, var(--gfo-error) 12%, transparent)' : 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
              {r.urgent ? <TriangleAlert className="w-[18px] h-[18px] text-[color:var(--gfo-error)]" /> : <FileCheck className="w-[18px] h-[18px] text-accent" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14.5px] font-medium text-foreground truncate">{r.title}</div>
              <div className="text-[12px] text-muted-foreground mt-0.5 truncate">{r.summary}</div>
            </div>
            {r.urgent && <span className="sc-red text-[11px] font-semibold rounded-full px-2.5 py-1 shrink-0">Urgent</span>}
            <span className="text-xs font-semibold text-accent shrink-0">Read &amp; initial →</span>
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(v: boolean) => { if (!v) closeReader(); }}>
        <DialogContent className="sm:max-w-[560px] p-0 gap-0">
          {active && (
            <>
              <DialogHeader className="px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                  <span className="uppercase tracking-wide text-accent font-bold">{active.kind}</span>
                  {active.urgent && <span className="sc-red rounded-full px-2 py-0.5 text-[10px] font-bold">URGENT</span>}
                  <span className="ml-auto">{active.publishedDate}</span>
                </div>
                <DialogTitle className="text-[17px] mt-1">{active.title}</DialogTitle>
              </DialogHeader>
              <div className="px-6 py-4 max-h-[46vh] overflow-y-auto">
                <p className="text-[14px] text-foreground font-medium mb-3">{active.summary}</p>
                <p className="text-[13.5px] text-muted-foreground leading-relaxed whitespace-pre-line">{active.body}</p>
              </div>
              <div className="px-6 py-4 border-t border-border bg-muted/30">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">Completion code (your initials)</Label>
                <div className="flex gap-2">
                  <Input value={code} onChange={(e) => { setCode(e.target.value); setErr(''); }} placeholder="Type the code from the document" className="flex-1" />
                </div>
                {err && <div className="text-[12px] text-[color:var(--gfo-error)] mt-1.5">{err}</div>}
                <div className="text-[11.5px] text-muted-foreground mt-1.5">Demo code: <b className="text-foreground font-medium">{active.completionCode}</b></div>
              </div>
              <DialogFooter className="px-6 py-3.5 border-t border-border flex-row justify-between sm:justify-between">
                <Button variant="outline" onClick={closeReader}>Cancel</Button>
                <Button onClick={submit} className="gap-1.5"><Check className="w-4 h-4" /> Mark as read &amp; initial</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ───────────────────────────────────── manager: distribute + compliance ──────
export function BulletinsManager() {
  const { reads, acks, createRead } = useRequiredReads();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[15px] font-medium text-foreground">Bulletins &amp; read-and-initial</div>
          <div className="text-[12.5px] text-muted-foreground">Distribute to groups and track who has acknowledged.</div>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} className="gap-1.5"><Send className="w-4 h-4" /> New bulletin</Button>
      </div>

      <div className="flex flex-col gap-2">
        {reads.map((r) => {
          const c = compliance(r, acks);
          const isOpen = expanded === r.id;
          return (
            <div key={r.id} className="bg-card border border-border rounded-[11px] overflow-hidden">
              <button onClick={() => setExpanded(isOpen ? null : r.id)} className="w-full text-left px-4 py-3 flex items-center gap-3">
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-foreground truncate flex items-center gap-2">
                    {r.title}
                    {r.urgent && <span className="sc-red rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0">URGENT</span>}
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-1.5"><Users className="w-3 h-3" /> {r.groups.join(', ') || 'Individuals'} · {r.recipients.length} recipients</div>
                </div>
                <div className="text-right shrink-0 w-28">
                  <div className="text-[13px] font-semibold text-foreground tabular-nums">{c.ackedCount}/{c.total} <span className="text-muted-foreground font-normal">read</span></div>
                  <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.pct === 100 ? 'var(--gfo-success)' : 'var(--accent)' }} />
                  </div>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-3 border-t border-border pt-2">
                  {c.roster.map((m) => (
                    <div key={m.name} className="flex items-center gap-2 py-1.5 text-[13px] border-b border-border last:border-0">
                      <span className={`w-2 h-2 rounded-full shrink-0`} style={{ background: m.read ? 'var(--gfo-success)' : 'var(--muted-foreground)' }} />
                      <span className="text-foreground flex-1">{m.name}</span>
                      {m.read
                        ? <span className="text-[12px] text-[color:var(--gfo-success)]">initialled {m.code} · {m.at ? new Date(m.at).toLocaleDateString() : ''}</span>
                        : <span className="text-[12px] text-muted-foreground">pending</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <NewBulletinDialog open={showNew} onOpenChange={setShowNew}
        onCreate={(d) => {
          const recipients = resolveRecipients(d.groups, d.individuals);
          const read = createRead({ title: d.title, kind: 'bulletin', summary: d.summary, body: d.body, completionCode: d.code, urgent: d.urgent, groups: d.groups, recipients });
          const roles = [...new Set(d.groups.flatMap((g) => GROUP_ROLES[g] || []))];
          eventStore.publish({
            id: `bulletin-${read.id}`,
            severity: d.urgent ? 'critical' : 'info',
            title: `New ${d.urgent ? 'URGENT ' : ''}bulletin: ${d.title}`,
            detail: 'Requires read & initial', module: 'Safety', link: '/safety',
            audienceRoles: roles.length ? roles : ['pilot', 'inflight', 'maintenance'],
          });
        }} />
    </div>
  );
}

interface NewBulletinData { title: string; summary: string; body: string; code: string; urgent: boolean; groups: string[]; individuals: string[]; }

function NewBulletinDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (d: NewBulletinData) => void }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [code, setCode] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [groups, setGroups] = useState<string[]>([]);
  const [individuals, setIndividuals] = useState('');

  function reset() { setTitle(''); setSummary(''); setBody(''); setCode(''); setUrgent(false); setGroups([]); setIndividuals(''); }
  function close() { onOpenChange(false); setTimeout(reset, 200); }
  function toggle(g: string) { setGroups((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g])); }
  const canSend = title.trim() && code.trim() && (groups.length > 0 || individuals.trim());

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border"><DialogTitle className="text-base">New bulletin — distribute for acknowledgement</DialogTitle></DialogHeader>
        <div className="px-6 py-4 max-h-[62vh] overflow-y-auto flex flex-col gap-3.5">
          <div><Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. FOB 26-06 — new de-ice procedure" /></div>
          <div><Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">Summary</Label><Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One line" /></div>
          <div><Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">Body</Label><Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="The content recipients must read…" /></div>
          <div className="flex gap-3">
            <div className="flex-1"><Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">Completion code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. FOB266" /></div>
            <button onClick={() => setUrgent(!urgent)} className={`self-end h-9 px-3 rounded-lg border text-[13px] font-semibold ${urgent ? 'sc-red border-[color:var(--gfo-error)]' : 'bg-card border-border text-muted-foreground'}`}>{urgent ? 'Urgent ✓' : 'Mark urgent'}</button>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">Send to groups</Label>
            <div className="flex gap-1.5 flex-wrap">
              {DIST_GROUPS.map((g) => (
                <button key={g} onClick={() => toggle(g)} className={`text-[12px] font-medium rounded-full px-3 py-1.5 border transition-colors ${groups.includes(g) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/40'}`}>{g}</button>
              ))}
            </div>
          </div>
          <div><Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">Or named individuals (comma-separated)</Label><Input value={individuals} onChange={(e) => setIndividuals(e.target.value)} placeholder="e.g. Capt. Dunlop, M. Cho" /></div>
        </div>
        <DialogFooter className="px-6 py-3.5 border-t border-border flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button disabled={!canSend} className="gap-1.5" onClick={() => { onCreate({ title: title.trim(), summary: summary.trim(), body: body.trim(), code: code.trim(), urgent, groups, individuals: individuals.split(',').map((s) => s.trim()).filter(Boolean) }); close(); }}>
            <Send className="w-4 h-4" /> Distribute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
