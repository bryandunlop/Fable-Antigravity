import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Paperclip, Camera, MapPin, X } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../TechLogContext';
import { mockSha256 } from '../../engine/signing';
import { ATA_CHAPTERS, INTENT } from '../../constants';
import { newId } from '../../util/id';
import type { Defect, Severity, DefectSource, Attachment, DefectLocationKind } from '../../types';
import { SignCeremonyDialog } from '../SignCeremonyDialog';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
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
  const fileRef = useRef<HTMLInputElement>(null);

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

  const fileToThumb = (file: File): Promise<string | undefined> =>
    new Promise(resolve => {
      if (!file.type.startsWith('image/')) return resolve(undefined);
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 480;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(undefined);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve(undefined);
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const added: Attachment[] = [];
    for (const file of Array.from(files)) {
      const thumb = await fileToThumb(file);
      added.push({
        id: newId('att'), filename: file.name, contentType: file.type || 'application/octet-stream', bytes: file.size,
        sha256: mockSha256(`${file.name}|${file.size}|${file.lastModified}`),
        uri: thumb ?? `blob://mygfo/attach/${file.name}`, capturedAtUtc: new Date().toISOString(),
      });
    }
    setAttachments(a => [...a, ...added]);
    if (fileRef.current) fileRef.current.value = '';
  };

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
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1" value={description} onChange={e => setDescription(e.target.value)} placeholder="What was observed?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Symptom / CAS (optional)</Label>
                <Input className="mt-1" value={symptom} onChange={e => setSymptom(e.target.value)} placeholder="e.g. GEAR amber CAS" />
              </div>
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

            <div className="rounded-md border p-3">
              <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Location</Label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Select value={locKind} onValueChange={(v: string) => setLocKind(v as DefectLocationKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OTHER">General / system</SelectItem>
                    <SelectItem value="CABIN">Cabin (LOPA seat)</SelectItem>
                    <SelectItem value="STRUCTURAL">Structural (zone)</SelectItem>
                  </SelectContent>
                </Select>
                {locKind === 'CABIN' && <Input placeholder="Seat, e.g. 12A" value={cabinSeat} onChange={e => setCabinSeat(e.target.value)} />}
                {locKind === 'STRUCTURAL' && <Input placeholder="Zone, e.g. WING-L-STA-340" value={zoneCode} onChange={e => setZoneCode(e.target.value)} />}
              </div>
              <Input className="mt-2" placeholder="Location notes (optional)" value={locFreetext} onChange={e => setLocFreetext(e.target.value)} />
            </div>

            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" /> Photos / attachments</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Camera className="mr-1.5 h-4 w-4" /> Add
                </Button>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => onFiles(e.target.files)} />
              </div>
              {attachments.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No attachments. Each photo's SHA-256 digest is covered by your signature.</p>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {attachments.map(a => (
                    <div key={a.id} className="relative rounded-md border p-1">
                      {a.uri.startsWith('data:') ? (
                        <img src={a.uri} alt={a.filename} className="h-20 w-full rounded object-cover" />
                      ) : (
                        <div className="flex h-20 w-full items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">{a.contentType}</div>
                      )}
                      <button type="button" onClick={() => setAttachments(list => list.filter(x => x.id !== a.id))}
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 shadow" title="Remove">
                        <X className="h-3 w-3" />
                      </button>
                      <div className="mt-1 truncate text-[10px] text-muted-foreground" title={a.filename}>{a.filename}</div>
                      <div className="truncate font-mono text-[9px] text-muted-foreground" title={a.sha256}>{a.sha256.slice(0, 16)}…</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
