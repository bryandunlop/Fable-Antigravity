import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardCheck, PlaneLanding } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { currentRows } from '../engine/supersede';
import { deriveCustody } from '../engine/custody';
import { latestBriefing } from './BriefingPanel';
import { INTENT, DEFAULT_PREFLIGHT_CHECKLIST } from '../constants';
import { newId } from '../util/id';
import type { Aircraft, Postflight, Signature } from '../types';
import { SignCeremonyDialog } from './SignCeremonyDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';

export function PostflightPanel({ aircraft }: { aircraft: Aircraft }) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const now = new Date().toISOString();
  const isMaint = user.role === 'MAINTENANCE';
  const custody = deriveCustody(aircraft.id, state, now);

  const [items, setItems] = useState(() =>
    DEFAULT_PREFLIGHT_CHECKLIST.map((c, i) => ({ id: newId(`pfc${i}`), text: c.text, mandatory: c.mandatory, done: false, source: 'TEMPLATE' as const })),
  );
  const [notes, setNotes] = useState('');
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState('');

  const openSquawks = currentRows(state.defects).filter(d => d.aircraftId === aircraft.id && (d.status === 'OPEN' || d.status === 'DEFERRED'));
  const briefing = latestBriefing(state.briefings, aircraft.id);

  const begin = () => {
    const missing = items.filter(c => c.mandatory && !c.done);
    if (missing.length) return toast.error(`Complete the mandatory postflight items first (${missing.length} remaining).`);
    setPendingId(newId('pf'));
    setOpen(true);
  };
  const onSigned = (sig: Signature) => {
    const nowIso = new Date().toISOString();
    const pf: Postflight = {
      id: pendingId, aircraftId: aircraft.id, briefingId: briefing?.id, performedByOid: user.oid, performedAtUtc: nowIso,
      checklist: items, notes: notes || undefined, gatheredDefectIds: openSquawks.map(d => d.id), signatureId: sig.id,
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig });
    dispatch({ type: 'ADD_POSTFLIGHT', payload: pf });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'POSTFLIGHT_COMPLETED', entityType: 'Postflight', entityId: pf.id, atUtc: nowIso, summary: `${aircraft.tailNumber} postflight — reclaimed to maintenance; ${pf.gatheredDefectIds.length} open squawk(s) gathered` } });
    toast.success(`${aircraft.tailNumber} postflight signed — back in maintenance custody.`);
  };

  if (!isMaint) return <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Maintenance performs the postflight on return.</CardContent></Card>;
  if (custody.state !== 'WITH_CREW') return <Card><CardContent className="p-6 text-sm text-muted-foreground">Postflight becomes available once the aircraft is with the crew. Current custody: {custody.state}.</CardContent></Card>;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PlaneLanding className="h-4 w-4" /> Postflight — reclaim {aircraft.tailNumber}</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="space-y-1">
            {items.map(c => (
              <li key={c.id}>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={c.done} onChange={() => setItems(prev => prev.map(x => (x.id === c.id ? { ...x, done: !x.done } : x)))} />
                  <span>{c.text}{c.mandatory ? ' *' : ''}</span>
                </label>
              </li>
            ))}
          </ul>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open squawks gathered for the work queue ({openSquawks.length})</div>
            {openSquawks.length ? <ul className="list-disc pl-5">{openSquawks.map(d => <li key={d.id}>ATA {d.ataChapter} — {d.description}</li>)}</ul> : <p className="text-muted-foreground">None</p>}
          </div>
          <Textarea placeholder="Postflight notes / new findings" value={notes} onChange={e => setNotes(e.target.value)} />
          <Button onClick={begin}><ClipboardCheck className="mr-1.5 h-4 w-4" /> Sign postflight &amp; reclaim</Button>
        </CardContent>
      </Card>
      <SignCeremonyDialog open={open} onOpenChange={setOpen} signer={user} signedEntity="POSTFLIGHT" signedEntityId={pendingId}
        intentStatement={INTENT.POSTFLIGHT} payloadSummary={`${aircraft.tailNumber} postflight — ${openSquawks.length} open squawk(s) gathered.`}
        onSigned={onSigned} title="Sign postflight (maintenance)" />
    </div>
  );
}
