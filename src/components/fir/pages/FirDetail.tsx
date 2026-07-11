import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Anchor, ClipboardCheck, Flag, HelpCircle, PackageSearch, PlayCircle, Plus, UserRoundPen } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { GfoEmptyState, GfoPanel } from '../../gfo';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import { useFir } from '../FirContext';
import { canSeeFir, isFirLeadership } from '../engine/access';
import { defectDebriefs, deriveSystemEntries, mergeTimeline } from '../engine/timeline';
import { FirCategoryChip, FirStatusChip } from '../components/chips';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Aggregate state-hours across the FIR's defect debriefs for the summary bar.
 * Deliberately NOT the RAG palette: these are effort/wait states, not serviceability. */
const BAR_SEGMENTS = [
  { key: 'IN_WORK', label: 'In work', icon: PlayCircle, bar: 'bg-gfo-midnight dark:bg-gfo-daylight' },
  { key: 'WAITING_PARTS', label: 'Waiting on parts (POO)', icon: PackageSearch, bar: 'bg-slate-500 dark:bg-slate-400' },
  { key: 'WAITING_INSPECTION', label: 'Waiting on inspection', icon: ClipboardCheck, bar: 'bg-slate-300 dark:bg-slate-600' },
  { key: 'UNTAGGED', label: 'Unattributed', icon: HelpCircle, bar: 'bg-muted' },
] as const;

export function FirDetail({ userRole, additionalRoles = [] }: { userRole?: string; additionalRoles?: string[] }) {
  const { id } = useParams<{ id: string }>();
  const { state: techLog } = useTechLog();
  const { state, dispatch } = useFir();
  const user = useCurrentUser();
  const now = useMemo(() => new Date().toISOString(), []);

  const [entryAt, setEntryAt] = useState(() => toLocalInput(new Date().toISOString()));
  const [entryLabel, setEntryLabel] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [newOwnerOid, setNewOwnerOid] = useState('');

  const fir = state.firs.find(f => f.id === id);
  const roles = [userRole ?? '', ...additionalRoles];
  const leadership = isFirLeadership(roles);

  const back = (
    <Link to="/fir" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Irregularity Reports
    </Link>
  );

  if (!fir) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {back}
        <GfoEmptyState message="No such irregularity report." icon={<Flag />} />
      </div>
    );
  }
  if (!canSeeFir(fir, { oid: user?.oid ?? '', roles })) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {back}
        <GfoEmptyState message="This internal FIR is visible to its owner and the leadership tier." icon={<Flag />} />
      </div>
    );
  }

  const nameOf = (oid?: string, fallback?: string) =>
    (oid && techLog.personnel.find(p => p.oid === oid)?.displayName) || fallback || oid || '—';
  const tail = fir.aircraftId ? techLog.aircraft.find(a => a.id === fir.aircraftId)?.tailNumber : undefined;

  const debriefs = defectDebriefs(fir, techLog, now);
  const merged = mergeTimeline(deriveSystemEntries(fir, techLog, now), fir.manualTimeline);
  const ongoing = debriefs.some(d => d.ongoing) || !fir.eventEndUtc;

  const hours: Record<(typeof BAR_SEGMENTS)[number]['key'], number> = {
    IN_WORK: debriefs.reduce((s, d) => s + d.stateHours.IN_WORK, 0),
    WAITING_PARTS: debriefs.reduce((s, d) => s + d.stateHours.WAITING_PARTS, 0),
    WAITING_INSPECTION: debriefs.reduce((s, d) => s + d.stateHours.WAITING_INSPECTION, 0),
    UNTAGGED: debriefs.reduce((s, d) => s + d.untaggedHours, 0),
  };
  const totalHours = Object.values(hours).reduce((a, b) => a + b, 0);
  const elapsedHours = Math.round(debriefs.reduce((s, d) => s + d.elapsedHours, 0) * 10) / 10;

  const canAssemble = fir.status === 'OPEN' && (leadership || user?.oid === fir.ownerOid || user?.oid === fir.openedByOid);

  const addEntry = () => {
    if (!entryLabel.trim() || !user) return;
    dispatch({
      type: 'ADD_MANUAL_ENTRY',
      payload: {
        firId: fir.id,
        entry: {
          source: 'MANUAL',
          atUtc: new Date(entryAt).toISOString(),
          label: entryLabel.trim(),
          note: entryNote.trim() || undefined,
          byOid: user.oid,
        },
      },
    });
    setEntryLabel('');
    setEntryNote('');
  };

  const reassign = () => {
    if (!newOwnerOid || !user) return;
    dispatch({
      type: 'REASSIGN_OWNER',
      payload: {
        firId: fir.id,
        newOwnerOid,
        newOwnerName: nameOf(newOwnerOid),
        byOid: user.oid,
        byName: user.displayName,
        atUtc: new Date().toISOString(),
      },
    });
    setReassigning(false);
    setNewOwnerOid('');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {back}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="gfo-eyebrow mb-1">{fir.ref}</div>
          <h1 className="text-2xl font-semibold leading-tight text-primary">{fir.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <FirStatusChip status={fir.status} />
            <FirCategoryChip category={fir.category} />
            {tail && <Badge variant="outline">{tail}</Badge>}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Event {new Date(fir.eventStartUtc).toLocaleString()}
            {fir.eventEndUtc ? ` → ${new Date(fir.eventEndUtc).toLocaleString()}` : ' → ongoing'}
            {' · '}owner {nameOf(fir.ownerOid, fir.ownerName)}
            {' · '}opened by {nameOf(fir.openedByOid, fir.openedByName)}, {new Date(fir.openedAtUtc).toLocaleString()}
          </p>
        </div>
        {(leadership || user?.oid === fir.ownerOid) && fir.status === 'OPEN' && (
          <Button size="sm" variant="outline" onClick={() => setReassigning(true)}>
            <UserRoundPen className="mr-1.5 h-4 w-4" /> Reassign owner
          </Button>
        )}
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="statements" disabled title="Slice 2">Statements</TabsTrigger>
          <TabsTrigger value="narrative" disabled title="Slice 2">Narrative</TabsTrigger>
          <TabsTrigger value="impact" disabled title="Slice 2">Impact</TabsTrigger>
          <TabsTrigger value="publish" disabled title="Slice 3">Publish</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4 space-y-4">
          {debriefs.length > 0 && (
            <GfoPanel title="Where the hours went">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{elapsedHours} h elapsed{ongoing ? ' · ongoing' : ''}</Badge>
                {BAR_SEGMENTS.map(s => (
                  <Badge key={s.key} variant="outline">
                    <s.icon className="mr-1 h-3 w-3" />
                    {s.label} {Math.round(hours[s.key] * 10) / 10} h
                  </Badge>
                ))}
              </div>
              {totalHours > 0 && (
                <div
                  className="mt-3 flex h-3 w-full overflow-hidden rounded-full border border-border"
                  role="img"
                  aria-label={BAR_SEGMENTS.map(s => `${s.label} ${hours[s.key]} h`).join(', ')}
                >
                  {BAR_SEGMENTS.filter(s => hours[s.key] > 0).map(s => (
                    <div
                      key={s.key}
                      className={s.bar}
                      style={{ width: `${(hours[s.key] / totalHours) * 100}%` }}
                      title={`${s.label} — ${hours[s.key]} h`}
                    />
                  ))}
                </div>
              )}
            </GfoPanel>
          )}

          <GfoPanel title="Timeline">
            {fir.anchors.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Evidence anchors:</span>
                {fir.anchors.map((a, i) => (
                  <Badge key={i} variant="secondary"><Anchor className="mr-1 h-3 w-3" />{a.kind} · {a.refId}</Badge>
                ))}
              </div>
            )}
            {merged.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timeline yet — anchor evidence or add the first entry below.</p>
            ) : (
              <div className="space-y-1.5 border-l-2 pl-3">
                {merged.map((e, i) => (
                  <div key={i} className="text-xs">
                    <span className="tabular-nums text-muted-foreground">{new Date(e.atUtc).toLocaleString()} — </span>
                    <span className={e.source === 'MANUAL' ? 'font-medium' : ''}>{e.label}</span>
                    {e.byOid && <span className="text-muted-foreground"> · {nameOf(e.byOid)}</span>}
                    {e.source === 'SYSTEM' ? (
                      <span className="ml-1.5 rounded border border-border px-1 py-px text-[10px] uppercase tracking-wide text-muted-foreground">system</span>
                    ) : (
                      <span className="ml-1.5 rounded bg-muted px-1 py-px text-[10px] uppercase tracking-wide text-muted-foreground">note</span>
                    )}
                    {e.note && <div className="ml-4 italic text-muted-foreground">{e.note}</div>}
                  </div>
                ))}
                {ongoing && <div className="text-xs text-muted-foreground">… event ongoing</div>}
              </div>
            )}

            {canAssemble && (
              <div className="mt-4 grid grid-cols-1 gap-2 border-t pt-4 md:grid-cols-[200px_1fr_auto]">
                <div>
                  <Label htmlFor="fir-entry-at" className="text-xs">When</Label>
                  <Input id="fir-entry-at" type="datetime-local" className="mt-1 h-9" value={entryAt}
                    onChange={e => setEntryAt(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="fir-entry-label" className="text-xs">What happened</Label>
                  <Input id="fir-entry-label" className="mt-1 h-9" value={entryLabel}
                    onChange={e => setEntryLabel(e.target.value)}
                    placeholder="e.g. Vendor ETA slipped 48 h — freight weather hold" />
                  <Input className="mt-2 h-9" value={entryNote} onChange={e => setEntryNote(e.target.value)}
                    placeholder="Optional context note" />
                </div>
                <div className="flex items-end">
                  <Button size="sm" onClick={addEntry} disabled={!entryLabel.trim()}>
                    <Plus className="mr-1.5 h-4 w-4" /> Add
                  </Button>
                </div>
              </div>
            )}
          </GfoPanel>

          {fir.audit.length > 0 && (
            <GfoPanel title="Activity">
              <div className="space-y-1">
                {fir.audit.map((a, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 border-b py-1 text-xs text-muted-foreground last:border-0">
                    <span>{a.kind.replace(/_/g, ' ').toLowerCase()}{a.detail ? ` — ${a.detail}` : ''}</span>
                    <span>{nameOf(a.byOid, a.byName)} · {new Date(a.atUtc).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </GfoPanel>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={reassigning} onOpenChange={setReassigning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign owner</DialogTitle>
            <DialogDescription>
              One accountable owner assembles the report. Reassignment is recorded in the FIR's activity log.
            </DialogDescription>
          </DialogHeader>
          <Select value={newOwnerOid} onValueChange={setNewOwnerOid}>
            <SelectTrigger><SelectValue placeholder="Select new owner" /></SelectTrigger>
            <SelectContent>
              {techLog.personnel.filter(p => p.active && p.oid !== fir.ownerOid).map(p => (
                <SelectItem key={p.oid} value={p.oid}>{p.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReassigning(false)}>Cancel</Button>
            <Button size="sm" onClick={reassign} disabled={!newOwnerOid}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
