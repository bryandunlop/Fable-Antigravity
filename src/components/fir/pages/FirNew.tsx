import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FilePlus2, FileText } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { GfoPageHeader, GfoPanel } from '../../gfo';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import { currentRows } from '../../tech-log/engine/supersede';
import { buildDowntimeDebrief } from '../../tech-log/engine/debrief';
import { STATUS_TAG_LABELS, STATUS_TAG_ORDER } from '../../tech-log/engine/statusTags';
import { useFir } from '../FirContext';
import { buildFir } from '../engine/create';
import { nextFirRef } from '../engine/refs';
import { CATEGORY_LABEL } from '../components/chips';
import type { FirCategory } from '../types';

let seq = 0;
const localId = () => `fir-${Date.now().toString(36)}-${++seq}`;

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : undefined);

export function FirNew() {
  const { state: techLog } = useTechLog();
  const { state, dispatch } = useFir();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nowIso = useMemo(() => new Date().toISOString(), []);

  // Entry points pass ?defect=<id> — the debrief is the seed (§9).
  const defect = useMemo(() => {
    const id = params.get('defect');
    return id ? currentRows(techLog.defects).find(d => d.id === id) : undefined;
  }, [params, techLog.defects]);
  const debrief = useMemo(
    () => (defect ? buildDowntimeDebrief(defect.id, techLog, nowIso) : undefined),
    [defect, techLog, nowIso],
  );
  const tailOf = (id?: string) => (id && techLog.aircraft.find(a => a.id === id)?.tailNumber) || undefined;

  const [title, setTitle] = useState(() =>
    defect ? `${tailOf(defect.aircraftId) ?? defect.aircraftId} — ${defect.description}` : '',
  );
  const [category, setCategory] = useState<FirCategory>(defect?.airworthinessAffecting ? 'AOG' : 'OTHER');
  const [aircraftId, setAircraftId] = useState(defect?.aircraftId ?? 'none');
  const [eventStart, setEventStart] = useState(() => toLocalInput(debrief?.startUtc ?? nowIso));
  const [eventEnd, setEventEnd] = useState(() => (debrief && !debrief.ongoing ? toLocalInput(debrief.endUtc) : ''));

  const canOpen = title.trim().length > 0 && eventStart.length > 0;

  const open = () => {
    if (!canOpen || !user) return;
    const id = localId();
    const fir = buildFir({
      id,
      ref: nextFirRef(state.firs.map(f => f.ref), nowIso),
      title: title.trim(),
      category,
      openedBy: { oid: user.oid, name: user.displayName },
      atUtc: new Date().toISOString(),
      eventStartUtc: fromLocalInput(eventStart)!,
      eventEndUtc: fromLocalInput(eventEnd),
      aircraftId: aircraftId === 'none' ? undefined : aircraftId,
      anchors: defect ? [{ kind: 'DEFECT', refId: defect.id }] : [],
    });
    dispatch({ type: 'OPEN_FIR', payload: { fir } });
    navigate(`/fir/${id}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link to="/fir" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Irregularity Reports
      </Link>
      <GfoPageHeader
        eyebrow="Flight Ops"
        title="Open an FIR"
        description="One accountable owner assembles the explanation after the event — system evidence is pulled in automatically; the event itself is worked in the tech log."
      />

      {defect && debrief && (
        <GfoPanel title="Anchored evidence">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline"><FileText className="mr-1 h-3 w-3" />DEFECT · ATA {defect.ataChapter}</Badge>
            <Badge variant="outline">{debrief.elapsedHours} h elapsed{debrief.ongoing ? ' · ongoing' : ''}</Badge>
            {/* Data-driven for the same reason as the AOG board: a hand-written trio silently
                dropped every hour D61's five new states attribute, so the badges the VP reads
                before opening a report did not add up to elapsed. */}
            {STATUS_TAG_ORDER.filter(t => debrief.stateHours[t] > 0).map(t => (
              <Badge key={t} variant="outline">{STATUS_TAG_LABELS[t]} {debrief.stateHours[t]} h</Badge>
            ))}
            {debrief.excludedGapHours > 0 && (
              <Badge variant="outline">excluded gap {debrief.excludedGapHours} h</Badge>
            )}
            <Badge variant="outline">unattributed {debrief.untaggedHours} h</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{defect.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The full downtime debrief — timeline, state hours, labor and why-notes — appears on the FIR timeline automatically.
          </p>
        </GfoPanel>
      )}

      <GfoPanel title="Report">
        <div className="space-y-4 text-sm">
          <div>
            <Label htmlFor="fir-title">Title</Label>
            <Input id="fir-title" className="mt-1" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. N1PG AOG — LMLG unsafe indication" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v: string) => setCategory(v as FirCategory)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABEL) as FirCategory[]).map(c => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Aircraft</Label>
              <Select value={aircraftId} onValueChange={setAircraftId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {techLog.aircraft.map(a => <SelectItem key={a.id} value={a.id}>{a.tailNumber}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fir-start">Event start</Label>
              <Input id="fir-start" className="mt-1" type="datetime-local" value={eventStart}
                onChange={e => setEventStart(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="fir-end">Event end (blank while ongoing)</Label>
              <Input id="fir-end" className="mt-1" type="datetime-local" value={eventEnd}
                onChange={e => setEventEnd(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/fir')}>Cancel</Button>
            <Button size="sm" onClick={open} disabled={!canOpen}>
              <FilePlus2 className="mr-1.5 h-4 w-4" /> Open FIR
            </Button>
          </div>
        </div>
      </GfoPanel>
    </div>
  );
}
