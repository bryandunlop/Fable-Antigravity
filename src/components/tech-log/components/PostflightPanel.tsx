import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardCheck, PlaneLanding } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { currentRows } from '../engine/supersede';
import { deriveCustody } from '../engine/custody';
import { latestBriefing } from './BriefingPanel';
import { latestPublishedTemplate, isReleaseGated } from '../engine/checklist';
import { INTENT } from '../constants';
import { newId } from '../util/id';
import type { Aircraft, FuelLoadEntry, Postflight, Signature } from '../types';
import { SignCeremonyDialog } from './SignCeremonyDialog';
import { ChecklistRunner } from './checklist/ChecklistRunner';
import { FuelLoadStep } from './checklist/FuelLoadStep';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';

export function PostflightPanel({ aircraft }: { aircraft: Aircraft }) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const now = new Date().toISOString();
  const isMaint = user.role === 'MAINTENANCE';
  const custody = deriveCustody(aircraft.id, state, now);

  // Latest published template — used only to gate/instantiate a NEW checklist instance.
  const template = latestPublishedTemplate(state.checklistTemplates, aircraft.type, 'POSTFLIGHT');
  const [instanceId] = useState(() => newId('cli'));
  const [started, setStarted] = useState(false);
  const instance = state.checklistInstances.find(i => i.id === instanceId);
  // Version-pinned template the instance was actually built from — NOT the latest published template,
  // which may have drifted (a new version can be published while this instance is in progress).
  const instanceTemplate = instance && state.checklistTemplates.find(t => t.id === instance.templateId && t.version === instance.templateVersion);
  const [fuelLoad, setFuelLoad] = useState<FuelLoadEntry | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState('');

  const openSquawks = currentRows(state.defects).filter(d => d.aircraftId === aircraft.id && (d.status === 'OPEN' || d.status === 'DEFERRED'));
  const briefing = latestBriefing(state.briefings, aircraft.id);

  const startChecklist = () => {
    if (!template) return;
    dispatch({
      type: 'ADD_CHECKLIST_INSTANCE',
      payload: {
        id: instanceId, aircraftId: aircraft.id, phase: 'POSTFLIGHT', templateId: template.id, templateVersion: template.version,
        entries: template.sections.flatMap(s => s.items).map(def => ({ itemDefId: def.id, state: 'OPEN' as const })),
        createdAtUtc: new Date().toISOString(),
      },
    });
    setStarted(true);
  };

  const begin = () => {
    if (!instanceTemplate || !instance) return;
    const gate = isReleaseGated(instance, instanceTemplate);
    if (!gate.ok) return toast.error(`Complete the required postflight items first (${gate.missing.length} remaining).`);
    setPendingId(newId('pf'));
    setOpen(true);
  };
  const onSigned = (sig: Signature) => {
    const nowIso = new Date().toISOString();
    const pf: Postflight = {
      id: pendingId, aircraftId: aircraft.id, briefingId: briefing?.id, performedByOid: user.oid, performedAtUtc: nowIso,
      checklist: [], checklistInstanceId: instance?.id, notes: notes || undefined, gatheredDefectIds: openSquawks.map(d => d.id), signatureId: sig.id,
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig });
    dispatch({ type: 'ADD_POSTFLIGHT', payload: pf });
    if (instance) dispatch({ type: 'EDIT_CHECKLIST_INSTANCE', payload: { ...instance, signatureId: sig.id, fuelLoad } });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'POSTFLIGHT_COMPLETED', entityType: 'Postflight', entityId: pf.id, atUtc: nowIso, summary: `${aircraft.tailNumber} postflight — reclaimed to maintenance; ${pf.gatheredDefectIds.length} open squawk(s) gathered` } });
    toast.success(`${aircraft.tailNumber} postflight signed — back in maintenance custody.`);
  };

  if (!isMaint) return <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Maintenance performs the postflight on return.</CardContent></Card>;
  if (custody.state !== 'WITH_CREW') return <Card><CardContent className="p-6 text-sm text-muted-foreground">Postflight becomes available once the aircraft is with the crew. Current custody: {custody.state}.</CardContent></Card>;
  if (!template) return <Card><CardContent className="p-6 text-sm text-muted-foreground">No published postflight checklist for {aircraft.type} yet — ask a maintenance admin to publish one in Admin &gt; Checklists.</CardContent></Card>;
  if (!started) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-2 p-6 text-sm">
          <p className="text-muted-foreground">Ready to run the {aircraft.type} postflight ({template.aodReference}).</p>
          <Button onClick={startChecklist}><ClipboardCheck className="mr-1.5 h-4 w-4" /> Start postflight</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PlaneLanding className="h-4 w-4" /> Postflight — reclaim {aircraft.tailNumber}</CardTitle></CardHeader>
        <CardContent>
          {instance && instanceTemplate && <ChecklistRunner aircraft={aircraft} template={instanceTemplate} instance={instance} onChange={next => dispatch({ type: 'EDIT_CHECKLIST_INSTANCE', payload: next })} />}
        </CardContent>
      </Card>

      <FuelLoadStep aircraft={aircraft} state={state} value={fuelLoad} onChange={setFuelLoad} />

      <Card>
        <CardContent className="space-y-3 p-4 text-sm">
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
