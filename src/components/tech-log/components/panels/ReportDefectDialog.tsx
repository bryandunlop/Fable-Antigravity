import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../TechLogContext';
import { ATA_CHAPTERS, INTENT } from '../../constants';
import { newId } from '../../util/id';
import type { Defect, Severity, DefectSource, Attachment, DefectLocationKind } from '../../types';
import { SignCeremonyDialog } from '../SignCeremonyDialog';
import { DefectDescriptionField, DefectSymptomField, DefectLocationSection, DefectAttachmentsField } from './DefectFields';
import { Button } from '../../../ui/button';
import { Label } from '../../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';

export interface ReportPrefill {
  tail?: string;
  ata?: string;
  description?: string;
  symptom?: string;
}

/**
 * Shared "Report defect" dialog (form + attachments-signed-by-digest + structured location + sign).
 * Reused by the Defects list page, the Tail Workspace, and the Intermittent "promote to defect" path.
 * On sign it dispatches the exact same sequence as before and calls onReported(defect).
 */
export function ReportDefectDialog({
  open,
  onOpenChange,
  lockTail,
  prefill,
  onReported,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lockTail?: string;           // when launched from a specific aircraft, lock the tail
  prefill?: ReportPrefill;
  onReported?: (defect: Defect) => void;
}) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';
  const dispatchable = state.aircraft.filter(a => !a.isProvisional);

  const [signOpen, setSignOpen] = useState(false);
  const [pendingDefectId, setPendingDefectId] = useState('');
  const [tail, setTail] = useState(lockTail ?? prefill?.tail ?? dispatchable[0]?.tailNumber ?? '');
  const [ata, setAta] = useState(prefill?.ata ?? '32');
  const [severity, setSeverity] = useState<Severity>('HIGH');
  const [description, setDescription] = useState(prefill?.description ?? '');
  const [symptom, setSymptom] = useState(prefill?.symptom ?? '');
  const [locKind, setLocKind] = useState<DefectLocationKind>('OTHER');
  const [cabinSeat, setCabinSeat] = useState('');
  const [zoneCode, setZoneCode] = useState('');
  const [locFreetext, setLocFreetext] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Re-seed from prefill/lockTail whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setTail(lockTail ?? prefill?.tail ?? dispatchable[0]?.tailNumber ?? '');
    setAta(prefill?.ata ?? '32');
    setSeverity('HIGH');
    setDescription(prefill?.description ?? '');
    setSymptom(prefill?.symptom ?? '');
    setLocKind('OTHER'); setCabinSeat(''); setZoneCode(''); setLocFreetext('');
    setAttachments([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Attachment digests are folded into the signed payload (AC 120-78B).
  const attachmentPayload = attachments.map(a => a.sha256).join(',');

  const beginSign = () => {
    if (!tail || !description.trim()) return toast.error('Aircraft and description are required.');
    setPendingDefectId(newId('def'));
    setSignOpen(true);
  };

  const onSigned = (sig: { id: string }) => {
    const ac = state.aircraft.find(a => a.tailNumber === tail)!;
    const source: DefectSource = isMaint ? 'MAREP' : 'PIREP';
    const defect: Defect = {
      id: pendingDefectId, aircraftId: ac.id, source, ataChapter: ata,
      description: description.trim(), symptom: symptom.trim() || undefined, severity,
      locationKind: locKind,
      cabinSeat: locKind === 'CABIN' ? cabinSeat.trim() || undefined : undefined,
      zoneCode: locKind === 'STRUCTURAL' ? zoneCode.trim() || undefined : undefined,
      locationFreetext: locFreetext.trim() || undefined,
      attachments: attachments.length ? attachments : undefined,
      airworthinessAffecting: null,
      status: 'OPEN', reportedByOid: user.oid, reportedAtUtc: new Date().toISOString(), signatureId: sig.id,
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig as any });
    dispatch({ type: 'ADD_DEFECT', payload: defect });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'DEFECT_REPORTED', entityType: 'Defect', entityId: defect.id, atUtc: defect.reportedAtUtc, summary: `${source} ${tail} ATA ${ata} — ${severity}${attachments.length ? ` · ${attachments.length} attachment(s)` : ''}` } });
    onOpenChange(false);
    toast.success(`Defect logged on ${tail} — aircraft now grounded (RED) pending maintenance triage.`);
    onReported?.(defect);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Report defect</DialogTitle>
            <DialogDescription>Capture the observation. Maintenance determines dispatch impact.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Aircraft</Label>
                <Select value={tail} onValueChange={(v: string) => setTail(v)} disabled={!!lockTail}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dispatchable.map(a => <SelectItem key={a.id} value={a.tailNumber}>{a.tailNumber} · {a.type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ATA chapter</Label>
                <Select value={ata} onValueChange={(v: string) => setAta(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ATA_CHAPTERS.map(c => <SelectItem key={c.code} value={c.code}>{c.code} · {c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DefectDescriptionField value={description} onChange={setDescription} placeholder="What was observed?" />
            <div className="grid grid-cols-2 gap-3">
              <DefectSymptomField label="Symptom / CAS (optional)" value={symptom} onChange={setSymptom} placeholder="e.g. GEAR amber CAS" />
              <div>
                <Label>Severity</Label>
                <Select value={severity} onValueChange={(v: string) => setSeverity(v as Severity)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DefectLocationSection
              locKind={locKind} onLocKindChange={setLocKind}
              cabinSeat={cabinSeat} onCabinSeatChange={setCabinSeat}
              zoneCode={zoneCode} onZoneCodeChange={setZoneCode}
              locFreetext={locFreetext} onLocFreetextChange={setLocFreetext}
            />

            <DefectAttachmentsField attachments={attachments} setAttachments={setAttachments} />

            <p className="rounded bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
              Reported as airworthiness-affecting by default — the aircraft goes <strong>RED</strong> until maintenance defers it under the MEL or rectifies it. Pilots cannot self-clear.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={beginSign}>Continue to sign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignCeremonyDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        signer={user}
        signedEntity="DEFECT"
        signedEntityId={pendingDefectId}
        intentStatement={INTENT.PILOT_DEFECT}
        payloadExtra={attachmentPayload || undefined}
        payloadSummary={attachments.length ? `Covers ${attachments.length} attachment(s) by SHA-256 digest — the signature is invalid if a photo is altered.` : undefined}
        onSigned={onSigned}
        title="Sign defect report"
      />
    </>
  );
}
